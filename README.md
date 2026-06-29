# Tomato Leaf Disease Detection System

**100% Free Production Deployment**

## Architecture

```
Mobile App (React Native)
    ↓
FastAPI Backend (Render Free)
    ↓
Model Inference (HuggingFace Spaces - Free GPU)
    ↓
Storage (Cloudflare R2 - 10GB Free)
    ↓
Database (Render PostgreSQL - Free)
```

## Features

- **ResNet50 + SupCon + Fishr** - 90.20% field accuracy
- **GradCAM Visualization** - Show disease regions
- **Confidence Calibration** - Honest predictions
- **Model Hot-Swap** - Update models without redeployment
- **Disease Progression Tracking** - Monitor treatment effectiveness
- **Offline-First** - Local SQLite + cloud sync

## Project Structure

```
├── backend/              # FastAPI server
│   ├── app/
│   │   ├── main.py      # FastAPI app
│   │   ├── models.py    # Model loading & inference
│   │   ├── calibration.py  # Temperature scaling
│   │   ├── gradcam.py   # GradCAM implementation
│   │   └── database.py  # PostgreSQL connection
│   ├── requirements.txt
│   └── render.yaml      # Render deployment config
│
├── model/                # Model artifacts
│   ├── export_model.py  # Export from your notebook
│   ├── resnet50_tomato.pth
│   └── calibration_params.json
│
├── mobile/              # React Native app
│   ├── src/
│   │   ├── screens/
│   │   │   ├── CameraScreen.tsx
│   │   │   ├── ResultScreen.tsx
│   │   │   └── HistoryScreen.tsx
│   │   └── services/
│   │       ├── api.ts
│   │       └── database.ts
│   └── package.json
│
├── admin-web/           # Admin panel (Next.js)
│   ├── app/
│   │   ├── page.tsx     # Dashboard
│   │   ├── upload/page.tsx  # Model upload
│   │   └── analytics/page.tsx
│   └── package.json
│
└── docs/
    ├── deployment.md    # Deployment guide
    └── api.md          # API documentation
```

## Quick Start

### 1. Export Your Model
```bash
cd model
python export_model.py  # Creates production-ready checkpoint
```

### 2. Deploy Backend (Render - Free)
```bash
cd backend
# Push to GitHub, connect to Render
# Auto-deploys on push
```

### 3. Run Mobile App
```bash
cd mobile
npm install
npm run android  # or npm run ios
```

## Free Tier Limits

| Service | Limit | Notes |
|---------|-------|-------|
| Render Backend | 750 hours/month | Sleeps after 15min inactivity |
| Render PostgreSQL | 1GB storage | Plenty for metadata |
| Cloudflare R2 | 10GB storage | ~20k images |
| HuggingFace Spaces | Free GPU | Rate limited to 60/min |

## Cost Estimates

- **0-1000 users:** $0/month
- **1000-10000 users:** ~$7/month (Render paid tier for 24/7 uptime)
- **10000+ users:** ~$25/month (upgrade R2 storage)

---

Built with ❤️ for farmers
