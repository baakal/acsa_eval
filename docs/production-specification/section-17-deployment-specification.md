# SECTION 17 — DEPLOYMENT SPECIFICATION

> Deployment diagram, environment topology table and the ordered scaling path:
> [§25.7](section-25-c4-architecture-diagrams.md#257-level-5--deployment). Four deployment details
> this section leaves implicit (web bundle hosting, bucket CORS, observability ingress, `beat`
> single-instance enforcement) are raised as AD-001..AD-004 in
> [§25.9](section-25-c4-architecture-diagrams.md#259-architectural-points-surfaced-by-the-model).

### 17.1 Docker Compose (All Environments)

The system is deployed entirely using Docker Compose. This is appropriate for development, staging, and production given the current scale. Horizontal scaling is achieved by running multiple API and worker replicas behind a reverse proxy.

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: acsa_eval
      POSTGRES_USER: acsa
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped

  keycloak:
    image: quay.io/keycloak/keycloak:24
    command: start
    environment:
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: ${KEYCLOAK_ADMIN_PASSWORD}
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://db:5432/acsa_keycloak
      KC_DB_USERNAME: acsa
      KC_DB_PASSWORD: ${POSTGRES_PASSWORD}
      KC_HOSTNAME: ${KEYCLOAK_HOSTNAME}
      KC_HTTPS_CERTIFICATE_FILE: /certs/tls.crt
      KC_HTTPS_CERTIFICATE_KEY_FILE: /certs/tls.key
    volumes:
      - ./certs:/certs:ro
    restart: unless-stopped
    depends_on:
      - db

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
    volumes:
      - minio_data:/data
    restart: unless-stopped

  clamd:
    image: clamav/clamav:stable
    volumes:
      - clamav_db:/var/lib/clamav
    restart: unless-stopped

  api:
    image: acsa-api:${APP_VERSION:-latest}
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql+asyncpg://acsa:${POSTGRES_PASSWORD}@db:5432/acsa_eval
      REDIS_URL: redis://redis:6379/0
      KEYCLOAK_URL: http://keycloak:8080
      KEYCLOAK_REALM: acsa
      KEYCLOAK_CLIENT_ID: acsa-api
      KEYCLOAK_CLIENT_SECRET: ${KEYCLOAK_CLIENT_SECRET}
      OBJECT_STORAGE_ENDPOINT: http://minio:9000
      OBJECT_STORAGE_ACCESS_KEY: ${MINIO_ACCESS_KEY}
      OBJECT_STORAGE_SECRET_KEY: ${MINIO_SECRET_KEY}
      OBJECT_STORAGE_BUCKET: acsa-evidence
      CLAMD_HOST: clamd
      CLAMD_PORT: 3310
      APP_ENV: ${APP_ENV:-production}
      LOG_LEVEL: ${LOG_LEVEL:-INFO}
      CORS_ORIGINS: ${CORS_ORIGINS}
    restart: unless-stopped
    depends_on:
      - db
      - redis
      - keycloak
      - minio
    deploy:
      replicas: 2   # scale up as needed

  worker:
    image: acsa-api:${APP_VERSION:-latest}
    command: celery -A app.workers.celery_app worker --loglevel=info -Q default,virus_scan,reports,notifications
    environment:
      # same as api service
      DATABASE_URL: postgresql+asyncpg://acsa:${POSTGRES_PASSWORD}@db:5432/acsa_eval
      REDIS_URL: redis://redis:6379/0
      OBJECT_STORAGE_ENDPOINT: http://minio:9000
      OBJECT_STORAGE_ACCESS_KEY: ${MINIO_ACCESS_KEY}
      OBJECT_STORAGE_SECRET_KEY: ${MINIO_SECRET_KEY}
      CLAMD_HOST: clamd
      CLAMD_PORT: 3310
    restart: unless-stopped
    depends_on:
      - db
      - redis
      - clamd
    deploy:
      replicas: 2

  beat:
    image: acsa-api:${APP_VERSION:-latest}
    command: celery -A app.workers.celery_app beat --loglevel=info
    environment:
      REDIS_URL: redis://redis:6379/0
    restart: unless-stopped
    depends_on:
      - redis
    deploy:
      replicas: 1   # must remain a single instance

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/certs:ro
    ports:
      - "80:80"
      - "443:443"
    restart: unless-stopped
    depends_on:
      - api

volumes:
  postgres_data:
  minio_data:
  clamav_db:
```

### 17.2 NGINX Configuration

NGINX acts as the TLS-terminating reverse proxy for all services:

```nginx
# nginx/nginx.conf
events {}
http {
  upstream api {
    server api:8000;
    # Add more api replicas here as needed
  }

  server {
    listen 80;
    return 301 https://$host$request_uri;
  }

  server {
    listen 443 ssl;
    ssl_certificate     /certs/tls.crt;
    ssl_certificate_key /certs/tls.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;

    client_max_body_size 10m;   # API payloads; evidence goes directly to MinIO

    location /api/ {
      proxy_pass         http://api;
      proxy_set_header   Host $host;
      proxy_set_header   X-Real-IP $remote_addr;
      proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header   X-Forwarded-Proto $scheme;
      proxy_read_timeout 60s;
    }

    location /health/ {
      proxy_pass http://api;
    }
  }
}
```

### 17.3 Environment Variables

Create a `.env` file (never commit to source control) from the provided `.env.example`:

```bash
# .env.example
POSTGRES_PASSWORD=change_me_in_production
KEYCLOAK_ADMIN_PASSWORD=change_me_in_production
KEYCLOAK_CLIENT_SECRET=change_me_in_production
KEYCLOAK_HOSTNAME=auth.your-domain.com
MINIO_ACCESS_KEY=change_me_in_production
MINIO_SECRET_KEY=change_me_in_production
CORS_ORIGINS=https://app.your-domain.com
APP_ENV=production
LOG_LEVEL=INFO
APP_VERSION=latest
```

### 17.4 Database Migrations

Alembic runs automatically on API container startup:

```dockerfile
# backend/Dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4"]
```

### 17.5 CI/CD Pipeline

```
Push to branch →
  1. Lint (ruff, eslint, mypy, tsc --noEmit)
  2. Unit tests (pytest, jest)
  3. pip-audit + npm audit (dependency scan)
  4. Trivy container scan
  5. Build Docker image

Merge to main →
  6. Integration tests (pytest with test DB)
  7. Alembic migration dry-run
  8. EAS Build (React Native)
  9. Deploy to staging (docker compose pull && docker compose up -d)
  10. E2E tests (Detox / Playwright)

Tag release →
  11. Deploy to production (docker compose pull && docker compose up -d)
  12. Smoke tests
  13. Notify deployment channel
```

### 17.6 Production Checklist

Before going live:

- [ ] Replace all `.env.example` placeholder values with strong random secrets.
- [ ] Configure TLS certificates (Let's Encrypt or corporate CA) in `./certs/`.
- [ ] Set Keycloak realm, client, and PKCE configuration.
- [ ] Run `docker compose up -d` and verify all containers are healthy.
- [ ] Run `docker compose exec api alembic upgrade head` to confirm migrations.
- [ ] Seed questionnaire version 1.0.0 from `catalogue.json`.
- [ ] Create initial ACSA Administrator account in Keycloak.
- [ ] Configure SMTP credentials for email notifications.
- [ ] Set up nightly PostgreSQL backup (`pg_dump` to separate volume or external store).
- [ ] Configure MinIO lifecycle policy for evidence retention.
- [ ] Verify health endpoints: `GET /health/live` and `GET /health/ready`.
- [ ] Confirm ClamAV virus definitions are current (`docker compose exec clamd freshclam`).

---
