import urllib.request
import urllib.parse
import json

API_BASE = "http://localhost:8080/api"

def run_test():
    # 1. Login
    print("Logging in...")
    login_url = f"{API_BASE}/auth/login"
    login_data = json.dumps({
        "email": "raavijithinsai@gmail.com",
        "password": "carelesscriminal@123"
    }).encode('utf-8')
    
    req = urllib.request.Request(
        login_url,
        data=login_data,
        headers={"Content-Type": "application/json"}
    )
    
    try:
        with urllib.request.urlopen(req) as res:
            res_data = json.loads(res.read().decode('utf-8'))
            token = res_data["token"]
            print("Logged in successfully. Token length:", len(token))
    except Exception as e:
        print("Login failed:", e)
        if hasattr(e, 'read'):
            print("Login error body:", e.read().decode('utf-8'))
        return

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Fetch storage stats
    print("\nFetching storage stats...")
    stats_req = urllib.request.Request(
        f"{API_BASE}/movies/storage/stats",
        headers={"Authorization": f"Bearer {token}"}
    )
    try:
        with urllib.request.urlopen(stats_req) as res:
            stats_data = json.loads(res.read().decode('utf-8'))
            print("Storage Stats:", json.dumps(stats_data, indent=2))
    except Exception as e:
        print("Storage Stats failed:", e)
        if hasattr(e, 'read'):
            print("Stats error body:", e.read().decode('utf-8'))

    # 2. Get presigned upload URL
    print("\nGetting presigned upload URL...")
    params = urllib.parse.urlencode({
        "fileName": "test_video.mp4",
        "contentType": "video/mp4",
        "fileSize": 1000000, # 1MB
        "provider": "auto"
    })
    
    url_req = urllib.request.Request(
        f"{API_BASE}/movies/1/presigned-upload-url?{params}",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    try:
        with urllib.request.urlopen(url_req) as res:
            url_data = json.loads(res.read().decode('utf-8'))
            print("Presigned URL data:", json.dumps(url_data, indent=2))
    except Exception as e:
        print("Failed to get presigned URL:", e)
        if hasattr(e, 'read'):
            print("Presigned URL error body:", e.read().decode('utf-8'))
        return

    upload_url = url_data.get("uploadUrl")
    object_key = url_data.get("objectKey")
    provider = url_data.get("provider")

    if not upload_url:
        print("No uploadUrl returned.")
        return

    # 3. Perform PUT upload
    print(f"\nPerforming PUT upload to {provider}...")
    dummy_data = b"a" * 1000000
    
    put_req = urllib.request.Request(
        upload_url,
        data=dummy_data,
        headers={"Content-Type": "video/mp4"},
        method="PUT"
    )
    
    try:
        with urllib.request.urlopen(put_req) as res:
            print("PUT Upload Status Code:", res.status)
            print("PUT Response Headers:", dict(res.headers))
            print("PUT Response Content (first 500 chars):", res.read().decode('utf-8', errors='ignore')[:500])
    except Exception as e:
        print("PUT Upload failed with exception:", e)
        if hasattr(e, 'read'):
            print("PUT Upload error body:", e.read().decode('utf-8', errors='ignore'))

if __name__ == "__main__":
    run_test()
