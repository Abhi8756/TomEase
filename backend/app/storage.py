import boto3
from botocore.client import Config
import os
from typing import List, Dict
from datetime import datetime

class R2Storage:
    """Cloudflare R2 storage manager (S3-compatible)"""
    
    def __init__(self):
        self.account_id = os.getenv("R2_ACCOUNT_ID")
        self.access_key = os.getenv("R2_ACCESS_KEY_ID")
        self.secret_key = os.getenv("R2_SECRET_ACCESS_KEY")
        self.bucket_name = os.getenv("R2_BUCKET_NAME", "tomato-disease-models")
        
        if not all([self.account_id, self.access_key, self.secret_key]):
            print("[WARN] R2 credentials not set - using local storage")
            self.use_local = True
            os.makedirs("./storage/gradcams", exist_ok=True)
            os.makedirs("./storage/models", exist_ok=True)
            return
        
        self.use_local = False
        
        # Initialize R2 client (S3-compatible)
        self.client = boto3.client(
            's3',
            endpoint_url=f'https://{self.account_id}.r2.cloudflarestorage.com',
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            config=Config(signature_version='s3v4')
        )
        
        # Create bucket if it doesn't exist
        try:
            self.client.head_bucket(Bucket=self.bucket_name)
        except:
            self.client.create_bucket(Bucket=self.bucket_name)
        
        print(f"[OK] R2 Storage connected: {self.bucket_name}")
    
    async def upload_gradcam(self, image_bytes: bytes, scan_id: str) -> str:
        """Upload GradCAM heatmap"""
        filename = f"gradcams/{scan_id}.png"
        
        if self.use_local:
            # Save locally
            path = f"./storage/{filename}"
            with open(path, 'wb') as f:
                f.write(image_bytes)
            return f"/storage/{filename}"
        
        # Upload to R2
        self.client.put_object(
            Bucket=self.bucket_name,
            Key=filename,
            Body=image_bytes,
            ContentType='image/png'
        )
        
        # Return public URL
        return f"https://pub-{self.account_id}.r2.dev/{filename}"
    
    async def upload_model(self, model_path: str, version: str) -> str:
        """Upload model checkpoint"""
        filename = f"models/{version}.pth"
        
        if self.use_local:
            # Copy locally
            import shutil
            dest = f"./storage/{filename}"
            shutil.copy(model_path, dest)
            return dest
        
        # Upload to R2
        with open(model_path, 'rb') as f:
            self.client.put_object(
                Bucket=self.bucket_name,
                Key=filename,
                Body=f,
                ContentType='application/octet-stream'
            )
        
        return f"https://pub-{self.account_id}.r2.dev/{filename}"
    
    async def download_model(self, version: str) -> str:
        """Download model checkpoint"""
        filename = f"models/{version}.pth"
        local_path = f"/tmp/{version}.pth"
        
        if self.use_local:
            return f"./storage/{filename}"
        
        # Download from R2
        self.client.download_file(
            Bucket=self.bucket_name,
            Key=filename,
            Filename=local_path
        )
        
        return local_path
    
    async def list_model_versions(self) -> List[Dict]:
        """List all uploaded model versions"""
        if self.use_local:
            import os
            import glob
            files = glob.glob("./storage/models/*.pth")
            return [
                {
                    'version': os.path.basename(f).replace('.pth', ''),
                    'uploaded_at': datetime.fromtimestamp(os.path.getmtime(f)).isoformat(),
                    'size_mb': os.path.getsize(f) / (1024 * 1024)
                }
                for f in files
            ]
        
        # List from R2
        response = self.client.list_objects_v2(
            Bucket=self.bucket_name,
            Prefix='models/'
        )
        
        versions = []
        for obj in response.get('Contents', []):
            versions.append({
                'version': obj['Key'].replace('models/', '').replace('.pth', ''),
                'uploaded_at': obj['LastModified'].isoformat(),
                'size_mb': obj['Size'] / (1024 * 1024)
            })
        
        return sorted(versions, key=lambda x: x['uploaded_at'], reverse=True)
