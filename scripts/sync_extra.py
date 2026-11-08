import sqlite3
import json
import urllib.request
import urllib.error

SUPABASE_URL = "https://tcibuqljlsfslylewrhk.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjaWJ1cWxqbHNmc2x5bGV3cmhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzOTI1ODQsImV4cCI6MjA5OTk2ODU4NH0.1PqqtuKJMtaFoyZVJjLJDR-kIx7bzoEMLcQVjYHdSSw"

def sync_kontrol_and_laporan():
    conn = sqlite3.connect("data/apotek.db")
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    
    # 1. Kontrol Pasien
    print("--- Checking kontrol_pasien ---")
    sb_cols = ['tgl', 'jam', 'id_trans', 'id', 'nama', 'alamat', 'tensi', 'gula', 'asam_urat', 'kolesterol', 'obat', 'keterangan']
    existing_trans = set()
    offset = 0
    limit = 1000
    while True:
        url = f"{SUPABASE_URL}/rest/v1/kontrol_pasien?select=id_trans&offset={offset}&limit={limit}"
        req = urllib.request.Request(url, headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"})
        try:
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read().decode())
                if not data:
                    break
                for r in data:
                    if r.get("id_trans"):
                        existing_trans.add(str(r["id_trans"]))
                if len(data) < limit:
                    break
                offset += len(data)
        except Exception as e:
            print(f"Error fetching kontrol_pasien: {e}")
            break
            
    print(f"Existing kontrol_pasien in Supabase: {len(existing_trans)}")
    cur.execute("SELECT * FROM kontrol_pasien")
    sq_kontrol = cur.fetchall()
    missing_kontrol = []
    for r in sq_kontrol:
        d = dict(r)
        tid = str(d.get("id_trans") or "")
        if tid and tid not in existing_trans:
            row_dict = {c: d.get(c) for c in sb_cols if c in d}
            missing_kontrol.append(row_dict)
            existing_trans.add(tid)
            
    print(f"Missing kontrol_pasien to insert: {len(missing_kontrol)}")
    if missing_kontrol:
        batch_size = 200
        for i in range(0, len(missing_kontrol), batch_size):
            batch = missing_kontrol[i:i+batch_size]
            payload = json.dumps(batch).encode('utf-8')
            req = urllib.request.Request(
                f"{SUPABASE_URL}/rest/v1/kontrol_pasien",
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
        print(f"Inserted {len(missing_kontrol)} kontrol_pasien rows.")

    # 2. Laporan Harian
    print("--- Checking laporan_harian ---")
    url = f"{SUPABASE_URL}/rest/v1/laporan_harian?select=count"
    req = urllib.request.Request(url, headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Prefer": "count=exact"})
    with urllib.request.urlopen(req) as resp:
        print("laporan_harian in Supabase:", resp.headers.get("Content-Range"))
        
    conn.close()

if __name__ == "__main__":
    sync_kontrol_and_laporan()
