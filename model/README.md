# Model Export Guide

## Quick Start

1. **Adjust paths in `export_model.py`:**
   ```python
   CHECKPOINT_PATH = "path/to/your/best_model.pth"
   VALIDATION_DATA_PATH = "path/to/validation_dataset"
   ```

2. **Run export:**
   ```bash
   python export_model.py
   ```

3. **Upload to production:**
   ```bash
   # Option 1: Upload via Admin API
   curl -X POST https://your-api.onrender.com/admin/upload-model \
     -H "X-API-Key: your_admin_key" \
     -F "file=@resnet50_tomato_production.pth"
   
   # Option 2: Set as default model
   # Upload file to Render dashboard -> Environment Variables
   # Set MODEL_PATH=/app/models/resnet50_tomato_production.pth
   ```

## What Gets Exported

- **Model weights** - Your trained ResNet50
- **Temperature** - For confidence calibration (requires validation set)
- **Classes** - Disease labels
- **Metadata** - Architecture info, normalization params

## Temperature Calibration

Temperature scaling fixes overconfident predictions. Example:

**Before calibration:**
- Model says 97% confident → Actually correct only 85% of time

**After calibration:**
- Model says 85% confident → Actually correct 85% of time

This requires your validation dataset. If you skip it, the export uses a default temperature of 1.5.

## File Output

- `resnet50_tomato_production.pth` - Main model file (~98MB)
- `model_metadata.json` - Human-readable metadata

## Troubleshooting

**Error: "Can't load checkpoint"**
- Check your checkpoint format in the training notebook
- Try opening it in notebook: `torch.load("path/to/checkpoint.pth")`
- Adjust the loading code in `export_model.py` accordingly

**Error: "Validation loader not defined"**
- Uncomment and adjust the validation loader code
- Copy data loading code from your training notebook

## Production Requirements

The exported model expects:
- RGB images (any size, will be resized to 224x224)
- Normalization: ImageNet mean/std
- PyTorch >= 2.0
- CUDA optional (runs on CPU)
