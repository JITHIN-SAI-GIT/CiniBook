import urllib.request
import urllib.parse
import json

login_url = "http://localhost:8080/api/auth/login"
login_data = {
    "email": "raavijithinsai@gmail.com",
    "password": "carelesscriminal@123"
}

print("Attempting login...")
try:
    # 1. Login to get token
    req_data = json.dumps(login_data).encode('utf-8')
    req = urllib.request.Request(
        login_url, 
        data=req_data, 
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req) as response:
        res = json.loads(response.read().decode('utf-8'))
        token = res["token"]
        print("Login successful! Token acquired.")
        
        # 2. Get pre-signed URL
        url_params = urllib.parse.urlencode({
            "fileName": "test-video.mkv",
            "contentType": "video/matroska"
        })
        presigned_endpoint = f"http://localhost:8080/api/movies/417/presigned-upload-url?{url_params}"
        
        req = urllib.request.Request(presigned_endpoint)
        req.add_header("Authorization", f"Bearer {token}")
        
        print("Requesting pre-signed URL...")
        with urllib.request.urlopen(req) as upload_response:
            data = json.loads(upload_response.read().decode('utf-8'))
            print("Success! Pre-signed upload URL acquired:")
            print(f"Upload URL: {data['uploadUrl'][:120]}...")
            print(f"Object Key: {data['objectKey']}")
except Exception as e:
    print(f"Error during execution: {e}")
