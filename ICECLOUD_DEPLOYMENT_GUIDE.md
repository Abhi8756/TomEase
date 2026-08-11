# 🧊 ICE Cloud — Complete Deployment Guide
> **Author:** Created from real deployment experience with AIMLP on `aimlp.icecloud.in`  
> **Platform:** [ICE Cloud (icecloud.in)](https://icecloud.in) — C-DAC High-Performance Cloud  
> **Pass this file to your AI agent** when starting any new project deployment on ICE Cloud.

---

## Table of Contents

1. [What is ICE Cloud?](#1-what-is-ice-cloud)
2. [Platform Architecture & Key Concepts](#2-platform-architecture--key-concepts)
3. [Prerequisites Before You Deploy](#3-prerequisites-before-you-deploy)
4. [How ICE Cloud Deployment Works](#4-how-ice-cloud-deployment-works)
5. [Step-by-Step: First-Time Deployment](#5-step-by-step-first-time-deployment)
6. [Project File Structure for ICE Cloud](#6-project-file-structure-for-ice-cloud)
7. [docker-compose.yml — ICE Cloud Pattern](#7-docker-composeyml--ice-cloud-pattern)
8. [Dockerfile Best Practices for ICE Cloud](#8-dockerfile-best-practices-for-ice-cloud)
9. [Nginx Configuration (Reverse Proxy + SSL)](#9-nginx-configuration-reverse-proxy--ssl)
10. [Environment Variables (.env)](#10-environment-variables-env)
11. [SSL / HTTPS with Let's Encrypt (Certbot)](#11-ssl--https-with-lets-encrypt-certbot)
12. [The deploy.sh Script](#12-the-deploysh-script)
13. [Useful Docker Commands on ICE Cloud](#13-useful-docker-commands-on-ice-cloud)
14. [Migrating from Render to ICE Cloud](#14-migrating-from-render-to-ice-cloud)
15. [Migrating from Railway to ICE Cloud](#15-migrating-from-railway-to-ice-cloud)
16. [Migrating from Heroku to ICE Cloud](#16-migrating-from-heroku-to-ice-cloud)
17. [Migrating from VPS (DigitalOcean/AWS EC2/Linode) to ICE Cloud](#17-migrating-from-vps-digitaloceanaws-ec2linode-to-ice-cloud)
18. [Common Pitfalls & Troubleshooting](#18-common-pitfalls--troubleshooting)
19. [Checklist: Is Your Project ICE Cloud Ready?](#19-checklist-is-your-project-ice-cloud-ready)

---

## 1. What is ICE Cloud?

**ICE Cloud** (Intelligent Cloud Environment) is a cloud computing platform built and operated by **C-DAC (Centre for Development of Advanced Computing)**, India's premier research institution.

| Property | Value |
|---|---|
| **Website** | https://icecloud.in |
| **Operated by** | C-DAC (Government of India) |
| **Primary audience** | Research, AI/ML, Bioinformatics, Scientific computing |
| **Deployment model** | Container-based (Docker) |
| **Infrastructure** | Dynamically provisioned CPU, Memory, GPU, Storage |
| **Domain pattern** | `yourproject.icecloud.in` (subdomain assigned per project) |
| **Access method** | SSH into the allocated VM/container |
| **OS on server** | Ubuntu (typically 20.04 / 22.04) |

### Why ICE Cloud over Render/Railway/Heroku?

- ✅ **No cold starts** — persistent VM, always running
- ✅ **Full root/SSH access** — complete control
- ✅ **Persistent volumes** — data survives restarts
- ✅ **Free for research/academic projects** (with C-DAC allocation)
- ✅ **Custom domain** like `yourapp.icecloud.in` provided
- ✅ **GPU access** available for AI/ML workloads
- ⚠️ **Manual setup required** — no auto-deploy from Git (unlike Render)
- ⚠️ **No managed databases** — you run Postgres/Redis inside Docker yourself

---

## 2. Platform Architecture & Key Concepts

### How ICE Cloud Works

ICE Cloud allocates you a **Linux VM** with a public IP. Your subdomain (e.g., `myapp.icecloud.in`) is pointed at that VM's IP. You SSH into it, install Docker, and run your containers there.

```
Internet
    │
    ▼
yourdomain.icecloud.in (DNS → your VM's public IP)
    │
    ▼
VM (Ubuntu, public IP)
    │
    ├── Docker Engine
    │       ├── nginx container  (ports 80, 443) ← reverse proxy
    │       ├── backend container (port 8000, internal only)
    │       ├── postgres container (port 5432, internal only)
    │       ├── redis container (port 6379, internal only)
    │       └── celery container (no port, worker)
    │
    └── Named Docker Volumes (persistent data)
            ├── postgres_data
            ├── redis_data
            ├── uploads_data
            └── ...
```

### Key Networking Rule

> **Only Nginx exposes ports 80/443 to the outside world.**  
> All other services (backend, postgres, redis) use `expose:` (not `ports:`) and communicate via Docker's internal network using service names as hostnames.

---

## 3. Prerequisites Before You Deploy

### On Your ICE Cloud VM (one-time setup)

SSH into your allocated VM and run:

```bash
# 1. Update system
sudo apt-get update && sudo apt-get upgrade -y

# 2. Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker

# 3. Install Docker Compose v2 (plugin)
sudo apt-get install -y docker-compose-plugin

# Verify
docker --version
docker compose version

# 4. Install git
sudo apt-get install -y git

# 5. Open firewall ports (if UFW is active)
sudo ufw allow 22   # SSH
sudo ufw allow 80   # HTTP
sudo ufw allow 443  # HTTPS
sudo ufw enable
```

### On Your Local Machine

- Git repository pushed to GitHub/GitLab
- `.env.example` file committed (never `.env`)
- `Dockerfile` and `docker-compose.yml` in repo root

---

## 4. How ICE Cloud Deployment Works

The deployment flow on ICE Cloud is entirely **manual and Docker-based**:

```
1. Push code to Git (GitHub/GitLab)
        ↓
2. SSH into ICE Cloud VM
        ↓
3. git clone or git pull
        ↓
4. Copy .env.example → .env and fill secrets
        ↓
5. Run: docker compose build
        ↓
6. (First time only) Obtain SSL cert via Certbot
        ↓
7. Run: docker compose up -d
        ↓
8. App is live at https://yourapp.icecloud.in
```

There is **no CI/CD pipeline by default**. You deploy manually using `deploy.sh` or by hand. You can set up GitHub Actions to SSH and run the deploy script automatically if needed.

---

## 5. Step-by-Step: First-Time Deployment

### Step 1: SSH into Your ICE Cloud VM

```bash
ssh ubuntu@<your-vm-ip>
# or if they gave you a specific user:
ssh your-user@yourapp.icecloud.in
```

### Step 2: Clone Your Repository

```bash
cd ~
git clone https://github.com/yourusername/yourproject.git
cd yourproject
```

### Step 3: Create and Fill the .env File

```bash
cp .env.example .env
nano .env
```

Fill in:
- `DOMAIN=yourapp.icecloud.in`
- `CERTBOT_EMAIL=your-email@example.com`
- `DB_PASSWORD=a-strong-random-password`
- `SECRET_KEY=` → generate with: `python3 -c "import secrets; print(secrets.token_hex(32))"`
- All other required secrets

### Step 4: Build Docker Images

```bash
docker compose build --no-cache
```

> ⚠️ This can take 5–15 minutes for large projects (e.g., those with PyTorch). Be patient.

### Step 5: First-Time SSL Setup (Run --init)

```bash
chmod +x deploy.sh
./deploy.sh --init
```

This will:
1. Start services in HTTP-only mode
2. Run Certbot to get a Let's Encrypt cert for `yourapp.icecloud.in`
3. Switch Nginx to HTTPS mode

### Step 6: Verify Everything

```bash
docker compose ps          # all services should be "healthy" or "running"
docker compose logs backend --tail=50
curl https://yourapp.icecloud.in/health
```

### Step 7: Subsequent Deployments (Updates)

```bash
cd ~/yourproject
git pull origin main
docker compose build       # only if Dockerfile/requirements changed
./deploy.sh                # or: docker compose up -d --remove-orphans
```

---

## 6. Project File Structure for ICE Cloud

```
yourproject/
├── Dockerfile              # Multi-stage: frontend builder → backend → nginx
├── docker-compose.yml      # All services orchestration
├── docker-compose.override.yml  # (optional) local dev overrides
├── .env.example            # Template — commit this ✅
├── .env                    # Real secrets — NEVER commit ❌
├── .dockerignore           # Exclude venv, node_modules, .git etc.
├── .gitignore              # Standard ignores
├── deploy.sh               # Production deployment script
├── nginx/
│   ├── nginx.conf          # HTTPS config (production)
│   └── nginx-init.conf     # HTTP-only config (for cert issuance)
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── ...
└── frontend/
    ├── package.json
    └── ...
```

---

## 7. docker-compose.yml — ICE Cloud Pattern

This is the proven pattern used in AIMLP. Adapt service names and images as needed.

```yaml
services:
  # ── Infrastructure ────────────────────────────────────────────────────

  postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER:     ${DB_USER:-admin}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-admin123}
      POSTGRES_DB:       ${DB_NAME:-myapp}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-admin} -d ${DB_NAME:-myapp}"]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 30s

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ── Application ────────────────────────────────────────────────────────

  backend:
    build:
      context: .
      dockerfile: Dockerfile
      target: backend        # multi-stage target name
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    env_file: .env
    environment:
      # Override to use Docker service names (not localhost!)
      DATABASE_URL: "postgresql://${DB_USER:-admin}:${DB_PASSWORD:-admin123}@postgres:5432/${DB_NAME:-myapp}"
      REDIS_URL:    "redis://redis:6379/0"
    volumes:
      - uploads_data:/app/uploads
      - datasets_data:/app/datasets
      - models_data:/app/trained_models
      - logs_data:/app/logs
    expose:
      - "8000"               # internal only — NOT ports:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 60s

  celery:                    # Background task worker (omit if not needed)
    build:
      context: .
      dockerfile: Dockerfile
      target: backend
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    env_file: .env
    environment:
      DATABASE_URL: "postgresql://${DB_USER:-admin}:${DB_PASSWORD:-admin123}@postgres:5432/${DB_NAME:-myapp}"
      REDIS_URL:    "redis://redis:6379/0"
    volumes:
      - uploads_data:/app/uploads
      - models_data:/app/trained_models
    command: >
      python -m celery -A backend.celery_app.celery_app worker
      --loglevel=info
      --pool=solo
      --concurrency=1

  # ── Reverse Proxy / Frontend ───────────────────────────────────────────

  nginx:
    build:
      context: .
      dockerfile: Dockerfile
      target: nginx
    restart: unless-stopped
    depends_on:
      backend:
        condition: service_healthy
    ports:
      - "80:80"              # Only Nginx exposes ports!
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - certbot_conf:/etc/letsencrypt:ro
      - certbot_www:/var/www/certbot:ro

  # ── SSL Certificate Management ─────────────────────────────────────────

  certbot:
    image: certbot/certbot:latest
    profiles:
      - certbot             # Only runs when explicitly invoked
    volumes:
      - certbot_conf:/etc/letsencrypt
      - certbot_www:/var/www/certbot
    command: >
      certonly --webroot
      --webroot-path=/var/www/certbot
      --email ${CERTBOT_EMAIL:-admin@example.com}
      --agree-tos
      --no-eff-email
      --force-renewal
      -d ${DOMAIN:-yourapp.icecloud.in}

# ── Named Volumes (persistent across container restarts) ──────────────

volumes:
  postgres_data:
  redis_data:
  uploads_data:
  datasets_data:
  models_data:
  logs_data:
  certbot_conf:
  certbot_www:
```

### Critical Rules for ICE Cloud docker-compose

| Rule | Why |
|---|---|
| Use `expose:` not `ports:` for backend/db/redis | Security — internal services must NOT be public |
| Always set `restart: unless-stopped` | VM reboots should auto-restart your app |
| Always use `healthcheck:` on postgres/redis | Prevents backend starting before DB is ready |
| Use `depends_on: condition: service_healthy` | Waits for healthcheck, not just container start |
| Use named volumes, not bind mounts, for data | Bind mounts fail if path doesn't exist on VM |
| Override `DATABASE_URL` and `REDIS_URL` in compose | Use Docker service names, not `localhost` |

---

## 8. Dockerfile Best Practices for ICE Cloud

### Multi-Stage Dockerfile Pattern

```dockerfile
# ═══════════════════════════════════════════════
# Stage 1 — Build React/Next.js frontend
# ═══════════════════════════════════════════════
FROM node:20-slim AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --prefer-offline
COPY frontend/ ./
RUN npm run build

# ═══════════════════════════════════════════════
# Stage 2 — Python backend (FastAPI / Django / Flask)
# ═══════════════════════════════════════════════
FROM python:3.11-slim AS backend

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies BEFORE copying source (layer caching)
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --upgrade pip \
    && pip install --no-cache-dir -r backend/requirements.txt

COPY backend/ ./backend/

# Create runtime directories (will be overridden by volumes)
RUN mkdir -p /app/uploads /app/datasets /app/trained_models /app/logs

EXPOSE 8000
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]

# ═══════════════════════════════════════════════
# Stage 3 — Nginx serving the React static build
# ═══════════════════════════════════════════════
FROM nginx:1.25-alpine AS nginx

COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html
RUN rm /etc/nginx/conf.d/default.conf

EXPOSE 80 443
```

### .dockerignore (essential for fast builds)

```
# Python
__pycache__/
*.py[cod]
*.egg-info/
.venv/
venv/
.env

# Node
node_modules/
frontend/.next/
frontend/dist/
frontend/build/

# Git and IDE
.git/
.gitignore
.vscode/
.idea/

# Logs and data
logs/
*.log
uploads/
datasets/
trained_models/

# OS
.DS_Store
Thumbs.db
```

---

## 9. Nginx Configuration (Reverse Proxy + SSL)

### nginx-init.conf (HTTP only — used during first SSL cert issuance)

```nginx
events { worker_connections 1024; }

http {
    server {
        listen 80;
        server_name yourapp.icecloud.in;

        # ACME challenge for Let's Encrypt
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        # Proxy to backend (for health checks during init)
        location /api/ {
            proxy_pass http://backend:8000/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        location / {
            root /usr/share/nginx/html;
            try_files $uri $uri/ /index.html;
        }
    }
}
```

### nginx.conf (Full HTTPS — after cert is issued)

```nginx
events { worker_connections 1024; }

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    sendfile      on;
    keepalive_timeout 65;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # Redirect HTTP → HTTPS
    server {
        listen 80;
        server_name yourapp.icecloud.in;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$host$request_uri;
        }
    }

    # Main HTTPS server
    server {
        listen 443 ssl;
        server_name yourapp.icecloud.in;

        ssl_certificate     /etc/letsencrypt/live/yourapp.icecloud.in/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/yourapp.icecloud.in/privkey.pem;
        ssl_protocols       TLSv1.2 TLSv1.3;
        ssl_ciphers         HIGH:!aNULL:!MD5;

        # API — proxy to backend container
        location /api/ {
            proxy_pass         http://backend:8000/;
            proxy_http_version 1.1;
            proxy_set_header   Upgrade $http_upgrade;
            proxy_set_header   Connection 'upgrade';
            proxy_set_header   Host $host;
            proxy_set_header   X-Real-IP $remote_addr;
            proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header   X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            proxy_read_timeout 300s;       # For long ML training requests
            proxy_connect_timeout 75s;
        }

        # Frontend static files (React/Vue/Angular build output)
        location / {
            root  /usr/share/nginx/html;
            index index.html;
            try_files $uri $uri/ /index.html;  # SPA routing
        }

        # Increase upload size for ML datasets
        client_max_body_size 500M;
    }
}
```

> **Key insight:** The `proxy_pass http://backend:8000/;` uses `backend` as the hostname — this is the Docker service name, resolved automatically within Docker's internal network.

---

## 10. Environment Variables (.env)

### Template `.env.example` to commit to Git

```bash
# ─── Domain ───────────────────────────────────────────────────────────────
DOMAIN=yourapp.icecloud.in
CERTBOT_EMAIL=your-email@example.com

# ─── Database ─────────────────────────────────────────────────────────────
DB_HOST=postgres
DB_PORT=5432
DB_NAME=myapp_db
DB_USER=admin
DB_PASSWORD=CHANGE-THIS-STRONG-PASSWORD

# Override to use a managed DB (optional):
# DATABASE_URL=postgresql://user:pass@managed-host:5432/myapp_db

# ─── Redis ────────────────────────────────────────────────────────────────
REDIS_URL=redis://redis:6379/0

# ─── Auth / Security ──────────────────────────────────────────────────────
# Generate with: python3 -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY=CHANGE-THIS-TO-A-RANDOM-SECRET-IN-PRODUCTION
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# ─── CORS ─────────────────────────────────────────────────────────────────
FRONTEND_ORIGINS=https://yourapp.icecloud.in,http://localhost:5173

# ─── Storage ──────────────────────────────────────────────────────────────
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE=500000000
```

### Rules for .env on ICE Cloud

1. **Never commit `.env`** — add it to `.gitignore`
2. **Create it manually on the server** via `cp .env.example .env && nano .env`
3. **Regenerate `SECRET_KEY`** for production — never use the example value
4. **`DATABASE_URL` is overridden** in `docker-compose.yml` to use the `postgres` service name
5. **`REDIS_URL` is overridden** in `docker-compose.yml` to use `redis://redis:6379/0`

---

## 11. SSL / HTTPS with Let's Encrypt (Certbot)

### First-Time Certificate Issuance

ICE Cloud VMs have public IPs with your subdomain already pointed. So Let's Encrypt can verify you own `yourapp.icecloud.in`.

```bash
# Step 1: Start without Nginx (or HTTP-only Nginx)
docker compose up -d postgres redis backend

# Step 2: Start Nginx in HTTP-only mode
# (use nginx-init.conf mounted as nginx.conf)
docker compose up -d nginx

# Step 3: Run certbot
docker compose --profile certbot run --rm certbot

# Step 4: Switch nginx to HTTPS config and restart
docker compose restart nginx
```

### Certificate Renewal

Certbot certificates expire every 90 days. Set up a cron job on the VM:

```bash
# Add to crontab (crontab -e)
0 3 * * * cd /home/ubuntu/yourproject && docker compose --profile certbot run --rm certbot && docker compose exec nginx nginx -s reload >> /var/log/certbot-renew.log 2>&1
```

### Certificate File Paths (inside container)

```
/etc/letsencrypt/live/yourapp.icecloud.in/fullchain.pem    ← ssl_certificate
/etc/letsencrypt/live/yourapp.icecloud.in/privkey.pem      ← ssl_certificate_key
```

These are stored in the Docker named volume `certbot_conf` (mapped to `/etc/letsencrypt`).

---

## 12. The deploy.sh Script

Every ICE Cloud project should have a `deploy.sh` script at the root. Here is the production-ready template:

```bash
#!/usr/bin/env bash
# deploy.sh — Production deployment for yourapp.icecloud.in
# Usage:
#   ./deploy.sh --init    # First-time: get SSL cert
#   ./deploy.sh           # Normal update

set -euo pipefail

DOMAIN="yourapp.icecloud.in"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INIT_MODE=false

for arg in "$@"; do
    case $arg in
        --init) INIT_MODE=true ;;
        *) echo "Unknown argument: $arg"; exit 1 ;;
    esac
done

cd "$SCRIPT_DIR"

# ── Pre-flight checks ──────────────────────────────────────────────────
if [ ! -f ".env" ]; then
    echo "❌  ERROR: .env file not found."
    echo "    Run: cp .env.example .env && nano .env"
    exit 1
fi

if grep -q "CHANGE-THIS" .env; then
    echo "⚠️  WARNING: .env still has placeholder values!"
    read -rp "Continue anyway? (y/N): " confirm
    [[ "$confirm" =~ ^[Yy]$ ]] || exit 1
fi

# ── Pull latest code ───────────────────────────────────────────────────
echo "📥  Pulling latest code..."
git pull origin main

# ── Build images ───────────────────────────────────────────────────────
echo "🔨  Building Docker images..."
docker compose build --no-cache

# ── Deploy ─────────────────────────────────────────────────────────────
if [ "$INIT_MODE" = true ]; then
    echo "🔐  INIT: Getting Let's Encrypt certificate for $DOMAIN..."

    docker compose up -d postgres redis backend
    echo "    Waiting for backend..."
    timeout 120 bash -c 'until docker compose exec -T backend curl -sf http://localhost:8000/health; do sleep 3; done'

    docker compose up -d nginx
    docker compose --profile certbot run --rm certbot

    echo "✅  Certificate obtained! Restarting Nginx with HTTPS..."
    docker compose restart nginx
else
    echo "🚀  Deploying all services..."
    docker compose up -d --remove-orphans
fi

# ── Health check ───────────────────────────────────────────────────────
echo ""
echo "🏥  Health checks:"
sleep 5
docker compose ps
echo ""
echo "✅  Deployed: https://$DOMAIN"
echo ""
echo "Commands:"
echo "  docker compose logs -f backend"
echo "  docker compose logs -f celery"
echo "  docker compose ps"
echo "  docker compose down"
```

---

## 13. Useful Docker Commands on ICE Cloud

```bash
# ─── View running services ──────────────────────────────────────
docker compose ps

# ─── Stream logs ────────────────────────────────────────────────
docker compose logs -f backend
docker compose logs -f celery
docker compose logs -f nginx
docker compose logs -f postgres

# ─── Restart a single service ───────────────────────────────────
docker compose restart backend
docker compose restart nginx

# ─── Stop all services ──────────────────────────────────────────
docker compose down

# ─── Stop and delete volumes (DESTRUCTIVE — wipes database!) ────
docker compose down -v

# ─── Rebuild a single service ───────────────────────────────────
docker compose build backend
docker compose up -d backend

# ─── Open a shell inside a container ────────────────────────────
docker compose exec backend bash
docker compose exec postgres psql -U admin -d myapp_db

# ─── Run DB migrations inside the backend container ─────────────
docker compose exec backend python -m alembic upgrade head

# ─── Check disk usage ───────────────────────────────────────────
docker system df
docker volume ls

# ─── Clean up unused images (safe to run) ───────────────────────
docker image prune -f --filter "until=24h"

# ─── View container resource usage ──────────────────────────────
docker stats

# ─── Backup Postgres DB ─────────────────────────────────────────
docker compose exec postgres pg_dump -U admin myapp_db > backup_$(date +%Y%m%d).sql

# ─── Restore Postgres DB ────────────────────────────────────────
cat backup.sql | docker compose exec -T postgres psql -U admin myapp_db
```

---

## 14. Migrating from Render to ICE Cloud

Render is a PaaS that auto-deploys from Git with managed databases. ICE Cloud is a raw VM — you manage everything yourself.

### Key Differences: Render vs ICE Cloud

| Feature | Render | ICE Cloud |
|---|---|---|
| Deploy trigger | Push to Git (automatic) | SSH + `./deploy.sh` (manual) |
| Database | Managed PostgreSQL | Self-hosted in Docker |
| Redis | Managed Redis | Self-hosted in Docker |
| SSL | Auto (managed) | Manual (Certbot) |
| Domain | `yourapp.onrender.com` | `yourapp.icecloud.in` |
| Logs | Render dashboard | `docker compose logs` |
| Env vars | Render dashboard UI | `.env` file on server |
| Scaling | Slider in UI | Adjust Docker resources |
| Cold starts | Yes (free tier) | No |
| File uploads | Ephemeral (use S3) | Persistent (Docker volume) |

### Migration Steps: Render → ICE Cloud

#### Step 1: Export Environment Variables from Render

In Render dashboard → Your Service → Environment → copy all env vars into your `.env` file on the ICE Cloud VM.

#### Step 2: Update Database Connection String

**Render** gives you a `DATABASE_URL` like:
```
postgresql://user:pass@dpg-xxxxx.render.com:5432/mydb
```

**ICE Cloud** uses a local Dockerized Postgres:
```bash
# In .env
DB_USER=admin
DB_PASSWORD=your-strong-password
DB_NAME=myapp_db

# docker-compose.yml overrides DATABASE_URL to:
DATABASE_URL=postgresql://admin:your-strong-password@postgres:5432/myapp_db
```

#### Step 3: Export and Import Your Data

On Render:
```bash
# Get your Render Postgres connection string from dashboard
pg_dump "postgresql://user:pass@render-host/dbname" > render_backup.sql

# Copy to ICE Cloud VM
scp render_backup.sql ubuntu@your-vm-ip:~/yourproject/
```

On ICE Cloud:
```bash
# Start just postgres
docker compose up -d postgres
sleep 10

# Import data
cat render_backup.sql | docker compose exec -T postgres psql -U admin -d myapp_db
```

#### Step 4: Handle File Uploads

Render's filesystem is **ephemeral** — if you were using local file storage on Render, your files may already be gone. For ICE Cloud:
- Files go into Docker named volumes (`uploads_data`, etc.)
- These **persist** across container restarts
- Optional: migrate to Cloudflare R2 / AWS S3 for durability

#### Step 5: Update CORS Origins

```bash
# .env
FRONTEND_ORIGINS=https://yourapp.icecloud.in,http://localhost:5173
```

Remove `yourapp.onrender.com` from allowed origins.

#### Step 6: Update DNS / Tell Users New URL

ICE Cloud uses `yourapp.icecloud.in`. Update:
- Frontend API base URL
- OAuth callback URLs (Google, GitHub, etc.)
- Any webhook URLs registered with external services

#### Step 7: Remove Render-Specific Files

Render uses a `render.yaml` file:
```bash
rm render.yaml  # not needed on ICE Cloud
```

---

## 15. Migrating from Railway to ICE Cloud

### Key Differences: Railway vs ICE Cloud

| Feature | Railway | ICE Cloud |
|---|---|---|
| Deploy | Git push (automatic) | SSH + deploy.sh (manual) |
| Database | Plugin (managed) | Docker container |
| Networking | Private network auto | Docker internal network |
| Env vars | Railway dashboard | .env file |
| Domains | `*.railway.app` or custom | `*.icecloud.in` |

### Migration Steps: Railway → ICE Cloud

#### Step 1: Export Railway Environment Variables

```bash
# Using Railway CLI
railway variables
```

Copy all variables to your `.env` file on the ICE Cloud server.

#### Step 2: Export Railway Database

```bash
# From Railway dashboard: get the DATABASE_URL
pg_dump "$RAILWAY_DATABASE_URL" > railway_backup.sql

# Transfer and import on ICE Cloud
scp railway_backup.sql ubuntu@vm-ip:~/yourproject/
cat railway_backup.sql | docker compose exec -T postgres psql -U admin -d myapp_db
```

#### Step 3: Remove railway.json / Procfile

Railway-specific files you can delete:
```bash
rm railway.json     # if exists
rm Procfile         # Railway/Heroku-style
```

Replace with `docker-compose.yml` (see Section 7).

#### Step 4: Update Service URLs

Railway gives each service a private hostname. Replace with Docker service names:
- `your-db.railway.internal` → `postgres`  
- `your-redis.railway.internal` → `redis`

---

## 16. Migrating from Heroku to ICE Cloud

### Key Differences: Heroku vs ICE Cloud

| Feature | Heroku | ICE Cloud |
|---|---|---|
| Config | Heroku Config Vars | .env file |
| DB | Heroku Postgres (addon) | Docker Postgres |
| Dynos | Process types in Procfile | Docker services |
| Deploy | Git push `heroku` | SSH + deploy.sh |
| Buildpacks | Automatic | Dockerfile |

### Migration Steps: Heroku → ICE Cloud

#### Step 1: Export Heroku Config Vars

```bash
heroku config -a your-app-name
# Copy all output to .env on ICE Cloud
```

#### Step 2: Export Heroku Postgres

```bash
heroku pg:backups:capture -a your-app-name
heroku pg:backups:download -a your-app-name
# This gives you latest.dump

# Convert pg_dump format
pg_restore --no-owner -d "postgresql://admin:pass@localhost:5432/myapp_db" latest.dump
```

#### Step 3: Convert Procfile to docker-compose.yml

**Heroku Procfile:**
```
web: uvicorn main:app --host 0.0.0.0 --port $PORT
worker: celery -A tasks worker --loglevel=info
```

**ICE Cloud docker-compose.yml equivalent:**
```yaml
services:
  backend:
    # ... build config ...
    command: uvicorn backend.main:app --host 0.0.0.0 --port 8000

  celery:
    # ... same build config ...
    command: python -m celery -A backend.celery_app worker --loglevel=info
```

#### Step 4: Handle Heroku's PORT Variable

Heroku injects `PORT` dynamically. ICE Cloud uses fixed port `8000` internally (Nginx handles external port mapping). Remove `$PORT` references — hardcode `8000` in your app and Dockerfile.

---

## 17. Migrating from VPS (DigitalOcean/AWS EC2/Linode) to ICE Cloud

If you're already on a VPS, migration is the most straightforward since ICE Cloud is also a VM.

### Steps

1. **SSH into both servers simultaneously**

2. **On old server:** Dump database, tar up volumes
   ```bash
   docker compose exec postgres pg_dump -U admin myapp_db > backup.sql
   tar czf volumes.tar.gz ./uploads ./datasets
   ```

3. **Transfer to ICE Cloud VM:**
   ```bash
   scp backup.sql ubuntu@new-vm-ip:~/yourproject/
   scp volumes.tar.gz ubuntu@new-vm-ip:~/yourproject/
   ```

4. **On ICE Cloud:** Extract and import
   ```bash
   tar xzf volumes.tar.gz
   docker compose up -d postgres
   cat backup.sql | docker compose exec -T postgres psql -U admin -d myapp_db
   ```

5. **Update DNS** to point domain to ICE Cloud VM IP

6. **Run `./deploy.sh --init`** to get SSL cert

---

## 18. Common Pitfalls & Troubleshooting

### ❌ "Cannot connect to database" after `docker compose up`

**Cause:** Backend started before Postgres was ready.  
**Fix:** Ensure `depends_on: condition: service_healthy` and a `healthcheck` on the postgres service. Never use `condition: service_started`.

### ❌ "Connection refused" on port 5432/6379

**Cause:** You're trying to connect to Postgres/Redis from OUTSIDE Docker using `localhost`. These services only expose within the Docker network.  
**Fix:** Connect using the service name from WITHIN another container (e.g., `postgres:5432`). Use `ports:` only if you need external access (not recommended in production).

### ❌ "502 Bad Gateway" from Nginx

**Cause:** Nginx is up but backend container crashed or isn't running.  
**Fix:**
```bash
docker compose ps          # Is backend running?
docker compose logs backend  # What error occurred?
docker compose restart backend
```

### ❌ SSL certificate not found

**Cause:** Certbot wasn't run yet, or ran but failed.  
**Fix:** Run `./deploy.sh --init`. Ensure port 80 is open in UFW firewall. Ensure DNS points to your VM IP.

### ❌ Build takes too long (PyTorch/ML projects)

**Cause:** Large ML packages being downloaded every build.  
**Fix:** Install CPU-only torch first before `requirements.txt`:
```dockerfile
RUN pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
RUN pip install -r requirements.txt
```

### ❌ "No space left on device"

**Cause:** Docker images, build cache, and logs filling disk.  
**Fix:**
```bash
docker system prune -f          # Remove stopped containers, unused networks, dangling images
docker image prune -a -f        # Remove ALL unused images (careful!)
docker volume prune -f          # Remove unused volumes (CAREFUL — data loss!)
```

### ❌ Frontend gets 404 on page refresh (SPA routing)

**Cause:** Nginx doesn't know about React/Vue client-side routes.  
**Fix:** Add `try_files $uri $uri/ /index.html;` in your Nginx location block.

### ❌ File uploads lost after container restart

**Cause:** Using a bind mount to a path that doesn't exist, or using container filesystem (no volume).  
**Fix:** Use named Docker volumes:
```yaml
volumes:
  - uploads_data:/app/uploads
```
And declare `uploads_data:` under the top-level `volumes:` key.

### ❌ "CORS error" from frontend

**Cause:** Your backend allows `yourapp.onrender.com` but not `yourapp.icecloud.in`.  
**Fix:** Update `FRONTEND_ORIGINS` in `.env`:
```bash
FRONTEND_ORIGINS=https://yourapp.icecloud.in
```

---

## 19. Checklist: Is Your Project ICE Cloud Ready?

Run through this before deploying a new project:

### Code Preparation
- [ ] `Dockerfile` with multi-stage build (frontend builder + backend + nginx)
- [ ] `.dockerignore` excludes `node_modules`, `.venv`, `.git`, uploads, datasets
- [ ] `docker-compose.yml` with all services, healthchecks, named volumes
- [ ] `.env.example` committed to Git (with placeholder values, never real secrets)
- [ ] `.env` is in `.gitignore`
- [ ] `nginx/nginx.conf` (HTTPS config) and `nginx/nginx-init.conf` (HTTP-only) present
- [ ] `deploy.sh` script with `--init` flag support
- [ ] Backend has a `/health` endpoint returning `{"status": "ok"}`

### Configuration
- [ ] `DOMAIN` in `.env` set to `yourapp.icecloud.in`
- [ ] `CERTBOT_EMAIL` set to a real email
- [ ] `SECRET_KEY` generated with `python3 -c "import secrets; print(secrets.token_hex(32))"`
- [ ] `DB_PASSWORD` is a strong random string
- [ ] `DATABASE_URL` overridden in `docker-compose.yml` to use `postgres` hostname
- [ ] `REDIS_URL` overridden to use `redis://redis:6379/0`
- [ ] `FRONTEND_ORIGINS` includes `https://yourapp.icecloud.in`
- [ ] `client_max_body_size` in Nginx set appropriately (e.g., 500M for ML projects)

### Server Setup
- [ ] Docker and Docker Compose v2 installed on VM
- [ ] Git installed on VM
- [ ] UFW allows ports 22, 80, 443
- [ ] Repository cloned to VM
- [ ] `.env` file created and filled on VM
- [ ] `deploy.sh` made executable: `chmod +x deploy.sh`

### First Deploy
- [ ] `docker compose build` completes without errors
- [ ] `./deploy.sh --init` runs successfully
- [ ] `docker compose ps` shows all services as healthy
- [ ] `https://yourapp.icecloud.in` loads in browser
- [ ] SSL certificate is valid (padlock in browser)
- [ ] API endpoints work (e.g., `https://yourapp.icecloud.in/api/health`)
- [ ] Cert renewal cron job configured

---

## Quick Reference Card

```
🌐 Domain:      yourapp.icecloud.in
🖥️  Server:      Ubuntu VM (C-DAC ICE Cloud)
🐳 Runtime:     Docker + Docker Compose v2
🔒 SSL:         Let's Encrypt via Certbot
🗄️  Database:   Postgres 15 (Docker container)
⚡ Cache:        Redis 7 (Docker container)
🌐 Proxy:       Nginx (ports 80/443)
📦 Backend:     FastAPI/Django/Flask (internal port 8000)
🖼️  Frontend:    React/Vue/Angular (served by Nginx as static files)

First deploy:   ./deploy.sh --init
Update:         git pull && ./deploy.sh
Logs:           docker compose logs -f backend
Shell:          docker compose exec backend bash
DB backup:      docker compose exec postgres pg_dump -U admin myapp_db > backup.sql
```

---

*Last updated: June 2026 | Based on AIMLP deployment at `aimlp.icecloud.in`*
