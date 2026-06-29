from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime
import os
import httpx
import math
import time
from .auth import get_current_user
from .database import database as db
from .utils import augment_scan_details

router = APIRouter(prefix="/plots", tags=["plots"])

class PlotCreate(BaseModel):
    name: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class InviteMember(BaseModel):
    email: str

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
        "scans": [augment_scan_details(scan) for scan in scans]
    }

def generate_polygon(lat: float, lon: float):
    """Generate a 1-hectare GeoJSON polygon around a lat/lon center"""
    d_lat = 0.00045
    d_lon = 50.0 / (111111.0 * math.cos(math.radians(lat)))
    return {
        "type": "Feature",
        "properties": {},
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [lon - d_lon, lat - d_lat],
                [lon + d_lon, lat - d_lat],
                [lon + d_lon, lat + d_lat],
                [lon - d_lon, lat + d_lat],
                [lon - d_lon, lat - d_lat]
            ]]
        }
    }

@router.get("/{plot_id}/ndvi")
async def get_plot_ndvi(plot_id: str, current_user: dict = Depends(get_current_user)):
    plot = await db.get_plot_by_id(plot_id, current_user["id"])
    if not plot or not plot.get("latitude"):
        raise HTTPException(404, "Plot not found or no GPS data")
        
    api_key = os.getenv("AGROMONITORING_API_KEY")
    if api_key:
        try:
            async with httpx.AsyncClient() as client:
                # 1. Check if polygon already exists
                polys_res = await client.get(f"http://api.agromonitoring.com/agro/1.0/polygons?appid={api_key}")
                polys = polys_res.json() if polys_res.status_code == 200 else []
                poly_id = next((p.get("id") for p in polys if p.get("name") == f"Plot_{plot_id}"), None)
                
                # 2. Create if not found
                if not poly_id:
                    create_res = await client.post(f"http://api.agromonitoring.com/agro/1.0/polygons?appid={api_key}", json={
                        "name": f"Plot_{plot_id}",
                        "geo_json": generate_polygon(plot["latitude"], plot["longitude"])
                    })
                    if create_res.status_code == 201:
                        poly_id = create_res.json().get("id")
                
                # 3. Fetch latest image
                if poly_id:
                    end_time = int(time.time())
                    start_time = end_time - (30 * 24 * 60 * 60) # last 30 days
                    img_res = await client.get(f"http://api.agromonitoring.com/agro/1.0/image/search?start={start_time}&end={end_time}&polyid={poly_id}&appid={api_key}")
                    images = img_res.json() if img_res.status_code == 200 else []
                    
                    if images and isinstance(images, list) and len(images) > 0:
                        latest_ndvi = images[0].get("image", {}).get("ndvi")
                        if latest_ndvi:
                            return {
                                "status": "success",
                                "mocked": False,
                                "image_url": latest_ndvi,
                                "description": "Live satellite NDVI map. Dark green indicates dense, healthy vegetation. Lighter areas may indicate stress."
                            }
        except Exception as e:
            print(f"[WARN] Agromonitoring API failed: {e}")

    # Fallback to Demo Mode if API key is missing or API call fails
    return {
        "status": "success",
        "mocked": True,
        "image_url": "https://agromonitoring.com/assets/img/index/agrom_main.png", # Placeholder NDVI map
        "description": "Satellite NDVI map generated. Dark green indicates dense, healthy vegetation. Lighter areas may indicate stress."
    }

@router.get("/{plot_id}/members")
async def get_plot_members(plot_id: str, current_user: dict = Depends(get_current_user)):
    plot = await db.get_plot_by_id(plot_id, current_user["id"])
    if not plot:
        raise HTTPException(404, "Plot not found or access denied")
    return await db.get_plot_members(plot_id)

@router.post("/{plot_id}/members")
async def invite_member(plot_id: str, req: InviteMember, current_user: dict = Depends(get_current_user)):
    plot = await db.get_plot_by_id(plot_id, current_user["id"])
    if not plot or plot.get("role") != "owner":
        raise HTTPException(403, "Only the plot owner can invite members")
    
    user = await db.get_user_by_email(req.email)
    if not user:
        raise HTTPException(404, "User not found with this email")
        
    if user["id"] == current_user["id"]:
        raise HTTPException(400, "You cannot invite yourself")
        
    success = await db.add_plot_member(plot_id, user["id"], "member")
    if not success:
        raise HTTPException(400, "User is already a member of this plot")
        
    return {"status": "success", "message": f"Successfully invited {req.email}"}
