import os
import urllib.request
import urllib.parse
import json

# Read .env file
env_vars = {}
with open('backend/.env', 'r') as f:
    for line in f:
        if '=' in line and not line.startswith('#'):
            key, val = line.strip().split('=', 1)
            env_vars[key] = val

client_id = env_vars.get('GOOGLE_DRIVE_CLIENT_ID')
client_secret = env_vars.get('GOOGLE_DRIVE_CLIENT_SECRET')
refresh_token = env_vars.get('GOOGLE_DRIVE_REFRESH_TOKEN')
folder_id = env_vars.get('GOOGLE_DRIVE_FOLDER_ID')

# Get Access Token
data = urllib.parse.urlencode({
    'client_id': client_id,
    'client_secret': client_secret,
    'refresh_token': refresh_token,
    'grant_type': 'refresh_token'
}).encode('utf-8')

req = urllib.request.Request('https://oauth2.googleapis.com/token', data=data)
try:
    with urllib.request.urlopen(req) as response:
        res_body = response.read()
        access_token = json.loads(res_body)['access_token']
except urllib.error.HTTPError as e:
    print(f"Error fetching token: {e.read().decode('utf-8')}")
    exit(1)

# List Files
query = f"'{folder_id}' in parents and trashed = false"
url = 'https://www.googleapis.com/drive/v3/files?q=' + urllib.parse.quote(query) + '&fields=files(id,name,size,mimeType)'

req2 = urllib.request.Request(url)
req2.add_header('Authorization', f'Bearer {access_token}')

with urllib.request.urlopen(req2) as response:
    files_data = json.loads(response.read())
    
print("--- Google Drive Files ---")
for f in files_data.get('files', []):
    size_mb = int(f.get('size', 0)) / (1024 * 1024)
    print(f"- {f.get('name')} | {size_mb:.2f} MB | {f.get('mimeType')} | ID: {f.get('id')}")
