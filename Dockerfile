# ═══════════════════════════════════════════════════════════════════════════
# Backend Only: Python FastAPI with ML models
# Frontend (website) is served separately on ICE Cloud
# ═══════════════════════════════════════════════════════════════════════════
FROM python:3.11-slim

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libsm6 \
    libxext6 \
    libxrender-dev \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy ML model — explicitly include it (not excluded by .dockerignore in backend context)
COPY CBAM_False_SUPCON_False_FISHR_False_DVD_False_best_test.pth ./

# Install Python dependencies (before source code for layer caching)
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r backend/requirements.txt

# Copy backend source code
COPY backend/ ./backend/

# Create runtime directories (will be overridden by volumes in production)
RUN mkdir -p /app/storage/gradcams /app/storage/models /app/uploads /app/datasets /app/logs

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=60s \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
