import openpyxl
import sqlite3
import os
import re
import time

def clean_col(c, idx=0):
    if not c or str(c).startswith('<'):
        return f'col_{idx}'
    c = str(c).strip().lower()
    c = re.sub(r'[^a-z0-9_]+', '_', c)
    c = re.sub(r'_+', '_', c).strip('_')
    return c if c else f'col_{idx}'

def migrate_arsip():
    excel_path = 'data/arsip_new.xlsx'
    db_path = 'data/apotek.db'

    if not os.path.exists(excel_path):
        print(f"Error: {excel_path} not found.")
        return

    print("Loading arsip_new.xlsx (read_only=True)...")
    start_t = time.time()
    wb = openpyxl.load_workbook(excel_path, read_only=True, data_only=True)
    
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    total_sheets = len(wb.sheetnames)
    print(f"Found {total_sheets} sheets in arsip_new.xlsx: {wb.sheetnames}")

    # Sheets that should be prefixed with 'arsip_' if they clash or are archive-specific
    for s_idx, sheetname in enumerate(wb.sheetnames):
        ws = wb[sheetname]
        tbl_base = clean_col(sheetname)
        
        # Name convention: if it starts with 'laporan_master_' or 'rekap_dashboard', keep or prefix
        # If it clashes with active tables (e.g. faktur_beli, log_beli, transaksi_kas), use 'arsip_' prefix
        active_clashes = {'faktur_beli', 'log_beli', 'pembayaran_konsi', 'pelunasan_hutang', 
                          'detail_pelunasan_hutang', 'log_pelunasan_jual', 'retur_jual', 
                          'transaksi_kas', 'pelanggan', 'operasional_kas'}
        
        if tbl_base in active_clashes:
            tbl_name = f"arsip_{tbl_base}"
        else:
            tbl_name = tbl_base

        rows_iter = ws.iter_rows(values_only=True)
        try:
            raw_headers = next(rows_iter)
        except StopIteration:
            continue

        if not raw_headers:
            continue

        headers = []
        seen = {}
        for i, h in enumerate(raw_headers):
            ch = clean_col(h, i)
            if ch in seen:
                seen[ch] += 1
                ch = f"{ch}_{seen[ch]}"
            else:
                seen[ch] = 1
            headers.append(ch)

        col_defs = ', '.join([f'"{h}" TEXT' for h in headers])
        cur.execute(f'DROP TABLE IF EXISTS "{tbl_name}"')
        cur.execute(f'CREATE TABLE "{tbl_name}" ({col_defs})')

        placeholders = ', '.join(['?'] * len(headers))
        batch = []
        count = 0
        batch_size = 5000

        for r in rows_iter:
            row_vals = list(r)
            if len(row_vals) < len(headers):
                row_vals.extend([None] * (len(headers) - len(row_vals)))
            row_vals = row_vals[:len(headers)]
            batch.append([str(val) if val is not None else None for val in row_vals])
            count += 1
            if len(batch) >= batch_size:
                cur.executemany(f'INSERT INTO "{tbl_name}" VALUES ({placeholders})', batch)
                conn.commit()
                batch = []

        if batch:
            cur.executemany(f'INSERT INTO "{tbl_name}" VALUES ({placeholders})', batch)
            conn.commit()

        print(f"[{s_idx+1}/{total_sheets}] Migrated '{tbl_name}': {count:,} rows ({len(headers)} cols)")

    conn.close()
    elapsed = time.time() - start_t
    print(f"All archive sheets migrated into data/apotek.db in {elapsed:.1f}s!")

if __name__ == '__main__':
    migrate_arsip()
