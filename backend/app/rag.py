import os
import json
import glob
import re
from typing import List, Dict, Any, Optional
from pathlib import Path
import re as _re

# Load safety rules if present
_SAFETY_PATH = Path(__file__).with_name("safety_rules.json")
try:
    _SAFETY_RULES = json.loads(_SAFETY_PATH.read_text(encoding="utf-8"))
except Exception:
    _SAFETY_RULES = {}

try:
    # Prefer faiss if available
    import faiss
    _HAS_FAISS = True
except Exception:
    _HAS_FAISS = False

try:
    import fitz  # PyMuPDF for PDF text extraction
    _HAS_PYMUPDF = True
except Exception:
    _HAS_PYMUPDF = False

# Annoy optional (may require build tools on Windows)
try:
    from annoy import AnnoyIndex
    _HAS_ANNOY = True
except Exception:
    _HAS_ANNOY = False
from sentence_transformers import SentenceTransformer
import numpy as np

STORAGE_DIR = Path("storage/vector_index")
STORAGE_DIR.mkdir(parents=True, exist_ok=True)


def _read_text_file(path: Path) -> str:
    # Handle PDF files via PyMuPDF if available
    if path.suffix.lower() == ".pdf" and _HAS_PYMUPDF:
        try:
            doc = fitz.open(str(path))
            pages = []
            for p in doc:
                pages.append(p.get_text())
            text = "\n".join(pages)
        except Exception:
            text = ""
    else:
        try:
            text = path.read_text(encoding="utf-8")
        except Exception:
            try:
                text = path.read_text(encoding="latin-1")
            except Exception:
                return ""
    # Strip HTML tags if any
    text = re.sub(r"<[^>]+>", " ", text)
    # Normalize whitespace
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _load_sidecar_metadata(path: Path) -> Dict[str, Any]:
    """Load optional sidecar metadata for a document.
    Sidecar filename: same-stem with .meta.json in same directory, e.g. foo.pdf -> foo.meta.json
    """
    meta_path = path.with_name(path.stem + ".meta.json")
    if meta_path.exists():
        try:
            return json.loads(meta_path.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}


class RAGService:
    def __init__(self, source_paths: Optional[List[str]] = None):
        self.source_paths = source_paths or [
            "backend/storage/docs",
            "docs",
            "README.md",
            "INTERVIEW_DEEP_DIVE.md",
            "website/src/pages",
        ]
        self.model = SentenceTransformer("all-MiniLM-L6-v2")
        self.embedding_dim = self.model.get_sentence_embedding_dimension()
        self.index = None
        self.metadata: List[Dict[str, Any]] = []
        self.index_path = STORAGE_DIR / "index.ann"
        self.meta_path = STORAGE_DIR / "metadata.jsonl"
        self.faiss_index_path = STORAGE_DIR / "faiss.index"

    def _gather_files(self) -> List[Path]:
        files: List[Path] = []
        for p in self.source_paths:
            path = Path(p)
            if path.is_file():
                files.append(path)
            elif path.is_dir():
                # include common docs extensions
                patterns = ["**/*.md", "**/*.txt", "**/*.html", "**/*.htm", "**/*.pdf"]
                for pat in patterns:
                    files.extend(list(path.glob(pat)))
        # Deduplicate
        unique = []
        seen = set()
        for f in files:
            if f.resolve() in seen:
                continue
            seen.add(f.resolve())
            unique.append(f)
        return unique

    def _chunk_text(self, text: str, chunk_words: int = 300, overlap: int = 50) -> List[str]:
        words = text.split()
        chunks = []
        i = 0
        n = len(words)
        while i < n:
            chunk = words[i:i + chunk_words]
            chunks.append(" ".join(chunk))
            i += (chunk_words - overlap)
        return chunks

    def build_index(self, force: bool = False):
        """
        Build or rebuild the local vector index from source_paths.
        """
        # If existing index and not forcing rebuild, try to load
        if not force and self.index_path.exists() and self.meta_path.exists():
            try:
                self._load_index()
                return
            except Exception:
                # fall through to rebuild
                pass

        files = self._gather_files()
        docs = []
        for f in files:
            text = _read_text_file(f)
            if not text:
                continue
            # load sidecar metadata if provided
            sidecar = _load_sidecar_metadata(f)
            chunks = self._chunk_text(text)
            for idx, chunk in enumerate(chunks):
                try:
                    src = str(f.resolve().relative_to(Path.cwd().resolve()))
                except Exception:
                    src = str(f)
                doc_meta = {
                    "source": src,
                    "text": chunk,
                    "chunk_id": idx,
                    # disease-aware metadata (may be empty if not provided)
                    "diseases": sidecar.get("diseases", []),
                    "disease_type": sidecar.get("disease_type"),
                    "crop": sidecar.get("crop"),
                    "region": sidecar.get("region"),
                    "topic": sidecar.get("topic"),
                    "subtopic": sidecar.get("subtopic"),
                    "environment": sidecar.get("environment", []),
                    "source_type": sidecar.get("source_type"),
                    "authority": sidecar.get("authority"),
                    "year": sidecar.get("year")
                }
                docs.append(doc_meta)

        if not docs:
            # nothing to index
            self.metadata = []
            self.index = None
            return

        texts = [d["text"] for d in docs]
        embeddings = self.model.encode(texts, show_progress_bar=True, convert_to_numpy=True)

        # Persist metadata
        with open(self.meta_path, "w", encoding="utf-8") as mf:
            for d in docs:
                mf.write(json.dumps(d, ensure_ascii=False) + "\n")
        self.metadata = docs

        # Try FAISS first (if available), then Annoy, else use brute-force numpy
        if _HAS_FAISS:
            try:
                index = faiss.IndexFlatIP(self.embedding_dim)
                faiss.normalize_L2(embeddings)
                index.add(embeddings)
                faiss.write_index(index, str(self.faiss_index_path))
                self.index = ("faiss", index)
                return
            except Exception:
                # fallback to Annoy
                pass
        if _HAS_ANNOY:
            annoy_index = AnnoyIndex(self.embedding_dim, "angular")
            for i, emb in enumerate(embeddings):
                annoy_index.add_item(i, emb)
            annoy_index.build(10)
            annoy_index.save(str(self.index_path))
            self.index = ("annoy", annoy_index)
            return

        # Brute-force numpy fallback (suitable for small corpora)
        np_emb_path = STORAGE_DIR / "embeddings.npy"
        np.save(str(np_emb_path), embeddings)
        self.index = ("brute", embeddings)
        return

    def _load_index(self):
        # Load metadata
        meta = []
        with open(self.meta_path, "r", encoding="utf-8") as mf:
            for line in mf:
                meta.append(json.loads(line))
        self.metadata = meta

        if _HAS_FAISS and self.faiss_index_path.exists():
            index = faiss.read_index(str(self.faiss_index_path))
            self.index = ("faiss", index)
            return

        if self.index_path.exists() and _HAS_ANNOY:
            try:
                from annoy import AnnoyIndex as _AnnoyIndex
                annoy_index = _AnnoyIndex(self.embedding_dim, "angular")
                annoy_index.load(str(self.index_path))
                self.index = ("annoy", annoy_index)
                return
            except Exception:
                # if Annoy can't be used, continue to try numpy embeddings
                pass

        # Try loading numpy embeddings
        np_emb_path = STORAGE_DIR / "embeddings.npy"
        if np_emb_path.exists():
            emb = np.load(str(np_emb_path))
            self.index = ("brute", emb)
            return

        raise RuntimeError("No index files found to load")

    def query(self, q: str, top_k: int = 5, context: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Query the index and return top_k results with metadata and similarity score.
        """
        if not self.index:
            raise RuntimeError("Index not initialized")

        # Debug: which index backend are we using
        try:
            idx_backend = self.index[0]
        except Exception:
            idx_backend = str(type(self.index))
        print(f"[RAG DEBUG] query='{q}' top_k={top_k} index_backend={idx_backend} metadata_count={len(self.metadata)}")

        q_emb = self.model.encode([q], convert_to_numpy=True)[0]

        results: List[Dict[str, Any]] = []
        if self.index[0] == "faiss":
            index = self.index[1]
            faiss.normalize_L2(q_emb.reshape(1, -1))
            D, I = index.search(q_emb.reshape(1, -1), top_k)
            print(f"[RAG DEBUG] FAISS raw_D={D[0].tolist()} I={I[0].tolist()}")
            for score, idx in zip(D[0], I[0]):
                if idx < 0 or idx >= len(self.metadata):
                    continue
                m = self.metadata[idx]
                results.append({
                    "source": m.get("source"),
                    "text": m.get("text"),
                    "score": float(score),
                    "diseases": m.get("diseases", []),
                    "disease_type": m.get("disease_type"),
                    "region": m.get("region"),
                    "topic": m.get("topic")
                })
        else:
            # Support multiple non-FAISS backends: annoy or brute-force numpy
            idx_type = self.index[0]
            if idx_type == "annoy":
                annoy_index = self.index[1]
                idxs, distances = annoy_index.get_nns_by_vector(q_emb, top_k, include_distances=True)
                print(f"[RAG DEBUG] ANNOY idxs={idxs} distances={distances}")
                for idx, dist in zip(idxs, distances):
                    if idx < 0 or idx >= len(self.metadata):
                        continue
                    m = self.metadata[idx]
                    # Annoy returns angular distances; transform to similarity-like score
                    score = 1.0 - dist
                    results.append({
                        "source": m.get("source"),
                        "text": m.get("text"),
                        "score": float(score),
                        "diseases": m.get("diseases", []),
                        "disease_type": m.get("disease_type"),
                        "region": m.get("region"),
                        "topic": m.get("topic")
                    })
            elif idx_type == "brute":
                # embeddings stored as numpy array in self.index[1]
                emb_matrix = self.index[1]
                # cosine similarity: (a·b) / (||a||*||b||)
                try:
                    qv = q_emb.astype(np.float32)
                    # normalize
                    qv_norm = qv / (np.linalg.norm(qv) + 1e-12)
                    mat = emb_matrix.astype(np.float32)
                    mat_norms = np.linalg.norm(mat, axis=1, keepdims=True)
                    mat_norms[mat_norms == 0] = 1e-12
                    mat_n = mat / mat_norms
                    sims = (mat_n @ qv_norm).reshape(-1)
                    # get top_k indices
                    top_idxs = np.argsort(sims)[-top_k:][::-1]
                    top_scores = sims[top_idxs].tolist()
                    print(f"[RAG DEBUG] BRUTE top_idxs={top_idxs.tolist()} top_scores={top_scores}")
                    for idx in top_idxs:
                        if idx < 0 or idx >= len(self.metadata):
                            continue
                        m = self.metadata[idx]
                        results.append({
                            "source": m.get("source"),
                            "text": m.get("text"),
                            "score": float(sims[idx]),
                            "diseases": m.get("diseases", []),
                            "disease_type": m.get("disease_type"),
                            "region": m.get("region"),
                            "topic": m.get("topic")
                        })
                except Exception as e:
                    # fallback: return empty and surface error for debugging
                    print(f"[RAG DEBUG] BRUTE retrieval error: {repr(e)}")
                    import traceback
                    traceback.print_exc()
                    results = []
            else:
                # unknown index type
                results = []

        print(f"[RAG DEBUG] raw_results_count={len(results)}")

        # If context provided, apply simple disease-aware boosting, lexical overlap,
        # and safety checks. This hybrid reranking improves relevance for local corpora.
        if context:
            disease = (context.get("disease") or "").lower()
            region = (context.get("region") or "").lower()
            topic = (context.get("topic") or "").lower()

            q_terms = set([t.lower() for t in re.findall(r"\w+", q)])

            def boost(r):
                score = r.get("score", 0.0)
                text = (r.get("text") or "").lower()

                # boost if diseases mentioned in metadata
                ds = [d.lower() for d in (r.get("diseases") or [])]
                if disease and disease in ds:
                    score += 0.25

                # lexical overlap boost (simple term intersection)
                txt_terms = set(re.findall(r"\w+", text))
                overlap = len(q_terms & txt_terms)
                if overlap:
                    # small per-token boost to prefer snippets that mention query words
                    score += min(0.2, 0.02 * overlap)

                # boost if region matches
                reg = (r.get("region") or "")
                if region and reg and region in reg.lower():
                    score += 0.1

                # boost if topic matches exactly
                top = (r.get("topic") or "")
                if topic and top and top.lower() == topic:
                    score += 0.15

                return score

            for r in results:
                try:
                    r["adjusted_score"] = boost(r)
                    r["safety_flags"] = safety_check_text(r.get("text", ""), region=region)
                except Exception:
                    r["adjusted_score"] = r.get("score", 0.0)
                    r["safety_flags"] = {}

            # sort by adjusted_score
            results.sort(key=lambda x: x.get("adjusted_score", x.get("score", 0)), reverse=True)
            print(f"[RAG DEBUG] post_filter_count={len(results)} top_adjusted={[r.get('adjusted_score') for r in results[:top_k]]}")

        return results

    def summarize_sources(self, results: List[Dict[str, Any]], max_chars: int = 800) -> str:
        # Try to produce a lightly-structured summary from retrieved snippets.
        # We attempt to extract sentences mentioning 'cause', 'prevent', 'manage', 'treat', etc.
        snippets = [r.get("text", "") for r in results]
        sentences = []
        for s in snippets:
            for part in re.split(r"(?<=[.?!])\s+", s):
                part = part.strip()
                if part:
                    sentences.append(part)

        cause_parts = []
        prevention_parts = []
        remedy_parts = []

        for sent in sentences:
            lower = sent.lower()
            if any(k in lower for k in ["symptom", "cause", "causal", "caused by", "causes", "etiology"]):
                cause_parts.append(sent)
            elif any(k in lower for k in ["prevent", "prevention", "avoid", "preventive", "prophylactic"]):
                prevention_parts.append(sent)
            elif any(k in lower for k in ["remedy", "treat", "treatment", "manage", "control", "apply", "use"]):
                remedy_parts.append(sent)
            else:
                # fallback: heuristically assign short sentences to remedy if they contain 'fungicide' or 'spray'
                if "fungicide" in lower or "spray" in lower or "apply" in lower:
                    remedy_parts.append(sent)

        # Join parts and trim
        def join_parts(parts):
            text = " ".join(parts)
            return (text[:max_chars].strip()) if text else ""

        structured = {
            "cause": join_parts(cause_parts),
            "prevention": join_parts(prevention_parts),
            "remedy": join_parts(remedy_parts),
            "rag_joined": "\n\n".join(snippets)[:max_chars]
        }

        # Create a labeled string that downstream LLM/heuristic can parse if needed
        out = []
        if structured["cause"]:
            out.append("CAUSE:\n" + structured["cause"])
        if structured["prevention"]:
            out.append("PREVENTION:\n" + structured["prevention"])
        if structured["remedy"]:
            out.append("REMEDY:\n" + structured["remedy"])
        out.append("SOURCES:\n" + structured["rag_joined"])

        return "\n\n".join(out)[:max_chars]


def _simple_disease_keywords(text: str) -> List[str]:
    # Basic heuristic: search for disease names in text
    kws = {
        "early_blight": ["early blight", "alternaria"],
        "late_blight": ["late blight", "phytophthora", "infestans"],
        "septoria": ["septoria"],
        "leaf_mold": ["leaf mold", "passalora", "fulva"],
        "tylcv": ["yellow leaf curl", "tylcv", "begomovirus", "tomato yellow leaf curl"]
    }
    found = set()
    lower = text.lower()
    for k, v in kws.items():
        for token in v:
            if token in lower:
                found.add(k)
    return list(found)


def safety_check_text(text: str, region: Optional[str] = None) -> Dict[str, Any]:
    """Run basic safety checks on a text snippet.
    Flags dose-like patterns and forbidden chemicals.
    """
    flags = {"dose_present": False, "forbidden_chemical": False, "human_review": False, "matches": []}
    pattern = _SAFETY_RULES.get("dose_regex")
    if pattern:
        try:
            if _re.search(pattern, text, flags=_re.IGNORECASE):
                flags["dose_present"] = True
        except Exception:
            pass

    # check forbidden chemicals / whitelist
    forbidden = _SAFETY_RULES.get("forbidden_pesticides", []) or []
    whitelist = _SAFETY_RULES.get("chemical_whitelist", []) or []
    low = text.lower()
    for chem in forbidden:
        if chem.lower() in low:
            flags["forbidden_chemical"] = True
            flags["matches"].append(chem)

    # Determine if human review required
    if flags["dose_present"] and _SAFETY_RULES.get("require_human_review_if_dose_present", True):
        flags["human_review"] = True

    return flags