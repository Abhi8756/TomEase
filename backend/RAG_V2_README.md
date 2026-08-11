# Enhanced RAG System v2 - Production-Grade Agricultural Knowledge Retrieval

## Overview

The Enhanced RAG (Retrieval-Augmented Generation) System v2 is a complete rewrite of the TomEase knowledge retrieval system, designed for production deployment with agricultural disease diagnosis and management.

## Key Features

### 🎯 Core Capabilities
- **Disease-Aware Retrieval**: Built-in ontology for 5 tomato diseases with pathogen types and environmental conditions
- **Semantic Chunking**: Section-aware document processing that preserves structure
- **Hybrid Reranking**: Multi-factor scoring combining semantic similarity, metadata, and lexical matching
- **Neural Reranking**: Cross-encoder for final top-k selection
- **Citation Support**: Full source attribution with page numbers, sections, and authority
- **Weather Integration**: Environmental condition matching for context-aware retrieval
- **Confidence-Aware**: Adapts retrieval strategy based on model prediction confidence

### 📊 Metadata System
Automatic extraction + manual override:
- Diseases
- Disease types (fungal, oomycete, viral)
- Region (India, US, etc.)
- Topic (prevention, treatment, diagnosis, etc.)
- Authority (ICAR, TNAU, universities)
- Source type (government, research, extension)
- Environmental conditions
- Year, page, section, URL

### 🔍 Retrieval Pipeline

```
Query + Context
      ↓
Dense Retrieval (FAISS)
   Top-30 candidates
      ↓
Metadata Filtering & Hybrid Reranking
   - Disease matching: +0.3
   - Region matching: +0.15
   - Topic matching: +0.2
   - Weather/environment: +0.1 per match
   - Lexical overlap: up to +0.25
   - Authority boost: +0.05-0.1
      ↓
Cross-Encoder Reranking
   Neural relevance scoring
      ↓
Top-5 Results with Citations
```

## Installation

### Dependencies

```bash
pip install sentence-transformers>=2.0.0
pip install faiss-cpu>=1.7.0  # or faiss-gpu for GPU support
pip install PyMuPDF>=1.23.0
pip install numpy
```

Already in requirements.txt:
```txt
sentence-transformers>=2.0.0
faiss-cpu>=1.7.0
PyMuPDF>=1.23.0
```

### Optional (for advanced features)
```bash
pip install annoy  # Alternative index backend
```

## Quick Start

### 1. Basic Usage

```python
from app.rag_v2 import EnhancedRAGService

# Initialize and build index
rag = EnhancedRAGService()
rag.build_index()

# Simple query
results = rag.query("How to prevent Late Blight?", top_k=5)

for result in results:
    print(f"Score: {result['score']:.3f}")
    print(f"Citation: {result['citation']}")
    print(f"Text: {result['text'][:200]}...")
    print()
```

### 2. Context-Aware Query

```python
# Query with disease and regional context
context = {
    "disease": "Late_Blight",
    "region": "India",
    "topic": "prevention",
    "weather": {
        "conditions": ["high humidity", "rainfall"]
    }
}

results = rag.query(
    query="How can I prevent this disease?",
    top_k=5,
    context=context
)
```

### 3. Integration with Disease Classifier

```python
# Model prediction output
prediction = {
    "disease": "Late_Blight",
    "confidence": 0.91
}

weather = {
    "temperature": 19,
    "humidity": 88,
    "rainfall_24h": 14,
    "conditions": ["high humidity", "cool temperature", "rainfall"]
}

location = {
    "region": "India",
    "state": "Maharashtra"
}

results = rag.query_with_model_prediction(
    query="What should I do about this disease?",
    prediction=prediction,
    weather=weather,
    location=location,
    top_k=5
)
```

## Document Corpus Structure

Recommended organization:

```
backend/storage/docs/tomato_rag/
├── diseases/
│   ├── early_blight/
│   │   ├── early_blight_ncstate.pdf
│   │   ├── early_blight_ncstate.meta.json
│   │   └── ...
│   ├── late_blight/
│   ├── septoria/
│   ├── leaf_mold/
│   └── tylcv/
├── differential_diagnosis/
│   ├── early_blight_vs_septoria/
│   └── ...
├── prevention/
├── treatment/
└── epidemiology/
```

## Metadata Files

### Automatic Generation

The system automatically infers metadata from:
- File paths
- File names
- Document structure

### Manual Enhancement

Create `.meta.json` sidecar files for important documents:

`late_blight_tnau.meta.json`:
```json
{
  "diseases": ["Late_Blight"],
  "disease_type": "oomycete",
  "crop": "tomato",
  "region": "India",
  "topic": "management",
  "subtopic": "cultural_practices",
  "environment": ["high humidity", "cool temperature", "rainfall"],
  "source_type": "government",
  "authority": "TNAU",
  "year": 2024,
  "document_title": "Late Blight Management Guidelines",
  "url": "https://..."
}
```

### Batch Metadata Generation

```bash
# Interactive mode
python scripts/generate_metadata.py --batch backend/storage/docs/tomato_rag/diseases/late_blight

# Auto-generate (no prompts)
python scripts/generate_metadata.py --batch --auto backend/storage/docs/tomato_rag
```

## Disease Ontology

Built-in knowledge for 5 diseases:

```python
DISEASE_ONTOLOGY = {
    "Early_Blight": {
        "pathogen": "Alternaria solani",
        "type": "fungal",
        "synonyms": ["early blight", "target spot", "alternaria"],
        "environment": ["warm temperature", "high humidity", "leaf wetness"],
        "differential": ["Septoria", "Late_Blight"]
    },
    "Late_Blight": {
        "pathogen": "Phytophthora infestans",
        "type": "oomycete",
        # ...
    },
    # ... and 3 more
}
```

## Evaluation

### Run Evaluation

```bash
# Use sample test set
python scripts/rag_evaluation.py

# Use custom test file
python scripts/rag_evaluation.py --test-file tests/rag_test_queries.json --output results.json
```

### Test Query Format

```json
[
  {
    "query": "What are the symptoms of Early Blight?",
    "relevant_docs": [
      "backend/storage/docs/tomato_rag/diseases/early_blight/early_blight_ncstate.pdf",
      "backend/storage/docs/tomato_rag/diseases/early_blight/tnau_eb.pdf"
    ],
    "context": {
      "disease": "Early_Blight",
      "topic": "symptoms"
    }
  }
]
```

### Metrics

- **Recall@k**: Proportion of relevant documents retrieved in top k
- **Precision@k**: Proportion of retrieved documents that are relevant
- **MRR**: Mean Reciprocal Rank (position of first relevant document)
- **nDCG@k**: Normalized Discounted Cumulative Gain

## API Integration

### FastAPI Endpoint Example

```python
from fastapi import APIRouter
from app.rag_v2 import get_rag_service

router = APIRouter()
rag = get_rag_service()

@router.post("/rag/query")
async def query_rag(
    query: str,
    disease: Optional[str] = None,
    region: Optional[str] = None,
    top_k: int = 5
):
    context = {}
    if disease:
        context["disease"] = disease
    if region:
        context["region"] = region
    
    results = rag.query(query, top_k=top_k, context=context)
    
    return {
        "query": query,
        "results": results,
        "count": len(results)
    }
```

## Performance

### Benchmarks (on 60-70 documents)

| Metric | Value |
|--------|-------|
| Index build time | ~30-60s |
| Query latency | ~200-400ms |
| Memory usage | ~500MB |
| Retrieval candidates | 30 |
| Final results | 5 |

### Optimization Tips

1. **Use GPU FAISS**: Install `faiss-gpu` for faster index search
2. **Reduce reranking**: Set `use_reranker=False` for faster queries (lower quality)
3. **Cache embeddings**: Pre-compute and save embeddings
4. **Batch queries**: Process multiple queries together

## Advanced Features

### Custom Embedding Models

```python
# Use a different embedding model
rag = EnhancedRAGService(
    embedding_model="sentence-transformers/all-mpnet-base-v2"
)
```

### Disable Reranking

```python
# Faster but lower quality
rag = EnhancedRAGService(use_reranker=False)
```

### Force Index Rebuild

```python
rag.build_index(force=True)
```

## Comparison: v1 vs v2

| Feature | v1 | v2 |
|---------|----|----|
| Chunking | Fixed 300 words | Semantic/section-aware |
| Metadata | Manual only | Auto + manual |
| Retrieval | Top-5 direct | Top-30 → rerank → top-5 |
| Reranking | Basic keyword boost | Hybrid + cross-encoder |
| Citations | File path only | Full (page, section, authority) |
| Disease awareness | Simple keywords | Structured ontology |
| Weather integration | None | ✓ |
| Model integration | None | ✓ |
| Evaluation | None | Full framework |

## Troubleshooting

### "No documents found"
- Check `corpus_path` exists
- Verify PDF files are in the directory
- Check file permissions

### "Index not initialized"
- Run `rag.build_index()` before querying
- Check if FAISS is installed

### "Reranker loading failed"
- Cross-encoder requires internet for first download
- Set `use_reranker=False` to disable

### Low retrieval quality
1. Add metadata files to important documents
2. Increase `retrieval_k` from 30 to 50
3. Benchmark different embedding models
4. Create evaluation dataset to measure improvements

## Next Steps

### Phase 8: LLM Answer Generation
Integrate with `llm_client.py` to generate structured answers from retrieved evidence.

### Phase 9: Enhanced Safety Layer
Expand safety checks with region-specific pesticide regulations.

### Phase 10: Full Evaluation
Build 100-200 query test set with expert-labeled relevance.

## Contributing

When adding new features:
1. Maintain backward compatibility with v1
2. Add tests to `rag_evaluation.py`
3. Update this README
4. Add inline documentation

## License

Part of the TomEase project.
