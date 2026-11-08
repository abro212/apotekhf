import re

with open('app.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if "from('master_obat')" in line or 'from("master_obat")' in line or "from('view_stok_realtime')" in line or 'from("view_stok_realtime")' in line:
        print(f"Line {idx+1}: {line.strip()}")
