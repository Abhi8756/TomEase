# Tomato Disease Detection - FastAPI Backend

Production-ready FastAPI backend for tomato leaf disease classification.

## Features

- 🔬 **ResNet50 Model** - 90.20% field accuracy
- 🌡️ **Temperature Calibration** - Honest confidence scores
- 🎨 **GradCAM** - Visual explanations
- 🚫 **OOD Detection** - Reject unreliable predictions
- 🔄 **Model Hot-Swap** - Update without redeployment
- 📊 **Scan History** - PostgreSQL storage
- ☁️ **Cloud Storage** - Cloudflare R2 integration

## Quick Start

### Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL=sqlite:///./test.db
export ADMIN_API_KEY=test123

# Run server
uvicorn app.main:app --reload
```

Visit: http://localhost:8000/docs

### Deploy to IceCloud

See `../ICECLOUD_DEPLOYMENT_GUIDE.md` for the full deployment walkthrough.

Quick summary:
1. `docker build -t tomato-disease-api .`
2. Push to Docker Hub or GHCR
3. Deploy on IceCloud with env vars set
4. Upload model via `POST /admin/upload-model`

## API Endpoints

### Health Check
```bash
GET /health
```

### Predict Disease
```bash
POST /predict
Content-Type: multipart/form-data

file: <image file>
```

Response:
```json
{
  "scan_id": "abc-123",
  "disease": "Early_Blight",
  "confidence_calibrated": 0.87,
  "gradcam_url": "https://...",
  "recommendations": ["..."],
  "is_reliable": true
}
```

### Model Info
```bash
GET /model/info
```

### Admin: Upload Model
```bash
POST /admin/upload-model
X-API-Key: <admin_key>
Content-Type: multipart/form-data

file: <.pth file>
```

## Environment Variables

```bash
# Required
DATABASE_URL=postgresql://...
ADMIN_API_KEY=your_secret_key

# Optional (for R2 storage)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=tomato-disease-models
```

## Model Requirements

Your `.pth` checkpoint must contain:
```python
{
  'model_state_dict': OrderedDict(...),  # Required
  'temperature': 1.5,  # Optional (calibration)
  'classes': [...],    # Optional
  'accuracy_field': 0.902  # Optional
}
```

Export your model using `../model/export_model.py`

## Architecture

```
main.py
├── models.py (Model loading, inference, GradCAM)
├── database.py (PostgreSQL connection)
└── storage.py (Cloudflare R2 client)
```

## Performance

- **Cold start**: 30s (Render free tier)
- **Inference**: ~1-2s per image
- **Memory**: ~500MB (with model loaded)

## Testing

```bash
# Test with sample image
curl -X POST http://localhost:8000/predict \
  -F "file=@test_leaf.jpg"

# Health check
curl http://localhost:8000/health
```

## Troubleshooting

**"Model not loaded"**
- Upload model via `/admin/upload-model`
- Check `MODEL_PATH` environment variable

**"Database connection failed"**
- Verify `DATABASE_URL` format
- Check PostgreSQL is running

**"R2 upload failed"**
- Falls back to local storage
- Check R2 credentials

## License

MIT
