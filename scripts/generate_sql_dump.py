import sqlite3
import os

def generate_dump():
    sqlite_path = "data/apotek.db"
    dump_path = "data/supabase_dump.sql"
    
    if not os.path.exists(sqlite_path):
        print(f"Error: Database SQLite lokal tidak ditemukan di {sqlite_path}")
        return

    print("Membaca database SQLite lokal...")
    sq_conn = sqlite3.connect(sqlite_path)
    sq_cursor = sq_conn.cursor()
    
    # Get all tables
    sq_cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    tables = [r[0] for r in sq_cursor.fetchall()]
    
    print(f"Menghasilkan SQL dump untuk {len(tables)} tabel...")
    
    with open(dump_path, 'w', encoding='utf-8') as f:
        # Disable foreign keys temporarily and wrap in transaction
        f.write("BEGIN;\n\n")
        
        for table in tables:
            f.write(f"-- TABLE: {table}\n")
            f.write(f"DROP TABLE IF EXISTS \"{table}\" CASCADE;\n")
            
            # Get schema
            sq_cursor.execute(f"PRAGMA table_info(\"{table}\")")
            columns = [r[1] for r in sq_cursor.fetchall()]
            
            # Create Table statement
            col_defs = ",\n  ".join([f'"{c}" TEXT' for c in columns])
            f.write(f"CREATE TABLE \"{table}\" (\n  {col_defs}\n);\n\n")
            
            # Get data rows
            sq_cursor.execute(f"SELECT * FROM \"{table}\"")
            rows = sq_cursor.fetchall()
            
            if rows:
                f.write(f"-- Data for {table} ({len(rows)} rows)\n")
                
                # Format bulk insert statements for PG compatibility
                # We do it in chunks of 1000 rows to prevent massive single query execution limits
                chunk_size = 1000
                for i in range(0, len(rows), chunk_size):
                    chunk = rows[i:i+chunk_size]
                    
                    values_list = []
                    for row in chunk:
                        formatted_vals = []
                        for val in row:
                            if val is None:
                                formatted_vals.append("NULL")
                            else:
                                # Escape single quotes for PostgreSQL
                                escaped_val = str(val).replace("'", "''")
                                formatted_vals.append(f"'{escaped_val}'")
                        values_list.append("(" + ", ".join(formatted_vals) + ")")
                    
                    col_names = ", ".join([f'"{c}"' for c in columns])
                    f.write(f"INSERT INTO \"{table}\" ({col_names}) VALUES\n")
                    f.write(",\n".join(values_list) + ";\n\n")
                    
        # Add low stock warnings view
        f.write("-- VIEW: view_low_stock\n")
        f.write("CREATE OR REPLACE VIEW view_low_stock AS\n")
        f.write("SELECT \n")
        f.write("    id_obat, \n")
        f.write("    nama_obat, \n")
        f.write("    stok_unit_kecil, \n")
        f.write("    stok_minimal, \n")
        f.write("    label_satuan_kecil\n")
        f.write("FROM master_obat\n")
        f.write("WHERE \n")
        f.write("    stok_minimal IS NOT NULL \n")
        f.write("    AND stok_minimal != '' \n")
        f.write("    AND stok_minimal ~ '^[0-9.-]+$'\n")
        f.write("    AND stok_unit_kecil ~ '^[0-9.-]+$'\n")
        f.write("    AND CAST(stok_minimal AS NUMERIC) > 0\n")
        f.write("    AND CAST(stok_unit_kecil AS NUMERIC) <= CAST(stok_minimal AS NUMERIC);\n\n")
        
        f.write("COMMIT;\n")
        
    sq_conn.close()
    print(f"\nSukses! File SQL dump telah dihasilkan di: {dump_path}")
    print("Ukuran file siap disalin.")

if __name__ == "__main__":
    generate_dump()
