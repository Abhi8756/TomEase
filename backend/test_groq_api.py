"""
Test script to validate Groq API key and connection
Run this to diagnose Groq API issues
"""

import os
import json
import urllib.request
import urllib.error
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_API_URL = os.getenv("GROQ_API_URL", "https://api.groq.com")

def test_groq_api():
    """Test Groq API connection with a simple request"""
    
    print("=" * 60)
    print("🔍 GROQ API DIAGNOSTICS")
    print("=" * 60)
    
    # Check API key
    if not GROQ_API_KEY:
        print("❌ GROQ_API_KEY not found in environment")
        print("💡 Set it in backend/.env file")
        return False
    
    print(f"✓ API Key found: {GROQ_API_KEY[:20]}...{GROQ_API_KEY[-8:]}")
    print(f"✓ API URL: {GROQ_API_URL}")
    
    # Test API connection
    api_endpoint = f"{GROQ_API_URL}/openai/v1/chat/completions"
    print(f"\n📡 Testing endpoint: {api_endpoint}")
    
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    }
    
    payload = {
        "model": "llama-3.3-70b-versatile",  # Updated to current Groq model
        "messages": [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Say 'Hello!' in one word."}
        ],
        "max_tokens": 10,
        "temperature": 0.3
    }
    
    try:
        req = urllib.request.Request(
            api_endpoint,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST"
        )
        
        print("\n⏳ Sending test request...")
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode("utf-8")
            data = json.loads(body)
            
            if "choices" in data and len(data["choices"]) > 0:
                content = data["choices"][0]["message"]["content"]
                print(f"✅ SUCCESS! Response: {content}")
                print(f"✅ Model used: {data.get('model', 'unknown')}")
                print(f"✅ Tokens used: {data.get('usage', {}).get('total_tokens', 'unknown')}")
                return True
            else:
                print(f"⚠️  Unexpected response format: {data}")
                return False
                
    except urllib.error.HTTPError as he:
        print(f"\n❌ HTTP Error {he.code}")
        try:
            body = he.read().decode("utf-8")
            error_data = json.loads(body) if body else {}
            error_msg = error_data.get("error", {}).get("message", "Unknown error")
            error_code = error_data.get("error", {}).get("code", "unknown")
            
            print(f"   Message: {error_msg}")
            print(f"   Code: {error_code}")
            print(f"   Raw response: {body}")
            
            if he.code == 403:
                print("\n💡 SOLUTIONS:")
                print("   1. Get a new API key from: https://console.groq.com/keys")
                print("   2. Check if your account requires billing setup")
                print("   3. Verify account is active and not suspended")
                print("   4. Check for IP/region restrictions")
            elif he.code == 401:
                print("\n💡 SOLUTION: API key format is invalid or expired")
                print("   Get a new key from: https://console.groq.com/keys")
            elif he.code == 429:
                print("\n💡 SOLUTION: Rate limit exceeded")
                print("   Wait a few minutes or upgrade your plan")
                
        except Exception as e:
            print(f"   Could not parse error: {e}")
        
        return False
        
    except Exception as e:
        print(f"\n❌ Connection Error: {e}")
        print("\n💡 SOLUTIONS:")
        print("   1. Check internet connection")
        print("   2. Verify GROQ_API_URL is correct")
        print("   3. Check firewall settings")
        return False

if __name__ == "__main__":
    success = test_groq_api()
    print("\n" + "=" * 60)
    if success:
        print("✅ Groq API is working correctly!")
    else:
        print("❌ Groq API test failed - using fallback in main app")
        print("   The system will use heuristic text extraction instead")
    print("=" * 60)
