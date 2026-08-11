import json, sys
import numpy as np

META_PATH = 'storage/vector_index/metadata.jsonl'
EMB_PATH = 'storage/vector_index/embeddings.npy'

try:
    meta = [json.loads(l) for l in open(META_PATH, 'r', encoding='utf-8')]
except Exception as e:
    print('ERROR: reading metadata:', e)
    sys.exit(2)

try:
    emb = np.load(EMB_PATH)
except Exception as e:
    print('ERROR: loading embeddings:', e)
    emb = None

print('metadata_count=', len(meta))
print('embeddings_shape=', None if emb is None else emb.shape)

if emb is None:
    sys.exit(0)

try:
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer('all-MiniLM-L6-v2')
    model_dim = model.get_sentence_embedding_dimension()
    print('model_dim=', model_dim)
except Exception as e:
    print('ERROR: initializing sentence-transformers model:', e)
    model = None

if model is None:
    sys.exit(0)

queries = [
    'why are leaves yellowing',
    'how to prevent late blight',
    'TYLCV management and prevention'
]

q_embs = model.encode(queries, convert_to_numpy=True)

# ensure embeddings are 2D
if emb.ndim == 1:
    emb = emb.reshape(1, -1)

emb_norms = np.linalg.norm(emb, axis=1)

for qi, q in enumerate(queries):
    qe = q_embs[qi]
    qn = np.linalg.norm(qe)
    sims = (emb @ qe) / (emb_norms * (qn + 1e-12))
    top_idx = np.argsort(-sims)[:10]
    print("\nQUERY:\",", q, "\"")
    for idx in top_idx:
        score = float(sims[idx])
        m = meta[idx]
        src = m.get('source','')
        text_snippet = m.get('text', '')[:160].replace('\n',' ')
        print(f"{idx}\t{score:.4f}\t{src}\tchunk_id={m.get('chunk_id',None)}\n  snippet={text_snippet}")

print('\nDone.')
