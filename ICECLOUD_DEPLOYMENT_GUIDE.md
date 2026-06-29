# 🧊 IceCloud Deployment Guide — TomEase (Tomato Disease Detection)

> **For future AI agents**: This guide is the single source of truth for deploying this project to IceCloud. Read it fully before making any changes.

---

## 📋 Overview

**What we're deploying:**
- **Backend**: FastAPI (Python) — tomato disease detection with ResNet50 + GradCAM
- **Database**: PostgreSQL — scan history, model version tracking
- **Storage**: Cloudflare R2 — GradCAM images + model checkpoints
- **Mobile**: React Native (Expo) — connects to the backend API

**Platform**: [IceCloud](https://icecloud.in) — Docker-based deployment (NOT Render, NOT Railway, NOT Fly.io)

---

## 🌐 IceCloud Platform Basics

### What IceCloud Is
IceCloud is an Indian cloud hosting provider supporting Docker container deployments. It uses a container-based deployment model where you push a Docker image and IceCloud runs it.

### Key Differences vs Render/Railway
| Feature | Render | IceCloud |
|---|---|---|
| Deploy method | GitHub auto-deploy | Docker image push |
| Port | Dynamic (`$PORT`) | Fixed (typically `8000` or as configured) |
| Free tier | Yes, but sleeps | Depends on plan |
| Database | Managed PostgreSQL | Use external (Supabase/Neon/Aiven) |
| Storage | Ephemeral disk | Ephemeral disk (use R2 for persistence) |
| Environment vars | Dashboard UI | Dashboard UI or `.env` |

### IceCloud Deployment Flow
```
Your Code
    ↓
Build Docker Image (locally or via CI)
    ↓
Push to IceCloud Registry / GitHub Container Registry
    ↓
IceCloud pulls & runs your container
    ↓
Set environment variables in IceCloud dashboard
    ↓
Live API available at your IceCloud URL
```

---

## 🗂️ Project Structure Reference

```
TomEase/
├── backend/                          ← FastAPI app (deploy this)
│   ├── app/
│   │   ├── main.py                   ← FastAPI routes
│   │   ├── models.py                 ← ResNet50 + GradCAM + calibration
│   │   ├── database.py               ← PostgreSQL + SQLite fallback
│   │   └── storage.py                ← Cloudflare R2 client
│   ├── Dockerfile                    ← Container definition (IceCloud uses this)
│   ├── requirements.txt              ← Python dependencies
│   └── .env.example                  ← Environment variable template
│
├── mobile/                           ← React Native app
│   └── src/services/api.ts           ← ← UPDATE THIS with your IceCloud URL
│
├── CBAM_False_SUPCON_False_FISHR_False_DVD_False_best_test.pth  ← YOUR MODEL FILE
└── ICECLOUD_DEPLOYMENT_GUIDE.md      ← This file
```

---

## 🔑 Credentials You Need

Before deploying, gather these. All are **free tier**.

### 1. Cloudflare R2 (Object Storage)
Used for: Storing GradCAM heatmap images + model checkpoints

**How to get:**
1. Sign up at https://dash.cloudflare.com
2. Left sidebar → **R2**
3. Click **Create bucket** → Name: `tomato-disease-models`
4. Click **Manage R2 API Tokens** → **Create API Token**
   - Name: `tomato-disease-api`
   - Permissions: Object Read & Write
5. Save these (you only see Secret Key ONCE):
```
R2_ACCOUNT_ID       = your_cloudflare_account_id
R2_ACCESS_KEY_ID    = your_r2_access_key
R2_SECRET_ACCESS_KEY= your_r2_secret_key
R2_BUCKET_NAME      = tomato-disease-models
```

### 2. PostgreSQL Database (External)
IceCloud doesn't provide managed PostgreSQL. Use one of these **free** options:

**Option A: Supabase (Recommended)**
1. Go to https://supabase.com → New project
2. Settings → Database → Connection String → **URI** tab
3. Copy the connection string (looks like `postgresql://postgres:[password]@db.xxx.supabase.co:5432/postgres`)

**Option B: Neon.tech (Also free)**
1. Go to https://neon.tech → New project
2. Dashboard → Connection String (copy `postgresql://...`)

**Save:**
```
DATABASE_URL = postgresql://user:password@host:port/dbname
```

### 3. Admin API Key
Generate a secure random key (keep this secret — it protects the model upload endpoint):
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```
**Save:**
```
ADMIN_API_KEY = your_generated_key_here
```

### 4. IceCloud Account
1. Sign up at https://icecloud.in
2. Create a new container/service
3. Note your deployment URL (e.g., `https://your-app.icecloud.in`)

---

## 🐳 Docker Configuration

The [Dockerfile](file:///c:/Abhijit%20Data/TomEase/backend/Dockerfile) is already configured. Here's what it does:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# System deps for OpenCV
RUN apt-get update && apt-get install -y libgl1-mesa-glx libglib2.0-0

# Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# App code
COPY app/ ./app/

# Directories for local fallback storage
RUN mkdir -p /app/models /app/storage

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# Run server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

> **IceCloud Note**: Port is hardcoded to `8000`. Configure IceCloud to expose port `8000`. Unlike Render, there is no `$PORT` variable needed.

---

## 🚀 Step-by-Step IceCloud Deployment

### STEP 1 — Build the Docker Image

```bash
# Navigate to backend folder
cd "c:\Abhijit Data\TomEase\backend"

# Build the image
docker build -t tomato-disease-api:latest .

# Verify it built
docker images | grep tomato-disease-api
```

### STEP 2 — Test Locally First

```bash
# Run with your credentials
docker run -p 8000:8000 \
  -e DATABASE_URL="sqlite:///./test.db" \
  -e ADMIN_API_KEY="test123" \
  -e R2_ACCOUNT_ID="your_id" \
  -e R2_ACCESS_KEY_ID="your_key" \
  -e R2_SECRET_ACCESS_KEY="your_secret" \
  -e R2_BUCKET_NAME="tomato-disease-models" \
  tomato-disease-api:latest

# Test in another terminal
curl http://localhost:8000/health
```

Expected response:
```json
{"status": "healthy", "model_loaded": false, "model_version": "v1.0.0", "database": "connected"}
```

### STEP 3 — Push to IceCloud

**Option A: Via Docker Hub**
```bash
# Tag for Docker Hub
docker tag tomato-disease-api:latest YOUR_DOCKERHUB_USERNAME/tomato-disease-api:latest

# Push
docker login
docker push YOUR_DOCKERHUB_USERNAME/tomato-disease-api:latest
```

Then in IceCloud dashboard: point to `YOUR_DOCKERHUB_USERNAME/tomato-disease-api:latest`

**Option B: Via GitHub Container Registry**
```bash
# Login
echo YOUR_GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

# Tag & push
docker tag tomato-disease-api:latest ghcr.io/YOUR_GITHUB_USERNAME/tomato-disease-api:latest
docker push ghcr.io/YOUR_GITHUB_USERNAME/tomato-disease-api:latest
```

### STEP 4 — Configure IceCloud Dashboard

In the IceCloud control panel:
1. Create a new **Container Service**
2. Set image: `your-image-url`
3. Set **port**: `8000`
4. Add **environment variables** (one per line):

```
DATABASE_URL=postgresql://your-supabase-or-neon-url
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=tomato-disease-models
ADMIN_API_KEY=your_generated_admin_key
ENVIRONMENT=production
```

5. Click **Deploy**
6. Wait 3-5 minutes
7. Note your IceCloud URL: `https://YOUR_APP.icecloud.in`

### STEP 5 — Upload Your Model

Your `.pth` file is at:
```
c:\Abhijit Data\TomEase\CBAM_False_SUPCON_False_FISHR_False_DVD_False_best_test.pth
```

Upload it to your live API:

**Windows PowerShell:**
```powershell
$API_URL = "https://YOUR_APP.icecloud.in"
$ADMIN_KEY = "your_admin_api_key"
$PTH_FILE = "c:\Abhijit Data\TomEase\CBAM_False_SUPCON_False_FISHR_False_DVD_False_best_test.pth"

curl.exe -X POST "$API_URL/admin/upload-model" `
  -H "X-API-Key: $ADMIN_KEY" `
  -F "file=@$PTH_FILE"
```

**Windows CMD:**
```cmd
curl -X POST "https://YOUR_APP.icecloud.in/admin/upload-model" ^
  -H "X-API-Key: YOUR_ADMIN_KEY" ^
  -F "file=@c:\Abhijit Data\TomEase\CBAM_False_SUPCON_False_FISHR_False_DVD_False_best_test.pth"
```

Expected response:
```json
{
  "status": "success",
  "message": "Model updated successfully",
  "version": "v20260622_123456",
  "previous_version": "v1.0.0"
}
```

> ⚠️ **This will take 3-5 minutes** — the file is ~94MB. Don't cancel the upload.

### STEP 6 — Update Mobile App

Open [mobile/src/services/api.ts](file:///c:/Abhijit%20Data/TomEase/mobile/src/services/api.ts) and update line 4:

```typescript
// Change this:
const API_URL = 'https://tomato-api-xlik.onrender.com';

// To your IceCloud URL:
const API_URL = 'https://YOUR_APP.icecloud.in';
```

### STEP 7 — Verify Everything Works

```bash
# 1. Health check
curl https://YOUR_APP.icecloud.in/health

# 2. Model info (after upload)
curl https://YOUR_APP.icecloud.in/model/info

# 3. Test prediction with an image
curl -X POST https://YOUR_APP.icecloud.in/predict \
  -F "file=@path/to/test_leaf.jpg"
```

---

## 📊 Architecture Summary

```
[Mobile App (React Native)]
         |
         | HTTPS POST /predict (image)
         ↓
[IceCloud Container]
  FastAPI (port 8000)
  ├── ResNet50 model (loaded from /app/models/ or R2)
  ├── GradCAM generation
  ├── Temperature calibration
  └── Uncertainty quantification
         |
         ├── PostgreSQL (Supabase/Neon) ← scan history
         └── Cloudflare R2 ← GradCAM images + model .pth files
```

---

## 🔄 Model Hot-Swap (Updating the Model)

After deploying, you can update the model **without redeploying the container**:

```powershell
# Upload new model version
curl.exe -X POST "https://YOUR_APP.icecloud.in/admin/upload-model" `
  -H "X-API-Key: YOUR_ADMIN_KEY" `
  -F "file=@path\to\new_model.pth"
```

The API will:
1. Validate the checkpoint architecture
2. Store to R2 with a version tag
3. Hot-swap the PyTorch model singleton in memory

---

## 🌡️ What's Already Implemented (Feature Checklist)

### ✅ Phase 1 — MVP Features
| Feature | Status | File |
|---|---|---|
| FastAPI /predict endpoint | ✅ Done | `backend/app/main.py` |
| Resize to 224×224, normalize | ✅ Done | `backend/app/models.py` L67-74 |
| ResNet50 forward pass | ✅ Done | `backend/app/models.py` L127-161 |
| Output: class + confidence | ✅ Done | `backend/app/main.py` L137-147 |
| GradCAM heatmap generation | ✅ Done | `backend/app/models.py` L163-208 |
| Admin model upload endpoint | ✅ Done | `backend/app/main.py` L165-211 |
| Architecture validation | ✅ Done | `backend/app/models.py` L237-260 |
| R2 version-tagged storage | ✅ Done | `backend/app/storage.py` L64-84 |
| PyTorch singleton hot-swap | ✅ Done | `backend/app/models.py` L78-125 |
| React Native Camera Screen | ✅ Done | `mobile/src/screens/CameraScreen.tsx` |
| Take photo → Upload to API | ✅ Done | `mobile/src/services/api.ts` |
| Show disease + confidence | ✅ Done | `mobile/src/screens/ResultScreen.tsx` |
| GradCAM overlay display | ✅ Done | `mobile/src/screens/ResultScreen.tsx` |

### ✅ Phase 2 — Trust & Reliability
| Feature | Status | File |
|---|---|---|
| Temperature scaling (calibration) | ✅ Done | `backend/app/models.py` L143 |
| Uncertainty / OOD detection | ✅ Done | `backend/app/models.py` L210-229 |
| Entropy-based flagging | ✅ Done | `backend/app/models.py` L231-235 |
| "Ambiguous scan" warning | ✅ Done | `backend/app/main.py` L112 |
| Test-Time Augmentation (TTA) | ❌ Not yet | Planned |

### ❌ Phase 3 — Continuous Improvement (Not yet)
| Feature | Status |
|---|---|
| Active learning pipeline | ❌ Planned |
| Disease progression tracker | ❌ Planned |
| Multi-crop expansion | ❌ Planned |

---

## 🐛 Troubleshooting

### ❌ "Model not loaded" on first deploy
**Cause**: No `.pth` file has been uploaded yet. The container starts without a model.
**Fix**: Run the model upload curl command from Step 5.

### ❌ Model fails to load ("key 'backbone.conv1.weight' not found")
**Cause**: Your `.pth` file uses a different key format than expected.
**Fix**: The model loader in `models.py` tries multiple key formats (`model_state_dict`, `state_dict`, direct). If it still fails, check what keys your checkpoint has:
```python
import torch
ckpt = torch.load("your_model.pth", map_location="cpu")
if isinstance(ckpt, dict):
    print(list(ckpt.keys()))
```
Then update `models.py` accordingly.

### ❌ "Database connection failed"
**Cause**: `DATABASE_URL` not set or wrong format.
**Fix**: Falls back to SQLite automatically. Set `DATABASE_URL` properly in IceCloud env vars.

### ❌ R2 upload failed
**Cause**: Wrong credentials.
**Fix**: Falls back to local storage. Check R2 credentials in Cloudflare dashboard.

### ❌ Container won't start / crashes immediately
**Check IceCloud logs**. Common issues:
- `torch` install taking too long → increase build timeout
- Missing `libgl1-mesa-glx` → already in Dockerfile, but verify Dockerfile is correct
- Port mismatch → ensure IceCloud is set to expose port `8000`

### ❌ Mobile app "Network error"
**Fix**:
1. Check `API_URL` in `mobile/src/services/api.ts` matches your IceCloud URL exactly
2. No trailing slash: ✅ `https://app.icecloud.in` ❌ `https://app.icecloud.in/`
3. Visit `/health` in browser to verify backend is up

---

## 📝 Environment Variables Reference

| Variable | Required | Description | Example |
|---|---|---|---|
| `DATABASE_URL` | Optional | PostgreSQL connection string. Falls back to SQLite if not set | `postgresql://user:pass@host/db` |
| `ADMIN_API_KEY` | **Required** | Secret key for /admin/* endpoints | `abc123xyz...` |
| `R2_ACCOUNT_ID` | Optional | Cloudflare Account ID. Falls back to local storage if not set | `167f2a193...` |
| `R2_ACCESS_KEY_ID` | Optional | R2 API access key | `203ee709...` |
| `R2_SECRET_ACCESS_KEY` | Optional | R2 API secret key | `5f06f222...` |
| `R2_BUCKET_NAME` | Optional | R2 bucket name | `tomato-disease-models` |
| `MODEL_PATH` | Optional | Path to pre-loaded `.pth` file inside container | `/app/models/model.pth` |
| `ENVIRONMENT` | Optional | `production` or `development` | `production` |

---

## 📁 The .pth Model File

**Your file**: `CBAM_False_SUPCON_False_FISHR_False_DVD_False_best_test.pth` (~94MB)
**Location on disk**: `c:\Abhijit Data\TomEase\CBAM_False_SUPCON_False_FISHR_False_DVD_False_best_test.pth`

**Do NOT**: Commit this file to GitHub (it's 94MB, too large for git)
**Do**: Upload it via the `/admin/upload-model` API endpoint after deploying

**Where it goes after upload**:
1. API validates the architecture
2. Uploads it to Cloudflare R2 (bucket: `tomato-disease-models/models/vYYYYMMDD_HHMMSS.pth`)
3. Loads it into memory for inference
4. Future container restarts: you'll need to re-upload (or set `MODEL_PATH` to pre-bake it into the image)

**To permanently bake the model into the container** (avoids re-uploading every restart):
```dockerfile
# Add to Dockerfile before CMD
COPY CBAM_False_SUPCON_False_FISHR_False_DVD_False_best_test.pth /app/models/model.pth
ENV MODEL_PATH=/app/models/model.pth
```
> ⚠️ This makes the Docker image ~94MB larger. Only do this once the model is finalized.

---

## 🔐 Security Notes

- `ADMIN_API_KEY` must be kept secret — it allows replacing the AI model
- R2 credentials allow read/write to your storage bucket
- Never commit `.env` or credentials to GitHub
- The `.gitignore` already excludes `.env` files

---

## 💰 Cost Estimate

| Service | Plan | Cost |
|---|---|---|
| IceCloud hosting | Starter | Check icecloud.in pricing |
| Cloudflare R2 | Free | $0 (10GB free) |
| Supabase PostgreSQL | Free | $0 (500MB free) |
| Cloudflare R2 egress | Free | $0 (egress is free) |

---

## 📞 Quick Reference Commands

```powershell
# Health check
curl.exe https://YOUR_APP.icecloud.in/health

# Upload model
curl.exe -X POST "https://YOUR_APP.icecloud.in/admin/upload-model" -H "X-API-Key: YOUR_KEY" -F "file=@path\to\model.pth"

# Model info
curl.exe https://YOUR_APP.icecloud.in/model/info

# Test prediction
curl.exe -X POST "https://YOUR_APP.icecloud.in/predict" -F "file=@path\to\leaf.jpg"

# View recent scans
curl.exe https://YOUR_APP.icecloud.in/analytics/recent-scans

# Model history (admin)
curl.exe https://YOUR_APP.icecloud.in/admin/model-history -H "X-API-Key: YOUR_KEY"
```
