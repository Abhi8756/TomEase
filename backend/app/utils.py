import math
from typing import List

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

def augment_scan_details(scan: dict) -> dict:
    """Add computed details like severity and recommendations to a scan"""
    disease = scan.get('disease', 'Healthy')
    scan['gradcam_url'] = f"/storage/gradcams/{scan['scan_id']}.png"
    scan['severity'] = "High" if disease in ["Late_Blight", "TYLCV"] else ("Moderate" if disease != "Healthy" else "None")
    scan['recommendations'] = get_recommendations(disease)
    # Ensure image_uri is available for frontend compatibility
    scan['image_uri'] = scan.get('image_url')
    return scan

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in km between two GPS coordinates using Haversine formula"""
    if None in (lat1, lon1, lat2, lon2):
        return float('inf')
        
    R = 6371.0 # Earth radius in kilometers

    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)

    dlon = lon2_rad - lon1_rad
    dlat = lat2_rad - lat1_rad

    a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c
