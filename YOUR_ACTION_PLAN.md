# 🎯 YOUR ACTION PLAN - Step-by-Step

Everything you need to do to get this running. Follow in order.

---

## 📋 Prerequisites Check

Before starting, verify you have:

- [ ] Your trained ResNet50 model checkpoint file (`.pth` or `.pt`)
- [ ] Python 3.9+ installed: `python --version`
- [ ] Node.js 18+ installed: `node --version`
- [ ] Git installed: `git --version`
- [ ] A code editor (VS Code recommended)
- [ ] GitHub account (create at github.com)
- [ ] Render account (create at render.com)
- [ ] Cloudflare account (create at cloudflare.com)

---

## PHASE 1: EXPORT YOUR MODEL (15 minutes)

### Step 1.1: Locate Your Model Checkpoint

Find your best trained model from your training notebook. It might be named:
- `best_model.pth`
- `resnet50_tomato_epoch_10.pth`
- `checkpoint.pth`
- Or whatever you saved it as

**Location examples:**
```
/content/drive/MyDrive/tomato_disease/best_model.pth  (Google Colab)
./checkpoints/model_epoch_10.pth                       (Local)
~/projects/tomato/outputs/best.pth                     (Local)
```

### Step 1.2: Edit Export Script

Open: `model/export_model.py`

**Find these lines (around line 9-11):**
```python
CHECKPOINT_PATH = "path/to/your/best_model.pth"  # ← CHANGE THIS
VALIDATION_DATA_PATH = "path/to/validation_dataset"  # ← CHANGE THIS (optional)
OUTPUT_PATH = "resnet50_tomato_production.pth"
```

**Change to YOUR paths:**
```python
CHECKPOINT_PATH = "/full/path/to/your/best_model.pth"
VALIDATION_DATA_PATH = "/path/to/validation"  # Optional - for calibration
OUTPUT_PATH = "resnet50_tomato_production.pth"
```

**Example:**
```python
CHECKPOINT_PATH = "/home/user/tomato_disease/best_model.pth"
VALIDATION_DATA_PATH = "/home/user/tomato_disease/val_data"
OUTPUT_PATH = "resnet50_tomato_production.pth"
```

### Step 1.3: Adjust Model Loading Code (if needed)

Your checkpoint might have a different structure. Check how it's saved in your notebook:

**If your notebook saves like this:**
```python
# Option A: Just state dict
torch.save(model.state_dict(), "model.pth")

# Option B: With metadata
torch.save({
    'model_state_dict': model.state_dict(),
    'optimizer_state_dict': optimizer.state_dict(),
    'epoch': epoch,
}, "model.pth")

# Option C: Entire model
torch.save(model, "model.pth")
```

**Then adjust `export_model.py` line 60-70:**
```python
# Find this section and match your format:
checkpoint = torch.load(CHECKPOINT_PATH, map_location=device)

# Option A format:
if isinstance(checkpoint, dict) and 'model_state_dict' in checkpoint:
    model.load_state_dict(checkpoint['model_state_dict'])
# Option B format:
elif isinstance(checkpoint, dict):
    model.load_state_dict(checkpoint)
# Option C format:
else:
    model = checkpoint
```

### Step 1.4: Run Export

```bash
cd model
python export_model.py
```

**Expected output:**
```
🚀 Starting model export...
📂 Loading checkpoint from: /path/to/your/model.pth
✅ Model loaded successfully
⚠️  Using default temperature: 1.5
✅ Production model saved: resnet50_tomato_production.pth
   Size: 97.8 MB
✅ Metadata saved: model_metadata.json
🎉 Export complete! Ready for deployment.
```

**You now have:**
- `resnet50_tomato_production.pth` (your production model)
- `model_metadata.json` (metadata)

**IMPORTANT: Keep this file safe! You'll upload it later.**

---

## PHASE 2: SETUP CREDENTIALS (10 minutes)

### Step 2.1: Create Cloudflare R2 Account

1. Go to https://dash.cloudflare.com/sign-up
2. Sign up (free)
3. Click "R2" in left sidebar
4. Click "Create bucket"
   - Name: `tomato-disease-models`
   - Location: Automatic
   - Click "Create bucket"

5. Click "Manage R2 API Tokens"
6. Click "Create API Token"
   - Token Name: `tomato-disease-api`
   - Permissions: **"Object Read & Write"**
   - Click "Create API Token"

7. **SAVE THESE CREDENTIALS NOW:**
   ```
   Account ID: ___________________________
   Access Key ID: ________________________
   Secret Access Key: ____________________
   ```

   **⚠️ You can only see Secret Key once! Save it now.**

### Step 2.2: Create Render Account

1. Go to https://render.com
2. Click "Get Started"
3. Sign up with GitHub (easiest)

### Step 2.3: Generate Admin API Key

Generate a random 32-character string for admin access:

**Option A: Use Python**
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

**Option B: Use Online Generator**
- Go to https://www.random.org/strings/
- Set length to 32
- Generate

**SAVE THIS:**
```
Admin API Key: 
```

---

## PHASE 3: DEPLOY BACKEND (15 minutes)

### Step 3.1: Push Code to GitHub

```bash
# Navigate to project root
cd /path/to/your/project

# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit - Tomato disease detection system"

# Create GitHub repo (Option A - using GitHub CLI)
gh repo create tomato-disease-api --public --source=. --push

# OR Option B - Manual
# 1. Go to github.com → New repository
# 2. Name: tomato-disease-api
# 3. Public
# 4. Don't initialize with README
# 5. Copy the commands shown and run them
```

### Step 3.2: Create PostgreSQL Database

1. Go to Render dashboard: https://dashboard.render.com
2. Click "New +" → "PostgreSQL"
3. Configuration:
   - **Name:** `tomato-disease-db`
   - **Database:** `tomato_disease`
   - **User:** `app_user`
   - **Region:** Select closest to you (e.g., Oregon, Frankfurt)
   - **Plan:** **Free**
4. Click "Create Database"
5. Wait 2 minutes for creation
6. **Copy the "Internal Database URL"** (looks like this):
   ```
   postgresql://app_user:password@host.render.com/tomato_disease
   ```

   **SAVE THIS:**
   ```
   Database URL: ________________________________________
   ```

### Step 3.3: Deploy Web Service

1. Still in Render dashboard
2. Click "New +" → "Web Service"
3. Click "Connect account" → Select your GitHub repo `tomato-disease-api`
4. Configuration:
   - **Name:** `tomato-api` (or whatever you want)
   - **Root Directory:** Leave blank (or `backend` if monorepo)
   - **Environment:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan:** **Free**

5. Click "Advanced" → "Add Environment Variable"

   **Add these variables ONE BY ONE:**

   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | Paste from Step 3.2 |
   | `R2_ACCOUNT_ID` | Paste from Step 2.1 |
   | `R2_ACCESS_KEY_ID` | Paste from Step 2.1 |
   | `R2_SECRET_ACCESS_KEY` | Paste from Step 2.1 |
   | `R2_BUCKET_NAME` | `tomato-disease-models` |
   | `ADMIN_API_KEY` | Paste from Step 2.3 |
   | `PYTHON_VERSION` | `3.11.0` |

6. Click "Create Web Service"

7. **Wait 5-7 minutes** for deployment

8. **Your API URL will be:** `https://tomato-api.onrender.com` (or whatever name you chose)

   **SAVE THIS:**
   ```
   API URL: https://tomato-api-xlik.onrender.com
   ```

### Step 3.4: Verify Backend is Working

```bash
# Replace with YOUR URL
curl https://tomato-api.onrender.com/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "model_loaded": false,
  "model_version": "v1.0.0",
  "database": "connected"
}
```

**Note:** `model_loaded: false` is expected - you haven't uploaded your model yet!

---

## PHASE 4: UPLOAD YOUR MODEL (2 minutes)

### Step 4.1: Upload Model via API

```bash
# Navigate to where your exported model is
cd model

# Upload (replace YOUR_URL and YOUR_KEY)
curl -X POST https://YOUR_URL.onrender.com/admin/upload-model \
  -H "X-API-Key: YOUR_ADMIN_API_KEY" \
  -F "file=@resnet50_tomato_production.pth"
```

**Example:**
```bash
curl -X POST https://tomato-api.onrender.com/admin/upload-model \
  -H "X-API-Key: abc123def456..." \
  -F "file=@resnet50_tomato_production.pth"
```

**Expected response:**
```json
{
  "status": "success",
  "message": "Model updated successfully",
  "version": "v20260618_103045",
  "previous_version": "v1.0.0"
}
```

**This takes 1-2 minutes to upload (~100MB file).**

### Step 4.2: Verify Model Loaded

```bash
curl https://YOUR_URL.onrender.com/model/info
```

**Expected response:**
```json
{
  "version": "v20260618_103045",
  "uploaded_at": "2026-06-18T10:30:45",
  "accuracy_field": 0.902,
  "total_scans": 0
}
```

✅ **Your backend is now fully operational with your model!**

---

## PHASE 5: RUN MOBILE APP LOCALLY (5 minutes)

### Step 5.1: Install Dependencies

```bash
cd mobile
npm install
```

**This takes 2-3 minutes.**

### Step 5.2: Update API URL

**Open:** `mobile/src/services/api.ts`

**Find line 4:**
```typescript
const API_URL = 'https://your-app-name.onrender.com';
```

**Change to YOUR URL:**
```typescript
const API_URL = 'https://tomato-api.onrender.com';  // YOUR URL
```

**Save the file.**

### Step 5.3: Run App

**Option A: Android Emulator**
```bash
npm run android
```

**Option B: iOS Simulator (Mac only)**
```bash
npm run ios
```

**Option C: Physical Device (Expo Go)**
```bash
npm start
```
Then scan QR code with Expo Go app on your phone.

**Expected:** App opens, shows camera screen

---

## PHASE 6: TEST EVERYTHING (5 minutes)

### Test 1: Backend API

```bash
# Health check
curl https://YOUR_URL.onrender.com/health

# Model info
curl https://YOUR_URL.onrender.com/model/info

# Test prediction with an image
curl -X POST https://YOUR_URL.onrender.com/predict \
  -F "file=@/path/to/test_leaf.jpg"
```

### Test 2: Mobile App

1. Open app on device/emulator
2. Grant camera permission
3. Take photo of a tomato leaf (or any image for testing)
4. Click "Analyze"
5. Wait 2-5 seconds
6. **You should see:**
   - Disease name
   - Confidence percentage
   - GradCAM heatmap (red overlay)
   - Treatment recommendations
7. Click "View History"
8. **You should see:** Your scan saved in history

---

## 🎉 YOU'RE DONE!

Your system is now fully operational:

- ✅ Backend API running on Render
- ✅ Your model loaded and serving predictions
- ✅ Database storing scan history
- ✅ R2 storing GradCAM images
- ✅ Mobile app working (iOS + Android)

---

## 🔧 TROUBLESHOOTING

### Problem: "Model not loaded" error

**Solution:**
```bash
# Re-upload model
curl -X POST https://YOUR_URL.onrender.com/admin/upload-model \
  -H "X-API-Key: YOUR_KEY" \
  -F "file=@resnet50_tomato_production.pth"
```

### Problem: Backend returns 500 error

**Check logs:**
1. Go to Render dashboard
2. Click your web service
3. Click "Logs" tab
4. Look for error messages

### Problem: "Network error" in mobile app

**Check:**
- API_URL in `mobile/src/services/api.ts` is correct
- Backend is awake (free tier sleeps after 15 min)
- Try pinging `/health` first to wake it up

### Problem: Predictions are wrong

**Check:**
1. Verify model uploaded correctly:
   ```bash
   curl https://YOUR_URL.onrender.com/model/info
   ```
2. Test with known good images from your field test set
3. Check model file size (~95-100 MB expected)

### Problem: Export script fails

**Common issues:**
1. **Wrong checkpoint path** - Verify file exists
2. **Different checkpoint format** - Adjust loading code in `export_model.py`
3. **Missing dependencies** - Run `pip install torch torchvision`

---

## 📝 CREDENTIALS SUMMARY

Save all these in a safe place (password manager):

```
CLOUDFLARE R2:
- Account ID: ___________________
- Access Key: ___________________
- Secret Key: ___________________
- Bucket Name: tomato-disease-models

RENDER:
- Database URL: postgresql://...
- Admin API Key: ___________________
- API URL: https://___________________

GITHUB:
- Repo: https://github.com/YOU/tomato-disease-api
```

---

## 🚀 WHAT'S NEXT?

### This Week
1. Test with 20+ images from your field test set
2. Verify accuracy matches your training results
3. Check GradCAM highlights correct regions

### Next Month
1. Collect real user scans
2. Identify common failure cases
3. Retrain model with new data
4. Upload improved model via admin API

### Future Features (Optional)
- Test-Time Augmentation (improve accuracy by ~2-3%)
- Disease Progression Tracking
- Multi-crop support
- Offline mode (TFLite)

---

## ❓ COMMON QUESTIONS

**Q: Where do I put my model file?**  
A: Upload it via curl command in Phase 4. Don't commit it to GitHub (it's too large).

**Q: Can I test locally without deploying?**  
A: Yes! See `backend/README.md` for local development setup.

**Q: How do I update my model?**  
A: Just re-run the curl upload command with your new model file. Takes 2 minutes.

**Q: The backend is slow (30+ seconds)**  
A: First request after 15 min takes time (cold start on free tier). Subsequent requests are fast.

**Q: Can I use a different model architecture?**  
A: Yes, but you need to update `backend/app/models.py` to match your architecture.

---

**Follow this guide step-by-step and you'll have a working system in ~45 minutes!**
