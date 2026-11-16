// --- KONFİGÜRASYON ---
const API_URL = "https://edelkrone-api.06mmt8129.workers.dev";

// --- ÇEREZLİ FETCH YARDIMCISI ---
async function fetchWithAuth(url) {
    const userCookie = localStorage.getItem('userCookie') || "";
    return fetch(url, {
        headers: {
            "X-User-Cookie": userCookie
        }
    });
}

// --- SAAT VE TARİH ---
function updateClock() {
    const now = new Date();
    document.getElementById('clock').innerText = now.toLocaleTimeString('tr-TR', { hour12: false });
    const options = { day: 'numeric', month: 'long', weekday: 'long' };
    let dateStr = now.toLocaleDateString('tr-TR', options);
    dateStr = dateStr.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    document.getElementById('dateDisplay').innerText = dateStr;
}
setInterval(updateClock, 1000);
updateClock();

// --- YAN MENÜ ---
const sidebar = document.getElementById('sidebar');
document.getElementById('menuBtn').addEventListener('click', () => sidebar.classList.add('active'));
function closeSidebar() { sidebar.classList.remove('active'); }

// --- MODAL YÖNETİMİ ---
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// --- BİLGİ VE ONAY MODALLARI ---
function showInfoModal(title, message) {
    document.getElementById('infoModalTitle').innerText = title;
    document.getElementById('infoModalMessage').innerText = message;
    openModal('infoModal');
}

function showConfirmModal(message, onConfirm) {
    document.getElementById('confirmModalMessage').innerText = message;
    const btn = document.getElementById('confirmModalBtn');
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener('click', () => { closeModal('confirmModal'); onConfirm(); });
    openModal('confirmModal');
}

// --- TEMA YÖNETİMİ ---
const themeToggle = document.getElementById('themeToggle');
if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
    themeToggle.checked = true;
}
themeToggle.addEventListener('change', () => {
    if (themeToggle.checked) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
    } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light');
    }
});

// --- KULLANICI ARAYÜZÜNÜ GÜNCELLE ---
function updateLoggedInUserUI() {
    const user = localStorage.getItem('loggedInUser');
    const displayEl = document.getElementById('loggedInUserDisplay');
    if (user) {
        displayEl.innerText = "👤 " + user.replace('_', ' ').toUpperCase();
    } else {
        displayEl.innerText = "KULLANICI: -";
    }
}

// --- GİRİŞ SİSTEMİ ---
let secilenKullanici = "";

function selectUser(username) {
    secilenKullanici = username;
    document.getElementById('userSelection').style.display = 'none';
    document.getElementById('passwordArea').style.display = 'block';
    document.getElementById('selectedUserName').innerText = username.toUpperCase().replace('_', ' ');
    document.getElementById('userPassword').value = '';
    document.getElementById('userPassword').focus();
}

function cancelLogin() {
    document.getElementById('passwordArea').style.display = 'none';
    document.getElementById('userSelection').style.display = 'grid';
    secilenKullanici = "";
}

async function attemptLogin() {
    const password = document.getElementById('userPassword').value;
    if (!password) {
        showInfoModal("Uyarı", "Lütfen şifrenizi girin.");
        return;
    }

    showInfoModal("Bekleyin", "Giriş yapılıyor...");

    try {
        const response = await fetch(`${API_URL}/login?user=${secilenKullanici}&pass=${password}`);
        const data = await response.json();

        if (data.success) {
            localStorage.setItem('loggedInUser', secilenKullanici);
            localStorage.setItem('userCookie', data.cookie);
            closeModal('loginModal');
            showInfoModal("Giriş Başarılı", "Hoş geldin " + secilenKullanici.toUpperCase().replace('_', ' '));
            updateLoggedInUserUI();
        } else {
            showInfoModal("Hata", data.message || "Hatalı şifre!");
            document.getElementById('userPassword').value = '';
        }
    } catch (err) {
        showInfoModal("Hata", "Sunucuya bağlanılamadı.");
    }
}

function logout() {
    showConfirmModal("Çıkış yapmak istediğinize emin misiniz?", () => {
        localStorage.removeItem('loggedInUser');
        localStorage.removeItem('userCookie');
        updateLoggedInUserUI();
        closeSidebar();
        openModal('loginModal');
    });
}

// --- SAYFA GEÇİŞLERİ ---
function navigateTo(screenId) {
    document.querySelectorAll('.home-container, .page-container').forEach(el => el.classList.add('hidden'));
    const backBtn = document.getElementById('backBtn');
    const menuBtn = document.getElementById('menuBtn');

    if (screenId === 'home') {
        document.getElementById('homeScreen').classList.remove('hidden');
        backBtn.style.display = 'none';
        menuBtn.style.display = 'block';
    } else {
        document.getElementById(screenId + 'Screen').classList.remove('hidden');
        backBtn.style.display = 'block';
        menuBtn.style.display = 'none';
        if (screenId === 'aktifPartiler') fetchParties();
		        if (screenId === 'operatorAtamalari') fetchOperators();
        else if (screenId === 'depo') fetchDepo();
    }
}

// --- AKTİF PARTİLER ---
let currentSort = 0;
let partyData = [];
let aktifParcaDetayUrl = ""; // Parça detayındayken hangi URL'de olduğumuzu tutar

async function fetchParties() {
    const listContainer = document.getElementById('partyList');
    const countText = document.getElementById('activeBenchCount');
    
    listContainer.innerHTML = '<div style="text-align:center; padding: 40px; font-weight:bold; color: var(--gray);">Veriler ve resimler çekiliyor, lütfen bekleyin...</div>';
    countText.innerText = "Yükleniyor...";
    
    try {
        const response = await fetchWithAuth(`${API_URL}?path=Manufacturing/ProductionBatches/List`);
        if (!response.ok) throw new Error("Sunucu hatası");
        const htmlText = await response.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, "text/html");
        const batches = doc.querySelectorAll('.batch');
        
        partyData = [];
        
        const promises = Array.from(batches).map(async (batch) => {
            let tezgah = batch.querySelector('.gauge .value')?.innerText.trim() || "";
            let isAdi = batch.querySelector('.batch-data .header')?.innerText.trim() || "";
            let partiNo = batch.querySelector('.batch-data a.description')?.innerText.trim() || "";
            let operatör = batch.querySelector('.batch-data div.description')?.innerText.trim() || "";
            let yuzdeEl = batch.querySelector('.chart');
            let yuzde = yuzdeEl ? parseFloat(yuzdeEl.getAttribute('data-percent')) : 0.0;
            let adetText = batch.querySelector('.gauge .description')?.innerText.trim() || "0 / 0";
            
            let adetParts = adetText.split("/");
            let islenen = adetParts[0] ? adetParts[0].trim() : "0";
            let toplam = adetParts[1] ? adetParts[1].trim() : "0";

            let resimUrl = "", kalanSure = "-", kalanMiktar = "-", basariliMiktar = "-", hedeflenenMiktar = "-";
            let operasyondaCikanAdet = "-", tezgahOperasyonSuresi = "-", birinciKaliteVaka = "-", ikinciKaliteVaka = "-";
            let ayarcilar = "", numuneKontrolu = "";
            let uretimRaporu = [];

            if (partiNo) {
                try {
                    const detayRes = await fetchWithAuth(`${API_URL}?path=Manufacturing/ProductionBatches/Details/${partiNo}`);
                    const detayHtml = await detayRes.text();
                    const detayDoc = parser.parseFromString(detayHtml, "text/html");
                    
                    const imgEl = detayDoc.querySelector('.ui.fluid.card .ui.image img');
                    if (imgEl) resimUrl = imgEl.getAttribute('src').replace(/\\/g, '/');

                    const dtElements = detayDoc.querySelectorAll('dt');
                    for (let i = 0; i < dtElements.length; i++) {
                        const text = dtElements[i].innerText.trim();
                        const dd = dtElements[i].nextElementSibling;
                        if (!dd) continue;
                        const val = dd.innerText.trim();

                        if (text.includes('Kalan Süre')) kalanSure = val;
                        else if (text.includes('Kalan Miktar')) kalanMiktar = val;
                        else if (text.includes('Başarılı Miktar')) basariliMiktar = val;
                        else if (text.includes('Hedeflenen Miktar')) hedeflenenMiktar = val;
                        else if (text.includes('Operasyonda Çıkan Adet')) operasyondaCikanAdet = val;
                        else if (text.includes('Tezgah Operasyon Süresi')) tezgahOperasyonSuresi = val;
                        else if (text.includes('1.Kalite Toplam Vaka Adedi')) birinciKaliteVaka = val;
                        else if (text.includes('2.Kalite Toplam Vaka Adedi')) ikinciKaliteVaka = val;
                        else if (text.includes('Numune ve Ekipman Kontrolü')) numuneKontrolu = val;
                    }

                    const ayarciList = detayDoc.querySelectorAll('.ui.list .item .header');
                    let ayarciArr = [];
                    ayarciList.forEach(el => ayarciArr.push(el.innerText.trim()));
                    ayarcilar = ayarciArr.join(', ');

                    const rows = detayDoc.querySelectorAll('.ui.fluid.table tbody tr');
                    rows.forEach(row => {
                        const cols = row.querySelectorAll('td');
                        if (cols.length >= 6) {
                            let onclickAttr = cols[3].querySelector('a')?.getAttribute('onclick') || "";
                            let vakaIdMatch = onclickAttr.match(/\d+/);
                            let vakaLinkId = vakaIdMatch ? vakaIdMatch[0] : "";

                            uretimRaporu.push({
                                tarih: cols[0].innerText.trim().replace(/\n/g, ' '),
                                minHedef: cols[1].innerText.trim(),
                                uretilen: cols[2].innerText.trim(),
                                vakaSayisi: cols[3].innerText.trim(),
                                vakaLinkId: vakaLinkId,
                                operator: cols[4].innerText.trim(),
                                kaliteci: cols[5].innerText.trim()
                            });
                        }
                    });

                } catch (e) { console.log("Detay çekilemedi:", partiNo); }
            }

            return {
                tezgah, isAdi, partiNo, operatör, yuzde, islenen, toplam, resimUrl, kalanSure, kalanMiktar, 
                basariliMiktar, hedeflenenMiktar, operasyondaCikanAdet, tezgahOperasyonSuresi, 
                birinciKaliteVaka, ikinciKaliteVaka, ayarcilar, numuneKontrolu, uretimRaporu
            };
        });

        partyData = await Promise.all(promises);
        renderParties();
        
    } catch (err) {
        listContainer.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--danger); font-weight:bold;">Hata: ${err.message}</div>`;
        countText.innerText = "Bağlantı Hatası";
    }
}

function renderParties() {
    const listContainer = document.getElementById('partyList');
    listContainer.innerHTML = '';
    let sortedData = [...partyData];

    if (currentSort === 1) sortedData.sort((a, b) => a.tezgah.localeCompare(b.tezgah));
    else if (currentSort === 2) sortedData.sort((a, b) => b.tezgah.localeCompare(a.tezgah));
    else sortedData.sort((a, b) => (a.operatör || "").localeCompare(b.operatör || ""));

    document.getElementById('activeBenchCount').innerText = `Aktif Tezgah Sayısı: ${sortedData.length}`;

    if (sortedData.length === 0) {
        listContainer.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--gray);">Aktif parti bulunamadı.</div>';
        return;
    }

    sortedData.forEach((p) => {
        let renk = "#EF4444"; if (p.yuzde >= 70) renk = "#4ADE80"; else if (p.yuzde >= 30) renk = "#FBBF24";
        let opName = p.operatör ? p.operatör : "-";
        let imgHtml = p.resimUrl ? `<img src="${p.resimUrl}" class="party-img" alt="${p.tezgah}">` : `<div class="party-img"></div>`;
        
        const card = document.createElement('div');
        card.className = 'party-card';
        card.style.cursor = 'pointer';
        card.onclick = () => showPartyDetail(p);
        
        card.innerHTML = `
            <div class="party-top">
                <div class="party-left">
                    ${imgHtml}
                    <div class="party-tezgah">${p.tezgah}</div>
                </div>
                <div class="party-info">${p.isAdi} | ${p.partiNo}</div>
            </div>
            <div class="progress-container">
                <div class="progress-bar" style="width: ${p.yuzde}%; background-color: ${renk};"></div>
            </div>
            <div class="party-bottom">
                <div class="party-operator">${opName}</div>
                <div style="text-align:right;">
                    <div class="party-time">${p.kalanSure}</div>
                    <div class="party-percent" style="color: ${renk};">%${p.yuzde.toFixed(1)} (${p.islenen}/${p.toplam})</div>
                </div>
            </div>
        `;
        listContainer.appendChild(card);
    });
}

function sortParties(type) {
    currentSort = type;
    document.querySelectorAll('.filter-btn').forEach((btn, index) => btn.classList.toggle('active', index === type));
    renderParties();
}

// --- PARTİ DETAY MODALI ---
function showPartyDetail(p) {
    const content = document.getElementById('partyDetailContent');
    let renk = "#EF4444"; if (p.yuzde >= 70) renk = "#4ADE80"; else if (p.yuzde >= 30) renk = "#FBBF24";

    const detayKutulari = [
        { label: "Tezgah Adı", value: p.tezgah }, { label: "Operasyon Adı", value: p.isAdi },
        { label: "Parti No", value: p.partiNo }, { label: "Tezgah Op. Süresi", value: p.tezgahOperasyonSuresi },
        { label: "Operasyonda Çıkan", value: p.operasyondaCikanAdet }, { label: "Hedeflenen Miktar", value: p.hedeflenenMiktar },
        { label: "Başarılı Miktar", value: p.basariliMiktar }, { label: "1. Kalite Vaka", value: p.birinciKaliteVaka },
        { label: "2. Kalite Vaka", value: p.ikinciKaliteVaka }
    ];

    let gridHtml = detayKutulari.map(k => `
        <div class="detail-grid-item">
            <span class="detail-label">${k.label}</span>
            <span class="detail-value">${k.value}</span>
        </div>
    `).join('');

    let raporHtml = '';
    if (p.uretimRaporu && p.uretimRaporu.length > 0) {
        const grupluRapor = p.uretimRaporu.reduce((acc, row) => {
            if (!acc[row.kaliteci]) acc[row.kaliteci] = [];
            acc[row.kaliteci].push(row);
            return acc;
        }, {});

        raporHtml = `<h3 style="margin-top: 24px; margin-bottom: 12px;">Üretim Raporu</h3>`;
        
        for (const [kaliteci, satirlar] of Object.entries(grupluRapor)) {
            raporHtml += `
                <div class="rapor-group">
                    <h4 class="rapor-kaliteci">${kaliteci}</h4>
                    <div style="overflow-x: auto;">
                        <table class="rapor-table">
                            <thead><tr><th>Tarih</th><th>Operatör</th><th>Hedef</th><th>Üretilen</th><th>Vaka</th></tr></thead>
                            <tbody>
                                ${satirlar.map(s => {
                                    let vakaHtml = parseInt(s.vakaSayisi) > 0 
                                        ? `<span style="color: var(--danger); font-weight: bold; cursor: pointer; text-decoration: underline;" onclick="openVakaModal('${s.vakaLinkId}', '${s.vakaSayisi}')">${s.vakaSayisi}</span>` 
                                        : `<span style="color: gray;">0</span>`;
                                    return `
                                        <tr>
                                            <td>${s.tarih}</td><td>${s.operator}</td><td>${s.minHedef}</td><td>${s.uretilen}</td><td>${vakaHtml}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
    }

    content.innerHTML = `
        <div style="text-align: center; margin-bottom: 16px;">
            ${p.resimUrl ? `<img src="${p.resimUrl}" style="max-width: 100%; max-height: 200px; object-fit: contain; margin-bottom: 12px; border-radius: 8px;">` : ''}
            <div style="display: flex; justify-content: space-around;">
                <div><div style="font-size: 12px; color: var(--gray);">KALAN SÜRE</div><div style="font-size: 24px; font-weight: bold; color: var(--danger);">${p.kalanSure}</div></div>
                <div><div style="font-size: 12px; color: var(--gray);">KALAN ADET</div><div style="font-size: 24px; font-weight: bold; color: var(--danger);">${p.kalanMiktar}</div></div>
            </div>
        </div>
        <div class="progress-container" style="height: 12px; margin-bottom: 4px;"><div class="progress-bar" style="width: ${p.yuzde}%; background-color: ${renk};"></div></div>
        <div style="text-align: right; font-size: 12px; color: ${renk}; font-weight: bold; margin-bottom: 24px;">%${p.yuzde.toFixed(1)} tamamlandı</div>
        <div class="detail-top-row">
            <div class="detail-card"><div class="detail-card-title">Ayarcılar</div><div class="detail-card-value">${p.ayarcilar || '-'}</div></div>
            <div class="detail-card"><div class="detail-card-title">Numune/Ekipman</div><div class="detail-card-value">${p.numuneKontrolu || '-'}</div></div>
        </div>
        <div class="detail-grid">${gridHtml}</div>
        ${raporHtml}
    `;
    openModal('partyDetailModal');
}

// --- VAKA DETAY MODALI ---
async function openVakaModal(vakaLinkId, vakaSayisi) {
    openModal('vakaDetailModal');
    const content = document.getElementById('vakaModalContent');
    content.innerHTML = '<div style="text-align:center; padding: 20px;">Vakalar yükleniyor...</div>';

    try {
        if (!vakaLinkId) {
            content.innerHTML = '<div style="text-align:center; padding: 20px; color: gray;">Vaka detay linki bulunamadı.</div>';
            return;
        }

        const response = await fetchWithAuth(`${API_URL}?path=Manufacturing/ProductionBatches/GetQualityRecordsByProductionRecord?productionRecordId=${vakaLinkId}`);
        const htmlText = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, "text/html");
        
        const rows = doc.querySelectorAll('table#qualityRecords tbody tr');
        let vakaListesi = [];
        
        rows.forEach(row => {
            const cols = row.querySelectorAll('td');
            if (cols.length >= 3) {
                vakaListesi.push({
                    vakaNo: cols[0].innerText.trim(),
                    adet: cols[1].innerText.trim(),
                    aciklama: cols[2].innerText.trim()
                });
            }
        });

        if (vakaListesi.length === 0) {
            content.innerHTML = '<div style="text-align:center; padding: 20px; color: gray;">Vaka detayı bulunamadı.</div>';
            return;
        }

        let vakaHtml = '';
        vakaListesi.forEach(v => {
            vakaHtml += `
                <div class="detail-card" style="margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: bold; font-size: 14px;">Vaka No: <span style="color: var(--danger); cursor: pointer; text-decoration: underline;" onclick="window.open('https://uys.edelkrone.com/Manufacturing/Quality/Details/${v.vakaNo}', '_blank')">${v.vakaNo}</span></span>
                        <span style="font-size: 12px; color: gray;">(${v.adet} adet)</span>
                    </div>
                    <div style="font-size: 12px; margin-top: 4px;">${v.aciklama}</div>
                </div>
            `;
        });
        content.innerHTML = vakaHtml;

    } catch (err) {
        content.innerHTML = `<div style="text-align:center; padding: 20px; color: red;">Hata: ${err.message}</div>`;
    }
}

// --- HAVA DURUMU ---
function getWeatherIcon(code) {
    if (code === 0) return '☀️'; if (code >= 1 && code <= 3) return '⛅'; if (code === 45 || code === 48) return '🌫️';
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return '🌧️'; if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return '❄️';
    if (code >= 95) return '⛈️'; return '☁️';
}
async function fetchWeather() {
    try {
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=39.93&longitude=32.86&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=Europe/Istanbul');
        const data = await res.json();
        const current = data.current_weather;
        const temp = Math.round(current.temperature);
        
        document.getElementById('topWeatherIcon').innerText = getWeatherIcon(current.weathercode);
        document.getElementById('topWeatherTemp').innerText = `${temp}°`;
        document.getElementById('wIcon').innerText = getWeatherIcon(current.weathercode);
        document.getElementById('wTemp').innerText = `${temp}°`;
        document.getElementById('wCondition').innerText = `Ankara · ${current.weathercode === 0 ? 'Açık' : 'Bulutlu'}`;
        
        const forecastDiv = document.getElementById('weatherForecast');
        forecastDiv.innerHTML = '';
        const days = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
        for (let i = 0; i < 7; i++) {
            const d = new Date(data.daily.time[i]);
            forecastDiv.innerHTML += `
                <div class="weather-day">
                    <div class="day-name">${days[d.getDay()]}</div><div class="icon">${getWeatherIcon(data.daily.weathercode[i])}</div>
                    <div class="max-t">${Math.round(data.daily.temperature_2m_max[i])}°</div><div class="min-t">${Math.round(data.daily.temperature_2m_min[i])}°</div>
                </div>`;
        }
    } catch (e) { console.error("Hava durumu alınamadı", e); }
}
fetchWeather();

// --- API MOTORU SEÇİMİ ---
function selectEngine(engine) {
    const btnGemini = document.getElementById('engineGemini');
    const btnGroq = document.getElementById('engineGroq');
    if (engine === 'gemini') { btnGemini.classList.add('active-engine'); btnGroq.classList.remove('active-engine'); }
    else { btnGroq.classList.add('active-engine'); btnGemini.classList.remove('active-engine'); }
}

// --- AI SOHBET (Mock) ---
async function sendAIMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim(); 
    if (!text) return;
    
    const history = document.getElementById('chatHistory');
    history.innerHTML += `<div class="chat-msg user">${text}</div>`;
    input.value = ''; history.scrollTop = history.scrollHeight;
    
    const loadingId = 'loading-' + Date.now();
    history.innerHTML += `<div class="chat-msg ai" id="${loadingId}">Düşünüyor...</div>`;
    history.scrollTop = history.scrollHeight;

    const engine = localStorage.getItem('aiEngine') || 'gemini';
    const apiKey = localStorage.getItem('aiApiKey');

    if (!apiKey) {
        document.getElementById(loadingId).remove();
        history.innerHTML += `<div class="chat-msg ai" style="color: red;">Lütfen önce Ayarlar kısmından API Key girin.</div>`;
        return;
    }

    const pageContext = getCurrentPageContext();

    try {
        let aiResponse = "";

        if (engine === 'gemini') {
            // GÜNCEL GEMINI MODELİ
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-4-hydrogen:generateContent?key=${apiKey}`;
            const payload = {
                contents: [{
                    parts: [{
                        text: `Sen bir web sayfası asistanısın. Kullanıcının sorduğu soruyu, aşağıda verilen web sayfası içeriğine göre cevapla.\n\nSAYFA İÇERİĞİ:\n${pageContext}\n\nSORU: ${text}`
                    }]
                }]
            };

            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error?.message || "Gemini API hatası");
            aiResponse = data.candidates[0].content.parts[0].text;

        } else {
            // GÜNCEL GROQ MODELİ (120B)
            const url = `https://api.groq.com/openai/v1/chat/completions`;
            const payload = {
                model: "openai/gpt-oss-120b",
                messages: [
                    { role: "system", content: "Sen bir web sayfası asistanısın. Kullanıcının sorduğu soruyu, verilen web sayfası içeriğine göre cevapla." },
                    { role: "user", content: `SAYFA İÇERİĞİ:\n${pageContext}\n\nSORU: ${text}` }
                ]
            };

            const res = await fetch(url, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error?.message || "Groq API hatası");
            aiResponse = data.choices[0].message.content;
        }

        document.getElementById(loadingId).remove();
        history.innerHTML += `<div class="chat-msg ai">${aiResponse}</div>`;
        history.scrollTop = history.scrollHeight;

    } catch (err) {
        document.getElementById(loadingId).remove();
        history.innerHTML += `<div class="chat-msg ai" style="color: red;">Hata: ${err.message}</div>`;
    }
}

// --- SAYFA YÜKLENDİĞİNDE ---
window.addEventListener('DOMContentLoaded', () => {
    updateLoggedInUserUI();
    const loggedInUser = localStorage.getItem('loggedInUser');
    
    if (!loggedInUser) {
        openModal('loginModal');
    } else {
        closeModal('loginModal');
    }
});

// --- TAKVİM MODALI ---
let calDate = new Date();

function renderCalendar() {
    const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    const monthYearEl = document.getElementById('calendarMonthYear');
    if (monthYearEl) {
        monthYearEl.innerText = `${monthNames[calDate.getMonth()]} ${calDate.getFullYear()}`;
    }
    
    const grid = document.getElementById('calendarGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].forEach(d => {
        const el = document.createElement('div'); 
        el.className = 'calendar-day-name'; 
        el.innerText = d; 
        grid.appendChild(el);
    });

    const firstDay = new Date(calDate.getFullYear(), calDate.getMonth(), 1).getDay();
    const daysInMonth = new Date(calDate.getFullYear(), calDate.getMonth() + 1, 0).getDate();
    const today = new Date();
    
    let emptyDays = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = 0; i < emptyDays; i++) {
        grid.appendChild(document.createElement('div'));
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const el = document.createElement('div');
        el.className = 'calendar-day'; 
        el.innerText = i;
        if (i === today.getDate() && calDate.getMonth() === today.getMonth() && calDate.getFullYear() === today.getFullYear()) {
            el.classList.add('today');
        }
        grid.appendChild(el);
    }
}

function changeMonth(dir) { 
    calDate.setMonth(calDate.getMonth() + dir); 
    renderCalendar(); 
}

// --- OPERATÖR ATAMALARI ---
async function fetchOperators() {
    const listContainer = document.getElementById('operatorList');
    const countText = document.getElementById('operatorCount');
    
    listContainer.innerHTML = '<div style="text-align:center; padding: 40px; font-weight:bold; color: var(--gray);">Operatörler çekiliyor...</div>';
    countText.innerText = "Yükleniyor...";

    try {
        // Worker'dan Operatör Atamaları sayfasını iste
        const response = await fetchWithAuth(`${API_URL}?path=Manufacturing/Workbenches/Assignments`);
        if (!response.ok) throw new Error("Sunucu hatası");
        const htmlText = await response.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, "text/html");
        
        // Kotlin kodundaki gibi operatör kartlarını seç
        const cards = doc.querySelectorAll('.ui.inverted.card');
        let operatorData = [];

        cards.forEach(card => {
            // İsim ve Ünvan
            const isimEl = card.querySelector('.center.aligned.header span');
            const isim = isimEl ? isimEl.innerText.trim() : "Bilinmeyen";
            
            // Fotoğraf
            const imgEl = card.querySelector('.image img');
            const foto = imgEl ? imgEl.getAttribute('src') : "";

            // Tezgah atamaları
            let satirlar = [];
            const rows = card.querySelectorAll('.ui.grid > .row');
            rows.forEach(row => {
                const cols = row.querySelectorAll('.column');
                if (cols.length >= 4) {
                    const tezgahLink = cols[1].querySelector('a');
                    if (tezgahLink) {
                        satirlar.push({
                            tezgah: tezgahLink.innerText.trim(),
                            isAdi: cols[2].innerText.trim() || "-",
                            partiNo: cols[3].innerText.trim() || "-"
                        });
                    }
                }
            });

            operatorData.push({ isim, foto, satirlar });
        });

        renderOperators(operatorData);
        
    } catch (err) {
        listContainer.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--danger); font-weight:bold;">Hata: ${err.message}</div>`;
        countText.innerText = "Bağlantı Hatası";
    }
}

// --- OPERATÖR ATAMALARI ---
async function fetchOperators() {
    const listContainer = document.getElementById('operatorList');
    const countText = document.getElementById('operatorCount');
    
    listContainer.innerHTML = '<div style="text-align:center; padding: 40px; font-weight:bold; color: var(--gray);">Operatörler çekiliyor...</div>';
    countText.innerText = "Yükleniyor...";

    try {
        const response = await fetchWithAuth(`${API_URL}?path=Manufacturing/Workbenches/Assignments`);
        if (!response.ok) throw new Error("Sunucu hatası");
        const htmlText = await response.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, "text/html");
        
        const cards = doc.querySelectorAll('.ui.inverted.card');
        let operatorData = [];

        cards.forEach(card => {
            const isimEl = card.querySelector('.center.aligned.header span');
            const isim = isimEl ? isimEl.innerText.trim() : "Bilinmeyen";
            
            const imgEl = card.querySelector('.image img');
            const foto = imgEl ? imgEl.getAttribute('src') : "";

            let satirlar = [];
            let toplamIs = "-"; // Kotlin'deki toplam değişkeni

            const rows = card.querySelectorAll('.ui.grid > .row');
            rows.forEach(row => {
                const cols = row.querySelectorAll('.column');
                if (cols.length >= 4) {
                    const tezgahLink = cols[1].querySelector('a');
                    if (tezgahLink) {
                        satirlar.push({
                            tezgah: tezgahLink.innerText.trim(),
                            isAdi: cols[2].innerText.trim(),
                            partiNo: cols[3].innerText.trim()
                        });
                    }
                } else if (cols.length === 2 && cols[0].innerText.includes("Toplam")) {
                    toplamIs = cols[1].innerText.trim();
                }
            });

            operatorData.push({ isim, foto, satirlar, toplamIs });
        });

        // Kotlin'deki sıralama mantığı: Dolu satır sayısına göre azalan (En çoktan en aza)
        operatorData.sort((a, b) => {
            const aDolu = a.satirlar.filter(s => s.isAdi !== "-" && s.isAdi !== "").length;
            const bDolu = b.satirlar.filter(s => s.isAdi !== "-" && s.isAdi !== "").length;
            return bDolu - aDolu;
        });

        renderOperators(operatorData);
        
    } catch (err) {
        listContainer.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--danger); font-weight:bold;">Hata: ${err.message}</div>`;
        countText.innerText = "Bağlantı Hatası";
    }
}

function renderOperators(operators) {
    const listContainer = document.getElementById('operatorList');
    const countText = document.getElementById('operatorCount');
    
    listContainer.innerHTML = '';
    
    let toplamDolu = 0;
    let toplamBos = 0;

    // Dolu ve boş tezgah sayılarını hesapla
    operators.forEach(op => {
        op.satirlar.forEach(s => {
            if (s.isAdi !== "-" && s.isAdi !== "") toplamDolu++;
            else toplamBos++;
        });
    });

    // Kotlin'deki header-info kısmı
    countText.innerHTML = `<span style="color: var(--primary);">Dolu Tezgah: ${toplamDolu}</span> &nbsp;|&nbsp; <span style="color: #4ADE80;">Boş Tezgah: ${toplamBos}</span>`;

    if (operators.length === 0) {
        listContainer.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--gray);">Atanmış operatör bulunamadı.</div>';
        return;
    }

    operators.forEach(op => {
        const imgHtml = op.foto ? `<img src="${op.foto}" class="op-img" onerror="this.style.display='none'">` : `<div class="op-img"></div>`;
        
        // Sadece dolu olan tezgahları say (Kotlin kodu)
        const isSayisi = op.satirlar.filter(s => s.isAdi !== "-" && s.isAdi !== "").length;

        let tableRows = '';
        op.satirlar.forEach(s => {
            const isDolu = s.isAdi !== "-" && s.isAdi !== "";
            const renkSinifi = isDolu ? "t-blue" : "t-green";
            const gosterilecekIs = isDolu ? s.isAdi : "-";
            const gosterilecekParti = isDolu ? s.partiNo : "-";

            tableRows += `
                <tr>
                    <td class="t-name ${renkSinifi}">${s.tezgah}</td>
                    <td>${gosterilecekIs}</td>
                    <td style="color: gray;">${gosterilecekParti}</td>
                </tr>
            `;
        });

        const card = document.createElement('div');
        card.className = 'operator-card';
        
        // Kotlin'deki generateOperatorHtml birebir
        card.innerHTML = `
            <div class="card-header">
                <div class="op-info">
                    ${imgHtml}
                    <div class="op-name">${op.isim}</div>
                </div>
                <div class="op-count">${isSayisi} Tezgah</div>
            </div>
            <table class="op-table">
                <thead>
                    <tr><th>Tezgah</th><th>İş</th><th>Parti</th></tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
            ${op.toplamIs !== "-" ? `<div class="total"><span>Toplam İş</span><span>${op.toplamIs}</span></div>` : ''}
        `;
        listContainer.appendChild(card);
    });
}

// --- HANGİ SAYFADAYSA ONU YENİLE ---
function refreshCurrentPage() {
    if (!document.getElementById('aktifPartilerScreen').classList.contains('hidden')) {
        fetchParties();
    } else if (!document.getElementById('operatorAtamalariScreen').classList.contains('hidden')) {
        fetchOperators();
    } else if (!document.getElementById('depoScreen').classList.contains('hidden')) {
        // BURAYI GÜNCELLEDİK: Artık "yapım aşamasında" demek yerine verileri yeniliyor
        fetchDepo();
    } else if (!document.getElementById('ayarciAtamalariScreen').classList.contains('hidden')) {
        // İleride Ayarcı yenileme fonksiyonu buraya gelecek
        showInfoModal("Bilgi", "Ayarcı sayfası henüz yapım aşamasında.");
    } else {
        fetchWeather();
    }
}

// --- AI İÇİN SAYFA BAĞLAMINI (CONTEXT) HAZIRLA ---
function getCurrentPageContext() {
    // Hangi ekran açık?
    if (!document.getElementById('operatorAtamalariScreen').classList.contains('hidden')) {
        // Operatör Atamaları Ekranındaysa
        let context = "Operatör Atamaları Ekranındaki Veriler:\n";
        // Ekrandaki operatör kartlarını oku
        const cards = document.querySelectorAll('#operatorList .operator-card');
        cards.forEach(card => {
            const name = card.querySelector('.op-name')?.innerText || "";
            const benchCount = card.querySelector('.op-count')?.innerText || "";
            context += `Operatör: ${name}, Atandığı Tezgah: ${benchCount}\n`;
            
            // İstersen tablodaki detayları da ekleyebilirsin ama şimdilik özet yeterli
        });
        return context;
        
    } else if (!document.getElementById('aktifPartilerScreen').classList.contains('hidden')) {
        // Aktif Partiler Ekranındaysa
        let context = "Aktif Partiler Ekranındaki Veriler:\n";
        const cards = document.querySelectorAll('#partyList .party-card');
        cards.forEach(card => {
            const tezgah = card.querySelector('.party-tezgah')?.innerText || "";
            const info = card.querySelector('.party-info')?.innerText || "";
            const op = card.querySelector('.party-operator')?.innerText || "";
            const sure = card.querySelector('.party-time')?.innerText || "";
            const percent = card.querySelector('.party-percent')?.innerText || "";
            context += `Tezgah: ${tezgah}, İş: ${info}, Operatör: ${op}, Kalan Süre: ${sure}, Durum: ${percent}\n`;
        });
        return context;
        
    } else {
        return "Ana Ekran. Şu an özel bir veri yok.";
    }
}

// --- API KEY KAYDETME ---
function saveApiKey() {
    // Modal içindeki input alanını bul (id'sini HTML'den kontrol etmen gerekebilir)
    const apiKeyInput = document.querySelector('#apiKeyModal input[type="password"]');
    const selectedEngine = document.getElementById('engineGemini').classList.contains('active-engine') ? 'gemini' : 'groq';
    
    if (!apiKeyInput.value) {
        showInfoModal("Uyarı", "Lütfen bir API anahtarı girin.");
        return;
    }

    localStorage.setItem('aiEngine', selectedEngine);
    localStorage.setItem('aiApiKey', apiKeyInput.value);
    
    closeModal('apiKeyModal');
    showInfoModal("Başarılı", "API anahtarı kaydedildi. AI artık hazır!");
}

// --- API KEY KAYDETME ---
function saveApiKey() {
    const apiKeyInput = document.querySelector('#apiKeyModal input[type="password"]');
    const selectedEngine = document.getElementById('engineGemini').classList.contains('active-engine') ? 'gemini' : 'groq';
    
    if (!apiKeyInput || !apiKeyInput.value) {
        showInfoModal("Uyarı", "Lütfen bir API anahtarı girin.");
        return;
    }

    localStorage.setItem('aiEngine', selectedEngine);
    localStorage.setItem('aiApiKey', apiKeyInput.value);
    
    closeModal('apiKeyModal');
    showInfoModal("Başarılı", "API anahtarı kaydedildi. AI artık hazır!");
}

// --- DEPO (PARÇA ARAMA) ---
let tumDepoVerileri = [];

async function fetchDepo() {
    const listContainer = document.getElementById('depoResults');
    
    listContainer.innerHTML = '<div style="text-align:center; padding: 40px; font-weight:bold; color: var(--gray);">Parçalar çekiliyor, lütfen bekleyin...</div>';

    try {
        // Parçalar sayfasını çek
        const response = await fetchWithAuth(`${API_URL}?path=Manufacturing/Parts`);
        if (!response.ok) throw new Error("Sunucu hatası");
        const htmlText = await response.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, "text/html");
        
        // Tablodaki satırları bul (Kotlin kodundaki gibi)
        const rows = doc.querySelectorAll('#partsTable tbody tr');
        tumDepoVerileri = [];

        rows.forEach(row => {
            const cols = row.querySelectorAll('td');
            if (cols.length >= 5) {
                                const imgEl = cols[0].querySelector('img');
                // URL'deki ters eğik çizgileri (\) düz eğik çizgiye (/) çevir
                const resimUrl = imgEl ? imgEl.getAttribute('src').replace(/\\/g, '/') : "";
                
                const isimLink = cols[1].querySelector('a');
                const isim = isimLink ? isimLink.innerText.trim() : cols[1].innerText.trim();
                const detayUrl = isimLink ? isimLink.getAttribute('href') : "";
                
                // Raf bilgisini ayıkla
                const raf = cols[1].innerText.replace(isim, "").trim();
                
                const operasyon = cols[2].innerText.trim();
                const tedarik = cols[3].innerText.trim();
                const durum = cols[4].innerText.trim();

                tumDepoVerileri.push({ isim, raf, durum, resimUrl, detayUrl, operasyon, tedarik });
            }
        });

        renderDepo(tumDepoVerileri);
        
    } catch (err) {
        listContainer.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--danger); font-weight:bold;">Hata: ${err.message}</div>`;
    }
}

function filterDepo() {
    const searchText = document.getElementById('depoSearchInput').value.toLowerCase();
    
    // Eğer arama boşsa tüm listeyi göster
    if (searchText.trim() === "") {
        renderDepo(tumDepoVerileri);
        return;
    }

    // İsme, rafa veya duruma göre filtrele
    const filtrelenmis = tumDepoVerileri.filter(p => 
        p.isim.toLowerCase().includes(searchText) || 
        p.raf.toLowerCase().includes(searchText) ||
        p.durum.toLowerCase().includes(searchText)
    );
    
    renderDepo(filtrelenmis);
}

function renderDepo(urunler) {
    const listContainer = document.getElementById('depoResults');
    listContainer.innerHTML = '';

    if (urunler.length === 0) {
        listContainer.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--gray);">Sonuç bulunamadı.</div>';
        return;
    }

        urunler.forEach(u => {
        const durumSinifi = u.durum.toLowerCase().includes("üretimde") ? "status-uretim" : "status-tasfiye";
        
        // Kartı oluştur
        const card = document.createElement('div');
        card.className = 'depo-card';
        
        // Resim kısmı
        const imgContainer = document.createElement('div');
        imgContainer.className = 'depo-img-container';
        imgContainer.onclick = () => showImageModal(u.resimUrl);
        imgContainer.innerHTML = u.resimUrl ? `<img src="${u.resimUrl}" loading="lazy" class="depo-img">` : `<div class="depo-img" style="background: #ccc;"></div>`;

        // Bilgi kısmı
        const infoContainer = document.createElement('div');
        infoContainer.className = 'depo-info';
        infoContainer.innerHTML = `
            <div class="depo-header">
                <div class="depo-name">${u.isim}</div>
                <div class="depo-tags">
                    <span class="depo-raf">${u.raf}</span>
                    <span class="depo-status ${durumSinifi}">${u.durum}</span>
                </div>
            </div>
        `;

        // Detay Butonu (Tıklama olayını doğrudan JS ile bağlıyoruz, HTML string'i ile değil)
        const detailBtn = document.createElement('button');
        detailBtn.className = 'depo-detail-btn';
        detailBtn.innerText = 'Detay';
        detailBtn.style.border = 'none';
        detailBtn.style.cursor = 'pointer';
        detailBtn.onclick = () => showDepoDetail(u.detayUrl); // Direkt fonksiyonu çağır

        // Parçaları birleştir
        card.appendChild(imgContainer);
        card.appendChild(infoContainer);
        card.appendChild(detailBtn);
        
        listContainer.appendChild(card);
    });
}

// Resmi tam ekran gösterme modalı
function showImageModal(url) {
    if (!url) return;
    
    // Varsa eski modalı temizle
    const eskiModal = document.getElementById('fullImageModal');
    if (eskiModal) eskiModal.remove();

    const modal = document.createElement('div');
    modal.id = 'fullImageModal';
    modal.className = 'modal-overlay active';
    modal.style.zIndex = '9999';
    modal.style.background = 'rgba(0,0,0,0.85)'; 
    
    // Dışarı tıklama olayı (onclick) kaldırıldı, sadece butona eklendi
    modal.innerHTML = `
        <div style="position:relative; width:100%; height:100%; display:flex; justify-content:center; align-items:center;">
            <img src="${url}" style="max-width:95%; max-height:95%; object-fit:contain; border-radius:8px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
            <button onclick="document.getElementById('fullImageModal').remove()" style="position:absolute; top: 20px; right: 20px; background: var(--danger); color: white; border: none; padding: 10px 15px; border-radius: 50%; font-size: 20px; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">✖</button>
        </div>
    `;
    document.body.appendChild(modal);
}

// --- DEPO PARÇA DETAYI ---
async function showDepoDetail(detayUrl) {
    // Mevcut parça detay URL'sini kaydet (geri dönmek için)
    aktifParcaDetayUrl = detayUrl;
    
    // Başlığı "Parça Detayı" yap
    const modalTitle = document.getElementById('depoDetailModalTitle');
    if (modalTitle) modalTitle.innerText = "Parça Detayı";
    
    // Geri butonunu gizle
    const backBtn = document.getElementById('depoDetailBackBtn');
    if (backBtn) backBtn.style.display = 'none';
	
    console.log("1. showDepoDetail başladı. URL:", detayUrl);
    
    openModal('depoDetailModal');
    const content = document.getElementById('depoDetailContent');
    content.innerHTML = '<div style="text-align:center; padding: 40px; font-weight: bold; color: var(--gray);">Parça detayları çekiliyor...</div>';

    try {
        const path = detayUrl.replace(/^\//, '');
        console.log("2. Path hazırlandı:", path);
        
        // Worker'a istek at
        const url = `${API_URL}?path=${encodeURIComponent(path)}`;
        console.log("3. İstek atılıyor:", url);

        const response = await fetchWithAuth(url);
        console.log("4. Cevap geldi. Durum:", response.status);

        if (!response.ok) throw new Error("Sunucu hatası: " + response.status);
        
        const htmlText = await response.text();
        console.log("5. HTML alındı. Uzunluk:", htmlText.length);

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlText;
        console.log("6. DOM oluşturuldu.");

        // --- Verileri Çek ---
        let resimUrl = "";
        let urunlerLinks = [];
        let parcaKodu = "-", boyamaNotu = "-", stokAdedi = "-", toplamOp = "-";
        let opKodlari = [];

        const imgEl = tempDiv.querySelector('.ui.image img');
        if (imgEl) resimUrl = imgEl.getAttribute('src').replace(/\\/g, '/');
        console.log("7. Resim URL:", resimUrl);

        const dts = tempDiv.querySelectorAll('dt');
        console.log("8. Bulunan dt sayısı:", dts.length);

        dts.forEach(dt => {
            const text = dt.innerText.trim();
            let dd = dt.nextElementSibling;
            while (dd && dd.tagName.toLowerCase() !== 'dd') {
                dd = dd.nextElementSibling;
            }
            if (!dd) return;

            if (text === 'Ürünler') {
                const links = dd.querySelectorAll('a');
                links.forEach(a => {
                    urunlerLinks.push({
                        name: a.innerText.trim(),
                        url: a.getAttribute('href')
                    });
                });
            } else if (text === 'Parça Kodu') {
                parcaKodu = dd.innerText.trim();
            } else if (text === 'Boyama Notu') {
                boyamaNotu = dd.innerText.trim();
            } else if (text === 'Stok') {
                stokAdedi = dd.innerText.trim();
            } else if (text === 'Toplam Operasyon Sayısı') {
                toplamOp = dd.innerText.trim();
            } else if (text === 'Operasyon Kodları') {
                const links = dd.querySelectorAll('a');
                links.forEach(a => {
                    opKodlari.push({
                        name: a.innerText.trim(),
                        url: a.getAttribute('href')
                    });
                });
            }
        });

        console.log("9. Veriler çekildi. Parça Kodu:", parcaKodu, "Stok:", stokAdedi);

        // --- HTML'i Oluştur ---
        let resimHtml = resimUrl ? `
            <div style="text-align:center; margin-bottom: 16px;">
                <img src="${resimUrl}" style="max-width: 100%; max-height: 250px; object-fit: contain; border-radius: 8px; cursor: pointer;" onclick="showImageModal('${resimUrl}')">
            </div>
        ` : '';

                let urunlerHtml = '';
        if (urunlerLinks.length > 0) {
            urunlerHtml = `
                <div class="detail-grid-item" style="grid-column: span 2; display: block;">
                    <span class="detail-label">Kullanıldığı Ürünler</span>
                    <div style="margin-top: 8px; max-height: 150px; overflow-y: auto;">
                        ${urunlerLinks.map(u => `<a href="javascript:void(0)" onclick="showProductDetail('${u.url}')" style="display:block; color: var(--primary); text-decoration: none; margin-bottom: 4px; font-size: 13px;">${u.name}</a>`).join('')}
                    </div>
                </div>
            `;
        }

        let opKodlariHtml = opKodlari.length > 0 
            ? opKodlari.map(o => `<a href="https://uys.edelkrone.com${o.url}" target="_blank" style="color: var(--primary); text-decoration: none; margin-right: 8px;">${o.name}</a>`).join('') 
            : '-';

        content.innerHTML = `
            ${resimHtml}
            <div class="detail-grid" style="grid-template-columns: 1fr 1fr;">
                <div class="detail-grid-item">
                    <span class="detail-label">Parça Kodu</span>
                    <span class="detail-value">${parcaKodu}</span>
                </div>
                <div class="detail-grid-item">
                    <span class="detail-label">Stok Adedi</span>
                    <span class="detail-value">${stokAdedi}</span>
                </div>
                <div class="detail-grid-item">
                    <span class="detail-label">Toplam Operasyon Sayısı</span>
                    <span class="detail-value">${toplamOp}</span>
                </div>
                <div class="detail-grid-item">
                    <span class="detail-label">Operasyon Kodları</span>
                    <span class="detail-value">${opKodlariHtml}</span>
                </div>
                <div class="detail-grid-item" style="grid-column: span 2;">
                    <span class="detail-label">Boyama Notu</span>
                    <span class="detail-value" style="color: var(--danger); font-weight: bold;">${boyamaNotu}</span>
                </div>
                ${urunlerHtml}
            </div>
        `;
        console.log("10. HTML basıldı. İşlem tamam.");

    } catch (err) {
        console.error("HATA:", err);
        content.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--danger); font-weight: bold;">Hata: ${err.message}</div>`;
    }
}

// --- ÜRÜN DETAYI (Sadece Resim, Ürün Adı, Montaj Şeması) ---
async function showProductDetail(detayUrl) {
    // Başlığı "Ürün Detayı" yap
    const modalTitle = document.getElementById('depoDetailModalTitle');
    if (modalTitle) modalTitle.innerText = "Ürün Detayı";
    
    // Geri butonunu göster
    const backBtn = document.getElementById('depoDetailBackBtn');
    if (backBtn) backBtn.style.display = 'inline-block';
	
    // Mevcut parça detay modalını kullanacağız
    openModal('depoDetailModal');
    const content = document.getElementById('depoDetailContent');
    
    // Başlığı "Ürün Detayı" olarak değiştir
    const headerTitle = document.querySelector('#depoDetailModal .modal-title');
    if (headerTitle) headerTitle.innerText = "Ürün Detayı";
    
    content.innerHTML = '<div style="text-align:center; padding: 40px;">Ürün detayları çekiliyor...</div>';

    try {
        const path = detayUrl.replace(/^\//, '');
        const response = await fetchWithAuth(`${API_URL}?path=${encodeURIComponent(path)}`);
        if (!response.ok) throw new Error("Sunucu hatası");
        const htmlText = await response.text();
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlText;
        
        let resimUrl = "";
        let urunAdi = "-", montajSemasi = null;

        // Resim
        const imgEl = tempDiv.querySelector('.ui.image img');
        if (imgEl) resimUrl = imgEl.getAttribute('src').replace(/\\/g, '/');

        // dt/dd Döngüsü
        const dts = tempDiv.querySelectorAll('dt');
        dts.forEach(dt => {
            const text = dt.innerText.trim();
            let dd = dt.nextElementSibling;
            while (dd && dd.tagName.toLowerCase() !== 'dd') {
                dd = dd.nextElementSibling;
            }
            if (!dd) return;

            if (text === 'Ürün Adı') {
                urunAdi = dd.innerText.trim();
            } else if (text === 'Montaj Şeması') {
                const link = dd.querySelector('a');
                if (link) montajSemasi = link.getAttribute('href');
            }
        });

        // HTML oluştur (Parça detay ile aynı tasarım)
        let resimHtml = resimUrl ? `
            <div style="text-align:center; margin-bottom: 16px;">
                <img src="${resimUrl}" style="max-width: 100%; max-height: 250px; object-fit: contain; border-radius: 8px; cursor: pointer;" onclick="showImageModal('${resimUrl}')">
            </div>
        ` : '';

        let montajHtml = montajSemasi ? `
            <div class="detail-grid-item" style="grid-column: span 2;">
                <span class="detail-label">Montaj Şeması</span>
                <span class="detail-value">
                    <a href="${montajSemasi}" target="_blank" style="color: var(--primary); text-decoration: none; font-weight: bold;">📄 Görüntüle</a>
                </span>
            </div>
        ` : '';

        content.innerHTML = `
            ${resimHtml}
            <div class="detail-grid" style="grid-template-columns: 1fr;">
                <div class="detail-grid-item">
                    <span class="detail-label">Ürün Adı</span>
                    <span class="detail-value">${urunAdi}</span>
                </div>
                ${montajHtml}
            </div>
        `;

    } catch (err) {
        content.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--danger); font-weight: bold;">Hata: ${err.message}</div>`;
    }
}

// --- PARÇA DETAYINA GERİ DÖN ---
function goBackToPartDetail() {
    if (aktifParcaDetayUrl) {
        showDepoDetail(aktifParcaDetayUrl);
    }
}

// Takvimi ilk kez çiz
renderCalendar();