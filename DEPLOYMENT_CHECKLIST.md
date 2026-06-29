# 🚀 Deployment Checklist

Use this checklist to deploy your system from scratch in 30 minutes.

---

## ✅ Prerequisites (Before You Start)

- [ ] Your trained ResNet50 model checkpoint (`.pth` file)
- [ ] GitHub account (free)
- [ ] Render account (free) - https://render.com
- [ ] Cloudflare account (free) - https://cloudflare.com
- [ ] Node.js 18+ installed
- [ ] Python 3.9+ installed
- [ ] Git installed
- [ ] Expo CLI installed (`npm install -g expo-cli`)

---

## 📦 Step 1: Export Your Model (5 minutes)

- [ ] Navigate to `model/` directory
- [ ] Edit `export_model.py`:
  - [ ] Set `CHECKPOINT_PATH` to your trained model
  - [ ] Set `VALIDATION_DATA_PATH` to your validation set (optional)
- [ ] Run: `python export_model.py`
- [ ] Verify output file created: `resnet50_tomato_production.pth`
- [ ] Check file size (should be ~95-100 MB)

---

## 🔐 Step 2: Setup Cloudflare R2 (5 minutes)

- [ ] Sign up at https://dash.cloudflare.com
- [ ] Navigate to R2 → Create bucket
  - [ ] Bucket name: `tomato-disease-models`
  - [ ] Location: Automatic
- [ ] Click "Manage R2 API Tokens"
- [ ] Create API token:
  - [ ] Permissions: "Edit" (Object Read & Write)
  - [ ] Name: "tomato-disease-api"
- [ ] **Save these credentials** (you'll need them later):
  ```
  Account ID: _________________
  Access Key ID: _________________
  Secret Access Key: _________________
  ```

---

## 🗄️ Step 3: Deploy Database (2 minutes)

- [ ] Go to https://render.com
- [ ] Sign up with GitHub
- [ ] Dashboard → "New +" → "PostgreSQL"
- [ ] Configuration:
  - [ ] Name: `tomato-disease-db`
  - [ ] Database: `tomato_disease`
  - [ ] User: `app_user`
  - [ ] Region: Choose closest to you
  - [ ] Plan: **Free**
- [ ] Click "Create Database"
- [ ] **Copy Internal Database URL** (starts with `postgresql://`):
  ```
  postgresql://user:pass@host/db
  ```

---

## 🌐 Step 4: Deploy Backend API (10 minutes)

### A. Push Code to GitHub

- [ ] Navigate to `backend/` directory
- [ ] Initialize git:
  ```bash
  cd backend
  git init
  git add .
  git commit -m "Initial commit"
  ```
- [ ] Create GitHub repo:
  ```bash
  gh repo create tomato-disease-api --public --source=. --push
  ```
  OR manually create repo and push:
  ```bash
  git remote add origin https://github.com/YOUR_USERNAME/tomato-disease-api.git
  git push -u origin main
  ```

### B. Deploy to Render

- [ ] Go to Render Dashboard → "New +" → "Web Service"
- [ ] Connect to your GitHub repo
- [ ] Configuration:
  - [ ] Name: `tomato-api`
  - [ ] Root Directory: `backend` (if monorepo) or leave blank
  - [ ] Environment: `Python 3`
  - [ ] Build Command: `pip install -r requirements.txt`
  - [ ] Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
  - [ ] Plan: **Free**

### C. Set Environment Variables

- [ ] In Render dashboard → Environment tab, add:
  ```bash
  # Database (from Step 3)
  DATABASE_URL=postgresql://...

  # Cloudflare R2 (from Step 2)
  R2_ACCOUNT_ID=your_account_id
  R2_ACCESS_KEY_ID=your_access_key
  R2_SECRET_ACCESS_KEY=your_secret_key
  R2_BUCKET_NAME=tomato-disease-models

  # Admin Key (generate random 32-character string)
  ADMIN_API_KEY=<your_random_key_here>

  # Python Version
  PYTHON_VERSION=3.11.0
  ```

- [ ] Click "Save Changes"
- [ ] Wait for deployment (5-7 minutes)
- [ ] Note your API URL: `https://tomato-api.onrender.com`

---

## 🧠 Step 5: Upload Your Model (2 minutes)

- [ ] Test API health:
  ```bash
  curl https://YOUR_URL.onrender.com/health
  ```
  Should return: `{"status":"healthy",...}`

- [ ] Upload your model:
  ```bash
  curl -X POST https://YOUR_URL.onrender.com/admin/upload-model \
    -H "X-API-Key: YOUR_ADMIN_API_KEY" \
    -F "file=@model/resnet50_tomato_production.pth"
  ```

- [ ] Verify model loaded:
  ```bash
  curl https://YOUR_URL.onrender.com/model/info
  ```
  Should return model version and accuracy

---

## 📱 Step 6: Setup Mobile App (5 minutes)

- [ ] Navigate to `mobile/` directory
- [ ] Install dependencies:
  ```bash
  cd mobile
  npm install
  ```

- [ ] Update API URL:
  - [ ] Edit `src/services/api.ts`
  - [ ] Change line 4: `const API_URL = 'https://YOUR_URL.onrender.com';`

- [ ] Test on emulator/device:
  ```bash
  # Android
  npm run android

  # OR iOS
  npm run ios

  # OR Expo Go (scan QR code)
  npm start
  ```

---

## ✅ Step 7: Test Everything (5 minutes)

### Backend Tests

- [ ] Health check:
  ```bash
  curl https://YOUR_URL.onrender.com/health
  ```

- [ ] Model info:
  ```bash
  curl https://YOUR_URL.onrender.com/model/info
  ```

- [ ] Test prediction (with a test image):
  ```bash
  curl -X POST https://YOUR_URL.onrender.com/predict \
    -F "file=@test_leaf.jpg"
  ```

### Mobile App Tests

- [ ] Open app on device/emulator
- [ ] Take a photo of tomato leaf
- [ ] Verify:
  - [ ] Disease prediction appears
  - [ ] Confidence score shown
  - [ ] GradCAM heatmap displays
  - [ ] Recommendations appear
  - [ ] Can view scan in history

---

## 🎉 Step 8: You're Live! (Optional Enhancements)

### A. Set Up Custom Domain (Optional)

- [ ] Buy domain (Namecheap, Google Domains)
- [ ] In Render: Settings → Custom Domain
- [ ] Add CNAME record: `api.yourdomain.com → your-app.onrender.com`

### B. Enable Monitoring (Optional)

- [ ] Sign up for UptimeRobot (free)
- [ ] Monitor URL: `https://YOUR_URL.onrender.com/health`
- [ ] Get alerts if API goes down

### C. Analytics (Optional)

- [ ] Add Sentry for error tracking
- [ ] Add PostHog for usage analytics
- [ ] Add LogRocket for session replay

---

## 🐛 Troubleshooting

### ❌ "Model not loaded" error

**Check:**
- [ ] Model uploaded successfully?
  ```bash
  curl https://YOUR_URL.onrender.com/model/info
  ```
- [ ] Render logs show errors?
  - Dashboard → Logs tab

**Fix:**
- Re-upload model
- Check file size (should be ~95-100 MB)
- Verify checkpoint format matches expected structure

---

### ❌ Database connection failed

**Check:**
- [ ] `DATABASE_URL` environment variable set?
- [ ] PostgreSQL database running in Render?
- [ ] URL format: `postgresql://user:pass@host/db`

**Fix:**
- Copy fresh URL from PostgreSQL dashboard
- Ensure URL starts with `postgresql://` (not `postgres://`)

---

### ❌ R2 upload failed

**Check:**
- [ ] R2 credentials correct?
- [ ] Bucket name matches `R2_BUCKET_NAME`?

**Fix:**
- System falls back to local storage automatically
- Verify credentials in Cloudflare dashboard
- Test with AWS CLI:
  ```bash
  aws s3 ls --endpoint-url https://ACCOUNT_ID.r2.cloudflarestorage.com
  ```

---

### ❌ Mobile app "Network error"

**Check:**
- [ ] API URL correct in `mobile/src/services/api.ts`?
- [ ] Backend API awake? (Render free tier sleeps after 15 min)
- [ ] Internet connection on device?

**Fix:**
- Wake up API by visiting health endpoint
- Check API_URL doesn't have trailing slash
- Test backend directly with curl first

---

### ❌ API is slow (30+ seconds)

**Cause:** Render free tier cold start (sleeps after 15 min inactivity)

**Solutions:**
1. **Free option:** Set up UptimeRobot to ping every 5 min
2. **Paid option:** Upgrade to Render Standard ($7/month) for 24/7 uptime

---

## 📊 Monitor Your Deployment

### Render Dashboard
- [ ] Check logs regularly: Dashboard → Logs
- [ ] Monitor metrics: CPU, Memory, Requests
- [ ] Set up email alerts: Settings → Notifications

### Database Usage
- [ ] PostgreSQL dashboard → Metrics
- [ ] Free tier: 1GB storage
- [ ] ~100 scans = ~5 MB

### R2 Storage
- [ ] Cloudflare dashboard → R2
- [ ] Free tier: 10GB
- [ ] ~1 GradCAM image = ~500 KB

---

## 🎯 Success Criteria

Your deployment is successful when:

- ✅ Backend API returns `{"status":"healthy"}` at `/health`
- ✅ Model info shows correct version at `/model/info`
- ✅ Test prediction returns valid JSON with disease classification
- ✅ Mobile app takes photo and shows disease + GradCAM
- ✅ Scan history saves and displays previous scans
- ✅ All services running on free tiers (cost = $0/month)

---

## 📅 Post-Deployment Tasks

### Week 1
- [ ] Test with 20+ field images from your test set
- [ ] Verify accuracy matches your ablation study (90.20%)
- [ ] Check GradCAM highlights correct regions
- [ ] Test on different devices (Android + iOS)

### Week 2
- [ ] Collect real user scans
- [ ] Monitor error rates in logs
- [ ] Identify common misclassifications
- [ ] Plan model improvements

### Month 1
- [ ] Accumulate 100+ user scans
- [ ] Retrain model with new data
- [ ] Upload improved model via hot-swap
- [ ] Compare old vs new model performance

---

## 🚀 Next Steps

1. **Share with farmers** - Get real-world feedback
2. **Iterate on model** - Use admin panel to deploy improvements
3. **Add features** - Disease progression tracking, offline mode
4. **Scale up** - When you hit 1,000 users, upgrade to paid tiers

---

**Congratulations! You now have a production ML system running at zero cost.** 🎉

**Estimated time:** 30 minutes  
**Current cost:** $0/month  
**Capacity:** 1,000+ users before needing to upgrade
