import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import models, transforms
from PIL import Image
import numpy as np
import cv2
import io
import json
import os
from typing import Dict, Tuple, Optional
from datetime import datetime

class ResNet50TomatoModel(nn.Module):
    """
    ResNet50-based model matching the saved checkpoint architecture.

    The checkpoint (CBAM_True_SUPCON_True_FISHR_True_DVD_True_best_field.pth)
    was trained with this exact structure:

        self.features   = nn.Sequential(conv1, bn1, relu, maxpool,
                                         layer1, layer2, layer3, layer4)
        self.classifier = nn.Linear(2048, num_classes)
        self.projection = nn.Sequential(Linear(2048,512), ReLU, Linear(512,128))

    features[0]  = conv1   (64, 3, 7, 7)
    features[1]  = bn1
    features[2]  = relu
    features[3]  = maxpool
    features[4]  = layer1  (3 bottleneck blocks)
    features[5]  = layer2  (4 bottleneck blocks)
    features[6]  = layer3  (6 bottleneck blocks)
    features[7]  = layer4  (3 bottleneck blocks)
    classifier   = Linear(2048 -> num_classes)
    projection   = Linear(2048->512) -> ReLU -> Linear(512->128)  [SupCon head, unused at inference]
    """

    def __init__(self, num_classes=6):
        super().__init__()
        # Build ResNet50 backbone
        backbone = models.resnet50(weights=None)

        # Pack layers into Sequential to match checkpoint key prefix 'features.*'
        self.features = nn.Sequential(
            backbone.conv1,    # features.0
            backbone.bn1,      # features.1
            backbone.relu,     # features.2
            backbone.maxpool,  # features.3
            backbone.layer1,   # features.4
            backbone.layer2,   # features.5
            backbone.layer3,   # features.6
            backbone.layer4,   # features.7
        )

        # Classification head  (2048 -> num_classes)
        self.classifier = nn.Linear(2048, num_classes)

        # Projection head used during SupCon training (not used at inference)
        self.projection = nn.Sequential(
            nn.Linear(2048, 512),
            nn.ReLU(inplace=True),
            nn.Linear(512, 128),
        )

    def forward(self, x):
        x = self.features(x)
        x = F.adaptive_avg_pool2d(x, (1, 1))
        x = x.view(x.size(0), -1)
        return self.classifier(x)

    def get_features(self, x):
        """Extract spatial feature maps from layer4 (for GradCAM)."""
        return self.features(x)   # shape: (B, 2048, 7, 7)


class ModelService:
    """Model loading, inference, and calibration"""
    
    CLASSES = [
        "Early_Blight",
        "Healthy", 
        "Late_Blight",
        "Leaf_Mold",
        "Septoria",
        "TYLCV"
    ]
    
    def __init__(self):
        self.model: Optional[ResNet50TomatoModel] = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.temperature = 1.0  # For calibration
        self.version = "v1.0.0"
        self.previous_version = None
        self.uploaded_at = None
        
        # Image preprocessing
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            )
        ])
        
        print(f"[INFO] Using device: {self.device}")
    
    async def load_model(self, checkpoint_path: Optional[str] = None, version: Optional[str] = None):
        """Load model from checkpoint.
        
        Default search paths (in order):
          1. checkpoint_path argument
          2. MODEL_PATH environment variable
          3. /app/models/model.pth (baked into Docker image)
          4. /app/models/resnet50_tomato.pth (legacy name)
        
        Your .pth file: CBAM_True_SUPCON_True_FISHR_True_DVD_True_best_field.pth
        Upload it via POST /admin/upload-model after deployment.
        """
        if checkpoint_path is None:
            # Try multiple default paths (Docker paths + Windows local paths)
            candidates = [
                os.getenv("MODEL_PATH", ""),
                "/app/models/model.pth",
                "/app/models/resnet50_tomato.pth",
                # Windows local dev fallback — looks for .pth in parent of backend/
                os.path.join(os.path.dirname(__file__), "..", "..", 
                             "CBAM_True_SUPCON_True_FISHR_True_DVD_True_best_field.pth"),
            ]
            for candidate in candidates:
                candidate = os.path.normpath(candidate) if candidate else ""
                if candidate and os.path.exists(candidate):
                    checkpoint_path = candidate
                    print(f"[INFO] Found model at: {checkpoint_path}")
                    break
        
        if not checkpoint_path or not os.path.exists(checkpoint_path):
            print("[WARN] No model found. Upload your .pth via POST /admin/upload-model")
            print("       Your file: CBAM_True_SUPCON_True_FISHR_True_DVD_True_best_field.pth")
            self.use_hf_space = False
            return
        
        try:
            # Initialize model
            self.model = ResNet50TomatoModel(num_classes=len(self.CLASSES))
            
            # Load checkpoint
            checkpoint = torch.load(checkpoint_path, map_location=self.device, weights_only=False)
            
            # Handle different checkpoint formats
            # Your file (CBAM_False_..._best_test.pth) may use various key formats
            if isinstance(checkpoint, dict):
                if 'model_state_dict' in checkpoint:
                    state_dict = checkpoint['model_state_dict']
                elif 'state_dict' in checkpoint:
                    state_dict = checkpoint['state_dict']
                elif 'model' in checkpoint:
                    state_dict = checkpoint['model']
                elif 'net' in checkpoint:
                    state_dict = checkpoint['net']
                else:
                    # Raw state dict (keys are layer names directly)
                    state_dict = checkpoint
                
                # Try strict loading first, then fall back to non-strict
                try:
                    self.model.load_state_dict(state_dict, strict=True)
                except RuntimeError as e:
                    print(f"[WARN] Strict load failed ({e}), trying non-strict...")
                    self.model.load_state_dict(state_dict, strict=False)
                
                # Load calibration temperature if available
                if 'temperature' in checkpoint:
                    self.temperature = checkpoint['temperature']
            else:
                # Checkpoint IS the state dict (direct torch.save(model.state_dict()))
                self.model.load_state_dict(checkpoint, strict=False)
            
            self.model.to(self.device)
            self.model.eval()
            
            # Update version info
            if version:
                self.previous_version = self.version
                self.version = version
                self.uploaded_at = datetime.utcnow().isoformat()
            
            print(f"[OK] Model loaded successfully: {self.version}")
            print(f"[OK] Temperature scaling: {self.temperature}")
            
        except Exception as e:
            print(f"[ERROR] Failed to load model: {str(e)}")
            raise
    
    async def predict(self, image_bytes: bytes) -> Dict:
        """Run inference on image"""
        if self.model is None:
            raise RuntimeError("No model loaded! Please log in as Admin and upload the .pth model file via the dashboard.")
            
        # Load image
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        
        # Preprocess
        input_tensor = self.transform(image).unsqueeze(0).to(self.device)
        
        # Inference
        with torch.no_grad():
            logits = self.model(input_tensor)
            
            # Raw softmax (uncalibrated)
            probs_raw = F.softmax(logits, dim=1)
            
            # Calibrated probabilities
            probs_calibrated = F.softmax(logits / self.temperature, dim=1)
            
            # Get predictions
            confidence_raw = probs_raw.max().item()
            confidence_calibrated = probs_calibrated.max().item()
            pred_idx = probs_calibrated.argmax().item()
            disease = self.CLASSES[pred_idx]
        
        # Generate GradCAM and Severity
        gradcam_image, severity = self.generate_gradcam(image, input_tensor, pred_idx)
        
        return {
            'disease': disease,
            'confidence': confidence_raw,
            'confidence_calibrated': confidence_calibrated,
            'all_probabilities': probs_calibrated[0].cpu().numpy().tolist(),
            'gradcam': gradcam_image,
            'severity': severity,
            'entropy': self._calculate_entropy(probs_calibrated[0])
        }
    
    def generate_gradcam(self, original_image: Image.Image, input_tensor: torch.Tensor, target_class: int) -> Tuple[bytes, str]:
        """Generate GradCAM heatmap using forward/backward hooks on layer4."""
        captured_grads = []
        captured_acts = []

        # Hooks capture the output of layer4 (features[7]) during forward & backward
        def fwd_hook(module, input, output):
            captured_acts.append(output)

        def bwd_hook(module, grad_input, grad_output):
            captured_grads.append(grad_output[0])

        handle_fwd = self.model.features[7].register_forward_hook(fwd_hook)
        handle_bwd = self.model.features[7].register_full_backward_hook(bwd_hook)

        try:
            # Fresh forward pass with grad tracking
            self.model.zero_grad()
            inp = input_tensor.clone().detach().requires_grad_(True)
            feats = self.model.features(inp)           # (1, 2048, 7, 7)
            pooled = F.adaptive_avg_pool2d(feats, (1, 1))
            pooled = pooled.view(pooled.size(0), -1)
            logits = self.model.classifier(pooled)

            # Backward for the predicted class
            logits[0, target_class].backward()
        finally:
            handle_fwd.remove()
            handle_bwd.remove()

        # Both tensors are (2048, 7, 7) — shapes match!
        grads = captured_grads[0][0]     # (2048, 7, 7)
        acts  = captured_acts[0][0].detach()  # (2048, 7, 7)

        # Global average pool gradients → per-channel weights
        weights = grads.mean(dim=(1, 2))       # (2048,)

        # Weighted sum of activation maps
        cam = (weights[:, None, None] * acts).sum(dim=0)   # (7, 7)
        cam = F.relu(cam)

        # Normalize to [0, 1]
        cam = cam - cam.min()
        cam = cam / (cam.max() + 1e-8)

        # Resize to original image size
        cam_np = cam.cpu().numpy()
        cam_resized = cv2.resize(cam_np, original_image.size)

        # Apply JET colormap
        heatmap = cv2.applyColorMap(np.uint8(255 * cam_resized), cv2.COLORMAP_JET)
        heatmap = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)

        # Overlay on original image
        original_np = np.array(original_image)
        superimposed = cv2.addWeighted(original_np, 0.6, heatmap, 0.4, 0)

        # Estimate severity based on heatmap hot area
        disease = self.CLASSES[target_class]
        if disease == "Healthy":
            severity = "N/A"
        else:
            hot_pixels = np.sum(cam_resized > 0.5)
            total_pixels = cam_resized.size
            hot_ratio = hot_pixels / total_pixels
            if hot_ratio > 0.30:
                severity = "Severe"
            elif hot_ratio > 0.10:
                severity = "Moderate"
            else:
                severity = "Mild"

        # Encode to PNG bytes
        is_success, buffer = cv2.imencode(".png", cv2.cvtColor(superimposed, cv2.COLOR_RGB2BGR))
        return buffer.tobytes(), severity
    
    def check_reliability(self, result: Dict) -> Tuple[bool, Optional[str]]:
        """Check if prediction is reliable (OOD detection)"""
        confidence = result['confidence_calibrated']
        entropy = result['entropy']
        disease = result.get('disease', '')
        probs = result['all_probabilities']
        sorted_probs = sorted(probs, reverse=True)
        
        # SPECIAL CASE: "Healthy" predictions need higher confidence
        # because the model often confuses healthy leaves with diseased ones
        if disease == "Healthy":
            if confidence < 0.75:  # Much stricter threshold for healthy
                return False, f"Low confidence for healthy prediction ({confidence:.1%}) - plant may have early-stage disease"
        else:
            # Disease predictions have standard threshold
            if confidence < 0.6:
                return False, "Low confidence - please retake photo with better lighting"
        
        # Threshold for high entropy (uniform distribution)
        if entropy > 1.5:
            return False, "Ambiguous image - ensure full leaf is visible"
        
        # Check if prediction is too close to multiple classes
        if sorted_probs[0] - sorted_probs[1] < 0.15:
            return False, "Multiple diseases detected - consult expert"
        
        return True, None
    
    def _calculate_entropy(self, probs: torch.Tensor) -> float:
        """Calculate Shannon entropy of probability distribution"""
        probs = probs.clamp(min=1e-10)  # Avoid log(0)
        entropy = -(probs * probs.log()).sum().item()
        return entropy
    
    async def validate_checkpoint(self, checkpoint_path: str) -> Tuple[bool, Optional[str]]:
        """Validate model checkpoint before loading"""
        try:
            checkpoint = torch.load(checkpoint_path, map_location='cpu', weights_only=False)
            
            # Check if it's a valid state dict
            if isinstance(checkpoint, dict):
                if 'model_state_dict' in checkpoint:
                    state_dict = checkpoint['model_state_dict']
                elif 'state_dict' in checkpoint:
                    state_dict = checkpoint['state_dict']
                else:
                    state_dict = checkpoint
            else:
                state_dict = checkpoint
            
            # Verify architecture matches
            temp_model = ResNet50TomatoModel(num_classes=len(self.CLASSES))
            temp_model.load_state_dict(state_dict)
            
            return True, None
            
        except Exception as e:
            return False, str(e)
    
    def is_loaded(self) -> bool:
        return self.model is not None
    
    def get_version(self) -> str:
        return self.version
    
    def get_previous_version(self) -> Optional[str]:
        return self.previous_version
    
    async def get_info(self) -> Dict:
        return {
            'version': self.version,
            'uploaded_at': self.uploaded_at or "initial",
            'accuracy_field': 0.902,  # From your ablation study
            'temperature': self.temperature,
            'device': str(self.device)
        }
