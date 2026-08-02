# SECTION 12 — API SPECIFICATION

### 12.1 Authentication

All endpoints except `/api/v1/auth/callback` and `/api/v1/health/*` require `Authorization: ******

```
POST   /api/v1/auth/callback
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
GET    /api/v1/auth/me
```

### 12.2 Core Endpoint Groups

```
GET/POST       /api/v1/users
GET/PUT        /api/v1/users/{id}

GET/POST       /api/v1/organizations
GET/PUT        /api/v1/organizations/{id}
POST           /api/v1/organizations/{id}/approve
GET/DELETE     /api/v1/organizations/{id}/members/{user_id}

POST/GET       /api/v1/invitations
GET            /api/v1/invitations/{token}
POST           /api/v1/invitations/{token}/accept

POST/GET       /api/v1/assessments
GET/PUT/DELETE /api/v1/assessments/{id}
GET            /api/v1/assessments/{id}/validation
POST           /api/v1/assessments/{id}/submit
POST           /api/v1/assessments/{id}/withdraw
POST           /api/v1/assessments/{id}/clone
GET/POST/PUT   /api/v1/assessments/{id}/members
GET/PUT        /api/v1/assessments/{id}/assignments

GET            /api/v1/assessments/{id}/responses
GET/PATCH      /api/v1/assessments/{id}/responses/{req_stable_id}
GET            /api/v1/assessments/{id}/responses/{req_stable_id}/history

POST           /api/v1/assessments/{id}/evidence/upload-url
POST           /api/v1/assessments/{id}/evidence/confirm
GET            /api/v1/assessments/{id}/evidence
GET            /api/v1/assessments/{id}/evidence/{ev_id}/download-url
PUT/DELETE     /api/v1/assessments/{id}/evidence/{ev_id}

POST/GET       /api/v1/reviews
PUT            /api/v1/reviews/{id}/assignments
GET/PUT        /api/v1/reviews/{id}/findings/{req_stable_id}
POST           /api/v1/reviews/{id}/complete

POST/GET       /api/v1/evidence-requests
GET            /api/v1/evidence-requests/{id}
POST           /api/v1/evidence-requests/{id}/responses
PUT            /api/v1/evidence-requests/{id}/outcome

GET/PUT        /api/v1/adjudications/{id}

POST           /api/v1/approvals
GET            /api/v1/approvals/{id}/certificate-url

GET            /api/v1/results/{assessment_id}
GET            /api/v1/results/{assessment_id}/scores

POST/GET       /api/v1/reports
GET            /api/v1/reports/{id}/download-url

GET            /api/v1/analytics/summary
GET            /api/v1/analytics/scores
GET            /api/v1/analytics/completion
GET            /api/v1/analytics/reviewer-workload

GET/POST/PUT   /api/v1/questionnaire-versions
POST           /api/v1/questionnaire-versions/{id}/publish
POST           /api/v1/questionnaire-versions/{id}/retire
GET/POST/PUT   /api/v1/questionnaire-versions/{id}/sections
GET/POST/PUT   /api/v1/questionnaire-versions/{id}/requirements
GET/PUT        /api/v1/questionnaire-versions/{id}/scoring
GET/PUT        /api/v1/questionnaire-versions/{id}/translations/{lang}

GET/POST       /api/v1/notifications
GET            /api/v1/audit-events
GET/PUT        /api/v1/settings
```

### 12.3 Response Autosave — Optimistic Concurrency

```
PATCH /api/v1/assessments/{id}/responses/{req_stable_id}
Header: If-Match: "3"

Request body:
{
  "compliance_code": "FULLY_MEETS",
  "operating_mode": "ONLINE",
  "depends_on_systems": false,
  "evidence_text": "See attached documentation",
  "notes": "Verified in UAT"
}

Response 200 → { "version": 4, ... }
Response 409 → { "current_version": 5, "current_state": { ... } }
```

### 12.4 Evidence Upload Flow

```
POST /api/v1/assessments/{id}/evidence/upload-url
{ "filename": "demo.pdf", "content_type": "application/pdf", "size_bytes": 2097152 }
→ { "upload_url": "...", "object_key": "evidence/...", "expires_at": "..." }

Client PUT → object_storage_url (directly, no server proxy)

POST /api/v1/assessments/{id}/evidence/confirm
{ "object_key": "evidence/...", "requirement_id": "uuid", "title": "..." }
→ { "evidence_id": "uuid", "scan_status": "PENDING" }
```

### 12.5 Pagination Standard

All list endpoints:
- Query: `?page=1&page_size=20&sort_by=created_at&sort_dir=desc`
- Response: `{ "data": [...], "pagination": { "page": 1, "page_size": 20, "total": 150, "total_pages": 8 } }`

### 12.6 Idempotency

`POST /submit`, `POST /approve`, `POST /invitations`, `POST /reports` accept `Idempotency-Key: {uuid}` header. Duplicate requests return cached response (cached 24 hours).

---
