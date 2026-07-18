import sqlite3
import subprocess
import sys
import os

# 1. Ensure psycopg2 is installed
try:
    import psycopg2
except ImportError:
    print("PostgreSQL adapter (psycopg2-binary) not found. Installing it now...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "psycopg2-binary"])
        import psycopg2
    except Exception as e:
        print(f"Error installing library: {e}")
        print("Please run: pip install psycopg2-binary")
        sys.exit(1)

def migrate():
    sqlite_path = "data/apotek.db"
    if not os.path.exists(sqlite_path):
        print(f"Error: Local SQLite database not found at {sqlite_path}")
        return

    print("=== APOTEK HF SUPABASE MIGRATION TOOL ===")
    print("Temukan connection string di Supabase Dashboard -> Project Settings -> Database -> Connection string -> URI.")
    print("Format: postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres\n")
    
    conn_str = input("Masukkan Supabase PostgreSQL Connection URI: ").strip()
    if not conn_str:
        print("Error: Connection string tidak boleh kosong.")
        return

    try:
        print("\nMenghubungkan ke Supabase (PostgreSQL)...")
        pg_conn = psycopg2.connect(conn_str)
        pg_cursor = pg_conn.cursor()
        print("Terhubung dengan sukses ke Supabase!")
    except Exception as e:
        print(f"Gagal terhubung ke Supabase: {e}")
        return

    try:
        print("Menghubungkan ke SQLite lokal...")
        sq_conn = sqlite3.connect(sqlite_path)
        sq_cursor = sq_conn.cursor()
    except Exception as e:
        print(f"Gagal membuka SQLite: {e}")
        pg_conn.close()
        return

    # Fetch all user tables
    sq_cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    tables = [r[0] for r in sq_cursor.fetchall()]

    print(f"Menemukan {len(tables)} tabel untuk dimigrasikan: {', '.join(tables)}")

    # Import extras for fast batch inserts
    from psycopg2.extras import execute_values

    for table in tables:
        print(f"\n--- Migrasi Tabel: {table} ---")
        
        # Get column names
        sq_cursor.execute(f"PRAGMA table_info(\"{table}\")")
        columns = [r[1] for r in sq_cursor.fetchall()]
        
        # Drop table if exists on Supabase
        print(f"Mengosongkan tabel '{table}' jika sudah ada di Supabase...")
        pg_cursor.execute(f'DROP TABLE IF EXISTS "{table}" CASCADE')
        
        # Create table on Supabase (default all to TEXT for SQLite parity)
        col_defs = ", ".join([f'"{c}" TEXT' for c in columns])
        create_sql = f'CREATE TABLE "{table}" ({col_defs})'
        pg_cursor.execute(create_sql)
        print(f"Tabel '{table}' berhasil dibuat di Supabase.")

        # Fetch data from SQLite
        sq_cursor.execute(f'SELECT * FROM "{table}"')
        rows = sq_cursor.fetchall()
        
        if not rows:
            print("Tabel kosong, melewati migrasi data.")
            continue
            
        print(f"Mengunduh {len(rows)} baris data dari SQLite...")
        
        # Insert data to Supabase in fast batches
        insert_sql = f'INSERT INTO "{table}" VALUES %s'
        
        # Execute fast batch insert on PG
        batch_size = 5000
        for i in range(0, len(rows), batch_size):
            batch = rows[i:i+batch_size]
            execute_values(pg_cursor, insert_sql, batch, page_size=batch_size)
            pg_conn.commit()
            print(f"  Mengunggah data... {min(i + batch_size, len(rows))}/{len(rows)} baris selesai.")

        print(f"Tabel '{table}' berhasil dimigrasikan dengan {len(rows)} baris.")

    # Create low stock warning view in Supabase
    print("\nMembuat view 'view_low_stock' di Supabase...")
    try:
        pg_cursor.execute("""
            CREATE OR REPLACE VIEW view_low_stock AS
            SELECT 
                id_obat, 
                nama_obat, 
                stok_unit_kecil, 
                stok_minimal, 
                label_satuan_kecil
            FROM master_obat
            WHERE 
                stok_minimal IS NOT NULL 
                AND stok_minimal != '' 
                AND stok_minimal ~ '^[0-9.-]+$'
                AND stok_unit_kecil ~ '^[0-9.-]+$'
                AND CAST(stok_minimal AS NUMERIC) > 0
                AND CAST(stok_unit_kecil AS NUMERIC) <= CAST(stok_minimal AS NUMERIC);
        """)
        pg_conn.commit()
        print("View 'view_low_stock' berhasil dibuat!")
    except Exception as e:
        print(f"Gagal membuat view: {e}")
        pg_conn.rollback()

    # Close connections
    sq_conn.close()
    pg_conn.close()
    print("\n=============================================")
    print("MIGRASI DATA SQLite KE SUPABASE SELESAI!")
    print("Semua tabel dan data berhasil diunggah ke cloud.")
    print("=============================================")

if __name__ == "__main__":
    migrate()
