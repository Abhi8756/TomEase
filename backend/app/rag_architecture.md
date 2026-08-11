                    TOMATO DISEASE IMAGE
                            │
                            ▼
                 Your DL disease classifier
                            │
                 disease + confidence
                            │
             ┌──────────────┴──────────────┐
             │                             │
          Weather                       Location
             │                             │
             └──────────────┬──────────────┘
                            ▼
                     USER QUESTION
                            │
                            ▼
                  ┌─────────────────┐
                  │    RAG v2       │
                  │                 │
                  │ Dense Retrieval │
                  │      ↓          │
                  │ Hybrid Ranking  │
                  │      ↓          │
                  │ Cross Encoder   │
                  └────────┬────────┘
                           │
                     Top evidence
                           │
                           ▼
                  ┌─────────────────┐
                  │  Groq LLM       │
                  │  Llama model    │
                  └────────┬────────┘
                           │
                           ▼
                 Structured JSON answer
                           │
                           ▼
                    Safety checking
                           │
                           ▼
                    TomEase response