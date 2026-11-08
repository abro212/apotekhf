import openpyxl
import sqlite3
import os
import re

def clean_col(c, idx=0):
    if not c or str(c).startswith('<'):
        return f'col_{idx}'
    c = str(c).strip().lower()
    c = re.sub(r'[^a-z0-9_]+', '_', c)
    c = re.sub(r'_+', '_', c).strip('_')
    return c if c else f'col_{idx}'

def migrate():
    excel_path = 'data/database_new.xlsx'
    db_path = 'data/apotek.db'
    backup_path = 'data/apotek_old_backup.db'

    if not os.path.exists(excel_path):
        print(f"Error: {excel_path} not found.")
        return

    if os.path.exists(db_path) and not os.path.exists(backup_path):
        os.rename(db_path, backup_path)
        print(f"Backed up old db to {backup_path}")

    print("Loading database_new.xlsx (data_only=True)...")
    wb = openpyxl.load_workbook(excel_path, data_only=True)
    
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    total_sheets = len(wb.sheetnames)
    print(f"Found {total_sheets} sheets in database_new.xlsx")

    for s_idx, sheetname in enumerate(wb.sheetnames):
        ws = wb[sheetname]
        rows = list(ws.iter_rows(values_only=True))
        if not rows or len(rows) < 1:
            continue
        
        raw_headers = rows[0]
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

        tbl_name = clean_col(sheetname)
        col_defs = ', '.join([f'"{h}" TEXT' for h in headers])
        cur.execute(f'DROP TABLE IF EXISTS "{tbl_name}"')
        cur.execute(f'CREATE TABLE "{tbl_name}" ({col_defs})')

        data_rows = rows[1:]
        if data_rows:
            placeholders = ', '.join(['?'] * len(headers))
            cleaned_data = []
            for r in data_rows:
                # pad or slice to match headers length
                row_vals = list(r)
                if len(row_vals) < len(headers):
                    row_vals.extend([None] * (len(headers) - len(row_vals)))
                row_vals = row_vals[:len(headers)]
                cleaned_data.append([str(val) if val is not None else None for val in row_vals])
            cur.executemany(f'INSERT INTO "{tbl_name}" VALUES ({placeholders})', cleaned_data)
        
        print(f"[{s_idx+1}/{total_sheets}] Migrated '{tbl_name}': {len(data_rows)} rows ({len(headers)} cols)")

    conn.commit()
    conn.close()
    print("All sheets successfully migrated to data/apotek.db!")

if __name__ == '__main__':
    migrate()
