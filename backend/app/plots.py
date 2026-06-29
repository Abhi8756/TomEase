from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime
from .auth import get_current_user
from .database import database as db

router = APIRouter(prefix="/plots", tags=["plots"])

class PlotCreate(BaseModel):
    name: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class PlotResponse(BaseModel):
    id: str
    name: str
    latitude: Optional[float]
    longitude: Optional[float]
    created_at: str

@router.post("/", response_model=PlotResponse)
async def create_plot(req: PlotCreate, current_user: dict = Depends(get_current_user)):
    if not req.name.strip():
        raise HTTPException(400, "Plot name cannot be empty")
        
    plot_id = str(uuid.uuid4())
    await db.create_plot(
        plot_id=plot_id,
        user_id=current_user["id"],
        name=req.name.strip(),
        latitude=req.latitude,
        longitude=req.longitude
    )
    
    return PlotResponse(
        id=plot_id,
        name=req.name.strip(),
        latitude=req.latitude,
        longitude=req.longitude,
        created_at=datetime.utcnow().isoformat()
    )

@router.get("/", response_model=List[PlotResponse])
async def get_plots(current_user: dict = Depends(get_current_user)):
    plots = await db.get_user_plots(current_user["id"])
    return plots

@router.get("/{plot_id}")
async def get_plot_details(plot_id: str, current_user: dict = Depends(get_current_user)):
    plot = await db.get_plot_by_id(plot_id, current_user["id"])
    if not plot:
        raise HTTPException(404, "Plot not found")
    
    scans = await db.get_scans_by_plot(plot_id, current_user["id"])
    return {
        "plot": plot,
        "scans": scans
    }
