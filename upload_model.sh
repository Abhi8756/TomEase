#!/bin/bash
# Quick script to upload your model to the backend

# Your configuration
API_URL="https://tomato-api-xlik.onrender.com"
ADMIN_KEY="55994692270115581428323994038566"
MODEL_FILE="CBAM_False_SUPCON_False_FISHR_False_DVD_False_best_test.pth"

echo "🚀 Uploading model to backend..."
echo "   URL: $API_URL"
echo "   File: $MODEL_FILE"
echo ""

# Upload model
curl -X POST "$API_URL/admin/upload-model" \
  -H "X-API-Key: $ADMIN_KEY" \
  -F "file=@$MODEL_FILE" \
  --progress-bar

echo ""
echo "✅ Upload complete!"
echo ""
echo "Verify with:"
echo "curl $API_URL/model/info"
