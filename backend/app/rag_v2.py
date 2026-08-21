"""
Enhanced RAG System for TomEase - Production-Grade Agricultural Knowledge Retrieval
Implements:
- Structured corpus organization
- Enhanced PDF parsing with page/section metadata
- Semantic/section-aware chunking
- Metadata extraction (automatic + manual)
- Disease ontology
- Weather-aware retrieval
- Hybrid reranking with cross-encoder
- Citation support
"""

import os
import json
import re
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
from dataclasses import dataclass, asdict
from datetime import datetime

# Core dependencies
try:
    import fitz  # PyMuPDF
    _HAS_PYMUPDF = True
except Exception:
    _HAS_PYMUPDF = False

try:
    import faiss
    _HAS_FAISS = True
except Exception:
    _HAS_FAISS = False

try:
    from annoy import AnnoyIndex
    _HAS_ANNOY = True
except Exception:
    _HAS_ANNOY = False

from sentence_transformers import SentenceTransformer, CrossEncoder
import numpy as np

# Storage paths
STORAGE_DIR = Path(__file__).parent.parent / "storage" / "vector_index_v2"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)
CORPUS_DIR = Path(__file__).parent.parent / "storage" / "docs" / "tomato_rag"


# ============================================================================
# DISEASE ONTOLOGY
# ============================================================================

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
        "synonyms": ["late blight", "phytophthora", "potato blight"],
        "environment": ["cool temperature", "high humidity", "rainfall", "leaf wetness"],
        "differential": ["Early_Blight", "Septoria"]
    },
    "Septoria": {
        "pathogen": "Septoria lycopersici",
        "type": "fungal",
        "synonyms": ["septoria leaf spot", "septoria"],
        "environment": ["warm temperature", "high humidity", "rainfall"],
        "differential": ["Early_Blight", "bacterial_spot"]
    },
    "Leaf_Mold": {
        "pathogen": "Passalora fulva",
        "type": "fungal",
        "synonyms": ["leaf mold", "leaf mould", "cladosporium"],
        "environment": ["high humidity", "poor ventilation", "greenhouse"],
        "differential": ["powdery_mildew"]
    },
    "TYLCV": {
        "pathogen": "Tomato yellow leaf curl virus",
        "type": "viral",
        "vector": "whitefly",
        "synonyms": ["yellow leaf curl", "tylcv", "leaf curl virus"],
        "environment": ["warm temperature", "whitefly presence"],
        "differential": ["nutrient_deficiency", "herbicide_damage"]
    }
}


# ============================================================================
# DATA MODELS
# ============================================================================

@dataclass
class DocumentMetadata:
    """Enhanced metadata for documents"""
    source_file: str
    diseases: List[str]
    disease_type: Optional[str] = None
    crop: str = "tomato"
    region: Optional[str] = None
    topic: Optional[str] = None
    subtopic: Optional[str] = None
    environment: List[str] = None
    source_type: Optional[str] = None  # government, university, research
    authority: Optional[str] = None  # ICAR, TNAU, etc.
    year: Optional[int] = None
    page: Optional[int] = None
    section: Optional[str] = None
    url: Optional[str] = None
    document_title: Optional[str] = None
    
    def __post_init__(self):
        if self.environment is None:
            self.environment = []


@dataclass
class Chunk:
    """Represents a document chunk with metadata"""
    text: str
    embedding: Optional[np.ndarray] = None
    metadata: Optional[DocumentMetadata] = None
    chunk_id: int = 0
    score: float = 0.0


# ============================================================================
# DOCUMENT PROCESSING
# ============================================================================

class DocumentProcessor:
    """Enhanced document processing with better PDF handling and metadata extraction"""
    
    @staticmethod
    def extract_pdf_with_metadata(path: Path) -> List[Dict[str, Any]]:
        """Extract text from PDF with page numbers and section detection"""
        if not _HAS_PYMUPDF:
            return []
        
        try:
            doc = fitz.open(str(path))
            pages_data = []
            
            for page_num, page in enumerate(doc, start=1):
                text = page.get_text()
                
                # Try to detect section headers (simple heuristic)
                lines = text.split('\n')
                section = None
                for line in lines[:10]:  # Check first few lines
                    line_stripped = line.strip()
                    if line_stripped and len(line_stripped) < 100:
                        # Likely a header if short and not lowercase
                        if not line_stripped.islower():
                            section = line_stripped
                            break
                
                pages_data.append({
                    "page": page_num,
                    "text": text,
                    "section": section
                })
            
            doc.close()
            return pages_data
        
        except Exception as e:
            print(f"Error extracting PDF {path}: {e}")
            return []
    
    @staticmethod
    def extract_text_file(path: Path) -> str:
        """Extract text from plain text files"""
        try:
            text = path.read_text(encoding="utf-8")
        except Exception:
            try:
                text = path.read_text(encoding="latin-1")
            except Exception:
                return ""
        
        # Strip HTML if present
        text = re.sub(r"<[^>]+>", " ", text)
        text = re.sub(r"\s+", " ", text)
        return text.strip()
    
    @staticmethod
    def infer_metadata_from_path(path: Path) -> Dict[str, Any]:
        """Automatically infer metadata from file path and name"""
        parts = path.parts
        metadata = {
            "diseases": [],
            "topic": None,
            "subtopic": None,
            "region": None,
            "source_type": None
        }
        
        # Check path components for disease names
        path_str = str(path).lower()
        for disease, info in DISEASE_ONTOLOGY.items():
            for synonym in info["synonyms"]:
                if synonym in path_str:
                    metadata["diseases"].append(disease)
                    break
        
        # Check for topics in path
        topics = ["prevention", "treatment", "diagnosis", "differential_diagnosis", 
                  "epidemiology", "management", "symptoms"]
        for topic in topics:
            if topic in path_str:
                metadata["topic"] = topic
                break
        
        # Check for authority/source
        authorities = {
            "icar": "ICAR",
            "tnau": "TNAU",
            "cornell": "Cornell University",
            "ncstate": "NC State",
            "umn": "University of Minnesota",
            "umass": "UMass",
            "ifas": "University of Florida IFAS"
        }
        
        for key, value in authorities.items():
            if key in path_str:
                metadata["authority"] = value
                metadata["source_type"] = "university"
                break
        
        # Check for region
        if "india" in path_str or "tnau" in path_str or "icar" in path_str:
            metadata["region"] = "India"
        
        return metadata
    
    @staticmethod
    def load_sidecar_metadata(path: Path) -> Dict[str, Any]:
        """Load manual sidecar metadata file if exists"""
        meta_path = path.with_name(path.stem + ".meta.json")
        if meta_path.exists():
            try:
                return json.loads(meta_path.read_text(encoding="utf-8"))
            except Exception:
                return {}
        return {}


# ============================================================================
# SEMANTIC CHUNKING
# ============================================================================

class SemanticChunker:
    """Section-aware semantic chunking"""
    
    @staticmethod
    def chunk_by_sections(text: str, max_words: int = 300, overlap: int = 50) -> List[Dict[str, Any]]:
        """
        Chunk text while preserving section structure
        Returns list of {text, section, subsection}
        """
        # Split into paragraphs
        paragraphs = text.split('\n\n')
        chunks = []
        current_section = None
        current_subsection = None
        buffer = []
        buffer_word_count = 0
        
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
            
            # Detect section headers (simple heuristic)
            if len(para) < 100 and para.isupper() or (
                para.endswith(':') and len(para.split()) < 10
            ):
                # Likely a header
                if para.isupper():
                    current_section = para
                    current_subsection = None
                else:
                    current_subsection = para
                continue
            
            words = para.split()
            para_word_count = len(words)
            
            # If adding this paragraph exceeds max_words, flush buffer
            if buffer_word_count + para_word_count > max_words and buffer:
                chunks.append({
                    "text": " ".join(buffer),
                    "section": current_section,
                    "subsection": current_subsection
                })
                
                # Keep overlap
                overlap_words = []
                for item in reversed(buffer):
                    words_in_item = item.split()
                    if len(overlap_words) + len(words_in_item) <= overlap:
                        overlap_words = words_in_item + overlap_words
                    else:
                        break
                
                buffer = [" ".join(overlap_words)] if overlap_words else []
                buffer_word_count = len(overlap_words)
            
            buffer.append(para)
            buffer_word_count += para_word_count
        
        # Flush remaining buffer
        if buffer:
            chunks.append({
                "text": " ".join(buffer),
                "section": current_section,
                "subsection": current_subsection
            })
        
        return chunks


# ============================================================================
# ENHANCED RAG SERVICE
# ============================================================================

class EnhancedRAGService:
    """Production-grade RAG system for agricultural disease knowledge"""
    
    def __init__(self, corpus_path: Optional[Path] = None, 
                 embedding_model: str = "all-MiniLM-L6-v2",
                 use_reranker: bool = True):
        """
        Initialize RAG service
        
        Args:
            corpus_path: Path to document corpus (defaults to tomato_rag)
            embedding_model: SentenceTransformer model name
            use_reranker: Whether to use cross-encoder reranking
        """
        self.corpus_path = corpus_path or CORPUS_DIR
        self.embedding_model_name = embedding_model
        self.model = SentenceTransformer(embedding_model)
        self.embedding_dim = self.model.get_sentence_embedding_dimension()
        
        # Cross-encoder for reranking
        self.use_reranker = use_reranker
        if use_reranker:
            try:
                self.reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
            except Exception:
                print("Warning: Could not load reranker, falling back to embedding-only")
                self.use_reranker = False
        
        self.index = None
        self.chunks: List[Chunk] = []
        self.metadata_path = STORAGE_DIR / "metadata_v2.jsonl"
        self.index_path = STORAGE_DIR / "faiss_v2.index"
        self.embeddings_path = STORAGE_DIR / "embeddings_v2.npy"
        
        print(f"[RAG v2] Initialized with embedding model: {embedding_model}")
        print(f"[RAG v2] Reranker enabled: {self.use_reranker}")
    
    def gather_documents(self) -> List[Path]:
        """Gather all documents from corpus"""
        if not self.corpus_path.exists():
            print(f"Warning: Corpus path {self.corpus_path} does not exist")
            return []
        
        patterns = ["**/*.pdf", "**/*.txt", "**/*.md"]
        files = []
        for pattern in patterns:
            files.extend(list(self.corpus_path.glob(pattern)))
        
        print(f"[RAG v2] Found {len(files)} documents in corpus")
        return files
    
    def process_document(self, path: Path) -> List[Chunk]:
        """Process a single document into chunks with metadata"""
        chunks = []
        
        # Load manual metadata if exists
        manual_meta = DocumentProcessor.load_sidecar_metadata(path)
        
        # Infer metadata from path
        auto_meta = DocumentProcessor.infer_metadata_from_path(path)
        
        # Merge: manual overrides automatic
        merged_meta = {**auto_meta, **manual_meta}
        
        # Extract document content
        if path.suffix.lower() == '.pdf':
            pages_data = DocumentProcessor.extract_pdf_with_metadata(path)
            
            for page_data in pages_data:
                page_text = page_data["text"]
                if not page_text.strip():
                    continue
                
                # Chunk with section awareness
                text_chunks = SemanticChunker.chunk_by_sections(page_text)
                
                for idx, chunk_data in enumerate(text_chunks):
                    metadata = DocumentMetadata(
                        source_file=str(path.relative_to(Path.cwd())),
                        diseases=merged_meta.get("diseases", []),
                        disease_type=merged_meta.get("disease_type"),
                        region=merged_meta.get("region"),
                        topic=merged_meta.get("topic"),
                        subtopic=merged_meta.get("subtopic"),
                        environment=merged_meta.get("environment", []),
                        source_type=merged_meta.get("source_type"),
                        authority=merged_meta.get("authority"),
                        year=merged_meta.get("year"),
                        page=page_data["page"],
                        section=chunk_data.get("section") or page_data.get("section"),
                        url=merged_meta.get("url"),
                        document_title=merged_meta.get("document_title")
                    )
                    
                    chunks.append(Chunk(
                        text=chunk_data["text"],
                        metadata=metadata,
                        chunk_id=idx
                    ))
        else:
            # Plain text file
            text = DocumentProcessor.extract_text_file(path)
            if text:
                text_chunks = SemanticChunker.chunk_by_sections(text)
                
                for idx, chunk_data in enumerate(text_chunks):
                    metadata = DocumentMetadata(
                        source_file=str(path.relative_to(Path.cwd())),
                        diseases=merged_meta.get("diseases", []),
                        disease_type=merged_meta.get("disease_type"),
                        region=merged_meta.get("region"),
                        topic=merged_meta.get("topic"),
                        subtopic=merged_meta.get("subtopic"),
                        environment=merged_meta.get("environment", []),
                        source_type=merged_meta.get("source_type"),
                        authority=merged_meta.get("authority"),
                        year=merged_meta.get("year"),
                        section=chunk_data.get("section"),
                        url=merged_meta.get("url"),
                        document_title=merged_meta.get("document_title")
                    )
                    
                    chunks.append(Chunk(
                        text=chunk_data["text"],
                        metadata=metadata,
                        chunk_id=idx
                    ))
        
        return chunks
    
    def build_index(self, force: bool = False):
        """Build vector index from corpus"""
        if not force and self.index_path.exists() and self.metadata_path.exists():
            print("[RAG v2] Loading existing index...")
            try:
                self._load_index()
                return
            except Exception as e:
                print(f"[RAG v2] Error loading index: {e}, rebuilding...")
        
        print("[RAG v2] Building index from corpus...")
        documents = self.gather_documents()
        
        if not documents:
            print("[RAG v2] No documents found")
            return
        
        all_chunks = []
        for doc_path in documents:
            chunks = self.process_document(doc_path)
            all_chunks.extend(chunks)
            print(f"[RAG v2] Processed {doc_path.name}: {len(chunks)} chunks")
        
        if not all_chunks:
            print("[RAG v2] No chunks generated")
            return
        
        self.chunks = all_chunks
        print(f"[RAG v2] Total chunks: {len(all_chunks)}")
        
        # Generate embeddings
        print("[RAG v2] Generating embeddings...")
        texts = [chunk.text for chunk in all_chunks]
        embeddings = self.model.encode(texts, show_progress_bar=True, convert_to_numpy=True)
        
        # Store embeddings in chunks
        for chunk, emb in zip(all_chunks, embeddings):
            chunk.embedding = emb
        
        # Build FAISS index
        if _HAS_FAISS:
            print("[RAG v2] Building FAISS index...")
            index = faiss.IndexFlatIP(self.embedding_dim)
            faiss.normalize_L2(embeddings)
            index.add(embeddings)
            faiss.write_index(index, str(self.index_path))
            self.index = index
            print(f"[RAG v2] FAISS index built with {index.ntotal} vectors")
        else:
            print("[RAG v2] FAISS not available, saving numpy embeddings matrix")
            np.save(str(self.embeddings_path), embeddings)
            self.index = embeddings
        
        # Save metadata
        print("[RAG v2] Saving metadata...")
        with open(self.metadata_path, 'w', encoding='utf-8') as f:
            for chunk in all_chunks:
                meta_dict = {
                    "text": chunk.text,
                    "chunk_id": chunk.chunk_id,
                    "metadata": asdict(chunk.metadata) if chunk.metadata else {}
                }
                f.write(json.dumps(meta_dict, ensure_ascii=False) + '\n')
        
        print("[RAG v2] Index build complete!")
    
    def _load_index(self):
        """Load existing index and metadata"""
        # Load metadata
        self.chunks = []
        with open(self.metadata_path, 'r', encoding='utf-8') as f:
            for line in f:
                data = json.loads(line)
                meta_data = data.get("metadata", {})
                metadata = DocumentMetadata(**meta_data) if meta_data else None
                chunk = Chunk(
                    text=data["text"],
                    chunk_id=data["chunk_id"],
                    metadata=metadata
                )
                self.chunks.append(chunk)
        
        # Load FAISS index or fallback numpy embeddings
        if _HAS_FAISS and self.index_path.exists():
            self.index = faiss.read_index(str(self.index_path))
            print(f"[RAG v2] Loaded FAISS index with {self.index.ntotal} vectors")
        elif self.embeddings_path.exists():
            self.index = np.load(str(self.embeddings_path))
            print(f"[RAG v2] Loaded fallback numpy embeddings matrix with shape {self.index.shape}")
        else:
            raise RuntimeError("Index file not found")
        
        print(f"[RAG v2] Loaded {len(self.chunks)} chunks")
    
    def retrieve_candidates(self, query: str, top_k: int = 30) -> List[Tuple[Chunk, float]]:
        """Retrieve initial candidate chunks using dense retrieval"""
        if self.index is None:
            raise RuntimeError("Index not initialized")
        
        query_emb = self.model.encode([query], convert_to_numpy=True)[0]
        
        if _HAS_FAISS and isinstance(self.index, faiss.Index):
            # FAISS retrieval
            faiss.normalize_L2(query_emb.reshape(1, -1))
            distances, indices = self.index.search(query_emb.reshape(1, -1), min(top_k, len(self.chunks)))
            
            results = []
            for dist, idx in zip(distances[0], indices[0]):
                if idx >= 0 and idx < len(self.chunks):
                    chunk = self.chunks[idx]
                    chunk.score = float(dist)
                    results.append((chunk, float(dist)))
        else:
            # Brute force
            query_norm = query_emb / (np.linalg.norm(query_emb) + 1e-12)
            mat = self.index.astype(np.float32)
            mat_norms = np.linalg.norm(mat, axis=1, keepdims=True)
            mat_norms[mat_norms == 0] = 1e-12
            mat_n = mat / mat_norms
            sims = (mat_n @ query_norm).reshape(-1)
            top_idxs = np.argsort(sims)[-top_k:][::-1]
            
            results = []
            for idx in top_idxs:
                chunk = self.chunks[idx]
                chunk.score = float(sims[idx])
                results.append((chunk, float(sims[idx])))
        
        return results
    
    def hybrid_rerank(self, query: str, candidates: List[Tuple[Chunk, float]], 
                      context: Optional[Dict[str, Any]] = None) -> List[Tuple[Chunk, float]]:
        """
        Apply hybrid reranking with metadata boosting
        
        Args:
            query: User query
            candidates: Initial retrieved candidates
            context: Additional context (disease, region, weather, etc.)
        """
        # Extract context
        disease = (context.get("disease", "") if context else "") or ""
        region = (context.get("region", "") if context else "") or ""
        topic = (context.get("topic", "") if context else "") or ""
        weather_conditions = context.get("weather", {}) if context else {}
        
        # Convert to lowercase for comparison
        disease = disease.lower() if disease else ""
        region = region.lower() if region else ""
        topic = topic.lower() if topic else ""
        
        # Query terms for lexical matching
        query_terms = set(re.findall(r'\w+', query.lower()))
        
        reranked = []
        
        for chunk, base_score in candidates:
            score = base_score
            meta = chunk.metadata
            
            if not meta:
                reranked.append((chunk, score))
                continue
            
            # Disease matching boost
            if disease and meta.diseases:
                diseases_lower = [d.lower() for d in meta.diseases]
                if disease in diseases_lower:
                    score += 0.3  # Strong boost for exact disease match
            
            # Region boost
            if region and meta.region and region in meta.region.lower():
                score += 0.15
            
            # Topic boost
            if topic and meta.topic and topic in meta.topic.lower():
                score += 0.2
            
            # Weather/environment matching
            if weather_conditions and meta.environment:
                env_match_count = 0
                for condition in weather_conditions.get("conditions", []):
                    for env in meta.environment:
                        if condition.lower() in env.lower():
                            env_match_count += 1
                if env_match_count > 0:
                    score += 0.1 * min(env_match_count, 3)
            
            # Lexical overlap boost
            chunk_terms = set(re.findall(r'\w+', chunk.text.lower()))
            overlap = len(query_terms & chunk_terms)
            if overlap > 0:
                score += min(0.25, 0.02 * overlap)
            
            # Authority boost (prefer authoritative sources)
            if meta.source_type == "government":
                score += 0.1
            elif meta.authority:
                score += 0.05
            
            reranked.append((chunk, score))
        
        # Sort by adjusted score
        reranked.sort(key=lambda x: x[1], reverse=True)
        return reranked
    
    def cross_encoder_rerank(self, query: str, candidates: List[Tuple[Chunk, float]], 
                            top_k: int = 5) -> List[Tuple[Chunk, float]]:
        """Apply cross-encoder reranking for final top-k selection"""
        if not self.use_reranker or not hasattr(self, 'reranker'):
            return candidates[:top_k]
        
        try:
            # Prepare query-document pairs
            pairs = [[query, chunk.text] for chunk, _ in candidates]
            
            # Get cross-encoder scores
            ce_scores = self.reranker.predict(pairs)
            
            # Combine with existing scores (weighted average)
            reranked = []
            for (chunk, hybrid_score), ce_score in zip(candidates, ce_scores):
                final_score = 0.7 * float(ce_score) + 0.3 * hybrid_score
                reranked.append((chunk, final_score))
            
            # Sort and return top_k
            reranked.sort(key=lambda x: x[1], reverse=True)
            return reranked[:top_k]
        
        except Exception as e:
            print(f"[RAG v2] Cross-encoder reranking failed: {e}")
            return candidates[:top_k]
    
    def query(self, query: str, top_k: int = 5, 
              context: Optional[Dict[str, Any]] = None,
              retrieval_k: int = 30) -> List[Dict[str, Any]]:
        """
        Main query method with full retrieval pipeline
        
        Args:
            query: User question
            top_k: Number of final results
            context: Additional context (disease, region, weather, model prediction)
            retrieval_k: Number of initial candidates to retrieve
        
        Returns:
            List of results with text, metadata, scores, citations
        """
        print(f"[RAG v2] Query: '{query}'")
        print(f"[RAG v2] Context: {context}")
        
        # Step 1: Dense retrieval (top 30)
        candidates = self.retrieve_candidates(query, top_k=retrieval_k)
        print(f"[RAG v2] Retrieved {len(candidates)} candidates")
        
        # Step 2: Hybrid reranking with metadata
        reranked = self.hybrid_rerank(query, candidates, context)
        print(f"[RAG v2] After hybrid rerank, top score: {reranked[0][1] if reranked else 0:.3f}")
        
        # Step 3: Cross-encoder reranking
        final_results = self.cross_encoder_rerank(query, reranked, top_k=top_k)
        print(f"[RAG v2] Final top-{top_k} selected")
        
        # Format results with citations
        formatted_results = []
        for chunk, score in final_results:
            meta = chunk.metadata
            result = {
                "text": chunk.text,
                "score": score,
                "source": meta.source_file if meta else "unknown",
                "page": meta.page if meta else None,
                "section": meta.section if meta else None,
                "diseases": meta.diseases if meta else [],
                "region": meta.region if meta else None,
                "topic": meta.topic if meta else None,
                "authority": meta.authority if meta else None,
                "year": meta.year if meta else None,
                "citation": self._format_citation(meta) if meta else None
            }
            formatted_results.append(result)
        
        return formatted_results
    
    def _format_citation(self, meta: DocumentMetadata) -> str:
        """Format citation string for a result"""
        parts = []
        
        if meta.authority:
            parts.append(meta.authority)
        
        if meta.document_title:
            parts.append(meta.document_title)
        elif meta.source_file:
            parts.append(Path(meta.source_file).name)
        
        if meta.page:
            parts.append(f"p. {meta.page}")
        
        if meta.year:
            parts.append(f"({meta.year})")
        
        return ", ".join(parts) if parts else "Unknown source"
    
    def query_with_model_prediction(self, query: str, prediction: Dict[str, Any], 
                                   weather: Optional[Dict[str, Any]] = None,
                                   location: Optional[Dict[str, Any]] = None,
                                   top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Query RAG with disease model prediction and environmental context
        
        Args:
            query: User query
            prediction: Model output with disease and confidence
            weather: Weather data (temperature, humidity, rainfall)
            location: Location data (region, state, etc.)
            top_k: Number of results
        
        Returns:
            Contextually relevant results
        """
        # Build context from prediction and environment
        context = {
            "disease": prediction.get("disease") if prediction else None,
            "confidence": prediction.get("confidence", 0) if prediction else 0,
            "region": location.get("region") if location and isinstance(location, dict) else None,
            "weather": weather if weather and isinstance(weather, dict) else None
        }
        
        # Determine query mode based on confidence
        confidence = prediction.get("confidence", 0)
        
        if confidence < 0.6:
            # Low confidence - differential diagnosis mode
            context["topic"] = "differential_diagnosis"
            print("[RAG v2] Low confidence - using differential diagnosis mode")
        elif confidence >= 0.85:
            # High confidence - specific disease information
            print(f"[RAG v2] High confidence - retrieving {prediction.get('disease')} info")
        else:
            # Medium confidence - include related diseases
            print("[RAG v2] Medium confidence - including differential info")
        
        return self.query(query, top_k=top_k, context=context, retrieval_k=30)


# ============================================================================
# SAFETY CHECKS
# ============================================================================

class SafetyChecker:
    """Enhanced safety checking for agricultural recommendations"""
    
    def __init__(self, rules_path: Optional[Path] = None):
        self.rules_path = rules_path or Path(__file__).with_name("safety_rules.json")
        self.rules = self._load_rules()
    
    def _load_rules(self) -> Dict[str, Any]:
        """Load safety rules from JSON"""
        if self.rules_path.exists():
            try:
                return json.loads(self.rules_path.read_text(encoding='utf-8'))
            except Exception:
                return {}
        return {}
    
    def check_results(self, results: List[Dict[str, Any]], 
                     region: Optional[str] = None) -> List[Dict[str, Any]]:
        """Apply safety checks to retrieval results"""
        for result in results:
            text = result.get("text", "")
            flags = self._check_text(text, region)
            result["safety_flags"] = flags
        
        return results
    
    def _check_text(self, text: str, region: Optional[str] = None) -> Dict[str, Any]:
        """Check text for safety concerns"""
        flags = {
            "dose_present": False,
            "forbidden_chemical": False,
            "needs_review": False,
            "region_mismatch": False,
            "warnings": []
        }
        
        # Check for dosage patterns
        dose_pattern = self.rules.get("dose_regex")
        if dose_pattern:
            try:
                if re.search(dose_pattern, text, re.IGNORECASE):
                    flags["dose_present"] = True
                    flags["warnings"].append("Contains chemical dosage information")
            except Exception:
                pass
        
        # Check forbidden chemicals
        forbidden = self.rules.get("forbidden_pesticides", [])
        for chem in forbidden:
            if chem.lower() in text.lower():
                flags["forbidden_chemical"] = True
                flags["warnings"].append(f"Contains reference to {chem}")
        
        # Determine if human review needed
        if flags["dose_present"] or flags["forbidden_chemical"]:
            flags["needs_review"] = True
        
        return flags


# ============================================================================
# MAIN INTERFACE
# ============================================================================

def get_rag_service(force_rebuild: bool = False) -> EnhancedRAGService:
    """Get or create RAG service instance"""
    service = EnhancedRAGService()
    service.build_index(force=force_rebuild)
    return service


if __name__ == "__main__":
    # Test the enhanced RAG system
    print("=" * 80)
    print("Testing Enhanced RAG System v2")
    print("=" * 80)
    
    # Initialize service
    rag = get_rag_service(force_rebuild=True)
    
    # Test query
    query = "How can I prevent Late Blight in high humidity?"
    context = {
        "disease": "Late_Blight",
        "region": "India",
        "weather": {
            "conditions": ["high humidity", "rainfall"]
        }
    }
    
    results = rag.query(query, top_k=5, context=context)
    
    print("\n" + "=" * 80)
    print(f"Query: {query}")
    print("=" * 80)
    
    for i, result in enumerate(results, 1):
        print(f"\n[Result {i}] Score: {result['score']:.3f}")
        print(f"Source: {result['citation']}")
        print(f"Diseases: {', '.join(result['diseases'])}")
        print(f"Text: {result['text'][:200]}...")
        if result.get('safety_flags'):
            print(f"Safety: {result['safety_flags']}")
