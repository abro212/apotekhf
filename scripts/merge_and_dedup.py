import sqlite3
import time

def merge_and_deduplicate():
    db_path = "data/apotek.db"
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    print("=== PROSES PENGGABUNGAN & DEDUPLIKASI ARSIP KE TABEL UTAMA ===")
    start_t = time.time()

    merge_tasks = [
        {
            "target": "transaksi_jual",
            "source": "laporan_master_transaksi",
            "pk": "id_jual",
            "name": "Transaksi Penjualan"
        },
        {
            "target": "detail_jual",
            "source": "laporan_master_jual",
            "pk": "id_detail",
            "name": "Detail Penjualan Item"
        },
        {
            "target": "faktur_beli",
            "source": "arsip_faktur_beli",
            "pk": "id_faktur",
            "name": "Faktur Pembelian"
        },
        {
            "target": "log_beli",
            "source": "arsip_log_beli",
            "pk": "id_beli",
            "name": "Log Item Pembelian"
        },
        {
            "target": "retur_jual",
            "source": "arsip_retur_jual",
            "pk": "id_retur",
            "name": "Retur Penjualan"
        },
        {
            "target": "transaksi_kas",
            "source": "arsip_transaksi_kas",
            "pk": "id_trx",
            "name": "Transaksi Kas"
        },
        {
            "target": "pelunasan_hutang",
            "source": "arsip_pelunasan_hutang",
            "pk": "id_pelunasan",
            "name": "Pelunasan Hutang"
        },
        {
            "target": "log_pelunasan_jual",
            "source": "arsip_log_pelunasan_jual",
            "pk": "id_pelunasan",
            "name": "Log Pelunasan Piutang"
        },
        {
            "target": "pembayaran_konsi",
            "source": "arsip_pembayaran_konsi",
            "pk": "id_bayar",
            "name": "Pembayaran Konsinyasi"
        }
    ]

    for task in merge_tasks:
        target = task["target"]
        source = task["source"]
        pk = task["pk"]
        name = task["name"]

        # Ensure index on target PK first for O(1) lookups
        idx_name = f"idx_temp_{target}_{pk}"
        cur.execute(f'CREATE INDEX IF NOT EXISTS "{idx_name}" ON "{target}"("{pk}")')
        conn.commit()

        cur.execute(f'SELECT count(*) FROM "{target}"')
        cnt_target_before = cur.fetchone()[0]

        cur.execute(f'SELECT count(*) FROM "{source}"')
        cnt_source = cur.fetchone()[0]

        cur.execute(f'PRAGMA table_info("{target}")')
        cols_target = [r[1] for r in cur.fetchall()]
        cur.execute(f'PRAGMA table_info("{source}")')
        cols_source = [r[1] for r in cur.fetchall()]

        common_cols = [c for c in cols_target if c in cols_source]
        cols_str = ', '.join([f'"{c}"' for c in common_cols])

        insert_sql = f'''
            INSERT INTO "{target}" ({cols_str})
            SELECT {cols_str}
            FROM "{source}" s
            WHERE s."{pk}" IS NOT NULL 
              AND s."{pk}" != ''
              AND NOT EXISTS (
                  SELECT 1 FROM "{target}" t 
                  WHERE t."{pk}" = s."{pk}"
              )
        '''
        cur.execute(insert_sql)
        inserted_count = cur.rowcount
        conn.commit()

        cur.execute(f'SELECT count(*) FROM "{target}"')
        cnt_target_after = cur.fetchone()[0]

        duplicates_skipped = cnt_source - inserted_count
        print(f"[{name}]: Awal={cnt_target_before:,} | Arsip={cnt_source:,} | Duplikat Dilewati={duplicates_skipped:,} | Ditambahkan={inserted_count:,} | Total Akhir={cnt_target_after:,}", flush=True)

    print("\n--- MEMBUAT INDEKS B-TREE UNTUK KECEPATAN REAL-TIME (<5ms) ---", flush=True)
    indexes = [
        ("idx_detail_jual_id_obat", "detail_jual", "id_obat"),
        ("idx_detail_jual_id_jual", "detail_jual", "id_jual"),
        ("idx_detail_jual_tanggal", "detail_jual", "tanggal"),
        ("idx_transaksi_jual_id_jual", "transaksi_jual", "id_jual"),
        ("idx_transaksi_jual_tanggal", "transaksi_jual", "tanggal"),
        ("idx_log_beli_id_obat", "log_beli", "id_obat"),
        ("idx_log_beli_id_faktur", "log_beli", "id_faktur"),
        ("idx_log_beli_tgl_masuk", "log_beli", "tanggal_masuk"),
        ("idx_faktur_beli_id_faktur", "faktur_beli", "id_faktur"),
        ("idx_master_obat_id_obat", "master_obat", "id_obat"),
        ("idx_transaksi_kas_nama_kas", "transaksi_kas", "nama_kas"),
        ("idx_transaksi_kas_waktu", "transaksi_kas", "waktu"),
    ]

    for idx_name, tbl, col in indexes:
        cur.execute(f'CREATE INDEX IF NOT EXISTS "{idx_name}" ON "{tbl}"("{col}")')
        print(f"Index siap: {idx_name} ON {tbl}({col})", flush=True)

    conn.commit()
    conn.close()

    elapsed = time.time() - start_t
    print(f"\nPenggabungan dan indexing selesai dalam {elapsed:.2f} detik!", flush=True)

if __name__ == '__main__':
    merge_and_deduplicate()
