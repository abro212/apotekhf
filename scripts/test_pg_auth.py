import psycopg2

regions = ['ap-northeast-1', 'ap-southeast-1', 'us-east-1', 'eu-west-1', 'ap-southeast-2']
user = 'postgres.tcibuqljlsfslylewrhk'
password = 'Blokc11no21!'

for r in regions:
    host = f"aws-0-{r}.pooler.supabase.com"
    try:
        conn = psycopg2.connect(
            host=host,
            port=6543,
            user=user,
            password=password,
            dbname='postgres',
            connect_timeout=5
        )
        print(f"SUCCESS on {host}!")
        with conn.cursor() as cur:
            cur.execute("SELECT current_database(), version();")
            print("  DB info:", cur.fetchone())
        conn.close()
        break
    except Exception as e:
        print(f"FAIL on {host}: {e}")
