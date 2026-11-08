import socket

regions = ['ap-northeast-1', 'ap-southeast-1', 'us-east-1', 'eu-west-1', 'ap-southeast-2']
for r in regions:
    host = f"aws-0-{r}.pooler.supabase.com"
    try:
        s = socket.create_connection((host, 6543), timeout=3)
        print(f"{host}:6543 CONNECTED")
        s.close()
    except Exception as e:
        print(f"{host}:6543 FAIL: {e}")
