with open('public/app.js', 'r', encoding='utf-8') as f:
    text = f.read()

target_sh = """        const { data, count, error } = await query.order('nama_obat', { ascending: true }).range(from, to);
        const tbody = document.getElementById('cek-harga-table-body');
        const mobileList = document.getElementById('cek-harga-mobile-list');
        
        tbody.innerHTML = '';
        if (mobileList) mobileList.innerHTML = '';
        
        if (!error && data) {"""

repl_sh = """        let { data, count, error } = await query.order('nama_obat', { ascending: true }).range(from, to);
        const tbody = document.getElementById('cek-harga-table-body');
        const mobileList = document.getElementById('cek-harga-mobile-list');
        
        // Fallback to local API if Supabase error
        if (error || !data) {
            try {
                const resp = await fetch(`/api/obat?limit=${pageSize}&offset=${from}${q ? '&q=' + encodeURIComponent(q) : ''}`);
                if (resp.ok) {
                    const json = await resp.json();
                    if (json.success && Array.isArray(json.data)) {
                        data = json.data;
                        count = json.count !== undefined ? json.count : json.data.length;
                        error = null;
                    }
                }
            } catch (e) {}
        }

        tbody.innerHTML = '';
        if (mobileList) mobileList.innerHTML = '';
        
        if (error && !data) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:30px; color:#ef4444;">Gagal memuat data (Koneksi Supabase terputus). <button class="btn btn-secondary" style="padding:4px 10px; margin-left:8px; font-size:12px;" onclick="openDatabaseConfigModal()">⚙️ Atur Database</button></td></tr>';
            return;
        }

        if (!error && data) {"""

if target_sh in text:
    text = text.replace(target_sh, repl_sh, 1)
    with open('public/app.js', 'w', encoding='utf-8') as f:
        f.write(text)
    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(text)
    print('searchHarga patched!')
else:
    print('target_sh not found in text!')
