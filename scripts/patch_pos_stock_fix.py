def patch_pos_query(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    old_target = """ let query = supabaseClient.from('master_obat').select('*', { count: 'exact' });
 if (q) {
 query = query.or(`id_obat.ilike.%${q}%,nama_obat.ilike.%${q}%`);
 }

 if (catFilter) {
 query = query.eq('kategori', catFilter);
 }

 let { data, count, error } = await query.order('nama_obat').range(from, to);"""

    new_target = """ let data = null;
 let count = 0;
 let error = null;

 if (supabaseClient) {
 try {
 const cleanQ = q.replace(/[%_,()]/g, '');
 let query = supabaseClient.from('view_stok_realtime').select('*', { count: 'exact' });
 if (cleanQ) {
 query = query.or(`id_obat.ilike.%${cleanQ}%,nama_obat.ilike.%${cleanQ}%`);
 }
 if (catFilter) {
 query = query.eq('kategori', catFilter);
 }
 let res = await query.order('nama_obat', { ascending: true }).range(from, to);
 if (res.error) {
 let altQuery = supabaseClient.from('master_obat').select('*', { count: 'exact' });
 if (cleanQ) altQuery = altQuery.or(`id_obat.ilike.%${cleanQ}%,nama_obat.ilike.%${cleanQ}%`);
 if (catFilter) altQuery = altQuery.eq('kategori', catFilter);
 res = await altQuery.order('nama_obat', { ascending: true }).range(from, to);
 }
 data = res.data;
 count = res.count;
 error = res.error;
 } catch (err) {
 error = err;
 }
 }"""

    content_n = content.replace('\r\n', '\n')
    old_target_n = old_target.replace('\r\n', '\n')
    new_target_n = new_target.replace('\r\n', '\n')

    if old_target_n in content_n:
        content_n = content_n.replace(old_target_n, new_target_n, 1)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content_n)
        print(f"Patched pos query in {filepath}")
    else:
        print(f"Target still not found in {filepath}")

patch_pos_query('app.js')
patch_pos_query('public/app.js')
