# ─── Stage 1: Build React UI ──────────────────────────────────────────────────
FROM node:20-alpine AS ui-builder

WORKDIR /ui
COPY ui/package*.json ./
RUN npm ci --prefer-offline

COPY ui/ ./
RUN npm run build

# ─── Stage 2: Python runtime ──────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

# System deps (pymysql needs cryptography which needs gcc/musl at build time)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    default-libmysqlclient-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first (better layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY app/ ./app/
COPY alembic/ ./alembic/
COPY alembic.ini .
COPY main.py .

# Copy built UI from previous stage
COPY --from=ui-builder /ui/dist ./ui/dist

# Non-root user for security
RUN useradd -m appuser && chown -R appuser /app
USER appuser

EXPOSE ${APP_PORT:-8200}

CMD uvicorn main:app --host 0.0.0.0 --port ${APP_PORT:-8200}
