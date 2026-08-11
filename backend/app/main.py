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
from .database import database
from .storage import LocalStorage
from .auth import router as auth_router, get_current_user
from .plots import router as plots_router
from .community import router as community_router
from .utils import get_recommendations, augment_scan_details, calculate_distance
from .rag import RAGService as RAGv1  # Keep v1 as fallback
from .rag_v2 import EnhancedRAGService  # New v2
from .llm_client import synthesize_structured

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
app.include_router(community_router)

# Mount local storage for serving GradCAMs if not using cloud R2
os.makedirs("storage/gradcams", exist_ok=True)
os.makedirs("storage/models", exist_ok=True)
app.mount("/storage", StaticFiles(directory="storage"), name="storage")

# Initialize services
model_service = ModelService()
# database = Database()  # Imported from database.py
storage = LocalStorage()

# Initialize RAG v2 (with v1 fallback)
try:
    rag_service = EnhancedRAGService()
    print("[INFO] Using RAG v2 (Enhanced)")
except Exception as e:
    print(f"[WARN] RAG v2 failed to initialize: {e}")
    rag_service = RAGv1()
    print("[INFO] Fallback to RAG v1")

# Models
class PredictionResponse(BaseModel):
    scan_id: str
    disease: str
    confidence: float
    confidence_calibrated: float
    gradcam_url: str
    severity: str
    recommendations: List[str]
    cause: Optional[str] = None
    prevention: Optional[str] = None
    remedy: Optional[str] = None
    remedy_natural: Optional[str] = None
    remedy_chemical: Optional[str] = None
    rag_summary: Optional[str] = None
    is_reliable: bool
    warning: Optional[str] = None
    timestamp: str
    image_uri: Optional[str] = None

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
    # Build or load RAG index (runs in background thread to avoid blocking event loop)
    import anyio
    def _build():
        try:
            rag_service.build_index()
            print("[OK] RAG index ready")
        except Exception as e:
            print(f"[WARN] RAG index build failed: {e}")

    await anyio.to_thread.run_sync(_build)
    print("[OK] API Ready - Model and RAG initialized")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    await database.disconnect()

async def trigger_regional_alerts(disease: str, source_plot_id: str):
    """Check for nearby plots and alert owners if a disease is detected"""
    if disease == "Healthy":
        return
        
    plots = await database.get_all_plots()
    source_plot = next((p for p in plots if p["id"] == source_plot_id), None)
    
    if not source_plot or not source_plot["latitude"]:
        return
        
    for plot in plots:
        # Don't alert the source plot owner again here (they get immediate feedback)
        if plot["id"] == source_plot_id or not plot["latitude"]:
            continue
            
        dist = calculate_distance(source_plot["latitude"], source_plot["longitude"], plot["latitude"], plot["longitude"])
        
        # 10km radius alert
        if dist <= 10.0:
            msg = f"⚠️ Alert: {disease.replace('_', ' ')} has been detected within {dist:.1f}km of your plot '{plot['name']}'."
            alert_type = "danger" if disease in ["Late_Blight", "TYLCV"] else "warning"
            await database.create_alert(plot["user_id"], msg, source_plot_id, alert_type)

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
    background_tasks: BackgroundTasks = None,
    current_user: dict = Depends(get_current_user)
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
        
        # Upload Original Image
        image_url = await storage.upload_image(
            image_bytes,
            scan_id
        )
        
        # Get disease recommendations
        recommendations = get_recommendations(result['disease'])

        # Run RAG v2 query with enhanced context
        try:
            # Prepare context for RAG v2
            rag_context = {
                "disease": result['disease'],
                "confidence": result['confidence']
            }
            
            location_dict = None
            # Add location context if plot has location
            if plot_id:
                plot_info = await database.get_plot(plot_id)
                if plot_info and plot_info.get("latitude"):
                    # You can add region detection based on coordinates
                    rag_context["region"] = "India"  # Or detect from coordinates
                    location_dict = {"region": "India"}
            
            # Query RAG with prediction context
            if hasattr(rag_service, 'query_with_model_prediction'):
                # RAG v2 method
                rag_results = rag_service.query_with_model_prediction(
                    query=f"What are the symptoms, causes, and management of {result['disease']}?",
                    prediction={"disease": result['disease'], "confidence": result['confidence']},
                    location=location_dict,
                    top_k=5
                )
            else:
                # RAG v1 fallback
                rag_results = rag_service.query(
                    f"what are the symptoms, causes and management of {result['disease']}", 
                    top_k=5, 
                    context=rag_context
                )
            
            # Prepare text for LLM synthesis
            if rag_results:
                # Format context for LLM
                rag_texts = [r.get("text", "") for r in rag_results]
                rag_summary = "\n\n".join(rag_texts[:5])  # Top 5 chunks
                
                # Synthesize structured answer via Groq LLM
                synth = synthesize_structured(rag_summary)
                cause = synth.get("cause") or ""
                prevention = synth.get("prevention") or ""
                remedy = synth.get("remedy") or ""
                remedy_natural = synth.get("remedy_natural") or ""
                remedy_chemical = synth.get("remedy_chemical") or ""
            else:
                rag_summary = ""
                cause = prevention = remedy = remedy_natural = remedy_chemical = ""
                
        except Exception as e:
            print(f"[WARN] RAG/LLM synthesis failed: {e}")
            import traceback
            traceback.print_exc()
            rag_results = []
            rag_summary = ""
            cause = prevention = remedy = remedy_natural = remedy_chemical = ""
        
        # Save to database (async in background)
        if background_tasks:
            background_tasks.add_task(
                database.save_prediction,
                scan_id=scan_id,
                disease=result['disease'],
                confidence=result['confidence'],
                confidence_calibrated=result['confidence_calibrated'],
                model_version=model_service.get_version(),
                plot_id=plot_id,
                user_id=current_user["id"],
                image_url=image_url
            )
            
            if plot_id:
                background_tasks.add_task(trigger_regional_alerts, result['disease'], plot_id)
        
        return PredictionResponse(
            scan_id=scan_id,
            disease=result['disease'],
            confidence=result['confidence'],
            confidence_calibrated=result['confidence_calibrated'],
            gradcam_url=gradcam_url,
            severity=result['severity'],
            recommendations=recommendations,
            cause=cause,
            prevention=prevention,
            remedy=remedy,
            remedy_natural=remedy_natural,
            remedy_chemical=remedy_chemical,
            rag_summary=rag_summary,
            is_reliable=is_reliable,
            warning=warning,
            timestamp=datetime.utcnow().isoformat(),
            image_uri=image_url
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
    return {"scans": [augment_scan_details(scan) for scan in scans]}


@app.post("/rag/query")
async def rag_query(payload: dict):
    """Simple RAG query endpoint. Request JSON: {"query": "text", "top_k": 5}

    Returns list of top results with source and snippet.
    """
    q = payload.get("query") if isinstance(payload, dict) else None
    if not q:
        raise HTTPException(400, "Missing 'query' in request body")

    top_k = int(payload.get("top_k", 5)) if isinstance(payload, dict) else 5
    context = payload.get("context", {}) if isinstance(payload, dict) else {}
    try:
        results = rag_service.query(q, top_k=top_k, context=context)
        
        # Prepare summary text for LLM
        if results:
            rag_texts = [r.get("text", "") for r in results]
            summary = "\n\n---\n\n".join(rag_texts[:5])
        else:
            summary = ""
        
        # Attempt structured synthesis via remote LLM if configured
        try:
            synth = synthesize_structured(summary) if summary else {}
        except Exception:
            synth = {"cause": "", "prevention": "", "remedy": "", "short_answer": ""}
        
        return {
            "query": q,
            "context": context,
            "results": results,
            "summary": summary,
            "synthesis": synth
        }
    except Exception as e:
        raise HTTPException(500, f"RAG query failed: {e}")


@app.post("/rag/rebuild")
async def rag_rebuild(force: Optional[bool] = False):
    """Trigger a rebuild of the RAG index. Use `force=true` to force rebuild."""
    import anyio
    try:
        def _build():
            rag_service.build_index(force=force)
        await anyio.to_thread.run_sync(_build)
        return {"status": "ok", "message": "RAG index rebuilt"}
    except Exception as e:
        raise HTTPException(500, f"RAG rebuild failed: {e}")

@app.get("/alerts")
async def get_alerts(current_user: dict = Depends(get_current_user)):
    """Get unread/recent alerts for user"""
    return await database.get_user_alerts(current_user["id"])

@app.post("/alerts/{alert_id}/read")
async def mark_alert_read(alert_id: int, current_user: dict = Depends(get_current_user)):
    """Mark an alert as read"""
    success = await database.mark_alert_read(alert_id, current_user["id"])
    if not success:
        raise HTTPException(404, "Alert not found")
    return {"status": "success"}



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
