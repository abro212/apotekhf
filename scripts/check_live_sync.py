import sqlite3
import json
import urllib.request
import urllib.error

SUPABASE_URL = "https://tcibuqljlsfslylewrhk.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjaWJ1cWxqbHNmc2x5bGV3cmhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzOTI1ODQsImV4cCI6MjA5OTk2ODU4NH0.1PqqtuKJMtaFoyZVJjLJDR-kIx7bzoEMLcQVjYHdSSw"

def check():
    conn = sqlite3.connect("data/apotek.db")
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    tables = [r[0] for r in cur.fetchall()]
    
    print(f"{'Table':<25} | {'SQLite Count':<12} | {'Supabase Count':<15} | Status")
    print("-" * 65)
    
    for t in tables:
        cur.execute(f"SELECT count(*) FROM \"{t}\"")
        sq_count = cur.fetchone()[0]
        
        req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/{t}?select=count",
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Range-Unit": "items",
                "Prefer": "count=exact"
            }
        )
        try:
            with urllib.request.urlopen(req) as resp:
                cr = resp.headers.get("Content-Range")
                sb_count = cr.split("/")[1] if cr and "/" in cr else "OK"
                status = "MATCH" if str(sq_count) == str(sb_count) else "DIFF"
        except urllib.error.HTTPError as e:
            sb_count = f"HTTP {e.code}"
            status = "ERROR"
        except Exception as e:
            sb_count = str(e)[:15]
            status = "ERROR"
            
        print(f"{t:<25} | {sq_count:<12} | {sb_count:<15} | {status}")
        
    conn.close()

if __name__ == "__main__":
    check()
