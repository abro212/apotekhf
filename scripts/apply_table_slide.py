def update_styles(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    addition = '''

/* ENFORCE HORIZONTAL SLIDE & CONTAINMENT FOR DATA TABLES */
.main-area {
    min-width: 0 !important;
    max-width: 100% !important;
    overflow-x: hidden !important;
}

.content-container {
    min-width: 0 !important;
    max-width: 100% !important;
    overflow-x: hidden !important;
}

.view-card {
    min-width: 0 !important;
    max-width: 100% !important;
    overflow: hidden !important;
}

.table-container {
    width: 100% !important;
    max-width: 100% !important;
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch !important;
    border-radius: var(--radius-md) !important;
    border: 1px solid var(--border-color) !important;
    box-sizing: border-box !important;
    display: block !important;
    scrollbar-width: thin !important;
    scrollbar-color: #0d9488 #f1f5f9 !important;
}

/* Custom Visible Scrollbar for Horizontal Sliding */
.table-container::-webkit-scrollbar {
    height: 9px !important;
}

.table-container::-webkit-scrollbar-track {
    background: #f1f5f9 !important;
    border-radius: 6px !important;
}

.table-container::-webkit-scrollbar-thumb {
    background: #0d9488 !important;
    border-radius: 6px !important;
}

.table-container::-webkit-scrollbar-thumb:hover {
    background: #0f766e !important;
}

/* Ensure data-table has minimum width so all columns fit and slide horizontally */
.data-table {
    min-width: 1240px !important;
}

/* Sticky first column (ID Obat) so user never loses context while sliding */
.data-table th:first-child,
.data-table td:first-child {
    position: sticky !important;
    left: 0 !important;
    background-color: #ffffff !important;
    z-index: 2 !important;
    box-shadow: 2px 0 5px rgba(0, 0, 0, 0.05) !important;
}

.data-table th:first-child {
    background-color: #fafbfc !important;
    z-index: 3 !important;
}
'''
    if '/* ENFORCE HORIZONTAL SLIDE & CONTAINMENT FOR DATA TABLES */' not in content:
        content += addition
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated styles in {filepath}")
    else:
        print(f"Already present in {filepath}")

def update_app_js(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    drag_scroll_code = '''
// Initialize mouse drag-to-scroll for table containers
function initTableDragToScroll() {
    document.querySelectorAll('.table-container').forEach(slider => {
        if (slider.dataset.dragInit) return;
        slider.dataset.dragInit = 'true';
        let isDown = false;
        let startX = 0;
        let scrollLeft = 0;

        slider.addEventListener('mousedown', (e) => {
            if (['BUTTON', 'A', 'INPUT', 'SELECT', 'SVG', 'PATH'].includes(e.target.tagName)) return;
            isDown = true;
            slider.style.cursor = 'grabbing';
            slider.style.userSelect = 'none';
            startX = e.pageX - slider.offsetLeft;
            scrollLeft = slider.scrollLeft;
        });
        slider.addEventListener('mouseleave', () => {
            isDown = false;
            slider.style.cursor = '';
            slider.style.userSelect = '';
        });
        slider.addEventListener('mouseup', () => {
            isDown = false;
            slider.style.cursor = '';
            slider.style.userSelect = '';
        });
        slider.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - slider.offsetLeft;
            const walk = (x - startX) * 1.5;
            slider.scrollLeft = scrollLeft - walk;
        });
    });
}
document.addEventListener('DOMContentLoaded', initTableDragToScroll);
window.addEventListener('load', initTableDragToScroll);
'''
    if 'initTableDragToScroll' not in content:
        content += drag_scroll_code
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Added drag scroll to {filepath}")
    else:
        print(f"Already present in {filepath}")

update_styles('style.css')
update_styles('public/style.css')
update_app_js('app.js')
update_app_js('public/app.js')
