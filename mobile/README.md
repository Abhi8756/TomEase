# Tomato Disease Detection - Mobile App

React Native mobile app for scanning tomato leaves and detecting diseases.

## Features

- 📸 **Camera Integration** - Take photos or upload from gallery
- 🔍 **Real-time Detection** - Get results in <2 seconds
- 🎨 **GradCAM Heatmap** - See exactly where disease is detected
- 💊 **Treatment Recommendations** - Actionable advice for farmers
- 📊 **Scan History** - Track past diagnoses
- 💾 **Offline-First** - Local SQLite storage + cloud sync

## Quick Start

```bash
# Install dependencies
npm install

# Configure API
# Edit src/services/api.ts
# Set API_URL to your backend URL

# Run on Android
npm run android

# Run on iOS
npm run ios
```

## Screens

### 1. Camera Screen
- Take photos or select from gallery
- Live camera preview with guide overlay
- Access scan history

### 2. Result Screen
- Disease diagnosis with confidence
- GradCAM heatmap visualization
- Treatment recommendations
- Scan again or view history

### 3. History Screen
- Past scan results
- Disease statistics
- Delete scans

## Technology Stack

- **Framework**: React Native + Expo
- **Navigation**: React Navigation
- **Database**: Expo SQLite
- **HTTP Client**: Axios
- **Camera**: Expo Camera

## Configuration

Edit `src/services/api.ts`:
```typescript
const API_URL = 'https://your-backend.onrender.com';
```

## Building for Production

### Android APK
```bash
expo build:android -t apk
```

### iOS (requires Apple Developer account)
```bash
expo build:ios
```

### Using EAS Build (recommended)
```bash
eas build --platform android --profile preview
```

## Permissions Required

- **Camera**: Take photos of leaves
- **Photo Library**: Select existing images
- **Network**: Connect to backend API

## Offline Mode

App works offline with limited functionality:
- ❌ Cannot detect new diseases (requires API)
- ✅ Can view scan history
- ✅ Can view past recommendations

## Database Schema

```sql
CREATE TABLE scans (
  id INTEGER PRIMARY KEY,
  scan_id TEXT UNIQUE,
  disease TEXT,
  confidence REAL,
  gradcam_url TEXT,
  timestamp TEXT,
  image_uri TEXT
);
```

## Troubleshooting

**"Network error"**
- Check API_URL is correct
- Verify backend is running
- Backend may be sleeping (Render free tier)

**"Camera not working"**
- Check permissions in phone settings
- Restart app
- Try selecting from gallery instead

**"Failed to load image"**
- GradCAM URL may have expired
- Check internet connection
- R2 bucket may not be configured

## Development

```bash
# Start Expo dev server
npm start

# Run on physical device
# Scan QR code with Expo Go app

# Run on emulator
npm run android  # Android Studio emulator
npm run ios      # Xcode simulator
```

## Future Features

- [ ] Multi-crop support (potato, pepper, etc.)
- [ ] Disease progression tracking (re-scan same plant)
- [ ] Export scan history as PDF
- [ ] Share results with agricultural experts
- [ ] Push notifications for treatment reminders
- [ ] Offline model (TFLite)

## License

MIT
