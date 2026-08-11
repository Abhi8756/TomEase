Local development notes

- Install local dev requirements (recommended):

  & ".venv\Scripts\python.exe" -m pip install -r backend/requirements-local.txt

  or to install the production requirements used by Docker:

  & ".venv\Scripts\python.exe" -m pip install -r backend/requirements.txt

- RAG / embeddings:
  - `sentence-transformers` provides the `all-MiniLM-L6-v2` embeddings used by the RAG pipeline.
  - If you get "No module named 'sentence_transformers'", install `sentence-transformers` into your venv.

- Database behaviour:
  - The app prefers a PostgreSQL `DATABASE_URL` when provided.
  - For local development, if the Postgres driver (`psycopg2`) is not installed or `DATABASE_URL` is unset, the app falls back to using a local SQLite file `tomato_disease.db` to avoid startup failures.
  - For production / IceCloud, set `DATABASE_URL` to your Postgres connection string and ensure the `psycopg2-binary` package is installed in the container.

- Docker notes (Dockerfile.standalone):
  - The Docker image installs Python packages from `backend/requirements.txt`. We added `sentence-transformers` and `PyMuPDF` to that file so the container will have the RAG dependencies.
  - FAISS may not have prebuilt wheels for all platforms; the Docker image currently does not force `faiss-cpu`. If you want FAISS, add it explicitly and test the build in CI.

- Environment variables to configure for production/IceCloud:
  - `DATABASE_URL` — Postgres connection string (preferred for production)
  - `GEMINI_API_KEY` or `OPENAI_API_KEY` — remote LLM credentials (optional)
  - `LLM_MODEL`, `LLM_API_URL` — override LLM provider or endpoint
  - `LLM_TEMPERATURE` — model temperature

- Safety reminder:
  - The RAG synthesizer and LLM client include safety checks: they will set `requires_human_review` when text contains dosage-like patterns or forbidden chemical names. Always review any chemical recommendations before publishing.
