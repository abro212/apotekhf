import re

with open('public/app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix submitPembelian konversi_masuk
old_pembelian = """                jumlah_masuk: String(item.jumlah),
                konversi_masuk: String(item.konversi),"""
new_pembelian = """                jumlah_masuk: String(item.jumlah),
                konversi_masuk: String(item.jumlah * item.konversi),"""

if old_pembelian in content:
    content = content.replace(old_pembelian, new_pembelian)
    print("Fixed submitPembelian konversi_masuk")
else:
    print("Warning: old_pembelian target not found")

# 2. Add transaksi_kas recording in processPayment
old_checkout = """        // 3. Update stock in master_obat
        for (const update of stockUpdates) {
            await supabaseClient.from('master_obat').update({ stok_unit_kecil: update.stok_unit_kecil }).eq('id_obat', update.id_obat);
        }

        alert(`Checkout & Pembayaran Berhasil!"""

new_checkout = """        // 3. Update stock in master_obat
        for (const update of stockUpdates) {
            await supabaseClient.from('master_obat').update({ stok_unit_kecil: update.stok_unit_kecil }).eq('id_obat', update.id_obat);
        }

        // 4. Record to transaksi_kas (Modul 4 & 27: Cash -> KAS-01 Laci Kasir, QRIS -> KAS-04 Rekening Bank)
        try {
            if (payMethod === 'CASH') {
                await supabaseClient.from('transaksi_kas').insert([{
                    id_trx: Math.random().toString(36).substring(2, 10),
                    waktu: tanggalStr,
                    nama_kas: 'KAS-01',
                    kategori: 'Omzet Penjualan Tunai',
                    keterangan: `Penjualan Tunai Nota ${id_jual}`,
                    uang_masuk: String(totalHarga),
                    uang_keluar: '0',
                    user: currentUser?.nama_staf || 'cashier'
                }]);
            } else if (payMethod === 'QRIS') {
                await supabaseClient.from('transaksi_kas').insert([{
                    id_trx: Math.random().toString(36).substring(2, 10),
                    waktu: tanggalStr,
                    nama_kas: 'KAS-04',
                    kategori: 'Omzet Penjualan QRIS',
                    keterangan: `Penjualan QRIS Nota ${id_jual}`,
                    uang_masuk: String(totalHarga),
                    uang_keluar: '0',
                    user: currentUser?.nama_staf || 'cashier'
                }]);
            }
        } catch (kasErr) {
            console.warn('transaksi_kas insert notice:', kasErr);
        }

        alert(`Checkout & Pembayaran Berhasil!"""

if old_checkout in content:
    content = content.replace(old_checkout, new_checkout)
    print("Added transaksi_kas insertion to processPayment")
else:
    print("Warning: old_checkout target not found")

# 3. Upgrade loadKasLedger to query transaksi_kas with fallback
old_kas_ledger = """async function loadKasLedger(page = currentKasPage, pageSize = currentKasPageSize) {
    currentKasPage = page;
    currentKasPageSize = pageSize;

    if (!supabaseClient) return;
    const q = document.getElementById('kas-search-input')?.value.trim() || '';
    const filterJenis = document.getElementById('kas-filter-jenis')?.value || 'ALL';
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

        if (filterJenis && filterJenis !== 'ALL') {
            query = query.eq('jenis_kas', filterJenis);
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
        }"""

new_kas_ledger = """async function loadKasLedger(page = currentKasPage, pageSize = currentKasPageSize) {
    currentKasPage = page;
    currentKasPageSize = pageSize;

    if (!supabaseClient) return;
    const q = document.getElementById('kas-search-input')?.value.trim() || '';
    const filterJenis = document.getElementById('kas-filter-jenis')?.value || 'ALL';
    const tbody = document.getElementById('kas-table-body');
    const mobileList = document.getElementById('kas-mobile-list');

    tbody.innerHTML = '';
    if (mobileList) mobileList.innerHTML = '';

    const kasNameMap = {
        'KAS-01': 'Laci Kasir',
        'KAS-02': 'Kas Kecil',
        'KAS-03': 'Kas Besar',
        'KAS-04': 'Rekening Bank'
    };

    try {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        let list = null;
        let count = 0;
        let isTransaksiKas = false;

        // Try transaksi_kas first (Modul 4 & 27)
        let queryTx = supabaseClient.from('transaksi_kas').select('*', { count: 'exact' });
        if (q) {
            queryTx = queryTx.or(`kategori.ilike.%${q}%,keterangan.ilike.%${q}%,id_trx.ilike.%${q}%,user.ilike.%${q}%`);
        }
        if (filterJenis === 'MASUK') {
            queryTx = queryTx.gt('uang_masuk', 0);
        } else if (filterJenis === 'KELUAR') {
            queryTx = queryTx.gt('uang_keluar', 0);
        }

        const resTx = await queryTx.order('waktu', { ascending: false }).range(from, to);
        if (!resTx.error && resTx.data) {
            isTransaksiKas = true;
            list = resTx.data.map(item => {
                const uMasuk = parseFloat(item.uang_masuk || 0);
                const uKeluar = parseFloat(item.uang_keluar || 0);
                const isMasuk = uMasuk > 0;
                return {
                    id_kas: item.id_trx || item.id_kas || '-',
                    tanggal: item.waktu || '-',
                    jenis_kas: isMasuk ? 'MASUK' : 'KELUAR',
                    kategori: `${item.kategori || 'Mutasi Kas'} (${kasNameMap[item.nama_kas] || item.nama_kas || 'Kas'})`,
                    jumlah: isMasuk ? uMasuk : uKeluar,
                    keterangan: item.keterangan || '-',
                    user: item.user || '-'
                };
            });
            count = resTx.count;
        } else {
            // Fallback to legacy kas table
            let queryLegacy = supabaseClient.from('kas').select('*', { count: 'exact' });
            if (q) {
                queryLegacy = queryLegacy.or(`kategori.ilike.%${q}%,keterangan.ilike.%${q}%,id_kas.ilike.%${q}%`);
            }
            if (filterJenis && filterJenis !== 'ALL') {
                queryLegacy = queryLegacy.eq('jenis_kas', filterJenis);
            }
            const resLegacy = await queryLegacy.order('tanggal', { ascending: false }).range(from, to);
            list = resLegacy.data || [];
            count = resLegacy.count;
        }

        // Fetch overall totals for summary cards
        let totalMasuk = 0;
        let totalKeluar = 0;

        if (isTransaksiKas) {
            const { data: allTx } = await supabaseClient.from('transaksi_kas').select('uang_masuk, uang_keluar');
            if (allTx) {
                allTx.forEach(k => {
                    totalMasuk += parseFloat(k.uang_masuk || 0);
                    totalKeluar += parseFloat(k.uang_keluar || 0);
                });
            }
        } else {
            const { data: allKas } = await supabaseClient.from('kas').select('jenis_kas, jumlah');
            if (allKas) {
                allKas.forEach(k => {
                    const amt = parseFloat(k.jumlah || 0);
                    if (k.jenis_kas === 'MASUK') totalMasuk += amt;
                    else if (k.jenis_kas === 'KELUAR') totalKeluar += amt;
                });
            }
        }"""

if old_kas_ledger in content:
    content = content.replace(old_kas_ledger, new_kas_ledger)
    print("Upgraded loadKasLedger")
else:
    print("Warning: old_kas_ledger target not found")

with open('public/app.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Finished patching public/app.js")
