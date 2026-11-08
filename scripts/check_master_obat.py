import sqlite3
import json
import urllib.request

SUPABASE_URL = "https://tcibuqljlsfslylewrhk.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjaWJ1cWxqbHNmc2x5bGV3cmhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzOTI1ODQsImV4cCI6MjA5OTk2ODU4NH0.1PqqtuKJMtaFoyZVJjLJDR-kIx7bzoEMLcQVjYHdSSw"

def check_master_obat():
    # Fetch all id_obat from Supabase
    sb_ids = set()
    offset = 0
    limit = 1000
    while True:
        url = f"{SUPABASE_URL}/rest/v1/master_obat?select=id_obat&offset={offset}&limit={limit}"
        req = urllib.request.Request(url, headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"})
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            if not data:
                break
            for r in data:
                if r.get("id_obat"):
                    sb_ids.add(r["id_obat"])
            if len(data) < limit:
                break
            offset += len(data)
            
    print(f"Supabase unique id_obat count: {len(sb_ids)}")
    
    conn = sqlite3.connect("data/apotek.db")
    cur = conn.cursor()
    cur.execute("SELECT id_obat, nama_obat FROM master_obat")
    sq_rows = cur.fetchall()
    conn.close()
    
    missing_in_sb = [r for r in sq_rows if r[0] not in sb_ids]
    print(f"SQLite total medicines: {len(sq_rows)}")
    print(f"Medicines in SQLite missing from Supabase: {len(missing_in_sb)}")
    if missing_in_sb:
        print("Sample missing:", missing_in_sb[:5])

if __name__ == "__main__":
    check_master_obat()
