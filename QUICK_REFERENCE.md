# Quick Reference Card

**Keep this open while following YOUR_ACTION_PLAN.md**

---

## 📍 File Locations

### Where to Place Your Model

**DON'T commit to GitHub** (too large)

**Upload via API after backend is deployed:**
```bash
curl -X POST https://YOUR_URL.onrender.com/admin/upload-model \
  -H "X-API-Key: YOUR_KEY" \
  -F "file=@resnet50_tomato_production.pth"
```

### Where to Enter Credentials

**Backend (Render Dashboard):**
- Navigate to: Your Web Service → Environment → Add Environment Variable
- Add each credential from YOUR_ACTION_PLAN.md Phase 2

**Mobile App:**
- File: `mobile/src/services/api.ts`
- Line 4: Change `API_URL` to your Render URL

---

## ✅ Features Implemented

### Phase 1 (MVP) - ✅ COMPLETE
- [x] FastAPI Detection Endpoint
  - [x] Input: Raw camera photo
  - [x] Preprocessing: Resize to 224×224, normalize
  - [x] Inference: ResNet50 forward pass
  - [x] Output: {class, confidence, gradcam_heatmap}

- [x] Model Hot-Swap System
  - [x] Admin uploads new .pth checkpoint
  - [x] Validates architecture compatibility
  - [x] Stores to R2 with version tag
  - [x] Reloads PyTorch model singleton

- [x] React Native Camera Screen
  - [x] Take photo → Upload to FastAPI
  - [x] Display disease + confidence
  - [x] Show GradCAM overlay

### Phase 2 (Trust & Reliability) - ✅ MOSTLY COMPLETE
- [x] Confidence Calibration
  - [x] Temperature scaling implemented
  - [x] Honest confidence scores

- [ ] Test-Time Augmentation (TTA)
  - [ ] NOT implemented yet
  - [ ] Can add if you want (+2-3% accuracy)

- [x] Uncertainty Quantification
  - [x] Entropy-based detection
  - [x] Low confidence rejection
  - [x] "Retake photo" prompts

### Phase 3 (Continuous Improvement) - ❌ NOT IMPLEMENTED
These are future enhancements:
- [ ] Active Learning Pipeline
- [ ] Disease Progression Tracker  
- [ ] Multi-Crop Expansion

**You add these after MVP is working and collecting real data.**

---

## 🔑 Credentials Checklist

Copy this template and fill in YOUR values:

```
CLOUDFLARE R2:
Account ID: ___________________________
Access Key ID: ________________________
Secret Access Key: ____________________
Bucket Name: tomato-disease-models

RENDER:
Database URL: postgresql://_____________
Admin API Key: ________________________
API URL: https://______________________.onrender.com

GITHUB:
Repository: https://github.com/________/________
```

---

## 🚀 Command Cheat Sheet

### Export Model
```bash
cd model
# Edit export_model.py first (set CHECKPOINT_PATH)
python export_model.py
```

### Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
gh repo create tomato-disease-api --public --source=. --push
```

### Upload Model to Backend
```bash
curl -X POST https://YOUR_URL.onrender.com/admin/upload-model \
  -H "X-API-Key: YOUR_KEY" \
  -F "file=@resnet50_tomato_production.pth"
```

### Test Backend
```bash
# Health check
curl https://YOUR_URL.onrender.com/health

# Model info
curl https://YOUR_URL.onrender.com/model/info

# Test prediction
curl -X POST https://YOUR_URL.onrender.com/predict \
  -F "file=@test_leaf.jpg"
```

### Run Mobile App
```bash
cd mobile
npm install
# Edit src/services/api.ts first (set API_URL)
npm run android  # or npm run ios
```

---

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| "Model not loaded" | Upload model via curl command |
| Backend 500 error | Check Render logs tab |
| Mobile "Network error" | Verify API_URL in api.ts |
| Backend slow (30s+) | Cold start - first request after 15min |
| Export script fails | Check CHECKPOINT_PATH is correct |
| Database error | Verify DATABASE_URL format |
| R2 upload fails | Check credentials, falls back to local |

---

## 📊 Deployment Status Checklist

- [ ] Model exported (`resnet50_tomato_production.pth` created)
- [ ] Cloudflare R2 bucket created
- [ ] Render PostgreSQL database created
- [ ] Backend deployed to Render
- [ ] Environment variables set
- [ ] Model uploaded via API
- [ ] Backend health check passes
- [ ] Mobile app API_URL updated
- [ ] Mobile app runs on device
- [ ] Test prediction successful

---

## 🎯 What You Need From Your Training Notebook

1. **Model checkpoint file** (`.pth` or `.pt`)
   - Location: Where you saved your trained model
   - Size: Should be ~95-100 MB

2. **Model architecture** (should match ResNet50)
   - 6 output classes
   - ImageNet normalization

3. **Validation dataset** (optional - for temperature calibration)
   - If you have it, better calibration
   - If not, uses default temperature = 1.5

---

## 💡 Key Insights

### Why No Model in GitHub?
- Model file is ~100MB
- GitHub has 100MB file size limit
- Instead: Upload via API after deployment

### Why Upload via API?
- Model stored in Cloudflare R2 (unlimited size)
- Hot-swap: Update model without redeployment
- Version control: Keep history of models

### Why Environment Variables?
- Keep secrets out of code
- Easy to update without code changes
- Different values for dev/prod

---

## 📚 Documentation Quick Links

- **Start here:** `YOUR_ACTION_PLAN.md` (step-by-step guide)
- **Overview:** `PROJECT_OVERVIEW.md` (what we built)
- **Quick start:** `QUICKSTART.md` (condensed version)
- **API docs:** `docs/API_DOCUMENTATION.md`
- **Deployment:** `docs/DEPLOYMENT.md`
- **Architecture:** `docs/ARCHITECTURE_DECISIONS.md`

---

## 🔄 Update Workflow

### To Update Your Model:

1. **Train improved model** in your notebook
2. **Export:** `python export_model.py`
3. **Upload:** `curl -X POST /admin/upload-model -F "file=@new_model.pth"`
4. **Done!** All users get new model instantly (no app update needed)

### To Update Code:

1. **Make changes** to code
2. **Commit:** `git add . && git commit -m "Update"`
3. **Push:** `git push`
4. **Render auto-deploys** (takes 5 min)

---

## 🎉 Success Indicators

Your deployment is successful when:

1. ✅ `curl /health` returns `{"status":"healthy","model_loaded":true}`
2. ✅ `curl /model/info` shows your model version
3. ✅ `curl /predict` returns disease prediction
4. ✅ Mobile app takes photo and shows result
5. ✅ GradCAM heatmap displays on result screen
6. ✅ Scan history saves previous scans

---

## 💰 Cost Tracking

| Service | Usage | Cost |
|---------|-------|------|
| Render Backend | 750 hrs/month | $0 |
| Render PostgreSQL | 1GB | $0 |
| Cloudflare R2 | 10GB | $0 |
| Mobile App | Unlimited | $0 |
| **TOTAL** | | **$0/month** |

**When to upgrade:** After 1,000 daily active users (~$7/month)

---

**Keep this file open while deploying! Reference it anytime you're stuck.**
