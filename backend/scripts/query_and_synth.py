from dotenv import load_dotenv
load_dotenv()
from backend.app.rag import RAGService
from backend.app.llm_client import synthesize_structured

q = "what are the symptomps of septoria and where are it found"
context = {"disease": "septoria", "region": "India", "topic": "symptoms"}
rag = RAGService()
try:
    rag._load_index()
except Exception:
    rag.build_index(force=False)

results = rag.query(q, top_k=5, context=context)
summary = rag.summarize_sources(results, max_chars=2000)
print('--- RAG SUMMARY ---')
print(summary)
print('\n--- SYNTHESIS ---')
s = synthesize_structured(summary)
import json
print(json.dumps(s, indent=2, ensure_ascii=False))
