from fastapi import FastAPI, UploadFile, File, HTTPException, Header, BackgroundTasks, Depends, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
from typing import Optional, List
import os
from datetime import datetime
import uuid
from dotenv import load_dotenv

# Load .env file (works locally; in production env vars come from IceCloud dashboard)
load_dotenv()

from .models import ModelService
from .database import Database
from .storage import R2Storage
from .auth import router as auth_router, get_current_user
from .plots import router as plots_router

app = FastAPI(
    title="Tomato Leaf Disease Detection API",
    description="Production API for tomato disease classification with GradCAM",
    version="1.0.0"
)

# CORS for mobile app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.staticfiles import StaticFiles

# Auth routes
app.include_router(auth_router)
app.include_router(plots_router)

# Mount local storage for serving GradCAMs if not using cloud R2
os.makedirs("storage/gradcams", exist_ok=True)
os.makedirs("storage/models", exist_ok=True)
app.mount("/storage", StaticFiles(directory="storage"), name="storage")

# Initialize services
model_service = ModelService()
database = Database()
storage = R2Storage()

# Models
class PredictionResponse(BaseModel):
    scan_id: str
    disease: str
    confidence: float
    confidence_calibrated: float
    gradcam_url: str
    severity: str
    recommendations: List[str]
    is_reliable: bool
    warning: Optional[str] = None
    timestamp: str

class ModelInfo(BaseModel):
    version: str
    uploaded_at: str
    accuracy_field: float
    total_scans: int

@app.on_event("startup")
async def startup_event():
    """Initialize database and load model on startup"""
    await database.connect()
    await model_service.load_model()
    print("[OK] API Ready - Model loaded successfully")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    await database.disconnect()

@app.get("/")
async def root():
    return {
        "service": "Tomato Disease Detection API",
        "status": "healthy",
        "model_version": model_service.get_version(),
        "endpoints": {
            "health": "/health",
            "predict": "/predict",
            "model_info": "/model/info",
            "admin_upload": "/admin/upload-model"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "model_loaded": model_service.is_loaded(),
        "model_version": model_service.get_version(),
        "database": "connected" if database.is_connected() else "disconnected"
    }

@app.post("/predict", response_model=PredictionResponse)
async def predict_disease(
    file: UploadFile = File(...),
    plot_id: Optional[str] = Form(None),
    background_tasks: BackgroundTasks = None
):
    """
    Main prediction endpoint
    
    - Accepts: JPEG/PNG image (any size)
    - Returns: Disease class, confidence, GradCAM heatmap
    - Performs: OOD detection, confidence calibration
    """
    # Validate file type
    if file.content_type not in ["image/jpeg", "image/png", "image/jpg"]:
        raise HTTPException(400, "Only JPEG/PNG images accepted")
    
    try:
        # Read image
        image_bytes = await file.read()
        
        # Run inference
        result = await model_service.predict(image_bytes)
        
        # Check if prediction is reliable
        is_reliable, warning = model_service.check_reliability(result)
        
        # Generate unique scan ID
        scan_id = str(uuid.uuid4())
        
        # Upload GradCAM to R2
        gradcam_url = await storage.upload_gradcam(
            result['gradcam'],
            scan_id
        )
        
        # Get disease recommendations
        recommendations = get_recommendations(result['disease'])
        
        # Save to database (async in background)
        if background_tasks:
            background_tasks.add_task(
                database.save_prediction,
                scan_id=scan_id,
                disease=result['disease'],
                confidence=result['confidence'],
                confidence_calibrated=result['confidence_calibrated'],
                model_version=model_service.get_version(),
                plot_id=plot_id
            )
        
        return PredictionResponse(
            scan_id=scan_id,
            disease=result['disease'],
            confidence=result['confidence'],
            confidence_calibrated=result['confidence_calibrated'],
            gradcam_url=gradcam_url,
            severity=result['severity'],
            recommendations=recommendations,
            is_reliable=is_reliable,
            warning=warning,
            timestamp=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        raise HTTPException(500, f"Prediction failed: {str(e)}")

@app.get("/model/info", response_model=ModelInfo)
async def get_model_info():
    """Get current model information"""
    info = await model_service.get_info()
    total_scans = await database.get_total_scans()
    
    return ModelInfo(
        version=info['version'],
        uploaded_at=info['uploaded_at'],
        accuracy_field=info['accuracy_field'],
        total_scans=total_scans
    )

@app.post("/admin/upload-model")
async def upload_model(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Admin endpoint to upload new model checkpoint
    
    - Requires: Admin JWT token
    - Validates: Model architecture compatibility
    - Updates: Model hot-swap without restart
    """
    if current_user.get("role") != "admin":
        raise HTTPException(403, "Admin access required")
    
    try:
        # Save uploaded file temporarily
        temp_path = f"/tmp/{file.filename}"
        with open(temp_path, "wb") as f:
            f.write(await file.read())
        
        # Validate model architecture
        is_valid, error = await model_service.validate_checkpoint(temp_path)
        if not is_valid:
            os.remove(temp_path)
            raise HTTPException(400, f"Invalid model: {error}")
        
        # Upload to R2 with version tag
        version = f"v{datetime.utcnow():%Y%m%d_%H%M%S}"
        await storage.upload_model(temp_path, version)
        
        # Hot-swap model
        await model_service.load_model(temp_path, version)
        
        # Cleanup
        os.remove(temp_path)
        
        return {
            "status": "success",
            "message": "Model updated successfully",
            "version": version,
            "previous_version": model_service.get_previous_version()
        }
        
    except Exception as e:
        raise HTTPException(500, f"Model upload failed: {str(e)}")

@app.get("/admin/model-history")
async def get_model_history(
    current_user: dict = Depends(get_current_user)
):
    """Get list of all uploaded model versions"""
    if current_user.get("role") != "admin":
        raise HTTPException(403, "Admin access required")
    
    history = await storage.list_model_versions()
    return {"versions": history}

@app.get("/admin/download-model/{version}")
async def download_model(
    version: str,
    current_user: dict = Depends(get_current_user)
):
    """Download a model version (or 'current')"""
    if current_user.get("role") != "admin":
        raise HTTPException(403, "Admin access required")
    
    if version == "current":
        version = model_service.get_version()
        
    try:
        model_path = await storage.download_model(version)
        return FileResponse(model_path, filename=f"model_{version}.pth")
    except Exception as e:
        raise HTTPException(500, f"Failed to download model: {str(e)}")

@app.post("/admin/rollback-model")
async def rollback_model(
    version: str,
    current_user: dict = Depends(get_current_user)
):
    """Rollback to a previous model version"""
    if current_user.get("role") != "admin":
        raise HTTPException(403, "Admin access required")
    
    try:
        # Download version from R2
        model_path = await storage.download_model(version)
        
        # Load model
        await model_service.load_model(model_path, version)
        
        return {
            "status": "success",
            "message": f"Rolled back to version {version}",
            "current_version": version
        }
    except Exception as e:
        raise HTTPException(500, f"Rollback failed: {str(e)}")

@app.get("/analytics/recent-scans")
async def get_recent_scans(limit: int = 50):
    """Get recent predictions for analytics"""
    scans = await database.get_recent_scans(limit)
    return {"scans": scans}

def get_recommendations(disease: str) -> List[str]:
    """Get treatment recommendations for each disease"""
    recommendations = {
        "Healthy": [
            "No treatment needed",
            "Continue regular care and monitoring",
            "Maintain proper watering and fertilization"
        ],
        "Early_Blight": [
            "Apply chlorothalonil or copper-based fungicide",
            "Remove and destroy infected leaves",
            "Improve air circulation around plants",
            "Avoid overhead watering"
        ],
        "Late_Blight": [
            "Apply fungicide immediately (mancozeb or chlorothalonil)",
            "Remove all infected plant parts",
            "Increase spacing between plants",
            "Monitor weather - disease spreads in cool, wet conditions"
        ],
        "Leaf_Mold": [
            "Reduce humidity around plants",
            "Apply fungicide (chlorothalonil)",
            "Improve greenhouse ventilation",
            "Remove infected leaves"
        ],
        "Septoria": [
            "Apply copper-based fungicide",
            "Remove bottom leaves touching soil",
            "Mulch around plants to prevent soil splash",
            "Rotate crops annually"
        ],
        "TYLCV": [
            "No cure - remove infected plants immediately",
            "Control whitefly population (insecticide)",
            "Use reflective mulch to repel whiteflies",
            "Plant resistant varieties in future"
        ]
    }
    
    return recommendations.get(disease, ["Consult agricultural expert for treatment"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
