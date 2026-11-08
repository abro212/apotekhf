import json
import urllib.request
import urllib.error

SUPABASE_URL = "https://tcibuqljlsfslylewrhk.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjaWJ1cWxqbHNmc2x5bGV3cmhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzOTI1ODQsImV4cCI6MjA5OTk2ODU4NH0.1PqqtuKJMtaFoyZVJjLJDR-kIx7bzoEMLcQVjYHdSSw"

def test_upsert():
    # Test on retur_jual
    payload = json.dumps([{
        "id_retur": "TEST_RETUR_999",
        "id_jual": "TEST_JUAL",
        "id_obat": "HF00001",
        "jumlah_retur": "1",
        "alasan_retur": "Test sync",
        "user": "ADMIN",
        "tanggal_retur": "2026-11-08"
    }]).encode('utf-8')
    
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/retur_jual",
        data=payload,
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates"
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as resp:
            print("Upsert status:", resp.status)
    except urllib.error.HTTPError as e:
        print(f"Upsert failed: {e.code} - {e.read().decode()}")
        
    # Clean up test row
    req_del = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/retur_jual?id_retur=eq.TEST_RETUR_999",
        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"},
        method="DELETE"
    )
    with urllib.request.urlopen(req_del) as resp:
        print("Delete test status:", resp.status)

if __name__ == "__main__":
    test_upsert()
