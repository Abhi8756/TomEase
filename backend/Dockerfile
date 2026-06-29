# Dockerfile for IceCloud deployment
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (required for OpenCV / GradCAM)
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/

# Create directories for local model + storage fallback
RUN mkdir -p /app/models /app/storage/gradcams /app/storage/models

# Expose port (IceCloud uses fixed port 8000)
EXPOSE 8000

# Health check — verifies the API is responding
HEALTHCHECK --interval=30s --timeout=15s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run application
# Note: IceCloud uses fixed port 8000 (no $PORT variable like Render)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
