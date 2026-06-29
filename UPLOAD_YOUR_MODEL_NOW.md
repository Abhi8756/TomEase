# 🚀 Upload Your Model NOW - Quick Guide

Your backend is already deployed! Just upload your model.

---

## ✅ Your Current Status

- ✅ Backend deployed: `https://tomato-api-xlik.onrender.com`
- ✅ Model file ready: `CBAM_False_SUPCON_False_FISHR_False_DVD_False_best_test.pth`
- ✅ Admin key: `55994692270115581428323994038566`
- ❌ Model not uploaded yet (that's why API shows `model_loaded: false`)

---

## 🎯 Option 1: Direct Upload (Recommended - 2 minutes)

### Fix your curl command:

You had a small mistake - missing `/admin/upload-model` path!

**Your command (WRONG):**
```bash
curl -X POST https://tomato-api-xlik.onrender.com
```

**Correct command:**
```bash
curl -X POST https://tomato-api-xlik.onrender.com/admin/upload-model \
  -H "X-API-Key: 55994692270115581428323994038566" \
  -F "file=@CBAM_False_SUPCON_False_FISHR_False_DVD_False_best_test.pth"
```

### Run this in Git Bash:

```bash
cd "/c/Abhijit Data/TomEase"

curl -X POST https://tomato-api-xlik.onrender.com/admin/upload-model \
  -H "X-API-Key: 55994692270115581428323994038566" \
  -F "file=@CBAM_False_SUPCON_False_FISHR_False_DVD_False_best_test.pth"
```

**This will take 1-2 minutes** (uploading ~98MB file).

**Expected output:**
```json
{
  "status": "success",
  "message": "Model updated successfully",
  "version": "v20260619_...",
  "previous_version": "v1.0.0"
}
```

---

## 🎯 Option 2: Use the Batch File (Windows - Even Easier!)

I created a ready-to-run batch file for you:

```bash
# Just double-click this file:
upload_model.bat
```

Or run from command line:
```bash
cd "/c/Abhijit Data/TomEase"
./upload_model.bat
```

---

## 🎯 Option 3: Export First, Then Upload (If you want to process it)

### Step 1: Run Export Script

```bash
cd model
python export_model_simple.py
```

This creates: `resnet50_tomato_production.pth`

### Step 2: Upload

```bash
curl -X POST https://tomato-api-xlik.onrender.com/admin/upload-model \
  -H "X-API-Key: 55994692270115581428323994038566" \
  -F "file=@resnet50_tomato_production.pth"
```

---

## ✅ Verify Upload Worked

### Check model info:

```bash
curl https://tomato-api-xlik.onrender.com/model/info
```

**Should return:**
```json
{
  "version": "v20260619_...",
  "uploaded_at": "2026-06-19T...",
  "accuracy_field": 0.902,
  "total_scans": 0
}
```

### Check health:

```bash
curl https://tomato-api-xlik.onrender.com/health
```

**Should show:**
```json
{
  "status": "healthy",
  "model_loaded": true,  ← This should be true now!
  "model_version": "v20260619_...",
  "database": "connected"
}
```

---

## 🧪 Test Prediction

Upload a test image:

```bash
curl -X POST https://tomato-api-xlik.onrender.com/predict \
  -F "file=@path/to/test_leaf.jpg"
```

**Should return:**
```json
{
  "scan_id": "abc-123",
  "disease": "Early_Blight",
  "confidence": 0.92,
  "confidence_calibrated": 0.87,
  "gradcam_url": "...",
  "recommendations": [...],
  "is_reliable": true
}
```

---

## 🐛 Troubleshooting

### Error: "Method Not Allowed"
**Cause:** Missing `/admin/upload-model` in URL
**Fix:** Use the correct endpoint shown above

### Error: "Invalid API key"
**Cause:** Wrong admin key
**Fix:** Check your Render environment variables

### Upload timeout
**Cause:** File too large or slow internet
**Fix:** 
1. Wait longer (up to 5 minutes)
2. Or use Option 3 (export first - makes smaller file)

### Error: "Invalid model"
**Cause:** Checkpoint format incompatible
**Fix:** Run `export_model_simple.py` first

---

## 📝 Why No validation_data_path?

**Validation data is OPTIONAL** - used for temperature scaling calibration.

**Without it:**
- Uses default temperature = 1.5
- Still works great! (research-backed default)

**With it:**
- Learns optimal temperature from your validation set
- ~1-2% better calibration

**For MVP: Skip it! Default works fine.**

---

## 📝 Why export_model.py?

**Purpose:** Process your checkpoint for production

**What it does:**
1. Loads your training checkpoint
2. Strips unnecessary training data (optimizer state, etc.)
3. Adds production metadata (classes, temperature)
4. Creates clean production file

**Do you need it?**
- **Option A:** Upload your checkpoint directly (works!)
- **Option B:** Export first, then upload (cleaner, recommended)

**The export doesn't run automatically** - only when you run `python export_model.py`.

---

## 🎉 Next Steps

1. **Upload model** using Option 1 above (2 minutes)
2. **Verify** it worked with curl commands
3. **Test mobile app** - it should now work!

---

**Your model file is 98MB. Upload takes 1-2 minutes. Then you're done!**
