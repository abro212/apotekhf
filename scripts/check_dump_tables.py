with open('data/supabase_dump.sql', 'r', encoding='utf-8', errors='ignore') as f:
    tables = []
    for line in f:
        if line.startswith('CREATE TABLE IF NOT EXISTS'):
            tname = line.split()[5].strip('(').strip()
            tables.append(tname)
        elif line.startswith('CREATE OR REPLACE VIEW'):
            vname = line.split()[4].strip()
            tables.append('VIEW: ' + vname)

print("Tables & views in dump:", len(tables))
print(tables)
