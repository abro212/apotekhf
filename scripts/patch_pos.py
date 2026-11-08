with open('public/app.js', 'r', encoding='utf-8') as f:
    text = f.read()

target_pos = """        const { data, count, error } = await query.order('nama_obat').range(from, to);
            
        const results = document.getElementById('pos-search-results');
        results.innerHTML = '';
        
        if (!error && data) {"""

repl_pos = """        let { data, count, error } = await query.order('nama_obat').range(from, to);
            
        const results = document.getElementById('pos-search-results');
        
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

        results.innerHTML = '';

        if (error && !data) {
            results.innerHTML = '<div style="text-align:center; padding:20px; font-size:13px; color:#ef4444;">Gagal memuat katalog (Koneksi Supabase terputus). <button class="btn btn-secondary" style="padding:4px 10px; margin-left:8px; font-size:12px;" onclick="openDatabaseConfigModal()">⚙️ Atur Database</button></div>';
            return;
        }
        
        if (!error && data) {"""

if target_pos in text:
    text = text.replace(target_pos, repl_pos, 1)
    with open('public/app.js', 'w', encoding='utf-8') as f:
        f.write(text)
    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(text)
    print('posSearchObat patched!')
else:
    print('target_pos not found in text!')
