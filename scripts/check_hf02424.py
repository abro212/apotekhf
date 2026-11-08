import sqlite3
conn = sqlite3.connect('data/apotek.db')
cur = conn.cursor()
cur.execute("SELECT id_obat, nama_obat, stok_unit_kecil FROM master_obat WHERE id_obat = 'HF02424'")
print(cur.fetchone())
conn.close()
