import re

def main():
    file_path = "public/app.js"
    print(f"Membaca {file_path}...")
    with open(file_path, "r", encoding="utf-8") as f:
        code = f.read()

    # Regex to match 'supabase' as a whole word
    # We replace it with 'supabaseClient' unless it is part of:
    # 1. 'window.supabase'
    # 2. 'supabase.createClient'
    def replacer(match):
        start, end = match.span()
        # check if preceded by 'window.'
        if start >= 7 and code[start-7:start] == "window.":
            return "supabase"
        # check if followed by '.createClient'
        if end + 13 <= len(code) and code[end:end+13] == ".createClient":
            return "supabase"
        return "supabaseClient"

    new_code = re.sub(r'\bsupabase\b', replacer, code)

    print(f"Menulis perubahan kembali ke {file_path}...")
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(new_code)
        
    print("Renaming sukses selesai!")

if __name__ == "__main__":
    main()
