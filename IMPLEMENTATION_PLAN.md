# ACSA Evaluation Tool — Prototype to Production Implementation Plan

This document is the living roadmap for evolving the ACSA Evaluation Tool from its current
browser-only prototype into a production-grade, multi-user, server-backed application.
Update it as sprints are completed and priorities shift.

---

## Current State (Prototype)

| Aspect | Status |
|---|---|
| Framework | Next.js (App Router), TypeScript, React |
| Persistence | `localStorage` only (single browser, single machine) |
| Auth | Client-side SHA-256 hash stored in `localStorage` |
| Multi-user | No — all data is private to one browser |
| File storage | Base64 in `localStorage` (fragile, ~5–10 MB cap) |
| Deployment | Static export, no server required |
| Tests | None |
| CI/CD | None |

### Key files
```
app/
  page.tsx              — monolithic ~550-line main component (Home + Assessment + Analytics)
  auth.tsx              — client-side register/login, stores accounts in localStorage
  use-persistent-state.ts — thin wrapper around localStorage (THE only file that changes for backend)
  catalogue.json        — 208 ACSA requirements (static, read-only)
  layout.tsx            — root layout
  *.css                 — component styles
```

---

## Target State (Production)

- Server-backed persistence (PostgreSQL via Prisma)
- Secure server-side authentication (NextAuth.js with credential provider + bcrypt)
- Role-enforced UI (Country reviewer vs Solution Provider)
- Real-time shared workspace per assessment
- File attachments stored on disk / object storage (not base64 in browser)
- Export to XLSX matching the official workbook format
- Admin dashboard across all assessments
- CI/CD pipeline with lint, typecheck, and tests on every PR
- Deployable to any Node.js host (Vercel, Railway, self-hosted Docker)

---

## Sprint 0 — Foundations (Pre-work, no user-visible changes)

**Goal:** Set up the project structure, tooling, and database so all future sprints build on solid ground.

### 0.1 — Component decomposition (refactor `page.tsx`)
Split the monolithic `page.tsx` into focused components. No behaviour changes.

```
app/
  components/
    HomeView.tsx
    AssessmentView.tsx
    AnalyticsView.tsx
    Navigator.tsx
    RequirementDetail.tsx
    AuthScreen.tsx        ← move from auth.tsx
  hooks/
    useAnswers.ts
    useCategorySubmissions.ts
    useScoring.ts
  lib/
    scoring.ts            ← pure functions: isAnswerComplete, complianceScore, etc.
    types.ts              ← all shared TypeScript types
    config.ts             ← constants: upload limit, score weights, priority weights
```

**Acceptance criteria:** `npm run lint` and `npm run typecheck` pass. UI is pixel-identical.

### 0.2 — Testing scaffold
- Add **Vitest** + **React Testing Library**
- Write unit tests for `lib/scoring.ts` (pure functions, easy to test)
- Write hook tests for `useAnswers` and `usePersistentValue`
- Add `npm run test` script to `package.json`

### 0.3 — CI pipeline (GitHub Actions)
Create `.github/workflows/ci.yml`:
- Trigger: push and pull_request on `main`
- Steps: `npm ci` → `npm run lint` → `npm run typecheck` → `npm run test` → `npm run build`

---

## Sprint 1 — Data Portability (Quick win, no backend needed)

**Goal:** Make user data portable before the backend lands, so no one loses work during migration.

### 1.1 — Export to JSON
- Add "Export data" button in account menu
- Serialises `answers` + `categorySubmissions` + account metadata to a timestamped `.json` file
- Download triggers `<a download>` with `Blob` URL

### 1.2 — Import from JSON
- Add "Import data" button with file picker
- Validates JSON structure before applying
- Shows a diff summary ("X answers, Y submissions found") with a confirm step

### 1.3 — Export to XLSX
- Install `xlsx` (SheetJS) package
- Generate a `.xlsx` download matching the official `ACSA_evaluation_tool_version_v2.0.11.xlsx` format:
  - Sheet 1: Per-requirement data (ID, category, name, compliance, mode, dependency, evidence, notes)
  - Sheet 2: Weighted Scores (Analytics Table 1)
  - Sheet 3: Compliance by Scope (Analytics Table 2)
  - Sheet 4: Online/Offline breakdown (Analytics Table 3)
  - Sheet 5: System Dependency breakdown (Analytics Table 4)

### 1.4 — Print/PDF stylesheet
- Add `@media print` rules to produce a clean PDF from the Analytics page via browser print

---

## Sprint 2 — Backend: Database & API

**Goal:** Replace `localStorage` with a real database. This is the core migration sprint.

> **Architecture note:** The implementation uses **FastAPI + Keycloak OIDC + PostgreSQL (SQLAlchemy/Alembic)** rather than the
> Prisma + Next.js API routes originally described. The backend lives in `backend/` and the frontend
> connects via `next-auth` (Keycloak provider) + SWR data-fetching hooks.

### 2.1 — Database schema (FastAPI / SQLAlchemy)

Models already defined in `backend/app/modules/`:
- `User` (keycloak_sub, email, full_name) — `organizations/models.py`
- `Organization` + `OrganizationMember` — `organizations/models.py`
- `Assessment` — `assessments/models.py`
- `Response` (per-requirement answer) — `assessments/models.py`
- `Evidence`, `FileObject` — `assessments/models.py`
- `AssessmentSectionStatus` ← **added Sprint 2** — `assessments/models.py`

Alembic migrations: `backend/app/db/migrations/versions/`

### 2.2 — FastAPI API routes

| Route | Method | Purpose |
|---|---|---|
| `/api/v1/me/workspace` | POST | Bootstrap user → org → assessment (idempotent) |
| `/api/v1/assessments/{id}/responses` | GET | List all responses for an assessment |
| `/api/v1/assessments/{id}/responses/{req_stable_id}` | PUT | Upsert a single response |
| `/api/v1/assessments/{id}/section-statuses` | GET | List section submission statuses |
| `/api/v1/assessments/{id}/section-statuses/{section_stable_id}` | PUT | Upsert a section status |

### 2.3 — Replace `use-persistent-state.ts`

- `useAnswers.ts` now fetches responses from the API via SWR; `upsertAnswer` does optimistic
  updates and persists to `PUT /api/v1/assessments/{id}/responses/{req_stable_id}`.
- `useCategorySubmissions.ts` mirrors this pattern for section statuses.
- `useSessionAccount.ts` now derives the `SessionAccount` from the `next-auth` session instead of IndexedDB.
- `use-persistent-state.ts` is retained for the `SESSION_KEY` migration path but is no longer
  used by the core data hooks.

### 2.4 — Session management

- **Frontend:** `next-auth` with `KeycloakProvider` (`app/api/auth/[...nextauth]/route.ts`).
  The Keycloak access token is attached to every API request.
- **Backend:** Keycloak JWKS validation (`backend/app/core/security.py`).
- Passwords are managed entirely by Keycloak — no client-side hashing.

### Environment variables (added)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | FastAPI base URL (browser-side) |
| `NEXTAUTH_URL` | Canonical Next.js URL for next-auth |
| `NEXTAUTH_SECRET` | next-auth cookie signing secret |
| `KEYCLOAK_CLIENT_ID` | Keycloak client for the frontend (`acsa-web`) |
| `KEYCLOAK_CLIENT_SECRET` | Keycloak client secret |
| `KEYCLOAK_ISSUER` | Keycloak issuer URL |

---

## Sprint 3 — Role Enforcement & Collaboration

**Goal:** Enforce Country / Solution Provider roles and enable shared workspaces.

### 3.1 — Role-gated UI
- Hide the **Review tab** (Approve / Request changes) from `Solution Provider` accounts
- Show it only for `Country` role users
- Lock answer editing on `Submitted` categories for Solution Providers (unlock only when `Changes Requested`)

### 3.2 — Shared assessment workspace
- Introduce an `Assessment` entity in the database that links a Solution Provider to a Country reviewer
- Both parties see the same answers in real-time (via polling or WebSocket)
- Invitation flow: Country user sends an invite link; Solution Provider joins the shared assessment

```prisma
model Assessment {
  id                 String   @id @default(cuid())
  solutionProviderId String
  countryUserId      String?
  name               String
  createdAt          DateTime @default(now())
  status             String   @default("In Progress")
}
```

### 3.3 — Reviewer identity in comments
- Stamp reviewer comments with a role badge (`Reviewer` / `Provider`)
- Show review feedback inline in the discussion tab

### 3.4 — Notification system (basic)
- Email notification (via `nodemailer` or a transactional email provider) when:
  - A category is submitted for review
  - A reviewer requests changes
  - All requirements in a category are approved

---

## Sprint 4 — Admin & Reporting

**Goal:** Give programme managers a central view of all assessments.

### 4.1 — Admin role
- Add `admin` role to `User`
- Admin users can see all assessments, all solution providers, and all countries

### 4.2 — Admin dashboard
New page at `/admin`:
- Table of all assessments: organisation, country, completion %, compliance score, status
- Click through to read-only view of any individual assessment
- Bulk export: download all assessments as XLSX

### 4.3 — Audit log
- Log every status change, review decision, and submission event to an `AuditLog` table
- Viewable per-assessment in the admin panel

---

## Sprint 5 — UX, Accessibility & Mobile

**Goal:** Reach WCAG 2.1 AA compliance and a responsive layout.

### 5.1 — Responsive layout
- Current fixed two-panel split breaks on mobile
- Add a slide-up drawer for the requirement detail panel on viewports < 768 px
- Navigation collapses to a hamburger menu

### 5.2 — Accessibility audit
- Add visible focus rings and `aria-current` on active requirement row
- Audit all colour contrast ratios against WCAG AA
- Add `aria-live` regions for toast notifications and autosave status

### 5.3 — UX improvements
- Replace `window.alert()` in `submitCategory()` with an inline validation message that scrolls to the first incomplete requirement
- Add a "Clear category" action (behind a confirmation dialog)
- Add a micro-animation when a category reaches 100% completion
- Progress persistence warning when localStorage is near-full (pre-backend only)

---

## Sprint 6 — DevOps & Production Readiness

**Goal:** Make the application deployable and operable.

### 6.1 — Docker
- Add `Dockerfile` and `docker-compose.yml` (app + PostgreSQL)
- Add `.env.example` documenting all required environment variables

### 6.2 — Database migrations
- Set up `prisma migrate` workflow
- Add a seed script (`prisma/seed.ts`) that populates the catalogue and creates a demo admin account

### 6.3 — Environment configuration
- `DATABASE_URL` — PostgreSQL connection string
- `SESSION_SECRET` — cookie signing secret
- `STORAGE_PATH` — local file storage directory (or `S3_BUCKET`, `S3_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` for S3)
- `SMTP_*` — email credentials (Sprint 3.4)
- `NEXT_PUBLIC_APP_URL` — for invite links

### 6.4 — Observability
- Add structured request logging (`pino`)
- Add a `/api/health` endpoint for uptime monitoring
- Error boundaries in React for graceful client-side error handling

### 6.5 — Security hardening
- Rate-limit `/api/auth/*` endpoints
- Add CSRF protection
- Set secure/httpOnly flags on session cookies
- Add `Content-Security-Policy` header
- Validate all API inputs with `zod`

---

## Dependency additions (cumulative)

| Package | Sprint | Purpose |
|---|---|---|
| `xlsx` | 1.3 | Excel export |
| `next-auth` | 2.4 | Keycloak OIDC frontend authentication |
| `swr` | 2.3 | Client-side data fetching/caching |
| `fastapi`, `uvicorn`, `sqlalchemy`, `alembic`, `asyncpg` | 2.1 | FastAPI backend + PostgreSQL ORM |
| `python-jose`, `httpx` | 2.4 | Keycloak JWT validation |
| `aioboto3` | 2.2 | MinIO/S3 object storage |
| `celery[redis]`, `redbeat` | Sprint 6 | Background task queue |
| `vitest` + `@testing-library/react` | 0.2 | Unit and component tests |
| `pino` / `structlog` | 6.4 | Structured logging |
| `aiosmtplib`, `jinja2` | 3.4 | Email notifications |

---

## Migration path for existing users

Because the prototype stores data in `localStorage`, existing users will need to export their
data before the backend goes live. The sequence:

1. **Deploy Sprint 1** (export/import) while the tool is still `localStorage`-based
2. **Announce migration date** — give users time to export their data
3. **Deploy Sprint 2** (backend) — new registrations go straight to the database
4. **Provide import tool** — users paste their Sprint 1 JSON export; the import API writes it to the database
5. **Sunset localStorage path** — remove `use-persistent-state.ts` localStorage fallback after a grace period

---

## Progress tracker

Update this table as sprints are completed.

| Sprint | Status | Notes |
|---|---|---|
| 0 — Foundations | ✅ Complete | Components split, shared hooks/libs added, tests scaffolded, and CI workflow created |
| 1 — Data Portability | ✅ Complete | JSON export/import, workbook-based XLSX export, and print/PDF analytics support added |
| 2 — Backend: Database & API | ✅ Complete | FastAPI responses + section-status routes, workspace bootstrap, next-auth Keycloak OIDC, SWR-backed hooks |
| 3 — Role Enforcement & Collaboration | ⬜ Not started | |
| 4 — Admin & Reporting | ⬜ Not started | |
| 5 — UX, Accessibility & Mobile | ⬜ Not started | |
| 6 — DevOps & Production Readiness | ⬜ Not started | |
