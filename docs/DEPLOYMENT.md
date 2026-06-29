# Complete Free Deployment Guide

This guide walks you through deploying the entire system using **100% free services**.

## Architecture Overview

```
┌─────────────────┐
│  Mobile App     │  React Native (Expo)
│  (User Device)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  FastAPI        │  Render Free Tier (750 hrs/month)
│  Backend API    │  Sleeps after 15min inactivity
└────────┬────────┘
         │
         ├──────────► PostgreSQL (Render Free - 1GB)
         │
         └──────────► Cloudflare R2 (10GB free storage)
```

---

## Part 1: Export Your Model (Local)

### Step 1: Adjust Export Script

```bash
cd model
# Edit export_model.py:
# - Set CHECKPOINT_PATH to your trained model
# - Set VALIDATION_DATA_PATH to your validation set
```

### Step 2: Run Export

```bash
python export_model.py
```

This creates:
- `resnet50_tomato_production.pth` (your production model)
- `model_metadata.json` (metadata)

---

## Part 2: Setup Cloudflare R2 (Free Storage)

### Why R2?
- **10GB free storage** (vs AWS S3's 5GB)
- **Zero egress fees** (S3 charges for downloads)
- **S3-compatible** API

### Steps:

1. **Create Account**: https://dash.cloudflare.com/sign-up
2. **Create R2 Bucket**:
   - Navigate to R2 in sidebar
   - Click "Create bucket"
   - Name: `tomato-disease-models`
   - Region: Automatic

3. **Get API Credentials**:
   - Click "Manage R2 API Tokens"
   - Create API token with "Edit" permissions
   - Save these values:
     ```
     Account ID: abc123...
     Access Key ID: xyz789...
     Secret Access Key: secret...
     ```

---

## Part 3: Deploy Backend to Render

### Why Render Free Tier?
- **750 hours/month** (enough for MVP)
- **Auto-deploys** from GitHub
- **Free PostgreSQL** database
- **Free SSL** certificate

### Steps:

#### 1. Push Code to GitHub

```bash
cd backend
git init
git add .
git commit -m "Initial backend"
git remote add origin https://github.com/YOUR_USERNAME/tomato-disease-api.git
git push -u origin main
```

#### 2. Create Render Account

- Go to https://render.com
- Sign up with GitHub

#### 3. Create PostgreSQL Database

- Dashboard → "New +" → "PostgreSQL"
- Name: `tomato-disease-db`
- Plan: **Free**
- Create Database
- **Copy Internal Database URL** (starts with `postgresql://`)

#### 4. Create Web Service

- Dashboard → "New +" → "Web Service"
- Connect your GitHub repo
- Configuration:
  ```
  Name: tomato-disease-api
  Environment: Python 3
  Build Command: pip install -r requirements.txt
  Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
  Plan: Free
  ```

#### 5. Set Environment Variables

In Render dashboard → Environment:

```bash
# Database (paste from step 3)
DATABASE_URL=postgresql://user:pass@host/db

# Cloudflare R2 (from Part 2)
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=tomato-disease-models

# Admin API Key (generate random string)
ADMIN_API_KEY=generate_random_string_here

# Python version
PYTHON_VERSION=3.11.0
```

#### 6. Deploy

- Click "Create Web Service"
- Wait 5-10 minutes for deployment
- Your API will be at: `https://your-app-name.onrender.com`

---

## Part 4: Upload Your Model

### Option A: Via Admin API (Recommended)

```bash
# From your local machine
curl -X POST https://your-app-name.onrender.com/admin/upload-model \
  -H "X-API-Key: YOUR_ADMIN_API_KEY" \
  -F "file=@model/resnet50_tomato_production.pth"
```

### Option B: Set as Default Model

1. In Render dashboard, add persistent storage:
   - Settings → "Disk"
   - Mount path: `/app/models`
   - Size: 1GB (free)

2. Upload your model via Render Shell:
   ```bash
   # In Render dashboard → Shell
   mkdir -p /app/models
   # Upload file manually via Render UI or curl
   ```

3. Set environment variable:
   ```
   MODEL_PATH=/app/models/resnet50_tomato_production.pth
   ```

---

## Part 5: Test Your API

```bash
# Health check
curl https://your-app-name.onrender.com/health

# Should return:
# {"status": "healthy", "model_loaded": true, ...}

# Test prediction (with a test image)
curl -X POST https://your-app-name.onrender.com/predict \
  -F "file=@test_leaf.jpg"
```

---

## Part 6: Deploy Mobile App

### Setup Expo

```bash
cd mobile
npm install
```

### Update API URL

Edit `mobile/src/services/api.ts`:
```typescript
const API_URL = 'https://your-app-name.onrender.com';
```

### Run on Android

```bash
npm run android
```

### Run on iOS

```bash
npm run ios
```

### Build for Production (Later)

```bash
# Android APK
eas build --platform android --profile preview

# iOS (requires Apple Developer Account - $99/year)
eas build --platform ios --profile preview
```

---

## Part 7: Monitor Your Deployment

### Render Dashboard

- **Logs**: See real-time API logs
- **Metrics**: CPU, memory, requests
- **Sleep Status**: Free tier sleeps after 15min inactivity

### Wake-Up Strategy

Render free tier sleeps after 15 minutes. First request takes ~30 seconds to wake up.

**Solution**: Cron job to ping every 14 minutes (optional)

```bash
# Use free cron service like cron-job.org
# Ping URL: https://your-app-name.onrender.com/health
# Interval: Every 14 minutes
```

### Database Monitoring

- Render → Database → Metrics
- Free tier: 1GB storage (plenty for metadata)
- ~10,000 scans = ~50MB

---

## Cost Breakdown

| Service | Free Tier | When to Upgrade |
|---------|-----------|-----------------|
| Render Backend | 750 hrs/month | After 100 daily active users |
| Render PostgreSQL | 1GB | After 50,000 scans |
| Cloudflare R2 | 10GB | After 20,000 GradCAM images |
| Expo/React Native | Free forever | Never |

**Expected Costs:**
- 0-1,000 users: **$0/month**
- 1,000-10,000 users: **$7/month** (Render paid tier for 24/7 uptime)
- 10,000+ users: **$25/month** (add R2 storage)

---

## Troubleshooting

### "Model not found" Error

```bash
# Check environment variables
curl https://your-app-name.onrender.com/model/info

# Re-upload model
curl -X POST https://your-app-name.onrender.com/admin/upload-model \
  -H "X-API-Key: YOUR_KEY" \
  -F "file=@your_model.pth"
```

### "Database connection failed"

- Verify `DATABASE_URL` in Render environment
- Ensure PostgreSQL database is running
- Check Render logs for specific error

### "R2 upload failed"

- Verify R2 credentials are correct
- Check bucket name matches `R2_BUCKET_NAME`
- Test credentials with AWS CLI:
  ```bash
  aws s3 ls --endpoint-url https://ACCOUNT_ID.r2.cloudflarestorage.com
  ```

### API is slow (30+ seconds)

- **Cold start**: Render free tier sleeps after 15min
- **Solution**: Upgrade to paid tier ($7/month) for 24/7 uptime
- **Temporary fix**: Set up cron job to keep-alive

---

## Next Steps

1. **Test thoroughly**: Upload 50+ test images from your field test set
2. **Monitor performance**: Check Render logs for errors
3. **Collect real data**: Every scan improves your model
4. **Iterate**: Use admin panel to upload improved models

**You now have a production ML system running at zero cost!** 🎉
