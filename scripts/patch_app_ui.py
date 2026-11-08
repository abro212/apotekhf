import os
import re

def patch_app_js():
    with open('public/app.js', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. New getExpBadge and loadMasterObat replacement
    new_get_exp_and_load_master = '''function getExpBadge(expDateStr) {
    if (!expDateStr) return '<span class="badge" style="background:#f1f5f9; color:#64748b; border-radius:9999px; padding:4px 10px; font-size:11px;">-</span>';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(expDateStr);
    if (isNaN(expDate.getTime())) return `<span class="badge" style="background:#f1f5f9; color:#64748b; border-radius:9999px; padding:4px 10px; font-size:11px;">${expDateStr}</span>`;
    
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    const formattedDate = expDate.toLocaleDateString('id-ID', options).toUpperCase();

    const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
        return `<span class="badge" style="background:#fee2e2; color:#ef4444; font-weight:700; border-radius:9999px; padding:4px 10px; font-size:11px;" title="Kadaluarsa">⚠️ ${formattedDate} (ED)</span>`;
    } else if (diffDays <= 90) {
        return `<span class="badge" style="background:#fef3c7; color:#d97706; font-weight:700; border-radius:9999px; padding:4px 10px; font-size:11px;" title="Mendekati Kadaluarsa">⏳ ${formattedDate} (${diffDays} hr)</span>`;
    } else {
        return `<span class="badge" style="background:#ecfdf5; color:#10b981; font-weight:700; border-radius:9999px; padding:4px 10px; font-size:11px;">📅 ${formattedDate}</span>`;
    }
}

async function loadMasterObat(page = currentObatPage, pageSize = currentObatPageSize) {
    currentObatPage = page;
    currentObatPageSize = pageSize;
    const searchEl = document.getElementById('master-obat-search');
    const q = searchEl ? searchEl.value.trim() : '';

    if (!supabaseClient) {
        checkSupabaseConfig();
    }

    const tbody = document.getElementById('master-obat-table-body');
    const mobileList = document.getElementById('master-obat-mobile-list');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="11" style="text-align:center; padding:30px; color:var(--text-muted); font-weight:600;">⏳ Memuat data master obat...</td></tr>';
    if (mobileList) mobileList.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted);">⏳ Memuat data...</div>';

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let data = null;
    let count = 0;
    let queryError = null;

    // 1. Try Supabase first
    if (supabaseClient) {
        try {
            let query = supabaseClient.from('view_stok_realtime').select('*', { count: 'exact' });
            if (q) {
                const cleanQ = q.replace(/[%_,()]/g, '');
                if (cleanQ) {
                    query = query.or(`id_obat.ilike.%${cleanQ}%,nama_obat.ilike.%${cleanQ}%`);
                }
            }
            const res = await query.order('nama_obat', { ascending: true }).range(from, to);
            if (res.error) {
                // Try fallback to master_obat table if view_stok_realtime does not exist
                let altQuery = supabaseClient.from('master_obat').select('*', { count: 'exact' });
                if (q) {
                    const cleanQ = q.replace(/[%_,()]/g, '');
                    if (cleanQ) altQuery = altQuery.or(`id_obat.ilike.%${cleanQ}%,nama_obat.ilike.%${cleanQ}%`);
                }
                const altRes = await altQuery.order('nama_obat', { ascending: true }).range(from, to);
                if (!altRes.error && altRes.data) {
                    data = altRes.data;
                    count = altRes.count;
                } else {
                    queryError = res.error;
                }
            } else {
                data = res.data;
                count = res.count;
            }
        } catch (netErr) {
            queryError = netErr;
        }
    }

    // 2. Try Local Express API (/api/obat) if Supabase failed or paused
    if (!data && (queryError || !supabaseClient)) {
        try {
            const localUrl = `/api/obat?limit=${pageSize}&offset=${from}${q ? '&q=' + encodeURIComponent(q) : ''}`;
            const resp = await fetch(localUrl);
            if (resp.ok) {
                const json = await resp.json();
                if (json.success && Array.isArray(json.data)) {
                    data = json.data;
                    count = json.count !== undefined ? json.count : json.data.length;
                    queryError = null;
                }
            }
        } catch (localErr) {
            // Local API not responding
        }
    }

    tbody.innerHTML = '';
    if (mobileList) mobileList.innerHTML = '';

    // If query still errored (Supabase paused or unreachable, and no local API)
    if (!data && queryError) {
        console.error('Error fetching master_obat:', queryError);
        const isFetchError = queryError.message && (queryError.message.includes('fetch') || queryError.message.includes('Network') || queryError.message.includes('Failed'));
        
        tbody.innerHTML = `
            <tr>
                <td colspan="11" style="text-align:center; padding: 40px 20px;">
                    <div style="max-width: 580px; margin: 0 auto; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; padding: 24px; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.06);">
                        <div style="font-size: 32px; margin-bottom: 8px;">🔌</div>
                        <h3 style="color: #9f1239; font-size: 16px; font-weight: 800; margin-bottom: 8px;">Koneksi Database Cloud (Supabase) Terputus</h3>
                        <p style="color: #4b5563; font-size: 13px; line-height: 1.6; margin-bottom: 16px;">
                            ${isFetchError 
                                ? 'Proyek Supabase (<code>tcibuqljlsfslylewrhk</code>) sedang <strong>tidak aktif / paused</strong> karena kebijakan gratis Supabase setelah 7 hari tidak aktif, atau jaringan tidak dapat menjangkau server.' 
                                : `Terjadi kesalahan saat memuat data: ${escapeHtml(queryError.message)}`}
                        </p>
                        <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
                            <a href="https://supabase.com/dashboard" target="_blank" class="btn btn-primary" style="padding: 8px 16px; font-size: 12px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
                                <span>Buka Supabase & Restore Project</span> ↗
                            </a>
                            <button type="button" class="btn btn-secondary" onclick="openDatabaseConfigModal()" style="padding: 8px 16px; font-size: 12px;">
                                ⚙️ Atur URL & API Key
                            </button>
                            <button type="button" class="btn btn-secondary" onclick="loadMasterObat()" style="padding: 8px 16px; font-size: 12px;">
                                🔄 Coba Muat Ulang
                            </button>
                        </div>
                    </div>
                </td>
            </tr>
        `;
        if (mobileList) {
            mobileList.innerHTML = `
                <div style="background:#fff1f2; border:1px solid #fecdd3; border-radius:8px; padding:16px; text-align:center; margin:10px;">
                    <div style="font-size:24px; margin-bottom:6px;">🔌</div>
                    <div style="color:#9f1239; font-weight:700; font-size:14px; margin-bottom:6px;">Koneksi Database Terputus</div>
                    <div style="color:#4b5563; font-size:12px; margin-bottom:12px;">Proyek Supabase kemungkinan sedang Paused di Free Tier.</div>
                    <button class="btn btn-primary" onclick="openDatabaseConfigModal()" style="padding:6px 12px; font-size:12px;">⚙️ Atur Supabase</button>
                </div>
            `;
        }
        return;
    }

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" style="text-align:center; padding:30px; color:var(--text-muted);">Tidak ada data obat yang ditemukan.</td></tr>';
        if (mobileList) mobileList.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted);">Tidak ada data obat.</div>';
        return;
    }

    try {
        data.forEach(o => {
            const encId = encodeURIComponent(o.id_obat || '');
            const safeName = escapeHtml(o.nama_obat || '');
            const safeKat = escapeHtml(o.kategori || '-');
            const safeJenis = escapeHtml(o.jenis_item || 'NON KONSI');
            const safeSat1 = escapeHtml(o.satuan_1 || 'Pcs');
            const safeLabelKecil = escapeHtml(o.label_satuan_kecil || o.satuan_1 || 'Pcs');
            
            const displayStok = o.stok_realtime !== null && o.stok_realtime !== undefined ? o.stok_realtime : (o.stok_unit_kecil || 0);

            const beliNum = parseFloat(o.harga_beli_sat_1 || 0);
            const jualNum = parseFloat(o.harga_l1_s1 || 0);
            const diffNom = jualNum - beliNum;
            let marginBadge = '<span class="badge" style="background:#f1f5f9; color:#64748b; border-radius:9999px; padding:4px 10px; font-size:11px;">Rp 0 (0%)</span>';

            if (beliNum > 0 || jualNum > 0) {
                const mVal = beliNum > 0 ? ((jualNum - beliNum) / beliNum) * 100 : 0;
                const mStr = mVal % 1 === 0 ? mVal.toString() : mVal.toFixed(1);
                const nomStr = formatMoney(diffNom);
                
                if (diffNom > 0) {
                    marginBadge = `<span class="badge" style="display:inline-flex; flex-direction:column; align-items:center; justify-content:center; background:#ecfdf5; color:#10b981; font-weight:700; padding:4px 10px; border-radius:9999px; line-height:1.2; font-size:11px;"><span>+RP ${nomStr}</span><span>(+${mStr}%)</span></span>`;
                } else if (diffNom < 0) {
                    marginBadge = `<span class="badge" style="display:inline-flex; flex-direction:column; align-items:center; justify-content:center; background:#fef2f2; color:#ef4444; font-weight:700; padding:4px 10px; border-radius:9999px; line-height:1.2; font-size:11px;"><span>-RP ${formatMoney(Math.abs(diffNom))}</span><span>(${mStr}%)</span></span>`;
                } else {
                    marginBadge = `<span class="badge" style="background:#f1f5f9; color:#64748b; font-weight:700; padding:4px 10px; border-radius:9999px; font-size:11px;">Rp 0 (0%)</span>`;
                }
            }

            const expDateVal = o.expired_date || o.tanggal_kadaluarsa || o.exp_date || getLocalObatEd(o.id_obat);
            const expBadge = getExpBadge(expDateVal);
            const rawExpStr = String(expDateVal || '-');
            const cleanExpStr = rawExpStr !== 'null' && rawExpStr !== 'undefined' ? rawExpStr.substring(0, 10) : '-';

            // Desktop row
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${o.id_obat || ''}</strong></td>
                <td><a href="javascript:void(0)" style="font-weight:700; color:var(--primary-color); text-decoration:none;" onclick="previewObat('${encId}', event)">${safeName}</a></td>
                <td>${safeKat}</td>
                <td><span class="badge" style="background:#f1f5f9; color:#334155; font-weight:700; border-radius:9999px; padding:4px 10px; font-size:11px;">${safeJenis}</span></td>
                <td>
                    <div style="font-weight:800; font-size:14px; color:var(--text-main); line-height:1.2;">${displayStok}</div>
                    <div style="font-size:11px; color:var(--text-muted);">${safeLabelKecil}</div>
                </td>
                <td>${safeSat1}</td>
                <td>Rp ${formatMoney(o.harga_beli_sat_1)}</td>
                <td>${marginBadge}</td>
                <td>Rp ${formatMoney(o.harga_l1_s1)}</td>
                <td>${expBadge}</td>
                <td style="white-space: nowrap; text-align: center;">
                    <div style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; flex-wrap: nowrap;">
                        <button class="btn btn-secondary" style="width: 32px; height: 32px; padding: 0; border-radius: 8px; display:inline-flex; align-items:center; justify-content:center;" onclick="previewObat('${encId}', event)" title="Lihat Detail">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        </button>
                        <button class="btn btn-primary" style="width: 32px; height: 32px; padding: 0; border-radius: 8px; display:inline-flex; align-items:center; justify-content:center;" onclick="editObat('${encId}', event)" title="Edit Obat">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button class="btn btn-danger" style="width: 32px; height: 32px; padding: 0; border-radius: 8px; display:inline-flex; align-items:center; justify-content:center;" onclick="deleteObat('${encId}', event)" title="Hapus Obat">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);

            // Mobile card
            if (mobileList) {
                const card = document.createElement('div');
                card.className = 'price-card-mobile';
                
                const stockNum = parseFloat(displayStok);
                const stockMin = parseFloat(o.stok_minimal || 5);
                const stockBadgeStyle = stockNum <= stockMin 
                    ? 'background-color:#fee2e2; color:#ef4444;' 
                    : 'background-color:#ecfdf5; color:#10b981;';
                    
                card.innerHTML = `
                    <div class="price-card-header">
                        <div style="flex:1;" onclick="previewObat('${encId}', event)">
                            <div class="price-card-title" style="color:var(--primary-color); cursor:pointer;">${safeName}</div>
                            <div class="price-card-sub">ID: ${o.id_obat || ''} • ED: ${cleanExpStr} • Jenis: ${safeJenis}</div>
                        </div>
                        <span class="badge" style="${stockBadgeStyle}">Stok: ${stockNum} ${safeLabelKecil}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                        <div style="font-size:12px; color:var(--text-muted);">
                            Beli: <strong>Rp ${formatMoney(o.harga_beli_sat_1)}</strong> • Margin: ${marginBadge}
                        </div>
                        <div style="display:flex; gap:6px;">
                            <button class="btn btn-secondary" style="width: 32px; height: 32px; padding: 0; border-radius: 8px; display:inline-flex; align-items:center; justify-content:center;" onclick="previewObat('${encId}', event)" title="Lihat Detail">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                            </button>
                            <button class="btn btn-primary" style="width: 32px; height: 32px; padding: 0; border-radius: 8px; display:inline-flex; align-items:center; justify-content:center;" onclick="editObat('${encId}', event)" title="Edit Obat">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                            <button class="btn btn-danger" style="width: 32px; height: 32px; padding: 0; border-radius: 8px; display:inline-flex; align-items:center; justify-content:center;" onclick="deleteObat('${encId}', event)" title="Hapus Obat">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </div>
                    </div>
                `;
                mobileList.appendChild(card);
            }
        });

        const totalPages = Math.ceil((count !== null && count !== undefined ? count : data.length) / pageSize);
        renderPaginationControls('master-obat-pagination', page, totalPages, pageSize, 'loadMasterObat');
    } catch (e) {
        console.error('Error rendering Master Obat rows:', e);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding:30px; color:#ef4444;">Terjadi kesalahan sistem: ${e.message}</td></tr>`;
        }
    }
}'''

    # Pattern to find getExpBadge + loadMasterObat up to calcAddMargin
    pattern = r'function getExpBadge\(expDateStr\) \{.*?\n\}\n\nasync function loadMasterObat\(.*?\n\}\n'
    
    match = re.search(pattern, content, flags=re.DOTALL)
    if not match:
        raise Exception("Pattern for getExpBadge + loadMasterObat not matched!")
    
    content = content[:match.start()] + new_get_exp_and_load_master + '\n' + content[match.end():]

    # 2. Add openDatabaseConfigModal, testModalSupabaseConn, handleSaveDbConfigModal if not present
    db_helpers = '''
function openDatabaseConfigModal() {
    const url = localStorage.getItem('supabaseUrl') || DEFAULT_SUPABASE_URL;
    const key = localStorage.getItem('supabaseAnonKey') || DEFAULT_SUPABASE_KEY;
    const urlInput = document.getElementById('modal-db-url');
    const keyInput = document.getElementById('modal-db-key');
    const statusMsg = document.getElementById('modal-db-status-msg');
    
    if (urlInput) urlInput.value = url;
    if (keyInput) keyInput.value = key;
    if (statusMsg) {
        statusMsg.style.display = 'none';
        statusMsg.textContent = '';
    }
    
    const modal = document.getElementById('modal-db-config');
    if (modal) modal.classList.remove('hidden');
}

async function testModalSupabaseConn() {
    const urlInput = document.getElementById('modal-db-url');
    const keyInput = document.getElementById('modal-db-key');
    const statusMsg = document.getElementById('modal-db-status-msg');
    const url = urlInput ? urlInput.value.trim() : '';
    const key = keyInput ? keyInput.value.trim() : '';
    
    if (!url || !key) {
        if (statusMsg) {
            statusMsg.style.display = 'block';
            statusMsg.style.color = '#ef4444';
            statusMsg.textContent = '❌ URL dan Key tidak boleh kosong!';
        }
        return;
    }
    
    if (statusMsg) {
        statusMsg.style.display = 'block';
        statusMsg.style.color = 'var(--text-muted)';
        statusMsg.textContent = '⏳ Menguji koneksi ke ' + url + '...';
    }
    
    try {
        if (!window.supabase) throw new Error('Supabase SDK tidak termuat');
        const testClient = window.supabase.createClient(url, key);
        const { error } = await testClient.from('master_obat').select('id_obat').limit(1);
        if (error) throw error;
        
        if (statusMsg) {
            statusMsg.style.color = '#10b981';
            statusMsg.textContent = '✅ Koneksi Sukses! Supabase aktif dan dapat diakses.';
        }
    } catch (err) {
        if (statusMsg) {
            statusMsg.style.color = '#ef4444';
            statusMsg.textContent = '❌ Gagal terhubung: ' + err.message + ' (Periksa apakah project aktif / tidak paused)';
        }
    }
}

function handleSaveDbConfigModal(e) {
    if (e) e.preventDefault();
    const urlInput = document.getElementById('modal-db-url');
    const keyInput = document.getElementById('modal-db-key');
    const url = urlInput ? urlInput.value.trim() : '';
    const key = keyInput ? keyInput.value.trim() : '';
    
    if (!url || !key) {
        alert('Supabase URL dan Anon Key tidak boleh kosong!');
        return;
    }
    
    localStorage.setItem('supabaseUrl', url);
    localStorage.setItem('supabaseAnonKey', key);
    
    if (checkSupabaseConfig()) {
        closeModal('modal-db-config');
        alert('Pengaturan database berhasil disimpan! Memuat ulang data...');
        // Reload active view
        if (currentViewId === 'view-master-obat') loadMasterObat();
        else if (currentViewId === 'view-kasir') initPOS();
        else if (currentViewId === 'view-cek-harga') searchHarga();
    } else {
        alert('Gagal menginisialisasi client Supabase dengan URL/Key tersebut.');
    }
}
'''
    if 'function openDatabaseConfigModal()' not in content:
        content += db_helpers

    with open('public/app.js', 'w', encoding='utf-8') as f:
        f.write(content)

    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(content)
        
    print('public/app.js and app.js patched successfully!')

def patch_index_html():
    with open('public/index.html', 'r', encoding='utf-8') as f:
        html = f.read()

    # 1. Add Database status button in header-right if not present
    if 'id="header-db-btn"' not in html:
        header_target = '<div class="user-badge" id="header-user-badge">'
        header_replacement = '''<button type="button" class="btn" id="header-db-btn" onclick="openDatabaseConfigModal()" title="Status & Pengaturan Database Cloud" style="padding: 5px 12px; font-size: 11.5px; font-weight: 700; border-radius: 20px; background: #ecfdf5; color: #0d9488; border: 1px solid rgba(13, 148, 136, 0.2); display: inline-flex; align-items: center; gap: 6px; cursor: pointer;">
                        <span id="header-db-dot" style="width: 8px; height: 8px; border-radius: 50%; background: #10b981; display: inline-block;"></span>
                        <span id="header-db-label">Database Cloud</span>
                    </button>
                    ''' + header_target
        if header_target in html:
            html = html.replace(header_target, header_replacement, 1)

    # 2. Add modal-db-config before </body> if not present
    if 'id="modal-db-config"' not in html:
        modal_html = '''
    <!-- Modal Konfigurasi Database Supabase -->
    <div id="modal-db-config" class="modal-overlay hidden">
        <div class="modal-content" style="max-width: 520px; border-radius: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 12px; margin-bottom: 15px;">
                <h3 style="margin: 0; font-size: 17px; font-weight: 800; color: var(--text-main); display: flex; align-items: center; gap: 8px;">
                    🔌 Konfigurasi Database Cloud (Supabase)
                </h3>
                <button type="button" class="btn btn-secondary" style="padding: 4px 10px; font-size: 12px;" onclick="closeModal('modal-db-config')">✕ Tutup</button>
            </div>
            
            <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 12.5px; line-height: 1.5; color: #9f1239;">
                <strong>💡 Catatan Supabase Free Tier:</strong><br>
                Jika data tidak keluar dan muncul <code>TypeError: Failed to fetch</code>, kemungkinan besar project Supabase Anda sedang <strong>Paused (Tidak Aktif)</strong> karena kebijakan free tier setelah 7 hari tidak ada traffic.<br>
                Silakan buka <a href="https://supabase.com/dashboard" target="_blank" style="color: #0d9488; font-weight: 700; text-decoration: underline;">Supabase Dashboard</a> lalu klik tombol <strong>"Restore Project"</strong>.
            </div>

            <form onsubmit="handleSaveDbConfigModal(event)">
                <div class="form-group" style="margin-bottom: 14px;">
                    <label style="font-weight: 700; font-size: 13px;">Supabase Project URL</label>
                    <input type="text" id="modal-db-url" class="form-control" placeholder="https://xxxxxxxxxxxx.supabase.co" required>
                    <small style="color: var(--text-muted); font-size: 11px;">Ditemukan di Supabase Dashboard → Settings → API → Project URL</small>
                </div>

                <div class="form-group" style="margin-bottom: 18px;">
                    <label style="font-weight: 700; font-size: 13px;">Supabase Anon Public API Key</label>
                    <input type="password" id="modal-db-key" class="form-control" placeholder="eyJhbGciOiJIUz..." required>
                    <small style="color: var(--text-muted); font-size: 11px;">Ditemukan di Supabase Dashboard → Settings → API → anon public key</small>
                </div>

                <div id="modal-db-status-msg" style="margin-bottom: 14px; font-size: 12.5px; font-weight: 600; display: none;"></div>

                <div style="display: flex; gap: 8px; justify-content: flex-end;">
                    <button type="button" class="btn btn-secondary" onclick="testModalSupabaseConn()">🧪 Uji Koneksi</button>
                    <button type="submit" class="btn btn-primary">💾 Simpan & Terapkan</button>
                </div>
            </form>
        </div>
    </div>
'''
        body_target = '</body>'
        if body_target in html:
            html = html.replace(body_target, modal_html + '\n' + body_target, 1)

    with open('public/index.html', 'w', encoding='utf-8') as f:
        f.write(html)

    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(html)
        
    print('public/index.html and index.html patched successfully!')

if __name__ == '__main__':
    patch_app_js()
    patch_index_html()
