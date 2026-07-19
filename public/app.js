// Global Application State
let currentUser = null;
let currentView = 'view-login';
let pinBuffer = '';
let cart = [];
let purchaseItems = [];
let customers = [];
let suppliers = [];
let medicinesList = []; // local cache for dropdowns
let activeCustomer = null;

// Supabase client instance
let supabaseClient = null;

// Initialize App on DOM load
document.addEventListener('DOMContentLoaded', () => {
    if (!checkSupabaseConfig()) {
        switchView('view-login');
        showSupabaseConfigForm();
    } else {
        checkSession();
    }
    setupEventListeners();
});

// Setup navigation and event listeners
function setupEventListeners() {
    // Desktop Sidebar Navigation items
    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentUser) {
                const targetView = link.getAttribute('data-target');
                if (targetView) switchView(targetView);
            }
        });
    });

    // Sidebar Logout Button
    const logoutBtn = document.getElementById('sidebar-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }

    // Mobile Navigation items (Bottom Nav)
    document.getElementById('bottom-nav-home').addEventListener('click', (e) => {
        e.preventDefault();
        if (currentUser) switchView('view-dashboard');
    });

    document.getElementById('bottom-nav-search').addEventListener('click', (e) => {
        e.preventDefault();
        if (currentUser) switchView('view-cek-harga');
    });

    document.getElementById('bottom-nav-pos').addEventListener('click', (e) => {
        e.preventDefault();
        if (currentUser) switchView('view-kasir');
    });

    document.getElementById('bottom-nav-info').addEventListener('click', (e) => {
        e.preventDefault();
        if (currentUser) {
            switchView('view-info');
            loadInfoStats();
        }
    });

    document.getElementById('bottom-nav-logout').addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });

    const syncBtn = document.getElementById('btn-sync');
    if (syncBtn) {
        syncBtn.addEventListener('click', () => {
            loadDashboard();
        });
    }

    // Global Search (filters menu items on dashboard)
    document.getElementById('global-search').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const cards = document.querySelectorAll('.menu-card');
        cards.forEach(card => {
            const title = card.querySelector('.menu-card-title').textContent.toLowerCase();
            if (title.includes(query)) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    });
}

// Default Supabase Credentials (Pre-configured)
const DEFAULT_SUPABASE_URL = 'https://tcibuqljlsfslylewrhk.supabase.co';
const DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjaWJ1cWxqbHNmc2x5bGV3cmhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzOTI1ODQsImV4cCI6MjA5OTk2ODU4NH0.1PqqtuKJMtaFoyZVJjLJDR-kIx7bzoEMLcQVjYHdSSw';

// --------------------------------------------------------------------------
// Supabase Configuration Management
// --------------------------------------------------------------------------
function checkSupabaseConfig() {
    const url = localStorage.getItem('supabaseUrl') || DEFAULT_SUPABASE_URL;
    const key = localStorage.getItem('supabaseAnonKey') || DEFAULT_SUPABASE_KEY;
    if (url && key && window.supabase) {
        supabaseClient = window.supabase.createClient(url, key);
        return true;
    }
    return false;
}

function showSupabaseConfigForm() {
    const pinContainer = document.getElementById('login-pin-container');
    const supabaseContainer = document.getElementById('login-supabase-container');
    
    if (pinContainer) pinContainer.classList.add('hidden');
    if (supabaseContainer) supabaseContainer.classList.remove('hidden');
    
    // Autofill values if configured
    const url = localStorage.getItem('supabaseUrl');
    const key = localStorage.getItem('supabaseAnonKey');
    const urlInput = document.getElementById('setup-db-url');
    const keyInput = document.getElementById('setup-db-key');
    if (url && urlInput) urlInput.value = url;
    if (key && keyInput) keyInput.value = key;

    const cancelBtn = document.getElementById('btn-cancel-db-config');
    if (cancelBtn) {
        if (url && key) {
            cancelBtn.classList.remove('hidden');
        } else {
            cancelBtn.classList.add('hidden');
        }
    }
}

function hideSupabaseConfigForm() {
    const pinContainer = document.getElementById('login-pin-container');
    const supabaseContainer = document.getElementById('login-supabase-container');
    if (pinContainer) pinContainer.classList.remove('hidden');
    if (supabaseContainer) supabaseContainer.classList.add('hidden');
}

function saveSupabaseConfig() {
    const urlInput = document.getElementById('setup-db-url');
    const keyInput = document.getElementById('setup-db-key');
    const url = urlInput ? urlInput.value.trim() : '';
    const key = keyInput ? keyInput.value.trim() : '';
    
    if (!url || !key) {
        alert('Supabase URL dan Anon Key tidak boleh kosong!');
        return;
    }
    
    localStorage.setItem('supabaseUrl', url);
    localStorage.setItem('supabaseAnonKey', key);
    
    if (checkSupabaseConfig()) {
        alert('Database Supabase berhasil terhubung!');
        hideSupabaseConfigForm();
        loadLoginUsers();
    } else {
        alert('Gagal menginisialisasi client Supabase. Pastikan URL dan Key benar!');
    }
}

// Session Management
function checkSession() {
    loadAppSettings();
    const savedUser = sessionStorage.getItem('activeUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateUserHeader();
        switchView('view-dashboard');
        loadDashboard();
        loadAllDropdowns();
    } else {
        loadLoginUsers();
        switchView('view-login');
    }
}

function updateUserHeader() {
    const header = document.getElementById('header-user-badge');
    const avatar = document.getElementById('header-avatar');
    const username = document.getElementById('header-username');
    
    const sAvatar = document.getElementById('sidebar-avatar');
    const sUsername = document.getElementById('sidebar-username');
    const sRole = document.getElementById('sidebar-role');
    
    const isAdmin = currentUser && String(currentUser.role || '').toUpperCase() === 'ADMIN';
    document.querySelectorAll('.admin-only').forEach(el => {
        if (isAdmin) {
            el.style.display = '';
        } else {
            el.style.display = 'none';
        }
    });

    if (currentUser) {
        header.classList.remove('hidden');
        avatar.textContent = currentUser.nama_staf.substring(0, 1).toUpperCase();
        username.textContent = currentUser.nama_staf;
        
        if (sAvatar) sAvatar.textContent = currentUser.nama_staf.substring(0, 1).toUpperCase();
        if (sUsername) sUsername.textContent = currentUser.nama_staf;
        if (sRole) sRole.textContent = currentUser.role;
    } else {
        header.classList.add('hidden');
    }
}

function logout() {
    currentUser = null;
    sessionStorage.removeItem('activeUser');
    updateUserHeader();
    loadLoginUsers();
    switchView('view-login');
}

// Load Users into Login Dropdown from Supabase
async function loadLoginUsers() {
    try {
        if (!supabaseClient) return;
        const { data, error } = await supabaseClient.from('user_login').select('*');
        const select = document.getElementById('login-user-select');
        select.innerHTML = '<option value="" disabled selected>Pilih Staf...</option>';
        
        if (!error && data) {
            data.forEach(user => {
                const opt = document.createElement('option');
                opt.value = JSON.stringify(user);
                opt.textContent = `${user.nama_staf} (${user.role})`;
                select.appendChild(opt);
            });
        }
    } catch (e) {
        console.error('Error loading login users:', e);
    }
}

// Keyboard PIN Entry Logic
function pressKey(num) {
    if (pinBuffer.length < 6) {
        pinBuffer += num;
        updatePinDots();
    }
}

function clearPin() {
    pinBuffer = '';
    updatePinDots();
}

function updatePinDots() {
    for (let i = 1; i <= 6; i++) {
        const dot = document.getElementById(`pin-${i}`);
        if (dot) {
            if (i <= pinBuffer.length) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        }
    }
}

function submitPin() {
    const select = document.getElementById('login-user-select');
    if (!select.value) {
        alert('Pilih staf terlebih dahulu!');
        clearPin();
        return;
    }
    
    const user = JSON.parse(select.value);
    const cleanUserPin = String(user.pin || '').replace(/\.0$/, '').trim();
    const cleanInputPin = String(pinBuffer || '').trim();

    if (cleanInputPin === cleanUserPin) {
        currentUser = user;
        sessionStorage.setItem('activeUser', JSON.stringify(user));
        updateUserHeader();
        switchView('view-dashboard');
        loadDashboard();
        loadAllDropdowns();
        clearPin();
    } else {
        alert('PIN Salah! Silakan coba lagi.');
        clearPin();
    }
}

// Global View Switcher
function switchView(viewId) {
    if (viewId === 'view-settings') {
        if (!currentUser || String(currentUser.role || '').toUpperCase() !== 'ADMIN') {
            alert('Akses Ditolak! Menu Pengaturan Sistem hanya dapat diakses oleh Admin.');
            return;
        }
    }

    if (viewId === 'view-login') {
        document.getElementById('main-app-shell').classList.add('hidden');
        document.getElementById('view-login').classList.remove('hidden');
        const mNav = document.getElementById('mobile-bottom-nav');
        if (mNav) mNav.classList.add('hidden');
        return;
    } else {
        document.getElementById('main-app-shell').classList.remove('hidden');
        document.getElementById('view-login').classList.add('hidden');
    }

    document.querySelectorAll('section').forEach(sec => {
        sec.classList.add('hidden');
    });
    
    const target = document.getElementById(viewId);
    if (target) {
        target.classList.remove('hidden');
        currentView = viewId;
    }
    
    // Toggle mobile bottom nav visibility
    const mNav = document.getElementById('mobile-bottom-nav');
    if (mNav) {
        if (viewId === 'view-login') {
            mNav.classList.add('hidden');
        } else {
            mNav.classList.remove('hidden');
        }
    }
    
    // Reset active nav items on sidebar
    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-target') === viewId) {
            link.classList.add('active');
        }
    });
    
    // Reset active nav items on bottom nav
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Set active item based on current view
    if (viewId === 'view-dashboard') {
        const bh = document.getElementById('bottom-nav-home');
        if (bh) bh.classList.add('active');
    } else if (viewId === 'view-cek-harga') {
        const bs = document.getElementById('bottom-nav-search');
        if (bs) bs.classList.add('active');
    } else if (viewId === 'view-kasir') {
        const bp = document.getElementById('bottom-nav-pos');
        if (bp) bp.classList.add('active');
    } else if (viewId === 'view-info') {
        const bi = document.getElementById('bottom-nav-info');
        if (bi) bi.classList.add('active');
    }

    if (viewId === 'view-menu-laporan') {
        initLaporanView();
    }

    // Set page header title
    const titleEl = document.getElementById('page-title');
    if (titleEl) {
        const activeLink = document.querySelector(`.sidebar .nav-link[data-target="${viewId}"]`);
        if (activeLink) {
            titleEl.textContent = activeLink.querySelector('span').textContent;
        } else {
            titleEl.textContent = 'Apotek HF';
        }
    }
    
    // Load view data
    if (viewId === 'view-cek-harga') loadCekHargaList();
    if (viewId === 'view-kasir') initPOS();
    if (viewId === 'view-master-obat') loadMasterObat();
    if (viewId === 'view-menu-penjualan') loadRiwayatPenjualan();
    if (viewId === 'view-menu-pembelian') initPembelian();
    if (viewId === 'view-dokumentasi-faktur') loadDokumentasiFaktur();
    if (viewId === 'view-menu-laporan') loadLaporanView();
    if (viewId === 'view-menu-tagihan') loadTagihanData();
    if (viewId === 'view-menu-stok-opname') initStokOpname();
    if (viewId === 'view-cek-kesehatan') initCekKesehatan();
    if (viewId === 'view-kas') loadKasLedger();
    if (viewId === 'view-supplier-pelanggan') loadSupplierPelanggan();
    if (viewId === 'view-info') loadInfoStats();
}

// --------------------------------------------------------------------------
// 1. DASHBOARD VIEW WIDGETS
// --------------------------------------------------------------------------
async function loadDashboard() {
    if (!supabaseClient) return;
    
    const menuIcons = {
        "Cek Harga": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="menu-icon"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
        "KASIR": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="menu-icon"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>`,
        "Master Obat": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="menu-icon"><path d="M10.5 3.5a2.12 2.12 0 0 1 3 0l7 7a2.12 2.12 0 0 1 0 3l-7 7a2.12 2.12 0 0 1-3 0l-7-7a2.12 2.12 0 0 1 0-3l7-7z"></path><path d="m8.5 10.5 5 5"></path></svg>`,
        "Menu Penjualan": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="menu-icon"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`,
        "Menu Pembelian": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="menu-icon"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>`,
        "Menu Laporan": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="menu-icon"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`,
        "Menu Tagihan": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="menu-icon"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`,
        "Dokumentasi Faktur": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="menu-icon"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`,
        "Menu Stok Opname": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="menu-icon"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="m9 14 2 2 4-4"></path></svg>`,
        "Cek Kesehatan": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="menu-icon"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>`,
        "KAS": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="menu-icon"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><line x1="12" y1="4" x2="12" y2="20"></line><line x1="2" y1="12" x2="22" y2="12"></line></svg>`,
        "Supplier dan Pelanggan": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="menu-icon"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
        "Pengaturan Menu & User": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="menu-icon"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`
    };

    if (currentUser) {
        document.getElementById('dashboard-welcome-name').textContent = currentUser.nama_staf;
    }
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('dashboard-current-date').textContent = new Date().toLocaleDateString('id-ID', dateOptions);

    // 1. Fetch KPI summary stats
    try {
        const dateObj = new Date();
        const yy = String(dateObj.getFullYear()).substring(2);
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const todayPattern = `${dd}/${mm}/20${yy}%`;

        // Fetch sales today
        const { data: salesTx } = await supabaseClient.from('transaksi_jual').select('total_bayar').like('tanggal', todayPattern);
        const salesTodaySum = salesTx ? salesTx.reduce((sum, tx) => sum + parseFloat(tx.total_bayar || 0), 0) : 0;
        const countTodayVal = salesTx ? salesTx.length : 0;
        
        // Fetch low stock items count from view
        const { count: lowStockCountVal } = await supabaseClient.from('view_low_stock').select('*', { count: 'exact', head: true });

        document.getElementById('dash-kpi-sales').textContent = `Rp ${formatMoney(salesTodaySum)}`;
        document.getElementById('dash-kpi-tx').textContent = `${countTodayVal} Transaksi`;
        document.getElementById('dash-kpi-lowstock').textContent = `${lowStockCountVal || 0} Item`;
    } catch (e) {
        console.error('Error fetching KPI summary:', e);
    }

    // 2. Fetch Low Stock warnings list from view
    try {
        const { data: lowStockData } = await supabaseClient.from('view_low_stock').select('*').limit(10);
        const lowstockList = document.getElementById('dash-lowstock-list');
        lowstockList.innerHTML = '';
        if (lowStockData && lowStockData.length > 0) {
            lowStockData.forEach(o => {
                const item = document.createElement('div');
                item.style.padding = '8px 12px';
                item.style.backgroundColor = '#fef2f2';
                item.style.borderRadius = '6px';
                item.style.borderLeft = '3px solid #ef4444';
                item.style.display = 'flex';
                item.style.justifyContent = 'space-between';
                item.innerHTML = `
                    <span><strong>${o.nama_obat}</strong></span>
                    <span style="color: #b91c1c;">Stok: ${o.stok_unit_kecil || 0} / Min: ${o.stok_minimal}</span>
                `;
                lowstockList.appendChild(item);
            });
        } else {
            lowstockList.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 10px;">Semua stok aman!</div>';
        }
    } catch (e) {
        console.error('Error fetching low stock warning list:', e);
    }

    // 3. Fetch Recent Sales
    try {
        const { data: recentTx } = await supabaseClient.from('transaksi_jual').select('*').order('tanggal', { ascending: false }).limit(5);
        const recentList = document.getElementById('dash-recent-sales');
        recentList.innerHTML = '';
        if (recentTx && recentTx.length > 0) {
            recentTx.forEach(tx => {
                const item = document.createElement('div');
                item.style.padding = '8px 12px';
                item.style.backgroundColor = '#f0fdf4';
                item.style.borderRadius = '6px';
                item.style.borderLeft = '3px solid var(--primary-color)';
                item.style.display = 'flex';
                item.style.flexDirection = 'column';
                item.innerHTML = `
                    <div style="display: flex; justify-content: space-between; font-weight: 600;">
                        <span>${tx.id_jual}</span>
                        <span>Rp ${formatMoney(tx.total_bayar)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); margin-top: 4px;">
                        <span>Kasir: ${tx.user}</span>
                        <span>Metode: ${tx.metode_bayar}</span>
                    </div>
                `;
                recentList.appendChild(item);
            });
        } else {
            recentList.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 10px;">Belum ada penjualan terbaru.</div>';
        }
    } catch (e) {
        console.error('Error fetching recent sales:', e);
    }

    // 4. Render Menu grid
    try {
        const { data: menusData } = await supabaseClient.from('menu').select('*');
        const grid = document.getElementById('dashboard-menu-grid');
        grid.innerHTML = '';
        
        if (menusData) {
            menusData.forEach(item => {
                if (item.menu === 'SETTINGS' || item.judul === 'LOG OUT' || item.judul === 'LOG IN') return;
                
                let viewTarget = '';
                if (item.menu === 'Cek Harga') viewTarget = 'view-cek-harga';
                else if (item.menu === 'KASIR') viewTarget = 'view-kasir';
                else if (item.menu === 'Master Obat') viewTarget = 'view-master-obat';
                else if (item.menu === 'Menu Penjualan') viewTarget = 'view-menu-penjualan';
                else if (item.menu === 'Menu Pembelian') viewTarget = 'view-menu-pembelian';
                else if (item.menu === 'Menu Laporan') viewTarget = 'view-menu-laporan';
                else if (item.menu === 'Menu Tagihan') viewTarget = 'view-menu-tagihan';
                else if (item.menu === 'Dokumentasi Faktur') viewTarget = 'view-dokumentasi-faktur';
                else if (item.menu === 'Menu Stok Opname') viewTarget = 'view-menu-stok-opname';
                else if (item.menu === 'Cek Kesehatan') viewTarget = 'view-cek-kesehatan';
                else if (item.menu === 'KAS') viewTarget = 'view-kas';
                else if (item.menu === 'Supplier dan Pelanggan') viewTarget = 'view-supplier-pelanggan';
                else return;
                
                const card = document.createElement('div');
                card.className = 'menu-card';
                card.onclick = () => switchView(viewTarget);
                
                const svgIcon = menuIcons[item.menu] || `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="menu-icon"><circle cx="12" cy="12" r="10"></circle></svg>`;
                
                card.innerHTML = `
                    <div class="menu-card-icon-wrapper">
                        ${svgIcon}
                    </div>
                    <div class="menu-card-title">${item.judul}</div>
                `;
                grid.appendChild(card);
            });
        }
    } catch (e) {
        console.error('Error rendering dashboard menus:', e);
    }
}

// --------------------------------------------------------------------------
// 2. CEK HARGA OBAT (PAGINATED)
// --------------------------------------------------------------------------
let currentCekHargaPage = 1;
let currentCekHargaPageSize = 10;

async function loadCekHargaList() {
    searchHarga(1);
}

async function searchHarga(page = currentCekHargaPage, pageSize = currentCekHargaPageSize) {
    currentCekHargaPage = page;
    currentCekHargaPageSize = pageSize;
    const q = document.getElementById('cek-harga-search').value.trim();
    try {
        if (!supabaseClient) return;
        let query = supabaseClient.from('master_obat').select('*', { count: 'exact' });
        if (q) {
            query = query.or(`id_obat.ilike.%${q}%,nama_obat.ilike.%${q}%,kategori.ilike.%${q}%`);
        }
        
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const { data, count, error } = await query.order('nama_obat').range(from, to);
        const tbody = document.getElementById('cek-harga-table-body');
        const mobileList = document.getElementById('cek-harga-mobile-list');
        
        tbody.innerHTML = '';
        if (mobileList) mobileList.innerHTML = '';
        
        if (!error && data) {
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-muted); padding: 20px;">Obat tidak ditemukan.</td></tr>';
                if (mobileList) mobileList.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding: 20px;">Obat tidak ditemukan.</div>';
                renderPaginationControls('cek-harga-pagination', 1, 1, pageSize, 'searchHarga');
            } else {
                data.forEach(o => {
                    // Desktop table row
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><strong>${o.id_obat}</strong></td>
                        <td>${o.nama_obat}</td>
                        <td>${o.kategori || '-'}</td>
                        <td>${o.rak_tempat || '-'}</td>
                        <td>${o.stok_unit_kecil || 0} ${o.label_satuan_kecil || 'Pcs'}</td>
                        <td>Rp ${formatMoney(o.harga_l1_s1)} / ${o.satuan_1 || 'Pcs'}</td>
                        <td>${o.satuan_2 ? `Rp ${formatMoney(o.harga_l1_s2)} / ${o.satuan_2}` : '-'}</td>
                        <td>${o.satuan_3 ? `Rp ${formatMoney(o.harga_l1_s3)} / ${o.satuan_3}` : '-'}</td>
                    `;
                    tbody.appendChild(tr);

                    // Mobile price card
                    if (mobileList) {
                        const card = document.createElement('div');
                        card.className = 'price-card-mobile';
                        
                        let pricesHtml = `<div class="price-pill primary"><span>${o.satuan_1 || 'Pcs'}:</span> <strong>Rp ${formatMoney(o.harga_l1_s1)}</strong></div>`;
                        if (o.satuan_2 && parseFloat(o.harga_l1_s2 || 0) > 0) {
                            pricesHtml += `<div class="price-pill"><span>${o.satuan_2}:</span> <strong>Rp ${formatMoney(o.harga_l1_s2)}</strong></div>`;
                        }
                        if (o.satuan_3 && parseFloat(o.harga_l1_s3 || 0) > 0) {
                            pricesHtml += `<div class="price-pill"><span>${o.satuan_3}:</span> <strong>Rp ${formatMoney(o.harga_l1_s3)}</strong></div>`;
                        }

                        const stockNum = parseFloat(o.stok_unit_kecil || 0);
                        const stockMin = parseFloat(o.stok_minimal || 5);
                        const stockBadgeStyle = stockNum <= stockMin 
                            ? 'background-color:#fee2e2; color:#ef4444;' 
                            : 'background-color:#ecfdf5; color:#10b981;';

                        card.innerHTML = `
                            <div class="price-card-header">
                                <div style="flex:1;">
                                    <div class="price-card-title">${o.nama_obat}</div>
                                    <div class="price-card-sub">ID: ${o.id_obat} • Rak: ${o.rak_tempat || '-'} • Kat: ${o.kategori || '-'}</div>
                                </div>
                                <span class="badge" style="${stockBadgeStyle}">Stok: ${stockNum} ${o.label_satuan_kecil || 'Pcs'}</span>
                            </div>
                            <div class="price-pills-row">
                                ${pricesHtml}
                            </div>
                        `;
                        mobileList.appendChild(card);
                    }
                });

                const totalPages = Math.ceil((count !== null ? count : data.length) / pageSize);
                renderPaginationControls('cek-harga-pagination', page, totalPages, pageSize, 'searchHarga');
            }
        }
    } catch (e) {
        console.error('Error searching prices:', e);
    }
}

// --------------------------------------------------------------------------
// 3. KASIR (POS)
// --------------------------------------------------------------------------
async function initPOS() {
    cart = [];
    activeCustomer = null;
    updateCartUI();
    switchPOSTab('catalog');
    
    // Load customers
    try {
        if (!supabaseClient) return;
        const { data, error } = await supabaseClient.from('pelanggan').select('*').order('nama');
        const select = document.getElementById('pos-customer-select');
        select.innerHTML = '';
        customers = data || [];
        
        customers.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id_pelanggan;
            opt.textContent = c.nama;
            if (c.nama === 'UMUM') {
                opt.selected = true;
                activeCustomer = c;
            }
            select.appendChild(opt);
        });
        
        posChangeCustomer();
        posSearchObat();
    } catch (e) {
        console.error('Error initializing customers in POS:', e);
    }
}

function posChangeCustomer() {
    const id = document.getElementById('pos-customer-select').value;
    activeCustomer = customers.find(c => c.id_pelanggan === id) || null;
    const badge = document.getElementById('pos-customer-level');
    const level = activeCustomer ? activeCustomer.level_harga : 'Level 1';
    if (badge) badge.textContent = level;
    
    // Update prices in cart based on customer level
    cart.forEach(item => {
        item.harga = getPriceForLevel(item.obat, item.satuan, level);
    });
    updateCartUI();
}

let currentPOSPage = 1;
let currentPOSPageSize = 10;
let currentPOSCatFilter = '';

async function posSearchObat(page = currentPOSPage, pageSize = currentPOSPageSize, catFilter = currentPOSCatFilter) {
    currentPOSPage = page;
    currentPOSPageSize = pageSize;
    currentPOSCatFilter = catFilter;

    const q = document.getElementById('pos-search-input')?.value.trim() || '';
    
    try {
        if (!supabaseClient) return;
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        let query = supabaseClient.from('master_obat').select('*', { count: 'exact' });
        if (q) {
            query = query.or(`id_obat.ilike.%${q}%,nama_obat.ilike.%${q}%`);
        }

        if (catFilter) {
            query = query.eq('kategori', catFilter);
        }

        const { data, count, error } = await query.order('nama_obat').range(from, to);
            
        const results = document.getElementById('pos-search-results');
        results.innerHTML = '';
        
        if (!error && data) {
            if (data.length === 0) {
                results.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding:20px; font-size:13px;">Tidak ada obat ditemukan.</div>';
                renderPaginationControls('pos-pagination', 1, 0, pageSize, 'posSearchObat');
                return;
            }

            data.forEach(o => {
                const price = getPriceForLevel(o, 'Satuan 1', activeCustomer ? activeCustomer.level_harga : 'Level 1');
                const stok = parseFloat(o.stok_unit_kecil || 0);
                const isOutOfStock = stok <= 0;

                const stokBadge = isOutOfStock 
                    ? 'background:#fee2e2; color:#dc2626; font-weight:700;' 
                    : (stok <= 5 ? 'background:#fef2f2; color:#ef4444;' : 'background:#ecfdf5; color:#10b981;');
                
                const row = document.createElement('div');
                row.className = 'pos-item-row';
                if (isOutOfStock) {
                    row.style.cssText = 'opacity: 0.55; background-color: #f1f5f9; cursor: not-allowed; border-color: #e2e8f0;';
                }

                row.onclick = () => {
                    if (isOutOfStock) {
                        alert(`Stok obat "${o.nama_obat}" sedang kosong! Tidak dapat ditambahkan.`);
                        return;
                    }
                    addToCart(o);
                };

                row.innerHTML = `
                    <div class="pos-item-details">
                        <div style="display:flex; align-items:center; gap:6px;">
                            <span class="pos-item-name" style="${isOutOfStock ? 'color:#64748b;' : ''}">${o.nama_obat}</span>
                            <span class="badge" style="font-size:9.5px; ${stokBadge}">${isOutOfStock ? 'HABIS' : 'Stok: ' + stok + ' ' + (o.label_satuan_kecil || 'Pcs')}</span>
                        </div>
                        <span style="font-size:11px; color:var(--text-muted);">🆔 ${o.id_obat} • 📦 ${o.kategori || 'Umum'}</span>
                    </div>
                    <div style="text-align:right;">
                        <strong style="${isOutOfStock ? 'color:#94a3b8;' : 'color:var(--primary-color);'} font-size:13.5px;">Rp ${formatMoney(price)}</strong>
                        <div style="font-size:10px; font-weight:${isOutOfStock ? '700' : '400'}; color:${isOutOfStock ? '#dc2626' : 'var(--text-muted)'};">${isOutOfStock ? '🚫 Stok Kosong' : '+ Tambah'}</div>
                    </div>
                `;
                results.appendChild(row);
            });

            const totalPages = Math.ceil((count !== null ? count : data.length) / pageSize);
            renderPaginationControls('pos-pagination', page, totalPages, pageSize, 'posSearchObat');
        }
    } catch (e) {
        console.error('Error searching obat in POS:', e);
    }
}

function posFilterCategory(cat) {
    document.getElementById('pos-search-input').value = '';
    posSearchObat(1, currentPOSPageSize, cat);
}

function clearCart() {
    if (cart.length === 0) return;
    if (confirm('Kosongkan semua barang di keranjang?')) {
        cart = [];
        updateCartUI();
    }
}

function addToCart(o) {
    const stok = parseFloat(o.stok_unit_kecil || 0);
    if (stok <= 0) {
        alert(`Stok obat "${o.nama_obat}" sedang kosong! Tidak dapat ditambahkan.`);
        return;
    }

    const existing = cart.find(item => item.id_obat === o.id_obat);
    const price = getPriceForLevel(o, 'Satuan 1', activeCustomer ? activeCustomer.level_harga : 'Level 1');
    
    if (existing) {
        if (existing.jumlah + 1 > stok) {
            alert(`Stok obat "${o.nama_obat}" tidak mencukupi (Stok tersedia: ${stok} unit).`);
            return;
        }
        existing.jumlah += 1;
    } else {
        cart.push({
            id_obat: o.id_obat,
            nama_obat: o.nama_obat,
            satuan: 'Satuan 1', // Default
            satuan_nama: o.satuan_1 || 'Pcs',
            jumlah: 1,
            harga: price,
            konversi: 1,
            obat: o
        });
    }
    
    updateCartUI();
}

function changeCartQty(id, qty) {
    const item = cart.find(i => i.id_obat === id);
    if (item) {
        const val = parseFloat(qty);
        if (val <= 0) {
            removeCartItem(id);
        } else {
            const stok = parseFloat(item.obat.stok_unit_kecil || 0);
            const totalSmallestNeeded = val * item.konversi;
            if (totalSmallestNeeded > stok) {
                const maxInUnit = Math.floor(stok / item.konversi);
                alert(`Stok "${item.nama_obat}" tidak mencukupi! Maksimal yang dapat dibeli: ${maxInUnit} ${item.satuan_nama}.`);
                updateCartUI();
                return;
            }
            item.jumlah = val;
            updateCartUI();
        }
    }
}

function stepCartQty(id, delta) {
    const item = cart.find(i => i.id_obat === id);
    if (item) {
        const newQty = item.jumlah + delta;
        if (newQty <= 0) {
            removeCartItem(id);
        } else {
            const stok = parseFloat(item.obat.stok_unit_kecil || 0);
            const totalSmallestNeeded = newQty * item.konversi;
            if (totalSmallestNeeded > stok) {
                const maxInUnit = Math.floor(stok / item.konversi);
                alert(`Stok "${item.nama_obat}" tidak mencukupi! Maksimal yang dapat dibeli: ${maxInUnit} ${item.satuan_nama}.`);
                return;
            }
            item.jumlah = newQty;
            updateCartUI();
        }
    }
}

function changeCartUnit(id, selectEl) {
    const item = cart.find(i => i.id_obat === id);
    if (item) {
        const satVal = selectEl.value; // 'Satuan 1', 'Satuan 2', 'Satuan 3'
        const o = item.obat;
        let newSatuanNama = o.satuan_1 || 'Pcs';
        let newKonversi = 1;

        if (satVal === 'Satuan 1') {
            newSatuanNama = o.satuan_1 || 'Pcs';
            newKonversi = 1;
        } else if (satVal === 'Satuan 2') {
            newSatuanNama = o.satuan_2;
            newKonversi = parseFloat(o.isi_2_ke_1 || 1);
        } else if (satVal === 'Satuan 3') {
            newSatuanNama = o.satuan_3;
            newKonversi = parseFloat(o.isi_3_ke_2 || 1) * parseFloat(o.isi_2_ke_1 || 1);
        }

        const stok = parseFloat(o.stok_unit_kecil || 0);
        if (item.jumlah * newKonversi > stok) {
            alert(`Stok tidak mencukupi untuk memilih ${newSatuanNama}!`);
            updateCartUI();
            return;
        }

        item.satuan = satVal;
        item.satuan_nama = newSatuanNama;
        item.konversi = newKonversi;
        item.harga = getPriceForLevel(o, satVal, activeCustomer ? activeCustomer.level_harga : 'Level 1');
        updateCartUI();
    }
}

function removeCartItem(id) {
    cart = cart.filter(i => i.id_obat !== id);
    updateCartUI();
}

function updateCartUI() {
    const container = document.getElementById('pos-cart-items');
    container.innerHTML = '';
    
    if (cart.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:40px 10px; color:var(--text-muted);">
                <div style="font-size:36px; margin-bottom:8px;">🛒</div>
                <div style="font-size:13px; font-weight:600;">Keranjang Masih Kosong</div>
                <div style="font-size:11.5px; margin-top:4px;">Klik barang di sebelah kiri untuk menambah ke keranjang</div>
            </div>
        `;
        document.getElementById('pos-grand-total').textContent = 'Rp 0';
        const badge = document.getElementById('pos-cart-count-badge');
        if (badge) badge.textContent = '0';
        return;
    }

    let grandTotal = 0;
    let totalQty = 0;
    cart.forEach(item => {
        const o = item.obat;
        const subtotal = item.jumlah * item.harga;
        grandTotal += subtotal;
        totalQty += Number(item.jumlah);
        
        let unitOptions = `<option value="Satuan 1" ${item.satuan === 'Satuan 1' ? 'selected' : ''}>${o.satuan_1 || 'Satuan 1'}</option>`;
        if (o.satuan_2) {
            unitOptions += `<option value="Satuan 2" ${item.satuan === 'Satuan 2' ? 'selected' : ''}>${o.satuan_2}</option>`;
        }
        if (o.satuan_3) {
            unitOptions += `<option value="Satuan 3" ${item.satuan === 'Satuan 3' ? 'selected' : ''}>${o.satuan_3}</option>`;
        }
        
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.style.cssText = 'background:var(--bg-main); border:1px solid var(--border-color); padding:10px; border-radius:8px; margin-bottom:8px;';
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
                <span style="font-size:13px; font-weight:700; color:var(--text-main); line-height:1.2;">${item.nama_obat}</span>
                <strong style="color:var(--primary-color); font-size:13.5px;">Rp ${formatMoney(subtotal)}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
                <div style="display:flex; align-items:center; gap:4px;">
                    <button type="button" class="btn btn-secondary" style="padding:2px 8px; font-size:13px; line-height:1;" onclick="stepCartQty('${item.id_obat}', -1)">-</button>
                    <input type="number" value="${item.jumlah}" min="1" onchange="changeCartQty('${item.id_obat}', this.value)" style="width:45px; text-align:center; padding:2px; font-size:12px; border:1px solid var(--border-color); border-radius:4px;">
                    <button type="button" class="btn btn-secondary" style="padding:2px 8px; font-size:13px; line-height:1;" onclick="stepCartQty('${item.id_obat}', 1)">+</button>

                    <select class="form-control" style="width: auto; height: 28px; padding: 2px 4px; font-size: 11.5px; margin-left: 4px;" onchange="changeCartUnit('${item.id_obat}', this)">
                        ${unitOptions}
                    </select>
                </div>
                <button class="btn btn-danger" style="padding: 3px 6px; font-size: 11px;" onclick="removeCartItem('${item.id_obat}')">✕</button>
            </div>
        `;
        container.appendChild(div);
    });
    
    document.getElementById('pos-grand-total').textContent = `Rp ${formatMoney(grandTotal)}`;
    const badge = document.getElementById('pos-cart-count-badge');
    if (badge) {
        badge.textContent = totalQty;
    }
}

function posCheckout() {
    if (cart.length === 0) {
        alert('Keranjang belanja kosong!');
        return;
    }

    const total_bayar = cart.reduce((sum, item) => sum + (item.jumlah * item.harga), 0);
    const payMethodSelect = document.getElementById('pos-pay-method');
    const selectedMethod = payMethodSelect ? payMethodSelect.value : 'CASH';

    const totalDisplay = document.getElementById('pay-modal-total-display');
    const methodSelect = document.getElementById('pay-modal-method');
    const amountInput = document.getElementById('pay-modal-amount-input');

    if (totalDisplay) totalDisplay.textContent = `Rp ${formatMoney(total_bayar)}`;
    if (methodSelect) methodSelect.value = selectedMethod;
    if (amountInput) amountInput.value = total_bayar;

    onPayMethodChange();
    calculatePosChange();
    document.getElementById('modal-pos-payment')?.classList.remove('hidden');
    amountInput?.focus();
}

function onPayMethodChange() {
    const method = document.getElementById('pay-modal-method')?.value || 'CASH';
    const amountGroup = document.getElementById('pay-modal-amount-group');
    const changeGroup = document.getElementById('pay-modal-change-group');
    const total_bayar = cart.reduce((sum, item) => sum + (item.jumlah * item.harga), 0);
    const amountInput = document.getElementById('pay-modal-amount-input');

    if (method === 'CASH') {
        if (amountGroup) amountGroup.style.display = '';
        if (changeGroup) changeGroup.style.display = '';
        calculatePosChange();
    } else {
        if (amountGroup) amountGroup.style.display = 'none';
        if (changeGroup) changeGroup.style.display = 'none';
        if (amountInput) amountInput.value = total_bayar;
    }
}

function calculatePosChange() {
    const total_bayar = cart.reduce((sum, item) => sum + (item.jumlah * item.harga), 0);
    const payAmountVal = parseFloat(document.getElementById('pay-modal-amount-input')?.value || 0);
    const changeDisplay = document.getElementById('pay-modal-change-display');

    const change = payAmountVal - total_bayar;

    if (changeDisplay) {
        if (change >= 0) {
            changeDisplay.textContent = `Rp ${formatMoney(change)}`;
            changeDisplay.style.color = '#047857';
        } else {
            changeDisplay.textContent = `Kurang Rp ${formatMoney(Math.abs(change))}`;
            changeDisplay.style.color = '#ef4444';
        }
    }
}

function setPayPreset(val) {
    const total_bayar = cart.reduce((sum, item) => sum + (item.jumlah * item.harga), 0);
    const amountInput = document.getElementById('pay-modal-amount-input');
    if (!amountInput) return;

    if (val === 'PAS') {
        amountInput.value = total_bayar;
    } else {
        amountInput.value = val;
    }
    calculatePosChange();
}

async function submitPosPayment(e) {
    if (e) e.preventDefault();
    if (cart.length === 0) {
        alert('Keranjang belanja kosong!');
        closeModal('modal-pos-payment');
        return;
    }

    const total_bayar = cart.reduce((sum, item) => sum + (item.jumlah * item.harga), 0);
    const payMethod = document.getElementById('pay-modal-method')?.value || 'CASH';
    const payAmount = parseFloat(document.getElementById('pay-modal-amount-input')?.value || 0);

    if (payMethod === 'CASH' && payAmount < total_bayar) {
        alert(`Uang pembayaran kurang! Total Tagihan Rp ${formatMoney(total_bayar)}, Uang Bayar Rp ${formatMoney(payAmount)} (Kurang Rp ${formatMoney(total_bayar - payAmount)})`);
        return;
    }

    const kembalian = payMethod === 'CASH' ? (payAmount - total_bayar) : 0;

    try {
        if (!supabaseClient) return;

        // ID Jual YYMMDD-user-suffix
        const dateObj = new Date();
        const yy = String(dateObj.getFullYear()).substring(2);
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const dateStr = `${yy}${mm}${dd}`;
        const suffix = Math.random().toString(36).substring(2, 6).toLowerCase();
        const id_jual = `${dateStr}-${(currentUser?.nama_staf || 'cashier').toLowerCase()}-${suffix}`;

        // Date formatter DD/MM/YYYY hh.mm.ss
        const formatJSDate = (d) => {
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            const hours = String(d.getHours()).padStart(2, '0');
            const mins = String(d.getMinutes()).padStart(2, '0');
            const secs = String(d.getSeconds()).padStart(2, '0');
            return `${day}/${month}/${year} ${hours}.${mins}.${secs}`;
        };
        const tanggalStr = formatJSDate(dateObj);

        const detailsToInsert = [];
        const stockUpdates = [];

        for (const item of cart) {
            const qty = parseFloat(item.jumlah);
            const price = parseFloat(item.harga);
            const subtotal = qty * price;

            const o = item.obat;
            let hpp_unit = 0;
            if (item.satuan === 'Satuan 1') hpp_unit = parseFloat(o.harga_beli_sat_1 || 0);
            else if (item.satuan === 'Satuan 2') hpp_unit = parseFloat(o.harga_beli_sat_2 || 0);
            else if (item.satuan === 'Satuan 3') hpp_unit = parseFloat(o.harga_beli_sat_3 || 0);

            const total_hpp = qty * hpp_unit;
            const laba_bersih = subtotal - total_hpp;
            const detailId = Math.random().toString(36).substring(2, 10);

            detailsToInsert.push({
                id_detail: detailId,
                id_jual: id_jual,
                id_obat: item.id_obat,
                nama_obat: item.nama_obat,
                satuan_dipilih: item.satuan_nama,
                jumlah_beli: String(qty),
                harga_satuan: String(price),
                subtotal: String(subtotal),
                konversi_keluar: String(item.konversi),
                jenis_transaksi: 'PENJUALAN',
                tanggal: tanggalStr,
                user: currentUser?.nama_staf || 'cashier',
                total_hpp: String(total_hpp),
                laba_bersih: String(laba_bersih)
            });

            // Calculate new stock
            const qtyInSmallestUnit = qty * item.konversi;
            const currentStock = parseFloat(o.stok_unit_kecil || 0);
            const newStock = currentStock - qtyInSmallestUnit;
            
            stockUpdates.push({
                id_obat: item.id_obat,
                stok_unit_kecil: String(newStock)
            });
        }

        // 1. Insert into transaksi_jual
        const { error: txErr } = await supabaseClient.from('transaksi_jual').insert([{
            id_jual: id_jual,
            tanggal: tanggalStr,
            metode_bayar: payMethod,
            total_bayar: String(total_bayar),
            nama_pelanggan: activeCustomer?.id_pelanggan || 'UMUM',
            jenis_transaksi: 'PENJUALAN',
            user: currentUser?.nama_staf || 'cashier'
        }]);

        if (txErr) throw txErr;

        // 2. Insert into detail_jual
        const { error: dtlErr } = await supabaseClient.from('detail_jual').insert(detailsToInsert);
        if (dtlErr) throw dtlErr;

        // 3. Update stock in master_obat
        for (const update of stockUpdates) {
            await supabaseClient.from('master_obat').update({ stok_unit_kecil: update.stok_unit_kecil }).eq('id_obat', update.id_obat);
        }

        closeModal('modal-pos-payment');
        alert(`Checkout & Pembayaran Berhasil!${payMethod === 'CASH' ? '\nKembalian: Rp ' + formatMoney(kembalian) : ''}`);
        showReceipt(id_jual, total_bayar, tanggalStr, payMethod === 'CASH' ? payAmount : total_bayar, kembalian);
        initPOS();
    } catch (e) {
        console.error('Checkout failed:', e);
        alert(`Checkout gagal: ${e.message}`);
    }
}

// --------------------------------------------------------------------------
// REUSABLE PAGINATION COMPONENT (Ant Design / Element Plus Pill Style)
// --------------------------------------------------------------------------
function renderPaginationControls(containerId, currentPage, totalPages, pageSize, onPageChangeName) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (totalPages <= 0) {
        container.innerHTML = '';
        return;
    }
    
    let html = `<div class="pagination-wrapper"><div class="pagination-pill-bar">`;
    
    // Chevron Left ‹
    const prevDisabled = currentPage <= 1 ? 'disabled' : '';
    html += `<button type="button" class="pagination-pill-btn" ${prevDisabled} onclick="${onPageChangeName}(${currentPage - 1}, ${pageSize})">‹</button>`;

    // Page number buttons (window of max 5)
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

    for (let p = startPage; p <= endPage; p++) {
        const activeClass = p === currentPage ? 'active' : '';
        html += `<button type="button" class="pagination-pill-btn ${activeClass}" onclick="${onPageChangeName}(${p}, ${pageSize})">${p}</button>`;
    }

    // Chevron Right ›
    const nextDisabled = currentPage >= totalPages ? 'disabled' : '';
    html += `<button type="button" class="pagination-pill-btn" ${nextDisabled} onclick="${onPageChangeName}(${currentPage + 1}, ${pageSize})">›</button>`;

    // Divider
    html += `<div class="pagination-divider"></div>`;

    // Page size selector
    html += `<select class="pagination-size-select" onchange="${onPageChangeName}(1, parseInt(this.value))">
        <option value="10" ${pageSize === 10 ? 'selected' : ''}>10 / page</option>
        <option value="25" ${pageSize === 25 ? 'selected' : ''}>25 / page</option>
        <option value="50" ${pageSize === 50 ? 'selected' : ''}>50 / page</option>
        <option value="100" ${pageSize === 100 ? 'selected' : ''}>100 / page</option>
    </select>`;

    // Divider
    html += `<div class="pagination-divider"></div>`;

    // Jump-to-page
    html += `<div class="pagination-jump-group">
        <span>Go to</span>
        <input type="number" class="pagination-jump-input" min="1" max="${totalPages}" value="${currentPage}"
            onkeydown="if(event.key==='Enter'){let p=Math.max(1,Math.min(${totalPages},parseInt(this.value)||1));${onPageChangeName}(p,${pageSize});}">
        <span>Page</span>
    </div>`;

    html += `</div></div>`;
    container.innerHTML = html;
}

// --------------------------------------------------------------------------
// 4. MASTER OBAT (PAGINATED)
// --------------------------------------------------------------------------
let currentObatPage = 1;
let currentObatPageSize = 10;

async function loadMasterObat(page = currentObatPage, pageSize = currentObatPageSize) {
    currentObatPage = page;
    currentObatPageSize = pageSize;
    const q = document.getElementById('master-obat-search').value.trim();
    try {
        if (!supabaseClient) return;
        let query = supabaseClient.from('master_obat').select('*', { count: 'exact' });
        if (q) {
            query = query.or(`id_obat.ilike.%${q}%,nama_obat.ilike.%${q}%`);
        }
        
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        
        const { data, count, error } = await query.order('nama_obat').range(from, to);
        const tbody = document.getElementById('master-obat-table-body');
        const mobileList = document.getElementById('master-obat-mobile-list');
        
        tbody.innerHTML = '';
        if (mobileList) mobileList.innerHTML = '';
        
        if (!error && data) {
            data.forEach(o => {
                const encId = encodeURIComponent(o.id_obat || '');

                // Desktop row
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${o.id_obat}</strong></td>
                    <td><a href="javascript:void(0)" style="font-weight:700; color:var(--primary-color); text-decoration:none;" onclick="previewObat('${encId}', event)">${o.nama_obat}</a></td>
                    <td>${o.kategori || '-'}</td>
                    <td>${o.stok_unit_kecil || 0} ${o.label_satuan_kecil || 'Pcs'}</td>
                    <td>${o.satuan_1 || 'Pcs'}</td>
                    <td>Rp ${formatMoney(o.harga_beli_sat_1)}</td>
                    <td>
                        <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 11px; margin-right: 4px;" onclick="previewObat('${encId}', event)">Detail</button>
                        <button class="btn btn-primary" style="padding: 4px 8px; font-size: 11px; margin-right: 4px;" onclick="editObat('${encId}', event)">Edit</button>
                        <button class="btn btn-danger" style="padding: 4px 8px; font-size: 11px;" onclick="deleteObat('${encId}', event)">Hapus</button>
                    </td>
                `;
                tbody.appendChild(tr);

                // Mobile card
                if (mobileList) {
                    const card = document.createElement('div');
                    card.className = 'price-card-mobile';
                    
                    const stockNum = parseFloat(o.stok_unit_kecil || 0);
                    const stockMin = parseFloat(o.stok_minimal || 5);
                    const stockBadgeStyle = stockNum <= stockMin 
                        ? 'background-color:#fee2e2; color:#ef4444;' 
                        : 'background-color:#ecfdf5; color:#10b981;';
                        
                    card.innerHTML = `
                        <div class="price-card-header">
                            <div style="flex:1;" onclick="previewObat('${encId}', event)">
                                <div class="price-card-title" style="color:var(--primary-color); cursor:pointer;">${o.nama_obat}</div>
                                <div class="price-card-sub">ID: ${o.id_obat} • Kategori: ${o.kategori || '-'} • Rak: ${o.rak || '-'}</div>
                            </div>
                            <span class="badge" style="${stockBadgeStyle}">Stok: ${stockNum} ${o.label_satuan_kecil || 'Pcs'}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                            <div style="font-size:12px; color:var(--text-muted);">
                                Satuan: <strong>${o.satuan_1 || 'Pcs'}</strong> • Beli: <strong>Rp ${formatMoney(o.harga_beli_sat_1)}</strong>
                            </div>
                            <div style="display:flex; gap:6px;">
                                <button class="btn btn-secondary" style="padding: 6px 10px; font-size: 11px;" onclick="previewObat('${encId}', event)">Detail</button>
                                <button class="btn btn-primary" style="padding: 6px 10px; font-size: 11px;" onclick="editObat('${encId}', event)">Edit</button>
                                <button class="btn btn-danger" style="padding: 6px 10px; font-size: 11px;" onclick="deleteObat('${encId}', event)">Hapus</button>
                            </div>
                        </div>
                    `;
                    mobileList.appendChild(card);
                }
            });

            const totalPages = Math.ceil((count !== null ? count : data.length) / pageSize);
            renderPaginationControls('master-obat-pagination', page, totalPages, pageSize, 'loadMasterObat');
        }
    } catch (e) {
        console.error('Error loading Master Obat:', e);
    }
}

function showAddObatModal() {
    document.getElementById('modal-add-obat').classList.remove('hidden');
}

async function submitAddObat(e) {
    e.preventDefault();
    try {
        if (!supabaseClient) return;
        
        // Generate new ID (Format HFXXXXX)
        const { data: maxRow } = await supabaseClient.from('master_obat').select('id_obat').like('id_obat', 'HF%').order('id_obat', { ascending: false }).limit(1);
        let nextId = 'HF00001';
        if (maxRow && maxRow.length > 0) {
            const lastNum = parseInt(maxRow[0].id_obat.replace('HF', ''));
            nextId = 'HF' + String(lastNum + 1).padStart(5, '0');
        }

        const newObat = {
            id_obat: nextId,
            nama_obat: document.getElementById('add-obat-nama').value,
            kategori: document.getElementById('add-obat-kategori').value || 'OBAT',
            satuan_1: document.getElementById('add-obat-sat1').value,
            label_satuan_kecil: document.getElementById('add-obat-sat1').value,
            satuan_2: document.getElementById('add-obat-sat2').value || '',
            isi_2_ke_1: document.getElementById('add-obat-isi2').value || '0',
            stok_unit_kecil: document.getElementById('add-obat-stok').value || '0',
            harga_beli_sat_1: document.getElementById('add-obat-l1s1').value || '0',
            harga_beli_sat_2: document.getElementById('add-obat-l1s2').value || '0',
            harga_l1_s1: document.getElementById('add-obat-l1s1').value || '0',
            harga_l1_s2: document.getElementById('add-obat-l1s2').value || '0'
        };

        const { error } = await supabaseClient.from('master_obat').insert([newObat]);
        if (error) throw error;
        
        alert('Obat berhasil didaftarkan!');
        closeModal('modal-add-obat');
        document.getElementById('form-add-obat').reset();
        loadMasterObat();
    } catch (e) {
        console.error(e);
        alert(`Gagal menambah obat: ${e.message}`);
    }
}

async function deleteObat(encodedId, e) {
    if (e) e.preventDefault();
    const id = decodeURIComponent(encodedId);
    if (!id) return;
    if (!confirm(`Apakah Anda yakin ingin menghapus obat ID "${id}"?`)) return;
    try {
        if (!supabaseClient) return;
        const { error } = await supabaseClient.from('master_obat').delete().eq('id_obat', id);
        if (error) throw error;
        alert('Obat berhasil dihapus.');
        loadMasterObat();
    } catch (err) {
        console.error(err);
        alert('Gagal menghapus obat.');
    }
}

async function editObat(encodedId, e) {
    if (e) e.preventDefault();
    const id = decodeURIComponent(encodedId);
    if (!id) return;
    try {
        if (!supabaseClient) return;
        const { data, error } = await supabaseClient.from('master_obat').select('*').eq('id_obat', id).limit(1);
        if (error) throw error;
        if (!data || data.length === 0) {
            alert('Data obat tidak ditemukan.');
            return;
        }

        const item = data[0];

        document.getElementById('edit-obat-id').value = item.id_obat;
        document.getElementById('edit-obat-nama').value = item.nama_obat || '';
        document.getElementById('edit-obat-kategori').value = item.kategori || '';
        document.getElementById('edit-obat-rak').value = item.rak || '';
        document.getElementById('edit-obat-stokmin').value = item.stok_minimal || '5';
        document.getElementById('edit-obat-stok').value = item.stok_unit_kecil || '0';
        document.getElementById('edit-obat-sat1').value = item.satuan_1 || 'Pcs';
        document.getElementById('edit-obat-sat2').value = item.satuan_2 || '';
        document.getElementById('edit-obat-sat3').value = item.satuan_3 || '';
        document.getElementById('edit-obat-beli1').value = item.harga_beli_sat_1 || '0';
        document.getElementById('edit-obat-l1s1').value = item.harga_l1_s1 || '0';
        document.getElementById('edit-obat-l1s2').value = item.harga_l1_s2 || '0';
        document.getElementById('edit-obat-l1s3').value = item.harga_l1_s3 || '0';

        document.getElementById('modal-edit-obat').classList.remove('hidden');
    } catch (err) {
        console.error(err);
        alert('Gagal mengambil data detail obat.');
    }
}

async function submitEditObat(e) {
    e.preventDefault();
    const id = document.getElementById('edit-obat-id').value;
    
    const updatedObat = {
        nama_obat: document.getElementById('edit-obat-nama').value,
        kategori: document.getElementById('edit-obat-kategori').value || 'OBAT',
        rak: document.getElementById('edit-obat-rak').value || '',
        stok_minimal: document.getElementById('edit-obat-stokmin').value || '5',
        stok_unit_kecil: document.getElementById('edit-obat-stok').value || '0',
        satuan_1: document.getElementById('edit-obat-sat1').value,
        label_satuan_kecil: document.getElementById('edit-obat-sat1').value,
        satuan_2: document.getElementById('edit-obat-sat2').value || '',
        satuan_3: document.getElementById('edit-obat-sat3').value || '',
        harga_beli_sat_1: document.getElementById('edit-obat-beli1').value || '0',
        harga_l1_s1: document.getElementById('edit-obat-l1s1').value || '0',
        harga_l1_s2: document.getElementById('edit-obat-l1s2').value || '0',
        harga_l1_s3: document.getElementById('edit-obat-l1s3').value || '0'
    };

    try {
        if (!supabaseClient) return;
        const { error } = await supabaseClient.from('master_obat').update(updatedObat).eq('id_obat', id);
        if (error) throw error;
        
        alert('Data obat berhasil diperbarui!');
        closeModal('modal-edit-obat');
        loadMasterObat();
    } catch (err) {
        console.error(err);
        alert(`Gagal memperbarui data obat: ${err.message}`);
    }
}

async function previewObat(encodedId, e) {
    if (e) e.preventDefault();
    const id = decodeURIComponent(encodedId);
    if (!id) return;

    const modal = document.getElementById('modal-preview-obat');
    if (!modal) return;

    // Show modal immediately with instant feedback state
    document.getElementById('preview-obat-title').textContent = 'Memuat Detail Obat...';
    document.getElementById('preview-obat-id').textContent = id;
    document.getElementById('preview-obat-kategori').textContent = '...';
    document.getElementById('preview-obat-rak').textContent = '...';
    document.getElementById('preview-obat-supplier').textContent = '...';
    document.getElementById('preview-obat-stok').textContent = '...';
    document.getElementById('preview-obat-stok-gudang').textContent = '...';
    document.getElementById('preview-obat-stok-min').textContent = '...';
    document.getElementById('preview-obat-jenis').textContent = '...';
    document.getElementById('preview-obat-prices-body').innerHTML = '<tr><td colspan="5" style="text-align:center; padding:15px; color:var(--text-muted);">Memuat rincian harga...</td></tr>';
    
    modal.classList.remove('hidden');

    try {
        if (!supabaseClient) return;
        const { data, error } = await supabaseClient.from('master_obat').select('*').eq('id_obat', id).limit(1);
        if (error) throw error;
        if (!data || data.length === 0) {
            alert('Data obat tidak ditemukan.');
            closeModal('modal-preview-obat');
            return;
        }

        const item = data[0];

        document.getElementById('preview-obat-title').textContent = item.nama_obat || 'Detail Obat';
        document.getElementById('preview-obat-id').textContent = item.id_obat || '-';
        document.getElementById('preview-obat-kategori').textContent = item.kategori || '-';
        document.getElementById('preview-obat-rak').textContent = item.rak || '-';
        document.getElementById('preview-obat-supplier').textContent = item.supplier || '-';
        document.getElementById('preview-obat-stok').textContent = `${item.stok_unit_kecil || 0} ${item.label_satuan_kecil || 'Pcs'}`;
        document.getElementById('preview-obat-stok-gudang').textContent = `${item.stok_gudang || 0} ${item.label_satuan_kecil || 'Pcs'}`;
        document.getElementById('preview-obat-stok-min').textContent = `${item.stok_minimal || 0} ${item.label_satuan_kecil || 'Pcs'}`;
        document.getElementById('preview-obat-jenis').textContent = item.jenis_item || '-';

        const tbody = document.getElementById('preview-obat-prices-body');
        tbody.innerHTML = '';

        // Row for Satuan 1
        const tr1 = document.createElement('tr');
        tr1.innerHTML = `
            <td><strong>${item.satuan_1 || 'Pcs'}</strong> (Satuan 1)</td>
            <td>Rp ${formatMoney(item.harga_l1_s1)}</td>
            <td>Rp ${formatMoney(item.harga_l2_s1)}</td>
            <td>Rp ${formatMoney(item.harga_l3_s1)}</td>
            <td>Rp ${formatMoney(item.harga_beli_sat_1)}</td>
        `;
        tbody.appendChild(tr1);

        // Row for Satuan 2
        if (item.satuan_2) {
            const tr2 = document.createElement('tr');
            tr2.innerHTML = `
                <td><strong>${item.satuan_2}</strong> (Isi: ${item.isi_2_ke_1 || 0})</td>
                <td>Rp ${formatMoney(item.harga_l1_s2)}</td>
                <td>Rp ${formatMoney(item.harga_l2_s2)}</td>
                <td>Rp ${formatMoney(item.harga_l3_s2)}</td>
                <td>Rp ${formatMoney(item.harga_beli_sat_2)}</td>
            `;
            tbody.appendChild(tr2);
        }

        // Row for Satuan 3
        if (item.satuan_3) {
            const tr3 = document.createElement('tr');
            tr3.innerHTML = `
                <td><strong>${item.satuan_3}</strong> (Isi: ${item.isi_3_ke_2 || 0})</td>
                <td>Rp ${formatMoney(item.harga_l1_s3)}</td>
                <td>Rp ${formatMoney(item.harga_l2_s3)}</td>
                <td>Rp ${formatMoney(item.harga_l3_s3)}</td>
                <td>Rp ${formatMoney(item.harga_beli_sat_3)}</td>
            `;
            tbody.appendChild(tr3);
        }
    } catch (err) {
        console.error(err);
        alert('Gagal menampilkan detail preview obat.');
        closeModal('modal-preview-obat');
    }
}

// --------------------------------------------------------------------------
// 5. RIWAYAT PENJUALAN (PAGINATED)
// --------------------------------------------------------------------------
let currentPenjualanPage = 1;
let currentPenjualanPageSize = 10;

async function loadRiwayatPenjualan(page = currentPenjualanPage, pageSize = currentPenjualanPageSize) {
    currentPenjualanPage = page;
    currentPenjualanPageSize = pageSize;
    try {
        if (!supabaseClient) return;
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const { data, count, error } = await supabaseClient
            .from('transaksi_jual')
            .select('*', { count: 'exact' })
            .order('tanggal', { ascending: false })
            .range(from, to);

        const tbody = document.getElementById('penjualan-table-body');
        const mobileList = document.getElementById('penjualan-mobile-list');
        tbody.innerHTML = '';
        if (mobileList) mobileList.innerHTML = '';
        
        if (!error && data) {
            data.forEach(tx => {
                const encId = encodeURIComponent(tx.id_jual || '');
                const metodeBadge = tx.metode_bayar === 'CASH' 
                    ? 'background:#ecfdf5;color:#10b981;' 
                    : tx.metode_bayar === 'QRIS' 
                        ? 'background:#eff6ff;color:#3b82f6;' 
                        : 'background:#fef3c7;color:#f59e0b;';

                // Desktop row
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${tx.id_jual}</strong></td>
                    <td>${tx.tanggal}</td>
                    <td>${tx.nama_pelanggan || 'UMUM'}</td>
                    <td>${tx.user}</td>
                    <td><span class="badge" style="${metodeBadge}">${tx.metode_bayar}</span></td>
                    <td><strong>Rp ${formatMoney(tx.total_bayar)}</strong></td>
                    <td>
                        <div style="display:flex; gap:6px;">
                            <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 11px;" onclick="showReceiptDetail('${encId}')">Struk</button>
                            <button class="btn btn-danger" style="padding: 4px 8px; font-size: 11px;" onclick="openReturPenjualanModal('${encId}')">↩️ Retur</button>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);

                // Mobile card
                if (mobileList) {
                    const card = document.createElement('div');
                    card.className = 'price-card-mobile';
                    card.innerHTML = `
                        <div class="price-card-header" onclick="showReceiptDetail('${tx.id_jual}')" style="cursor:pointer;">
                            <div style="flex:1; min-width:0;">
                                <div class="price-card-title" style="font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${tx.id_jual}</div>
                                <div class="price-card-sub">${tx.tanggal}</div>
                            </div>
                            <strong style="color:var(--primary-color); font-size:14px; white-space:nowrap;">Rp ${formatMoney(tx.total_bayar)}</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px;">
                            <div style="font-size:11px; color:var(--text-muted);">
                                👤 ${tx.nama_pelanggan || 'UMUM'} • 🧑‍💼 ${tx.user || '-'}
                            </div>
                            <div style="display:flex; gap:6px; align-items:center;">
                                <span class="badge" style="${metodeBadge} font-size:10px;">${tx.metode_bayar}</span>
                                <button class="btn btn-danger" style="padding:3px 8px; font-size:10.5px;" onclick="openReturPenjualanModal('${encId}')">↩️ Retur</button>
                            </div>
                        </div>
                    `;
                    mobileList.appendChild(card);
                }
            });

            const totalPages = Math.ceil((count !== null ? count : data.length) / pageSize);
            renderPaginationControls('penjualan-pagination', page, totalPages, pageSize, 'loadRiwayatPenjualan');
        }
    } catch (e) {
        console.error('Error loading penjualan history:', e);
    }
}

function renderThermalReceiptHTML(data) {
    const appName = localStorage.getItem('app_name') || 'Apotek HF';
    const appAddress = localStorage.getItem('app_address') || 'Makassar';
    const appLogo = localStorage.getItem('app_logo') || 'logo_hf.png';

    const {
        id_jual,
        tanggal,
        kasir,
        pelanggan,
        metode_bayar,
        items,
        total_bayar
    } = data;

    const itemsHTML = items.map(item => `
        <div style="margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 13px; color: #000;">
                <span style="flex: 1; min-width: 0; padding-right: 8px; word-break: break-word;">${item.nama_obat}</span>
                <span style="white-space: nowrap;">Rp${formatMoney(item.subtotal)}</span>
            </div>
            <div style="font-size: 11.5px; color: #333; margin-top: 2px;">
                ${item.jumlah_beli} x Rp${formatMoney(item.harga_satuan)} ${item.satuan_dipilih ? '(' + item.satuan_dipilih + ')' : ''}
            </div>
        </div>
    `).join('');

    return `
    <div class="thermal-receipt-container" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; color: #000; background: #fff; padding: 15px 10px; border-radius: 4px; max-width: 320px; margin: 0 auto; box-sizing: border-box;">
        <!-- Logo Image (Black & White Filter) -->
        <div style="text-align: center; margin-bottom: 8px;">
            <img src="${appLogo}" alt="Logo" style="max-height: 60px; max-width: 120px; width: auto; display: block; margin: 0 auto; filter: grayscale(100%) contrast(180%);">
        </div>

        <!-- Store Header -->
        <div style="text-align: center; margin-bottom: 12px;">
            <div style="font-weight: 800; font-size: 16px; letter-spacing: 0.5px; margin-bottom: 2px;">${appName}</div>
            <div style="font-size: 12px; color: #333; margin-bottom: 4px;">${appAddress}</div>
            <div style="font-size: 11px; letter-spacing: 1px; color: #000; font-weight: 600;">***Utama***</div>
        </div>

        <!-- Meta Section -->
        <div style="font-size: 12px; line-height: 1.6; margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between;">
                <span>Pesanan:</span>
                <strong style="word-break: break-all;">${id_jual}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span>Kasir:</span>
                <span>${kasir}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span>Pelanggan:</span>
                <span>${pelanggan}</span>
            </div>
        </div>

        <!-- Dotted Separator -->
        <div style="border-bottom: 1.5px dotted #000; margin: 10px 0;"></div>

        <div style="font-weight: 700; font-size: 11px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
            Metode: ${metode_bayar}
        </div>

        <!-- Dotted Separator -->
        <div style="border-bottom: 1.5px dotted #000; margin: 10px 0;"></div>

        <!-- Items -->
        <div>
            ${itemsHTML}
        </div>

        <!-- Dotted Separator -->
        <div style="border-bottom: 1.5px dotted #000; margin: 10px 0;"></div>

        <!-- Summary Totals -->
        <div style="font-size: 12px; line-height: 1.7;">
            <div style="display: flex; justify-content: space-between; font-weight: 600;">
                <span>Subtotal</span>
                <span>Rp${formatMoney(total_bayar)}</span>
            </div>
            
            <div style="border-bottom: 1.5px dotted #000; margin: 8px 0;"></div>

            <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 16px; margin-top: 4px;">
                <span>Total</span>
                <span>Rp${formatMoney(total_bayar)}</span>
            </div>

            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 6px; color: #333;">
                <span>Tunai / Bayar (${metode_bayar})</span>
                <span>Rp${formatMoney(data.uang_bayar !== undefined ? data.uang_bayar : total_bayar)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 12px; color: #333;">
                <span>Kembalian</span>
                <span style="font-weight: 800; color: #000;">Rp${formatMoney(data.kembalian !== undefined ? data.kembalian : 0)}</span>
            </div>
        </div>

        <!-- Dotted Separator -->
        <div style="border-bottom: 1.5px dotted #000; margin: 12px 0 10px 0;"></div>

        <!-- Footer -->
        <div style="text-align: center; font-size: 12px; margin-bottom: 12px;">
            Terima kasih atas pembelian Anda!
        </div>

        <div style="display: flex; justify-content: space-between; font-size: 10px; color: #444;">
            <span>${tanggal}</span>
            <span>#${id_jual.split('-').pop() || id_jual}</span>
        </div>
    </div>
    `;
}

async function showReceiptDetail(id_jual) {
    try {
        if (!supabaseClient) return;
        const { data: tx } = await supabaseClient.from('transaksi_jual').select('*').eq('id_jual', id_jual).single();
        const { data: details } = await supabaseClient.from('detail_jual').select('*').eq('id_jual', id_jual);
        
        if (tx && details) {
            const html = renderThermalReceiptHTML({
                id_jual: tx.id_jual,
                tanggal: tx.tanggal,
                kasir: tx.user || 'cashier',
                pelanggan: tx.nama_pelanggan || 'UMUM',
                metode_bayar: tx.metode_bayar || 'CASH',
                items: details.map(d => ({
                    nama_obat: d.nama_obat,
                    jumlah_beli: d.jumlah_beli,
                    satuan_dipilih: d.satuan_dipilih,
                    harga_satuan: d.harga_satuan,
                    subtotal: d.subtotal
                })),
                total_bayar: tx.total_bayar
            });

            const printArea = document.getElementById('receipt-print-area');
            printArea.innerHTML = html;
            document.getElementById('modal-receipt').classList.remove('hidden');
        }
    } catch (e) {
        console.error(e);
        alert('Gagal memuat struk detail.');
    }
}

function showReceipt(id_jual, total, tanggal, uangBayar, kembalian) {
    const customerName = activeCustomer ? activeCustomer.nama : 'UMUM';
    const payMethod = document.getElementById('pay-modal-method')?.value || document.getElementById('pos-pay-method')?.value || 'CASH';

    const items = cart.map(item => ({
        nama_obat: item.nama_obat,
        jumlah_beli: item.jumlah,
        satuan_dipilih: item.satuan_nama,
        harga_satuan: item.harga,
        subtotal: item.jumlah * item.harga
    }));

    const html = renderThermalReceiptHTML({
        id_jual: id_jual,
        tanggal: tanggal,
        kasir: currentUser ? (currentUser.nama_staf || currentUser.user) : 'cashier',
        pelanggan: customerName,
        metode_bayar: payMethod,
        items: items,
        total_bayar: total,
        uang_bayar: uangBayar,
        kembalian: kembalian
    });

    const printArea = document.getElementById('receipt-print-area');
    printArea.innerHTML = html;
    document.getElementById('modal-receipt').classList.remove('hidden');
}

function printReceipt() {
    window.print();
}

function closeReceiptModal() {
    document.getElementById('modal-receipt').classList.add('hidden');
}

// --------------------------------------------------------------------------
// RETUR PENJUALAN LOGIC (RESTORE STOCK + LOG RETUR)
// --------------------------------------------------------------------------
let currentReturTx = null;
let currentReturItems = [];

async function openReturPenjualanModal(encId) {
    const id_jual = decodeURIComponent(encId);
    if (!supabaseClient || !id_jual) return;

    try {
        const { data: tx } = await supabaseClient.from('transaksi_jual').select('*').eq('id_jual', id_jual).single();
        const { data: details } = await supabaseClient.from('detail_jual').select('*').eq('id_jual', id_jual);

        if (!tx || !details || details.length === 0) {
            alert('Data transaksi tidak ditemukan.');
            return;
        }

        currentReturTx = tx;
        currentReturItems = details;

        document.getElementById('retur-info-id').textContent = tx.id_jual;
        document.getElementById('retur-info-tanggal').textContent = tx.tanggal;
        document.getElementById('retur-info-pelanggan').textContent = tx.nama_pelanggan || 'UMUM';
        document.getElementById('retur-alasan').value = '';

        const tbody = document.getElementById('retur-items-body');
        tbody.innerHTML = '';

        details.forEach((d, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${d.nama_obat}</strong> <div style="font-size:11px; color:var(--text-muted);">${d.satuan_dipilih || 'Pcs'}</div></td>
                <td>${d.jumlah_beli}</td>
                <td>
                    <input type="number" id="retur-qty-${idx}" class="form-control" value="0" min="0" max="${d.jumlah_beli}" style="width:65px; text-align:center; padding:2px;" oninput="calculateReturTotal()">
                </td>
                <td>Rp ${formatMoney(d.harga_satuan)}</td>
            `;
            tbody.appendChild(tr);
        });

        calculateReturTotal();
        document.getElementById('modal-retur-penjualan').classList.remove('hidden');

    } catch (e) {
        console.error('Error opening retur modal:', e);
        alert('Gagal memuat data retur.');
    }
}

function calculateReturTotal() {
    let grandTotal = 0;
    if (currentReturItems) {
        currentReturItems.forEach((d, idx) => {
            const input = document.getElementById(`retur-qty-${idx}`);
            const qtyRetur = parseFloat(input?.value) || 0;
            const subtotal = qtyRetur * parseFloat(d.harga_satuan || 0);
            grandTotal += subtotal;
        });
    }
    document.getElementById('retur-grand-total').textContent = `Rp ${formatMoney(grandTotal)}`;
}

async function submitReturPenjualan() {
    if (!currentReturTx || !currentReturItems) return;

    const alasan = document.getElementById('retur-alasan').value.trim();
    if (!alasan) {
        alert('Harap isi alasan / catatan retur!');
        return;
    }

    const itemsToRetur = [];
    currentReturItems.forEach((d, idx) => {
        const input = document.getElementById(`retur-qty-${idx}`);
        const qtyRetur = parseFloat(input?.value) || 0;
        if (qtyRetur > 0) {
            itemsToRetur.push({
                detail: d,
                qtyRetur: qtyRetur
            });
        }
    });

    if (itemsToRetur.length === 0) {
        alert('Harap masukkan minimal 1 barang dengan Qty Retur > 0!');
        return;
    }

    try {
        if (!supabaseClient) return;
        const dateStr = new Date().toISOString().split('T')[0];

        for (const item of itemsToRetur) {
            const d = item.detail;
            const qtyRetur = item.qtyRetur;

            // 1. Catat ke tabel retur_jual
            const id_retur = 'R' + Math.random().toString(36).substring(2, 8).toUpperCase();
            const { error: returErr } = await supabaseClient.from('retur_jual').insert([{
                id_retur,
                id_jual: currentReturTx.id_jual,
                id_obat: d.id_obat,
                nama_obat: d.nama_obat,
                jumlah_retur: String(qtyRetur),
                satuan_retur: d.satuan_dipilih || 'Pcs',
                alasan_retur: alasan,
                tanggal_retur: dateStr,
                user: currentUser?.nama_staf || 'cashier'
            }]);

            if (returErr) throw returErr;

            // 2. KEMBALIKAN STOK: Ambil stok saat ini dari master_obat dan tambahkan kembali
            const { data: med } = await supabaseClient.from('master_obat').select('stok_unit_kecil').eq('id_obat', d.id_obat).single();
            if (med) {
                const currentStock = parseFloat(med.stok_unit_kecil || 0);
                // Hitung konversi jika ada, default 1
                const konversi = parseFloat(d.konversi_satuan || 1);
                const addedStock = qtyRetur * konversi;
                const newStock = currentStock + addedStock;

                const { error: updateErr } = await supabaseClient.from('master_obat').update({
                    stok_unit_kecil: String(newStock)
                }).eq('id_obat', d.id_obat);

                if (updateErr) console.error('Error updating stock on retur:', updateErr);
            }
        }

        // 3. Catat Mutasi Kas Keluar untuk Pengembalian Uang Retur
        let totalPengembalian = 0;
        itemsToRetur.forEach(item => {
            totalPengembalian += item.qtyRetur * parseFloat(item.detail.harga_satuan || 0);
        });

        await supabaseClient.from('kas').insert([{
            id_kas: 'K' + Math.random().toString(36).substring(2, 8).toUpperCase(),
            tanggal: dateStr,
            jenis_kas: 'KELUAR',
            kategori: 'Pengembalian Retur Penjualan',
            jumlah: String(totalPengembalian),
            keterangan: `Retur Nota ${currentReturTx.id_jual}: ${alasan}`,
            user: currentUser?.nama_staf || 'cashier'
        }]);

        alert('✅ Retur barang berhasil diproses! Stok obat telah ditambahkan kembali.');
        closeModal('modal-retur-penjualan');
        loadRiwayatPenjualan();

    } catch (e) {
        console.error('Error processing retur:', e);
        alert('Gagal memproses retur barang.');
    }
}

// --------------------------------------------------------------------------
// 6. PEMBELIAN STOK (RESTOCKING)
// --------------------------------------------------------------------------
function initPembelian() {
    purchaseItems = [];
    renderPurchaseGrid();
    populateObatDropdown('purchase-item-obat');
    
    // Load suppliers dropdown
    try {
        if (!supabaseClient) return;
        supabaseClient.from('supplier').select('*').order('supplier').then(({ data }) => {
            const select = document.getElementById('purchase-supplier-select');
            select.innerHTML = '';
            if (data) {
                data.forEach(s => {
                    const opt = document.createElement('option');
                    opt.value = s.id_supplier;
                    opt.textContent = s.supplier;
                    select.appendChild(opt);
                });
            }
        });
    } catch (e) {
        console.error(e);
    }
}

function updatePurchaseSubtotalPreview() {
    const qty = parseFloat(document.getElementById('purchase-item-qty').value) || 0;
    const price = parseFloat(document.getElementById('purchase-item-price').value) || 0;
    const subtotal = qty * price;
    const previewEl = document.getElementById('purchase-item-preview-badge');
    if (previewEl) {
        previewEl.textContent = `Subtotal: Rp ${formatMoney(subtotal)}`;
    }
}

function addPurchaseItemToGrid() {
    const obatSelect = document.getElementById('purchase-item-obat');
    if (!obatSelect.value) {
        alert('Pilih obat terlebih dahulu!');
        return;
    }
    
    const o = JSON.parse(obatSelect.value);
    const sat = document.getElementById('purchase-item-satuan').value;
    const konv = parseFloat(document.getElementById('purchase-item-konversi').value) || 1;
    const qty = parseFloat(document.getElementById('purchase-item-qty').value) || 0;
    const price = parseFloat(document.getElementById('purchase-item-price').value) || 0;
    
    if (qty <= 0) {
        alert('Masukkan jumlah Qty masuk yang valid!');
        return;
    }

    purchaseItems.push({
        id_obat: o.id_obat,
        nama_obat: o.nama_obat,
        satuan: sat,
        konversi: konv,
        jumlah: qty,
        harga_beli: price,
        total: qty * price
    });
    
    // Reset item inputs
    document.getElementById('purchase-item-qty').value = 1;
    document.getElementById('purchase-item-price').value = 0;
    updatePurchaseSubtotalPreview();
    
    renderPurchaseGrid();
}

function renderPurchaseGrid() {
    const tbody = document.getElementById('purchase-items-body');
    const mobileContainer = document.getElementById('purchase-items-mobile');
    tbody.innerHTML = '';
    if (mobileContainer) mobileContainer.innerHTML = '';
    let grandTotal = 0;

    if (purchaseItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding: 20px;">Belum ada item barang dalam faktur ini.</td></tr>';
        if (mobileContainer) {
            mobileContainer.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding: 20px; font-size:13px;">Belum ada item barang dalam faktur ini.</div>';
        }
    } else {
        purchaseItems.forEach((item, idx) => {
            grandTotal += item.total;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${item.nama_obat}</strong></td>
                <td><span class="badge badge-info">${item.satuan}</span></td>
                <td>${item.jumlah}</td>
                <td>Rp ${formatMoney(item.harga_beli)}</td>
                <td><strong>Rp ${formatMoney(item.total)}</strong></td>
                <td><button type="button" class="btn btn-danger" style="padding:4px 8px; font-size:11px;" onclick="removePurchaseItem(${idx})">Hapus</button></td>
            `;
            tbody.appendChild(tr);

            if (mobileContainer) {
                const card = document.createElement('div');
                card.className = 'price-card-mobile';
                card.innerHTML = `
                    <div class="price-card-header">
                        <div style="flex:1; min-width:0;">
                            <div class="price-card-title" style="font-size:13px;">${item.nama_obat}</div>
                            <div class="price-card-sub">${item.jumlah} x Rp ${formatMoney(item.harga_beli)} (${item.satuan})</div>
                        </div>
                        <strong style="color:var(--primary-color); font-size:14px; white-space:nowrap;">Rp ${formatMoney(item.total)}</strong>
                    </div>
                    <div style="display:flex; justify-content:flex-end; margin-top:6px;">
                        <button type="button" class="btn btn-danger" style="padding:4px 10px; font-size:11px;" onclick="removePurchaseItem(${idx})">🗑️ Hapus</button>
                    </div>
                `;
                mobileContainer.appendChild(card);
            }
        });
    }

    const countBadge = document.getElementById('purchase-item-count-badge');
    if (countBadge) countBadge.textContent = `${purchaseItems.length} Item`;

    const grandTotalEl = document.getElementById('purchase-grand-total');
    if (grandTotalEl) grandTotalEl.textContent = `Rp ${formatMoney(grandTotal)}`;
}

function removePurchaseItem(idx) {
    purchaseItems.splice(idx, 1);
    renderPurchaseGrid();
}

async function submitPurchaseInvoice() {
    const nomor_faktur = document.getElementById('purchase-faktur-no').value.trim();
    const supplier = document.getElementById('purchase-supplier-select').value;
    const metode_bayar = document.getElementById('purchase-pay-method').value;
    
    if (!nomor_faktur || purchaseItems.length === 0) {
        alert('Isi nomor faktur dan masukkan minimal 1 barang!');
        return;
    }
    
    try {
        if (!supabaseClient) return;
        const id_faktur = Math.random().toString(36).substring(2, 10);
        const dateStr = new Date().toISOString().split('T')[0];

        let grandTotalFaktur = 0;
        purchaseItems.forEach(i => { grandTotalFaktur += i.total; });

        // 1. Insert into faktur_beli
        const { error: fkErr } = await supabaseClient.from('faktur_beli').insert([{
            id_faktur: id_faktur,
            nomor_faktur: nomor_faktur,
            tanggal_masuk: dateStr,
            supplier: supplier,
            total_harga: String(grandTotalFaktur),
            jenis_transaksi: 'PEMBELIAN',
            metode_bayar: metode_bayar,
            user: currentUser?.nama_staf || 'cashier'
        }]);

        if (fkErr) throw fkErr;

        // 2. Insert detail logs & Update Stocks
        for (const item of purchaseItems) {
            const id_beli = 'B' + Math.random().toString(36).substring(2, 8).toUpperCase();
            const total_harga = item.harga_beli * item.jumlah;
            
            // Fetch current stock to add
            const { data: currentMed } = await supabaseClient.from('master_obat').select('stok_unit_kecil').eq('id_obat', item.id_obat).single();
            const currentStock = currentMed ? parseFloat(currentMed.stok_unit_kecil || 0) : 0;
            const newStock = currentStock + (item.jumlah * item.konversi);

            // Log Beli
            const { error: logErr } = await supabaseClient.from('log_beli').insert([{
                id_beli: id_beli,
                tanggal_masuk: dateStr,
                id_obat: item.id_obat,
                satuan_masuk: item.satuan,
                harga_beli_item: String(item.harga_beli),
                jumlah_masuk: String(item.jumlah),
                konversi_masuk: String(item.konversi),
                id_faktur: id_faktur,
                total_harga: String(total_harga),
                jenis_transaksi: 'PEMBELIAN',
                user: currentUser?.nama_staf || 'cashier'
            }]);

            if (logErr) throw logErr;

            // Update master_obat stock
            await supabaseClient.from('master_obat').update({ stok_unit_kecil: String(newStock) }).eq('id_obat', item.id_obat);
        }

        alert('Faktur Pembelian Stok Berhasil Disimpan!');
        initPembelian();
    } catch (e) {
        console.error(e);
        alert(`Gagal menyimpan faktur: ${e.message}`);
    }
}

// --------------------------------------------------------------------------
// 7. STOK OPNAME
// --------------------------------------------------------------------------
async function initStokOpname() {
    populateObatDropdown('opname-obat-select');
    document.getElementById('opname-obat-select').onchange = (e) => {
        if (!e.target.value) return;
        const o = JSON.parse(e.target.value);
        document.getElementById('opname-current-stock').value = `${o.stok_unit_kecil || 0} ${o.label_satuan_kecil || 'Pcs'}`;
    };
    document.getElementById('opname-physical-stock').value = '';
    document.getElementById('opname-reason').value = '';
}

async function submitStokOpname() {
    const select = document.getElementById('opname-obat-select');
    const physical = document.getElementById('opname-physical-stock').value;
    const reason = document.getElementById('opname-reason').value.trim();
    
    if (!select.value || !physical) {
        alert('Pilih obat dan tentukan jumlah stok fisik!');
        return;
    }
    
    const o = JSON.parse(select.value);
    const physicalStock = parseFloat(physical);
    const currentStock = parseFloat(o.stok_unit_kecil || 0);
    const difference = physicalStock - currentStock;
    
    try {
        if (!supabaseClient) return;
        
        // 1. Update master_obat
        const { error: opnErr } = await supabaseClient.from('master_obat').update({ stok_unit_kecil: String(physicalStock) }).eq('id_obat', o.id_obat);
        if (opnErr) throw opnErr;

        // 2. Log in log_beli as STOK OPNAME
        const id_beli = 'SO' + Math.random().toString(36).substring(2, 8).toUpperCase();
        const dateStr = new Date().toISOString().split('T')[0];

        const { error: logErr } = await supabaseClient.from('log_beli').insert([{
            id_beli: id_beli,
            tanggal_masuk: dateStr,
            id_obat: o.id_obat,
            satuan_masuk: o.label_satuan_kecil || 'Pcs',
            harga_beli_item: '0',
            jumlah_masuk: String(difference),
            konversi_masuk: '1.0',
            total_harga: '0.0',
            jenis_transaksi: 'STOK OPNAME',
            alasan_retur: reason || 'Penyesuaian Stok Opname',
            user: currentUser?.nama_staf || 'cashier'
        }]);

        if (logErr) throw logErr;

        alert('Penyesuaian stok opname berhasil disimpan!');
        initStokOpname();
    } catch (e) {
        console.error(e);
        alert('Gagal memproses penyesuaian stok opname.');
    }
}

// --------------------------------------------------------------------------
// 8. REKAM KESEHATAN & PELAYANAN
// --------------------------------------------------------------------------
async function initCekKesehatan() {
    // Load patients
    try {
        if (!supabaseClient) return;
        const { data } = await supabaseClient.from('pasien').select('*').order('nama_pasien');
        const select = document.getElementById('checkup-pasien-select');
        select.innerHTML = '<option value="" disabled selected>Pilih Pasien...</option>';
        if (data) {
            data.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id_pasien;
                opt.textContent = `${p.nama_pasien} (${p.whatsapp})`;
                select.appendChild(opt);
            });
        }
    } catch (e) {
        console.error(e);
    }
    
    // Clear inputs
    document.getElementById('checkup-tensi').value = '';
    document.getElementById('checkup-gula').value = '';
    document.getElementById('checkup-asam-urat').value = '';
    document.getElementById('checkup-kolesterol').value = '';
    document.getElementById('checkup-obat').value = '';
    document.getElementById('checkup-keterangan').value = '';
    document.getElementById('checkup-history-list').innerHTML = '<div style="color:var(--text-muted); text-align:center;">Pilih pasien untuk melihat riwayat.</div>';
}

async function checkupChangePasien() {
    const select = document.getElementById('checkup-pasien-select');
    const id_pasien = select.value;
    const badge = document.getElementById('checkup-patient-name-badge');
    
    if (select.selectedIndex >= 0) {
        badge.textContent = select.options[select.selectedIndex].text.split('(')[0].trim();
    }

    if (!id_pasien) return;
    
    try {
        if (!supabaseClient) return;
        const { data, error } = await supabaseClient.from('rekam_kesehatan')
            .select('*')
            .eq('id_pasien', id_pasien)
            .order('tanggal', { ascending: false });
            
        const container = document.getElementById('checkup-history-list');
        container.innerHTML = '';
        
        if (data && data.length > 0) {
            data.forEach(r => {
                const div = document.createElement('div');
                div.className = 'price-card-mobile';
                div.innerHTML = `
                    <div class="price-card-header">
                        <div>
                            <div class="price-card-title" style="font-size:13px; color:var(--primary-color);">🩸 Tensi: ${r.tensi || '-'}</div>
                            <div class="price-card-sub">📅 ${r.tanggal || '-'} • Petugas: ${r.user || 'Staf'}</div>
                        </div>
                    </div>
                    <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:8px;">
                        <span class="price-pill">🍬 Gula: <strong>${r.gula_darah || '-'}</strong></span>
                        <span class="price-pill">🦴 Asam Urat: <strong>${r.asam_urat || '-'}</strong></span>
                        <span class="price-pill">🥑 Kolesterol: <strong>${r.kolesterol || '-'}</strong></span>
                    </div>
                    ${r.rekomendasi_obat ? `<div style="margin-top:8px; font-size:12px; background:var(--bg-main); padding:6px 10px; border-radius:6px;"><strong>💊 Obat:</strong> ${r.rekomendasi_obat}</div>` : ''}
                    ${r.keterangan ? `<div style="margin-top:4px; font-size:11.5px; color:var(--text-muted); font-style:italic;">📝 ${r.keterangan}</div>` : ''}
                `;
                container.appendChild(div);
            });
        } else {
            container.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:25px; font-size:13px;">Belum ada riwayat rekam kontrol untuk pasien ini.</div>';
        }
    } catch (e) {
        console.error(e);
    }
}

async function submitCheckup() {
    const id_pasien = document.getElementById('checkup-pasien-select').value;
    if (!id_pasien) {
        alert('Pilih pasien terlebih dahulu!');
        return;
    }
    
    const rekam = {
        id_rekam: Math.random().toString(36).substring(2, 10).toUpperCase(),
        id_pasien: id_pasien,
        tanggal: new Date().toLocaleDateString('id-ID'),
        tensi: document.getElementById('checkup-tensi').value,
        gula_darah: document.getElementById('checkup-gula').value,
        asam_urat: document.getElementById('checkup-asam-urat').value,
        kolesterol: document.getElementById('checkup-kolesterol').value,
        rekomendasi_obat: document.getElementById('checkup-obat').value,
        keterangan: document.getElementById('checkup-keterangan').value,
        user: currentUser?.nama_staf || 'cashier'
    };

    try {
        if (!supabaseClient) return;
        const { error } = await supabaseClient.from('rekam_kesehatan').insert([rekam]);
        if (error) throw error;
        alert('Rekam kontrol kesehatan berhasil disimpan!');
        document.getElementById('checkup-tensi').value = '';
        document.getElementById('checkup-gula').value = '';
        document.getElementById('checkup-asam-urat').value = '';
        document.getElementById('checkup-kolesterol').value = '';
        document.getElementById('checkup-obat').value = '';
        document.getElementById('checkup-keterangan').value = '';
        checkupChangePasien();
    } catch (e) {
        console.error(e);
        alert('Gagal menyimpan rekam medis.');
    }
}

function showAddPasienModal() {
    document.getElementById('modal-add-pasien').classList.remove('hidden');
}

async function submitAddPasien(e) {
    e.preventDefault();
    const nama = document.getElementById('add-pas-nama').value.trim();
    const alamat = document.getElementById('add-pas-alamat').value.trim();
    const whatsapp = document.getElementById('add-pas-telp').value.trim();
    
    try {
        if (!supabaseClient) return;
        const id_pasien = 'P' + Math.random().toString(36).substring(2, 8).toUpperCase();
        const { error } = await supabaseClient.from('pasien').insert([{
            id_pasien,
            nama_pasien: nama,
            alamat,
            whatsapp
        }]);
        
        if (error) throw error;
        alert('Pasien baru berhasil didaftarkan!');
        closeModal('modal-add-pasien');
        document.getElementById('form-add-pasien').reset();
        initCekKesehatan();
    } catch (e) {
        console.error(e);
        alert('Gagal mendaftarkan pasien.');
    }
}

// --------------------------------------------------------------------------
// 9. LAPORAN OPERASIONAL & KEUANGAN (PDF & EXPORT XLSX)
// --------------------------------------------------------------------------
let currentLaporanData = [];
let currentLaporanType = 'penjualan';

function loadLaporanView() {
    initLaporanView();
}

function initLaporanView() {
    const startInput = document.getElementById('laporan-date-start');
    const endInput = document.getElementById('laporan-date-end');
    
    if (startInput && !startInput.value) {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        startInput.value = firstDay.toISOString().split('T')[0];
    }
    if (endInput && !endInput.value) {
        const now = new Date();
        endInput.value = now.toISOString().split('T')[0];
    }
    
    loadLaporanData();
}

async function loadLaporanData() {
    try {
        if (!supabaseClient) return;
        const typeSelect = document.getElementById('laporan-type-select');
        currentLaporanType = typeSelect ? typeSelect.value : 'penjualan';

        const startDateVal = document.getElementById('laporan-date-start')?.value;
        const endDateVal = document.getElementById('laporan-date-end')?.value;

        let data = [];

        if (currentLaporanType === 'penjualan') {
            const { data: sales, error } = await supabaseClient
                .from('transaksi_jual')
                .select('*')
                .order('tanggal', { ascending: false });
            if (!error && sales) data = sales;
        } else if (currentLaporanType === 'pembelian') {
            const { data: purchases, error } = await supabaseClient
                .from('faktur_beli')
                .select('*')
                .order('tanggal_masuk', { ascending: false });
            if (!error && purchases) data = purchases;
        } else if (currentLaporanType === 'kas') {
            const { data: cash, error } = await supabaseClient
                .from('kas')
                .select('*')
                .order('tanggal', { ascending: false });
            if (!error && cash) data = cash;
        } else if (currentLaporanType === 'stok') {
            const { data: stock, error } = await supabaseClient
                .from('master_obat')
                .select('*')
                .order('nama_obat', { ascending: true });
            if (!error && stock) data = stock;
        } else if (currentLaporanType === 'shift') {
            const { data: shift, error } = await supabaseClient
                .from('laporan_harian')
                .select('*')
                .order('tanggal', { ascending: false });
            if (!error && shift) data = shift;
        }

        // Apply Date Range Filter if dates exist and dataset has date field
        if (startDateVal || endDateVal) {
            data = data.filter(item => {
                const rawDateStr = item.tanggal || item.tanggal_masuk || item.created_at || '';
                if (!rawDateStr) return true;
                let itemDateIso = '';
                if (rawDateStr.includes('/')) {
                    const parts = rawDateStr.split(' ')[0].split('/');
                    if (parts.length === 3) {
                        const year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
                        itemDateIso = `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                    }
                } else if (rawDateStr.includes('-')) {
                    itemDateIso = rawDateStr.split(' ')[0];
                }

                if (!itemDateIso) return true;
                if (startDateVal && itemDateIso < startDateVal) return false;
                if (endDateVal && itemDateIso > endDateVal) return false;
                return true;
            });
        }

        currentLaporanData = data;
        filterLaporanTable();
    } catch (e) {
        console.error('Error loading laporan data:', e);
    }
}

function filterLaporanTable() {
    const q = document.getElementById('laporan-search-input')?.value.toLowerCase().trim() || '';
    if (!q) {
        renderLaporanTable(currentLaporanData);
        return;
    }

    const filtered = currentLaporanData.filter(item => {
        return Object.values(item).some(val => 
            String(val || '').toLowerCase().includes(q)
        );
    });

    renderLaporanTable(filtered);
}

function renderLaporanTable(data) {
    const containerMetrics = document.getElementById('laporan-metrics-container');
    const thead = document.getElementById('laporan-table-head');
    const tbody = document.getElementById('laporan-table-body');
    const tfoot = document.getElementById('laporan-table-foot');
    const mobileList = document.getElementById('laporan-mobile-list');

    if (containerMetrics) containerMetrics.innerHTML = '';
    if (thead) thead.innerHTML = '';
    if (tbody) tbody.innerHTML = '';
    if (tfoot) tfoot.innerHTML = '';
    if (mobileList) mobileList.innerHTML = '';

    const formatRp = num => 'Rp ' + formatMoney(num || 0);

    if (currentLaporanType === 'penjualan') {
        const totalSales = data.reduce((sum, x) => sum + parseFloat(x.total_bayar || 0), 0);
        const countTx = data.length;
        const totalTempo = data.filter(x => String(x.metode_bayar || '').toUpperCase() === 'TEMPO').reduce((sum, x) => sum + parseFloat(x.total_bayar || 0), 0);
        const totalTunai = totalSales - totalTempo;

        if (containerMetrics) {
            containerMetrics.innerHTML = `
                <div class="view-card" style="text-align: center; margin-bottom: 0; padding: 14px 10px;">
                    <div style="font-size: 22px; margin-bottom: 2px;">🧾</div>
                    <h4 style="color: var(--text-muted); font-size: 11.5px; margin: 0 0 2px 0;">Total Transaksi</h4>
                    <h2 style="font-size: 18px; font-weight: 800; color: var(--primary-color); margin: 0;">${countTx} Nota</h2>
                </div>
                <div class="view-card" style="text-align: center; margin-bottom: 0; padding: 14px 10px;">
                    <div style="font-size: 22px; margin-bottom: 2px;">💵</div>
                    <h4 style="color: var(--text-muted); font-size: 11.5px; margin: 0 0 2px 0;">Total Penjualan</h4>
                    <h2 style="font-size: 18px; font-weight: 800; color: var(--primary-color); margin: 0;">${formatRp(totalSales)}</h2>
                </div>
                <div class="view-card" style="text-align: center; margin-bottom: 0; padding: 14px 10px;">
                    <div style="font-size: 22px; margin-bottom: 2px;">🟢</div>
                    <h4 style="color: var(--text-muted); font-size: 11.5px; margin: 0 0 2px 0;">Penjualan Tunai / QRIS</h4>
                    <h2 style="font-size: 18px; font-weight: 800; color: #16a34a; margin: 0;">${formatRp(totalTunai)}</h2>
                </div>
                <div class="view-card" style="text-align: center; margin-bottom: 0; padding: 14px 10px;">
                    <div style="font-size: 22px; margin-bottom: 2px;">⏳</div>
                    <h4 style="color: var(--text-muted); font-size: 11.5px; margin: 0 0 2px 0;">Penjualan Tempo / Piutang</h4>
                    <h2 style="font-size: 18px; font-weight: 800; color: #d97706; margin: 0;">${formatRp(totalTempo)}</h2>
                </div>
            `;
        }

        if (thead) {
            thead.innerHTML = `
                <tr style="background: var(--bg-main);">
                    <th style="padding: 14px 16px; width: 18%;">NO. NOTA</th>
                    <th style="padding: 14px 16px; width: 18%;">TANGGAL & WAKTU</th>
                    <th style="padding: 14px 16px; width: 18%;">PELANGGAN</th>
                    <th style="padding: 14px 16px; width: 14%;">STAF KASIR</th>
                    <th style="padding: 14px 16px; width: 14%;">METODE</th>
                    <th style="padding: 14px 16px; width: 18%; text-align: right;">TOTAL BAYAR</th>
                </tr>
            `;
        }

        if (tbody) {
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--text-muted);">Tidak ada data penjualan pada periode ini.</td></tr>';
            } else {
                data.forEach(x => {
                    const tr = document.createElement('tr');
                    tr.style.cssText = 'border-bottom: 1px solid var(--border-color);';
                    tr.innerHTML = `
                        <td style="padding: 12px 16px;"><code style="font-weight:700; color:var(--primary-color);">${x.id_jual || '-'}</code></td>
                        <td style="padding: 12px 16px;">${x.tanggal || '-'}</td>
                        <td style="padding: 12px 16px;"><strong>${x.pelanggan || 'Umum'}</strong></td>
                        <td style="padding: 12px 16px;">${x.staf || '-'}</td>
                        <td style="padding: 12px 16px;"><span class="badge" style="background:#ecfdf5; color:#047857; font-weight:700;">${x.metode_bayar || 'TUNAI'}</span></td>
                        <td style="padding: 12px 16px; text-align: right; font-weight: 800; color: var(--primary-color);">${formatRp(x.total_bayar)}</td>
                    `;
                    tbody.appendChild(tr);

                    if (mobileList) {
                        const mCard = document.createElement('div');
                        mCard.className = 'price-card-mobile';
                        mCard.innerHTML = `
                            <div class="price-card-header">
                                <div>
                                    <div class="price-card-title" style="font-size:13.5px; font-weight:700;">${x.id_jual || '-'}</div>
                                    <div class="price-card-sub">${x.tanggal || '-'} • Staf: ${x.staf || '-'}</div>
                                </div>
                                <strong style="color:var(--primary-color); font-size:14px;">${formatRp(x.total_bayar)}</strong>
                            </div>
                            <div style="font-size:11.5px; color:var(--text-muted); margin-top:6px; display:flex; justify-content:space-between;">
                                <span>Pelanggan: ${x.pelanggan || 'Umum'}</span>
                                <span class="badge" style="font-size:10px;">${x.metode_bayar || 'TUNAI'}</span>
                            </div>
                        `;
                        mobileList.appendChild(mCard);
                    }
                });
            }
        }

        if (tfoot) {
            tfoot.innerHTML = `
                <tr>
                    <td colspan="5" style="padding: 14px 16px; text-align: right;">TOTAL KESELURUHAN PENJUALAN:</td>
                    <td style="padding: 14px 16px; text-align: right; color: var(--primary-color); font-size: 15px;">${formatRp(totalSales)}</td>
                </tr>
            `;
        }
    } else if (currentLaporanType === 'pembelian') {
        const totalPurchases = data.reduce((sum, x) => sum + parseFloat(x.total_harga || x.total_bayar || 0), 0);
        const countFaktur = data.length;

        if (containerMetrics) {
            containerMetrics.innerHTML = `
                <div class="view-card" style="text-align: center; margin-bottom: 0; padding: 14px 10px;">
                    <div style="font-size: 22px; margin-bottom: 2px;">📦</div>
                    <h4 style="color: var(--text-muted); font-size: 11.5px; margin: 0 0 2px 0;">Total Faktur Beli</h4>
                    <h2 style="font-size: 18px; font-weight: 800; color: var(--primary-color); margin: 0;">${countFaktur} Faktur</h2>
                </div>
                <div class="view-card" style="text-align: center; margin-bottom: 0; padding: 14px 10px;">
                    <div style="font-size: 22px; margin-bottom: 2px;">💰</div>
                    <h4 style="color: var(--text-muted); font-size: 11.5px; margin: 0 0 2px 0;">Total Nilai Pembelian</h4>
                    <h2 style="font-size: 18px; font-weight: 800; color: #dc2626; margin: 0;">${formatRp(totalPurchases)}</h2>
                </div>
            `;
        }

        if (thead) {
            thead.innerHTML = `
                <tr style="background: var(--bg-main);">
                    <th style="padding: 14px 16px; width: 20%;">NO. FAKTUR</th>
                    <th style="padding: 14px 16px; width: 20%;">TANGGAL MASUK</th>
                    <th style="padding: 14px 16px; width: 25%;">SUPPLIER</th>
                    <th style="padding: 14px 16px; width: 15%;">STAF</th>
                    <th style="padding: 14px 16px; width: 20%; text-align: right;">TOTAL FAKTUR</th>
                </tr>
            `;
        }

        if (tbody) {
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--text-muted);">Tidak ada data pembelian pada periode ini.</td></tr>';
            } else {
                data.forEach(x => {
                    const tr = document.createElement('tr');
                    tr.style.cssText = 'border-bottom: 1px solid var(--border-color);';
                    tr.innerHTML = `
                        <td style="padding: 12px 16px;"><code style="font-weight:700;">${x.id_faktur || '-'}</code></td>
                        <td style="padding: 12px 16px;">${x.tanggal_masuk || x.tanggal || '-'}</td>
                        <td style="padding: 12px 16px;"><strong>${x.supplier || '-'}</strong></td>
                        <td style="padding: 12px 16px;">${x.staf || '-'}</td>
                        <td style="padding: 12px 16px; text-align: right; font-weight: 800; color: #dc2626;">${formatRp(x.total_harga || x.total_bayar)}</td>
                    `;
                    tbody.appendChild(tr);

                    if (mobileList) {
                        const mCard = document.createElement('div');
                        mCard.className = 'price-card-mobile';
                        mCard.innerHTML = `
                            <div class="price-card-header">
                                <div>
                                    <div class="price-card-title" style="font-size:13.5px; font-weight:700;">${x.id_faktur || '-'}</div>
                                    <div class="price-card-sub">${x.tanggal_masuk || '-'} • ${x.supplier || '-'}</div>
                                </div>
                                <strong style="color:#dc2626; font-size:14px;">${formatRp(x.total_harga || x.total_bayar)}</strong>
                            </div>
                        `;
                        mobileList.appendChild(mCard);
                    }
                });
            }
        }

        if (tfoot) {
            tfoot.innerHTML = `
                <tr>
                    <td colspan="4" style="padding: 14px 16px; text-align: right;">TOTAL KESELURUHAN PEMBELIAN:</td>
                    <td style="padding: 14px 16px; text-align: right; color: #dc2626; font-size: 15px;">${formatRp(totalPurchases)}</td>
                </tr>
            `;
        }
    } else if (currentLaporanType === 'kas') {
        const totalMasuk = data.filter(x => String(x.tipe || '').toUpperCase() === 'MASUK').reduce((sum, x) => sum + parseFloat(x.jumlah || 0), 0);
        const totalKeluar = data.filter(x => String(x.tipe || '').toUpperCase() === 'KELUAR').reduce((sum, x) => sum + parseFloat(x.jumlah || 0), 0);
        const saldoBersih = totalMasuk - totalKeluar;

        if (containerMetrics) {
            containerMetrics.innerHTML = `
                <div class="view-card" style="text-align: center; margin-bottom: 0; padding: 14px 10px;">
                    <div style="font-size: 22px; margin-bottom: 2px;">📈</div>
                    <h4 style="color: var(--text-muted); font-size: 11.5px; margin: 0 0 2px 0;">Total Kas Masuk</h4>
                    <h2 style="font-size: 18px; font-weight: 800; color: #16a34a; margin: 0;">${formatRp(totalMasuk)}</h2>
                </div>
                <div class="view-card" style="text-align: center; margin-bottom: 0; padding: 14px 10px;">
                    <div style="font-size: 22px; margin-bottom: 2px;">📉</div>
                    <h4 style="color: var(--text-muted); font-size: 11.5px; margin: 0 0 2px 0;">Total Kas Keluar</h4>
                    <h2 style="font-size: 18px; font-weight: 800; color: #dc2626; margin: 0;">${formatRp(totalKeluar)}</h2>
                </div>
                <div class="view-card" style="text-align: center; margin-bottom: 0; padding: 14px 10px;">
                    <div style="font-size: 22px; margin-bottom: 2px;">⚖️</div>
                    <h4 style="color: var(--text-muted); font-size: 11.5px; margin: 0 0 2px 0;">Saldo Kas Bersih</h4>
                    <h2 style="font-size: 18px; font-weight: 800; color: var(--primary-color); margin: 0;">${formatRp(saldoBersih)}</h2>
                </div>
            `;
        }

        if (thead) {
            thead.innerHTML = `
                <tr style="background: var(--bg-main);">
                    <th style="padding: 14px 16px; width: 18%;">TANGGAL</th>
                    <th style="padding: 14px 16px; width: 14%;">TIPE</th>
                    <th style="padding: 14px 16px; width: 20%;">KATEGORI</th>
                    <th style="padding: 14px 16px; width: 28%;">KETERANGAN</th>
                    <th style="padding: 14px 16px; width: 20%; text-align: right;">JUMLAH</th>
                </tr>
            `;
        }

        if (tbody) {
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--text-muted);">Tidak ada transaksi kas pada periode ini.</td></tr>';
            } else {
                data.forEach(x => {
                    const isMasuk = String(x.tipe || '').toUpperCase() === 'MASUK';
                    const tr = document.createElement('tr');
                    tr.style.cssText = 'border-bottom: 1px solid var(--border-color);';
                    tr.innerHTML = `
                        <td style="padding: 12px 16px;">${x.tanggal || '-'}</td>
                        <td style="padding: 12px 16px;"><span class="badge" style="${isMasuk ? 'background:#ecfdf5; color:#10b981;' : 'background:#fef2f2; color:#ef4444;'} font-weight:700;">${x.tipe || '-'}</span></td>
                        <td style="padding: 12px 16px;"><strong>${x.kategori || '-'}</strong></td>
                        <td style="padding: 12px 16px;">${x.keterangan || '-'}</td>
                        <td style="padding: 12px 16px; text-align: right; font-weight: 800; color: ${isMasuk ? '#16a34a' : '#dc2626'};">${formatRp(x.jumlah)}</td>
                    `;
                    tbody.appendChild(tr);

                    if (mobileList) {
                        const mCard = document.createElement('div');
                        mCard.className = 'price-card-mobile';
                        mCard.innerHTML = `
                            <div class="price-card-header">
                                <div>
                                    <div class="price-card-title" style="font-size:13.5px; font-weight:700;">${x.kategori || '-'}</div>
                                    <div class="price-card-sub">${x.tanggal || '-'} • ${x.keterangan || '-'}</div>
                                </div>
                                <strong style="color:${isMasuk ? '#16a34a' : '#dc2626'}; font-size:14px;">${formatRp(x.jumlah)}</strong>
                            </div>
                        `;
                        mobileList.appendChild(mCard);
                    }
                });
            }
        }

        if (tfoot) {
            tfoot.innerHTML = `
                <tr>
                    <td colspan="4" style="padding: 14px 16px; text-align: right;">SALDO KAS BERSIH:</td>
                    <td style="padding: 14px 16px; text-align: right; color: var(--primary-color); font-size: 15px;">${formatRp(saldoBersih)}</td>
                </tr>
            `;
        }
    } else if (currentLaporanType === 'stok') {
        const totalItems = data.length;
        const totalValuationBuy = data.reduce((sum, x) => sum + (parseFloat(x.stok_unit_kecil || 0) * parseFloat(x.harga_beli_satuan || 0)), 0);
        const totalValuationSell = data.reduce((sum, x) => sum + (parseFloat(x.stok_unit_kecil || 0) * parseFloat(x.harga_jual_satuan || 0)), 0);

        if (containerMetrics) {
            containerMetrics.innerHTML = `
                <div class="view-card" style="text-align: center; margin-bottom: 0; padding: 14px 10px;">
                    <div style="font-size: 22px; margin-bottom: 2px;">💊</div>
                    <h4 style="color: var(--text-muted); font-size: 11.5px; margin: 0 0 2px 0;">Total Item Obat</h4>
                    <h2 style="font-size: 18px; font-weight: 800; color: var(--primary-color); margin: 0;">${totalItems} Obat</h2>
                </div>
                <div class="view-card" style="text-align: center; margin-bottom: 0; padding: 14px 10px;">
                    <div style="font-size: 22px; margin-bottom: 2px;">🏷️</div>
                    <h4 style="color: var(--text-muted); font-size: 11.5px; margin: 0 0 2px 0;">Valuasi Stok (Harga Beli)</h4>
                    <h2 style="font-size: 18px; font-weight: 800; color: #3b82f6; margin: 0;">${formatRp(totalValuationBuy)}</h2>
                </div>
                <div class="view-card" style="text-align: center; margin-bottom: 0; padding: 14px 10px;">
                    <div style="font-size: 22px; margin-bottom: 2px;">💎</div>
                    <h4 style="color: var(--text-muted); font-size: 11.5px; margin: 0 0 2px 0;">Valuasi Stok (Harga Jual)</h4>
                    <h2 style="font-size: 18px; font-weight: 800; color: #16a34a; margin: 0;">${formatRp(totalValuationSell)}</h2>
                </div>
            `;
        }

        if (thead) {
            thead.innerHTML = `
                <tr style="background: var(--bg-main);">
                    <th style="padding: 14px 16px; width: 14%;">KODE OBAT</th>
                    <th style="padding: 14px 16px; width: 28%;">NAMA OBAT</th>
                    <th style="padding: 14px 16px; width: 16%;">KATEGORI</th>
                    <th style="padding: 14px 16px; width: 12%;">STOK</th>
                    <th style="padding: 14px 16px; width: 15%; text-align: right;">HARGA BELI</th>
                    <th style="padding: 14px 16px; width: 15%; text-align: right;">HARGA JUAL</th>
                </tr>
            `;
        }

        if (tbody) {
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--text-muted);">Tidak ada data stok obat ditemukan.</td></tr>';
            } else {
                data.forEach(x => {
                    const stokVal = parseInt(x.stok_unit_kecil || 0);
                    const stokBadge = stokVal <= 0 
                        ? '<span class="badge" style="background:#fef2f2; color:#ef4444; font-weight:700;">HABIS</span>'
                        : `<span style="font-weight:800; color:${stokVal < 10 ? '#d97706' : 'var(--text-main)'};">${stokVal} ${x.unit_kecil || 'PCS'}</span>`;

                    const tr = document.createElement('tr');
                    tr.style.cssText = 'border-bottom: 1px solid var(--border-color);';
                    tr.innerHTML = `
                        <td style="padding: 12px 16px;"><code style="font-weight:700; color:var(--primary-color);">${x.id_obat || '-'}</code></td>
                        <td style="padding: 12px 16px;"><strong>${x.nama_obat || '-'}</strong></td>
                        <td style="padding: 12px 16px;">${x.kategori || '-'}</td>
                        <td style="padding: 12px 16px;">${stokBadge}</td>
                        <td style="padding: 12px 16px; text-align: right;">${formatRp(x.harga_beli_satuan)}</td>
                        <td style="padding: 12px 16px; text-align: right; font-weight: 700; color: var(--primary-color);">${formatRp(x.harga_jual_satuan)}</td>
                    `;
                    tbody.appendChild(tr);

                    if (mobileList) {
                        const mCard = document.createElement('div');
                        mCard.className = 'price-card-mobile';
                        mCard.innerHTML = `
                            <div class="price-card-header">
                                <div>
                                    <div class="price-card-title" style="font-size:13.5px; font-weight:700;">${x.nama_obat || '-'}</div>
                                    <div class="price-card-sub">Kode: <code>${x.id_obat || '-'}</code> • Stok: ${stokVal} ${x.unit_kecil || 'PCS'}</div>
                                </div>
                                <strong style="color:var(--primary-color); font-size:14px;">${formatRp(x.harga_jual_satuan)}</strong>
                            </div>
                        `;
                        mobileList.appendChild(mCard);
                    }
                });
            }
        }

        if (tfoot) {
            tfoot.innerHTML = `
                <tr>
                    <td colspan="4" style="padding: 14px 16px; text-align: right;">TOTAL VALUASI STOK (HARGA JUAL):</td>
                    <td colspan="2" style="padding: 14px 16px; text-align: right; color: var(--primary-color); font-size: 15px;">${formatRp(totalValuationSell)}</td>
                </tr>
            `;
        }
    } else if (currentLaporanType === 'shift') {
        const countShift = data.length;
        const totalMasukShift = data.reduce((sum, x) => sum + parseFloat(x.masuk || 0), 0);

        if (containerMetrics) {
            containerMetrics.innerHTML = `
                <div class="view-card" style="text-align: center; margin-bottom: 0; padding: 14px 10px;">
                    <div style="font-size: 22px; margin-bottom: 2px;">📑</div>
                    <h4 style="color: var(--text-muted); font-size: 11.5px; margin: 0 0 2px 0;">Total Shift Kasir</h4>
                    <h2 style="font-size: 18px; font-weight: 800; color: var(--primary-color); margin: 0;">${countShift} Shift</h2>
                </div>
                <div class="view-card" style="text-align: center; margin-bottom: 0; padding: 14px 10px;">
                    <div style="font-size: 22px; margin-bottom: 2px;">💵</div>
                    <h4 style="color: var(--text-muted); font-size: 11.5px; margin: 0 0 2px 0;">Total Uang Masuk Shift</h4>
                    <h2 style="font-size: 18px; font-weight: 800; color: #16a34a; margin: 0;">${formatRp(totalMasukShift)}</h2>
                </div>
            `;
        }

        if (thead) {
            thead.innerHTML = `
                <tr style="background: var(--bg-main);">
                    <th style="padding: 14px 16px; width: 16%;">TANGGAL</th>
                    <th style="padding: 14px 16px; width: 12%;">SHIFT</th>
                    <th style="padding: 14px 16px; width: 18%;">NAMA STAF</th>
                    <th style="padding: 14px 16px; width: 16%; text-align: right;">MODAL AWAL</th>
                    <th style="padding: 14px 16px; width: 18%; text-align: right;">TOTAL UANG AKHIR</th>
                    <th style="padding: 14px 16px; width: 20%; text-align: right;">UANG MASUK</th>
                </tr>
            `;
        }

        if (tbody) {
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--text-muted);">Tidak ada laporan shift pada periode ini.</td></tr>';
            } else {
                data.forEach(x => {
                    const tr = document.createElement('tr');
                    tr.style.cssText = 'border-bottom: 1px solid var(--border-color);';
                    tr.innerHTML = `
                        <td style="padding: 12px 16px;">${x.tanggal || '-'}</td>
                        <td style="padding: 12px 16px;"><span class="badge badge-info" style="font-weight:700;">${x.shift || '-'}</span></td>
                        <td style="padding: 12px 16px;"><strong>${x.nama || x.user || '-'}</strong></td>
                        <td style="padding: 12px 16px; text-align: right;">${formatRp(x.modal)}</td>
                        <td style="padding: 12px 16px; text-align: right;">${formatRp(x.total_uang)}</td>
                        <td style="padding: 12px 16px; text-align: right; font-weight: 800; color: #16a34a;">${formatRp(x.masuk)}</td>
                    `;
                    tbody.appendChild(tr);

                    if (mobileList) {
                        const mCard = document.createElement('div');
                        mCard.className = 'price-card-mobile';
                        mCard.innerHTML = `
                            <div class="price-card-header">
                                <div>
                                    <div class="price-card-title" style="font-size:13.5px; font-weight:700;">${x.nama || x.user || 'Staf'} (${x.shift || 'Shift'})</div>
                                    <div class="price-card-sub">${x.tanggal || '-'}</div>
                                </div>
                                <strong style="color:#16a34a; font-size:14px;">${formatRp(x.masuk)}</strong>
                            </div>
                        `;
                        mobileList.appendChild(mCard);
                    }
                });
            }
        }

        if (tfoot) {
            tfoot.innerHTML = `
                <tr>
                    <td colspan="5" style="padding: 14px 16px; text-align: right;">TOTAL UANG MASUK SHIFT:</td>
                    <td style="padding: 14px 16px; text-align: right; color: #16a34a; font-size: 15px;">${formatRp(totalMasukShift)}</td>
                </tr>
            `;
        }
    }
}

// --------------------------------------------------------------------------
// EXPORT PDF & EXPORT XLSX DENGAN LOGO & BRANDING RESMI
// --------------------------------------------------------------------------

function generateReportPrintHTML() {
    const appName = localStorage.getItem('app_name') || 'Apotek HF';
    const appAddress = localStorage.getItem('app_address') || 'Makassar';
    const appLogo = localStorage.getItem('app_logo') || 'logo_hf.png';
    
    const typeSelect = document.getElementById('laporan-type-select');
    const typeLabel = typeSelect ? typeSelect.options[typeSelect.selectedIndex].text : 'Laporan';

    const startDateVal = document.getElementById('laporan-date-start')?.value || '-';
    const endDateVal = document.getElementById('laporan-date-end')?.value || '-';
    
    const now = new Date();
    const printDate = `${now.getDate().toString().padStart(2,'0')}/${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
    const printedBy = currentUser ? `${currentUser.nama_staf} (${currentUser.role})` : 'System Administrator';

    // Clone table HTML
    const tableHeadHTML = document.getElementById('laporan-table-head')?.innerHTML || '';
    const tableBodyHTML = document.getElementById('laporan-table-body')?.innerHTML || '';
    const tableFootHTML = document.getElementById('laporan-table-foot')?.innerHTML || '';

    return `
        <div style="padding: 24px; font-family: 'Inter', -apple-system, sans-serif; color: #0f172a; background: #fff;">
            <!-- Official Header Banner -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0d9488; padding-bottom: 16px; margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 16px;">
                    <img src="${appLogo}" alt="Logo" style="height: 52px; object-fit: contain;">
                    <div>
                        <h1 style="font-size: 22px; font-weight: 800; margin: 0; color: #0d9488; text-transform: uppercase; letter-spacing: 0.5px;">${appName}</h1>
                        <div style="font-size: 11.5px; color: #64748b; margin-top: 2px;">${appAddress} • Sulawesi Selatan, Indonesia</div>
                        <div style="font-size: 11.5px; color: #0d9488; font-weight: 600; margin-top: 1px;">Dokumen Laporan Resmi & Relevansi Akuntansi</div>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 16px; font-weight: 800; color: #0f172a;">${typeLabel.toUpperCase()}</div>
                    <div style="font-size: 11.5px; color: #475569; margin-top: 4px;">Periode: <strong>${startDateVal}</strong> s/d <strong>${endDateVal}</strong></div>
                    <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">Dicetak: ${printDate}</div>
                </div>
            </div>

            <!-- Meta Details Bar -->
            <div style="display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 16px; margin-bottom: 20px; font-size: 12px;">
                <div>Staf Pengunduh: <strong>${printedBy}</strong></div>
                <div>Status Dokumen: <span style="color: #10b981; font-weight: 700;">🟢 Terverifikasi Sistem</span></div>
            </div>

            <!-- Main Data Table -->
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 30px;">
                <thead>
                    ${tableHeadHTML}
                </thead>
                <tbody>
                    ${tableBodyHTML}
                </tbody>
                <tfoot>
                    ${tableFootHTML}
                </tfoot>
            </table>

            <!-- Footer Signature Block -->
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; page-break-inside: avoid;">
                <div style="font-size: 11px; color: #94a3b8;">
                    <div>* Laporan ini dihasilkan secara otomatis oleh sistem ${appName}.</div>
                    <div>* Keabsahan dokumen sah tanpa tanda tangan basah jika dicetak dari akun terdaftar.</div>
                </div>
                <div style="text-align: center; min-width: 180px;">
                    <div style="font-size: 12px; color: #475569; margin-bottom: 50px;">Makassar, ${now.getDate()} / ${(now.getMonth()+1)} / ${now.getFullYear()}<br>Penanggung Jawab Apotek</div>
                    <div style="font-weight: 800; font-size: 13px; text-decoration: underline;">( ${currentUser ? currentUser.nama_staf : 'Apoteker / Manager'} )</div>
                </div>
            </div>
        </div>
    `;
}

function exportLaporanPDF() {
    try {
        const printContent = generateReportPrintHTML();
        const element = document.createElement('div');
        element.innerHTML = printContent;
        document.body.appendChild(element);

        const appName = localStorage.getItem('app_name') || 'Apotek HF';
        const typeSelect = document.getElementById('laporan-type-select');
        const typeVal = typeSelect ? typeSelect.value : 'laporan';
        const dateStr = new Date().toISOString().split('T')[0];

        if (typeof html2pdf !== 'undefined') {
            const opt = {
                margin: [8, 8, 8, 8],
                filename: `Laporan_${typeVal}_${appName.replace(/\s+/g, '_')}_${dateStr}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
            };

            html2pdf().set(opt).from(element).save().then(() => {
                document.body.removeChild(element);
            }).catch(err => {
                console.error('html2pdf error, fallback to print window:', err);
                document.body.removeChild(element);
                triggerPrintWindow(printContent);
            });
        } else {
            document.body.removeChild(element);
            triggerPrintWindow(printContent);
        }
    } catch (err) {
        console.error('Export PDF error:', err);
        alert('Gagal mengexport PDF: ' + err.message);
    }
}

function triggerPrintWindow(htmlContent) {
    const printWin = window.open('', '_blank');
    if (printWin) {
        printWin.document.write(`
            <html>
                <head>
                    <title>Cetak Laporan</title>
                    <style>
                        body { margin: 0; padding: 0; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid #cbd5e1; padding: 8px 12px; }
                        th { background: #f1f5f9; text-align: left; }
                    </style>
                </head>
                <body>
                    ${htmlContent}
                    <script>
                        window.onload = function() { window.print(); window.close(); }
                    </script>
                </body>
            </html>
        `);
        printWin.document.close();
    }
}

function exportLaporanXLSX() {
    try {
        if (typeof XLSX === 'undefined') {
            alert('Library Excel (XLSX) tidak dimuat. Periksa koneksi internet Anda!');
            return;
        }

        const appName = localStorage.getItem('app_name') || 'Apotek HF';
        const appAddress = localStorage.getItem('app_address') || 'Makassar';
        const typeSelect = document.getElementById('laporan-type-select');
        const typeVal = typeSelect ? typeSelect.value : 'laporan';
        const typeLabel = typeSelect ? typeSelect.options[typeSelect.selectedIndex].text : 'Laporan';

        const startDateVal = document.getElementById('laporan-date-start')?.value || '-';
        const endDateVal = document.getElementById('laporan-date-end')?.value || '-';
        const dateStr = new Date().toISOString().split('T')[0];

        // Format data into array of objects for Excel sheet
        const excelRows = [];
        
        // Metadata Title Rows
        excelRows.push({ A: `${appName.toUpperCase()} - DOKUMEN LAPORAN RESMI` });
        excelRows.push({ A: `Alamat: ${appAddress}` });
        excelRows.push({ A: `Jenis Laporan: ${typeLabel}` });
        excelRows.push({ A: `Periode: ${startDateVal} s/d ${endDateVal}` });
        excelRows.push({ A: `Dicetak Pada: ${new Date().toLocaleString('id-ID')}` });
        excelRows.push({ A: '' }); // Blank row

        if (currentLaporanType === 'penjualan') {
            currentLaporanData.forEach(x => {
                excelRows.push({
                    'No. Nota': x.id_jual || '-',
                    'Tanggal': x.tanggal || '-',
                    'Pelanggan': x.pelanggan || 'Umum',
                    'Staf Kasir': x.staf || '-',
                    'Metode Bayar': x.metode_bayar || 'TUNAI',
                    'Total Bayar (Rp)': parseFloat(x.total_bayar || 0)
                });
            });
        } else if (currentLaporanType === 'pembelian') {
            currentLaporanData.forEach(x => {
                excelRows.push({
                    'No. Faktur': x.id_faktur || '-',
                    'Tanggal Masuk': x.tanggal_masuk || x.tanggal || '-',
                    'Supplier': x.supplier || '-',
                    'Staf': x.staf || '-',
                    'Total Faktur (Rp)': parseFloat(x.total_harga || x.total_bayar || 0)
                });
            });
        } else if (currentLaporanType === 'kas') {
            currentLaporanData.forEach(x => {
                excelRows.push({
                    'Tanggal': x.tanggal || '-',
                    'Tipe Kas': x.tipe || '-',
                    'Kategori': x.kategori || '-',
                    'Keterangan': x.keterangan || '-',
                    'Jumlah (Rp)': parseFloat(x.jumlah || 0)
                });
            });
        } else if (currentLaporanType === 'stok') {
            currentLaporanData.forEach(x => {
                excelRows.push({
                    'Kode Obat': x.id_obat || '-',
                    'Nama Obat': x.nama_obat || '-',
                    'Kategori': x.kategori || '-',
                    'Stok': parseInt(x.stok_unit_kecil || 0),
                    'Satuan': x.unit_kecil || 'PCS',
                    'Harga Beli (Rp)': parseFloat(x.harga_beli_satuan || 0),
                    'Harga Jual (Rp)': parseFloat(x.harga_jual_satuan || 0)
                });
            });
        } else if (currentLaporanType === 'shift') {
            currentLaporanData.forEach(x => {
                excelRows.push({
                    'Tanggal': x.tanggal || '-',
                    'Shift': x.shift || '-',
                    'Nama Staf': x.nama || x.user || '-',
                    'Modal Awal (Rp)': parseFloat(x.modal || 0),
                    'Total Uang Akhir (Rp)': parseFloat(x.total_uang || 0),
                    'Uang Masuk (Rp)': parseFloat(x.masuk || 0),
                    'Catatan': x.catatan || '-'
                });
            });
        }

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelRows);
        XLSX.utils.book_append_sheet(wb, ws, 'Laporan');

        const fileName = `Laporan_${typeVal}_${appName.replace(/\s+/g, '_')}_${dateStr}.xlsx`;
        XLSX.writeFile(wb, fileName);
    } catch (err) {
        console.error('Export XLSX error:', err);
        alert('Gagal mengexport Excel: ' + err.message);
    }
}

// --------------------------------------------------------------------------
// MENU TAGIHAN (PIUTANG PELANGGAN & HUTANG SUPPLIER)
// --------------------------------------------------------------------------
let currentTagihanTab = 'piutang'; // 'piutang' or 'hutang'

function switchTagihanTab(tab) {
    currentTagihanTab = tab;
    const btnPiutang = document.getElementById('tagihan-tab-piutang');
    const btnHutang = document.getElementById('tagihan-tab-hutang');
    
    if (tab === 'piutang') {
        btnPiutang.className = 'btn btn-primary';
        btnHutang.className = 'btn btn-secondary';
        document.getElementById('tagihan-summary-label1').textContent = 'Total Piutang Outstanding';
        document.getElementById('tagihan-summary-label2').textContent = 'Jumlah Nota Piutang Belum Lunas';
        document.getElementById('tagihan-summary-label3').textContent = 'Total Piutang Terbayar';
    } else {
        btnPiutang.className = 'btn btn-secondary';
        btnHutang.className = 'btn btn-primary';
        document.getElementById('tagihan-summary-label1').textContent = 'Total Hutang Outstanding';
        document.getElementById('tagihan-summary-label2').textContent = 'Jumlah Faktur Hutang Belum Lunas';
        document.getElementById('tagihan-summary-label3').textContent = 'Total Hutang Terbayar';
    }
    loadTagihanData();
}

let currentTagihanPage = 1;
let currentTagihanPageSize = 10;

async function loadTagihanData(page = currentTagihanPage, pageSize = currentTagihanPageSize) {
    currentTagihanPage = page;
    currentTagihanPageSize = pageSize;

    if (!supabaseClient) return;
    const q = document.getElementById('tagihan-search-input')?.value.trim() || '';
    const thead = document.getElementById('tagihan-table-head');
    const tbody = document.getElementById('tagihan-table-body');
    const mobileList = document.getElementById('tagihan-mobile-list');

    tbody.innerHTML = '';
    if (mobileList) mobileList.innerHTML = '';

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    if (currentTagihanTab === 'piutang') {
        // Table Head for Piutang
        thead.innerHTML = `
            <tr>
                <th>ID Jual</th>
                <th>Tanggal</th>
                <th>Pelanggan</th>
                <th>Total Tagihan</th>
                <th>Sisa Piutang</th>
                <th>Status</th>
                <th>Aksi</th>
            </tr>
        `;

        try {
            // Query TEMPO sales transactions with pagination
            let query = supabaseClient.from('transaksi_jual').select('*', { count: 'exact' }).eq('metode_bayar', 'TEMPO').order('tanggal', { ascending: false });
            if (q) {
                query = query.or(`id_jual.ilike.%${q}%,nama_pelanggan.ilike.%${q}%`);
            }
            const { data: txList, count, error } = await query.range(from, to);

            // Also fetch overall totals for summary cards (non-paginated)
            const { data: allTempoTx } = await supabaseClient.from('transaksi_jual').select('id_jual, total_bayar').eq('metode_bayar', 'TEMPO');
            const { data: logs } = await supabaseClient.from('log_pelunasan_jual').select('*');
            
            const paidMap = {};
            if (logs) {
                logs.forEach(l => {
                    paidMap[l.id_jual] = (paidMap[l.id_jual] || 0) + parseFloat(l.jumlah_bayar || 0);
                });
            }

            let totalOutstanding = 0;
            let totalTerbayar = 0;
            let unpaidCount = 0;

            if (allTempoTx) {
                allTempoTx.forEach(tx => {
                    const tot = parseFloat(tx.total_bayar || 0);
                    const pd = paidMap[tx.id_jual] || 0;
                    const rem = Math.max(0, tot - pd);
                    totalTerbayar += pd;
                    if (rem > 0) {
                        totalOutstanding += rem;
                        unpaidCount++;
                    }
                });
            }

            if (txList) {
                document.getElementById('tagihan-count-badge').textContent = `${count !== null ? count : txList.length} Nota`;

                txList.forEach(tx => {
                    const total = parseFloat(tx.total_bayar || 0);
                    const paid = paidMap[tx.id_jual] || 0;
                    const sisa = Math.max(0, total - paid);
                    const isLunas = sisa <= 0;

                    const statusBadge = isLunas 
                        ? '<span class="badge" style="background:#ecfdf5;color:#10b981;">LUNAS</span>' 
                        : '<span class="badge" style="background:#fef2f2;color:#ef4444;">BELUM LUNAS</span>';

                    const encId = encodeURIComponent(tx.id_jual || '');
                    const encNama = encodeURIComponent(tx.nama_pelanggan || 'UMUM');

                    // Desktop row
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><strong>${tx.id_jual}</strong></td>
                        <td>${tx.tanggal}</td>
                        <td>${tx.nama_pelanggan || 'UMUM'}</td>
                        <td>Rp ${formatMoney(total)}</td>
                        <td><strong style="color: ${isLunas ? '#10b981' : '#ef4444'};">Rp ${formatMoney(sisa)}</strong></td>
                        <td>${statusBadge}</td>
                        <td>
                            ${!isLunas ? `<button class="btn btn-primary" style="padding:4px 8px; font-size:11px;" onclick="openBayarTagihanModal('${encId}', '${encNama}', ${total}, ${sisa}, 'piutang')">💵 Bayar</button>` : '<span style="font-size:12px; color:var(--text-muted);">✓ Selesai</span>'}
                        </td>
                    `;
                    tbody.appendChild(tr);

                    // Mobile card
                    if (mobileList) {
                        const card = document.createElement('div');
                        card.className = 'price-card-mobile';
                        card.innerHTML = `
                            <div class="price-card-header">
                                <div style="flex:1; min-width:0;">
                                    <div class="price-card-title" style="font-size:13px;">${tx.id_jual}</div>
                                    <div class="price-card-sub">👤 ${tx.nama_pelanggan || 'UMUM'} • ${tx.tanggal}</div>
                                </div>
                                ${statusBadge}
                            </div>
                            <div style="font-size:12px; margin-top:6px; display:flex; justify-content:space-between; align-items:center;">
                                <span style="color:var(--text-muted);">Total: Rp ${formatMoney(total)}</span>
                                <strong style="font-size:13.5px; color:${isLunas ? '#10b981' : '#ef4444'};">Sisa: Rp ${formatMoney(sisa)}</strong>
                            </div>
                            ${!isLunas ? `
                                <div style="display:flex; justify-content:flex-end; margin-top:8px;">
                                    <button class="btn btn-primary" style="padding:6px 12px; font-size:12px; width:100%;" onclick="openBayarTagihanModal('${encId}', '${encNama}', ${total}, ${sisa}, 'piutang')">💵 Bayar Pelunasan</button>
                                </div>
                            ` : ''}
                        `;
                        mobileList.appendChild(card);
                    }
                });

                const totalPages = Math.ceil((count !== null ? count : txList.length) / pageSize);
                renderPaginationControls('tagihan-pagination', page, totalPages, pageSize, 'loadTagihanData');
            }

            document.getElementById('tagihan-summary-val1').textContent = `Rp ${formatMoney(totalOutstanding)}`;
            document.getElementById('tagihan-summary-val2').textContent = `${unpaidCount} Nota`;
            document.getElementById('tagihan-summary-val3').textContent = `Rp ${formatMoney(totalTerbayar)}`;

        } catch (e) {
            console.error('Error loading piutang tagihan:', e);
        }

    } else {
        // Table Head for Hutang Supplier
        thead.innerHTML = `
            <tr>
                <th>No. Faktur</th>
                <th>Tanggal Masuk</th>
                <th>Supplier</th>
                <th>Total Faktur</th>
                <th>Sisa Hutang</th>
                <th>Status</th>
                <th>Aksi</th>
            </tr>
        `;

        try {
            let query = supabaseClient.from('faktur_beli').select('*', { count: 'exact' }).eq('metode_bayar', 'TEMPO').order('tanggal_masuk', { ascending: false });
            if (q) {
                query = query.or(`nomor_faktur.ilike.%${q}%,supplier.ilike.%${q}%`);
            }
            const { data: fkList, count, error } = await query.range(from, to);

            const { data: allTempoFk } = await supabaseClient.from('faktur_beli').select('total_harga').eq('metode_bayar', 'TEMPO');

            let totalOutstanding = 0;
            let unpaidCount = 0;
            let totalTerbayar = 0;

            if (allTempoFk) {
                allTempoFk.forEach(fk => {
                    const tot = parseFloat(fk.total_harga || 0);
                    totalOutstanding += tot;
                    unpaidCount++;
                });
            }

            if (fkList) {
                document.getElementById('tagihan-count-badge').textContent = `${count !== null ? count : fkList.length} Faktur`;

                fkList.forEach(fk => {
                    const total = parseFloat(fk.total_harga || 0);
                    const sisa = total; 
                    const isLunas = sisa <= 0;

                    const statusBadge = isLunas 
                        ? '<span class="badge" style="background:#ecfdf5;color:#10b981;">LUNAS</span>' 
                        : '<span class="badge" style="background:#fef2f2;color:#ef4444;">BELUM LUNAS</span>';

                    const encId = encodeURIComponent(fk.id_faktur || fk.nomor_faktur || '');
                    const encNama = encodeURIComponent(fk.supplier || 'Supplier');

                    // Desktop row
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><strong>${fk.nomor_faktur || fk.id_faktur}</strong></td>
                        <td>${fk.tanggal_masuk}</td>
                        <td>${fk.supplier}</td>
                        <td>Rp ${formatMoney(total)}</td>
                        <td><strong style="color: ${isLunas ? '#10b981' : '#ef4444'};">Rp ${formatMoney(sisa)}</strong></td>
                        <td>${statusBadge}</td>
                        <td>
                            ${!isLunas ? `<button class="btn btn-primary" style="padding:4px 8px; font-size:11px;" onclick="openBayarTagihanModal('${encId}', '${encNama}', ${total}, ${sisa}, 'hutang')">💵 Bayar</button>` : '<span style="font-size:12px; color:var(--text-muted);">✓ Selesai</span>'}
                        </td>
                    `;
                    tbody.appendChild(tr);

                    // Mobile card
                    if (mobileList) {
                        const card = document.createElement('div');
                        card.className = 'price-card-mobile';
                        card.innerHTML = `
                            <div class="price-card-header">
                                <div style="flex:1; min-width:0;">
                                    <div class="price-card-title" style="font-size:13px;">Faktur: ${fk.nomor_faktur || fk.id_faktur}</div>
                                    <div class="price-card-sub">📦 ${fk.supplier} • ${fk.tanggal_masuk}</div>
                                </div>
                                ${statusBadge}
                            </div>
                            <div style="font-size:12px; margin-top:6px; display:flex; justify-content:space-between; align-items:center;">
                                <span style="color:var(--text-muted);">Total: Rp ${formatMoney(total)}</span>
                                <strong style="font-size:13.5px; color:${isLunas ? '#10b981' : '#ef4444'};">Sisa: Rp ${formatMoney(sisa)}</strong>
                            </div>
                            ${!isLunas ? `
                                <div style="display:flex; justify-content:flex-end; margin-top:8px;">
                                    <button class="btn btn-primary" style="padding:6px 12px; font-size:12px; width:100%;" onclick="openBayarTagihanModal('${encId}', '${encNama}', ${total}, ${sisa}, 'hutang')">💵 Bayar Hutang</button>
                                </div>
                            ` : ''}
                        `;
                        mobileList.appendChild(card);
                    }
                });

                const totalPages = Math.ceil((count !== null ? count : fkList.length) / pageSize);
                renderPaginationControls('tagihan-pagination', page, totalPages, pageSize, 'loadTagihanData');
            }

            document.getElementById('tagihan-summary-val1').textContent = `Rp ${formatMoney(totalOutstanding)}`;
            document.getElementById('tagihan-summary-val2').textContent = `${unpaidCount} Faktur`;
            document.getElementById('tagihan-summary-val3').textContent = `Rp ${formatMoney(totalTerbayar)}`;

        } catch (e) {
            console.error('Error loading hutang tagihan:', e);
        }
    }
}

function openBayarTagihanModal(encId, encNama, total, sisa, type) {
    const id = decodeURIComponent(encId);
    const nama = decodeURIComponent(encNama);

    document.getElementById('bayar-tagihan-id').value = id;
    document.getElementById('bayar-tagihan-type').value = type;
    document.getElementById('bayar-info-id').textContent = id;
    document.getElementById('bayar-info-nama').textContent = nama;
    document.getElementById('bayar-info-total').textContent = `Rp ${formatMoney(total)}`;
    document.getElementById('bayar-info-sisa').textContent = `Rp ${formatMoney(sisa)}`;
    document.getElementById('bayar-tagihan-nominal').value = sisa;
    document.getElementById('bayar-tagihan-title').textContent = type === 'piutang' ? 'Terima Pelunasan Piutang' : 'Bayar Hutang Supplier';

    document.getElementById('modal-bayar-tagihan').classList.remove('hidden');
}

async function submitBayarTagihan(e) {
    e.preventDefault();
    const id = document.getElementById('bayar-tagihan-id').value;
    const type = document.getElementById('bayar-tagihan-type').value;
    const nominal = parseFloat(document.getElementById('bayar-tagihan-nominal').value) || 0;
    const metode = document.getElementById('bayar-tagihan-metode').value;
    const catatan = document.getElementById('bayar-tagihan-catatan').value.trim();

    if (nominal <= 0) {
        alert('Masukkan nominal pembayaran yang valid!');
        return;
    }

    try {
        if (!supabaseClient) return;
        const dateStr = new Date().toISOString().split('T')[0];

        if (type === 'piutang') {
            const id_pelunasan = 'PL' + Math.random().toString(36).substring(2, 8).toUpperCase();
            const { error: logErr } = await supabaseClient.from('log_pelunasan_jual').insert([{
                id_pelunasan,
                id_jual: id,
                tanggal_bayar: dateStr,
                jumlah_bayar: String(nominal),
                metode_bayar: metode,
                catatan: catatan || 'Pelunasan Piutang Pelanggan',
                user: currentUser?.nama_staf || 'cashier'
            }]);

            if (logErr) throw logErr;

            // Log into kas as MASUK
            await supabaseClient.from('kas').insert([{
                id_kas: 'K' + Math.random().toString(36).substring(2, 8).toUpperCase(),
                tanggal: dateStr,
                jenis_kas: 'MASUK',
                kategori: 'Pelunasan Piutang',
                jumlah: String(nominal),
                keterangan: `Pelunasan Nota ${id} (${catatan || 'CASH'})`,
                user: currentUser?.nama_staf || 'cashier'
            }]);

            alert('Pelunasan piutang berhasil dicatat!');

        } else {
            // Log into kas as KELUAR for Hutang
            await supabaseClient.from('kas').insert([{
                id_kas: 'K' + Math.random().toString(36).substring(2, 8).toUpperCase(),
                tanggal: dateStr,
                jenis_kas: 'KELUAR',
                kategori: 'Pembayaran Hutang Supplier',
                jumlah: String(nominal),
                keterangan: `Pembayaran Faktur ${id} (${catatan || 'CASH'})`,
                user: currentUser?.nama_staf || 'cashier'
            }]);

            alert('Pembayaran hutang supplier berhasil dicatat!');
        }

        closeModal('modal-bayar-tagihan');
        document.getElementById('form-bayar-tagihan').reset();
        loadTagihanData();

    } catch (e) {
        console.error('Error submitting pelunasan:', e);
        alert('Gagal mencatat pembayaran pelunasan.');
    }
}

// --------------------------------------------------------------------------
// DOKUMENTASI FAKTUR PEMBELIAN
// --------------------------------------------------------------------------
let currentFakturPage = 1;
let currentFakturPageSize = 10;

async function loadDokumentasiFaktur(page = currentFakturPage, pageSize = currentFakturPageSize) {
    currentFakturPage = page;
    currentFakturPageSize = pageSize;

    if (!supabaseClient) return;
    const q = document.getElementById('faktur-search-input')?.value.trim() || '';
    const tbody = document.getElementById('faktur-table-body');
    const mobileList = document.getElementById('faktur-mobile-list');

    tbody.innerHTML = '';
    if (mobileList) mobileList.innerHTML = '';

    try {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        let query = supabaseClient.from('faktur_beli').select('*', { count: 'exact' });

        if (q) {
            query = query.or(`nomor_faktur.ilike.%${q}%,supplier.ilike.%${q}%`);
        }

        const { data: list, count, error } = await query.order('tanggal_masuk', { ascending: false }).range(from, to);

        if (list) {
            const countBadge = document.getElementById('faktur-count-badge');
            if (countBadge) countBadge.textContent = `${count !== null ? count : list.length} Faktur`;

            list.forEach(fk => {
                const total = parseFloat(fk.total_harga || 0);
                const metodeBadge = fk.metode_bayar === 'CASH' 
                    ? 'background:#ecfdf5;color:#10b981;' 
                    : 'background:#fef3c7;color:#f59e0b;';

                const encNo = encodeURIComponent(fk.nomor_faktur || fk.id_faktur || '');

                // Desktop Row
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${fk.nomor_faktur || fk.id_faktur}</strong></td>
                    <td>${fk.tanggal_masuk || '-'}</td>
                    <td>${fk.supplier || '-'}</td>
                    <td><strong>Rp ${formatMoney(total)}</strong></td>
                    <td><span class="badge" style="${metodeBadge}">${fk.metode_bayar || 'CASH'}</span></td>
                    <td>${fk.user || '-'}</td>
                    <td>
                        <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 11px;" onclick="showDetailFaktur('${encNo}')">🔍 Detail Item</button>
                    </td>
                `;
                tbody.appendChild(tr);

                // Mobile Card
                if (mobileList) {
                    const card = document.createElement('div');
                    card.className = 'price-card-mobile';
                    card.onclick = () => showDetailFaktur(fk.nomor_faktur || fk.id_faktur);
                    card.style.cursor = 'pointer';
                    card.innerHTML = `
                        <div class="price-card-header">
                            <div style="flex:1; min-width:0;">
                                <div class="price-card-title" style="font-size:13px;">Faktur: ${fk.nomor_faktur || fk.id_faktur}</div>
                                <div class="price-card-sub">📦 ${fk.supplier} • ${fk.tanggal_masuk}</div>
                            </div>
                            <strong style="color:var(--primary-color); font-size:14px;">Rp ${formatMoney(total)}</strong>
                        </div>
                        <div style="font-size:11.5px; color:var(--text-muted); display:flex; justify-content:space-between; margin-top:6px; align-items:center;">
                            <span>Petugas: ${fk.user || '-'}</span>
                            <span class="badge" style="${metodeBadge} font-size:10px;">${fk.metode_bayar || 'CASH'}</span>
                        </div>
                    `;
                    mobileList.appendChild(card);
                }
            });

            const totalPages = Math.ceil((count !== null ? count : list.length) / pageSize);
            renderPaginationControls('faktur-pagination', page, totalPages, pageSize, 'loadDokumentasiFaktur');
        }
    } catch (e) {
        console.error('Error loading dokumentasi faktur:', e);
    }
}

async function showDetailFaktur(encNo) {
    const noFaktur = decodeURIComponent(encNo);
    if (!supabaseClient || !noFaktur) return;

    try {
        // Fetch Header
        const { data: header } = await supabaseClient.from('faktur_beli').select('*').or(`nomor_faktur.eq.${noFaktur},id_faktur.eq.${noFaktur}`).single();
        // Fetch Items from log_beli
        const { data: items } = await supabaseClient.from('log_beli').select('*').or(`id_faktur.eq.${noFaktur},id_faktur.eq.${header?.id_faktur || noFaktur}`);

        if (header) {
            document.getElementById('faktur-detail-no').textContent = header.nomor_faktur || header.id_faktur;
            document.getElementById('faktur-detail-tanggal').textContent = header.tanggal_masuk || '-';
            document.getElementById('faktur-detail-supplier').textContent = header.supplier || '-';
            document.getElementById('faktur-detail-metode').textContent = header.metode_bayar || 'CASH';
            document.getElementById('faktur-detail-total').textContent = `Rp ${formatMoney(parseFloat(header.total_harga || 0))}`;
            document.getElementById('faktur-detail-user').textContent = header.user || '-';
        }

        const tbody = document.getElementById('faktur-detail-items-body');
        tbody.innerHTML = '';

        if (items && items.length > 0) {
            // Fetch medicine names
            const medIds = items.map(i => i.id_obat).filter(Boolean);
            let medMap = {};
            if (medIds.length > 0) {
                const { data: meds } = await supabaseClient.from('master_obat').select('id_obat, nama_obat').in('id_obat', medIds);
                if (meds) meds.forEach(m => medMap[m.id_obat] = m.nama_obat);
            }

            items.forEach(item => {
                const qty = parseFloat(item.jumlah_masuk || 0);
                const price = parseFloat(item.harga_beli_item || 0);
                const total = parseFloat(item.total_harga || (qty * price));
                const namaObat = medMap[item.id_obat] || item.id_obat || 'Obat';

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${namaObat}</strong></td>
                    <td><span class="badge badge-info">${item.satuan_masuk || 'Pcs'}</span></td>
                    <td>${qty}</td>
                    <td>Rp ${formatMoney(price)}</td>
                    <td><strong>Rp ${formatMoney(total)}</strong></td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:16px;">Tidak ada rincian item log untuk faktur ini.</td></tr>';
        }

        document.getElementById('modal-detail-faktur').classList.remove('hidden');

    } catch (e) {
        console.error('Error opening detail faktur:', e);
        alert('Gagal memuat detail faktur.');
    }
}

// --------------------------------------------------------------------------
// 10. KAS OPERASIONAL
// --------------------------------------------------------------------------
let currentKasPage = 1;
let currentKasPageSize = 10;

async function loadKasLedger(page = currentKasPage, pageSize = currentKasPageSize) {
    currentKasPage = page;
    currentKasPageSize = pageSize;

    if (!supabaseClient) return;
    const q = document.getElementById('kas-search-input')?.value.trim() || '';
    const tbody = document.getElementById('kas-table-body');
    const mobileList = document.getElementById('kas-mobile-list');

    tbody.innerHTML = '';
    if (mobileList) mobileList.innerHTML = '';

    try {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        let query = supabaseClient.from('kas').select('*', { count: 'exact' });

        if (q) {
            query = query.or(`kategori.ilike.%${q}%,keterangan.ilike.%${q}%,id_kas.ilike.%${q}%`);
        }

        const { data: list, count, error } = await query.order('tanggal', { ascending: false }).range(from, to);

        // Fetch overall totals for summary cards
        const { data: allKas } = await supabaseClient.from('kas').select('jenis_kas, jumlah');
        let totalMasuk = 0;
        let totalKeluar = 0;

        if (allKas) {
            allKas.forEach(k => {
                const amt = parseFloat(k.jumlah || 0);
                if (k.jenis_kas === 'MASUK') totalMasuk += amt;
                else if (k.jenis_kas === 'KELUAR') totalKeluar += amt;
            });
        }

        document.getElementById('kas-summary-masuk').textContent = `Rp ${formatMoney(totalMasuk)}`;
        document.getElementById('kas-summary-keluar').textContent = `Rp ${formatMoney(totalKeluar)}`;
        const saldoNet = totalMasuk - totalKeluar;
        const saldoEl = document.getElementById('kas-summary-saldo');
        if (saldoEl) {
            saldoEl.textContent = `Rp ${formatMoney(saldoNet)}`;
            saldoEl.style.color = saldoNet >= 0 ? 'var(--primary-color)' : '#dc2626';
        }

        if (list) {
            const countBadge = document.getElementById('kas-count-badge');
            if (countBadge) countBadge.textContent = `${count !== null ? count : list.length} Mutasi`;

            list.forEach(k => {
                const isOut = k.jenis_kas === 'KELUAR';
                const amtColor = isOut ? '#dc2626' : '#16a34a';
                const badgeBg = isOut ? '#fef2f2' : '#ecfdf5';

                // Desktop Row
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${k.id_kas}</strong></td>
                    <td>${k.tanggal || '-'}</td>
                    <td><span class="badge" style="background:${badgeBg}; color:${amtColor};">${k.jenis_kas}</span></td>
                    <td>${k.kategori || '-'}</td>
                    <td style="font-weight:700; color:${amtColor};">${isOut ? '-' : '+'} Rp ${formatMoney(parseFloat(k.jumlah || 0))}</td>
                    <td>${k.keterangan || '-'}</td>
                    <td>${k.user || '-'}</td>
                `;
                tbody.appendChild(tr);

                // Mobile Card
                if (mobileList) {
                    const card = document.createElement('div');
                    card.className = 'price-card-mobile';
                    card.innerHTML = `
                        <div class="price-card-header">
                            <div>
                                <div class="price-card-title" style="font-size:13px;">${k.kategori || 'Mutasi Kas'}</div>
                                <div class="price-card-sub">🆔 ${k.id_kas} • ${k.tanggal}</div>
                            </div>
                            <strong style="color:${amtColor}; font-size:14px;">${isOut ? '-' : '+'} Rp ${formatMoney(parseFloat(k.jumlah || 0))}</strong>
                        </div>
                        <div style="font-size:11.5px; color:var(--text-muted); display:flex; justify-content:space-between; margin-top:6px; align-items:center;">
                            <span>Petugas: ${k.user || '-'}</span>
                            <span class="badge" style="background:${badgeBg}; color:${amtColor}; font-size:10px;">${k.jenis_kas}</span>
                        </div>
                        ${k.keterangan ? `<div style="font-size:11px; color:var(--text-muted); font-style:italic; margin-top:4px;">📝 ${k.keterangan}</div>` : ''}
                    `;
                    mobileList.appendChild(card);
                }
            });

            const totalPages = Math.ceil((count !== null ? count : list.length) / pageSize);
            renderPaginationControls('kas-pagination', page, totalPages, pageSize, 'loadKasLedger');
        }
    } catch (e) {
        console.error('Error loading kas ledger:', e);
    }
}

function showAddKasModal() {
    document.getElementById('modal-add-kas').classList.remove('hidden');
}

async function submitAddKas(e) {
    e.preventDefault();
    const jenis = document.getElementById('add-kas-jenis').value;
    const kategori = document.getElementById('add-kas-kategori').value.trim();
    const jumlah = document.getElementById('add-kas-jumlah').value;
    const keterangan = document.getElementById('add-kas-keterangan').value.trim();
    
    try {
        if (!supabaseClient) return;
        const id_kas = 'K' + Math.random().toString(36).substring(2, 8).toUpperCase();
        const dateStr = new Date().toLocaleDateString('id-ID');
        
        const { error } = await supabaseClient.from('kas').insert([{
            id_kas,
            tanggal: dateStr,
            jenis_kas: jenis,
            kategori,
            jumlah: String(jumlah),
            keterangan,
            user: currentUser?.nama_staf || 'cashier'
        }]);

        if (error) throw error;
        alert('Transaksi kas berhasil disimpan!');
        closeModal('modal-add-kas');
        document.getElementById('form-add-kas').reset();
        loadKasLedger();
    } catch (e) {
        console.error(e);
        alert('Gagal menyimpan mutasi kas.');
    }
}

// --------------------------------------------------------------------------
// 11. SUPPLIER & PELANGGAN (PAGINATED)
// --------------------------------------------------------------------------
let currentSupplierPage = 1;
let currentSupplierPageSize = 10;
let currentPelangganPage = 1;
let currentPelangganPageSize = 10;

let currentMitraTab = 'supplier'; // 'supplier' or 'pelanggan'

function switchMitraTab(tab) {
    currentMitraTab = tab;
    const btnSup = document.getElementById('mitra-tab-supplier');
    const btnPel = document.getElementById('mitra-tab-pelanggan');
    const contentSup = document.getElementById('mitra-content-supplier');
    const contentPel = document.getElementById('mitra-content-pelanggan');

    if (tab === 'supplier') {
        btnSup.className = 'btn btn-primary';
        btnPel.className = 'btn btn-secondary';
        contentSup.classList.remove('hidden');
        contentPel.classList.add('hidden');
        loadSuppliers(1);
    } else {
        btnSup.className = 'btn btn-secondary';
        btnPel.className = 'btn btn-primary';
        contentSup.classList.add('hidden');
        contentPel.classList.remove('hidden');
        loadPelanggan(1);
    }
}

async function loadSupplierPelanggan() {
    switchMitraTab(currentMitraTab);
}

async function loadSuppliers(page = currentSupplierPage, pageSize = currentSupplierPageSize) {
    if (!supabaseClient) return;
    currentSupplierPage = page;
    currentSupplierPageSize = pageSize;
    const q = document.getElementById('supplier-search-input')?.value.trim() || '';
    
    try {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        
        let query = supabaseClient.from('supplier').select('*', { count: 'exact' });
        if (q) {
            query = query.or(`supplier.ilike.%${q}%,kontak_supplier.ilike.%${q}%,alamat_supplier.ilike.%${q}%`);
        }

        const { data: sups, count, error } = await query.order('supplier').range(from, to);
            
        const sBody = document.getElementById('supplier-table-body');
        const sMobile = document.getElementById('supplier-mobile-list');
        sBody.innerHTML = '';
        if (sMobile) sMobile.innerHTML = '';

        if (!error && sups) {
            sups.forEach(s => {
                const encId = encodeURIComponent(s.id_supplier || '');

                // Desktop row
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${s.id_supplier}</strong></td>
                    <td>${s.supplier}</td>
                    <td>${s.alamat_supplier || '-'}</td>
                    <td>${s.kontak_supplier || '-'}</td>
                    <td>
                        <div style="display:flex; gap:4px;">
                            <button class="btn btn-secondary" style="padding: 3px 6px; font-size: 11px;" onclick="showSupplierDetail('${encId}')">Detail</button>
                            <button class="btn btn-primary" style="padding: 3px 6px; font-size: 11px;" onclick="editSupplier('${encId}')">Edit</button>
                            <button class="btn btn-danger" style="padding: 3px 6px; font-size: 11px;" onclick="deleteSupplier('${encId}')">Hapus</button>
                        </div>
                    </td>
                `;
                sBody.appendChild(tr);

                // Mobile card
                if (sMobile) {
                    const card = document.createElement('div');
                    card.className = 'price-card-mobile';
                    card.innerHTML = `
                        <div class="price-card-header" onclick="showSupplierDetail('${encId}')" style="cursor:pointer;">
                            <div>
                                <div class="price-card-title" style="font-size:13px;">📦 ${s.supplier}</div>
                                <div class="price-card-sub">🆔 ${s.id_supplier}</div>
                            </div>
                            <span class="badge badge-info" style="font-size:10px;">SUPPLIER</span>
                        </div>
                        <div style="font-size:11.5px; color:var(--text-muted); margin-top:6px;">
                            <div>📍 ${s.alamat_supplier || 'Alamat tidak diisi'}</div>
                            <div>📞 ${s.kontak_supplier || 'Telepon tidak diisi'}</div>
                        </div>
                        <div style="display:flex; gap:6px; margin-top:8px; justify-content:flex-end;">
                            <button class="btn btn-secondary" style="padding:4px 10px; font-size:11px;" onclick="showSupplierDetail('${encId}')">👁️ Detail</button>
                            <button class="btn btn-primary" style="padding:4px 10px; font-size:11px;" onclick="editSupplier('${encId}')">✏️ Edit</button>
                            <button class="btn btn-danger" style="padding:4px 10px; font-size:11px;" onclick="deleteSupplier('${encId}')">🗑️ Hapus</button>
                        </div>
                    `;
                    sMobile.appendChild(card);
                }
            });
            const totalPages = Math.ceil((count !== null ? count : sups.length) / pageSize);
            renderPaginationControls('supplier-pagination', page, totalPages, pageSize, 'loadSuppliers');
        }
    } catch (e) {
        console.error('Error loading suppliers:', e);
    }
}

async function loadPelanggan(page = currentPelangganPage, pageSize = currentPelangganPageSize) {
    if (!supabaseClient) return;
    currentPelangganPage = page;
    currentPelangganPageSize = pageSize;
    const q = document.getElementById('pelanggan-search-input')?.value.trim() || '';
    
    try {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        
        let query = supabaseClient.from('pelanggan').select('*', { count: 'exact' });
        if (q) {
            query = query.or(`nama.ilike.%${q}%,kontak.ilike.%${q}%,alamat.ilike.%${q}%`);
        }

        const { data: csts, count, error } = await query.order('nama').range(from, to);
            
        const cBody = document.getElementById('pelanggan-table-body');
        const cMobile = document.getElementById('pelanggan-mobile-list');
        cBody.innerHTML = '';
        if (cMobile) cMobile.innerHTML = '';

        if (!error && csts) {
            csts.forEach(c => {
                const encId = encodeURIComponent(c.id_pelanggan || '');

                // Desktop row
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${c.id_pelanggan}</strong></td>
                    <td>${c.nama}</td>
                    <td>${c.alamat || '-'}</td>
                    <td><span class="badge badge-info">${c.level_harga || 'Level 1'}</span></td>
                    <td>
                        <div style="display:flex; gap:4px;">
                            <button class="btn btn-secondary" style="padding: 3px 6px; font-size: 11px;" onclick="showPelangganDetail('${encId}')">Detail</button>
                            <button class="btn btn-primary" style="padding: 3px 6px; font-size: 11px;" onclick="editPelanggan('${encId}')">Edit</button>
                            <button class="btn btn-danger" style="padding: 3px 6px; font-size: 11px;" onclick="deletePelanggan('${encId}')">Hapus</button>
                        </div>
                    </td>
                `;
                cBody.appendChild(tr);

                // Mobile card
                if (cMobile) {
                    const card = document.createElement('div');
                    card.className = 'price-card-mobile';
                    card.innerHTML = `
                        <div class="price-card-header" onclick="showPelangganDetail('${encId}')" style="cursor:pointer;">
                            <div>
                                <div class="price-card-title" style="font-size:13px;">👤 ${c.nama}</div>
                                <div class="price-card-sub">🆔 ${c.id_pelanggan} • 📞 ${c.kontak || '-'}</div>
                            </div>
                            <span class="badge badge-info" style="font-size:10px;">${c.level_harga || 'Level 1'}</span>
                        </div>
                        <div style="font-size:11.5px; color:var(--text-muted); margin-top:6px;">
                            <div>📍 ${c.alamat || 'Alamat tidak diisi'}</div>
                        </div>
                        <div style="display:flex; gap:6px; margin-top:8px; justify-content:flex-end;">
                            <button class="btn btn-secondary" style="padding:4px 10px; font-size:11px;" onclick="showPelangganDetail('${encId}')">👁️ Detail</button>
                            <button class="btn btn-primary" style="padding:4px 10px; font-size:11px;" onclick="editPelanggan('${encId}')">✏️ Edit</button>
                            <button class="btn btn-danger" style="padding:4px 10px; font-size:11px;" onclick="deletePelanggan('${encId}')">🗑️ Hapus</button>
                        </div>
                    `;
                    cMobile.appendChild(card);
                }
            });
            const totalPages = Math.ceil((count !== null ? count : csts.length) / pageSize);
            renderPaginationControls('pelanggan-pagination', page, totalPages, pageSize, 'loadPelanggan');
        }
    } catch (e) {
        console.error('Error loading pelanggan:', e);
    }
}

function showAddSupplierModal() {
    document.getElementById('modal-add-supplier').classList.remove('hidden');
}

async function submitAddSupplier(e) {
    e.preventDefault();
    const nama = document.getElementById('add-sup-nama').value.trim();
    const alamat = document.getElementById('add-sup-alamat').value.trim();
    const telp = document.getElementById('add-sup-telp').value.trim();
    
    try {
        if (!supabaseClient) return;
        const id_supplier = 'S' + Math.random().toString(36).substring(2, 8).toUpperCase();
        
        const { error } = await supabaseClient.from('supplier').insert([{
            id_supplier,
            supplier: nama,
            alamat_supplier: alamat,
            kontak_supplier: telp
        }]);

        if (error) throw error;
        alert('Supplier berhasil disimpan!');
        closeModal('modal-add-supplier');
        document.getElementById('form-add-supplier').reset();
        loadSupplierPelanggan();
    } catch (e) {
        console.error(e);
        alert('Gagal menambah supplier.');
    }
}

function showAddPelangganModal() {
    document.getElementById('modal-add-pelanggan').classList.remove('hidden');
}

async function submitAddPelanggan(e) {
    e.preventDefault();
    const nama = document.getElementById('add-pel-nama').value.trim();
    const alamat = document.getElementById('add-pel-alamat').value.trim();
    const telp = document.getElementById('add-pel-telp').value.trim();
    const level = document.getElementById('add-pel-level').value;
    
    try {
        if (!supabaseClient) return;
        const id_pelanggan = 'PL' + Math.random().toString(36).substring(2, 8).toUpperCase();
        
        const { error } = await supabaseClient.from('pelanggan').insert([{
            id_pelanggan,
            nama,
            alamat,
            kontak: telp,
            level_harga: level
        }]);

        if (error) throw error;
        alert('Pelanggan berhasil disimpan!');
        closeModal('modal-add-pelanggan');
        document.getElementById('form-add-pelanggan').reset();
        loadSupplierPelanggan();
    } catch (e) {
        console.error(e);
        alert('Gagal menambah pelanggan.');
    }
}

// SUPPLIER: DETAIL, EDIT, DELETE
async function showSupplierDetail(encId) {
    const id = decodeURIComponent(encId);
    if (!supabaseClient || !id) return;

    try {
        const { data: s } = await supabaseClient.from('supplier').select('*').eq('id_supplier', id).single();
        if (s) {
            document.getElementById('detail-sup-id').textContent = s.id_supplier;
            document.getElementById('detail-sup-nama').textContent = s.supplier;
            document.getElementById('detail-sup-alamat').textContent = s.alamat_supplier || '-';
            document.getElementById('detail-sup-telp').textContent = s.kontak_supplier || '-';
            document.getElementById('modal-detail-supplier').classList.remove('hidden');
        }
    } catch (e) {
        console.error(e);
        alert('Gagal memuat detail supplier.');
    }
}

async function editSupplier(encId) {
    const id = decodeURIComponent(encId);
    if (!supabaseClient || !id) return;

    try {
        const { data: s } = await supabaseClient.from('supplier').select('*').eq('id_supplier', id).single();
        if (s) {
            document.getElementById('edit-sup-id').value = s.id_supplier;
            document.getElementById('edit-sup-nama').value = s.supplier;
            document.getElementById('edit-sup-alamat').value = s.alamat_supplier || '';
            document.getElementById('edit-sup-telp').value = s.kontak_supplier || '';
            document.getElementById('modal-edit-supplier').classList.remove('hidden');
        }
    } catch (e) {
        console.error(e);
        alert('Gagal mengambil data supplier.');
    }
}

async function submitEditSupplier(e) {
    e.preventDefault();
    const id = document.getElementById('edit-sup-id').value;
    const nama = document.getElementById('edit-sup-nama').value.trim();
    const alamat = document.getElementById('edit-sup-alamat').value.trim();
    const telp = document.getElementById('edit-sup-telp').value.trim();

    try {
        if (!supabaseClient) return;
        const { error } = await supabaseClient.from('supplier').update({
            supplier: nama,
            alamat_supplier: alamat,
            kontak_supplier: telp
        }).eq('id_supplier', id);

        if (error) throw error;
        alert('Data supplier berhasil diperbarui!');
        closeModal('modal-edit-supplier');
        loadSuppliers();
    } catch (e) {
        console.error(e);
        alert('Gagal memperbarui data supplier.');
    }
}

async function deleteSupplier(encId) {
    const id = decodeURIComponent(encId);
    if (!id) return;
    if (!confirm(`Apakah Anda yakin ingin menghapus Supplier "${id}"?`)) return;

    try {
        if (!supabaseClient) return;
        const { error } = await supabaseClient.from('supplier').delete().eq('id_supplier', id);
        if (error) throw error;
        alert('Supplier berhasil dihapus!');
        loadSuppliers();
    } catch (e) {
        console.error(e);
        alert('Gagal menghapus supplier.');
    }
}

// PELANGGAN: DETAIL, EDIT, DELETE
async function showPelangganDetail(encId) {
    const id = decodeURIComponent(encId);
    if (!supabaseClient || !id) return;

    try {
        const { data: c } = await supabaseClient.from('pelanggan').select('*').eq('id_pelanggan', id).single();
        if (c) {
            document.getElementById('detail-pel-id').textContent = c.id_pelanggan;
            document.getElementById('detail-pel-nama').textContent = c.nama;
            document.getElementById('detail-pel-alamat').textContent = c.alamat || '-';
            document.getElementById('detail-pel-telp').textContent = c.kontak || '-';
            document.getElementById('detail-pel-level').textContent = c.level_harga || 'Level 1';
            document.getElementById('modal-detail-pelanggan').classList.remove('hidden');
        }
    } catch (e) {
        console.error(e);
        alert('Gagal memuat detail pelanggan.');
    }
}

async function editPelanggan(encId) {
    const id = decodeURIComponent(encId);
    if (!supabaseClient || !id) return;

    try {
        const { data: c } = await supabaseClient.from('pelanggan').select('*').eq('id_pelanggan', id).single();
        if (c) {
            document.getElementById('edit-pel-id').value = c.id_pelanggan;
            document.getElementById('edit-pel-nama').value = c.nama;
            document.getElementById('edit-pel-alamat').value = c.alamat || '';
            document.getElementById('edit-pel-telp').value = c.kontak || '';
            document.getElementById('edit-pel-level').value = c.level_harga || 'Level 1';
            document.getElementById('modal-edit-pelanggan').classList.remove('hidden');
        }
    } catch (e) {
        console.error(e);
        alert('Gagal mengambil data pelanggan.');
    }
}

async function submitEditPelanggan(e) {
    e.preventDefault();
    const id = document.getElementById('edit-pel-id').value;
    const nama = document.getElementById('edit-pel-nama').value.trim();
    const alamat = document.getElementById('edit-pel-alamat').value.trim();
    const telp = document.getElementById('edit-pel-telp').value.trim();
    const level = document.getElementById('edit-pel-level').value;

    try {
        if (!supabaseClient) return;
        const { error } = await supabaseClient.from('pelanggan').update({
            nama: nama,
            alamat: alamat,
            kontak: telp,
            level_harga: level
        }).eq('id_pelanggan', id);

        if (error) throw error;
        alert('Data pelanggan berhasil diperbarui!');
        closeModal('modal-edit-pelanggan');
        loadPelanggan();
    } catch (e) {
        console.error(e);
        alert('Gagal memperbarui data pelanggan.');
    }
}

async function deletePelanggan(encId) {
    const id = decodeURIComponent(encId);
    if (!id) return;
    if (!confirm(`Apakah Anda yakin ingin menghapus Pelanggan "${id}"?`)) return;

    try {
        if (!supabaseClient) return;
        const { error } = await supabaseClient.from('pelanggan').delete().eq('id_pelanggan', id);
        if (error) throw error;
        alert('Pelanggan berhasil dihapus!');
        loadPelanggan();
    } catch (e) {
        console.error(e);
        alert('Gagal menghapus pelanggan.');
    }
}

// --------------------------------------------------------------------------
// 12. INFO APLIKASI & STATS
// --------------------------------------------------------------------------
async function loadInfoStats() {
    try {
        if (!supabaseClient) return;
        const { count: totalObat } = await supabaseClient.from('master_obat').select('*', { count: 'exact', head: true });
        const { count: totalTrans } = await supabaseClient.from('transaksi_jual').select('*', { count: 'exact', head: true });
        const { count: totalPel } = await supabaseClient.from('pelanggan').select('*', { count: 'exact', head: true });
        const { count: totalSup } = await supabaseClient.from('supplier').select('*', { count: 'exact', head: true });
        
        document.getElementById('info-total-obat').textContent = totalObat || '0';
        document.getElementById('info-total-transaksi').textContent = totalTrans || '0';
        document.getElementById('info-total-pelanggan').textContent = totalPel || '0';
        document.getElementById('info-total-supplier').textContent = totalSup || '0';

        const userEl = document.getElementById('info-current-user');
        if (userEl) {
            userEl.textContent = currentUser ? `${currentUser.nama_staf || currentUser.user} (${currentUser.role || 'Staf'})` : 'Staf Kasir Apotek';
        }
    } catch (e) {
        console.error('Error loading stats:', e);
    }
}

// --------------------------------------------------------------------------
// HELPERS & UTILITIES
// --------------------------------------------------------------------------
async function loadAllDropdowns() {
    try {
        if (!supabaseClient) return;
        const { data } = await supabaseClient.from('master_obat').select('*').order('nama_obat').limit(500);
        medicinesList = data || [];
    } catch (e) {
        console.error(e);
    }
}

function populateObatDropdown(elementId) {
    const select = document.getElementById(elementId);
    select.innerHTML = '<option value="" disabled selected>Pilih Obat...</option>';
    medicinesList.forEach(o => {
        const opt = document.createElement('option');
        opt.value = JSON.stringify(o);
        opt.textContent = `${o.id_obat} - ${o.nama_obat}`;
        select.appendChild(opt);
    });
}

function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

function formatMoney(amount) {
    if (amount === undefined || amount === null || isNaN(amount)) return '0';
    return Number(amount).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function getPriceForLevel(o, satLevel, custLevel) {
    const lvlNum = custLevel === 'Level 3' ? 3 : (custLevel === 'Level 2' ? 2 : 1);
    const satNum = satLevel === 'Satuan 3' ? 3 : (satLevel === 'Satuan 2' ? 2 : 1);
    
    const key = `harga_l${lvlNum}_s${satNum}`;
    const fallbackKey = `harga_l1_s${satNum}`;
    
    let price = parseFloat(o[key] || 0);
    if (price === 0) {
        price = parseFloat(o[fallbackKey] || 0);
    }
    return price;
}

// Mobile POS Tab Switching
function switchPOSTab(tabName) {
    const catTab = document.getElementById('pos-tab-catalog');
    const cartTab = document.getElementById('pos-tab-cart');
    const catCont = document.getElementById('pos-catalog-container');
    const cartCont = document.getElementById('pos-cart-container');
    
    if (!catTab || !cartTab || !catCont || !cartCont) return;

    if (tabName === 'catalog') {
        catTab.classList.add('active');
        cartTab.classList.remove('active');
        catCont.classList.remove('mobile-hidden');
        cartCont.classList.add('mobile-hidden');
    } else {
        cartTab.classList.add('active');
        catTab.classList.remove('active');
        catCont.classList.add('mobile-hidden');
        cartCont.classList.remove('mobile-hidden');
    }
}

// --------------------------------------------------------------------------
// CAMERA BARCODE / QR CODE SCANNER
// --------------------------------------------------------------------------
let html5QrcodeScannerInstance = null;

function playScanBeep() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1046.5, audioCtx.currentTime); // High C pitch
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12);
    } catch (e) {
        console.log('Audio Context beep:', e);
    }
}

async function openCameraScanner(targetInputId, onScanComplete) {
    const modal = document.getElementById('modal-barcode-scanner');
    if (!modal) return;
    modal.classList.remove('hidden');

    if (typeof Html5Qrcode === 'undefined') {
        alert('Library scanner kamera belum selesai dimuat. Harap periksa jaringan internet Anda.');
        return;
    }

    try {
        if (html5QrcodeScannerInstance) {
            await stopScannerInstance();
        }

        html5QrcodeScannerInstance = new Html5Qrcode("qr-reader");
        const config = { fps: 15, qrbox: { width: 240, height: 150 } };

        // Start back camera ('environment')
        html5QrcodeScannerInstance.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
                playScanBeep();
                const targetInput = document.getElementById(targetInputId);
                if (targetInput) {
                    targetInput.value = decodedText;
                }
                closeCameraScanner();
                if (typeof onScanComplete === 'function') {
                    onScanComplete();
                }
            },
            (errorMessage) => {
                // Ignore silent frame errors while scanning
            }
        ).catch(err => {
            console.error('Camera start failed:', err);
            alert('Tidak dapat membuka kamera. Pastikan izin akses kamera diberikan pada browser HP Anda.');
            closeCameraScanner();
        });
    } catch (err) {
        console.error('Scanner init error:', err);
        alert('Gagal mengaktifkan scanner kamera.');
        closeCameraScanner();
    }
}

async function stopScannerInstance() {
    if (html5QrcodeScannerInstance) {
        try {
            await html5QrcodeScannerInstance.stop();
            html5QrcodeScannerInstance.clear();
        } catch (e) {
            console.log('Stop scanner error:', e);
        }
        html5QrcodeScannerInstance = null;
    }
}

async function closeCameraScanner() {
    await stopScannerInstance();
    const modal = document.getElementById('modal-barcode-scanner');
    if (modal) modal.classList.add('hidden');
}

// --------------------------------------------------------------------------
// PENGATURAN SISTEM & USER MANAGEMENT (ADMIN ONLY)
// --------------------------------------------------------------------------

// 1. Settings Tab Switcher
function switchSettingsTab(tabName) {
    const appPanel = document.getElementById('settings-panel-app');
    const usersPanel = document.getElementById('settings-panel-users');
    const appBtn = document.getElementById('tab-btn-settings-app');
    const usersBtn = document.getElementById('tab-btn-settings-users');

    if (!appPanel || !usersPanel) return;

    if (tabName === 'app') {
        appPanel.classList.remove('hidden');
        usersPanel.classList.add('hidden');
        if (appBtn) { appBtn.className = 'btn btn-primary'; }
        if (usersBtn) { usersBtn.className = 'btn btn-secondary'; }
    } else {
        appPanel.classList.add('hidden');
        usersPanel.classList.remove('hidden');
        if (appBtn) { appBtn.className = 'btn btn-secondary'; }
        if (usersBtn) { usersBtn.className = 'btn btn-primary'; }
        loadUserManagement();
    }
}

// 2. Image Preview Handler
function previewSettingImage(fileInputId, previewImgId) {
    const input = document.getElementById(fileInputId);
    const preview = document.getElementById(previewImgId);
    if (input && input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            updateAppIdentityPreview();
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function updateAppIdentityPreview() {
    const nameVal = document.getElementById('setting-app-name')?.value.trim() || 'Apotek HF';
    const addrVal = document.getElementById('setting-app-address')?.value.trim() || 'Makassar';
    const logoSrc = document.getElementById('setting-logo-preview')?.src || 'logo_hf.png';
    const favSrc = document.getElementById('setting-favicon-preview')?.src || 'logo_hf.png';

    const mTabTitle = document.getElementById('mock-tab-title');
    const mFavIcon = document.getElementById('mock-favicon-img');
    const mSidebarLogo = document.getElementById('mock-sidebar-logo');
    const mSidebarName = document.getElementById('mock-sidebar-name');
    const mReceiptAddr = document.getElementById('mock-receipt-address');

    if (mTabTitle) mTabTitle.textContent = nameVal;
    if (mFavIcon) mFavIcon.src = favSrc;
    if (mSidebarLogo) mSidebarLogo.src = logoSrc;
    if (mSidebarName) mSidebarName.textContent = nameVal.toUpperCase();
    if (mReceiptAddr) mReceiptAddr.textContent = addrVal;
}

// 3. App Settings Persistence (App Title, Address, Logo, Favicon)
function loadAppSettings() {
    try {
        const appName = localStorage.getItem('app_name') || 'Apotek HF';
        const appAddress = localStorage.getItem('app_address') || 'Makassar';
        const appLogo = localStorage.getItem('app_logo') || 'logo_hf.png';
        const appFavicon = localStorage.getItem('app_favicon') || 'logo_hf.png';

        // Update Document Title
        document.title = appName;

        // Update Brand Names
        document.querySelectorAll('.brand-name').forEach(el => {
            el.textContent = appName;
        });

        // Update Sidebar & Login Logos
        document.querySelectorAll('.sidebar-brand img, .login-card img').forEach(img => {
            img.src = appLogo;
        });

        // Update Favicon Link
        let faviconLink = document.querySelector("link[rel*='icon']");
        if (!faviconLink) {
            faviconLink = document.createElement('link');
            faviconLink.rel = 'icon';
            document.head.appendChild(faviconLink);
        }
        faviconLink.href = appFavicon;

        // Populate Form Inputs if on settings view
        const nameInput = document.getElementById('setting-app-name');
        const addrInput = document.getElementById('setting-app-address');
        const logoPrev = document.getElementById('setting-logo-preview');
        const favPrev = document.getElementById('setting-favicon-preview');
        
        if (nameInput) nameInput.value = appName;
        if (addrInput) addrInput.value = appAddress;
        if (logoPrev) logoPrev.src = appLogo;
        if (favPrev) favPrev.src = appFavicon;

        updateAppIdentityPreview();
    } catch (e) {
        console.error('Error loading app settings:', e);
    }
}

function saveAppSettings(e) {
    if (e) e.preventDefault();
    try {
        const appName = document.getElementById('setting-app-name')?.value.trim() || 'Apotek HF';
        const appAddress = document.getElementById('setting-app-address')?.value.trim() || 'Makassar';
        const logoPreview = document.getElementById('setting-logo-preview');
        const faviconPreview = document.getElementById('setting-favicon-preview');

        const appLogo = logoPreview ? logoPreview.src : 'logo_hf.png';
        const appFavicon = faviconPreview ? faviconPreview.src : 'logo_hf.png';

        localStorage.setItem('app_name', appName);
        localStorage.setItem('app_address', appAddress);
        localStorage.setItem('app_logo', appLogo);
        localStorage.setItem('app_favicon', appFavicon);

        loadAppSettings();
        alert('Pengaturan identitas aplikasi berhasil disimpan!');
    } catch (err) {
        console.error('Error saving app settings:', err);
        alert('Gagal menyimpan pengaturan aplikasi: ' + err.message);
    }
}

function resetAppSettingsDefault() {
    if (confirm('Kembalikan semua pengaturan identitas aplikasi ke default?')) {
        localStorage.removeItem('app_name');
        localStorage.removeItem('app_address');
        localStorage.removeItem('app_logo');
        localStorage.removeItem('app_favicon');
        loadAppSettings();
        alert('Pengaturan aplikasi dikembalikan ke default!');
    }
}

// 4. User Management Logic (user_login Table)
let userManagementData = [];

async function loadUserManagement() {
    try {
        if (!supabaseClient) return;
        const { data, error } = await supabaseClient
            .from('user_login')
            .select('*')
            .order('nama_staf');

        const tbody = document.getElementById('user-table-body');
        const mobileList = document.getElementById('user-mobile-list');
        if (tbody) tbody.innerHTML = '';
        if (mobileList) mobileList.innerHTML = '';

        if (!error && data) {
            userManagementData = data;
            renderUserManagementTable(userManagementData);
        }
    } catch (e) {
        console.error('Error loading user management:', e);
    }
}

function renderUserManagementTable(users) {
    const tbody = document.getElementById('user-table-body');
    const mobileList = document.getElementById('user-mobile-list');
    if (tbody) tbody.innerHTML = '';
    if (mobileList) mobileList.innerHTML = '';

    // Update Stat Cards
    const totalCount = userManagementData.length;
    const adminCount = userManagementData.filter(u => String(u.role || '').toUpperCase() === 'ADMIN').length;
    const kasirCount = userManagementData.filter(u => String(u.role || '').toUpperCase() === 'KASIR').length;
    const apotekerCount = userManagementData.filter(u => String(u.role || '').toUpperCase() === 'APOTEKER').length;

    const elTotal = document.getElementById('user-stat-total');
    const elAdmin = document.getElementById('user-stat-admin');
    const elKasir = document.getElementById('user-stat-kasir');
    const elApoteker = document.getElementById('user-stat-apoteker');

    if (elTotal) elTotal.textContent = totalCount;
    if (elAdmin) elAdmin.textContent = adminCount;
    if (elKasir) elKasir.textContent = kasirCount;
    if (elApoteker) elApoteker.textContent = apotekerCount;

    if (!users || users.length === 0) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--text-muted); font-size:13px;">Tidak ada data staf ditemukan.</td></tr>';
        if (mobileList) mobileList.innerHTML = '<div style="text-align:center; padding:30px; color:var(--text-muted); font-size:13px;">Tidak ada data staf.</div>';
        return;
    }

    users.forEach((u, idx) => {
        const cleanPin = String(u.pin || '').replace(/\.0$/, '');
        const roleUpper = String(u.role || '').toUpperCase();
        
        let roleBadgeHTML = '';
        let avatarBg = '#3b82f6';
        if (roleUpper === 'ADMIN') {
            roleBadgeHTML = '<span class="badge" style="background:#f3e8ff; color:#7e22ce; border:1px solid #e9d5ff; font-weight:700; font-size:11px; padding:4px 10px;">🛡️ ADMIN</span>';
            avatarBg = '#7e22ce';
        } else if (roleUpper === 'APOTEKER') {
            roleBadgeHTML = '<span class="badge" style="background:#fef3c7; color:#b45309; border:1px solid #fde68a; font-weight:700; font-size:11px; padding:4px 10px;">💊 APOTEKER</span>';
            avatarBg = '#d97706';
        } else {
            roleBadgeHTML = '<span class="badge" style="background:#ecfdf5; color:#047857; border:1px solid #a7f3d0; font-weight:700; font-size:11px; padding:4px 10px;">💻 KASIR</span>';
            avatarBg = '#10b981';
        }

        const initial = (u.nama_staf || '?').substring(0, 1).toUpperCase();
        const encId = encodeURIComponent(u.id || u.user);
        const pinToggleId = `pin-val-${idx}`;

        // Desktop Table Row
        if (tbody) {
            const tr = document.createElement('tr');
            tr.style.cssText = 'border-bottom: 1px solid var(--border-color); transition: background 0.15s ease;';
            tr.innerHTML = `
                <td style="padding: 12px 16px;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div style="width:38px; height:38px; border-radius:50%; background:${avatarBg}; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:15px; flex-shrink:0;">
                            ${initial}
                        </div>
                        <div>
                            <div style="font-weight:700; font-size:13.5px; color:var(--text-main);">${u.nama_staf || '-'}</div>
                            <div style="font-size:11.5px; color:var(--text-muted);">ID: ${u.id || '-'}</div>
                        </div>
                    </div>
                </td>
                <td style="padding: 12px 16px;">
                    <code style="background:var(--bg-main); padding:3px 8px; border-radius:6px; font-weight:700; color:var(--primary-color); border:1px solid var(--border-color); font-size:12px;">${u.user || '-'}</code>
                </td>
                <td style="padding: 12px 16px;">
                    ${roleBadgeHTML}
                </td>
                <td style="padding: 12px 16px;">
                    <div style="display:flex; align-items:center; gap:6px;">
                        <span id="${pinToggleId}" style="font-family:monospace; font-weight:700; letter-spacing:2px; font-size:13px;">••••••</span>
                        <button type="button" class="btn btn-secondary" style="padding:2px 6px; font-size:11px;" onclick="toggleShowPin('${pinToggleId}', '${cleanPin}')" title="Lihat PIN">👁️</button>
                    </div>
                </td>
                <td style="padding: 12px 16px;">
                    <span class="badge" style="background:#ecfdf5; color:#10b981; font-weight:600; font-size:11px;">🟢 Aktif</span>
                </td>
                <td style="padding: 12px 16px; text-align: right;">
                    <div style="display:flex; gap:6px; justify-content:flex-end;">
                        <button class="btn btn-secondary" style="padding: 5px 10px; font-size: 11.5px; font-weight:600;" onclick="openEditUserModal('${encId}')">✏️ Edit</button>
                        <button class="btn btn-danger" style="padding: 5px 10px; font-size: 11.5px; font-weight:600;" onclick="deleteUser('${encId}')">🗑️ Hapus</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        }

        // Mobile Card
        if (mobileList) {
            const card = document.createElement('div');
            card.className = 'price-card-mobile';
            card.style.cssText = 'background:var(--bg-card); border:1px solid var(--border-color); border-radius:12px; padding:14px; box-shadow:0 2px 8px rgba(0,0,0,0.04);';
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="width:36px; height:36px; border-radius:50%; background:${avatarBg}; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:14px; flex-shrink:0;">
                            ${initial}
                        </div>
                        <div>
                            <div style="font-size:14px; font-weight:700; color:var(--text-main);">${u.nama_staf || '-'}</div>
                            <div style="font-size:11.5px; color:var(--text-muted);">Username: <code style="color:var(--primary-color); font-weight:700;">${u.user || '-'}</code></div>
                        </div>
                    </div>
                    ${roleBadgeHTML}
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-main); padding:8px 12px; border-radius:8px; border:1px solid var(--border-color); font-size:12px; margin-bottom:10px;">
                    <span style="color:var(--text-muted);">PIN Akses:</span>
                    <div style="display:flex; align-items:center; gap:6px;">
                        <span id="m-${pinToggleId}" style="font-family:monospace; font-weight:700;">••••••</span>
                        <button type="button" class="btn btn-secondary" style="padding:1px 5px; font-size:10px;" onclick="toggleShowPin('m-${pinToggleId}', '${cleanPin}')">👁️</button>
                    </div>
                </div>
                <div style="display:flex; justify-content:flex-end; gap:8px;">
                    <button class="btn btn-secondary" style="flex:1; padding:6px 10px; font-size:12px; font-weight:600;" onclick="openEditUserModal('${encId}')">✏️ Edit Data</button>
                    <button class="btn btn-danger" style="flex:1; padding:6px 10px; font-size:12px; font-weight:600;" onclick="deleteUser('${encId}')">🗑️ Hapus</button>
                </div>
            `;
            mobileList.appendChild(card);
        }
    });
}

function toggleShowPin(elementId, realPin) {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (el.textContent === '••••••' || el.textContent === '••••') {
        el.textContent = realPin || '(Kosong)';
        el.style.color = 'var(--primary-color)';
    } else {
        el.textContent = '••••••';
        el.style.color = 'inherit';
    }
}

let currentUserRoleFilter = '';
function filterUserRole(role) {
    currentUserRoleFilter = role;
    filterUserManagementTable();
}

function filterUserManagementTable() {
    const q = document.getElementById('user-search-input')?.value.toLowerCase().trim() || '';
    let filtered = userManagementData;

    if (currentUserRoleFilter) {
        filtered = filtered.filter(u => String(u.role || '').toUpperCase() === currentUserRoleFilter);
    }

    if (q) {
        filtered = filtered.filter(u => 
            String(u.nama_staf || '').toLowerCase().includes(q) ||
            String(u.user || '').toLowerCase().includes(q) ||
            String(u.role || '').toLowerCase().includes(q)
        );
    }

    renderUserManagementTable(filtered);
}

function openAddUserModal() {
    const form = document.getElementById('form-add-user');
    if (form) form.reset();
    document.getElementById('modal-add-user')?.classList.remove('hidden');
}

async function submitAddUser(e) {
    if (e) e.preventDefault();
    const nama = document.getElementById('add-user-nama')?.value.trim();
    const userCode = document.getElementById('add-user-user')?.value.trim().toUpperCase();
    const pin = document.getElementById('add-user-pin')?.value.trim();
    const role = document.getElementById('add-user-role')?.value;

    if (!nama || !userCode || !pin || !role) {
        alert('Lengkapi semua data staf!');
        return;
    }

    try {
        if (!supabaseClient) return;
        const newId = String(Date.now());
        const { error } = await supabaseClient.from('user_login').insert([{
            id: newId,
            user: userCode,
            nama_staf: nama,
            pin: pin,
            role: role,
            kode: '1.0'
        }]);

        if (error) throw error;

        alert(`Staf "${nama}" (${role}) berhasil ditambahkan!`);
        closeModal('modal-add-user');
        loadUserManagement();
        loadLoginUsers();
    } catch (err) {
        console.error('Add user error:', err);
        alert('Gagal menambah staf: ' + err.message);
    }
}

function openEditUserModal(encId) {
    const rawId = decodeURIComponent(encId);
    const u = userManagementData.find(x => String(x.id) === rawId || String(x.user) === rawId);
    if (!u) return;

    document.getElementById('edit-user-id').value = u.id || u.user;
    document.getElementById('edit-user-nama').value = u.nama_staf || '';
    document.getElementById('edit-user-user').value = u.user || '';
    document.getElementById('edit-user-pin').value = '';
    document.getElementById('edit-user-role').value = (u.role || 'KASIR').toUpperCase();

    document.getElementById('modal-edit-user')?.classList.remove('hidden');
}

async function submitEditUser(e) {
    if (e) e.preventDefault();
    const id = document.getElementById('edit-user-id')?.value;
    const nama = document.getElementById('edit-user-nama')?.value.trim();
    const pin = document.getElementById('edit-user-pin')?.value.trim();
    const role = document.getElementById('edit-user-role')?.value;

    if (!id || !nama || !role) {
        alert('Lengkapi data staf!');
        return;
    }

    try {
        if (!supabaseClient) return;
        const updatePayload = {
            nama_staf: nama,
            role: role
        };
        if (pin) {
            updatePayload.pin = pin;
        }

        const { error } = await supabaseClient
            .from('user_login')
            .update(updatePayload)
            .or(`id.eq.${id},user.eq.${id}`);

        if (error) throw error;

        alert('Data staf berhasil diperbarui!');
        closeModal('modal-edit-user');
        loadUserManagement();
        loadLoginUsers();
    } catch (err) {
        console.error('Edit user error:', err);
        alert('Gagal memperbarui staf: ' + err.message);
    }
}

async function deleteUser(encId) {
    const rawId = decodeURIComponent(encId);
    const u = userManagementData.find(x => String(x.id) === rawId || String(x.user) === rawId);
    if (!u) return;

    if (currentUser && (currentUser.user === u.user || currentUser.id === u.id)) {
        alert('Anda tidak dapat menghapus akun Anda sendiri yang sedang digunakan!');
        return;
    }

    if (confirm(`Hapus staf "${u.nama_staf}" (${u.user}) dari sistem?`)) {
        try {
            if (!supabaseClient) return;
            const { error } = await supabaseClient
                .from('user_login')
                .delete()
                .or(`id.eq.${rawId},user.eq.${rawId}`);

            if (error) throw error;

            alert(`Staf "${u.nama_staf}" berhasil dihapus.`);
            loadUserManagement();
            loadLoginUsers();
        } catch (err) {
            console.error('Delete user error:', err);
            alert('Gagal menghapus staf: ' + err.message);
        }
    }
}
