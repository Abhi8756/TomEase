# 🚀 Quick Start - Get Running in 30 Minutes

This is your **fastest path** from trained model to production app.

## Prerequisites

- Your trained ResNet50 model checkpoint (`.pth` file)
- GitHub account (free)
- Render account (free)
- Cloudflare account (free)
- Node.js installed
- Python 3.9+ installed

---

## Step 1: Export Model (5 minutes)

```bash
cd model
# Edit export_model.py - set your checkpoint path
nano export_model.py  # Line 9: CHECKPOINT_PATH = "path/to/your/model.pth"

python export_model.py
# Creates: resnet50_tomato_production.pth
```

---

## Step 2: Deploy Backend (15 minutes)

### A. Push to GitHub

```bash
cd backend
git init
git add .
git commit -m "Deploy tomato disease API"
gh repo create tomato-disease-api --public --source=. --push
```

### B. Create Render Services

1. Go to https://render.com → Sign up with GitHub
2. Create PostgreSQL:
   - New → PostgreSQL → Free tier
   - Name: `tomato-db`
   - Copy the **Internal Database URL**

3. Create Web Service:
   - New → Web Service
   - Connect your GitHub repo
   - Name: `tomato-api`
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

4. Add Environment Variables:
   ```
   DATABASE_URL=<paste from step 2>
   ADMIN_API_KEY=<generate random 32 char string>
   R2_ACCOUNT_ID=temp
   R2_ACCESS_KEY_ID=temp
   R2_SECRET_ACCESS_KEY=temp
   ```

5. Deploy (wait 5 minutes)

### C. Upload Your Model

```bash
# Replace YOUR_URL and YOUR_KEY
curl -X POST https://tomato-api.onrender.com/admin/upload-model \
  -H "X-API-Key: YOUR_ADMIN_API_KEY" \
  -F "file=@resnet50_tomato_production.pth"
```

### D. Test It

```bash
curl https://tomato-api.onrender.com/health
# Should return: {"status":"healthy","model_loaded":true}
```

---

## Step 3: Run Mobile App (10 minutes)

```bash
cd mobile

# Install dependencies
npm install

# Update API URL
nano src/services/api.ts
# Line 4: const API_URL = 'https://tomato-api.onrender.com';

# Install Expo CLI (if not installed)
npm install -g expo-cli

# Run on Android
npm run android

# OR run on iOS
npm run ios
```

---

## ✅ Done!

You now have:
- ✅ Production API running on Render (free)
- ✅ PostgreSQL database tracking scans
- ✅ Mobile app with camera + detection
- ✅ GradCAM visualization
- ✅ Scan history stored locally

---

## Test It Out

1. Open mobile app
2. Take photo of a tomato leaf
3. Get disease prediction + heatmap
4. See treatment recommendations

---

## Optional: Add Cloudflare R2 (Better Storage)

Currently using local storage (resets on restart). To persist GradCAM images:

1. Create R2 bucket at https://dash.cloudflare.com
2. Get API credentials
3. Update Render environment variables:
   ```
   R2_ACCOUNT_ID=<your_id>
   R2_ACCESS_KEY_ID=<your_key>
   R2_SECRET_ACCESS_KEY=<your_secret>
   R2_BUCKET_NAME=tomato-disease
   ```

---

## Troubleshooting

**API returns 500 error**
- Check Render logs: Dashboard → Logs
- Verify model uploaded: `curl YOUR_URL/model/info`

**Mobile app can't connect**
- Verify API_URL in `mobile/src/services/api.ts`
- Check API is awake (free tier sleeps after 15min)

**Model inference slow**
- First request takes 30s (cold start on free tier)
- Subsequent requests: <2 seconds

---

## What's Next?

1. **Deploy to production**: See `docs/DEPLOYMENT.md`
2. **Add more features**: Disease progression tracking, offline mode
3. **Improve model**: Collect real user scans for retraining
4. **Scale up**: Upgrade Render plan when you hit 100+ daily users

**Need help?** Check `docs/API_DOCUMENTATION.md` for complete reference.
