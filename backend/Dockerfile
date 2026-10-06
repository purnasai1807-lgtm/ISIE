FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/backend \
    HOST=0.0.0.0 \
    PORT=3100 \
    ISIE_DATABASE_PATH=/data/isie.sqlite3

WORKDIR /app
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt \
    && mkdir -p /data \
    && chown 10001:10001 /data
COPY backend/isie_backend /app/backend/isie_backend
USER 10001:10001
EXPOSE 3100
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:3100/health', timeout=2)"
CMD ["python", "-m", "isie_backend.server"]
