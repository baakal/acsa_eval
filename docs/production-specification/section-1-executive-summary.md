# SECTION 1 — EXECUTIVE SUMMARY

### 1.1 Platform Purpose

The ACSA Self-Evaluation Portal enables countries, government institutions, and solution providers to evaluate a Civil Registration and Vital Statistics (CRVS) system against the ACSA (African Civil Registration and Statistics) requirements catalogue. Organizations complete structured self-assessments covering functional capabilities, non-functional qualities, interoperability, devices, and supporting evidence. ACSA reviewers then verify, adjudicate, and approve or reject the submission. The result is a scored, evidence-backed compliance record that informs decision-making about CRVS system deployment and certification.

### 1.2 Business Problem

African civil registration programmes and their technology partners have historically lacked a standardized, evidence-based method for determining whether a CRVS solution meets established requirements. Assessments were conducted through spreadsheets, email exchanges, and informal review processes. This created inconsistent evaluations, lost evidence, non-auditable decisions, and difficulty comparing solutions across countries. The portal provides a single authoritative, auditable workspace that replaces spreadsheet-driven processes.

### 1.3 Intended Users

| User Group | Representative | Primary Need |
|---|---|---|
| Country governments | Civil registration authority | Assess their national CRVS solution |
| Solution providers | Technology vendors | Demonstrate compliance to ACSA requirements |
| ACSA secretariat | Program reviewers | Review, verify, adjudicate, approve |
| ACSA administration | Platform administrators | Manage users, questionnaires, system |

### 1.4 Assessment Lifecycle (Summary)

A country or solution provider registers an organization, creates an assessment against a published questionnaire version, assigns team members to sections, answers all requirements with evidence, submits the assessment, receives reviewer feedback, provides additional evidence if requested, passes formal verification and adjudication, and obtains a formal approval decision with a downloadable certificate or report.

### 1.5 Production Architecture (Planned)

```
React Native (iOS, Android, Web)
        │
        ▼
FastAPI (REST/JSON, OpenAPI, versioned)
        │
   ┌────┴────┐
PostgreSQL  Object Storage (MinIO / S3-compatible)
        │
   Keycloak (OAuth 2.0 / OIDC)
        │
   Background Workers (Celery)
        │
   Email / Notification service
```

Deployed as Docker containers using Docker Compose. All configuration is database-driven. Questionnaire content, scoring rules, workflow transitions, and role permissions are managed through the administration interface without code changes.

### 1.6 Prototype vs. Production Differences

| Dimension | Prototype | Production |
|---|---|---|
| Framework | Next.js (React web) | React Native (iOS, Android, Web) |
| Backend | None — localStorage only | FastAPI + PostgreSQL |
| Authentication | SHA-256 password hash in localStorage | Keycloak / OAuth 2.0 / OIDC |
| Multi-user | No | Yes — teams, roles, assignments |
| Multi-assessment | No | Yes — per organization, multiple versions |
| Evidence storage | Base64 in localStorage (1.5 MB max) | S3-compatible object storage |
| Review workflow | Simulated inline | Full reviewer dashboard, evidence requests, adjudication |
| Questionnaire | Hard-coded JSON | Configuration-driven, versioned, translatable |
| Scoring | Fixed formula | Configurable scoring engine in database |
| Languages | English only | English, French, Portuguese (extendable) |
| Offline | None | Draft caching, sync queue |
| Audit | None | Immutable audit log |
| Reports | None | PDF, Excel, CSV exports |
| Analytics | Client-side tables | Server-side dashboards, cross-organization |

---
