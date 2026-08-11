"""
End-to-end system test
Tests: Model → RAG v2 → Groq LLM → Response
"""

import sys
from pathlib import Path
import os

# Load .env file first
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

# Set up environment
os.environ.setdefault("DATABASE_URL", "")  # Optional for this test
sys.path.insert(0, str(Path(__file__).parent))

print("="*80)
print("TomEase End-to-End System Test")
print("="*80)

# Test 1: Check Groq API Key
print("\n[1/5] Checking Groq API configuration...")
groq_key = os.environ.get("GROQ_API_KEY") or os.environ.get("GSK_API_KEY")
if groq_key:
    print(f"[OK] Groq API key found: {groq_key[:20]}...")
else:
    print("[ERROR] Groq API key not found in environment")
    print("   Set GROQ_API_KEY in .env file")

# Test 2: Initialize RAG v2
print("\n[2/5] Initializing RAG v2...")
try:
    from app.rag_v2 import EnhancedRAGService
    rag = EnhancedRAGService()
    rag.build_index()
    print(f"✅ RAG v2 initialized with {len(rag.chunks)} chunks")
except Exception as e:
    print(f"❌ RAG v2 initialization failed: {e}")
    sys.exit(1)

# Test 3: Test RAG Retrieval
print("\n[3/5] Testing RAG retrieval...")
try:
    query = "What are the symptoms and prevention of Late Blight?"
    context = {
        "disease": "Late_Blight",
        "confidence": 0.91,
        "region": "India"
    }
    
    results = rag.query(query, top_k=3, context=context)
    
    if results:
        print(f"✅ Retrieved {len(results)} results")
        print(f"\nTop result:")
        print(f"  Citation: {results[0]['citation']}")
        print(f"  Score: {results[0]['score']:.3f}")
        print(f"  Text: {results[0]['text'][:150]}...")
    else:
        print("❌ No results retrieved")
        sys.exit(1)
        
except Exception as e:
    print(f"❌ RAG query failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 4: Test Groq LLM
print("\n[4/5] Testing Groq LLM synthesis...")
try:
    from app.llm_client import synthesize_structured
    
    # Prepare context from RAG results
    rag_texts = [r["text"] for r in results[:3]]
    rag_summary = "\n\n---\n\n".join(rag_texts)
    
    print(f"   Sending {len(rag_summary)} characters to Groq...")
    
    synth = synthesize_structured(rag_summary)
    
    if synth:
        print("✅ LLM synthesis successful")
        print(f"\nStructured response:")
        print(f"  Cause: {synth.get('cause', '')[:100]}...")
        print(f"  Prevention: {synth.get('prevention', '')[:100]}...")
        print(f"  Remedy (Natural): {synth.get('remedy_natural', '')[:100]}...")
        print(f"  Remedy (Chemical): {synth.get('remedy_chemical', '')[:100]}...")
        print(f"  Requires review: {synth.get('requires_human_review', False)}")
    else:
        print("⚠️  LLM returned None (using heuristic fallback)")
        
except Exception as e:
    print(f"❌ LLM synthesis failed: {e}")
    import traceback
    traceback.print_exc()

# Test 5: Full Pipeline Test
print("\n[5/5] Testing full pipeline (RAG → LLM)...")
try:
    # Simulate model prediction
    prediction = {
        "disease": "Late_Blight",
        "confidence": 0.89
    }
    
    weather = {
        "temperature": 19,
        "humidity": 88,
        "conditions": ["cool temperature", "high humidity", "rainfall"]
    }
    
    location = {
        "region": "India"
    }
    
    # Query with full context
    results = rag.query_with_model_prediction(
        query="What should I do about this disease?",
        prediction=prediction,
        weather=weather,
        location=location,
        top_k=5
    )
    
    if results:
        print(f"✅ Context-aware retrieval successful")
        print(f"   Retrieved {len(results)} contextually relevant results")
        print(f"   Top result disease match: {results[0]['diseases']}")
        
        # Synthesize
        rag_texts = [r["text"] for r in results[:3]]
        rag_summary = "\n\n---\n\n".join(rag_texts)
        synth = synthesize_structured(rag_summary)
        
        if synth and synth.get("prevention"):
            print(f"✅ End-to-end pipeline working!")
            print(f"\n📋 Final Response Preview:")
            print(f"   {synth.get('short_answer', '')[:200]}...")
        else:
            print("⚠️  Pipeline works but LLM synthesis minimal")
    
except Exception as e:
    print(f"❌ Full pipeline test failed: {e}")
    import traceback
    traceback.print_exc()

# Summary
print("\n" + "="*80)
print("Test Summary")
print("="*80)
print("✅ = Working")
print("⚠️  = Working with fallback")
print("❌ = Failed")
print("\nIf all core tests pass, your system is ready!")
print("\nNext step: Run backend server with:")
print("  cd backend")
print("  python -m uvicorn app.main:app --reload")
print("="*80)
