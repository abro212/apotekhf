import json
import urllib.request
import urllib.error
import time

SUPABASE_URL = "https://tcibuqljlsfslylewrhk.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjaWJ1cWxqbHNmc2x5bGV3cmhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzOTI1ODQsImV4cCI6MjA5OTk2ODU4NH0.1PqqtuKJMtaFoyZVJjLJDR-kIx7bzoEMLcQVjYHdSSw"

def sync_stock():
    print("Fetching realtime stock from view_stok_realtime...")
    offset = 0
    limit = 1000
    all_stocks = []
    
    while True:
        url = f"{SUPABASE_URL}/rest/v1/view_stok_realtime?select=id_obat,stok_realtime&offset={offset}&limit={limit}"
        req = urllib.request.Request(url, headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"})
        try:
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read().decode())
                if not data:
                    break
                all_stocks.extend(data)
                if len(data) < limit:
                    break
                offset += len(data)
        except Exception as e:
            print(f"Error fetching view_stok_realtime: {e}")
            break
            
    print(f"Total medicines with realtime stock: {len(all_stocks)}")
    
    # Filter those where stok_realtime is not None
    updates = []
    for item in all_stocks:
        id_obat = item.get("id_obat")
        stok = item.get("stok_realtime")
        if id_obat and stok is not None:
            updates.append({"id_obat": id_obat, "stok_unit_kecil": str(stok)})
            
    print(f"Medicines to update in master_obat: {len(updates)}")
    
    # Batch update via upsert with merge-duplicates
    batch_size = 200
    total = len(updates)
    updated = 0
    for i in range(0, total, batch_size):
        batch = updates[i:i+batch_size]
        payload = json.dumps(batch).encode('utf-8')
        req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/master_obat",
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
                if resp.status in (200, 201, 204):
                    updated += len(batch)
                    print(f"Updated {updated}/{total} medicines...", end="\r", flush=True)
        except Exception as e:
            print(f"\nError updating batch {i}: {e}")
        time.sleep(0.05)
        
    print(f"\nFinished updating {updated}/{total} medicines in master_obat!")

if __name__ == "__main__":
    sync_stock()
