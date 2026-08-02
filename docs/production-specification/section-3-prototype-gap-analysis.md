# SECTION 3 — PROTOTYPE GAP ANALYSIS

### 3.1 Authentication (`AuthScreen`)

| Item | Prototype State | Production Requirement | Gap | Priority |
|---|---|---|---|---|
| Authentication provider | Custom SHA-256 hash in localStorage | Keycloak / OIDC tokens | No standards-based auth | Critical |
| Password storage | SHA-256 hash in localStorage | Never stored in application — delegated to IdP | Credentials stored client-side | Critical |
| Session tokens | localStorage string | Short-lived JWT + refresh token | No token expiry, no revocation | Critical |
| Multi-factor authentication | None | Optional TOTP via Keycloak | Missing | High |
| Password reset | None | Keycloak self-service flow | Missing entirely | High |
| Email verification | None | Email verification on registration | Missing | High |
| Account lockout | None | Keycloak brute-force protection | Missing | High |
| Role picker (Country / Solution Provider) | UI only, stored in account | Backend-enforced role assignment | No enforcement | High |
| Organization field | Free-text at registration | Linked to Organization entity, awaiting approval | No org approval workflow | High |

### 3.2 Dashboard / Home View

| Item | Prototype State | Production Requirement | Gap | Priority |
|---|---|---|---|---|
| Assessment list | Single implicit assessment | List of assessments per organization | Single-assessment only | High |
| Create assessment button | None | Modal/screen to create new assessment | Missing | High |
| Organization context | Account.organization free text | Resolved organization entity with approval status | No org management | High |
| Team members | None | List of team members and their assignments | Missing | High |
| Overdue warnings | None | Due-date alerts for sections and overall assessment | Missing | Medium |
| Reviewer dashboard | None | Separate reviewer home with work queue | Missing | Critical |
| Admin dashboard | None | Admin panel for users, orgs, questionnaires | Missing | Critical |
| Notifications | None | Notification bell with count | Missing | Medium |

### 3.3 Assessment / Questionnaire View

| Item | Prototype State | Production Requirement | Gap | Priority |
|---|---|---|---|---|
| Multi-user editing | None | Optimistic lock per requirement | Missing | High |
| Section assignment | None | Each section assignable to a specific team member | Missing | High |
| Questionnaire version | Hard-coded JSON | Loaded from server for the specific version | Missing | Critical |
| Requirement guidance | Not present | Guidance text, reviewer guidance, links to policies | Missing | High |
| Conditional questions | Not present | Questions that appear based on prior answer | Missing | High |
| Not Applicable response | None | Explicit N/A with mandatory justification | Missing | High |
| Evidence requirement flag | Not present | Per-requirement configuration of evidence mandate | Missing | High |
| Autosave | Simulated 450ms visual only | Server-side autosave debounced ~2s, with server confirmation | Simulated only | High |

### 3.4 Evidence Upload

| Item | Prototype State | Production Requirement | Gap | Priority |
|---|---|---|---|---|
| Storage | Base64 dataUrl in localStorage | Pre-signed upload to S3-compatible storage | Completely different | Critical |
| File size limit | 1.5 MB hardcoded | Configurable (default 50 MB) | Missing | High |
| File type validation | None | Server-side MIME validation + configurable allowed types | Missing | High |
| Malware scanning | None | Async ClamAV scanning on upload | Missing | High |
| Checksum | None | SHA-256 recorded on upload | Missing | High |
| Evidence request link | None | Evidence linked to a specific evidence request | Missing | High |

### 3.5 Review Tab

| Item | Prototype State | Production Requirement | Gap | Priority |
|---|---|---|---|---|
| Reviewer identity | Same user as applicant | Separate reviewer role, assigned by ACSA | No role separation | Critical |
| Reviewer dashboard | None | Dedicated reviewer work queue | Missing | Critical |
| Internal notes | None | Reviewer-only notes not visible to applicant | Missing | High |
| Verification outcome | Approve / Request Changes (binary) | Satisfied / Partially Satisfied / Not Satisfied / N/A / More Evidence Required | Insufficient options | High |
| Evidence request creation | None | Structured evidence request with due date, recipient, reason | Missing | Critical |
| Adjudication | None | Adjudicator workflow for contested findings | Missing | High |
| Approval authority | None | Formal approval with digital record | Missing | Critical |

### 3.6 Analytics

| Item | Prototype State | Production Requirement | Gap | Priority |
|---|---|---|---|---|
| Scope | Single user, single assessment | Cross-organization, cross-country, multi-version | Single user only | High |
| Charts | Data tables only | Visual charts (bar, pie, radar) | No visualization | Medium |
| Export | None | Export analytics as PDF or Excel | Missing | Medium |
| Filters | None | Filter by country, org type, questionnaire version, date range | Missing | Medium |
| Progress Monitor view | None | Read-only view of progress without seeing answers | Missing | High |

---
