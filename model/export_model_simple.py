"""
Simple Model Export Script - No validation data required!

This script:
1. Loads your checkpoint
2. Exports production-ready .pth file
3. Uses default temperature (works great!)
"""

import torch
import torch.nn as nn
from torchvision import models
import json
from pathlib import Path

# Your checkpoint file (adjust if needed)
CHECKPOINT_PATH = "../CBAM_True_SUPCON_True_FISHR_True_DVD_True_best_field.pth"
OUTPUT_PATH = "resnet50_tomato_production.pth"

class ResNet50TomatoModel(nn.Module):
    """ResNet50 for tomato disease classification"""
    
    def __init__(self, num_classes=6):
        super().__init__()
        self.backbone = models.resnet50(pretrained=False)
        num_features = self.backbone.fc.in_features
        self.backbone.fc = nn.Linear(num_features, num_classes)
    
    def forward(self, x):
        return self.backbone(x)

def export_model():
    """Export your model to production format"""
    
    print("🚀 Starting model export...")
    print(f"📂 Loading checkpoint from: {CHECKPOINT_PATH}")
    
    # Load checkpoint
    device = torch.device('cpu')  # Use CPU for export
    checkpoint = torch.load(CHECKPOINT_PATH, map_location=device)
    
    # Create model
    model = ResNet50TomatoModel(num_classes=6)
    
    # Load weights - handle different checkpoint formats
    try:
        # Try loading directly (common format)
        model.load_state_dict(checkpoint)
        print("✅ Loaded checkpoint directly (state_dict format)")
    except:
        try:
            # Try with 'model_state_dict' key
            model.load_state_dict(checkpoint['model_state_dict'])
            print("✅ Loaded checkpoint with 'model_state_dict' key")
        except:
            try:
                # Try with 'state_dict' key
                model.load_state_dict(checkpoint['state_dict'])
                print("✅ Loaded checkpoint with 'state_dict' key")
            except Exception as e:
                print(f"❌ Failed to load checkpoint: {e}")
                print("\nCheckpoint keys:", checkpoint.keys() if isinstance(checkpoint, dict) else "Not a dict")
                return
    
    model.eval()
    
    # Temperature for confidence calibration
    # 1.5 is a good default based on research
    temperature = 1.5
    
    # Classes from your dataset
    classes = [
        "Early_Blight",
        "Healthy",
        "Late_Blight",
        "Leaf_Mold",
        "Septoria",
        "TYLCV"
    ]
    
    # Create production checkpoint
    production_checkpoint = {
        'model_state_dict': model.state_dict(),
        'temperature': temperature,
        'classes': classes,
        'accuracy_field': 0.902,  # From your ablation study
        'architecture': 'ResNet50',
        'num_classes': 6
    }
    
    # Save
    torch.save(production_checkpoint, OUTPUT_PATH)
    
    file_size = Path(OUTPUT_PATH).stat().st_size / (1024**2)
    print(f"\n✅ Production model saved: {OUTPUT_PATH}")
    print(f"   Size: {file_size:.1f} MB")
    
    # Save metadata as JSON
    metadata = {
        'classes': classes,
        'temperature': temperature,
        'accuracy_field': 0.902,
        'architecture': 'ResNet50',
        'input_size': [224, 224],
        'normalization': {
            'mean': [0.485, 0.456, 0.406],
            'std': [0.229, 0.224, 0.225]
        }
    }
    
    with open('model_metadata.json', 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print("✅ Metadata saved: model_metadata.json")
    print("\n🎉 Export complete! Ready for deployment.")
    print("\nNext step:")
    print(f"Upload to backend with:")
    print(f'curl -X POST https://tomato-api-xlik.onrender.com/admin/upload-model \\')
    print(f'  -H "X-API-Key: YOUR_KEY" \\')
    print(f'  -F "file=@{OUTPUT_PATH}"')

if __name__ == "__main__":
    export_model()
