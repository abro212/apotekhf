def patch(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # We want to replace getExpBadge function
    import re
    pattern = re.compile(r'function getExpBadge\(expDateStr\) \{.*?\n\}', re.DOTALL)
    
    replacement = '''function getExpBadge(expDateStr) {
    if (!expDateStr) return '<span class="badge" style="background:#f1f5f9; color:#64748b; border-radius:9999px; padding:4px 10px; font-size:11px; white-space:nowrap; display:inline-block;">-</span>';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(expDateStr);
    if (isNaN(expDate.getTime())) return `<span class="badge" style="background:#f1f5f9; color:#64748b; border-radius:9999px; padding:4px 10px; font-size:11px; white-space:nowrap; display:inline-block;">${expDateStr}</span>`;
    
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    const formattedDate = expDate.toLocaleDateString('id-ID', options).toUpperCase();

    const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
        return `<span class="badge" style="background:#fee2e2; color:#dc2626; font-weight:700; border-radius:9999px; padding:4px 10px; font-size:11px; white-space:nowrap; display:inline-block;" title="Kadaluarsa">${formattedDate} (ED)</span>`;
    } else if (diffDays <= 90) {
        return `<span class="badge" style="background:#fef3c7; color:#d97706; font-weight:700; border-radius:9999px; padding:4px 10px; font-size:11px; white-space:nowrap; display:inline-block;" title="Mendekati Kadaluarsa">${formattedDate} (${diffDays} hr)</span>`;
    } else {
        return `<span class="badge" style="background:#ecfdf5; color:#059669; font-weight:700; border-radius:9999px; padding:4px 10px; font-size:11px; white-space:nowrap; display:inline-block;">${formattedDate}</span>`;
    }
}'''
    if pattern.search(content):
        new_content = pattern.sub(replacement, content, count=1)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Patched {filepath} successfully")
    else:
        print(f"Pattern not found in {filepath}")

patch('app.js')
patch('public/app.js')
