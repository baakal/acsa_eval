# SECTION 18 — MONITORING AND OBSERVABILITY

### 18.1 Logging

- **Format**: Structured JSON via `structlog`. Every line includes: `timestamp`, `level`, `service`, `trace_id`, `user_id`, `organization_id`, `message`.
- **Log levels**: DEBUG (dev), INFO (staging/prod), WARNING for recoverable errors, ERROR for unexpected failures.
- **Sensitive data**: Never log passwords, tokens, PII beyond user_id, or file content.
- **Viewing logs**: `docker compose logs -f api`, `docker compose logs -f worker`.

### 18.2 Metrics (Prometheus)

Metrics exposed at `/metrics`:

| Metric | Type | Description |
|---|---|---|
| `http_requests_total` | Counter | Total HTTP requests by method, path, status |
| `http_request_duration_seconds` | Histogram | Request latency |
| `assessment_submissions_total` | Counter | Assessments submitted |
| `evidence_uploads_total` | Counter | Evidence files uploaded |
| `celery_task_duration_seconds` | Histogram | Background task duration by task name |
| `celery_task_failures_total` | Counter | Failed background tasks |
| `active_db_connections` | Gauge | Current DB connections in pool |
| `virus_scan_results_total` | Counter | Scan results by status |

Add a `prometheus` and `grafana` service to `docker-compose.yml` for a complete self-hosted monitoring stack:

```yaml
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    volumes:
      - grafana_data:/var/lib/grafana
    restart: unless-stopped
    depends_on:
      - prometheus
```

### 18.3 Key Alerts

| Alert | Condition | Severity |
|---|---|---|
| High error rate | HTTP 5xx > 1% over 5 min | Critical |
| API latency | P95 > 3 s over 5 min | Warning |
| Database connections | > 80% of pool | Warning |
| Failed background tasks | > 5 in 15 min | Warning |
| Quarantined files | Any | Info |
| Disk usage | > 80% | Warning |

---
