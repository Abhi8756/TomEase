"""
Debug script to test the predict endpoint without image upload
"""
import json
from app.rag_v2 import EnhancedRAGService
from app.llm_client import synthesize_structured

# Test RAG retrieval
print("[DEBUG] Initializing RAG...")
try:
    rag_service = EnhancedRAGService()
    print("[OK] RAG initialized")
    
    # Need to load the index
    print("[DEBUG] Loading RAG index...")
    rag_service.load()
    print("[OK] RAG index loaded")
except Exception as e:
    print(f"[ERROR] RAG init failed: {e}")
    import traceback
    traceback.print_exc()
    exit(1)

# Test RAG query
print("\n[DEBUG] Testing RAG query...")
try:
    rag_results = rag_service.query_with_model_prediction(
        query="What are the symptoms, causes, and management of TYLCV?",
        prediction={"disease": "TYLCV", "confidence": 0.99},
        location=None,
        top_k=5
    )
    print(f"[OK] RAG returned {len(rag_results)} results")
    
    # Check first result structure
    if rag_results:
        r = rag_results[0]
        print(f"[DEBUG] First result keys: {list(r.keys())}")
        print(f"[DEBUG] First result: {json.dumps({k: str(v)[:100] for k, v in r.items()}, indent=2)}")
except Exception as e:
    print(f"[ERROR] RAG query failed: {e}")
    import traceback
    traceback.print_exc()
    exit(1)

# Test LLM synthesis
print("\n[DEBUG] Testing LLM synthesis...")
try:
    structured_sources = []
    for i, r in enumerate(rag_results[:5], 1):
        src_id = f"S{i}"
        structured_sources.append({
            "id": src_id,
            "text": r.get("text", ""),
            "citation": r.get("citation", f"Source {i}"),
            "page": r.get("page", "N/A"),
            "authority": r.get("authority", "Unknown"),
            "topic": r.get("topic", "Disease Management")
        })
    
    print(f"[DEBUG] Calling synthesize_structured with {len(structured_sources)} sources...")
    synth = synthesize_structured("", structured_sources=structured_sources)
    print(f"[OK] Synthesis returned: {json.dumps({k: str(v)[:50] for k, v in synth.items()}, indent=2)}")
    
except Exception as e:
    print(f"[ERROR] LLM synthesis failed: {e}")
    import traceback
    traceback.print_exc()
    exit(1)

print("\n[OK] All tests passed!")
