def patch_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. In updateCartUI:
    old_empty_cart = """    if (cart.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:40px 10px; color:var(--text-muted);">
                <div style="font-size:36px; margin-bottom:8px;"></div>
                <div style="font-size:13px; font-weight:600;">Keranjang Masih Kosong</div>
                <div style="font-size:11.5px; margin-top:4px;">Klik barang di sebelah kiri untuk menambah ke keranjang</div>
            </div>
        `;
        document.getElementById('pos-grand-total').textContent = 'Rp 0';
        const badge = document.getElementById('pos-cart-count-badge');
        if (badge) badge.textContent = '0';
        return;
    }"""

    new_empty_cart = """    if (cart.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:40px 10px; color:var(--text-muted);">
                <div style="font-size:36px; margin-bottom:8px;"></div>
                <div style="font-size:13px; font-weight:600;">Keranjang Masih Kosong</div>
                <div style="font-size:11.5px; margin-top:4px;">Klik barang di sebelah kiri untuk menambah ke keranjang</div>
            </div>
        `;
        document.getElementById('pos-grand-total').textContent = 'Rp 0';
        const badge = document.getElementById('pos-cart-count-badge');
        if (badge) badge.textContent = '0';

        // Reset payment & change display to 0
        const bayarInput = document.getElementById('pos-cart-bayar-input');
        if (bayarInput) bayarInput.value = '';
        const kembalianDisplay = document.getElementById('pos-cart-kembalian-display');
        if (kembalianDisplay) {
            kembalianDisplay.textContent = 'Rp 0';
            kembalianDisplay.style.color = '#047857';
        }
        const kembalianRow = document.getElementById('pos-cart-kembalian-row');
        if (kembalianRow) {
            kembalianRow.style.background = '#ecfdf5';
            kembalianRow.style.borderColor = '#a7f3d0';
        }
        return;
    }"""

    # 2. In updatePosCartTotals:
    old_totals = """    if (method === 'CASH') {
        if (bayarRow) bayarRow.style.display = 'flex';
        if (kembalianRow) kembalianRow.style.display = 'flex';

        const uangBayar = parseFloat(bayarInput?.value || 0);
        const kembalian = uangBayar - totalHarga;"""

    new_totals = """    if (method === 'CASH') {
        if (bayarRow) bayarRow.style.display = 'flex';
        if (kembalianRow) kembalianRow.style.display = 'flex';

        const uangBayar = parseFloat(bayarInput?.value || 0);
        if (totalHarga === 0 || uangBayar === 0) {
            if (kembalianDisplay) {
                kembalianDisplay.textContent = 'Rp 0';
                kembalianDisplay.style.color = '#047857';
            }
            if (kembalianRow) {
                kembalianRow.style.background = '#ecfdf5';
                kembalianRow.style.borderColor = '#a7f3d0';
            }
            return;
        }
        const kembalian = uangBayar - totalHarga;"""

    # 3. In posCheckout:
    old_checkout_end = """        alert(`Checkout & Pembayaran Berhasil!${payMethod === 'CASH' ? '\\nKembalian: Rp ' + formatMoney(kembalian) : ''}`);
        showReceipt(id_jual, totalHarga, tanggalStr, uangBayar, kembalian);
        initPOS();
        if (bayarInput) bayarInput.value = '';"""

    new_checkout_end = """        alert(`Checkout & Pembayaran Berhasil!${payMethod === 'CASH' ? '\\nKembalian: Rp ' + formatMoney(kembalian) : ''}`);
        showReceipt(id_jual, totalHarga, tanggalStr, uangBayar, kembalian);

        // Reset payment & change display to 0
        if (bayarInput) bayarInput.value = '';
        const kembalianDisplay = document.getElementById('pos-cart-kembalian-display');
        if (kembalianDisplay) {
            kembalianDisplay.textContent = 'Rp 0';
            kembalianDisplay.style.color = '#047857';
        }
        const kembalianRow = document.getElementById('pos-cart-kembalian-row');
        if (kembalianRow) {
            kembalianRow.style.background = '#ecfdf5';
            kembalianRow.style.borderColor = '#a7f3d0';
        }

        initPOS();"""

    content_n = content.replace('\r\n', '\n')
    
    # helper for flexible whitespace replace
    import re
    # 1. empty cart
    p1 = re.compile(r'if\s*\(cart\.length\s*===\s*0\)\s*\{\s*container\.innerHTML\s*=.*?'
                    r'if\s*\(badge\)\s*badge\.textContent\s*=\s*[\'"]0[\'"];\s*return;\s*\}', re.DOTALL)
    if p1.search(content_n):
        content_n = p1.sub(new_empty_cart.strip(), content_n, count=1)
        print(f"Patched empty cart in {filepath}")
    else:
        print(f"Could not find empty cart in {filepath}")

    # 2. update totals
    p2 = re.compile(r'if\s*\(method\s*===\s*[\'"]CASH[\'"]\)\s*\{\s*if\s*\(bayarRow\)\s*bayarRow\.style\.display\s*=\s*[\'"]flex[\'"];\s*'
                    r'if\s*\(kembalianRow\)\s*kembalianRow\.style\.display\s*=\s*[\'"]flex[\'"];\s*'
                    r'const\s*uangBayar\s*=\s*parseFloat\(bayarInput\?\.value\s*\|\|\s*0\);\s*'
                    r'const\s*kembalian\s*=\s*uangBayar\s*-\s*totalHarga;', re.DOTALL)
    if p2.search(content_n):
        content_n = p2.sub(new_totals.strip(), content_n, count=1)
        print(f"Patched totals in {filepath}")
    else:
        print(f"Could not find totals in {filepath}")

    # 3. checkout end
    p3 = re.compile(r'alert\(`Checkout & Pembayaran Berhasil!.*?\n\s*showReceipt\(id_jual,\s*totalHarga,\s*tanggalStr,\s*uangBayar,\s*kembalian\);\s*'
                    r'initPOS\(\);\s*if\s*\(bayarInput\)\s*bayarInput\.value\s*=\s*[\'"][\'"];', re.DOTALL)
    if p3.search(content_n):
        content_n = p3.sub(new_checkout_end.strip(), content_n, count=1)
        print(f"Patched checkout end in {filepath}")
    else:
        print(f"Could not find checkout end in {filepath}")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content_n)
    print(f"Finished {filepath}")

patch_file('app.js')
patch_file('public/app.js')
