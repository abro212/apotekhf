import psycopg2
import sys

regions = [
    "ap-southeast-1",  # Singapore
    "us-east-1",       # N. Virginia
    "us-west-1",       # N. California
    "eu-central-1",    # Frankfurt
    "ap-northeast-1",  # Tokyo
    "ap-southeast-2",  # Sydney
    "eu-west-1",       # Ireland
    "us-east-2",       # Ohio
    "us-west-2",       # Oregon
]

project_ref = "tcibuqljlsfslylewrhk"
passwords = ["Blokc11no21!", "Blokc11no21"]

print("=== SUPABASE REGION FINDER ===")
found = False

for r in regions:
    for pwd in passwords:
        host = f"aws-0-{r}.pooler.supabase.com"
        username = f"postgres.{project_ref}"
        uri = f"postgresql://{username}:{pwd}@{host}:6543/postgres"
        print(f"Menguji wilayah: {r} ... ", end="")
        sys.stdout.flush()
        try:
            # short timeout
            conn = psycopg2.connect(uri, connect_timeout=4)
            conn.close()
            print("OK!")
            print(f"\n🎉 KONEKSI BERHASIL!")
            print(f"Wilayah database Anda adalah: {r}")
            print("\nSilakan salin link di bawah ini dan masukkan ke prompt migrasi:")
            print(uri)
            found = True
            break
        except Exception as e:
            err_str = str(e)
            if "authentication failed" in err_str.lower() or "password" in err_str.lower():
                print("HOST DITEMUKAN, tapi PASSWORD SALAH.")
                print(f"\n💡 Wilayah database Anda adalah: {r}")
                print("Namun password database Anda salah/tidak cocok.")
                found = True
                break
            else:
                print("Bukan region ini.")
    if found:
        break

if not found:
    print("\nTidak ada wilayah database yang cocok atau koneksi terblokir sepenuhnya.")
