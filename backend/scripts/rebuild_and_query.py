from backend.app.rag import RAGService
import json

r = RAGService()
print('Building index...')
r.build_index(force=True)
print('Index built. Running sample queries...')
queries = [
    ("why are leaves yellowing", {"disease":"early_blight","region":"India","topic":"prevention"}),
    ("how to prevent late blight", {"disease":"late_blight","region":"India","topic":"prevention"}),
    ("TYLCV management", {"disease":"tylcv","region":"India","topic":"management"})
]
for q,ctx in queries:
    print('\n--- QUERY:', q, 'CONTEXT:', ctx)
    res = r.query(q, top_k=3, context=ctx)
    print(json.dumps(res, ensure_ascii=False, indent=2))
print('\nDone')
