import sqlite3
import os

def generate_dump():
    sqlite_path = "data/apotek.db"
    dump_path = "data/supabase_dump.sql"
    
    if not os.path.exists(sqlite_path):
        print(f"Error: Database SQLite lokal tidak ditemukan di {sqlite_path}")
        return

    print("Membaca database SQLite lokal...")
    sq_conn = sqlite3.connect(sqlite_path)
    sq_cursor = sq_conn.cursor()
    
    # Exclude raw archive staging tables to prevent duplicating 120k rows in SQL dump
    exclude_staging = {
        'laporan_master_jual', 'laporan_master_transaksi', 'laporan_master_retur', 
        'rekap_dashboard', 'arsip_faktur_beli', 'arsip_log_beli', 'arsip_retur_jual',
        'arsip_transaksi_kas', 'arsip_pelanggan', 'arsip_operasional_kas', 
        'arsip_pembayaran_konsi', 'arsip_pelunasan_hutang', 'arsip_detail_pelunasan_hutang',
        'arsip_log_pelunasan_jual', 'header_extract'
    }
    
    # Get all tables
    sq_cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    tables = [r[0] for r in sq_cursor.fetchall() if r[0] not in exclude_staging]
    
    print(f"Menghasilkan SQL dump untuk {len(tables)} tabel operasional (lengkap dengan data arsip terpadu)...")
    
    with open(dump_path, 'w', encoding='utf-8') as f:
        # Disable foreign keys temporarily and wrap in transaction
        f.write("BEGIN;\n\n")
        
        for table in tables:
            f.write(f"-- TABLE: {table}\n")
            f.write(f"DROP TABLE IF EXISTS \"{table}\" CASCADE;\n")
            
            # Get schema
            sq_cursor.execute(f"PRAGMA table_info(\"{table}\")")
            columns = [r[1] for r in sq_cursor.fetchall()]
            
            # Create Table statement
            col_defs = ",\n  ".join([f'"{c}" TEXT' for c in columns])
            f.write(f"CREATE TABLE \"{table}\" (\n  {col_defs}\n);\n\n")
            
            # Get data rows
            sq_cursor.execute(f"SELECT * FROM \"{table}\"")
            rows = sq_cursor.fetchall()
            
            if rows:
                f.write(f"-- Data for {table} ({len(rows)} rows)\n")
                
                # Format bulk insert statements for PG compatibility
                # We do it in chunks of 1000 rows to prevent massive single query execution limits
                chunk_size = 1000
                for i in range(0, len(rows), chunk_size):
                    chunk = rows[i:i+chunk_size]
                    
                    values_list = []
                    for row in chunk:
                        formatted_vals = []
                        for val in row:
                            if val is None:
                                formatted_vals.append("NULL")
                            else:
                                # Escape single quotes for PostgreSQL
                                escaped_val = str(val).replace("'", "''")
                                formatted_vals.append(f"'{escaped_val}'")
                        values_list.append("(" + ", ".join(formatted_vals) + ")")
                    
                    col_names = ", ".join([f'"{c}"' for c in columns])
                    f.write(f"INSERT INTO \"{table}\" ({col_names}) VALUES\n")
                    f.write(",\n".join(values_list) + ";\n\n")
                    
        # Add low stock warnings view
        f.write("-- VIEW: view_low_stock\n")
        f.write("CREATE OR REPLACE VIEW view_low_stock AS\n")
        f.write("SELECT \n")
        f.write("    id_obat, \n")
        f.write("    nama_obat, \n")
        f.write("    stok_unit_kecil, \n")
        f.write("    stok_minimal, \n")
        f.write("    label_satuan_kecil\n")
        f.write("FROM master_obat\n")
        f.write("WHERE \n")
        f.write("    stok_minimal IS NOT NULL \n")
        f.write("    AND stok_minimal != '' \n")
        f.write("    AND stok_minimal ~ '^[0-9.-]+$'\n")
        f.write("    AND stok_unit_kecil ~ '^[0-9.-]+$'\n")
        f.write("    AND CAST(stok_minimal AS NUMERIC) > 0\n")
        f.write("    AND CAST(stok_unit_kecil AS NUMERIC) <= CAST(stok_minimal AS NUMERIC);\n\n")

        # Add real-time stock view with FEFO latest ED
        f.write("-- VIEW: view_stok_realtime\n")
        f.write("CREATE OR REPLACE VIEW view_stok_realtime AS\n")
        f.write("WITH in_stock AS (\n")
        f.write("    SELECT id_obat, COALESCE(SUM(CASE WHEN konversi_masuk ~ '^[0-9.-]+$' THEN CAST(konversi_masuk AS NUMERIC) ELSE 0 END), 0) AS total_in\n")
        f.write("    FROM log_beli WHERE jenis_transaksi IN ('PEMBELIAN', 'STOK AWAL', 'KONSINYASI MASUK') GROUP BY id_obat\n")
        f.write("),\n")
        f.write("out_stock AS (\n")
        f.write("    SELECT id_obat, COALESCE(SUM(CASE WHEN konversi_keluar ~ '^[0-9.-]+$' THEN CAST(konversi_keluar AS NUMERIC) ELSE 0 END), 0) AS total_out\n")
        f.write("    FROM detail_jual WHERE jenis_transaksi = 'PENJUALAN' OR jenis_transaksi IS NULL OR jenis_transaksi = '' GROUP BY id_obat\n")
        f.write("),\n")
        f.write("retur_jual_stock AS (\n")
        f.write("    SELECT id_obat, COALESCE(SUM(CASE WHEN konversi_keluar ~ '^[0-9.-]+$' THEN CAST(konversi_keluar AS NUMERIC) ELSE 0 END), 0) AS total_retur_jual\n")
        f.write("    FROM detail_jual WHERE jenis_transaksi = 'RETUR PENJUALAN' GROUP BY id_obat\n")
        f.write("),\n")
        f.write("retur_beli_stock AS (\n")
        f.write("    SELECT id_obat, COALESCE(SUM(CASE WHEN konversi_masuk ~ '^[0-9.-]+$' THEN CAST(konversi_masuk AS NUMERIC) ELSE 0 END), 0) AS total_retur_beli\n")
        f.write("    FROM log_beli WHERE jenis_transaksi IN ('RETUR PEMBELIAN', 'RETUR KONSINYASI') GROUP BY id_obat\n")
        f.write("),\n")
        f.write("latest_ed AS (\n")
        f.write("    SELECT id_obat, MAX(expired_date) AS latest_ed\n")
        f.write("    FROM log_beli WHERE expired_date IS NOT NULL AND expired_date != '' AND expired_date != '-' GROUP BY id_obat\n")
        f.write(")\n")
        f.write("SELECT \n")
        f.write("    m.*,\n")
        f.write("    COALESCE(ed.latest_ed, m.ed_terdekat) AS expired_date,\n")
        f.write("    CASE \n")
        f.write("        WHEN m.jenis_item = 'JASA' THEN 0\n")
        f.write("        ELSE (\n")
        f.write("            COALESCE(CASE WHEN m.stok_dasar_opname ~ '^[0-9.-]+$' THEN CAST(m.stok_dasar_opname AS NUMERIC) ELSE 0 END, 0)\n")
        f.write("            + COALESCE(ins.total_in, 0)\n")
        f.write("            + COALESCE(rjs.total_retur_jual, 0)\n")
        f.write("            - COALESCE(outs.total_out, 0)\n")
        f.write("            - COALESCE(rbs.total_retur_beli, 0)\n")
        f.write("        )\n")
        f.write("    END AS stok_realtime\n")
        f.write("FROM master_obat m\n")
        f.write("LEFT JOIN in_stock ins ON m.id_obat = ins.id_obat\n")
        f.write("LEFT JOIN out_stock outs ON m.id_obat = outs.id_obat\n")
        f.write("LEFT JOIN retur_jual_stock rjs ON m.id_obat = rjs.id_obat\n")
        f.write("LEFT JOIN retur_beli_stock rbs ON m.id_obat = rbs.id_obat\n")
        f.write("LEFT JOIN latest_ed ed ON m.id_obat = ed.id_obat;\n\n")

        # Indexes for real-time query performance (<5ms)
        f.write("-- INDEXES\n")
        f.write("CREATE INDEX IF NOT EXISTS idx_detail_jual_id_obat ON detail_jual(id_obat);\n")
        f.write("CREATE INDEX IF NOT EXISTS idx_detail_jual_id_jual ON detail_jual(id_jual);\n")
        f.write("CREATE INDEX IF NOT EXISTS idx_detail_jual_tanggal ON detail_jual(tanggal);\n")
        f.write("CREATE INDEX IF NOT EXISTS idx_transaksi_jual_id_jual ON transaksi_jual(id_jual);\n")
        f.write("CREATE INDEX IF NOT EXISTS idx_transaksi_jual_tanggal ON transaksi_jual(tanggal);\n")
        f.write("CREATE INDEX IF NOT EXISTS idx_log_beli_id_obat ON log_beli(id_obat);\n")
        f.write("CREATE INDEX IF NOT EXISTS idx_log_beli_id_faktur ON log_beli(id_faktur);\n")
        f.write("CREATE INDEX IF NOT EXISTS idx_log_beli_tgl_masuk ON log_beli(tanggal_masuk);\n")
        f.write("CREATE INDEX IF NOT EXISTS idx_faktur_beli_id_faktur ON faktur_beli(id_faktur);\n")
        f.write("CREATE INDEX IF NOT EXISTS idx_master_obat_id_obat ON master_obat(id_obat);\n")
        f.write("CREATE INDEX IF NOT EXISTS idx_transaksi_kas_nama_kas ON transaksi_kas(nama_kas);\n")
        f.write("CREATE INDEX IF NOT EXISTS idx_transaksi_kas_waktu ON transaksi_kas(waktu);\n\n")

        # Grant access to anon & authenticated roles for Supabase PostgREST
        for table in tables:
            f.write(f"ALTER TABLE \"{table}\" ENABLE ROW LEVEL SECURITY;\n")
            f.write(f"CREATE POLICY \"p_anon_all_{table}\" ON \"{table}\" FOR ALL TO anon USING (true) WITH CHECK (true);\n")
            f.write(f"CREATE POLICY \"p_auth_all_{table}\" ON \"{table}\" FOR ALL TO authenticated USING (true) WITH CHECK (true);\n")
        f.write("GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;\n")
        f.write("GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;\n\n")
        
        f.write("COMMIT;\n")
        
    sq_conn.close()
    print(f"\nSukses! File SQL dump telah dihasilkan di: {dump_path}")
    print("Ukuran file siap disalin.")

if __name__ == "__main__":
    generate_dump()
