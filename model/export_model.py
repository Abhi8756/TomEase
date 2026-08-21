"""
Export your trained model to production format

This script:
1. Loads your best checkpoint from training
2. Performs temperature calibration on validation set
3. Exports production-ready .pth file
4. Saves metadata (classes, temperature, accuracy)
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import models
import json
from pathlib import Path
import numpy as np
from sklearn.metrics import accuracy_score

# ADJUST THESE PATHS TO YOUR NOTEBOOK SETUP
CHECKPOINT_PATH = "C:\Abhijit Data\TomEase\CBAM_True_SUPCON_True_FISHR_True_DVD_True_best_field.pth"  # Your trained model
VALIDATION_DATA_PATH = "path/to/validation_dataset"  # For calibration
OUTPUT_PATH = "resnet50_tomato_production.pth"

class ResNet50TomatoModel(nn.Module):
    """Same architecture as your training notebook"""
    
    def __init__(self, num_classes=6):
        super().__init__()
        self.backbone = models.resnet50(pretrained=False)
        num_features = self.backbone.fc.in_features
        self.backbone.fc = nn.Linear(num_features, num_classes)
    
    def forward(self, x):
        return self.backbone(x)

def temperature_scaling(model, val_loader, device):
    """
    Calibrate model confidence using temperature scaling
    
    This fixes overconfident predictions by finding optimal temperature T
    such that calibrated_prob = softmax(logits / T)
    """
    print("🌡️  Performing temperature scaling calibration...")
    
    # Collect logits and labels from validation set
    logits_list = []
    labels_list = []
    
    model.eval()
    with torch.no_grad():
        for images, labels in val_loader:
            images, labels = images.to(device), labels.to(device)
            logits = model(images)
            logits_list.append(logits)
            labels_list.append(labels)
    
    logits = torch.cat(logits_list)
    labels = torch.cat(labels_list)
    
    # Find optimal temperature using NLL loss
    temperature = nn.Parameter(torch.ones(1, device=device) * 1.5)
    optimizer = torch.optim.LBFGS([temperature], lr=0.01, max_iter=50)
    
    def eval_loss():
        optimizer.zero_grad()
        loss = F.cross_entropy(logits / temperature, labels)
        loss.backward()
        return loss
    
    optimizer.step(eval_loss)
    
    optimal_temp = temperature.item()
    
    # Evaluate calibration improvement
    before_acc = accuracy_score(
        labels.cpu().numpy(),
        F.softmax(logits, dim=1).argmax(dim=1).cpu().numpy()
    )
    
    after_acc = accuracy_score(
        labels.cpu().numpy(),
        F.softmax(logits / optimal_temp, dim=1).argmax(dim=1).cpu().numpy()
    )
    
    print(f"✅ Optimal temperature: {optimal_temp:.3f}")
    print(f"   Accuracy before: {before_acc:.4f}")
    print(f"   Accuracy after: {after_acc:.4f}")
    
    return optimal_temp

def export_model():
    """Main export function"""
    
    print("🚀 Starting model export...")
    
    # Load your trained model
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = ResNet50TomatoModel(num_classes=6)
    
    print(f"📂 Loading checkpoint from: {CHECKPOINT_PATH}")
    checkpoint = torch.load(CHECKPOINT_PATH, map_location=device)
    
    # Handle different checkpoint formats
    if isinstance(checkpoint, dict):
        if 'model_state_dict' in checkpoint:
            model.load_state_dict(checkpoint['model_state_dict'])
        elif 'state_dict' in checkpoint:
            model.load_state_dict(checkpoint['state_dict'])
        else:
            model.load_state_dict(checkpoint)
    else:
        model.load_state_dict(checkpoint)
    
    model.to(device)
    model.eval()
    
    print("✅ Model loaded successfully")
    
    # TODO: Load your validation dataloader
    # This is commented because I don't know your exact data loading code
    # Uncomment and adjust based on your notebook:
    
    # from torch.utils.data import DataLoader
    # from your_dataset import YourDataset, your_transform
    # 
    # val_dataset = YourDataset(VALIDATION_DATA_PATH, transform=your_transform)
    # val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False)
    # 
    # # Perform temperature calibration
    # temperature = temperature_scaling(model, val_loader, device)
    
    # For now, use default temperature
    temperature = 1.5
    print(f"⚠️  Using default temperature: {temperature}")
    print("   (Uncomment validation loader code above for proper calibration)")
    
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
        'export_date': str(Path(__file__).stat().st_mtime)
    }
    
    # Save
    torch.save(production_checkpoint, OUTPUT_PATH)
    print(f"✅ Production model saved: {OUTPUT_PATH}")
    print(f"   Size: {Path(OUTPUT_PATH).stat().st_size / (1024**2):.1f} MB")
    
    # Save metadata as JSON for easy reference
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
    print("\nNext steps:")
    print("1. Upload this .pth file to Render backend")
    print("2. Set MODEL_PATH environment variable")
    print("3. Deploy FastAPI app")

if __name__ == "__main__":
    export_model()
