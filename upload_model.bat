@echo off
REM Quick script to upload your model to the backend

SET API_URL=https://tomato-api-xlik.onrender.com
SET ADMIN_KEY=55994692270115581428323994038566
SET MODEL_FILE=CBAM_False_SUPCON_False_FISHR_False_DVD_False_best_test.pth

echo.
echo 🚀 Uploading model to backend...
echo    URL: %API_URL%
echo    File: %MODEL_FILE%
echo.

curl -X POST "%API_URL%/admin/upload-model" -H "X-API-Key: %ADMIN_KEY%" -F "file=@%MODEL_FILE%"

echo.
echo ✅ Upload complete!
echo.
echo Verify with:
echo curl %API_URL%/model/info
echo.
pause
