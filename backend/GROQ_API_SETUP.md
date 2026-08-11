# Groq API Setup Guide

## Current Issue
Your Groq API key is returning a **403 Forbidden** error, which means the key is:
- Invalid or expired
- Revoked
- Account requires billing setup
- Account is suspended

## How to Fix

### Step 1: Get a New Groq API Key

1. Go to **[Groq Console](https://console.groq.com)**
2. Sign in or create a free account
3. Navigate to **API Keys** section
4. Click **"Create API Key"**
5. Copy the new key (starts with `gsk_`)

### Step 2: Update Your .env File

1. Open `backend/.env`
2. Replace the old key with your new key:
   ```env
   GROQ_API_KEY=gsk_YOUR_NEW_KEY_HERE
   ```
3. Save the file

### Step 3: Verify the Key Works

Run this test script:
```bash
cd backend
python test_groq_api.py
```

You should see:
```
✅ SUCCESS! Response: Hello!
✅ Groq API is working correctly!
```

### Step 4: Restart the Backend

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

## Current Fallback Behavior

**Good news:** The system is already working with a fallback heuristic method!

When Groq API fails, the system automatically uses local text extraction that:
- ✅ Extracts cause, prevention, and remedy from RAG chunks
- ✅ Separates natural vs chemical treatments
- ✅ Provides accurate information without LLM

**The fallback is working fine**, but getting a valid Groq API key will provide:
- More natural language synthesis
- Better formatting
- Context-aware summaries

---

## Groq Free Tier Limits

- **6,000 requests/day**
- **30 requests/minute**
- No credit card required
- Models: llama-3.1-70b-versatile, mixtral-8x7b, etc.

---

## Alternative: Use Without Groq

If you prefer to use the fallback permanently, you can:

1. Remove or comment out `GROQ_API_KEY` in `.env`:
   ```env
   # GROQ_API_KEY=
   ```

2. The system will use heuristic extraction (already working)

---

## Troubleshooting

### Test Failed with 401 Error
- API key format is wrong (should start with `gsk_`)
- Copy-paste error (check for extra spaces)

### Test Failed with 429 Error
- Rate limit exceeded
- Wait 1 minute and try again

### Test Failed with Connection Error
- Check internet connection
- Check firewall settings
- Verify `GROQ_API_URL=https://api.groq.com`

---

## Summary

**Current Status:** ✅ System is working with fallback extraction  
**Action Needed:** Get new API key from [console.groq.com](https://console.groq.com/keys) for enhanced LLM synthesis  
**Urgency:** Low (fallback works fine, LLM is optional enhancement)
