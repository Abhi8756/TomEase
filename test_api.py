"""
Quick API test to verify the backend is running
"""

import requests
import json

BASE_URL = "http://localhost:8000"

print("="*80)
print("Testing TomEase Backend API")
print("="*80)

# Test 1: Health check
print("\n[1/3] Testing health endpoint...")
try:
    resp = requests.get(f"{BASE_URL}/health")
    if resp.status_code == 200:
        data = resp.json()
        print("[OK] Backend is healthy")
        print(f"   Model loaded: {data.get('model_loaded')}")
        print(f"   Model version: {data.get('model_version')}")
        print(f"   Database: {data.get('database')}")
    else:
        print(f"[ERROR] Health check failed: {resp.status_code}")
except Exception as e:
    print(f"[ERROR] Cannot reach backend: {e}")
    exit(1)

# Test 2: RAG Query
print("\n[2/3] Testing RAG query endpoint...")
try:
    payload = {
        "query": "What are the symptoms of Late Blight?",
        "top_k": 3,
        "context": {
            "disease": "late_blight"
        }
    }
    
    resp = requests.post(f"{BASE_URL}/rag/query", json=payload)
    
    if resp.status_code == 200:
        data = resp.json()
        print("[OK] RAG query successful")
        print(f"   Query: {data['query']}")
        print(f"   Results: {len(data['results'])}")
        if data['results']:
            print(f"   Top result: {data['results'][0].get('citation', 'N/A')}")
            print(f"   Score: {data['results'][0].get('score', 0):.3f}")
        
        if data.get('synthesis'):
            print(f"\n   LLM Synthesis:")
            synth = data['synthesis']
            if synth.get('cause'):
                print(f"   - Cause: {synth['cause'][:100]}...")
            if synth.get('prevention'):
                print(f"   - Prevention: {synth['prevention'][:100]}...")
    else:
        print(f"[ERROR] RAG query failed: {resp.status_code}")
        print(f"   {resp.text}")
        
except Exception as e:
    print(f"[ERROR] RAG query failed: {e}")

# Test 3: Model Info
print("\n[3/3] Testing model info endpoint...")
try:
    resp = requests.get(f"{BASE_URL}/model/info")
    if resp.status_code == 200:
        data = resp.json()
        print("[OK] Model info retrieved")
        print(f"   Version: {data.get('version')}")
        print(f"   Total scans: {data.get('total_scans')}")
    else:
        print(f"[WARN] Model info returned: {resp.status_code}")
except Exception as e:
    print(f"[WARN] Model info failed: {e}")

print("\n" + "="*80)
print("API Test Complete!")
print("="*80)
print("\nBackend is running at: http://localhost:8000")
print("API docs available at: http://localhost:8000/docs")
print("\nNext: Test with an image using the /predict endpoint")
print("="*80)
