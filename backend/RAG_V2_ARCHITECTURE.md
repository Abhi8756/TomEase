# RAG v2 Architecture Documentation

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TomEase RAG v2 System                       │
│                  Production-Grade Agricultural Knowledge            │
└─────────────────────────────────────────────────────────────────────┘

                                INPUT
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
              User Query    Model Prediction  Weather/Location
              "Symptoms?"   Disease: 0.91      Humidity: 88%
                            confidence          Region: India
                    │             │             │
                    └─────────────┼─────────────┘
                                  │
                            Query Builder
                    (Contextual Enhancement)
                                  │
                        ┌─────────┴──────────┐
                        │                    │
                  Dense Retrieval      Query Understanding
                  (FAISS top-30)       - Confidence level
                                       - Weather conditions
                        │              - Regional context
                        │                    │
                        └─────────┬──────────┘
                                  │
                          Candidate Pool
                           (30 results)
                                  │
                        ┌─────────┴──────────┐
                        │                    │
                 Hybrid Reranking     Metadata Filtering
                 - Disease: +0.3      - Region match
                 - Region: +0.15      - Topic alignment
                 - Topic: +0.2        - Environment fit
                 - Weather: +0.1      - Authority rank
                 - Lexical: +0.25
                        │                    │
                        └─────────┬──────────┘
                                  │
                          Reranked Pool
                          (scored & sorted)
                                  │
                      Cross-Encoder Reranking
                      (Neural relevance model)
                                  │
                            Top-5 Results
                      (with full citations)
                                  │
                        ┌─────────┴──────────┐
                        │                    │
                  Safety Checks       Citation Formatting
                  - Dosage flags      - Authority
                  - Chemicals         - Page numbers
                  - Region rules      - Sections
                        │                    │
                        └─────────┬──────────┘
                                  │
                               OUTPUT
                          (Structured Results)
```

## Document Processing Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Document Ingestion                             │
└─────────────────────────────────────────────────────────────────────┘

    Raw Documents                    Processing
    ─────────────                    ──────────

    📄 PDF                          PyMuPDF Extraction
    📄 TXT            ────────►     - Page-level text
    📄 MD                           - Section detection
    📄 HTML                         - Metadata capture
         │
         │                          Metadata Inference
         ├────────────────────►     ────────────────────
         │                          Path analysis:
         │                          "diseases/late_blight/tnau.pdf"
         │                              ↓
         │                          - disease: Late_Blight
         │                          - authority: TNAU
         │                          - region: India
         │
         │                          Manual Override
         └────────────────────►     ───────────────
                                    .meta.json sidecar
                                    {
                                      "diseases": [...],
                                      "region": "...",
                                      "authority": "...",
                                      "year": 2024
                                    }
                                         │
                                         ▼
                                  Merged Metadata
                                  ──────────────
                                  (manual > auto)
                                         │
                                         ▼
                               Semantic Chunking
                               ─────────────────
                               - Section-aware
                               - Context preserved
                               - ~300 words/chunk
                               - 50-word overlap
                                         │
                                         ▼
                                 Embedding Generation
                                 ───────────────────
                                 SentenceTransformer
                                 all-MiniLM-L6-v2
                                 384-dim vectors
                                         │
                                         ▼
                                  FAISS Index
                                  ───────────
                                  IndexFlatIP
                                  Cosine similarity
                                         │
                                         ▼
                                  Vector Store
                                  ────────────
                                  storage/vector_index_v2/
                                  - faiss_v2.index
                                  - metadata_v2.jsonl
```

## Metadata Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Document Metadata Schema                        │
└─────────────────────────────────────────────────────────────────────┘

DocumentMetadata {
    ┌─── Identification ────────────────────┐
    │ source_file: str                      │  "docs/.../tnau_lb.pdf"
    │ document_title: str (optional)        │  "Late Blight Management"
    │ url: str (optional)                   │  "https://..."
    │ page: int (optional)                  │  3
    │ section: str (optional)               │  "Prevention Measures"
    └───────────────────────────────────────┘

    ┌─── Disease Knowledge ─────────────────┐
    │ diseases: List[str]                   │  ["Late_Blight"]
    │ disease_type: str (optional)          │  "oomycete" | "fungal" | "viral"
    │ crop: str                             │  "tomato"
    └───────────────────────────────────────┘

    ┌─── Context & Relevance ───────────────┐
    │ topic: str (optional)                 │  "prevention", "symptoms", etc.
    │ subtopic: str (optional)              │  "cultural_practices"
    │ region: str (optional)                │  "India", "US", "Global"
    │ environment: List[str]                │  ["high humidity", "rainfall"]
    └───────────────────────────────────────┘

    ┌─── Authority & Trust ─────────────────┐
    │ source_type: str (optional)           │  "government", "university"
    │ authority: str (optional)             │  "ICAR", "TNAU", "Cornell"
    │ year: int (optional)                  │  2024
    └───────────────────────────────────────┘
}
```

## Disease Ontology

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Disease Knowledge Base                        │
└─────────────────────────────────────────────────────────────────────┘

DISEASE_ONTOLOGY = {

    "Early_Blight": {
        pathogen: "Alternaria solani"
        type: "fungal"
        synonyms: ["early blight", "target spot", "alternaria"]
        environment: [
            "warm temperature" (24-29°C)
            "high humidity" (>80%)
            "leaf wetness"
        ]
        differential: ["Septoria", "Late_Blight"]
    }

    "Late_Blight": {
        pathogen: "Phytophthora infestans"
        type: "oomycete"  ← Important distinction!
        synonyms: ["late blight", "phytophthora"]
        environment: [
            "cool temperature" (15-21°C)
            "high humidity" (>90%)
            "rainfall"
        ]
        differential: ["Early_Blight"]
    }

    "Septoria": {
        pathogen: "Septoria lycopersici"
        type: "fungal"
        synonyms: ["septoria leaf spot"]
        environment: [
            "warm temperature"
            "high humidity"
            "rainfall"
        ]
        differential: ["Early_Blight", "bacterial_spot"]
    }

    "Leaf_Mold": {
        pathogen: "Passalora fulva"
        type: "fungal"
        synonyms: ["leaf mold", "cladosporium"]
        environment: [
            "high humidity" (>85%)
            "poor ventilation"
            "greenhouse conditions"
        ]
        differential: ["powdery_mildew"]
    }

    "TYLCV": {
        pathogen: "Tomato yellow leaf curl virus"
        type: "viral"  ← Different class entirely
        vector: "whitefly"  ← Vector-borne!
        synonyms: ["yellow leaf curl", "tylcv"]
        environment: [
            "warm temperature"
            "whitefly presence"
        ]
        differential: ["nutrient_deficiency", "herbicide_damage"]
    }
}
```

## Hybrid Reranking Algorithm

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Scoring Breakdown                              │
└─────────────────────────────────────────────────────────────────────┘

Initial Score (from FAISS)
    │
    │    Base semantic similarity: 0.65
    │
    ├─── Disease Matching ──────────┐
    │    if disease matches exactly: │  +0.30
    │    └─────────────────────────► │  New score: 0.95
    │
    ├─── Region Matching ───────────┐
    │    if region matches:          │  +0.15
    │    └─────────────────────────► │  New score: 1.10
    │
    ├─── Topic Matching ────────────┐
    │    if topic matches:           │  +0.20
    │    └─────────────────────────► │  New score: 1.30
    │
    ├─── Environment Matching ──────┐
    │    per condition match:        │  +0.10 (max 3)
    │    └─────────────────────────► │  New score: 1.50
    │
    ├─── Lexical Overlap ───────────┐
    │    query terms ∩ doc terms:    │  +0.02/term (max 0.25)
    │    └─────────────────────────► │  New score: 1.65
    │
    └─── Authority Boost ───────────┐
         if government source:       │  +0.10
         else if authoritative:      │  +0.05
         └─────────────────────────► │  New score: 1.75

Final Hybrid Score: 1.75

         ↓

Cross-Encoder Reranking
───────────────────────
Neural model evaluates:
  Query: "How to prevent Late Blight during rain?"
  Document: "Late blight develops rapidly in cool, wet..."
         ↓
  Cross-encoder score: 0.88
         ↓
Combined Final Score:
  0.7 × CE_score + 0.3 × hybrid_score
= 0.7 × 0.88 + 0.3 × 1.75
= 0.616 + 0.525
= 1.141

This becomes the final ranking score.
```

## Query Modes

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Confidence-Based Retrieval                       │
└─────────────────────────────────────────────────────────────────────┘

User Input:
    Image → Disease Model → Prediction
                              │
                    ┌─────────┼─────────┐
                    │         │         │
              Confidence  Confidence  Confidence
                < 60%     60-85%      > 85%
                    │         │         │
                    ▼         ▼         ▼
            ┌──────────┬──────────┬──────────┐
            │ DIFFEREN │  MIXED   │ SPECIFIC │
            │  -TIAL   │   MODE   │   MODE   │
            └──────────┴──────────┴──────────┘

DIFFERENTIAL MODE (Low Confidence)
──────────────────────────────────
Prediction: Early_Blight 53%, Septoria 41%
           ↓
Retrieval focus:
    - "Early Blight vs Septoria"
    - "How to distinguish..."
    - "Differential diagnosis"
    - Comparative symptom docs
           ↓
User gets: Side-by-side comparison

MIXED MODE (Medium Confidence)
───────────────────────────────
Prediction: Late_Blight 72%
           ↓
Retrieval focus:
    - Primary: Late_Blight management
    - Secondary: Differential info
    - Related environmental factors
           ↓
User gets: Focused but with alternatives

SPECIFIC MODE (High Confidence)
────────────────────────────────
Prediction: TYLCV 94%
           ↓
Retrieval focus:
    - Specific disease management
    - Prevention for this disease
    - Treatment options
    - Environmental risk factors
           ↓
User gets: Targeted disease-specific advice
```

## Weather Integration

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Environmental Context Matching                   │
└─────────────────────────────────────────────────────────────────────┘

Weather API Data              Document Metadata
────────────────              ─────────────────

Temperature: 19°C             environment: [
Humidity: 88%                     "cool temperature",
Rainfall: 14mm (24h)   ──►        "high humidity",
                                  "rainfall",
    ├─────────────┐               "leaf wetness"
    │ Conditions  │           ]
    └─────────────┘
         │
    ┌────┼────┬─────────┬──────────┐
    │    │    │         │          │
  Cool  High Rain   Leaf      Cloudy
  Temp  Humid      Wetness
    │    │    │         │          │
    └────┼────┴─────────┴──────────┘
         │
    Match Score
    ───────────
    3 conditions matched → +0.30 boost
         │
         ▼
    Late Blight documents ranked higher
    (because LB thrives in these conditions)
```

## Performance Characteristics

```
┌─────────────────────────────────────────────────────────────────────┐
│                         System Metrics                              │
└─────────────────────────────────────────────────────────────────────┘

Index Building:
═══════════════
    Document Count: 60-70 PDFs
                   ↓
    Chunks Generated: ~500-600
                   ↓
    Embedding Time: ~30-45 seconds
                   ↓
    FAISS Index Build: ~1-2 seconds
                   ↓
    Total Build Time: ~30-60 seconds

Query Processing:
═════════════════
    Query Received
         │
         ├─ Embedding: ~5ms
         │
         ├─ FAISS Search: ~10-20ms
         │
         ├─ Hybrid Reranking: ~50-100ms
         │
         └─ Cross-Encoder: ~100-200ms
                   ↓
         Total: ~200-400ms

Memory Usage:
═════════════
    Base System: ~100MB
    FAISS Index: ~50MB
    Embeddings: ~100MB
    Cross-Encoder: ~250MB
    ────────────────────
    Total: ~500MB

Scalability:
════════════
    Current: 60-70 documents
    Capacity: 200-500 documents (without changes)
    Beyond 500: Consider HNSW index or Annoy
```

## Data Flow Example

```
EXAMPLE: Farmer queries about leaf disease during monsoon
══════════════════════════════════════════════════════════

Step 1: Input
─────────────
    Image: [tomato leaf with spots]
         ↓
    Disease Model: Late_Blight (91% confidence)
         ↓
    Weather API: Temp 19°C, Humidity 88%, Rain 14mm
         ↓
    Location: Maharashtra, India

Step 2: Query Construction
───────────────────────────
    User: "What should I do about this?"
         ↓
    Context Assembly:
        {
          disease: "Late_Blight",
          confidence: 0.91,
          region: "India",
          weather: {
            conditions: ["cool temp", "high humidity", "rainfall"]
          }
        }

Step 3: Dense Retrieval
────────────────────────
    Query embedding → FAISS search
         ↓
    Top 30 candidates retrieved
    (includes various Late Blight docs)

Step 4: Hybrid Reranking
─────────────────────────
    For each candidate:
        - Check disease match (Late_Blight)     +0.30
        - Check region (India)                   +0.15
        - Check weather conditions               +0.20
        - Check lexical overlap                  +0.10
        - Check authority (TNAU, ICAR)           +0.10
         ↓
    Reranked by adjusted scores

Step 5: Cross-Encoder
──────────────────────
    Neural model evaluates query-doc relevance
         ↓
    Final top 5 selected

Step 6: Output
──────────────
    [1] Citation: TNAU, Late Blight Management, p. 3
        Score: 0.94
        Text: "During monsoon season with high humidity..."
        
    [2] Citation: ICAR Advisory, p. 12
        Score: 0.89
        Text: "Phytophthora infestans develops rapidly..."
        
    [3] Citation: Cornell Extension, Late Blight Control
        Score: 0.81
        Text: "Apply protective fungicides before rain..."

Step 7: LLM Generation (Future - Phase 8)
──────────────────────────────────────────
    Evidence from [1], [2], [3]
         ↓
    Structured answer:
        Prevention: [...]
        Management: [...]
        Weather Risk: HIGH
        Sources: [citations]
```

## File Organization

```
backend/
├── app/
│   ├── rag_v2.py                    # Main RAG system (850 lines)
│   │   ├── DISEASE_ONTOLOGY         # Disease knowledge
│   │   ├── DocumentProcessor        # PDF/text extraction
│   │   ├── SemanticChunker          # Section-aware chunking
│   │   ├── EnhancedRAGService       # Core service
│   │   └── SafetyChecker            # Safety validation
│   │
│   └── rag_integration_example.py   # API integration patterns
│
├── scripts/
│   ├── generate_metadata.py         # Metadata tool
│   ├── rag_evaluation.py            # Evaluation framework
│   ├── test_rag_v2.py               # Test suite
│   └── compare_v1_v2.py             # Comparison tool
│
└── storage/
    ├── docs/tomato_rag/             # Document corpus
    │   ├── diseases/
    │   ├── differential_diagnosis/
    │   ├── prevention/
    │   └── treatment/
    │
    └── vector_index_v2/             # Generated indices
        ├── faiss_v2.index
        └── metadata_v2.jsonl
```

This architecture provides a solid foundation for a production agricultural knowledge system with proper evaluation, citations, and context awareness.
