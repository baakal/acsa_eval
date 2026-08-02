# SECTION 13 — NON-FUNCTIONAL REQUIREMENTS

### 13.1 Performance Targets

| Operation | Target P95 |
|---|---|
| Login redirect | < 200 ms |
| Dashboard load | < 1 s |
| Section load (208 requirements) | < 800 ms |
| Autosave PATCH | < 300 ms |
| Pre-signed URL generation | < 100 ms |
| Assessment submission | < 2 s |
| Report generation (PDF) | < 30 s (background) |
| Analytics dashboard | < 3 s |
| Concurrent users | 500 simultaneous |

### 13.2 Security Requirements

- **Transport**: TLS 1.2+ enforced. HSTS 1-year max-age.
- **Authentication**: OAuth 2.0 PKCE. Access tokens 15 min. Refresh tokens 24 h TTL (rolling 30 days).
- **Token storage**: Access token in memory only. Refresh token in `expo-secure-store` or HttpOnly SameSite=Strict cookie.
- **Authorization**: Every API endpoint has an explicit permission dependency.
- **Input validation**: All inputs validated with Pydantic. File types validated by content (not extension).
- **SQL injection**: Prevented by SQLAlchemy ORM parameterized queries.
- **Rate limiting**: Auth endpoints: 20 req/min per IP. General: 300 req/min per user.
- **Brute force**: Keycloak progressive lockout.
- **Malware scanning**: ClamAV mandatory on all uploads.
- **Security headers**: CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`.
- **Secrets management**: All secrets via environment variables. No secrets in code.
- **Dependency scanning**: `pip-audit` in CI pipeline.
- **Container scanning**: Trivy in CI/CD before deployment.
- **OWASP API Top 10**: Addressed via RLS + service-layer ownership checks, Keycloak auth delegation, explicit Pydantic response models, hardened headers.

### 13.3 Availability and Reliability

- **Target**: 99.5% uptime excluding planned maintenance.
- **RTO**: 4 hours. **RPO**: 1 hour (hourly backups + WAL archiving).
- **Backup**: Daily full PostgreSQL backup + continuous WAL archiving.
- **Graceful degradation**: If object storage is unavailable, uploads blocked with user message. Other functions continue.
- **Health endpoints**: `GET /health/live`, `GET /health/ready`.

### 13.4 Accessibility and Usability

- **Target**: WCAG 2.2 AA for web-compatible builds.
- Minimum touch target: 44×44 pt.
- Color is never the only indicator (icons + text accompany all color-coded results).
- Screen reader labels on all interactive elements.
- Minimum font size: 16sp body, 14sp secondary.
- Contrast: 4.5:1 (normal text), 3:1 (large text).
- RTL layout supported in design token system (enabled when Arabic is added).

### 13.5 Scalability

- **API**: Stateless FastAPI containers; scale horizontally via Docker replicas.
- **Database**: PgBouncer connection pooling. Read replica for analytics and reporting.
- **Cache**: Redis for session cache, questionnaire structure (TTL 1 h), analytics aggregates (TTL 15 min).
- **Workers**: Celery workers scaled independently.
- **Object storage**: S3-compatible, scales independently.

---
