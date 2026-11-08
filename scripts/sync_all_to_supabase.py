import sqlite3
import json
import urllib.request
import urllib.error
import time

SUPABASE_URL = "https://tcibuqljlsfslylewrhk.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjaWJ1cWxqbHNmc2x5bGV3cmhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzOTI1ODQsImV4cCI6MjA5OTk2ODU4NH0.1PqqtuKJMtaFoyZVJjLJDR-kIx7bzoEMLcQVjYHdSSw"

def get_supabase_columns(table):
    url = f"{SUPABASE_URL}/rest/v1/{table}?limit=1"
    req = urllib.request.Request(url, headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            if data:
                return list(data[0].keys())
    except Exception as e:
        print(f"Error getting columns for {table}: {e}")
    return []

def get_existing_ids(table, id_col):
    existing = set()
    offset = 0
    limit = 1000
    while True:
        url = f"{SUPABASE_URL}/rest/v1/{table}?select={id_col}&offset={offset}&limit={limit}"
        req = urllib.request.Request(url, headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"})
        try:
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read().decode())
                if not data:
                    break
                for r in data:
                    val = r.get(id_col)
                    if val is not None:
                        existing.add(str(val))
                if len(data) < limit:
                    break
                offset += len(data)
        except Exception as e:
            print(f"Error fetching existing IDs for {table}: {e}")
            break
    return existing

def batch_insert(table, rows, batch_size=500):
    if not rows:
        return 0
    total = len(rows)
    inserted = 0
    for i in range(0, total, batch_size):
        batch = rows[i:i+batch_size]
        payload = json.dumps(batch).encode('utf-8')
        req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/{table}",
            data=payload,
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal"
            },
            method="POST"
        )
        for attempt in range(3):
            try:
                with urllib.request.urlopen(req) as resp:
                    if resp.status in (200, 201, 204):
                        inserted += len(batch)
                        print(f"  [{table}] Inserted {inserted}/{total} rows...", end="\r", flush=True)
                        break
            except urllib.error.HTTPError as e:
                err_msg = e.read().decode()
                print(f"\n  [{table}] HTTP error on batch {i}: {e.code} - {err_msg[:200]}")
                time.sleep(1)
            except Exception as e:
                print(f"\n  [{table}] Error on batch {i}: {e}")
                time.sleep(1)
        time.sleep(0.05)
    print(f"\n  [{table}] Finished: {inserted}/{total} rows inserted.")
    return inserted

def sync_table(sq_conn, table, id_col):
    print(f"\n=== Syncing table: {table} (ID: {id_col}) ===")
    sb_cols = get_supabase_columns(table)
    if not sb_cols:
        print(f"Skipping {table}: unable to get Supabase columns (table might not exist).")
        return
        
    existing_ids = get_existing_ids(table, id_col)
    print(f"  Existing records in Supabase: {len(existing_ids)}")
    
    cur = sq_conn.cursor()
    cur.execute(f'SELECT * FROM "{table}"')
    sq_rows = cur.fetchall()
    print(f"  Total records in SQLite: {len(sq_rows)}")
    
    missing = []
    for r in sq_rows:
        d = dict(r)
        key_val = str(d.get(id_col) or "")
        if key_val and key_val not in existing_ids:
            row_dict = {c: d.get(c) for c in sb_cols if c in d}
            missing.append(row_dict)
            existing_ids.add(key_val) # prevent dups in SQLite
            
    print(f"  Missing records to sync: {len(missing)}")
    if missing:
        batch_insert(table, missing, batch_size=400)
    else:
        print("  All records already up to date!")

def main():
    sq_conn = sqlite3.connect("data/apotek.db")
    sq_conn.row_factory = sqlite3.Row
    
    # Tables with unique IDs to sync
    sync_jobs = [
        ("master_obat", "id_obat"),
        ("retur_jual", "id_retur"),
        ("supplier", "id_supplier"),
        ("pelanggan", "id_pelanggan"),
        ("daftar_pasien", "id"),
        ("pembayaran_konsi", "id_bayar"),
        ("detail_bayar_konsi", "id_detail_bayar"),
        ("pelunasan_hutang", "id_pelunasan"),
        ("detail_pelunasan_hutang", "id_detail_pelunasan"),
        ("log_beli", "id_beli"),
        ("transaksi_jual", "id_jual"),
        ("detail_jual", "id_detail"),
    ]
    
    for table, id_col in sync_jobs:
        try:
            sync_table(sq_conn, table, id_col)
        except Exception as e:
            print(f"Error syncing {table}: {e}")
            
    sq_conn.close()
    print("\n==============================================")
    print("ALL TABLES SYNC FINISHED!")
    print("==============================================")

if __name__ == "__main__":
    main()
