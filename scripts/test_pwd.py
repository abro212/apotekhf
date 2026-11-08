import psycopg2

passwords = ['Blokc11no21!', 'Blokc11no21', 'postgres', 'admin']
host = "aws-0-ap-northeast-1.pooler.supabase.com"
user = "postgres.tcibuqljlsfslylewrhk"

for p in passwords:
    try:
        conn = psycopg2.connect(
            host=host,
            port=6543,
            user=user,
            password=p,
            dbname="postgres",
            connect_timeout=5
        )
        print(f"SUCCESS with password '{p}'!")
        conn.close()
        break
    except Exception as e:
        print(f"FAIL with '{p}': {e}")
