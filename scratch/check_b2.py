import boto3
from botocore.config import Config

key_id = "005e7b99541d6d10000000001"
application_key = "K005CsPCivohAkngdfPIBGDDwNFis50"
bucket_name = "Cini-Book"
endpoint = "https://s3.us-east-005.backblazeb2.com"

try:
    s3 = boto3.client(
        's3',
        endpoint_url=endpoint,
        aws_access_key_id=key_id,
        aws_secret_access_key=application_key,
        config=Config(signature_version='s3v4')
    )
    print("Listing buckets...")
    buckets = s3.list_buckets()
    print("Buckets:", [b['Name'] for b in buckets.get('Buckets', [])])
    
    print(f"Checking bucket: {bucket_name}")
    s3.head_bucket(Bucket=bucket_name)
    print("Bucket is accessible!")
    
    print("Generating presigned URL for upload...")
    url = s3.generate_presigned_url(
        ClientMethod='put_object',
        Params={
            'Bucket': bucket_name,
            'Key': 'test_upload.txt',
            'ContentType': 'text/plain'
        },
        ExpiresIn=3600
    )
    print("Presigned URL:", url)
    
except Exception as e:
    print("Error:", e)
