# SECTION 10 — FASTAPI BACKEND ARCHITECTURE

> Component diagrams for this container: [§25.4.1 API](section-25-c4-architecture-diagrams.md#2541-api-application-components)
> and [§25.4.2 Worker](section-25-c4-architecture-diagrams.md#2542-background-worker-components).
> The layering rules in §10.2 are stated as enforceable invariants under §25.4.1.

### 10.1 Directory Structure

```
app/
├── main.py
├── core/
│   ├── config.py
│   ├── security.py
│   ├── logging.py
│   ├── exceptions.py
│   └── middleware.py
├── api/
│   ├── dependencies.py
│   └── v1/
│       └── routes/
│           ├── auth.py
│           ├── users.py
│           ├── organizations.py
│           ├── invitations.py
│           ├── assessed_systems.py
│           ├── questionnaires.py
│           ├── assessments.py
│           ├── responses.py
│           ├── evidence.py
│           ├── reviews.py
│           ├── evidence_requests.py
│           ├── adjudications.py
│           ├── approvals.py
│           ├── results.py
│           ├── reports.py
│           ├── analytics.py
│           ├── notifications.py
│           ├── content.py
│           ├── audit.py
│           └── settings.py
├── modules/
│   ├── identity/
│   ├── users/
│   ├── roles/
│   ├── organizations/
│   ├── questionnaires/
│   ├── assessments/
│   │   ├── service.py
│   │   ├── validation.py
│   │   └── transitions.py
│   ├── responses/
│   │   ├── service.py
│   │   └── scoring.py
│   ├── evidence/
│   │   ├── service.py
│   │   └── storage.py
│   ├── reviews/
│   ├── evidence_requests/
│   ├── adjudication/
│   ├── approvals/
│   ├── scoring/
│   │   └── engine.py
│   ├── results/
│   ├── reports/
│   │   └── generators/       # PDF (WeasyPrint), Excel (openpyxl)
│   ├── analytics/
│   ├── notifications/
│   ├── content/
│   ├── audit/
│   └── settings/
├── db/
│   ├── base.py
│   ├── session.py
│   └── migrations/           # Alembic
├── integrations/
│   ├── keycloak/
│   ├── object_storage/       # aioboto3, pre-signed URLs
│   ├── email/
│   └── antivirus/            # ClamAV
└── workers/
    ├── celery_app.py
    ├── tasks/
    │   ├── virus_scan.py
    │   ├── report_generation.py
    │   └── notification_dispatch.py
    └── beat_schedule.py
```

### 10.2 Key Architectural Decisions

- **No business logic in route handlers**: routes call service methods, return results.
- **Service layer owns transactions**: `async with session.begin()` in services.
- **Dependency injection**: `get_current_user`, `require_permission("ASM_SUBMIT")`, `get_assessment_or_404` all via FastAPI `Depends`.
- **Async I/O**: Database via `asyncpg` through SQLAlchemy 2.x async engine. Object storage via `aioboto3`.
- **Background tasks**: Report generation, virus scanning, email dispatch dispatched to Celery via Redis.
- **OpenAPI**: Auto-generated, exported as `openapi.json` for client SDK generation.
- **Versioning**: All routes under `/api/v1/`.
- **Health endpoints**: `GET /health/live`, `GET /health/ready` (checks DB + Redis + object storage).

### 10.3 Error Response Format

```json
{
  "error": {
    "code": "ASSESSMENT_INVALID_STATE",
    "message": "The assessment cannot be submitted in its current state.",
    "details": [
      { "field": "status", "issue": "Expected IN_PROGRESS, got SUBMITTED" }
    ],
    "trace_id": "01920f4e-7d9c-7a0c-8e1b-2d3e4f5a6b7c"
  }
}
```

Standard HTTP status codes: 200, 201, 204, 400, 401, 403, 404, 409, 422, 429, 500, 503.

---
