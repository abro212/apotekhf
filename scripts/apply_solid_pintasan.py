import re

def update_app_js(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    old_code = "card.className = 'menu-card';"
    new_code = "card.className = 'menu-card';\n        card.setAttribute('data-menu', item.menu);"
    
    if old_code in content:
        content = content.replace(old_code, new_code, 1)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")
    else:
        print(f"Could not find old_code in {filepath}")

def update_style_css(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Old menu-card CSS block
    old_css_pattern = re.compile(
        r'\.menu-card\s*\{.*?\n\.menu-card-title\s*\{.*?\n\}',
        re.DOTALL
    )

    new_css = '''.menu-card {
    background-color: #0d9488;
    border: none !important;
    border-radius: var(--radius-md);
    overflow: hidden;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    color: #ffffff !important;
}

.menu-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.18);
    filter: brightness(1.08);
}

.menu-card-icon-wrapper {
    width: 100%;
    height: 105px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(255, 255, 255, 0.15) !important;
    color: #ffffff !important;
    transition: var(--transition);
}

.menu-card:hover .menu-card-icon-wrapper {
    background-color: rgba(255, 255, 255, 0.25) !important;
    color: #ffffff !important;
}

.menu-icon {
    width: 40px;
    height: 40px;
    stroke-width: 2.2px;
    stroke: #ffffff !important;
}

.menu-card-title {
    padding: 12px 14px;
    font-size: 13px;
    font-weight: 700;
    color: #ffffff !important;
    text-align: center;
    background-color: transparent !important;
    border-top: 1px solid rgba(255, 255, 255, 0.18) !important;
    letter-spacing: 0.2px;
}

/* SOLID RICH COLORS FOR EACH SHORTCUT MENU (ZERO PASTEL) */
.menu-card[data-menu="Cek Harga"],
.menu-grid > .menu-card:nth-child(12n + 1) {
    background: #0284c7 !important; /* Solid Sky Blue */
}

.menu-card[data-menu="KASIR"],
.menu-grid > .menu-card:nth-child(12n + 2) {
    background: #059669 !important; /* Solid Emerald Green */
}

.menu-card[data-menu="Master Obat"],
.menu-grid > .menu-card:nth-child(12n + 3) {
    background: #0d9488 !important; /* Solid Teal */
}

.menu-card[data-menu="Menu Penjualan"],
.menu-grid > .menu-card:nth-child(12n + 4) {
    background: #2563eb !important; /* Solid Royal Blue */
}

.menu-card[data-menu="Menu Pembelian"],
.menu-grid > .menu-card:nth-child(12n + 5) {
    background: #d97706 !important; /* Solid Amber */
}

.menu-card[data-menu="Menu Laporan"],
.menu-grid > .menu-card:nth-child(12n + 6) {
    background: #7c3aed !important; /* Solid Violet */
}

.menu-card[data-menu="Menu Tagihan"],
.menu-grid > .menu-card:nth-child(12n + 7) {
    background: #dc2626 !important; /* Solid Crimson Red */
}

.menu-card[data-menu="Dokumentasi Faktur"],
.menu-grid > .menu-card:nth-child(12n + 8) {
    background: #475569 !important; /* Solid Slate */
}

.menu-card[data-menu="Menu Stok Opname"],
.menu-grid > .menu-card:nth-child(12n + 9) {
    background: #0891b2 !important; /* Solid Cyan */
}

.menu-card[data-menu="Cek Kesehatan"],
.menu-grid > .menu-card:nth-child(12n + 10) {
    background: #e11d48 !important; /* Solid Rose */
}

.menu-card[data-menu="KAS"],
.menu-grid > .menu-card:nth-child(12n + 11) {
    background: #16a34a !important; /* Solid Forest Green */
}

.menu-card[data-menu="Supplier dan Pelanggan"],
.menu-grid > .menu-card:nth-child(12n + 12) {
    background: #6366f1 !important; /* Solid Indigo */
}'''

    if old_css_pattern.search(content):
        content = old_css_pattern.sub(new_css, content, count=1)
        
        # Also clean up mobile overrides so they don't break solid cards
        old_mobile = '''.menu-card {
        padding: 14px;
        border-radius: var(--radius-md);
        touch-action: manipulation;
    }
    
    .menu-card:active {
        transform: scale(0.96);
        background: rgba(13, 148, 136, 0.05);
    }
    
    .menu-card-icon-wrapper {
        height: 64px;
        margin-bottom: 8px;
    }
    
    .menu-icon {
        width: 28px;
        height: 28px;
    }
    
    .menu-card-title {
        font-size: 11px;
        padding: 0;
        font-weight: 600;
    }'''
        new_mobile = '''.menu-card {
        padding: 0 !important;
        border-radius: var(--radius-md);
        touch-action: manipulation;
        overflow: hidden;
    }
    
    .menu-card:active {
        transform: scale(0.96);
        filter: brightness(0.9);
    }
    
    .menu-card-icon-wrapper {
        height: 64px;
        margin-bottom: 0;
    }
    
    .menu-icon {
        width: 28px;
        height: 28px;
        stroke: #ffffff !important;
    }
    
    .menu-card-title {
        font-size: 11px;
        padding: 8px 6px !important;
        font-weight: 700;
        color: #ffffff !important;
    }'''
        if old_mobile in content:
            content = content.replace(old_mobile, new_mobile)
            
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated CSS {filepath}")
    else:
        print(f"Pattern not found in {filepath}")

update_app_js('app.js')
update_app_js('public/app.js')
update_style_css('style.css')
update_style_css('public/style.css')
