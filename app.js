// --- KONFİGÜRASYON ---
const API_URL = "https://edelkrone-api.06mmt8129.workers.dev";

const CACHE_PREFIX = "cache_";

const CACHE_AGES = {
    aktifPartiler: 5 * 60 * 1000,
    operatorler: 30 * 60 * 1000,
    ayarcilar: 30 * 60 * 1000,
    depo: 3 * 24 * 60 * 60 * 1000,
    yeniPartiler: 15 * 60 * 1000,
    selectBenchDetails: 10 * 60 * 1000,
    tezgahKapatma: 2 * 60 * 1000,
    default: 30 * 60 * 1000
};



function setCache(key, data) {
    try {
        let totalSize = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            totalSize += (localStorage.getItem(k) || '').length * 2;
        }
        if (totalSize > 4.8 * 1024 * 1024) {
            Object.keys(localStorage).forEach(k => {
                if (k.startsWith(CACHE_PREFIX) || k.includes("edelkrone_")) {
                    localStorage.removeItem(k);
                }
            });
            localStorage.removeItem("edelkrone_bench_selections");
            localStorage.removeItem("edelkrone_bench_clicks");
            localStorage.removeItem("edelkrone_bench_sort_order");
            localStorage.removeItem("edelkrone_time_limit");
        }

        const payload = {
            timestamp: Date.now(),
            data: data
        };

        localStorage.setItem(
            CACHE_PREFIX + key,
            JSON.stringify(payload)
        );
    } catch (e) {
        console.error("Cache yazma hatası:", e);
    }
}

function getCache(key) {
    try {
        const raw = localStorage.getItem(CACHE_PREFIX + key);

        if (!raw) {
            return null;
        }

        const parsed = JSON.parse(raw);

        if (!parsed || typeof parsed !== "object") {
            removeCache(key);
            return null;
        }

        if (!parsed.timestamp) {
            return parsed.data ?? null;
        }

        const maxAge =
            CACHE_AGES[key] ||
            CACHE_AGES.default;

        const now = Date.now();

        if ((now - parsed.timestamp) > maxAge) {
            removeCache(key);
            return null;
        }

        return parsed.data;
    } catch (e) {
        return null;
    }
}

function removeCache(key) {
    localStorage.removeItem(CACHE_PREFIX + key);
}

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

function clearCache() {
    showConfirmModal("Tüm önbellek verileri (listeler, detaylar, tezgah seçimleri) silinecek. Emin misiniz?", () => {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(CACHE_PREFIX) || key.includes("edelkrone_")) {
                localStorage.removeItem(key);
            }
        });
        localStorage.removeItem("edelkrone_bench_selections");
        localStorage.removeItem("edelkrone_bench_clicks");
        localStorage.removeItem("edelkrone_bench_sort_order");
        localStorage.removeItem("edelkrone_time_limit");
        
        showInfoModal("Başarılı", "Önbellek temizlendi. Sayfayı yenileyerek güncel verileri çekebilirsiniz.");
    });
}

function resetApp() {
    showConfirmModal("Uygulama tamamen sıfırlanacak (Giriş, tema, ayarlar dahil). Emin misiniz?", () => {
        localStorage.clear();
        location.reload();
    });
}

// --- ALT TAB KATMANI VE NAVİGASYON ---
// let activeBottomTab = null;
let bottomTabHomeScreenId = null;
const BOTTOM_TAB_SCREENS = {
    hesapMakinesi: 'hesapMakinesiScreen',
    aktifPartiler: 'aktifPartilerScreen',
    tezgahKapatma: 'tezgahKapatmaScreen',
    depo: 'depoScreen',
    operatorAtamalari: 'operatorAtamalariScreen',
    ayarciAtamalari: 'ayarciAtamalariScreen'
};
const bottomTabScreenMap = BOTTOM_TAB_SCREENS;

let activeBottomTab = null;
let bottomTabSourceEl = null;

function getCurrentBaseScreenId() {
    const visiblePage = Array.from(document.querySelectorAll('.page-container')).find(el => !el.classList.contains('hidden'));
    return visiblePage ? visiblePage.id : 'homeScreen';
}

function syncBottomTabBarUI() {
    document.querySelectorAll('#bottomTabBar .bottom-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === activeBottomTab);
    });
}

function updateTopBarControls() {
    const backBtn = document.getElementById('backBtn');
    const menuBtn = document.getElementById('menuBtn');
    if (activeBottomTab) {
        backBtn.style.display = 'block';
        menuBtn.style.display = 'none';
        return;
    }
    const homeHidden = document.getElementById('homeScreen').classList.contains('hidden');
    backBtn.style.display = homeHidden ? 'block' : 'none';
    menuBtn.style.display = homeHidden ? 'none' : 'block';
}

function openBottomTab(tabName) {
	closeModal('partyDetailModal');
    const screenId = BOTTOM_TAB_SCREENS[tabName];
    const screenEl = screenId ? document.getElementById(screenId) : null;
    const overlay = document.getElementById('bottomTabOverlay');
    const content = document.getElementById('bottomTabContent');
    if (!screenEl || !overlay || !content) return;

    if (activeBottomTab) {
        closeBottomTab(true);
    }

    document.querySelectorAll('.bottom-tab-back-row').forEach(el => el.remove());

    bottomTabSourceEl = screenEl.parentElement;
    screenEl.classList.remove('hidden');
    content.appendChild(screenEl);
    overlay.classList.remove('hidden');
    overlay.scrollTop = 0;
    activeBottomTab = tabName;
    sessionStorage.setItem('sonAltSekme', tabName);

    syncBottomTabBarUI();
    updateTopBarControls();

    if (tabName === 'aktifPartiler' && typeof fetchParties === 'function') fetchParties();
    else if (tabName === 'tezgahKapatma' && typeof renderTezgahKapatma === 'function') renderTezgahKapatma();
    else if (tabName === 'depo' && typeof fetchDepo === 'function') fetchDepo();
    else if (tabName === 'operatorAtamalari' && typeof fetchOperators === 'function') fetchOperators();
    else if (tabName === 'ayarciAtamalari' && typeof fetchAyarcilar === 'function') fetchAyarcilar();
}

function closeBottomTab(fromPopstate = false) {
    const overlay = document.getElementById('bottomTabOverlay');
    const content = document.getElementById('bottomTabContent');
    if (!activeBottomTab || !overlay || !content) return;

    const screenId = BOTTOM_TAB_SCREENS[activeBottomTab];
    const screenEl = screenId ? document.getElementById(screenId) : null;

    if (screenEl && bottomTabSourceEl) {
        screenEl.classList.add('hidden');
        bottomTabSourceEl.appendChild(screenEl);
    }

    content.innerHTML = '';
    overlay.classList.add('hidden');
    activeBottomTab = null;
    bottomTabSourceEl = null;
    sessionStorage.removeItem('sonAltSekme');

    syncBottomTabBarUI();
    updateTopBarControls();
}

function handleTopBackBtn() {
    const partyModal = document.getElementById('partyDetailModal');
    if (partyModal && partyModal.classList.contains('active')) {
        closeModal('partyDetailModal');
        return;
    }
    if (activeBottomTab) {
        closeBottomTab(true);
        return;
    }
    navigateTo('home');
}

function navigateTo(screenId) {
    closeBottomTab(false);

    if (typeof KayitGirisApp !== 'undefined' && typeof KayitGirisApp.stopColorCheckInterval === 'function') {
        KayitGirisApp.stopColorCheckInterval();
    }

    document.querySelectorAll('.home-container, .page-container').forEach(el => el.classList.add('hidden'));

    if (screenId === 'home') {
        document.getElementById('homeScreen').classList.remove('hidden');
        sessionStorage.setItem('sonEkran', 'home');
    } else {
        const targetScreen = document.getElementById(screenId + 'Screen');
        if (targetScreen) {
            targetScreen.classList.remove('hidden');
            sessionStorage.setItem('sonEkran', screenId);
        }

        if (screenId === 'aktifPartiler') fetchParties();
        else if (screenId === 'operatorAtamalari') fetchOperators();
        else if (screenId === 'ayarciAtamalari') fetchAyarcilar();
        else if (screenId === 'depo') fetchDepo();
        else if (screenId === 'yeniParti') fetchYeniPartiler();
        else if (screenId === 'tezgahKapatma') renderTezgahKapatma();
        else if (screenId === 'kayitGiris') KayitGirisApp.init();
    }

    updateTopBarControls();
}

function getActiveRefreshTargetId() {
    if (activeBottomTab) {
        return bottomTabScreenMap[activeBottomTab];
    }
    const visiblePage = Array.from(document.querySelectorAll('.page-container')).find(el => !el.classList.contains('hidden'));
    return visiblePage ? visiblePage.id : 'homeScreen';
}

let activeDetailPartiNo = null;
async function fetchPartyDetailByNo(partiNo) {
    const cleanNo = String(partiNo || '').trim();
    if (!cleanNo) return null;
    const detayRes = await fetchWithAuth(`${API_URL}?path=Manufacturing/ProductionBatches/Details/${encodeURIComponent(cleanNo)}`);
    if (!detayRes.ok) return null;
    const detayHtml = await detayRes.text();
    const detayDoc = new DOMParser().parseFromString(detayHtml, "text/html");

    let resimUrl = "", kalanSure = "-", kalanMiktar = "-", basariliMiktar = "-", hedeflenenMiktar = "-";
    let operasyondaCikanAdet = "-", tezgahOperasyonSuresi = "-", birinciKaliteVaka = "-", ikinciKaliteVaka = "-";
    let ayarcilar = "", numuneKontrolu = "";
    let uretimRaporu = [];

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

    const ayarciArr = [];
    detayDoc.querySelectorAll('.ui.list .item .header').forEach(el => ayarciArr.push(el.innerText.trim()));
    ayarcilar = ayarciArr.join(', ');

    detayDoc.querySelectorAll('.ui.fluid.table tbody tr').forEach(row => {
        const cols = row.querySelectorAll('td');
        if (cols.length >= 6) {
            const onclickAttr = cols[3].querySelector('a')?.getAttribute('onclick') || "";
            const vakaIdMatch = onclickAttr.match(/\d+/);
            uretimRaporu.push({
                tarih: cols[0].innerText.trim().replace(/\n/g, ' '),
                minHedef: cols[1].innerText.trim(),
                uretilen: cols[2].innerText.trim(),
                vakaSayisi: cols[3].innerText.trim(),
                vakaLinkId: vakaIdMatch ? vakaIdMatch[0] : "",
                operator: cols[4].innerText.trim(),
                kaliteci: cols[5].innerText.trim()
            });
        }
    });

    return {
        resimUrl, kalanSure, kalanMiktar, basariliMiktar, hedeflenenMiktar,
        operasyondaCikanAdet, tezgahOperasyonSuresi, birinciKaliteVaka,
        ikinciKaliteVaka, ayarcilar, numuneKontrolu, uretimRaporu
    };
}

async function refreshSinglePartyDetail(partiNo) {
    const cleanNo = String(partiNo || '').trim();
    if (!cleanNo) return;
    const baseItem = Array.isArray(partyData)
        ? partyData.find(x => String(x.partiNo) === cleanNo)
        : null;
    const detailData = await fetchPartyDetailByNo(cleanNo);
    const merged = { ...(baseItem || {}), ...(detailData || {}), partiNo: cleanNo };
    if (Array.isArray(partyData)) {
        const idx = partyData.findIndex(x => String(x.partiNo) === cleanNo);
        if (idx !== -1) partyData[idx] = { ...partyData[idx], ...merged };
    }
    showPartyDetail(merged);
}

async function refreshCurrentPage() {
    const partyModal = document.getElementById('partyDetailModal');
    if (partyModal && partyModal.classList.contains('active') && activeDetailPartiNo) {
        await refreshSinglePartyDetail(activeDetailPartiNo);
        return;
    }

    const targetId = getActiveRefreshTargetId();

    if (targetId === 'aktifPartilerScreen') {
        if (typeof removeCache === 'function') removeCache('aktifPartiler');
        if (typeof fetchParties === 'function') await fetchParties(true);
    } else if (targetId === 'operatorAtamalariScreen') {
        if (typeof removeCache === 'function') removeCache('operatorler');
        if (typeof fetchOperators === 'function') await fetchOperators(true);
    } else if (targetId === 'ayarciAtamalariScreen') {
        if (typeof removeCache === 'function') removeCache('ayarcilar');
        if (typeof fetchAyarcilar === 'function') await fetchAyarcilar(true);
    } else if (targetId === 'yeniPartiScreen') {
        if (typeof removeCache === 'function') removeCache('yeniPartiler');
        if (typeof fetchYeniPartiler === 'function') await fetchYeniPartiler(true);
    } else if (targetId === 'kayitGirisScreen') {
        if (typeof removeCache === 'function') removeCache('selectBenchDetails');
        if (typeof KayitGirisApp !== 'undefined') await KayitGirisApp.fetchBenchDetails(true);
    } else if (targetId === 'depoScreen') {
        if (typeof removeCache === 'function') removeCache('depo');
        if (typeof fetchDepo === 'function') await fetchDepo(true);
    } else if (targetId === 'tezgahKapatmaScreen') {
        if (typeof removeCache === 'function') removeCache('tezgahKapatma');
        if (typeof renderTezgahKapatma === 'function') await renderTezgahKapatma(true);
    } else if (typeof fetchWeather === 'function') {
        await fetchWeather();
    }
}
// --- AKTİF PARTİLER ---
let currentSort = 0;
let partyData = [];

async function fetchParties(forceRefresh = false) {
    const listContainer = document.getElementById('partyList');
    const countText = document.getElementById('activeBenchCount');
    
    const cachedData = !forceRefresh ? getCache('aktifPartiler') : null;
    if (cachedData) {
        partyData = cachedData;
        renderParties();
        return;
    }

    listContainer.innerHTML = '<div style="text-align:center; padding: 40px; font-weight:bold; color: var(--gray);">Veriler çekiliyor...</div>';
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
        setCache('aktifPartiler', partyData);
        renderParties();
        
    } catch (err) {
        listContainer.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--danger); font-weight:bold;">Hata: ${err.message}</div>`;
        countText.innerText = "Bağlantı Hatası";
    }
}

function renderParties(veri = null) {
    const listContainer = document.getElementById('partyList');
    listContainer.innerHTML = '';
    
    let sortedData = veri ? [...veri] : [...partyData];

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
    
    let sortedData = [...partyData];
    
    if (type === 1) {
        sortedData.sort((a, b) => parseTimeToMinutes(a.kalanSure) - parseTimeToMinutes(b.kalanSure));
    } else if (type === 2) {
        sortedData.sort((a, b) => parseTimeToMinutes(b.kalanSure) - parseTimeToMinutes(a.kalanSure));
    } else {
        sortedData.sort((a, b) => (b.operatör || "").localeCompare(a.operatör || ""));
    }
    
    renderParties(sortedData);
}

function parseTimeToMinutes(timeStr) {
    if (!timeStr || timeStr === "-") return 999999999;

    let totalSeconds = 0;
    const hourMatch = timeStr.match(/(\d+)\s*saat/);
    const minMatch = timeStr.match(/(\d+)\s*dk/);
    const secMatch = timeStr.match(/(\d+)\s*sn/);

    if (hourMatch) totalSeconds += parseInt(hourMatch[1]) * 3600;
    if (minMatch) totalSeconds += parseInt(minMatch[1]) * 60;
    if (secMatch) totalSeconds += parseInt(secMatch[1]);

    if (totalSeconds === 0 && !isNaN(parseInt(timeStr))) {
        return parseInt(timeStr) * 60; 
    }

    return totalSeconds;
}

function highlightNegativeDiffRows() {
    const container = document.getElementById('partyDetailContent');
    if (!container) return;
    container.querySelectorAll('table tr').forEach(tr => {
        const cells = [...tr.querySelectorAll('td')];
        if (cells.length < 6) return;
        const val = parseFloat((cells[5].innerText || '').trim().replace(',', '.'));
        if (!Number.isNaN(val) && val < 0) {
            cells.forEach(td => td.style.setProperty('background-color', 'rgba(239, 68, 68, 0.22)', 'important'));
        }
    });
}

function updateTezgahKapatmaCounts() {
    const list = document.getElementById('tezgahKapatmaList');
    if (!list) return;
    const cards = [...list.querySelectorAll('.tezgah-btn')];
    const acik = cards.filter(el => el.style.backgroundColor.includes('220, 252, 231') || el.style.border.includes('34, 197, 94') || el.style.border.includes('#22C55E')).length;
    const kapali = cards.filter(el => el.style.backgroundColor.includes('254, 226, 226') || el.style.border.includes('239, 68, 68') || el.style.border.includes('#EF4444')).length;
    const acikEl = document.getElementById('acikTezgahSayisi');
    const kapaliEl = document.getElementById('kapaliTezgahSayisi');
    if (acikEl) acikEl.innerText = acik;
    if (kapaliEl) kapaliEl.innerText = kapali;
}

// --- PARTİ DETAY MODALI ---
function showPartyDetail(p) {
    activeDetailPartiNo = p?.partiNo || null;
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
        const aylar = {
            "Oca": 0, "Şub": 1, "Mar": 2, "Nis": 3, "May": 4, "Haz": 5,
            "Tem": 6, "Ağu": 7, "Eyl": 8, "Eki": 9, "Kas": 10, "Ara": 11
        };

        const vardiyaGunuAl = (tarihStr) => {
            const m = tarihStr.match(/(\d{1,2})\s+([A-Za-zğüşıöçĞÜŞİÖÇ]+)\s+(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
            if (!m) return { etiket: tarihStr.trim() || "Tarihsiz", zaman: 0 };
            let gun = parseInt(m[1], 10);
            const ayAd = m[2];
            let yil = parseInt(m[3], 10);
            const saat = m[4] ? parseInt(m[4], 10) : 12;

            let tarihObj = new Date(yil, aylar[ayAd.slice(0, 3)] ?? 0, gun);
            if (saat < 6) {
                tarihObj.setDate(tarihObj.getDate() - 1);
            }
            const ayIsimleri = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
            const g = tarihObj.getDate();
            const a = ayIsimleri[tarihObj.getMonth()];
            const y = tarihObj.getFullYear();

            return {
                etiket: `${g} ${a} ${y}`,
                zaman: tarihObj.getTime()
            };
        };

        const grupluRapor = p.uretimRaporu.reduce((acc, row) => {
            const { etiket, zaman } = vardiyaGunuAl(row.tarih);
            if (!acc[etiket]) acc[etiket] = { etiket, zaman, satirlar: [] };
            acc[etiket].satirlar.push(row);
            return acc;
        }, {});

        const satirdanSonZamanAl = (tarihStr) => {
            const matches = [...tarihStr.matchAll(/(\d{1,2})\s+([A-Za-zğüşıöçĞÜŞİÖÇ]+)\s+(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/g)];
            const son = matches[matches.length - 1];
            if (!son) return 0;
            const gun = parseInt(son[1], 10);
            const ayIdx = aylar[son[2].slice(0, 3)] ?? 0;
            const yil = parseInt(son[3], 10);
            const saat = son[4] ? parseInt(son[4], 10) : 0;
            const dk = son[5] ? parseInt(son[5], 10) : 0;
            return new Date(yil, ayIdx, gun, saat, dk).getTime();
        };

        const siraliGruplar = Object.values(grupluRapor)
            .map(grup => {
                const enYeniZaman = Math.max(...grup.satirlar.map(s => satirdanSonZamanAl(s.tarih)));
                return { ...grup, enYeniZaman };
            })
            .sort((a, b) => b.enYeniZaman - a.enYeniZaman);

        raporHtml = `<h3 style="margin-top: 24px; margin-bottom: 12px;">Üretim Raporu</h3>`;

        siraliGruplar.forEach(({ etiket, satirlar }) => {
            let toplamHedef = 0, toplamUretilen = 0, toplamVaka = 0;
            satirlar.forEach(s => {
                toplamHedef += parseInt(s.minHedef) || 0;
                toplamUretilen += parseInt(s.uretilen) || 0;
                toplamVaka += parseInt(s.vakaSayisi) || 0;
            });

            const siraliSatirlar = [...satirlar].sort((a, b) => satirdanSonZamanAl(b.tarih) - satirdanSonZamanAl(a.tarih));
            const ilkKaliteci = (siraliSatirlar[0]?.kaliteci || '').trim();

            raporHtml += `
                <div class="rapor-group">
                    <h4 class="rapor-kaliteci">${etiket} — <span class="sticky-kaliteci-adi" style="font-weight: 600; opacity: 0.85;">${ilkKaliteci}</span></h4>
                    <div style="overflow-x: auto;">
                        <table class="rapor-table">
                            <thead><tr><th>Tarih</th><th>Oper.</th><th>Kaliteci</th><th>Hdf</th><th>Ürt.</th><th>Fark</th><th>Vaka</th></tr></thead>
                            <tbody>
                                ${(() => {
                                    const kaliteciToplamlari = siraliSatirlar.reduce((acc, s) => {
                                        const k = s.kaliteci || "-";
                                        acc[k] = (acc[k] || 0) + (parseInt(s.uretilen) || 0);
                                        return acc;
                                    }, {});

                                    return siraliSatirlar.map((s, idx) => {
                                        const hedef = parseInt(s.minHedef) || 0;
                                        const uretilen = parseInt(s.uretilen) || 0;
                                        const fark = uretilen - hedef;
                                        const farkMetin = fark > 0 ? `+${fark}` : `${fark}`;
                                        const farkRenk = hedef > uretilen ? '#ff2a2a' : '#00ff66';
                                        const uretilenRenk = uretilen < hedef ? '#fca5a5' : (uretilen > hedef ? '#86efac' : 'inherit');
                                        let vakaHtml = parseInt(s.vakaSayisi) > 0 
                                            ? `<span style="color: var(--danger); font-weight: bold; cursor: pointer; text-decoration: underline;" onclick="openVakaModal('${s.vakaLinkId}', '${s.vakaSayisi}')">${s.vakaSayisi}</span>` 
                                            : `<span style="color: gray;">0</span>`;

                                        const mevcutKaliteci = (s.kaliteci || "-").trim();
                                        const sonrakiKaliteci = siraliSatirlar[idx + 1] ? ((siraliSatirlar[idx + 1].kaliteci || "-").trim()) : null;
                                        const blokBitti = sonrakiKaliteci !== mevcutKaliteci;

                                        const satirHtml = `
                                            <tr data-kaliteci="${mevcutKaliteci.replace(/"/g, '&quot;')}">
                                                <td>${s.tarih}</td>
                                                <td style="color: #4ade80;">${s.operator}</td>
                                                <td style="color: #7dd3fc;">${s.kaliteci}</td>
                                                <td>${hedef}</td>
                                                <td style="color: ${uretilenRenk}; font-weight: bold;">${uretilen}</td>
                                                <td style="color: ${farkRenk}; font-weight: bold;">${farkMetin}</td>
                                                <td>${vakaHtml}</td>
                                            </tr>
                                        `;

                                        const kaliteciOzetHtml = blokBitti ? `
                                            <tr style="border-bottom: 2px solid #4ade80; background: rgba(74, 222, 128, 0.08); font-weight: bold;">
                                                <td colspan="4" style="color: #7dd3fc; text-align: right; padding-right: 12px;">${mevcutKaliteci} Toplam:</td>
                                                <td style="color: #4ade80;">${kaliteciToplamlari[mevcutKaliteci]}</td>
                                                <td colspan="2"></td>
                                            </tr>
                                        ` : '';

                                        return satirHtml + kaliteciOzetHtml;
                                    }).join('');
                                })()}
                                <tr style="border-top: 2px solid var(--danger); font-weight: bold;">
                                    <td colspan="3" style="color: var(--danger);">TOPLAM</td>
                                    <td>${toplamHedef}</td>
                                    <td>${toplamUretilen}</td>
                                    <td style="color: ${toplamHedef > toplamUretilen ? '#ff2a2a' : '#00ff66'};">${(toplamUretilen - toplamHedef) > 0 ? `+${toplamUretilen - toplamHedef}` : (toplamUretilen - toplamHedef)}</td>
                                    <td style="color: var(--danger);">${toplamVaka}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        });
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
	highlightNegativeDiffRows();
partyDetailContextForAI = document.getElementById('partyDetailContent').innerText;
    openModal('partyDetailModal');
    setTimeout(updateStickyKaliteci, 0);
}

function jumpToReportRow(tarihText, saatText) {
    closeModal('aiChatModal');
    openModal('partyDetailModal');
    setTimeout(() => {
        const modal = document.getElementById('partyDetailModal');
        const contentBox = document.getElementById('partyDetailContent');
        const rows = [...(contentBox || document).querySelectorAll('table tr')].filter(r => r.querySelector('td'));
        const target = rows.find(r => {
            const txt = r.innerText || '';
            return (!tarihText || txt.includes(tarihText)) && (!saatText || txt.includes(saatText));
        }) || rows.find(r => tarihText && (r.innerText || '').includes(tarihText));

        if (!target) return;

        const scroller = [contentBox, modal.querySelector('.modal-content'), modal].find(
            el => el && el.scrollHeight > el.clientHeight + 2
        );

        if (scroller) {
            const sRect = scroller.getBoundingClientRect();
            const tRect = target.getBoundingClientRect();
            scroller.scrollTop = Math.max(0, scroller.scrollTop + (tRect.top - sRect.top) - (scroller.clientHeight / 3));
        }

        let count = 0;
        const blink = setInterval(() => {
            const on = count % 2 === 0;
            [...target.cells].forEach(td => {
                td.style.backgroundColor = on ? 'rgba(239, 68, 68, 0.35)' : '';
            });
            target.style.outline = on ? '2px solid #ef4444' : '';
            count++;
            if (count >= 8) {
                clearInterval(blink);
                [...target.cells].forEach(td => { td.style.backgroundColor = ''; });
                target.style.outline = '';
            }
        }, 260);

        if (typeof updateStickyKaliteci === 'function') updateStickyKaliteci();
    }, 150);
}

function linkifyReportDates(text) {
    const clean = formatAIChatText(text);
    const escaped = clean.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const regex = /(\d{1,2}\s+(?:Oca|Şub|Mar|Nis|May|Haz|Tem|Ağu|Eyl|Eki|Kas|Ara)[a-zğüşıöç]*\s+\d{4})(?:\s+tarihinde)?(?:\s*\(?(\d{1,2}:\d{2})\s*[-–]\s*\d{1,2}:\d{2}\)?)?/gi;
    return escaped.replace(regex, (match, tarih, saat) => {
        const label = saat ? `${tarih} (${saat})` : tarih;
        return `<span style="color:#2563eb;font-weight:700;">${label}</span>`;
    });
}

function formatAIChatText(raw) {
    return String(raw || '')
        .replace(/\*\*/g, '')
        .replace(/^\s*\|?[\s:-]+(?:\|[\s:-]+)+\|?\s*$/gm, '')
        .replace(/^\s*\|\s*|\s*\|\s*$/gm, '')
        .replace(/\s*\|\s*/g, ' · ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function updateStickyKaliteci() {
    const contentEl = document.getElementById('partyDetailContent');
    const modalEl = document.getElementById('partyDetailModal');
    if (!contentEl || !modalEl || !modalEl.classList.contains('active')) return;

    const contentRect = contentEl.getBoundingClientRect();

    contentEl.querySelectorAll('.rapor-group').forEach(group => {
        const badge = group.querySelector('.sticky-kaliteci-adi');
        const header = group.querySelector('.rapor-kaliteci');
        if (!badge || !header) return;

        const headerBottom = header.getBoundingClientRect().bottom;
        const rows = [...group.querySelectorAll('tbody tr[data-kaliteci]')];
        if (rows.length === 0) return;

        let activeRow = rows.find(r => r.getBoundingClientRect().bottom > headerBottom + 2) || rows[rows.length - 1];
        if (activeRow.getBoundingClientRect().top > contentRect.bottom) return;

        const name = (activeRow.getAttribute('data-kaliteci') || '').trim();
        if (name && badge.textContent !== name) {
            badge.textContent = name;
        }
    });
}

(function bindPartyDetailKaliteciScroll() {
    const contentEl = document.getElementById('partyDetailContent');
    if (contentEl && !contentEl.dataset.kaliteciScrollBound) {
        contentEl.dataset.kaliteciScrollBound = '1';
        contentEl.addEventListener('scroll', updateStickyKaliteci, { passive: true });
    }
})();

// --- VAKA DETAY MODALI ---
async function openVakaModal(vakaLinkId, vakaSayisi) {
    openModal('vakaDetailModal');
    const content = document.getElementById('vakaModalContent');
    
    const cacheKey = 'vaka_' + vakaLinkId;
    const cachedData = getCache(cacheKey);
    if (cachedData) {
        renderVakaListesi(cachedData);
        return;
    }

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

        setCache(cacheKey, vakaListesi);
        renderVakaListesi(vakaListesi);

    } catch (err) {
        content.innerHTML = `<div style="text-align:center; padding: 20px; color: red;">Hata: ${err.message}</div>`;
    }
}

function renderVakaListesi(vakaListesi) {
    const content = document.getElementById('vakaModalContent');
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
}

async function fetchOperators(forceRefresh = false) {
    const listContainer = document.getElementById('operatorList');
    const countText = document.getElementById('operatorCount');
    
    const cachedData = !forceRefresh ? getCache('operatorler') : null;
    if (cachedData) {
        renderOperators(cachedData);
        return;
    }

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
            let toplamIs = "-";

            const rows = card.querySelectorAll('.ui.grid > .row');
            rows.forEach(row => {
                const cols = row.querySelectorAll('.column');
                if (cols.length >= 4) {
                    const tezgahEl = cols[0].querySelector('a') || cols[0];
                    const tezgah = tezgahEl ? tezgahEl.innerText.trim() : "";

                    const isAdiEl = cols[1].querySelector('a') || cols[1];
                    let isAdi = isAdiEl ? isAdiEl.innerText.trim() : "-";
                    if (!isAdi || isAdi === "") isAdi = "-";

                    const partiEl = cols[2].querySelector('a') || cols[2];
                    let partiNo = partiEl ? partiEl.innerText.trim() : "-";
                    if (!partiNo || partiNo === "") partiNo = "-";

                    if (tezgah && tezgah !== "" && tezgah.length < 10 && !tezgah.includes("icon") && !tezgah.includes("Toplam")) {
                        satirlar.push({ tezgah, isAdi, partiNo });
                    }
                }
            });

            satirlar.sort((a, b) => {
                const aDolu = (a.isAdi !== "-" && a.isAdi !== "") ? 1 : 0;
                const bDolu = (b.isAdi !== "-" && b.isAdi !== "") ? 1 : 0;
                return bDolu - aDolu;
            });

            operatorData.push({ isim, foto, satirlar, toplamIs });
        });

        operatorData.sort((a, b) => {
            const aDolu = a.satirlar.filter(s => s.isAdi !== "-" && s.isAdi !== "").length;
            const bDolu = b.satirlar.filter(s => s.isAdi !== "-" && s.isAdi !== "").length;
            return bDolu - aDolu;
        });

        setCache('operatorler', operatorData);
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

    operators.forEach(op => {
        op.satirlar.forEach(s => {
            if (s.isAdi !== "-" && s.isAdi !== "") toplamDolu++;
            else toplamBos++;
        });
    });

    countText.innerHTML = `<span style="color: #4ADE80;">Dolu Tezgah: ${toplamDolu}</span> &nbsp;|&nbsp; <span style="color: #EF4444;">Boş Tezgah: ${toplamBos}</span>`;

    if (operators.length === 0) {
        listContainer.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--gray);">Atanmış operatör bulunamadı.</div>';
        return;
    }

    operators.forEach(op => {
        const imgHtml = op.foto ? `<img src="${op.foto}" class="op-img" onerror="this.style.display='none'">` : `<div class="op-img"></div>`;
        let tableRows = '';
        
        op.satirlar.forEach(s => {
            const isDolu = s.isAdi !== "-" && s.isAdi !== "";
            const renkSinifi = isDolu ? "t-green" : "t-red";
            const gosterilecekIs = isDolu ? s.isAdi : "-";
            const partiText = isDolu ? s.partiNo : "-";

            let partiHtml = partiText;
            if (isDolu && partiText !== "-" && !isNaN(parseInt(partiText))) {
                const partiDetayUrl = `https://uys.edelkrone.com/Manufacturing/ProductionBatches/Details/${partiText}`;
                partiHtml = `<a href="${partiDetayUrl}" target="_blank" style="color: #60A5FA; text-decoration: none; font-weight: bold;">${partiText}</a>`;
            }

            tableRows += `
                <tr>
                    <td class="t-name ${renkSinifi}">${s.tezgah}</td>
                    <td style="color: ${isDolu ? 'inherit' : '#4ADE80'};">${gosterilecekIs}</td>
                    <td style="color: ${isDolu ? 'inherit' : '#4ADE80'};">${partiHtml}</td>
                </tr>
            `;
        });

        const calisanSayisi = op.satirlar.filter(s => s.isAdi !== "-" && s.isAdi !== "").length;
        const calismayanSayisi = op.satirlar.length - calisanSayisi;

        const card = document.createElement('div');
        card.className = 'operator-card';
        card.innerHTML = `
            <div class="card-header">
                <div class="op-info">
                    ${imgHtml}
                    <div class="op-name">${op.isim}</div>
                </div>
                <div style="display: flex; gap: 12px; font-size: 0.75rem; text-align: center;">
                    <div>
                        <div style="color: var(--gray); font-size: 0.65rem;">Açık Tezgah</div>
                        <span style="color: #4ADE80; font-weight: bold; font-size: 0.9rem;">${calisanSayisi}</span>
                    </div>
                    <div>
                        <div style="color: var(--gray); font-size: 0.65rem;">Kapalı Tezgah</div>
                        <span style="color: #EF4444; font-weight: bold; font-size: 0.9rem;">${calismayanSayisi}</span>
                    </div>
                    <div>
                        <div style="color: var(--gray); font-size: 0.65rem;">Toplam Tezgah</div>
                        <span style="color: var(--text); font-weight: bold; font-size: 0.9rem;">${op.satirlar.length}</span>
                    </div>
                </div>
            </div>
            <table class="op-table">
                <thead><tr><th>Tezgah</th><th>İş</th><th>Parti</th></tr></thead>
                <tbody>${tableRows}</tbody>
            </table>
        `;
        listContainer.appendChild(card);
    });
}

// --- DEPO (PARÇA ARAMA) ---
let tumDepoVerileri = [];

async function fetchDepo(forceRefresh = false) {
    const listContainer = document.getElementById('depoResults');
    
    const cachedData = !forceRefresh ? getCache('depo') : null;
    if (cachedData) {
        tumDepoVerileri = cachedData;
        renderDepo(tumDepoVerileri);
        return;
    }

    listContainer.innerHTML = '<div style="text-align:center; padding: 40px; font-weight:bold; color: var(--gray);">Parçalar çekiliyor, lütfen bekleyin...</div>';

    try {
        const response = await fetchWithAuth(`${API_URL}?path=Manufacturing/Parts`);
        if (!response.ok) throw new Error("Sunucu hatası");
        const htmlText = await response.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, "text/html");
        const rows = doc.querySelectorAll('#partsTable tbody tr');
        tumDepoVerileri = [];

        rows.forEach(row => {
            const cols = row.querySelectorAll('td');
            if (cols.length >= 5) {
                const imgEl = cols[0].querySelector('img');
                const resimUrl = imgEl ? imgEl.getAttribute('src').replace(/\\/g, '/') : "";
                
                const isimLink = cols[1].querySelector('a');
                const isim = isimLink ? isimLink.innerText.trim() : cols[1].innerText.trim();
                const detayUrl = isimLink ? isimLink.getAttribute('href') : "";
                const raf = cols[1].innerText.replace(isim, "").trim();
                
                const operasyon = cols[2].innerText.trim();
                const tedarik = cols[3].innerText.trim();
                const durum = cols[4].innerText.trim();

                tumDepoVerileri.push({ isim, raf, durum, resimUrl, detayUrl, operasyon, tedarik });
            }
        });

        setCache('depo', tumDepoVerileri);
        renderDepo(tumDepoVerileri);
        
    } catch (err) {
        listContainer.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--danger); font-weight:bold;">Hata: ${err.message}</div>`;
    }
}

function filterDepo() {
    const searchText = document.getElementById('depoSearchInput').value.toLowerCase();
    if (searchText.trim() === "") {
        renderDepo(tumDepoVerileri);
        return;
    }
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
        
        const card = document.createElement('div');
        card.className = 'depo-card';
        
        const imgContainer = document.createElement('div');
        imgContainer.className = 'depo-img-container';
        imgContainer.onclick = () => showImageModal(u.resimUrl);
        imgContainer.innerHTML = u.resimUrl ? `<img src="${u.resimUrl}" loading="lazy" class="depo-img">` : `<div class="depo-img" style="background: #ccc;"></div>`;

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

        const detailBtn = document.createElement('button');
        detailBtn.className = 'depo-detail-btn';
        detailBtn.innerText = 'Detay';
        detailBtn.style.border = 'none';
        detailBtn.style.cursor = 'pointer';
        detailBtn.onclick = () => showDepoDetail(u.detayUrl);

        card.appendChild(imgContainer);
        card.appendChild(infoContainer);
        card.appendChild(detailBtn);
        
        listContainer.appendChild(card);
    });
}

// --- DEPO PARÇA DETAYI ---
let aktifParcaDetayUrl = "";

async function showDepoDetail(detayUrl) {
    aktifParcaDetayUrl = detayUrl;
    const modalTitle = document.getElementById('depoDetailModalTitle');
    if (modalTitle) modalTitle.innerText = "Parça Detayı";
    const backBtn = document.getElementById('depoDetailBackBtn');
    if (backBtn) backBtn.style.display = 'none';

    openModal('depoDetailModal');
    const content = document.getElementById('depoDetailContent');
    
    const cacheKey = 'parca_' + detayUrl.split('/').pop();
    const cachedData = getCache(cacheKey);
    if (cachedData) {
        renderDepoDetailHTML(cachedData);
        return;
    }

    content.innerHTML = '<div style="text-align:center; padding: 40px; font-weight: bold; color: var(--gray);">Parça detayları çekiliyor...</div>';

    try {
        const path = detayUrl.replace(/^\//, '');
        const response = await fetchWithAuth(`${API_URL}?path=${encodeURIComponent(path)}`);
        if (!response.ok) throw new Error("Sunucu hatası");
        const htmlText = await response.text();
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlText;
        
        let resimUrl = "";
        let urunlerLinks = [];
        let parcaKodu = "-", boyamaNotu = "-", stokAdedi = "-", toplamOp = "-";
        let opKodlari = [];

        const imgEl = tempDiv.querySelector('.ui.image img');
        if (imgEl) resimUrl = imgEl.getAttribute('src').replace(/\\/g, '/');

        const dts = tempDiv.querySelectorAll('dt');
        dts.forEach(dt => {
            const text = dt.innerText.trim();
            let dd = dt.nextElementSibling;
            while (dd && dd.tagName.toLowerCase() !== 'dd') { dd = dd.nextElementSibling; }
            if (!dd) return;

            if (text === 'Ürünler') {
                const links = dd.querySelectorAll('a');
                links.forEach(a => {
                    urunlerLinks.push({ name: a.innerText.trim(), url: a.getAttribute('href') });
                });
            } else if (text === 'Parça Kodu') { parcaKodu = dd.innerText.trim(); }
            else if (text === 'Boyama Notu') { boyamaNotu = dd.innerText.trim(); }
            else if (text === 'Stok') { stokAdedi = dd.innerText.trim(); }
            else if (text === 'Toplam Operasyon Sayısı') { toplamOp = dd.innerText.trim(); }
            else if (text === 'Operasyon Kodları') {
                const links = dd.querySelectorAll('a');
                links.forEach(a => { opKodlari.push({ name: a.innerText.trim(), url: a.getAttribute('href') }); });
            }
        });

        const dataToCache = { resimUrl, urunlerLinks, parcaKodu, boyamaNotu, stokAdedi, toplamOp, opKodlari };
        setCache(cacheKey, dataToCache);
        renderDepoDetailHTML(dataToCache);

    } catch (err) {
        content.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--danger); font-weight: bold;">Hata: ${err.message}</div>`;
    }
}

function renderDepoDetailHTML(data) {
    const content = document.getElementById('depoDetailContent');
    const { resimUrl, urunlerLinks, parcaKodu, boyamaNotu, stokAdedi, toplamOp, opKodlari } = data;

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
            <div class="detail-grid-item"><span class="detail-label">Parça Kodu</span><span class="detail-value">${parcaKodu}</span></div>
            <div class="detail-grid-item"><span class="detail-label">Stok Adedi</span><span class="detail-value">${stokAdedi}</span></div>
            <div class="detail-grid-item"><span class="detail-label">Toplam Operasyon Sayısı</span><span class="detail-value">${toplamOp}</span></div>
            <div class="detail-grid-item"><span class="detail-label">Operasyon Kodları</span><span class="detail-value">${opKodlariHtml}</span></div>
            <div class="detail-grid-item" style="grid-column: span 2;">
                <span class="detail-label">Boyama Notu</span>
                <span class="detail-value" style="color: var(--danger); font-weight: bold;">${boyamaNotu}</span>
            </div>
            ${urunlerHtml}
        </div>
    `;
}

// --- ÜRÜN DETAYI ---
async function showProductDetail(detayUrl) {
    const modalTitle = document.getElementById('depoDetailModalTitle');
    if (modalTitle) modalTitle.innerText = "Ürün Detayı";
    const backBtn = document.getElementById('depoDetailBackBtn');
    if (backBtn) backBtn.style.display = 'inline-block';

    const content = document.getElementById('depoDetailContent');
    
    const cacheKey = 'urun_' + detayUrl.split('/').pop();
    const cachedData = getCache(cacheKey);
    if (cachedData) {
        renderProductDetailHTML(cachedData);
        return;
    }

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

        const imgEl = tempDiv.querySelector('.ui.image img');
        if (imgEl) resimUrl = imgEl.getAttribute('src').replace(/\\/g, '/');

        const dts = tempDiv.querySelectorAll('dt');
        dts.forEach(dt => {
            const text = dt.innerText.trim();
            let dd = dt.nextElementSibling;
            while (dd && dd.tagName.toLowerCase() !== 'dd') { dd = dd.nextElementSibling; }
            if (!dd) return;

            if (text === 'Ürün Adı') { urunAdi = dd.innerText.trim(); }
            else if (text === 'Montaj Şeması') {
                const link = dd.querySelector('a');
                if (link) montajSemasi = link.getAttribute('href');
            }
        });

        const dataToCache = { resimUrl, urunAdi, montajSemasi };
        setCache(cacheKey, dataToCache);
        renderProductDetailHTML(dataToCache);

    } catch (err) {
        content.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--danger); font-weight: bold;">Hata: ${err.message}</div>`;
    }
}

function renderProductDetailHTML(data) {
    const content = document.getElementById('depoDetailContent');
    const { resimUrl, urunAdi, montajSemasi } = data;

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
}

function goBackToPartDetail() {
    if (aktifParcaDetayUrl) {
        showDepoDetail(aktifParcaDetayUrl);
    }
}

function showImageModal(url) {
    if (!url) return;
    const eskiModal = document.getElementById('fullImageModal');
    if (eskiModal) eskiModal.remove();

    const modal = document.createElement('div');
    modal.id = 'fullImageModal';
    modal.className = 'modal-overlay active';
    modal.style.zIndex = '9999';
    modal.style.background = 'rgba(0,0,0,0.85)'; 
    
    modal.innerHTML = `
        <div style="position:relative; width:100%; height:100%; display:flex; justify-content:center; align-items:center;">
            <img src="${url}" style="max-width:95%; max-height:95%; object-fit:contain; border-radius:8px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
            <button onclick="document.getElementById('fullImageModal').remove()" style="position:absolute; top: 20px; right: 20px; background: var(--danger); color: white; border: none; padding: 10px 15px; border-radius: 50%; font-size: 20px; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">✖</button>
        </div>
    `;
    document.body.appendChild(modal);
}

// --- TAKVİM MODALI ---
let calDate = new Date();
function renderCalendar() {
    const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    const monthYearEl = document.getElementById('calendarMonthYear');
    if (monthYearEl) monthYearEl.innerText = `${monthNames[calDate.getMonth()]} ${calDate.getFullYear()}`;
    
    const grid = document.getElementById('calendarGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].forEach(d => {
        const el = document.createElement('div'); el.className = 'calendar-day-name'; el.innerText = d; grid.appendChild(el);
    });

    const firstDay = new Date(calDate.getFullYear(), calDate.getMonth(), 1).getDay();
    const daysInMonth = new Date(calDate.getFullYear(), calDate.getMonth() + 1, 0).getDate();
    const today = new Date();
    
    let emptyDays = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = 0; i < emptyDays; i++) grid.appendChild(document.createElement('div'));

    for (let i = 1; i <= daysInMonth; i++) {
        const el = document.createElement('div');
        el.className = 'calendar-day'; el.innerText = i;
        if (i === today.getDate() && calDate.getMonth() === today.getMonth() && calDate.getFullYear() === today.getFullYear()) {
            el.classList.add('today');
        }
        grid.appendChild(el);
    }
}
function changeMonth(dir) { calDate.setMonth(calDate.getMonth() + dir); renderCalendar(); }
renderCalendar();

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

// --- AI İÇİN SAYFA BAĞLAMINI HAZIRLA ---
function getCurrentPageContext() {
    if (partyDetailContextForAI) {
        return "Parti Detayı Ekranındaki Veriler:\n" + partyDetailContextForAI;
    } else if (!document.getElementById('operatorAtamalariScreen').classList.contains('hidden')) {
        let context = "Operatör Atamaları Ekranındaki Veriler:\n";
        const cards = document.querySelectorAll('#operatorList .operator-card');
        cards.forEach(card => {
            const name = card.querySelector('.op-name')?.innerText || "";
            const benchCount = card.querySelector('.op-count')?.innerText || "";
            context += `Operatör: ${name}, Atandığı Tezgah: ${benchCount}\n`;
        });
        return context;
    } else if (!document.getElementById('ayarciAtamalariScreen').classList.contains('hidden')) {
        let context = "Ayarcı Atamaları Ekranındaki Veriler:\n";
        const cards = document.querySelectorAll('#ayarciList .ayarci-card');
        cards.forEach(card => {
            const name = card.querySelector('.ayarci-name')?.innerText || "";
            const unvan = card.querySelector('.ayarci-unvan')?.innerText || "";
            const rows = card.querySelectorAll('.ayarci-table tbody tr');
            let rowText = "";
            rows.forEach(r => {
                const cols = r.querySelectorAll('td');
                rowText += `Tezgah: ${cols[1].innerText}, Parça: ${cols[2].innerText}, Parti: ${cols[3].innerText}\n`;
            });
            context += `Ayarcı: ${name} (${unvan}), Atamaları: ${rowText}\n`;
        });
        return context;
    } else if (!document.getElementById('aktifPartilerScreen').classList.contains('hidden')) {
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
let partyDetailContextForAI = "";

function openPartyDetailAI() {
    partyDetailContextForAI = document.getElementById('partyDetailContent').innerText;
    closeModal('partyDetailModal');
    openModal('aiChatModal');
}

// --- AI SOHBET ---
async function sendAIMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;

    const history = document.getElementById('chatHistory');
    history.innerHTML += `<div class="chat-msg user">${text}</div>`;
    input.value = '';
    history.scrollTop = history.scrollHeight;

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
    const promptRule = "Kısa, net ve tablo/çizgi kullanmadan düz satırlarla cevap ver.";

    try {
        let aiResponse = "";

        if (engine === 'gemini') {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-4-hydrogen:generateContent?key=${apiKey}`;
            const payload = {
                contents: [{ parts: [{ text: `Sen bir web sayfası asistanısın. ${promptRule} Kullanıcının sorduğu soruyu, aşağıda verilen web sayfası içeriğine göre cevapla.\n\nSAYFA İÇERİĞİ:\n${pageContext}\n\nSORU: ${text}` }] }]
            };
            const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error?.message || "Gemini API hatası");
            aiResponse = data.candidates[0].content.parts[0].text;
        } else {
            const url = `https://api.groq.com/openai/v1/chat/completions`;
            const payload = {
                model: "openai/gpt-oss-120b",
                messages: [
                    { role: "system", content: `Sen bir web sayfası asistanısın. ${promptRule} Kullanıcının sorduğu soruyu, verilen web sayfası içeriğine göre cevapla.` },
                    { role: "user", content: `SAYFA İÇERİĞİ:\n${pageContext}\n\nSORU: ${text}` }
                ]
            };
            const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }, body: JSON.stringify(payload) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error?.message || "Groq API hatası");
            aiResponse = data.choices[0].message.content;
        }

        document.getElementById(loadingId).remove();
        history.innerHTML += `<div class="chat-msg ai">${linkifyReportDates(aiResponse)}</div>`;
        history.scrollTop = history.scrollHeight;

    } catch (err) {
        document.getElementById(loadingId).remove();
        history.innerHTML += `<div class="chat-msg ai" style="color: red;">Hata: ${err.message}</div>`;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    localStorage.removeItem('aktifSayfa');
    updateLoggedInUserUI();
    updateTopBarControls();
    const loggedInUser = localStorage.getItem('loggedInUser');
    if (!loggedInUser) {
        openModal('loginModal');
    } else {
        closeModal('loginModal');
        const sonEkran = sessionStorage.getItem('sonEkran') || 'home';
        const sonAltSekme = sessionStorage.getItem('sonAltSekme');

        navigateTo(sonEkran);
        if (sonAltSekme && BOTTOM_TAB_SCREENS[sonAltSekme]) {
            openBottomTab(sonAltSekme);
        }
    }
});

// --- AYARCI ATAMALARI ---
async function fetchAyarcilar(forceRefresh = false) {
    const listContainer = document.getElementById('ayarciList');
    const countText = document.getElementById('ayarciCount');
    
    const cachedData = !forceRefresh ? getCache('ayarcilar') : null;
    if (cachedData) {
        renderAyarcilar(cachedData);
        return;
    }

    listContainer.innerHTML = '<div style="text-align:center; padding: 40px; font-weight:bold; color: var(--gray);">Ayarcılar ve detaylar çekiliyor, lütfen bekleyin...</div>';
    countText.innerText = "Yükleniyor...";

    try {
        const response = await fetchWithAuth(`${API_URL}?path=Manufacturing/Workbenches/TunerAssignments`);
        if (!response.ok) throw new Error("Sunucu hatası");
        const htmlText = await response.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, "text/html");
        const cards = doc.querySelectorAll('.ui.inverted.card');
        let ayarciData = [];

        for (const card of cards) {
            const isimEl = card.querySelector('.center.aligned.header span');
            const isim = isimEl ? isimEl.innerText.trim() : "Bilinmeyen";
            
            const unvanEl = card.querySelectorAll('.center.aligned.header span')[1];
            const unvan = unvanEl ? unvanEl.innerText.trim() : "";

            const imgEl = card.querySelector('.image img');
            const foto = imgEl ? imgEl.getAttribute('src') : "";

            let satirlar = [];
            const rows = card.querySelectorAll('.ui.grid > .row');
            
            const rowPromises = Array.from(rows).map(async (row) => {
                const cols = row.querySelectorAll('.column');
                if (cols.length >= 4) {
                    const tezgahLink = cols[1].querySelector('a');
                    if (tezgahLink) {
                        const tezgah = tezgahLink.innerText.trim();
                        const tezgahUrl = tezgahLink.getAttribute('href');
                        let partiNo = cols[3].innerText.trim();
                        let parcaAdi = "";
                        let resimUrl = "";

                        if (isNaN(parseInt(partiNo))) { 
                            parcaAdi = partiNo; 
                            partiNo = "-"; 
                        }

                        if (tezgahUrl) {
                            try {
                                const detayRes = await fetchWithAuth(`${API_URL}?path=${encodeURIComponent(tezgahUrl.replace(/^\//, ''))}`);
                                const detayHtml = await detayRes.text();
                                const detayDoc = parser.parseFromString(detayHtml, "text/html");
                                
                                const detayImg = detayDoc.querySelector('.ui.fluid.card .ui.image img');
                                if (detayImg) resimUrl = detayImg.getAttribute('src').replace(/\\/g, '/');

                                if (!parcaAdi) {
                                    const dtElements = detayDoc.querySelectorAll('dt');
                                    for (let dt of dtElements) {
                                        if (dt.innerText.includes('Operasyon Adı')) {
                                            parcaAdi = dt.nextElementSibling?.innerText.trim() || "";
                                            break;
                                        }
                                    }
                                }
                            } catch (e) { console.log("Detay çekilemedi:", tezgahUrl); }
                        }

                        return { tezgah, partiNo, tezgahUrl, parcaAdi, resimUrl };
                    }
                }
                return null;
            });

            const sonuclar = await Promise.all(rowPromises);
            satirlar = sonuclar.filter(s => s !== null);

            ayarciData.push({ isim, unvan, foto, satirlar });
        }

        setCache('ayarcilar', ayarciData);
        renderAyarcilar(ayarciData);
        
    } catch (err) {
        listContainer.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--danger); font-weight:bold;">Hata: ${err.message}</div>`;
        countText.innerText = "Bağlantı Hatası";
    }
}

function renderAyarcilar(ayarcilar) {
    const listContainer = document.getElementById('ayarciList');
    const countText = document.getElementById('ayarciCount');
    listContainer.innerHTML = '';
    
    countText.innerText = `Toplam Ayarcı: ${ayarcilar.length}`;

    if (ayarcilar.length === 0) {
        listContainer.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--gray);">Atanmış ayarcı bulunamadı.</div>';
        return;
    }

    ayarcilar.forEach(ayarci => {
        const imgHtml = ayarci.foto ? `<img src="${ayarci.foto}" class="ayarci-img" onerror="this.style.display='none'">` : `<div class="ayarci-img"></div>`;
        
        let tableHtml = '';
        if (ayarci.satirlar.length > 0) {
            let rowsHtml = '';
            ayarci.satirlar.forEach(s => {
                const imgCell = s.resimUrl ? `<img src="${s.resimUrl}" class="ayarci-img-thumb" onclick="showImageModal('${s.resimUrl}')">` : `<div class="ayarci-img-thumb"></div>`;
                const parcaText = s.parcaAdi ? s.parcaAdi : "-";
                
                let isAdiHtml = parcaText;
                if (s.partiNo && s.partiNo !== "-" && !isNaN(parseInt(s.partiNo))) {
                    const partiDetayUrl = `https://uys.edelkrone.com/Manufacturing/ProductionBatches/Details/${s.partiNo}`;
                    isAdiHtml = `<a href="${partiDetayUrl}" target="_blank" style="color: var(--primary); text-decoration: none; font-weight: bold;">${parcaText}</a>`;
                }
                
                rowsHtml += `
                    <tr>
                        <td style="text-align:center; width: 50px;">${imgCell}</td>
                        <td><b style="color: var(--primary);">${s.tezgah}</b></td>
                        <td class="ayarci-parti-text">${isAdiHtml}</td>
                        <td class="ayarci-parti-text">${s.partiNo}</td>
                    </tr>
                `;
            });

            tableHtml = `
                <table class="ayarci-table">
                    <thead>
                        <tr>
                            <th style="text-align:center;"></th>
                            <th>Tezgah</th>
                            <th>Parça</th>
                            <th>Parti No</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            `;
        }

        const card = document.createElement('div');
        card.className = 'ayarci-card';
        card.innerHTML = `
            ${imgHtml}
            <div class="ayarci-name">${ayarci.isim}</div>
            <div class="ayarci-unvan">${ayarci.unvan}</div>
            ${tableHtml}
        `;
        listContainer.appendChild(card);
    });
}

// =========================================
// HESAP MAKİNESİ MANTIĞI
// =========================================

const views = {
    calc: document.getElementById('calc-view'),
    merkez: document.getElementById('merkez-view'),
    dairesel: document.getElementById('dairesel-view')
};

function goTo(target) {
    Object.values(views).forEach(v => v.classList.remove('active'));
    if (views[target]) {
        views[target].classList.add('active');
    }
}

document.getElementById('open-merkez').onclick = () => goTo('merkez');
document.getElementById('open-dairesel').onclick = () => goTo('dairesel');
document.getElementById('close-merkez').onclick = () => goTo('calc');
document.getElementById('close-dairesel').onclick = () => goTo('calc');

// --- HESAP MAKİNESİ MOTORU ---
class CalcEngine {
    constructor(displayEl, historyEl) {
        this.displayEl = displayEl; this.historyEl = historyEl;
        this.current = '0'; this.previous = null; this.operation = null; this.resetScreen = false;
        this.update();
    }
    update() {
        let displayText = this.current;
        if (displayText !== 'Error') {
            let [int, dec] = displayText.split('.');
            int = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            displayText = dec ? int + '.' + dec : int;
        }
        this.displayEl.textContent = displayText;
        this.historyEl.textContent = this.operation ? `${this.previous} ${this.getOpSym(this.operation)}` : '';
    }
    getOpSym(op) {
        const syms = { add: '+', subtract: '-', multiply: '×', divide: '÷' };
        return syms[op] || '';
    }
    clear() { this.current = '0'; this.previous = this.operation = null; this.resetScreen = false; this.update(); }
    sign() { this.current = (parseFloat(this.current) * -1).toString(); this.update(); }
    backspace() {
        if (this.current === 'Error') { this.clear(); return; }
        if (this.current.length === 1 || (this.current.length === 2 && this.current.startsWith('-'))) this.current = '0';
        else this.current = this.current.slice(0, -1); this.update();
    }
    append(n) {
        if (this.resetScreen || this.current === '0' || this.current === 'Error') { this.current = n; this.resetScreen = false; }
        else this.current += n; this.update();
    }
    decimal() {
        if (this.resetScreen) { this.current = '0.'; this.resetScreen = false; }
        else if (this.current === 'Error') { this.current = '0.'; }
        else if (!this.current.includes('.')) this.current += '.'; this.update();
    }
    chooseOp(op) {
        if (this.operation) this.calculate();
        this.previous = this.current; this.operation = op; this.resetScreen = true; this.update();
    }
    calculate() {
        if (!this.operation || this.previous === null) return;
        const prev = parseFloat(this.previous), cur = parseFloat(this.current);
        if (isNaN(prev) || isNaN(cur)) return;
        let result;
        switch (this.operation) {
            case 'add': result = prev + cur; break;
            case 'subtract': result = prev - cur; break;
            case 'multiply': result = prev * cur; break;
            case 'divide': result = cur === 0 ? 'Error' : prev / cur; break;
        }
        if (result !== 'Error') result = parseFloat(result.toPrecision(12));
        this.current = result.toString(); this.operation = null; this.resetScreen = true; this.update();
    }
}

const mainCalc = new CalcEngine(document.getElementById('display'), document.getElementById('history'));
document.getElementById('calc-view').addEventListener('click', e => {
    const btn = e.target.closest('.button'); if (!btn) return;
    const action = btn.dataset.action, num = btn.dataset.num;
    if (num !== undefined) mainCalc.append(num);
    else switch (action) {
        case 'clear': mainCalc.clear(); break;
        case 'backspace': mainCalc.backspace(); break;
        case 'sign': mainCalc.sign(); break;
        case 'decimal': mainCalc.decimal(); break;
        case 'add': case 'subtract': case 'multiply': case 'divide': mainCalc.chooseOp(action); break;
        case 'equals': mainCalc.calculate(); break;
    }
});

// --- KEYPAD VE FORM MANTIĞI ---
let activeInputEl = null;

function setActiveInput(el) {
    if (activeInputEl) activeInputEl.classList.remove('active-input');
    activeInputEl = el;
    if (activeInputEl) activeInputEl.classList.add('active-input');
}

function setupKeypad(keypadId, inputSelectors) {
    const keypad = document.getElementById(keypadId);
    if (!keypad) return;

    const allInputs = [];
    inputSelectors.forEach(sel => {
        const el = document.querySelector(sel);
        if (el) allInputs.push(el);
    });

    allInputs.forEach(input => {
        input.addEventListener('focus', () => setActiveInput(input));
        input.addEventListener('click', () => setActiveInput(input));
    });

    keypad.addEventListener('click', (e) => {
        const btn = e.target.closest('.keypad-btn'); if (!btn) return;
        if (!activeInputEl || activeInputEl.disabled) return;

        const num = btn.dataset.num;
        const action = btn.dataset.action;

        if (num !== undefined) {
            activeInputEl.value += num;
            triggerInputChange(activeInputEl);
        } else if (action === 'del') {
            activeInputEl.value = activeInputEl.value.slice(0, -1);
            triggerInputChange(activeInputEl);
        } else if (action === 'dot') {
            if (!activeInputEl.value.includes('.')) {
                if (activeInputEl.value === '') activeInputEl.value = '0.';
                else activeInputEl.value += '.';
            }
            triggerInputChange(activeInputEl);
        }
    });
}

function triggerInputChange(inputEl) {
    const event = new Event('input', { bubbles: true });
    inputEl.dispatchEvent(event);
    if (inputEl.id === 'merkez-olcusu' || inputEl.id === 'tam-cap-custom') merkezHesap();
    if (inputEl.id === 'pcd-radius' || inputEl.id === 'hole-count-custom' || inputEl.id === 'hole-diam-custom') daireselHesap();
}

// --- MERKEZ HESAPLAMA ---
function merkezHesap() {
    let tamCap;
    const tamCapChecked = document.querySelector('input[name="tam-cap"]:checked');
    if (!tamCapChecked) { tamCap = NaN; }
    else if (tamCapChecked.value === 'custom') { tamCap = parseFloat(document.getElementById('tam-cap-custom').value.replace(',', '.')); }
    else { tamCap = parseFloat(tamCapChecked.value); }
    
    const merk = parseFloat(document.getElementById('merkez-olcusu').value.replace(',', '.'));
    document.getElementById('merkez-sonuc').textContent = (isNaN(tamCap) || isNaN(merk)) ? '-' : (merk - tamCap / 2).toFixed(2) + " mm";
}

document.querySelectorAll('input[name="tam-cap"]').forEach(r => {
    r.addEventListener('change', function () {
        const customInput = document.getElementById('tam-cap-custom');
        if (this.value === 'custom') {
            customInput.disabled = false; customInput.readOnly = false; customInput.focus();
        } else {
            customInput.disabled = true; customInput.readOnly = true; customInput.value = '';
        }
        merkezHesap();
    });
});
document.getElementById('tam-cap-custom').addEventListener('input', merkezHesap);
document.getElementById('merkez-olcusu').addEventListener('input', merkezHesap);

document.getElementById('merkez-temizle').onclick = () => {
    document.querySelector('input[name="tam-cap"][value="2.5"]').checked = true;
    const custom = document.getElementById('tam-cap-custom');
    custom.value = ''; custom.disabled = true; custom.readOnly = true;
    document.getElementById('merkez-olcusu').value = '';
    document.getElementById('merkez-sonuc').textContent = '-';
    setActiveInput(document.getElementById('merkez-olcusu'));
};

// --- DAİRESEL HESAPLAMA ---
function daireselHesap() {
    const radius = parseFloat(document.getElementById('pcd-radius').value.replace(',', '.'));

    let count;
    const countChecked = document.querySelector('input[name="hole-count"]:checked');
    if (!countChecked) { count = NaN; }
    else if (countChecked.value === 'custom') { count = parseFloat(document.getElementById('hole-count-custom').value.replace(',', '.')); }
    else { count = parseFloat(countChecked.value); }

    let diam;
    const diamChecked = document.querySelector('input[name="hole-diam"]:checked');
    if (!diamChecked) { diam = NaN; }
    else if (diamChecked.value === 'custom') { diam = parseFloat(document.getElementById('hole-diam-custom').value.replace(',', '.')); }
    else { diam = parseFloat(diamChecked.value); }

    if (isNaN(count) || isNaN(radius) || isNaN(diam) || count < 2) {
        document.getElementById('center-to-center').textContent = '-';
        document.getElementById('outer-distance').textContent = '-';
        return;
    }
    const center2 = 2 * radius * Math.sin((180 / count) * (Math.PI / 180));
    document.getElementById('center-to-center').textContent = center2.toFixed(2) + ' mm';
    document.getElementById('outer-distance').textContent = (center2 + diam).toFixed(2) + ' mm';
}

document.getElementById('pcd-radius').addEventListener('input', daireselHesap);

document.querySelectorAll('input[name="hole-count"]').forEach(r => {
    r.addEventListener('change', function () {
        const customInput = document.getElementById('hole-count-custom');
        if (this.value === 'custom') {
            customInput.disabled = false; customInput.readOnly = false; customInput.focus();
        } else {
            customInput.disabled = true; customInput.readOnly = true; customInput.value = '';
        }
        daireselHesap();
    });
});
document.getElementById('hole-count-custom').addEventListener('input', daireselHesap);

document.querySelectorAll('input[name="hole-diam"]').forEach(r => {
    r.addEventListener('change', function () {
        const customInput = document.getElementById('hole-diam-custom');
        if (this.value === 'custom') {
            customInput.disabled = false; customInput.readOnly = false; customInput.focus();
        } else {
            customInput.disabled = true; customInput.readOnly = true; customInput.value = '';
        }
        daireselHesap();
    });
});
document.getElementById('hole-diam-custom').addEventListener('input', daireselHesap);

document.getElementById('dairesel-temizle').onclick = () => {
    document.getElementById('pcd-radius').value = '';
    document.querySelector('input[name="hole-count"][value="2"]').checked = true;
    const hcCustom = document.getElementById('hole-count-custom');
    hcCustom.value = ''; hcCustom.disabled = true; hcCustom.readOnly = true;
    document.querySelector('input[name="hole-diam"][value="2.5"]').checked = true;
    const hdCustom = document.getElementById('hole-diam-custom');
    hdCustom.value = ''; hdCustom.disabled = true; hdCustom.readOnly = true;
    daireselHesap();
    setActiveInput(document.getElementById('pcd-radius'));
};

document.getElementById('merkez-olcusu').addEventListener('click', function () { setActiveInput(this); });
document.getElementById('pcd-radius').addEventListener('click', function () { setActiveInput(this); });

setupKeypad('merkez-keypad', ['#merkez-olcusu', '#tam-cap-custom']);
setupKeypad('dairesel-keypad', ['#pcd-radius', '#hole-count-custom', '#hole-diam-custom']);

setActiveInput(document.getElementById('merkez-olcusu'));

// --- YENİ PARTİ BAŞLAT (KAZIMA) ---
async function fetchYeniPartiler(forceRefresh = false) {
    const listContainer = document.getElementById('yeniPartiList');
    const countText = document.getElementById('yeniPartiCount');
    
    const cachedData = !forceRefresh ? getCache('yeniPartiler') : null;
    if (cachedData) {
        renderYeniPartiler(cachedData);
        return;
    }

    listContainer.innerHTML = '<div style="text-align:center; padding: 40px; font-weight:bold; color: var(--gray);">Yeni partiler çekiliyor...</div>';
    countText.innerText = "Yükleniyor...";

    try {
        const response = await fetchWithAuth(`${API_URL}?path=Manufacturing/ProductionBatches/ProductionList`);
        if (!response.ok) throw new Error("Sunucu hatası");
        const htmlText = await response.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, "text/html");
        
        const cards = doc.querySelectorAll('.ui.card');
        let partiData = [];

        cards.forEach(card => {
            const tezgahEl = card.querySelector('h3.center.aligned.header');
            const tezgah = tezgahEl ? tezgahEl.innerText.trim() : "Bilinmeyen";

            const imgEl = card.querySelector('img.ui.centered.image');
            let resimUrl = "";
            if (imgEl) {
                resimUrl = imgEl.getAttribute('src').replace(/\\/g, '/');
            }

            let parcaAdi = "-", partiNo = "-", uretilecek = "-", tahminiSure = "-", teknikResim = "", startConfirmUrl = "";

            const dts = card.querySelectorAll('dt');
            dts.forEach(dt => {
                const text = dt.innerText.trim();
                const dd = dt.nextElementSibling;
                if (!dd) return;
                
                const val = dd.querySelector('a') ? dd.querySelector('a').innerText.trim() : dd.innerText.trim();

                if (text.includes('Parti No')) partiNo = val;
                else if (text.includes('Operasyon Adı')) parcaAdi = val;
                else if (text.includes('Üretilecek Miktar')) uretilecek = val;
                else if (text.includes('Tahmini Süre')) tahminiSure = val;
                else if (text.includes('Teknik Resim')) {
                    const link = dd.querySelector('a');
                    if (link) teknikResim = link.getAttribute('href');
                }
            });

            const links = card.querySelectorAll('a[href]');
            links.forEach(a => {
                const href = a.getAttribute('href') || "";
                if (href.includes("Manufacturing/ProductionBatches/StartConfirm/")) {
                    startConfirmUrl = href.startsWith("http")
                        ? href
                        : `https://uys.edelkrone.com${href.startsWith("/") ? "" : "/"}${href}`;
                }
            });

            partiData.push({
                tezgah,
                parcaAdi,
                partiNo,
                uretilecek,
                tahminiSure,
                teknikResim,
                resimUrl,
                startConfirmActive: Boolean(startConfirmUrl),
                startConfirmUrl
            });
        });

        await enrichPartiStartConfirm(partiData);

        setCache('yeniPartiler', partiData);
        renderYeniPartiler(partiData);
        
    } catch (err) {
        listContainer.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--danger); font-weight:bold;">Hata: ${err.message}</div>`;
        countText.innerText = "Bağlantı Hatası";
    }
}

function renderYeniPartiler(partiler) {
    const listContainer = document.getElementById('yeniPartiList');
    const countText = document.getElementById('yeniPartiCount');
    listContainer.innerHTML = '';
    
    countText.innerText = `Toplam Yeni Parti: ${partiler.length}`;

    if (partiler.length === 0) {
        listContainer.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--gray);">Yeni parti bulunamadı.</div>';
        return;
    }

    partiler.forEach(p => {
        let resimBtn = p.teknikResim 
            ? `<a href="${p.teknikResim}" target="_blank" class="yp-btn-resim">📄 Teknik Resim</a>` 
            : `<span style="color: gray; font-size: 12px;">Teknik Resim Yok</span>`;

        const isActive = Boolean(p.startConfirmActive && p.startConfirmUrl);
        const safeUrl = isActive ? String(p.startConfirmUrl).replace(/'/g, "%27") : "";
        const imgClickHandler = isActive
            ? `window.open('${safeUrl}', '_blank', 'noopener,noreferrer')`
            : `showNumuneUyariModal()`;

        let imgHtml = p.resimUrl 
            ? `<div style="text-align: center; margin-bottom: 16px;">
                 <img src="${p.resimUrl}" onclick="${imgClickHandler}" style="max-width: 100%; max-height: 250px; object-fit: contain; border-radius: 8px; background: #f0f0f0; padding: 4px; cursor: pointer;">
               </div>` 
            : '';

        const card = document.createElement('div');
        card.className = 'yeni-parti-card';
        if (isActive) {
            card.style.backgroundColor = 'rgba(74, 222, 128, 0.16)';
            card.style.border = '1.5px solid #4ADE80';
        } else {
            card.style.backgroundColor = 'rgba(248, 113, 113, 0.16)';
            card.style.border = '1.5px solid #F87171';
        }
        
        card.innerHTML = `
            ${imgHtml}
            <div class="yp-header" style="justify-content: space-between;">
                <div class="yp-tezgah">${p.tezgah}</div>
                <div class="yp-parti-no">Parti: ${p.partiNo}</div>
            </div>
            <div class="yp-body">
                <div class="yp-info-row" style="grid-column: span 2;">
                    <span class="yp-info-label">Parça (Operasyon)</span>
                    <span class="yp-info-value">${p.parcaAdi}</span>
                </div>
                <div class="yp-info-row">
                    <span class="yp-info-label">Üretilecek Miktar</span>
                    <span class="yp-info-value">${p.uretilecek}</span>
                </div>
                <div class="yp-info-row">
                    <span class="yp-info-label">Tahmini Süre</span>
                    <span class="yp-info-value">${p.tahminiSure}</span>
                </div>
            </div>
            <div class="yp-actions" style="margin-top: 12px; justify-content: flex-end;">
                ${resimBtn}
            </div>
        `;
        listContainer.appendChild(card);
    });
}

// --- TEZGAH KAPATMA ---
const tezgahKapatmaVerileri = [
    { group: "3 Eksenler", items: [
        { name: "3A", url: "https://uys.edelkrone.com/Manufacturing/Workbenches/Details/26" },
        { name: "3B", url: "https://uys.edelkrone.com/Manufacturing/Workbenches/Details/36" },
        { name: "3C", url: "https://uys.edelkrone.com/Manufacturing/Workbenches/Details/30" },
        { name: "3D", url: "https://uys.edelkrone.com/Manufacturing/Workbenches/Details/31" },
        { name: "3E", url: "https://uys.edelkrone.com/Manufacturing/Workbenches/Details/35" }
    ]},
    { group: "4 Eksenler", items: [
        { name: "4A", url: "https://uys.edelkrone.com/Manufacturing/Workbenches/Details/21" },
        { name: "4B", url: "https://uys.edelkrone.com/Manufacturing/Workbenches/Details/11" },
        { name: "4C", url: "https://uys.edelkrone.com/Manufacturing/Workbenches/Details/12" }
    ]},
    { group: "5 Eksenler", items: [
        { name: "5C", url: "https://uys.edelkrone.com/Manufacturing/Workbenches/Details/10" },
        { name: "5D", url: "https://uys.edelkrone.com/Manufacturing/Workbenches/Details/14" },
        { name: "5E", url: "https://uys.edelkrone.com/Manufacturing/Workbenches/Details/29" },
        { name: "5F", url: "https://uys.edelkrone.com/Manufacturing/Workbenches/Details/39" },
        { name: "5G", url: "https://uys.edelkrone.com/Manufacturing/Workbenches/Details/40" },
        { name: "5H", url: "https://uys.edelkrone.com/Manufacturing/Workbenches/Details/41" },
        { name: "5I", url: "https://uys.edelkrone.com/Manufacturing/Workbenches/Details/42" }
    ]},
    { group: "Tornalar", items: [
        { name: "TORNA1", url: "https://uys.edelkrone.com/Manufacturing/Workbenches/Details/17" },
        { name: "TORNA2", url: "https://uys.edelkrone.com/Manufacturing/Workbenches/Details/18" },
        { name: "TORNA3", url: "https://uys.edelkrone.com/Manufacturing/Workbenches/Details/43" },
        { name: "TORNA4", url: "https://uys.edelkrone.com/Manufacturing/Workbenches/Details/2" }
    ]},
    { group: "Diğer", items: [
        { name: "K1", url: "https://uys.edelkrone.com/Manufacturing/Workbenches/Details/33" },
        { name: "TESVİYE", url: "https://uys.edelkrone.com/Manufacturing/Workbenches/Details/38" }
    ]}
];

function showNumuneUyariModal() {
    const existing = document.getElementById("numuneUyariModal");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "numuneUyariModal";
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,0.55);display:flex;align-items:center;justify-content:center;z-index:9999;";

    overlay.innerHTML = `
        <div style="background:#ffffff;color:#1e293b;border-radius:12px;padding:22px 26px;max-width:360px;width:90%;box-shadow:0 12px 30px rgba(0,0,0,0.22);text-align:center;">
            <div style="font-size:16px;font-weight:600;margin-bottom:18px;">Numune İsteği Gelmedi</div>
            <button type="button" id="numuneUyariTamamBtn" style="background:#2563eb;color:#ffffff;border:none;border-radius:8px;padding:9px 24px;font-size:14px;font-weight:600;cursor:pointer;">Tamam</button>
        </div>
    `;

    const closeModal = () => overlay.remove();
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeModal();
    });

    document.body.appendChild(overlay);
    document.getElementById("numuneUyariTamamBtn").addEventListener("click", closeModal);
}

let sonBakilanTezgah = null;

function kaydetSonBakilanTezgah(tezgahId) {
    if (tezgahId) sonBakilanTezgah = tezgahId;
}

async function yenileSonBakilanTezgah() {
    if (!sonBakilanTezgah) return;
    if (typeof KayitGirisApp !== "undefined" && typeof KayitGirisApp.yenileTekTezgah === "function") {
        await KayitGirisApp.yenileTekTezgah(sonBakilanTezgah);
    }
}

document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") yenileSonBakilanTezgah();
});

window.addEventListener("focus", () => {
    yenileSonBakilanTezgah();
});

async function checkStartConfirmStatus(partiNo) {
    if (!partiNo || partiNo === "-") return { active: false, url: "" };
    const startConfirmUrl = `https://uys.edelkrone.com/Manufacturing/ProductionBatches/StartConfirm/${encodeURIComponent(partiNo)}`;

    try {
        const path1 = `Manufacturing/ProductionBatches/CheckProductionBatche?batchId=${encodeURIComponent(partiNo)}`;
        const res1 = await fetchWithAuth(`${API_URL}?path=${encodeURIComponent(path1)}`);
        if (!res1.ok) return { active: false, url: "" };
        const text1 = await res1.text();
        if (!text1 || text1.includes("errorMessage")) return { active: false, url: "" };
        const json1 = JSON.parse(text1);
        if (Number(json1.result) !== 1) return { active: false, url: "" };

        const path2 = `Manufacturing/ProductionBatches/CheckProductionBatcheTuner?batchId=${encodeURIComponent(partiNo)}`;
        const res2 = await fetchWithAuth(`${API_URL}?path=${encodeURIComponent(path2)}`);
        if (!res2.ok) return { active: false, url: "" };
        const text2 = await res2.text();
        if (!text2 || text2.includes("errorMessage")) return { active: false, url: "" };
        const json2 = JSON.parse(text2);
        if (Number(json2.result) === 0) {
            return { active: true, url: startConfirmUrl };
        }
        return { active: false, url: "" };
    } catch (e) {
        return { active: false, url: "" };
    }
}

async function enrichPartiStartConfirm(partiData) {
    await Promise.all(partiData.map(async (item) => {
        const status = await checkStartConfirmStatus(item.partiNo);
        item.startConfirmActive = status.active;
        item.startConfirmUrl = status.url;
    }));
    return partiData;
}

function openTezgahDurumModal(type) {
    const list = document.getElementById('tezgahKapatmaList');
    if (!list) return;

    const isAcik = type === 'acik';
    const cards = [...list.querySelectorAll('.tezgah-btn')].filter(el => {
        const bg = el.style.backgroundColor || '';
        const border = el.style.border || '';
        if (isAcik) return bg.includes('220, 252, 231') || border.includes('34, 197, 94') || border.includes('#22C55E');
        return bg.includes('254, 226, 226') || border.includes('239, 68, 68') || border.includes('#EF4444');
    });

    const names = cards.map(c => c.querySelector('.tezgah-btn-name')?.innerText.trim()).filter(Boolean);
    const title = isAcik ? `Açık Tezgahlar (${names.length})` : `Kapalı Tezgahlar (${names.length})`;
    const accent = isAcik ? '#4ade80' : '#ef4444';

    let modalEl = document.getElementById('tezgahDurumModal');
    if (!modalEl) {
        modalEl = document.createElement('div');
        modalEl.id = 'tezgahDurumModal';
        modalEl.className = 'modal-overlay';
        modalEl.innerHTML = `<div class="modal-content"></div>`;
        document.body.appendChild(modalEl);
    }

    const itemsHtml = names.length
        ? names.map(n => `<div style="padding: 10px 12px; border-radius: 8px; border: 1px solid ${accent}; font-weight: bold; text-align: center;">${n}</div>`).join('')
        : `<div style="grid-column: span 2; text-align: center; color: var(--gray); padding: 16px;">Tezgah bulunamadı.</div>`;

    modalEl.querySelector('.modal-content').innerHTML = `
        <div class="modal-header">
            <div class="modal-title" style="color: ${accent};">${title}</div>
            <button class="modal-close" onclick="closeModal('tezgahDurumModal')">✖</button>
        </div>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 12px;">
            ${itemsHtml}
        </div>
    `;

    openModal('tezgahDurumModal');
}

async function renderTezgahKapatma(forceRefresh = false) {
    const container = document.getElementById('tezgahKapatmaList');
	
    container.innerHTML = '';

    const allItems = tezgahKapatmaVerileri.flatMap(g => g.items);

    const drawCards = (statusMap) => {
   
    container.innerHTML = '';
        tezgahKapatmaVerileri.forEach(group => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'tezgah-group';

            const title = document.createElement('div');
            title.className = 'tezgah-group-title';
            title.innerText = group.group;
            groupDiv.appendChild(title);

            const grid = document.createElement('div');
            grid.className = 'tezgah-grid';

            group.items.forEach(item => {
                const info = statusMap[item.url] || { status: 'neutral', text: '-' };
                const btn = document.createElement('div');
                btn.className = 'tezgah-btn';

                if (info.status === 'green') {
                    btn.style.backgroundColor = '#DCFCE7';
                    btn.style.border = '1.5px solid #22C55E';
                } else if (info.status === 'red') {
                    btn.style.backgroundColor = '#FEE2E2';
                    btn.style.border = '1.5px solid #EF4444';
                } else {
                    btn.style.backgroundColor = '#FFFFFF';
                }

                btn.innerHTML = `
                    <div class="tezgah-btn-name">${item.name}</div>
                    <div class="tezgah-btn-sub" style="font-size: 12px; margin-top: 6px; color: var(--text);">${info.text}</div>
                `;
                btn.onclick = () => openTezgahKapatma(item.url);

                if (info.imageUrl) {
                    const imgBtn = document.createElement('button');
                    imgBtn.type = 'button';
                    imgBtn.title = 'Resmi Görüntüle';
                    imgBtn.innerText = '🖼️';
                    imgBtn.style.cssText = 'margin-top: 8px; padding: 4px 10px; border-radius: 6px; border: 1px solid var(--border, rgba(255,255,255,0.2)); background: rgba(0,0,0,0.25); color: var(--text); cursor: pointer; font-size: 12px;';
                    imgBtn.onclick = (e) => {
                        e.stopPropagation();
                        if (typeof openImageModal === 'function') {
                            openImageModal(info.imageUrl);
                        } else {
                            window.open(info.imageUrl, '_blank', 'noopener,noreferrer');
                        }
                    };
                    btn.appendChild(imgBtn);
                }

                grid.appendChild(btn);
            });

            groupDiv.appendChild(grid);
            container.appendChild(groupDiv);
        });
        updateTezgahKapatmaCounts();
        
    };

    const cached = !forceRefresh ? getCache('tezgahKapatma') : null;
    if (cached) {
        drawCards(cached);
        return;
    }

    container.innerHTML = `
        <div style="text-align:center; padding: 36px 20px;">
            <div style="font-weight: bold; margin-bottom: 12px; color: var(--gray);">Tezgahlar kontrol ediliyor lütfen bekleyin</div>
            <div style="max-width: 320px; margin: 0 auto 8px; height: 10px; background: rgba(128,128,128,0.25); border-radius: 999px; overflow: hidden;">
                <div id="tkProgressBar" style="width: 0%; height: 100%; background: #4ADE80; transition: width 0.2s ease;"></div>
            </div>
            <div id="tkProgressText" style="font-size: 13px; font-weight: bold; color: var(--text);">%0</div>
        </div>
    `;

    const statusMap = {};
    let completed = 0;
    const total = allItems.length;
    const parser = new DOMParser();

    const updateProgress = () => {
        completed++;
        const pct = Math.round((completed / total) * 100);
        const bar = document.getElementById('tkProgressBar');
        const txt = document.getElementById('tkProgressText');
        if (bar) bar.style.width = `${pct}%`;
        if (txt) txt.innerText = `%${pct}`;
    };

    await Promise.all(allItems.map(async (item) => {
        try {
            const cleanPath = item.url.replace(/^https?:\/\/[^/]+\//, '');
            const res = await fetchWithAuth(`${API_URL}?path=${encodeURIComponent(cleanPath)}`);
            if (!res.ok) throw new Error("HTTP");
            const html = await res.text();
            const doc = parser.parseFromString(html, "text/html");

            const pageText = doc.body?.innerText || "";
            const hasStop = pageText.includes("Üretimi Durdur");
            const hasEvent = pageText.includes("Yeni Tezgah Olayı Gir");

            const dls = [...doc.querySelectorAll("#page-container dl")];
            const hareketDl = dls.find(dl => {
                const dtText = dl.querySelector("dt")?.innerText.trim() || "";
                const ddText = dl.querySelector("dd")?.innerText.trim() || "";
                return /\d{1,2}\s+[A-Za-zğüşıöçĞÜŞİÖÇ]+\s+\d{4}/.test(dtText) || /partisi|üretim|olay/i.test(ddText);
            }) || dls[dls.length - 1];
            const firstDt = hareketDl?.querySelector("dt")?.innerText.trim() || "";
            const dds = hareketDl ? [...hareketDl.querySelectorAll("dd")] : [];
            const targetDd = dds[1] || dds[0] || null;
            const firstDd = targetDd?.innerText.trim() || "";
            const rawHref = targetDd?.querySelector("a[href]")?.getAttribute("href")?.trim() || "";
            const imageUrl = rawHref ? rawHref.replace(/\\/g, "/") : null;

            const combinedText = [firstDt, firstDd].filter(Boolean).join(" - ") || "-";

            let status = "neutral";
            if (hasStop) status = "green";
            else if (hasEvent) status = "red";

            statusMap[item.url] = { status, text: combinedText, imageUrl };
        } catch (e) {
            statusMap[item.url] = { status: "neutral", text: "-" };
        } finally {
            updateProgress();
        }
    }));

    setCache('tezgahKapatma', statusMap);
    drawCards(statusMap);
}

function openTezgahKapatma(url) {
    window.open(url, '_blank');
}

// --- PULL TO REFRESH (TÜM SAYFALAR) ---
(function initPullToRefresh() {
    const indicator = document.getElementById('ptrIndicator');
    const iconEl = document.getElementById('ptrIcon');
    const textEl = document.getElementById('ptrText');
    if (!indicator) return;

    const THRESHOLD = 85;
    let startY = 0;
    let pulling = false;
    let isRefreshing = false;

    function getScrollTop(targetEl) {
        const overlay = document.getElementById('bottomTabOverlay');
        if (overlay && !overlay.classList.contains('hidden')) {
            return overlay.scrollTop;
        }

        let el = targetEl;
        while (el && el !== document.body && el !== document.documentElement) {
            const style = window.getComputedStyle(el);
            const overflowY = style.overflowY;
            if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
                if (el.scrollTop > 0) return el.scrollTop;
            }
            el = el.parentElement;
        }

        return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
    }

    function resetUI() {
        isRefreshing = false;
        indicator.classList.remove('visible', 'refreshing', 'ready');
        indicator.style.transform = 'translate(-50%, -140%)';
        if (iconEl) iconEl.textContent = '↓';
        if (textEl) textEl.textContent = 'Yenilemek için aşağı çekin';
    }

    function setPullUI(pullDist) {
        if (isRefreshing) return;
        if (pullDist <= 0) {
            resetUI();
            return;
        }
        const clamped = Math.min(pullDist, 120);
        const translateY = -120 + clamped;
        indicator.classList.add('visible');
        indicator.style.transform = `translate(-50%, ${translateY}px)`;

        if (pullDist >= THRESHOLD) {
            indicator.classList.add('ready');
            if (iconEl) iconEl.textContent = '↑';
            if (textEl) textEl.textContent = 'Yenilemek için bırakın';
        } else {
            indicator.classList.remove('ready');
            if (iconEl) iconEl.textContent = '↓';
            if (textEl) textEl.textContent = 'Yenilemek için aşağı çekin';
        }
    }

    document.addEventListener('touchstart', (e) => {
        if (isRefreshing || e.touches.length !== 1) return;
        if (document.querySelector('.modal-overlay.active')) return;
        if (getScrollTop(e.target) <= 2) {
            startY = e.touches[0].clientY;
            pulling = true;
        } else {
            pulling = false;
        }
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        if (!pulling || isRefreshing) return;
        if (getScrollTop(e.target) > 2) {
            pulling = false;
            setPullUI(0);
            return;
        }
        const dy = e.touches[0].clientY - startY;
        if (dy > 8) {
            setPullUI(dy * 0.65);
        } else {
            setPullUI(0);
        }
    }, { passive: true });

    document.addEventListener('touchend', async (e) => {
        if (!pulling || isRefreshing) return;
        pulling = false;
        const endY = e.changedTouches[0]?.clientY ?? startY;
        const dy = endY - startY;

        if (dy * 0.65 >= THRESHOLD) {
            isRefreshing = true;
            indicator.classList.add('visible', 'refreshing');
            indicator.classList.remove('ready');
            indicator.style.transform = 'translate(-50%, 10px)';
            if (iconEl) iconEl.textContent = '🔄';
            if (textEl) textEl.textContent = 'Yenileniyor...';

            try {
                await refreshCurrentPage();
            } finally {
                setTimeout(resetUI, 300);
            }
        } else {
            setPullUI(0);
        }
    }, { passive: true });
})();

// =========================================
// KAYIT GİRİŞİ SAYFASI MANTIĞI
// =========================================
const KayitGirisApp = {
    benchesMaster: [
        { name: "3A", benchId: 26, selectable: true },
        { name: "4A", benchId: 21, selectable: true },
        { name: "4B", benchId: 11, selectable: true },
        { name: "4C", benchId: 12, selectable: true },
        { name: "3B", benchId: 36, selectable: true },
        { name: "3C", benchId: 30, selectable: true },
        { name: "3D", benchId: 31, selectable: true },
        { name: "5D", benchId: 14, selectable: true },
        { name: "5C", benchId: 10, selectable: true },
        { name: "TORNA1", benchId: 17, selectable: true },
        { name: "TORNA2", benchId: 18, selectable: true },
        { name: "TORNA3", benchId: 43, selectable: true },
        { name: "TORNA4", benchId: 2, selectable: true },
        { name: "3E", benchId: 35, selectable: true },
        { name: "K1", benchId: 33, selectable: true },
        { name: "5I", benchId: 42, selectable: true },
        { name: "5H", benchId: 41, selectable: true },
        { name: "5G", benchId: 40, selectable: true },
        { name: "5F", benchId: 39, selectable: true },
        { name: "5E", benchId: 29, selectable: true },
        { name: "TS1", benchId: 38, selectable: true }
    ],
    STORAGE_KEY: "edelkrone_bench_selections",
    CLICK_STORAGE_KEY: "edelkrone_bench_clicks",
    SORT_STORAGE_KEY: "edelkrone_bench_sort_order",
    TIME_LIMIT_STORAGE_KEY: "edelkrone_time_limit",
    BASE_URL: "https://uys.edelkrone.com/Manufacturing/ProductionRecords/Create?benchId=",

    currentMode: "edit",
    selectedIds: new Set(),
    pendingChanges: new Set(),
    timeLimitMinutes: 60,
    colorCheckInterval: null,
    isFetchingDetails: false,

    startColorCheckInterval() {
        this.stopColorCheckInterval();
        if (this.currentMode === "showSelected") {
            this.colorCheckInterval = setInterval(() => this.updateCardColors(), 10000);
        }
    },

    stopColorCheckInterval() {
        if (this.colorCheckInterval) {
            clearInterval(this.colorCheckInterval);
            this.colorCheckInterval = null;
        }
    },

    updateCardColors() {
        if (this.currentMode !== "showSelected") return;
        
        document.querySelectorAll('#kgDashboard .kg-wide-card').forEach(card => {
            const benchName = card.getAttribute('data-name');
            const bench = this.benchesMaster.find(b => b.name === benchName);
            if (!bench) return;
            
            const titleEl = card.querySelector('.kg-wide-title');
            if (!titleEl) return;

            const colorStyle = this.getCardBorderColorClass(bench);
            titleEl.style.color = '';
            
            if (colorStyle.includes('var(--danger)')) {
                titleEl.style.color = 'var(--danger)';
            } else if (colorStyle.includes('#4ADE80')) {
                titleEl.style.color = '#4ADE80';
            } else {
                titleEl.style.color = 'var(--text)';
            }
        });
    },

    init() {
        this.loadFromStorage();
        this.updateStats();
        this.render();
        
        if (this.currentMode === "showSelected" || this.currentMode === "showAllWithSplit") {
            this.fetchBenchDetails(false);
        }
    },

    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },

    getSortOrder() {
        const saved = localStorage.getItem(this.SORT_STORAGE_KEY);
        return saved ? JSON.parse(saved) : null;
    },

    saveSortOrder(orderArray) {
        localStorage.setItem(this.SORT_STORAGE_KEY, JSON.stringify(orderArray));
    },

    getTimeLimit() {
        const saved = localStorage.getItem(this.TIME_LIMIT_STORAGE_KEY);
        if (saved) {
            const val = parseInt(saved);
            if (!isNaN(val) && val > 0) return val;
        }
        return 60;
    },

    saveTimeLimit(minutes) {
        localStorage.setItem(this.TIME_LIMIT_STORAGE_KEY, minutes.toString());
    },

    sortBenchesByOrder(benches) {
        const sortOrder = this.getSortOrder();
        if (!sortOrder || !Array.isArray(sortOrder)) return benches;
        const benchMap = new Map();
        benches.forEach(b => benchMap.set(b.name, b));
        const sorted = [];
        sortOrder.forEach(name => {
            if (benchMap.has(name)) {
                sorted.push(benchMap.get(name));
                benchMap.delete(name);
            }
        });
        benchMap.forEach(b => sorted.push(b));
        return sorted;
    },

    saveClickTime(benchId) {
        if (!benchId) return;
        const clicks = JSON.parse(localStorage.getItem(this.CLICK_STORAGE_KEY) || "{}");
        clicks[benchId] = new Date().toISOString();
        localStorage.setItem(this.CLICK_STORAGE_KEY, JSON.stringify(clicks));
    },

    getFormattedClickTime(benchId) {
        if (!benchId) return "";
        const clicks = JSON.parse(localStorage.getItem(this.CLICK_STORAGE_KEY) || "{}");
        const isoString = clicks[benchId];
        if (!isoString) return "";
        const date = new Date(isoString);
        const day = date.getDate();
        const month = date.toLocaleString('tr-TR', { month: 'short' }).replace('.', '');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${day} ${month} ${hours}:${minutes}`;
    },

    parseTurkishDate(dateStr) {
        if (!dateStr || dateStr === "-") return null;
        const months = { "Ocak": 0, "Şubat": 1, "Mart": 2, "Nisan": 3, "Mayıs": 4, "Haziran": 5, "Temmuz": 6, "Ağustos": 7, "Eylül": 8, "Ekim": 9, "Kasım": 10, "Aralık": 11 };
        
        const parts = dateStr.trim().split(/\s+/);
        if (parts.length < 4) return null;
        
        const day = parseInt(parts[0]);
        const month = months[parts[1]];
        const year = parseInt(parts[2]);
        
        const timeParts = parts[3].split(':');
        const hour = parseInt(timeParts[0]);
        const min = parseInt(timeParts[1] || 0);

        if (isNaN(day) || month === undefined || isNaN(year) || isNaN(hour) || isNaN(min)) return null;

        return new Date(year, month, day, hour, min);
    },

    getElapsedTimeText(dateObj) {
        if (!dateObj) return "-";
        const now = new Date();
        const diffMs = now - dateObj;
        if (diffMs < 0) return "-"; 
        const diffMins = Math.floor(diffMs / 60000);
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        if (hours > 0) return `${hours} saat ${mins} dk önce`;
        return `${mins} dk önce`;
    },

    getCardBorderColorClass(bench) {
        if (!bench.lastRecordDateObj) return ""; 
        
        const now = new Date();
        const diffMs = now - bench.lastRecordDateObj;
        const diffMins = diffMs / (1000 * 60);
        
        if (diffMins > this.timeLimitMinutes) {
            return "var(--danger)";
        } else {
            return "#4ADE80";
        }
    },

    openLink(url, benchId) {
        if (benchId) {
            this.saveClickTime(benchId);
            kaydetSonBakilanTezgah(benchId);
        }
        if (this.isMobile()) {
            window.open(url, '_blank');
        } else {
            const width = 1000, height = 800;
            const left = (screen.width - width) / 2;
            const top = (screen.height - height) / 2;
            window.open(url, 'tezgahDetay', `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`);
        }
    },
	
	async yenileTekTezgah(benchId) {
        if (!benchId) return;
        const benchObj = this.benchesMaster.find(b => Number(b.benchId) === Number(benchId));
        if (!benchObj) return;

        try {
            const response = await fetchWithAuth(`${API_URL}?path=Manufacturing/ProductionRecords/SelectBench`);
            if (!response.ok) return;
            const htmlText = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, "text/html");
            const cards = doc.querySelectorAll('.ui.card');

            let updatedDetail = null;
            cards.forEach(card => {
                const titleEl = card.querySelector('h3.center.aligned.header');
                if (!titleEl || titleEl.innerText.trim() !== benchObj.name) return;

                let pendingCount = "0";
                const match = card.innerText.match(/Bekleyen Kayıt Sayısı\s*:\s*(\d+)/);
                if (match) pendingCount = match[1];

                let operation = "-", lastRecordStr = "-";
                card.querySelectorAll('dt').forEach(dt => {
                    const dd = dt.nextElementSibling;
                    if (!dd) return;
                    const dtText = dt.innerText.trim();
                    const val = dd.innerText.trim();
                    if (dtText === 'Operasyon') operation = val;
                    if (dtText === 'Son Kayıt Tarihi') lastRecordStr = val;
                });

                const imgEl = card.querySelector('img.ui.centered.image') || card.querySelector('.ui.image img');
                const image = imgEl ? imgEl.getAttribute('src').replace(/\\/g, '/') : (benchObj.image || "");

                updatedDetail = {
                    pendingCount,
                    image,
                    operation,
                    lastRecordStr,
                    operatorName: benchObj.operatorName || ""
                };
            });

            if (!updatedDetail) return;

            try {
                const detailRes = await fetchWithAuth(`${API_URL}?path=Manufacturing/ProductionRecords/Create?benchId=${benchObj.benchId}`);
                const detailHtml = await detailRes.text();
                const detailDoc = parser.parseFromString(detailHtml, "text/html");
                const workerNameInput = detailDoc.querySelector('#WorkerName');
                if (workerNameInput) {
                    updatedDetail.operatorName = workerNameInput.value;
                }
            } catch (e) {}

            benchObj.pendingCount = updatedDetail.pendingCount;
            benchObj.image = updatedDetail.image;
            benchObj.operation = updatedDetail.operation;
            benchObj.lastRecordStr = updatedDetail.lastRecordStr;
            benchObj.lastRecordDateObj = this.parseTurkishDate(updatedDetail.lastRecordStr);
            benchObj.operatorName = updatedDetail.operatorName;

            const cached = getCache('selectBenchDetails') || {};
            cached[benchObj.name] = updatedDetail;
            setCache('selectBenchDetails', cached);

            if (!document.getElementById('kayitGirisScreen').classList.contains('hidden') && this.currentMode === 'showSelected') {
                const existingCard = document.querySelector(`#kgDashboard .kg-wide-card[data-id="${benchObj.benchId}"]`);
                if (existingCard) {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = this.renderWideCard(benchObj).trim();
                    existingCard.replaceWith(tempDiv.firstElementChild);
                    this.attachCardEvents("showSelected");
                    this.setupDragAndDrop();
                }
            }
        } catch (err) {
            console.error("Tek tezgah yenileme hatası:", err);
        }
    },

    async fetchBenchDetails(forceRefresh = false) {
        if (this.isFetchingDetails) return;
        
        const cacheKey = 'selectBenchDetails';
        if (!forceRefresh) {
            const cached = getCache(cacheKey);
            if (cached) {
                this.mergeDetailsToMaster(cached);
                return;
            }
        }

        this.isFetchingDetails = true;
        showInfoModal("Bilgi", "Seçilen tezgahların detayları çekiliyor, lütfen bekleyin...");

        try {
            const response = await fetchWithAuth(`${API_URL}?path=Manufacturing/ProductionRecords/SelectBench`);
            if (!response.ok) throw new Error("Sunucu hatası");
            const htmlText = await response.text();
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, "text/html");
            const cards = doc.querySelectorAll('.ui.card');
            
            let detailsData = {};
            let pendingChecks = []; 

            cards.forEach(card => {
                const titleEl = card.querySelector('h3.center.aligned.header');
                if (!titleEl) return;
                const benchName = titleEl.innerText.trim();

                let pendingCount = "0";
                const text = card.innerText;
                const match = text.match(/Bekleyen Kayıt Sayısı\s*:\s*(\d+)/);
                if (match) pendingCount = match[1];

                let operation = "-", lastRecordStr = "-";
                const dts = card.querySelectorAll('dt');
                dts.forEach(dt => {
                    const dtText = dt.innerText.trim();
                    const dd = dt.nextElementSibling;
                    if (!dd) return;
                    const val = dd.innerText.trim();
                    if (dtText === 'Operasyon') operation = val;
                    if (dtText === 'Son Kayıt Tarihi') lastRecordStr = val;
                });

                const imgEl = card.querySelector('img.ui.centered.image') || card.querySelector('.ui.image img');
                const image = imgEl ? imgEl.getAttribute('src').replace(/\\/g, '/') : "";

                detailsData[benchName] = { pendingCount, image, operation, lastRecordStr };
                
                const benchObj = this.benchesMaster.find(b => b.name === benchName);
if (benchObj && this.selectedIds.has(benchObj.benchId)) {
    pendingChecks.push({ name: benchName, benchId: benchObj.benchId });
}
            });

            if (pendingChecks.length > 0) {
                const detailPromises = pendingChecks.map(async (item) => {
                    try {
                        const detailRes = await fetchWithAuth(`${API_URL}?path=Manufacturing/ProductionRecords/Create?benchId=${item.benchId}`);
                        const detailHtml = await detailRes.text();
                        const detailDoc = parser.parseFromString(detailHtml, "text/html");
                        
                        let operatorName = "";
                        const workerNameInput = detailDoc.querySelector('#WorkerName');
                        if (workerNameInput) {
                            operatorName = workerNameInput.value; 
                        }

                        if (detailsData[item.name]) {
                            detailsData[item.name].operatorName = operatorName;
                        }
                    } catch (e) { console.log("Detay çekilemedi:", item.name); }
                });

                await Promise.all(detailPromises);
            }

            setCache(cacheKey, detailsData);
            this.mergeDetailsToMaster(detailsData);
            closeModal('infoModal');

        } catch (err) {
            closeModal('infoModal');
            showInfoModal("Hata", "Detaylar çekilemedi: " + err.message);
        } finally {
            this.isFetchingDetails = false;
        }
    },

    mergeDetailsToMaster(detailsData) {
        this.benchesMaster.forEach(bench => {
            const detail = detailsData[bench.name];
            if (detail) {
                bench.pendingCount = detail.pendingCount;
                bench.image = detail.image;
                bench.operation = detail.operation;
                bench.lastRecordStr = detail.lastRecordStr;
                bench.lastRecordDateObj = this.parseTurkishDate(detail.lastRecordStr);
                bench.operatorName = detail.operatorName || "";
            }
        });
        this.render();
    },

    loadFromStorage() {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        this.timeLimitMinutes = this.getTimeLimit();
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.selectedIds.clear();
                if (data.selectedIds) data.selectedIds.forEach(id => this.selectedIds.add(id));
                if (data.currentMode && data.currentMode !== "showAllWithSplit") {
                    this.currentMode = data.currentMode;
                } else {
                    this.currentMode = this.selectedIds.size > 0 ? "showSelected" : "edit";
                }
            } catch (e) { console.log("Storage okuma hatası:", e); }
        }
    },

    saveToStorage() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
            selectedIds: [...this.selectedIds],
            currentMode: this.currentMode
        }));
    },

    isSelected(bench, usePending = false) {
        if (!bench.selectable) return false;
        if (usePending && this.currentMode === "showAllWithSplit") return this.pendingChanges.has(bench.benchId);
        return this.selectedIds.has(bench.benchId);
    },

    toggleSelect(bench, usePending = false) {
        if (!bench.selectable) {
            showInfoModal("Uyarı", `${bench.name} için tezgah ID'si henüz girilmemiş.`);
            return false;
        }
        if (usePending && this.currentMode === "showAllWithSplit") {
            if (this.pendingChanges.has(bench.benchId)) this.pendingChanges.delete(bench.benchId);
            else this.pendingChanges.add(bench.benchId);
        } else {
            if (this.selectedIds.has(bench.benchId)) this.selectedIds.delete(bench.benchId);
            else this.selectedIds.add(bench.benchId);
            this.saveToStorage();
        }
        this.updateStats();
        this.render();
        return true;
    },

    selectAll() {
        this.benchesMaster.forEach(b => { if (b.selectable) this.selectedIds.add(b.benchId); });
        this.saveToStorage(); this.updateStats(); this.render();
    },

    clearAll() {
        this.selectedIds.clear();
        this.saveToStorage(); this.updateStats(); this.render();
    },

    updateStats() {
        const totalBenches = this.benchesMaster.length;
        let selectedCount = 0, unselectedCount = 0;

        if (this.currentMode === "showAllWithSplit") {
            this.benchesMaster.forEach(b => {
                if (b.selectable) {
                    if (this.pendingChanges.has(b.benchId)) selectedCount++;
                    else unselectedCount++;
                } else unselectedCount++;
            });
        } else {
            this.benchesMaster.forEach(b => {
                if (b.selectable) {
                    if (this.selectedIds.has(b.benchId)) selectedCount++;
                    else unselectedCount++;
                } else unselectedCount++;
            });
        }

        document.getElementById('kgTotalCount').innerText = totalBenches;
        document.getElementById('kgSelectedCount').innerText = selectedCount;
        document.getElementById('kgUnselectedCount').innerText = unselectedCount;
    },

    showSortModal(benches) {
        const modalContent = `
            <div class="modal-header"><div class="modal-title">Sıralamayı Düzenle</div><button class="modal-close" onclick="closeModal('kgSortModal')">✖</button></div>
            <div id="kgSortList" style="max-height: 50vh; overflow-y: auto; margin-top: 12px;"></div>
            <div class="modal-buttons-row">
                <button class="btn-modal btn-modal-cancel" onclick="closeModal('kgSortModal')">İptal</button>
                <button class="btn-modal btn-modal-save" onclick="KayitGirisApp.saveSortFromModal()">Kaydet</button>
            </div>
        `;
        let modalDiv = document.getElementById('kgSortModal');
        if (!modalDiv) {
            modalDiv = document.createElement('div'); modalDiv.id = 'kgSortModal'; modalDiv.className = 'modal-overlay'; modalDiv.innerHTML = `<div class="modal-content"></div>`; document.body.appendChild(modalDiv);
        }
        modalDiv.querySelector('.modal-content').innerHTML = modalContent; openModal('kgSortModal');
        let currentOrder = benches.map(b => b.name);
        const renderSortList = () => {
            const listContainer = document.getElementById('kgSortList'); listContainer.innerHTML = '';
            currentOrder.forEach((name, index) => {
                const div = document.createElement('div'); div.className = 'sort-item';
                div.innerHTML = `<span class="sort-item-name">${name}</span><div class="sort-btn-group"><button class="sort-btn sort-up" ${index === 0 ? 'disabled' : ''}>▲</button><button class="sort-btn sort-down" ${index === currentOrder.length - 1 ? 'disabled' : ''}>▼</button></div>`;
                div.querySelector('.sort-up').onclick = () => { if (index > 0) { [currentOrder[index], currentOrder[index - 1]] = [currentOrder[index - 1], currentOrder[index]]; renderSortList(); } };
                div.querySelector('.sort-down').onclick = () => { if (index < currentOrder.length - 1) { [currentOrder[index], currentOrder[index + 1]] = [currentOrder[index + 1], currentOrder[index]]; renderSortList(); } };
                listContainer.appendChild(div);
            });
        };
        renderSortList(); this._tempSortOrder = currentOrder;
    },

    saveSortFromModal() {
        this.saveSortOrder(this._tempSortOrder); closeModal('kgSortModal'); this.render();
    },

    showTimeSettingModal() {
        const modalContent = `
            <div class="modal-header"><div class="modal-title">⏱️ Süre Ayarı</div><button class="modal-close" onclick="closeModal('kgTimeModal')">✖</button></div>
            <p style="text-align:center; margin-top: 12px;">Zaman aşımı süresi (dakika):</p>
            <input type="number" id="kgTimeInput" class="time-input" value="${this.timeLimitMinutes}" min="1" max="1440" style="display:block; margin: 0 auto;">
            <div class="modal-buttons-row">
                <button class="btn-modal btn-modal-cancel" onclick="closeModal('kgTimeModal')">İptal</button>
                <button class="btn-modal btn-modal-save" onclick="KayitGirisApp.saveTimeFromModal()">Kaydet</button>
            </div>
        `;
        let modalDiv = document.getElementById('kgTimeModal');
        if (!modalDiv) {
            modalDiv = document.createElement('div'); modalDiv.id = 'kgTimeModal'; modalDiv.className = 'modal-overlay'; modalDiv.innerHTML = `<div class="modal-content"></div>`; document.body.appendChild(modalDiv);
        }
        modalDiv.querySelector('.modal-content').innerHTML = modalContent; openModal('kgTimeModal');
    },

    saveTimeFromModal() {
        const val = parseInt(document.getElementById('kgTimeInput').value);
        if (!isNaN(val) && val > 0) {
            this.timeLimitMinutes = val; this.saveTimeLimit(val); this.render(); closeModal('kgTimeModal');
        }
    },

    renderWideCard(bench) {
        const colorStyle = this.getCardBorderColorClass(bench);
        const elapsed = this.getElapsedTimeText(bench.lastRecordDateObj);
        let titleColor = 'var(--text)';
        if (colorStyle.includes('var(--danger)')) titleColor = 'var(--danger)';
        else if (colorStyle.includes('#4ADE80')) titleColor = '#4ADE80';

        const pendingNum = parseInt(bench.pendingCount || '0', 10);
        const pendingLabel = pendingNum > 0 ? 'Kayıt Sayısı' : 'Bekleyen';
        const opText = bench.operatorName
            ? (pendingNum > 0 ? ` | Sıradaki: ${bench.operatorName}` : ` | Operatör: ${bench.operatorName}`)
            : "";

        return `
            <div class="kg-wide-card" data-name="${bench.name}" data-id="${bench.benchId}">
                ${bench.image ? `<img src="${bench.image}" class="kg-wide-img">` : `<div class="kg-wide-img"></div>`}
                <div class="kg-wide-content">
                    <div class="kg-wide-top">
                        <div class="kg-wide-title" style="color: ${titleColor}; font-weight: bold;">${bench.name}</div>
                        <div class="kg-wide-pending">Kayıt Sayısı: ${bench.pendingCount || '0'}${opText}</div>
                    </div>
                    <div class="kg-wide-op">${bench.operation || '-'}</div>
                    <div class="kg-wide-bottom">
                        <span>${bench.lastRecordStr || '-'}</span>
                        <span class="kg-wide-time">${elapsed}</span>
                    </div>
                </div>
            </div>
        `;
    },
	
renderSimpleCard(bench, isSelectedFlag, showTick = true, showTime = false) {
        const selectedClass = isSelectedFlag ? "selected" : "";
        const tickHtml = (isSelectedFlag && showTick) ? `<div class="kg-check-mark">✓</div>` : "";
        const timeHtml = (showTime && bench.benchId) ? `<div class="kg-click-time">${this.getFormattedClickTime(bench.benchId)}</div>` : "";
        return `
            <div class="kg-card ${selectedClass}" data-name="${bench.name}" data-id="${bench.benchId}" data-selectable="${bench.selectable}">
                ${tickHtml}<div class="kg-icon">🔧</div><div class="kg-name">${bench.name}</div>${timeHtml}
            </div>`;
    },

    setupDragAndDrop() {
        if (this.currentMode !== "showSelected") return;
        const grid = document.querySelector('#kgDashboard .kg-wide-card');
        if (!grid) return;
        let draggedItem = null;

        document.querySelectorAll('#kgDashboard .kg-wide-card').forEach(card => {
            card.setAttribute('draggable', 'true');
            card.addEventListener('dragstart', function(e) {
                draggedItem = this; this.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', this.getAttribute('data-name'));
            });
            card.addEventListener('dragend', function() {
                this.classList.remove('dragging'); document.querySelectorAll('.kg-wide-card').forEach(c => c.classList.remove('drag-over')); draggedItem = null;
            });
            card.addEventListener('dragover', function(e) {
                e.preventDefault(); if (this !== draggedItem) this.classList.add('drag-over');
            });
            card.addEventListener('dragleave', function() { this.classList.remove('drag-over'); });
            card.addEventListener('drop', function(e) {
                e.preventDefault(); this.classList.remove('drag-over');
                if (draggedItem && draggedItem !== this) {
                    const cards = [...document.querySelectorAll('.kg-wide-card')];
                    const draggedName = draggedItem.getAttribute('data-name');
                    const targetName = this.getAttribute('data-name');
                    const sortOrder = KayitGirisApp.getSortOrder() || cards.map(c => c.getAttribute('data-name'));
                    const draggedIndex = sortOrder.indexOf(draggedName);
                    const targetIndex = sortOrder.indexOf(targetName);
                    if (draggedIndex !== -1 && targetIndex !== -1) {
                        sortOrder.splice(draggedIndex, 1); sortOrder.splice(targetIndex, 0, draggedName);
                        KayitGirisApp.saveSortOrder(sortOrder); KayitGirisApp.render();
                    }
                }
            });
        });
    },

    attachCardEvents(mode) {
        document.querySelectorAll('#kgDashboard [data-name]').forEach(card => {
            const benchName = card.getAttribute('data-name');
            const bench = this.benchesMaster.find(b => b.name === benchName);
            if (!bench) return;

            card.onclick = (e) => {
                e.stopPropagation();
                if (mode === "edit") {
                    this.toggleSelect(bench, false);
                } else if (mode === "showAllWithSplit") {
                    if (!bench.selectable) { showInfoModal("Uyarı", `${bench.name} için ID girilmemiş.`); return; }
                    if (this.pendingChanges.has(bench.benchId)) { this.pendingChanges.delete(bench.benchId); card.classList.remove('selected'); const tick = card.querySelector('.kg-check-mark'); if (tick) tick.remove(); }
                    else { this.pendingChanges.add(bench.benchId); card.classList.add('selected'); if (!card.querySelector('.kg-check-mark')) { const tickSpan = document.createElement('div'); tickSpan.className = 'kg-check-mark'; tickSpan.innerText = '✓'; card.insertBefore(tickSpan, card.firstChild); } }
                    this.updateStats();
                } else if (mode === "showSelected") {
                    if (!bench.selectable) { showInfoModal("Uyarı", `${bench.name} için ID bulunamadı.`); return; }
                    this.openLink(this.BASE_URL + bench.benchId, bench.benchId);
                }
            };
        });
    },

    render() {
        const dashboard = document.getElementById('kgDashboard');
        const buttonGroup = document.getElementById('kgButtonGroup');
        if (!dashboard) return;

        this.stopColorCheckInterval();
        buttonGroup.innerHTML = '';

        if (this.currentMode === "edit") {
            buttonGroup.innerHTML = `
                <button class="btn-kg" id="btnKgSelectAll">Tümünü Seç</button>
                <button class="btn-kg" id="btnKgClearAll">Tümü İptal</button>
                <button class="btn-kg" id="btnKgConfirm">Tamam</button>
                <button class="btn-kg btn-kg-danger" id="btnKgResetAll">Sıfırla</button>
            `;
            document.getElementById('btnKgSelectAll').onclick = () => this.selectAll();
            document.getElementById('btnKgClearAll').onclick = () => this.clearAll();
            document.getElementById('btnKgConfirm').onclick = () => {
                if (this.selectedIds.size === 0) { showInfoModal("Uyarı", "Hiçbir tezgah seçili değil."); return; }
                this.currentMode = "showSelected"; this.saveToStorage(); this.updateStats(); 
                
                this.fetchBenchDetails(true); 
                this.render();
            };
            document.getElementById('btnKgResetAll').onclick = () => {
                showConfirmModal("Tüm tezgah seçimleri silinecek. Onaylıyor musunuz?", () => {
                    this.clearAll(); this.currentMode = "edit"; this.saveToStorage(); this.updateStats(); this.render();
                });
            };

            const allBenches = [...this.benchesMaster];
            dashboard.innerHTML = `<div class="kg-grid">${allBenches.map(b => this.renderSimpleCard(b, this.isSelected(b, false), true, false)).join('')}</div>`;
            this.attachCardEvents("edit");

        } else if (this.currentMode === "showSelected") {
            buttonGroup.innerHTML = `
                <button class="btn-kg" id="btnKgSortOrder">📋 Sırala</button>
                <button class="btn-kg" id="btnKgTimeSetting">⏱️ Süre Ayarı</button>
                <button class="btn-kg" id="btnKgShowAllBenches">Tüm Tezgahları Göster</button>
                <button class="btn-kg btn-kg-danger" id="btnKgResetAllMode2">Sıfırla</button>
            `;
            document.getElementById('btnKgSortOrder').onclick = () => {
                const selectedBenches = this.benchesMaster.filter(b => this.isSelected(b, false));
                this.showSortModal(this.sortBenchesByOrder(selectedBenches));
            };
            document.getElementById('btnKgTimeSetting').onclick = () => this.showTimeSettingModal();
            document.getElementById('btnKgShowAllBenches').onclick = () => {
                this.pendingChanges.clear(); this.selectedIds.forEach(id => this.pendingChanges.add(id)); this.currentMode = "showAllWithSplit"; this.updateStats(); this.render();
            };
            document.getElementById('btnKgResetAllMode2').onclick = () => {
                showConfirmModal("Tüm seçimler silinecek. Onaylıyor musunuz?", () => {
                    this.clearAll(); this.currentMode = "edit"; this.saveToStorage(); this.updateStats(); this.render();
                });
            };

            const selectedBenches = this.benchesMaster.filter(b => this.isSelected(b, false));
            const sortedBenches = this.sortBenchesByOrder(selectedBenches);
            
            if (sortedBenches.length === 0) {
                dashboard.innerHTML = `<div style="text-align:center; color:var(--primary); padding: 40px;">Henüz seçili tezgah yok.</div>`;
            } else {
                dashboard.innerHTML = sortedBenches.map(b => this.renderWideCard(b)).join('');
                this.attachCardEvents("showSelected");
                this.setupDragAndDrop(); 
                this.startColorCheckInterval();
            }

        } else if (this.currentMode === "showAllWithSplit") {
            buttonGroup.innerHTML = `
                <button class="btn-kg" id="btnKgSaveMode3">Kaydet</button>
                <button class="btn-kg btn-kg-secondary" id="btnKgCancelMode3">İptal</button>
                <button class="btn-kg btn-kg-danger" id="btnKgResetAllMode3">Sıfırla</button>
            `;
            document.getElementById('btnKgSaveMode3').onclick = () => {
                this.selectedIds.clear(); this.pendingChanges.forEach(id => this.selectedIds.add(id)); this.saveToStorage(); this.currentMode = "showSelected"; this.updateStats(); this.render();
            };
            document.getElementById('btnKgCancelMode3').onclick = () => { this.currentMode = "showSelected"; this.updateStats(); this.render(); };
            document.getElementById('btnKgResetAllMode3').onclick = () => {
                showConfirmModal("Tüm seçimler silinecek. Onaylıyor musunuz?", () => {
                    this.clearAll(); this.currentMode = "edit"; this.saveToStorage(); this.updateStats(); this.render();
                });
            };

            const selectedBenches = this.benchesMaster.filter(b => this.isSelected(b, true));
            const unselectedBenches = this.benchesMaster.filter(b => !this.isSelected(b, true) && b.selectable);
            const ts1Bench = this.benchesMaster.find(b => b.name === "TS1");

            let html = `<div class="kg-grid">${selectedBenches.map(b => this.renderSimpleCard(b, true, true, false)).join('')}</div>`;
            if (unselectedBenches.length > 0 || (ts1Bench && !ts1Bench.selectable)) {
                html += `<div class="kg-divider"></div><div class="kg-section-title">📌 Seçilmemiş Tezgahlar</div>`;
                const unselectedList = [...unselectedBenches];
                if (ts1Bench && !ts1Bench.selectable) unselectedList.push(ts1Bench);
                html += `<div class="kg-grid">${unselectedList.map(b => this.renderSimpleCard(b, false, false, false)).join('')}</div>`;
            }
            dashboard.innerHTML = html;
            this.attachCardEvents("showAllWithSplit");
        }
        this.updateStats();
    }
};

function toggleAtamalarMenu() {
    const subMenu = document.getElementById('atamalarSubMenu');
    const icon = document.getElementById('atamalarIcon');
    
    if (subMenu.style.display === 'none' || subMenu.style.display === '') {
        subMenu.style.display = 'flex';
        icon.style.transform = 'rotate(180deg)';
    } else {
        subMenu.style.display = 'none';
        icon.style.transform = 'rotate(0deg)';
    }
}

window.addEventListener('popstate', function(event) {
    const acikModal = document.querySelector('.modal-overlay.active');
    if (acikModal) {
        acikModal.classList.remove('active');
        history.pushState(null, null, location.href);
        return;
    }

    if (activeBottomTab) {
        closeBottomTab(true);
        history.pushState(null, null, location.href);
        return;
    }

    const homeScreen = document.getElementById('homeScreen');
    if (homeScreen.classList.contains('hidden')) {
        navigateTo('home');
        history.pushState(null, null, location.href);
    } else {
        showConfirmModal("Uygulamadan çıkmak istediğinize emin misiniz?", () => {
            window.close(); 
            location.href = 'about:blank'; 
        });
        history.pushState(null, null, location.href);
    }
});

history.pushState(null, null, location.href);
