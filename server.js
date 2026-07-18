const express = require('express');
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// Initialize SQLite database
const dbPath = path.join(__dirname, 'data', 'apotek.db');
if (!fs.existsSync(dbPath)) {
    console.error("Database file not found! Please run migration script first.");
    process.exit(1);
}
const db = new DatabaseSync(dbPath);

// Helper function to run query with params (returns array of rows)
function queryAll(sql, params = []) {
    const statement = db.prepare(sql);
    return statement.all(...params);
}

// Helper function to run query and return first row
function queryOne(sql, params = []) {
    const rows = queryAll(sql, params);
    return rows.length > 0 ? rows[0] : null;
}

// Helper function to execute write queries (INSERT, UPDATE, DELETE)
function execute(sql, params = []) {
    const statement = db.prepare(sql);
    return statement.run(...params);
}

// --- API ENDPOINTS ---

// 1. Get Dashboard Menus
app.get('/api/menu', (req, res) => {
    try {
        const rows = queryAll('SELECT * FROM menu ORDER BY ROWID');
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2. Get Users (Login Staf)
app.get('/api/users', (req, res) => {
    try {
        const rows = queryAll('SELECT * FROM user_login');
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get Low Stock Medicines
app.get('/api/obat/lowstock', (req, res) => {
    try {
        const rows = queryAll(`
            SELECT id_obat, nama_obat, stok_unit_kecil, stok_minimal, label_satuan_kecil 
            FROM master_obat 
            WHERE CAST(stok_unit_kecil AS REAL) <= CAST(stok_minimal AS REAL) 
              AND stok_minimal IS NOT NULL 
              AND stok_minimal != '' 
              AND stok_minimal > 0
            ORDER BY CAST(stok_unit_kecil AS REAL) ASC 
            LIMIT 10
        `);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 3. Search Medicines (Master Obat)
app.get('/api/obat', (req, res) => {
    try {
        const { q, limit = 50, offset = 0 } = req.query;
        let sql = 'SELECT * FROM master_obat';
        let params = [];
        
        if (q) {
            sql += ' WHERE id_obat LIKE ? OR nama_obat LIKE ? OR kategori LIKE ?';
            const wild = `%${q}%`;
            params = [wild, wild, wild];
        }
        
        sql += ' ORDER BY nama_obat LIMIT ? OFFSET ?';
        params.push(Number(limit), Number(offset));
        
        const rows = queryAll(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 4. Create New Medicine
app.post('/api/obat', (req, res) => {
    try {
        const data = req.body;
        // Generate new ID if not provided (Format: HFXXXXX)
        let id_obat = data.id_obat;
        if (!id_obat) {
            const maxRow = queryOne('SELECT id_obat FROM master_obat WHERE id_obat LIKE "HF%" ORDER BY id_obat DESC LIMIT 1');
            if (maxRow && maxRow.id_obat) {
                const numericPart = parseInt(maxRow.id_obat.substring(2)) + 1;
                id_obat = 'HF' + String(numericPart).padStart(5, '0');
            } else {
                id_obat = 'HF00001';
            }
        }

        const sql = `
            INSERT INTO master_obat (
                id_obat, nama_obat, jenis_item, kategori, rak, supplier, 
                satuan_1, satuan_2, satuan_3, isi_sat_1, isi_2_ke_1, isi_3_ke_2, 
                stok_unit_kecil, label_satuan_kecil, harga_beli_sat_1, harga_beli_sat_2, harga_beli_sat_3,
                harga_l1_s1, harga_l1_s2, harga_l1_s3, harga_l2_s1, harga_l2_s2, harga_l2_s3, harga_l3_s1, harga_l3_s2, harga_l3_s3
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
            id_obat, data.nama_obat, data.jenis_item || 'NON KONSI', data.kategori || 'OBAT', data.rak || '', data.supplier || '',
            data.satuan_1 || '', data.satuan_2 || '', data.satuan_3 || '',
            parseFloat(data.isi_sat_1 || 1.0), parseFloat(data.isi_2_ke_1 || 0.0), parseFloat(data.isi_3_ke_2 || 0.0),
            parseFloat(data.stok_unit_kecil || 0.0), data.label_satuan_kecil || data.satuan_1 || '',
            parseFloat(data.harga_beli_sat_1 || 0.0), parseFloat(data.harga_beli_sat_2 || 0.0), parseFloat(data.harga_beli_sat_3 || 0.0),
            parseFloat(data.harga_l1_s1 || 0.0), parseFloat(data.harga_l1_s2 || 0.0), parseFloat(data.harga_l1_s3 || 0.0),
            parseFloat(data.harga_l2_s1 || 0.0), parseFloat(data.harga_l2_s2 || 0.0), parseFloat(data.harga_l2_s3 || 0.0),
            parseFloat(data.harga_l3_s1 || 0.0), parseFloat(data.harga_l3_s2 || 0.0), parseFloat(data.harga_l3_s3 || 0.0)
        ];
        
        execute(sql, params);
        res.json({ success: true, data: { id_obat, ...data } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Edit Medicine
app.put('/api/obat/:id', (req, res) => {
    try {
        const id_obat = req.params.id;
        const data = req.body;
        const sql = `
            UPDATE master_obat SET 
                nama_obat = ?, jenis_item = ?, kategori = ?, rak = ?, supplier = ?, 
                satuan_1 = ?, satuan_2 = ?, satuan_3 = ?, isi_sat_1 = ?, isi_2_ke_1 = ?, isi_3_ke_2 = ?, 
                stok_unit_kecil = ?, label_satuan_kecil = ?, harga_beli_sat_1 = ?, harga_beli_sat_2 = ?, harga_beli_sat_3 = ?,
                harga_l1_s1 = ?, harga_l1_s2 = ?, harga_l1_s3 = ?, harga_l2_s1 = ?, harga_l2_s2 = ?, harga_l2_s3 = ?, harga_l3_s1 = ?, harga_l3_s2 = ?, harga_l3_s3 = ?
            WHERE id_obat = ?
        `;
        const params = [
            data.nama_obat, data.jenis_item, data.kategori, data.rak, data.supplier,
            data.satuan_1, data.satuan_2, data.satuan_3,
            parseFloat(data.isi_sat_1), parseFloat(data.isi_2_ke_1), parseFloat(data.isi_3_ke_2),
            parseFloat(data.stok_unit_kecil), data.label_satuan_kecil,
            parseFloat(data.harga_beli_sat_1), parseFloat(data.harga_beli_sat_2), parseFloat(data.harga_beli_sat_3),
            parseFloat(data.harga_l1_s1), parseFloat(data.harga_l1_s2), parseFloat(data.harga_l1_s3),
            parseFloat(data.harga_l2_s1), parseFloat(data.harga_l2_s2), parseFloat(data.harga_l2_s3),
            parseFloat(data.harga_l3_s1), parseFloat(data.harga_l3_s2), parseFloat(data.harga_l3_s3),
            id_obat
        ];
        execute(sql, params);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 5. Customers List (Pelanggan)
app.get('/api/pelanggan', (req, res) => {
    try {
        const rows = queryAll('SELECT * FROM pelanggan ORDER BY nama');
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Add Customer
app.post('/api/pelanggan', (req, res) => {
    try {
        const data = req.body;
        let id_pelanggan = data.id_pelanggan;
        if (!id_pelanggan) {
            id_pelanggan = 'PL' + Math.random().toString(36).substring(2, 8).toUpperCase();
        }
        const sql = 'INSERT INTO pelanggan (id_pelanggan, nama, alamat, nomor_telp, level_harga) VALUES (?, ?, ?, ?, ?)';
        execute(sql, [id_pelanggan, data.nama, data.alamat || '', data.nomor_telp || '', data.level_harga || 'Level 1']);
        res.json({ success: true, data: { id_pelanggan, ...data } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 6. Suppliers List
app.get('/api/supplier', (req, res) => {
    try {
        const rows = queryAll('SELECT * FROM supplier ORDER BY nama_supplier');
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Add Supplier
app.post('/api/supplier', (req, res) => {
    try {
        const data = req.body;
        let id_supplier = data.id_supplier;
        if (!id_supplier) {
            id_supplier = 'SP' + Math.random().toString(36).substring(2, 6).toUpperCase();
        }
        const sql = 'INSERT INTO supplier (id_supplier, nama_supplier, alamat, nomor_telp) VALUES (?, ?, ?, ?)';
        execute(sql, [id_supplier, data.nama_supplier, data.alamat || '', data.nomor_telp || '']);
        res.json({ success: true, data: { id_supplier, ...data } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 7. POS: Process Sales Transaction
app.post('/api/transaksi/jual', (req, res) => {
    try {
        const { id_pelanggan, metode_bayar, user, items } = req.body;
        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, message: "No items in transaction" });
        }

        // Generate Transaction ID
        // Format: YYMMDD-user-XXXX (where XXXX is a random suffix)
        const dateObj = new Date();
        const yy = String(dateObj.getFullYear()).substring(2);
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const dateStr = `${yy}${mm}${dd}`;
        const suffix = Math.random().toString(36).substring(2, 6).toLowerCase();
        const id_jual = `${dateStr}-${(user || 'cashier').toLowerCase()}-${suffix}`;

        // Calculate total buy and laba
        let total_bayar = 0;
        const processedItems = items.map(item => {
            const qty = parseFloat(item.jumlah);
            const price = parseFloat(item.harga);
            const subtotal = qty * price;
            total_bayar += subtotal;

            // Fetch medicine info for HPP (Harga Beli)
            const med = queryOne('SELECT harga_beli_sat_1, harga_beli_sat_2, harga_beli_sat_3, isi_sat_1, isi_2_ke_1, isi_3_ke_2 FROM master_obat WHERE id_obat = ?', [item.id_obat]);
            let hpp_unit = 0;
            if (med) {
                if (item.satuan === 'Satuan 1') hpp_unit = parseFloat(med.harga_beli_sat_1 || 0);
                else if (item.satuan === 'Satuan 2') hpp_unit = parseFloat(med.harga_beli_sat_2 || 0);
                else if (item.satuan === 'Satuan 3') hpp_unit = parseFloat(med.harga_beli_sat_3 || 0);
            }
            const total_hpp = qty * hpp_unit;
            const laba_bersih = subtotal - total_hpp;

            return {
                ...item,
                subtotal,
                total_hpp,
                laba_bersih
            };
        });

        // Format date string for the database
        const formatDate = (d) => {
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            const hours = String(d.getHours()).padStart(2, '0');
            const mins = String(d.getMinutes()).padStart(2, '0');
            const secs = String(d.getSeconds()).padStart(2, '0');
            return `${day}/${month}/${year} ${hours}.${mins}.${secs}`;
        };
        const tanggalStr = formatDate(dateObj);

        // 1. Insert into transaksi_jual
        const insertTxSql = `
            INSERT INTO transaksi_jual (id_jual, tanggal, metode_bayar, total_bayar, nama_pelanggan, jenis_transaksi, user)
            VALUES (?, ?, ?, ?, ?, 'PENJUALAN', ?)
        `;
        execute(insertTxSql, [id_jual, tanggalStr, metode_bayar, total_bayar, id_pelanggan, user]);

        // 2. Process details & deduct stock
        for (const item of processedItems) {
            const detailId = Math.random().toString(36).substring(2, 10);
            const insertDetailSql = `
                INSERT INTO detail_jual (
                    id_detail, id_jual, id_obat, nama_obat, satuan_dipilih, 
                    jumlah_beli, harga_satuan, subtotal, konversi_keluar, 
                    jenis_transaksi, tanggal, user, total_hpp, laba_bersih
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENJUALAN', ?, ?, ?, ?)
            `;
            execute(insertDetailSql, [
                detailId, id_jual, item.id_obat, item.nama_obat, item.satuan_nama,
                item.jumlah, item.harga, item.subtotal, item.konversi,
                tanggalStr, user, item.total_hpp, item.laba_bersih
            ]);

            // Deduct stock in master_obat (stok_unit_kecil)
            // Deduct amount = qty * konversi factor
            const qtyInSmallestUnit = item.jumlah * item.konversi;
            execute(
                'UPDATE master_obat SET stok_unit_kecil = CAST(stok_unit_kecil AS REAL) - ? WHERE id_obat = ?',
                [qtyInSmallestUnit, item.id_obat]
            );
        }

        res.json({ success: true, data: { id_jual, total_bayar, tanggal: tanggalStr } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 8. Get Sales Transactions List
app.get('/api/transaksi/jual', (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        const rows = queryAll('SELECT t.*, p.nama as pelanggan_nama FROM transaksi_jual t LEFT JOIN pelanggan p ON t.nama_pelanggan = p.id_pelanggan ORDER BY t.tanggal DESC LIMIT ? OFFSET ?', [Number(limit), Number(offset)]);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get Transaction Details
app.get('/api/transaksi/jual/:id', (req, res) => {
    try {
        const tx = queryOne('SELECT t.*, p.nama as pelanggan_nama FROM transaksi_jual t LEFT JOIN pelanggan p ON t.nama_pelanggan = p.id_pelanggan WHERE t.id_jual = ?', [req.params.id]);
        if (!tx) {
            return res.status(404).json({ success: false, message: "Transaction not found" });
        }
        const items = queryAll('SELECT * FROM detail_jual WHERE id_jual = ?', [req.params.id]);
        res.json({ success: true, data: { ...tx, items } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 9. Cash Management (Operasional Kas)
app.get('/api/kas', (req, res) => {
    try {
        const rows = queryAll('SELECT * FROM operasional_kas ORDER BY tanggal DESC LIMIT 100');
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/kas', (req, res) => {
    try {
        const { jenis, kategori, jumlah, keterangan, user } = req.body;
        const id_kas = Math.random().toString(36).substring(2, 10);
        const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const sql = 'INSERT INTO operasional_kas (id_kas, tanggal, jenis, kategori, durasi_sewa, jumlah, keterangan, user) VALUES (?, ?, ?, ?, 1.0, ?, ?, ?)';
        execute(sql, [id_kas, dateStr, jenis, kategori, parseFloat(jumlah), keterangan || '', user]);
        res.json({ success: true, data: { id_kas, tanggal: dateStr, jenis, kategori, jumlah, keterangan, user } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 10. Patient Registry & Health Checks
app.get('/api/pasien', (req, res) => {
    try {
        const rows = queryAll('SELECT * FROM daftar_pasien ORDER BY nama');
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/pasien', (req, res) => {
    try {
        const { nama, alamat, whatsapp } = req.body;
        // Find max ID
        const maxRow = queryOne('SELECT id FROM daftar_pasien ORDER BY CAST(id AS INTEGER) DESC LIMIT 1');
        const nextId = maxRow ? parseInt(maxRow.id) + 1 : 1;
        
        execute('INSERT INTO daftar_pasien (id, nama, alamat, whatsapp) VALUES (?, ?, ?, ?)', [nextId, nama, alamat || '', whatsapp || '']);
        res.json({ success: true, data: { id: nextId, nama, alamat, whatsapp } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/kontrol', (req, res) => {
    try {
        const rows = queryAll('SELECT * FROM kontrol_pasien ORDER BY tgl DESC, jam DESC LIMIT 100');
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/kontrol', (req, res) => {
    try {
        const { id_pasien, nama, alamat, tensi, gula, asam_urat, kolesterol, obat, keterangan } = req.body;
        const now = new Date();
        const tglStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const jamStr = `${String(now.getHours()).padStart(2,'0')}.${String(now.getMinutes()).padStart(2,'0')}.${String(now.getSeconds()).padStart(2,'0')}`;
        const id_trans = Math.random().toString(36).substring(2, 10);
        
        const sql = `
            INSERT INTO kontrol_pasien (tgl, jam, id_trans, id, nama, alamat, tensi, gula, asam_urat, kolesterol, obat, keterangan)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        execute(sql, [
            tglStr, jamStr, id_trans, id_pasien, nama, alamat, 
            tensi || null, gula || null, asam_urat || null, kolesterol || null, 
            obat || null, keterangan || null
        ]);
        
        res.json({ success: true, data: { tgl: tglStr, jam: jamStr, id_trans } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 11. Reports & Analytics Summary
app.get('/api/reports/summary', (req, res) => {
    try {
        // Today's total sales
        const dateObj = new Date();
        const yy = String(dateObj.getFullYear()).substring(2);
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const todayPattern = `${dd}/${mm}/20${yy}%`; // match standard DD/MM/YYYY hh.mm.ss format

        const salesToday = queryOne('SELECT SUM(total_bayar) as total FROM transaksi_jual WHERE tanggal LIKE ?', [todayPattern]);
        const countToday = queryOne('SELECT COUNT(*) as count FROM transaksi_jual WHERE tanggal LIKE ?', [todayPattern]);
        
        // Month total sales
        const monthPattern = `%/20${yy}%`;
        const salesMonth = queryOne('SELECT SUM(total_bayar) as total FROM transaksi_jual WHERE tanggal LIKE ?', [monthPattern]);
        
        // Total Profit
        const profitMonth = queryOne('SELECT SUM(laba_bersih) as profit FROM detail_jual WHERE tanggal LIKE ?', [monthPattern]);

        // Low stock count
        const lowStockCount = queryOne("SELECT COUNT(*) as count FROM master_obat WHERE CAST(stok_unit_kecil AS REAL) <= CAST(stok_minimal AS REAL) AND stok_minimal IS NOT NULL AND stok_minimal != '' AND stok_minimal > 0");

        res.json({
            success: true,
            data: {
                salesToday: parseFloat(salesToday?.total || 0),
                countToday: parseInt(countToday?.count || 0),
                salesMonth: parseFloat(salesMonth?.total || 0),
                profitMonth: parseFloat(profitMonth?.profit || 0),
                lowStockCount: parseInt(lowStockCount?.count || 0)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 12. Stock Opname Update
app.post('/api/stok-opname', (req, res) => {
    try {
        const { id_obat, stok_fisik, alasan, user } = req.body;
        const med = queryOne('SELECT nama_obat, stok_unit_kecil FROM master_obat WHERE id_obat = ?', [id_obat]);
        if (!med) {
            return res.status(404).json({ success: false, message: "Medicine not found" });
        }

        const currentStock = parseFloat(med.stok_unit_kecil || 0);
        const physicalStock = parseFloat(stok_fisik);
        const difference = physicalStock - currentStock;

        // 1. Update stock in master_obat
        execute('UPDATE master_obat SET stok_unit_kecil = ? WHERE id_obat = ?', [physicalStock, id_obat]);

        // 2. Log in log_beli with STOK OPNAME type
        const id_beli = 'SO' + Math.random().toString(36).substring(2, 8).toUpperCase();
        const dateStr = new Date().toISOString().split('T')[0];
        const sql = `
            INSERT INTO log_beli (id_beli, tanggal_masuk, id_obat, jumlah_masuk, konversi_masuk, total_harga, jenis_transaksi, alasan_retur, user)
            VALUES (?, ?, ?, ?, 1.0, 0.0, 'STOK OPNAME', ?, ?)
        `;
        // We log the difference as the quantity change
        execute(sql, [id_beli, dateStr, id_obat, difference, alasan || 'Penyesuaian Stok Opname', user]);

        res.json({ success: true, data: { id_obat, currentStock, physicalStock, difference } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 13. Purchase Invoices (Faktur Beli) and Items
app.get('/api/pembelian', (req, res) => {
    try {
        const rows = queryAll('SELECT f.*, s.nama_supplier FROM faktur_beli f LEFT JOIN supplier s ON f.supplier = s.id_supplier ORDER BY f.tanggal_masuk DESC LIMIT 100');
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/pembelian', (req, res) => {
    try {
        const { nomor_faktur, supplier, metode_bayar, jatuh_tempo, items, user } = req.body;
        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, message: "No items in purchase invoice" });
        }

        const id_faktur = Math.random().toString(36).substring(2, 10);
        const dateStr = new Date().toISOString().split('T')[0];

        // 1. Insert into faktur_beli
        const insertFaktur = `
            INSERT INTO faktur_beli (id_faktur, nomor_faktur, tanggal_masuk, supplier, jenis_transaksi, metode_bayar, jatuh_tempo, user)
            VALUES (?, ?, ?, ?, 'PEMBELIAN', ?, ?, ?)
        `;
        execute(insertFaktur, [id_faktur, nomor_faktur, dateStr, supplier, metode_bayar, jatuh_tempo || null, user]);

        // 2. Insert items and increase stock
        for (const item of items) {
            const id_beli = 'B' + Math.random().toString(36).substring(2, 8).toUpperCase();
            
            // Insert log_beli
            const insertLog = `
                INSERT INTO log_beli (
                    id_beli, tanggal_masuk, id_obat, satuan_masuk, harga_beli_item, 
                    jumlah_masuk, konversi_masuk, id_faktur, no_batch, expired_date, 
                    total_harga, jenis_transaksi, user
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PEMBELIAN', ?)
            `;
            const total_harga = parseFloat(item.harga_beli) * parseFloat(item.jumlah);
            execute(insertLog, [
                id_beli, dateStr, item.id_obat, item.satuan, parseFloat(item.harga_beli),
                parseFloat(item.jumlah), parseFloat(item.konversi), id_faktur,
                item.no_batch || '', item.expired_date || null, total_harga, user
            ]);

            // Increase stock in master_obat
            const qtyInSmallestUnit = parseFloat(item.jumlah) * parseFloat(item.konversi);
            execute(
                'UPDATE master_obat SET stok_unit_kecil = CAST(stok_unit_kecil AS REAL) + ? WHERE id_obat = ?',
                [qtyInSmallestUnit, item.id_obat]
            );
        }

        res.json({ success: true, data: { id_faktur } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get Shift Reports (laporan_harian)
app.get('/api/reports/shifts', (req, res) => {
    try {
        const rows = queryAll('SELECT * FROM laporan_harian ORDER BY tanggal DESC LIMIT 100');
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get Info Stats
app.get('/api/info/stats', (req, res) => {
    try {
        const totalObat = queryOne('SELECT COUNT(*) as count FROM master_obat');
        const totalTrans = queryOne('SELECT COUNT(*) as count FROM transaksi_jual');
        const totalPel = queryOne('SELECT COUNT(*) as count FROM pelanggan');
        const totalSup = queryOne('SELECT COUNT(*) as count FROM supplier');
        res.json({
            success: true,
            data: {
                totalObat: totalObat?.count || 0,
                totalTrans: totalTrans?.count || 0,
                totalPel: totalPel?.count || 0,
                totalSup: totalSup?.count || 0
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Default fallback handler for single-page routing
app.get(/.*/, (req, res) => {
    const rootIndex = path.join(__dirname, 'index.html');
    if (fs.existsSync(rootIndex)) {
        res.sendFile(rootIndex);
    } else {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

app.listen(port, () => {
    console.log(`APOTEK HF app listening on http://localhost:${port}`);
});
