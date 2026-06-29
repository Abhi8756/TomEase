import os
import shutil
import glob
from typing import List, Dict
from datetime import datetime

class LocalStorage:
    """Local file storage manager for IceCloud volume mounts"""
    
    def __init__(self):
        self.base_dir = os.getenv("DATASET_STORAGE_PATH", "./storage")
        os.makedirs(f"{self.base_dir}/images", exist_ok=True)
        os.makedirs(f"{self.base_dir}/gradcams", exist_ok=True)
        os.makedirs(f"{self.base_dir}/models", exist_ok=True)
        print(f"[OK] Local Storage initialized at {self.base_dir}")
    
    async def upload_gradcam(self, image_bytes: bytes, scan_id: str) -> str:
        """Upload GradCAM heatmap"""
        filename = f"gradcams/{scan_id}.png"
        path = f"{self.base_dir}/{filename}"
        with open(path, 'wb') as f:
            f.write(image_bytes)
        return f"/storage/{filename}"
    
    async def upload_image(self, image_bytes: bytes, scan_id: str) -> str:
        """Upload original scan image"""
        filename = f"images/{scan_id}.jpg"
        path = f"{self.base_dir}/{filename}"
        with open(path, 'wb') as f:
            f.write(image_bytes)
        return f"/storage/{filename}"
    
    async def upload_model(self, model_path: str, version: str) -> str:
        """Upload model checkpoint"""
        filename = f"models/{version}.pth"
        dest = f"{self.base_dir}/{filename}"
        shutil.copy(model_path, dest)
        return dest
    
    async def download_model(self, version: str) -> str:
        """Download model checkpoint"""
        filename = f"models/{version}.pth"
        return f"{self.base_dir}/{filename}"
    
    async def list_model_versions(self) -> List[Dict]:
        """List all uploaded model versions"""
        files = glob.glob(f"{self.base_dir}/models/*.pth")
        versions = [
            {
                'version': os.path.basename(f).replace('.pth', ''),
                'uploaded_at': datetime.fromtimestamp(os.path.getmtime(f)).isoformat(),
                'size_mb': os.path.getsize(f) / (1024 * 1024)
            }
            for f in files
        ]
        return sorted(versions, key=lambda x: x['uploaded_at'], reverse=True)
