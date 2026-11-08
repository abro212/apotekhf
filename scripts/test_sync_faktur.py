import sqlite3
import json
import urllib.request
import urllib.error

SUPABASE_URL = "https://tcibuqljlsfslylewrhk.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjaWJ1cWxqbHNmc2x5bGV3cmhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzOTI1ODQsImV4cCI6MjA5OTk2ODU4NH0.1PqqtuKJMtaFoyZVJjLJDR-kIx7bzoEMLcQVjYHdSSw"

def test_sync():
    conn = sqlite3.connect("data/apotek.db")
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    
    # 1. Get existing id_faktur in Supabase
    existing_ids = set()
    offset = 0
    limit = 1000
    while True:
        url = f"{SUPABASE_URL}/rest/v1/faktur_beli?select=id_faktur&offset={offset}&limit={limit}"
        req = urllib.request.Request(url, headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"})
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            if not data:
                break
            for r in data:
                if r.get("id_faktur"):
                    existing_ids.add(str(r["id_faktur"]))
            if len(data) < limit:
                break
            offset += limit
            
    print(f"Existing faktur_beli in Supabase: {len(existing_ids)}")
    
    # 2. Get all rows from SQLite
    cur.execute("SELECT * FROM faktur_beli")
    rows = cur.fetchall()
    print(f"Total faktur_beli in SQLite: {len(rows)}")
    
    # Filter missing
    missing = []
    # Supabase columns
    target_cols = ['id_faktur', 'nomor_faktur', 'tanggal_masuk', 'supplier', 'jenis_transaksi', 'metode_bayar', 'jatuh_tempo', 'nominal_bayar', 'tgl_bayar', 'user']
    
    for r in rows:
        d = dict(r)
        fid = str(d.get("id_faktur") or "")
        if fid and fid not in existing_ids:
            row_dict = {c: d.get(c) for c in target_cols if c in d}
            missing.append(row_dict)
            
    print(f"Missing faktur_beli to insert: {len(missing)}")
    
    # 3. Batch insert
    batch_size = 200
    for i in range(0, len(missing), batch_size):
        batch = missing[i:i+batch_size]
        payload = json.dumps(batch).encode('utf-8')
        req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/faktur_beli",
            data=payload,
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal"
            },
            method="POST"
        )
        try:
            with urllib.request.urlopen(req) as resp:
                print(f"Inserted batch {i//batch_size + 1}: status {resp.status}")
        except urllib.error.HTTPError as e:
            print(f"Error inserting batch: {e.code} - {e.read().decode()}")
            break
            
    conn.close()

if __name__ == "__main__":
    test_sync()
