import json
from backend.app.rag import RAGService

q = "what are the symptomps of septoria and where are it found"
# context: disease 'septoria'
context = {"disease": "septoria", "region": "India", "topic": "symptoms"}

rag = RAGService()
# try loading existing index, else build
try:
    rag._load_index()
except Exception:
    rag.build_index(force=False)

res = rag.query(q, top_k=5, context=context)
print('\n=== QUERY RESULTS ===')
print(json.dumps(res, ensure_ascii=False, indent=2))
