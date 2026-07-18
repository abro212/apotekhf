import sqlite3

db_path = "data/apotek.db"
conn = sqlite3.connect(db_path)
c = conn.cursor()

updates = {
    "Cek Harga": "https://images.unsplash.com/photo-1607619056574-7b8d304f3c6f?w=500&auto=format&fit=crop&q=60",
    "KASIR": "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=500&auto=format&fit=crop&q=60",
    "Master Obat": "https://images.unsplash.com/photo-1586015555751-63bb77f4322a?w=500&auto=format&fit=crop&q=60",
    "Menu Penjualan": "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500&auto=format&fit=crop&q=60",
    "Menu Pembelian": "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=500&auto=format&fit=crop&q=60",
    "Menu Laporan": "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=500&auto=format&fit=crop&q=60",
    "Menu Tagihan": "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=500&auto=format&fit=crop&q=60",
    "Dokumentasi Faktur": "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=500&auto=format&fit=crop&q=60",
    "Menu Stok Opname": "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=500&auto=format&fit=crop&q=60",
    "Cek Kesehatan": "https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=500&auto=format&fit=crop&q=60",
    "KAS": "https://images.unsplash.com/photo-1580519542036-c47de6196ba5?w=500&auto=format&fit=crop&q=60",
    "Supplier dan Pelanggan": "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=500&auto=format&fit=crop&q=60",
    "Pengaturan Menu & User": "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=500&auto=format&fit=crop&q=60"
}

for menu, url in updates.items():
    c.execute("UPDATE menu SET icon = ? WHERE menu = ?", (url, menu))

conn.commit()
conn.close()
print("Menu images updated successfully to modern photography!")
