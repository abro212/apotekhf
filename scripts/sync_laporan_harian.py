import sqlite3
import json
import urllib.request

SUPABASE_URL = "https://tcibuqljlsfslylewrhk.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjaWJ1cWxqbHNmc2x5bGV3cmhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzOTI1ODQsImV4cCI6MjA5OTk2ODU4NH0.1PqqtuKJMtaFoyZVJjLJDR-kIx7bzoEMLcQVjYHdSSw"

def sync_laporan_harian():
    existing = set()
    offset = 0
    limit = 1000
    while True:
        url = f"{SUPABASE_URL}/rest/v1/laporan_harian?select=tanggal,shift&offset={offset}&limit={limit}"
        req = urllib.request.Request(url, headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"})
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            if not data:
                break
            for r in data:
                key = f"{r.get('tanggal')}_{r.get('shift')}"
                existing.add(key)
            if len(data) < limit:
                break
            offset += len(data)
            
    print(f"Existing in Supabase: {len(existing)}")
    
    conn = sqlite3.connect("data/apotek.db")
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("SELECT * FROM laporan_harian")
    sq_rows = cur.fetchall()
    
    # get supabase cols
    url = f"{SUPABASE_URL}/rest/v1/laporan_harian?limit=1"
    req = urllib.request.Request(url, headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"})
    with urllib.request.urlopen(req) as resp:
        sb_cols = list(json.loads(resp.read().decode())[0].keys())
        
    missing = []
    for r in sq_rows:
        d = dict(r)
        key = f"{d.get('tanggal')}_{d.get('shift')}"
        if key not in existing:
            row_dict = {c: d.get(c) for c in sb_cols if c in d}
            missing.append(row_dict)
            existing.add(key)
            
    print(f"Missing laporan_harian to insert: {len(missing)}")
    if missing:
        batch_size = 100
        for i in range(0, len(missing), batch_size):
            batch = missing[i:i+batch_size]
            payload = json.dumps(batch).encode('utf-8')
            req = urllib.request.Request(
                f"{SUPABASE_URL}/rest/v1/laporan_harian",
                data=payload,
                headers={
                    "apikey": SUPABASE_KEY,
                    "Authorization": f"Bearer {SUPABASE_KEY}",
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal"
                },
                method="POST"
            )
            with urllib.request.urlopen(req) as resp:
                pass
        print(f"Inserted {len(missing)} rows successfully!")
        
    conn.close()

if __name__ == "__main__":
    sync_laporan_harian()
