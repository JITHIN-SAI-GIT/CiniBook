import requests
import os

login_url = "http://localhost:8080/api/auth/login"
login_data = {"email": "raavijithinsai@gmail.com", "password": "carelesscriminal@123"}
r = requests.post(login_url, json=login_data)
token = r.json()["token"]

headers = {"Authorization": f"Bearer {token}"}
upload_url = "http://localhost:8080/api/movies/1/video?provider=google_drive"
with open("test_video.mp4", "rb") as f:
    files = {"file": f}
    print("Uploading file...")
    res = requests.post(upload_url, headers=headers, files=files)
    print("Response status:", res.status_code)
    print("Response body:", res.text)
