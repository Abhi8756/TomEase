# ✅ RAG v2 Implementation Checklist

## Quick Verification (Do This First)

```bash
cd "c:\Abhijit Data\TomEase\backend"
```

### ☐ Step 1: Install Dependencies (30 seconds)
```bash
pip install faiss-cpu
```

**Expected:** Successfully installed faiss-cpu

### ☐ Step 2: Run Quick Test (2 minutes)
```bash
python -m app.rag_v2
```

**Expected:** 
- ✅ "FAISS index built with XXX vectors"
- ✅ Query results with citations
- ✅ No errors

### ☐ Step 3: Run Full Test Suite (5 minutes)
```bash
python scripts\test_rag_v2.py
```

**Expected:**
- ✅ Test 1: Basic Query - PASS
- ✅ Test 2: Context-Aware Query - PASS
- ✅ Test 3: Weather-Aware Query - PASS
- ✅ Test 4: Model Prediction Integration - PASS
- ✅ Test 5: Low Confidence Differential - PASS
- ✅ Test 6: Differential Diagnosis - PASS
- ✅ Passed: 6/6

**If all 3 steps pass, your system is working! ✅**

---

## Files Created - Verification

### Core Implementation
- ☐ `backend/app/rag_v2.py` (850 lines) - **Main RAG system**
- ☐ `backend/app/rag_integration_example.py` (180 lines) - **API examples**

### Tools & Scripts
- ☐ `backend/scripts/generate_metadata.py` (150 lines) - **Metadata tool**
- ☐ `backend/scripts/rag_evaluation.py` (200 lines) - **Evaluation framework**
- ☐ `backend/scripts/test_rag_v2.py` (250 lines) - **Test suite**
- ☐ `backend/scripts/compare_v1_v2.py` (200 lines) - **Comparison tool**

### Documentation
- ☐ `backend/RAG_V2_README.md` - **Comprehensive guide**
- ☐ `backend/RAG_V2_MIGRATION.md` - **v1 → v2 migration**
- ☐ `backend/RAG_V2_ARCHITECTURE.md` - **Architecture diagrams**
- ☐ `backend/RAG_V2_IMPLEMENTATION_SUMMARY.md` - **Detailed summary**
- ☐ `backend/QUICKSTART_RAG_V2.md` - **Quick start**
- ☐ `backend/GET_STARTED_NOW.md` - **Action items**
- ☐ `backend/CHECKLIST.md` - **This file**
- ☐ `IMPLEMENTATION_COMPLETE.md` - **Executive summary**

### Modified Files
- ☐ `backend/requirements.txt` - **Added faiss-cpu**

---

## Feature Verification

### ☐ 1. Basic Retrieval Works
**Test:**
```python
from app.rag_v2 import get_rag_service
rag = get_rag_service()
results = rag.query("What are symptoms of Late Blight?", top_k=3)
print(len(results))  # Should be 3
```

**Expected:** Returns 3 results

### ☐ 2. Citations Are Present
**Check:** Results should include:
```python
result['citation']  # e.g., "TNAU, Late Blight Management, p. 3"
result['page']      # e.g., 3
result['authority'] # e.g., "TNAU"
```

**Expected:** All fields present (not None)

### ☐ 3. Metadata Extraction Works
**Test:**
```python
# Any result should have diseases
result['diseases']  # e.g., ["Late_Blight"]
```

**Expected:** At least one disease per result

### ☐ 4. Context-Aware Retrieval
**Test:**
```python
context = {"disease": "Late_Blight", "region": "India"}
results = rag.query("Prevention?", top_k=3, context=context)
# Check if results match context
print(results[0]['diseases'])  # Should include Late_Blight
print(results[0]['region'])    # Should be India or None
```

**Expected:** Context influences results

### ☐ 5. Weather Integration
**Test:**
```python
context = {"weather": {"conditions": ["high humidity"]}}
results = rag.query("Disease management", top_k=3, context=context)
```

**Expected:** Returns humidity-related disease docs (Leaf Mold, Late Blight)

### ☐ 6. Model Prediction Integration
**Test:**
```python
results = rag.query_with_model_prediction(
    query="What should I do?",
    prediction={"disease": "Late_Blight", "confidence": 0.91},
    top_k=3
)
```

**Expected:** Returns Late Blight-specific advice

### ☐ 7. Low Confidence → Differential Mode
**Test:**
```python
results = rag.query_with_model_prediction(
    query="Identify disease",
    prediction={"disease": "Early_Blight", "confidence": 0.52},  # Low!
    top_k=3
)
# Should retrieve differential diagnosis docs
```

**Expected:** System prioritizes comparison documents

### ☐ 8. Evaluation Framework Works
**Test:**
```bash
python scripts\rag_evaluation.py
```

**Expected:**
- Recall@5 > 0.80
- MRR > 0.80
- No errors

---

## Optional Enhancements

### ☐ Generate Metadata for Important Documents
```bash
# Interactive for one file
python scripts\generate_metadata.py "backend\storage\docs\tomato_rag\diseases\late_blight\tnau lb.pdf"

# Batch auto-generate
python scripts\generate_metadata.py --batch --auto backend\storage\docs\tomato_rag\diseases
```

**Expected:** Creates `.meta.json` files

### ☐ Compare v1 vs v2
```bash
python scripts\compare_v1_v2.py
```

**Expected:** Side-by-side comparison showing v2 improvements

### ☐ Benchmark Embedding Models
```python
# Try different models
rag_mini = EnhancedRAGService(embedding_model="all-MiniLM-L6-v2")
rag_mpnet = EnhancedRAGService(embedding_model="all-mpnet-base-v2")

# Run evaluation on both
# Compare Recall@5
```

---

## Integration Checklist

### Option A: Keep v1 and v2 Separate
- ☐ Import both: `from app.rag import RAGService as RAGv1`
- ☐ Import v2: `from app.rag_v2 import EnhancedRAGService as RAGv2`
- ☐ Use v2 for new endpoints
- ☐ Keep v1 for existing endpoints
- ☐ **Status:** Safe, no breaking changes

### Option B: Replace v1 with v2
- ☐ In `main.py`, change import
- ☐ From: `from app.rag import RAGService`
- ☐ To: `from app.rag_v2 import get_rag_service`
- ☐ Update initialization: `rag = get_rag_service()`
- ☐ Test all existing endpoints
- ☐ **Status:** Best quality, may need testing

### Option C: A/B Test
- ☐ Run both systems
- ☐ Compare metrics on same queries
- ☐ Measure: Recall, Precision, user satisfaction
- ☐ Switch when confident
- ☐ **Status:** Data-driven decision

---

## Performance Checklist

### ☐ Query Latency
**Test:**
```python
import time
start = time.time()
results = rag.query("test query", top_k=5)
latency = (time.time() - start) * 1000
print(f"Latency: {latency:.0f}ms")
```

**Expected:**
- First query: 500-1000ms (model loading)
- Subsequent queries: 200-400ms

### ☐ Memory Usage
**Check:** Task Manager or:
```python
import psutil
process = psutil.Process()
memory_mb = process.memory_info().rss / 1024 / 1024
print(f"Memory: {memory_mb:.0f}MB")
```

**Expected:** ~500MB for RAG service

### ☐ Index Build Time
**Test:**
```python
import time
start = time.time()
rag.build_index(force=True)
build_time = time.time() - start
print(f"Build time: {build_time:.0f}s")
```

**Expected:** 30-60 seconds

---

## Documentation Checklist

### ☐ Read Documentation (in order)
1. ☐ `GET_STARTED_NOW.md` - **Start here!**
2. ☐ `QUICKSTART_RAG_V2.md` - **Quick start**
3. ☐ `RAG_V2_README.md` - **Full usage**
4. ☐ `RAG_V2_ARCHITECTURE.md` - **Architecture**
5. ☐ `RAG_V2_MIGRATION.md` - **Migration**
6. ☐ `RAG_V2_IMPLEMENTATION_SUMMARY.md` - **Summary**
7. ☐ `IMPLEMENTATION_COMPLETE.md` - **Overview**

### ☐ Understand Key Concepts
- ☐ Disease ontology structure
- ☐ Hybrid reranking algorithm
- ☐ Confidence-aware retrieval
- ☐ Metadata extraction (auto + manual)
- ☐ Weather integration
- ☐ Citation format

---

## Next Phase Checklist (Future Work)

### Phase 8: LLM Integration
- ☐ Connect RAG v2 with `llm_client.py`
- ☐ Generate structured answers from evidence
- ☐ Include proper citations in responses
- ☐ Add safety disclaimers

### Phase 9: Enhanced Safety
- ☐ Region-specific pesticide rules
- ☐ Source-aware chemical recommendations
- ☐ Regulatory compliance checks

### Phase 10: Full Evaluation
- ☐ Build 100-200 query test set
- ☐ Expert labeling for relevance
- ☐ Establish baseline metrics
- ☐ Continuous evaluation pipeline

---

## Troubleshooting Checklist

### ☐ Issue: "ModuleNotFoundError: No module named 'faiss'"
**Solution:**
```bash
pip install faiss-cpu
```

### ☐ Issue: "No documents found"
**Check:**
1. Documents exist in `backend/storage/docs/tomato_rag/`
2. File permissions are correct
3. Correct corpus path in code

### ☐ Issue: "Index not initialized"
**Solution:**
```python
rag.build_index()  # Build before querying
```

### ☐ Issue: "Cross-encoder loading failed"
**Solutions:**
1. Check internet connection (first download)
2. Or disable: `rag = EnhancedRAGService(use_reranker=False)`

### ☐ Issue: Query is very slow
**Check:**
1. First query? (Model loading is slow)
2. Subsequent queries should be 200-400ms
3. Disable reranker for speed (lower quality)

### ☐ Issue: Low retrieval quality
**Solutions:**
1. Generate metadata for important docs
2. Increase retrieval_k from 30 to 50
3. Try different embedding model
4. Build evaluation dataset to measure

---

## Success Criteria

### Your system is working properly when:
- ✅ All 6 tests pass in `test_rag_v2.py`
- ✅ Results include full citations
- ✅ Metadata (diseases, region, topic) present
- ✅ Context influences retrieval
- ✅ Weather-aware queries work
- ✅ Low confidence triggers differential mode
- ✅ Query latency < 500ms (after first query)
- ✅ Evaluation shows Recall@5 > 0.85

### Your system is production-ready when:
- ✅ All above success criteria met
- ✅ Metadata generated for key documents
- ✅ Evaluation dataset created
- ✅ Metrics measured and acceptable
- ✅ Integrated with API
- ✅ Safety checks validated
- ✅ Citations formatted correctly
- ✅ User acceptance testing completed

---

## Final Action Items

### TODAY:
1. ☐ Run: `pip install faiss-cpu`
2. ☐ Run: `python -m app.rag_v2`
3. ☐ Run: `python scripts\test_rag_v2.py`
4. ☐ Verify all tests pass ✅

### THIS WEEK:
1. ☐ Read `GET_STARTED_NOW.md`
2. ☐ Run `python scripts\compare_v1_v2.py`
3. ☐ Generate metadata for 10 important docs
4. ☐ Run evaluation: `python scripts\rag_evaluation.py`

### NEXT WEEK:
1. ☐ Choose integration option (A, B, or C)
2. ☐ Integrate with one API endpoint
3. ☐ Test end-to-end flow
4. ☐ Measure improvements

---

## Questions to Answer

Before deployment, answer these:

- ☐ Which option: Keep both, Replace, or A/B test?
- ☐ Is query latency acceptable? (200-400ms)
- ☐ Is memory usage acceptable? (~500MB)
- ☐ Are citations formatted correctly?
- ☐ Does metadata extraction work well?
- ☐ Should I generate metadata for all docs?
- ☐ Do I need to benchmark embedding models?
- ☐ Should I build an evaluation dataset now?
- ☐ Am I ready for Phase 8 (LLM integration)?

---

**START HERE:** Run the 3 quick verification steps at the top ↑

**Then read:** `GET_STARTED_NOW.md`

**Status: ✅ READY TO TEST**
