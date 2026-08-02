# ACSA Self-Evaluation Portal — Production System Specification

**Version 1.0 | August 2026**

---

## SECTION 1 — EXECUTIVE SUMMARY

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

## SECTION 2 — PRODUCT REQUIREMENTS DOCUMENT

### 2.1 Product Vision

Build a trusted, multilingual, evidence-based compliance assessment platform that allows any participating organization to evaluate a CRVS solution against ACSA requirements, obtain a credible reviewer-verified score, and compare their result to regional benchmarks.

### 2.2 Objectives

1. Replace spreadsheet-based evaluations with a structured, auditable digital workflow.
2. Enable collaborative assessments across distributed teams.
3. Provide ACSA reviewers with tools to verify, adjudicate, and approve without manual coordination.
4. Produce exportable, reproducible, signed compliance reports.
5. Allow questionnaire administrators to update requirements, scoring, and guidance without engineering work.
6. Support English, French, and Portuguese from launch.

### 2.3 Business Outcomes

- Assessments completed in weeks rather than months.
- Reviewer cycle time measurable and improvable.
- Full evidence trail available for appeals or audits.
- Cross-country and cross-solution comparison enabled for ACSA program management.
- Questionnaire kept current without platform releases.

### 2.4 Success Metrics

| Metric | Target |
|---|---|
| Assessment completion rate | ≥ 80% of started assessments reach submission |
| Reviewer turnaround | Median < 15 business days from submission |
| Evidence request response | Median < 10 business days |
| System availability | ≥ 99.5% during business hours |
| Assessment export success rate | ≥ 99.9% |
| Multilingual coverage | 100% of UI strings translated in EN, FR, PT |

### 2.5 MVP Definition

The Minimum Viable Product must support:

1. Organization registration and administrator-approval workflow.
2. User authentication via Keycloak / OIDC.
3. Single organization, single assessment.
4. Published questionnaire version with all 208 current requirements.
5. Answer entry: compliance level, operating mode, dependency flag, evidence text, file uploads.
6. Autosave with conflict detection.
7. Per-category submission.
8. ACSA reviewer workflow: review per requirement, approve or request changes.
9. Evidence request creation and response.
10. Overall submission and approval decision.
11. PDF export of assessment result.
12. English language only for MVP.

### 2.6 Production Release Definition

Production release adds:

- French and Portuguese localization.
- Multi-user teams with section assignments.
- Multiple assessments per organization.
- Questionnaire version management and publishing.
- Full adjudication workflow.
- Analytics dashboards.
- In-app and email notifications.
- Manuals and guidance content.
- Audit log viewer.
- Administrator panel for users, roles, organizations.
- Excel and CSV exports.
- Assessment cloning.
- Version comparison.

### 2.7 Future Roadmap

- Arabic and RTL support.
- SMS notifications.
- Third-party identity provider federation (national SSO systems).
- Full offline mode with encrypted local draft storage.
- API access for programmatic submission.
- Machine-readable compliance certificates.
- Integration with OpenCRVS or other CRVS systems for automated evidence gathering.
- Comparative public-facing scorecard (opt-in).

### 2.8 Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Questionnaire changes during active assessments | High | High | Freeze questionnaire version per assessment; provide migration tool |
| Low connectivity for applicants | Medium | High | Offline draft caching for in-progress answers |
| Large evidence files degrading performance | Medium | Medium | Pre-signed upload URLs, async virus scanning, file size limits |
| Reviewer bandwidth bottleneck | High | Medium | Workload dashboards, assignment tools, SLA alerts |
| Localization gaps at launch | Medium | Medium | String extraction and translation workflow before release |

---

## SECTION 3 — PROTOTYPE GAP ANALYSIS

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

## SECTION 4 — USER AND ROLE MODEL

### 4.1 Role Definitions

#### Platform Super Administrator
- **Purpose**: Full platform control, emergency access.
- **Permitted**: All actions in all organizations.
- **Data visibility**: All data in all organizations.

#### ACSA Administrator
- **Purpose**: Day-to-day administration of the ACSA program.
- **Permitted**: Manage organizations, users, roles, questionnaire versions, scoring, languages, notifications, audit logs.
- **Restricted**: Cannot directly modify submitted assessment answers.
- **Data visibility**: All organizations, all assessments.

#### Questionnaire Administrator
- **Purpose**: Manage the requirements catalogue.
- **Permitted**: Create, edit, translate, publish, retire questionnaire versions.
- **Restricted**: Cannot review or approve assessments.

#### ACSA Reviewer
- **Purpose**: Review submitted assessments at the requirement level.
- **Permitted**: View all submitted assessment answers and evidence, add findings and comments, create evidence requests, recommend outcomes.
- **Restricted**: Cannot approve or adjudicate.

#### Review Team Lead
- **Purpose**: Assign review work, oversee review quality.
- **Permitted**: All Reviewer actions plus assign reviewers to requirements/sections, escalate.
- **Restricted**: Cannot final-approve.

#### Adjudicator
- **Purpose**: Resolve conflicting or contested review findings.
- **Permitted**: View all reviewer findings, make binding adjudication decisions, override reviewer outcomes.
- **Restricted**: Cannot approve.

#### Approver
- **Purpose**: Issue formal approval or rejection.
- **Permitted**: View final assessment with all findings, issue Approved or Rejected decision, generate certificate.
- **Restricted**: Must not have been the primary reviewer for the same assessment.

#### Progress Monitor
- **Purpose**: Track overall program progress without accessing sensitive answers.
- **Permitted**: View completion percentages, status, overdue alerts.
- **Restricted**: Cannot view individual answers, evidence, or reviewer comments until assessment is approved.

#### Country Organization Administrator
- **Purpose**: Manage their country organization's workspace.
- **Permitted**: Create assessments, invite team members, assign sections, manage organization profile.
- **Organization scope**: Own organization only.

#### Solution Provider Administrator
- **Purpose**: Same as Country Organization Administrator for provider organizations.

#### Assessment Manager
- **Purpose**: Manage a specific assessment.
- **Permitted**: Create and configure the assessment, assign contributors, submit.

#### Assessment Contributor
- **Purpose**: Answer assigned requirements.
- **Permitted**: Answer and save responses in assigned sections, upload evidence, add comments.
- **Restricted**: Cannot submit the assessment.

#### Evidence Contributor
- **Purpose**: Upload evidence only.
- **Permitted**: Upload files to linked evidence requests; cannot modify answers.

#### Read-Only Organization User
- **Purpose**: View assessment progress without editing.

#### Auditor
- **Purpose**: Compliance and audit access.
- **Permitted**: View immutable audit log across the platform.

### 4.2 Role-Permission Matrix

| Action | Super Admin | ACSA Admin | QA | Reviewer | Adjudicator | Approver | Country Admin | Contributor | Monitor |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Create organization | ✓ | ✓ | | | | | (request) | | |
| Approve organization | ✓ | ✓ | | | | | | | |
| Invite user | ✓ | ✓ | | | | | ✓ | | |
| Create assessment | ✓ | ✓ | | | | | ✓ | | |
| Answer requirements | ✓ | | | | | | ✓ | ✓ | |
| Submit assessment | ✓ | | | | | | ✓ | | |
| Assign reviewer | ✓ | ✓ | | ✓(lead) | | | | | |
| Add review finding | ✓ | | | ✓ | | | | | |
| Create evidence request | ✓ | | | ✓ | | | | | |
| Respond to evidence request | ✓ | | | | | | ✓ | ✓ | |
| Adjudicate | ✓ | | | | ✓ | | | | |
| Approve assessment | ✓ | | | | | ✓ | | | |
| View progress (aggregate) | ✓ | ✓ | | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| View individual answers | ✓ | ✓ | | ✓ | ✓ | ✓ | ✓(own) | ✓(assigned) | |
| Publish questionnaire | ✓ | ✓ | ✓ | | | | | | |
| View audit log | ✓ | ✓ | | | | | | | ✓ |
| Export results | ✓ | ✓ | | ✓ | ✓ | ✓ | ✓ | | |
| Manage system settings | ✓ | ✓ | | | | | | | |

---

## SECTION 5 — USER JOURNEYS

### 5.1 New Organization Registration

- **Actor**: New user (Country or Solution Provider)
- **Preconditions**: User has a valid email address.
- **Trigger**: User clicks "Register" on the public landing page.
- **Main Flow**:
  1. User selects organization type (Country / Solution Provider).
  2. User fills: full name, work email, organization name, country, role title.
  3. System sends email verification link.
  4. User verifies email. Account created in PENDING state.
  5. ACSA Administrator receives notification of pending organization approval.
  6. ACSA Administrator approves organization. User receives activation email.
  7. User logs in and creates organization profile.
- **Failure Flow**: Duplicate email → clear error. Unverified email within 48 hours → account disabled.
- **Audit Events**: `USER_REGISTERED`, `EMAIL_VERIFIED`, `ORGANIZATION_APPROVED`.
- **Final Status**: Organization ACTIVE, User ACTIVE with Country Admin or Provider Admin role.

### 5.2 Creating an Assessment

- **Actor**: Country Organization Administrator or Assessment Manager.
- **Preconditions**: Organization is ACTIVE. At least one PUBLISHED questionnaire version exists.
- **Main Flow**:
  1. User fills: assessment name, description, assessed system details.
  2. System shows available published questionnaire versions. User selects one.
  3. User optionally adds connected systems.
  4. Assessment created in DRAFT status.
  5. User assigns sections to team members (or self).
  6. User sets a due date.
  7. Team members receive assignment notifications.
- **Audit Events**: `ASSESSMENT_CREATED`, `SECTION_ASSIGNED`.

### 5.3 Answering Requirements

- **Actor**: Assessment Contributor (or Manager).
- **Preconditions**: Assessment in DRAFT or IN_PROGRESS. Contributor assigned to the section.
- **Main Flow**:
  1. System loads questionnaire section with all requirements.
  2. Contributor selects a requirement.
  3. Contributor selects compliance level, operating mode, dependency status.
  4. If evidence is required, contributor uploads file(s) or provides text evidence.
  5. Contributor adds notes/justifications.
  6. System autosaves after 2-second debounce (server-confirmed).
  7. Once all required fields complete, contributor marks section ready.
- **Failure Flows**: Network loss → changes queued locally, sync on reconnect with conflict detection.
- **Audit Events**: `RESPONSE_SAVED`, `EVIDENCE_UPLOADED`, `SECTION_MARKED_READY`.

### 5.4 Submitting an Assessment

- **Actor**: Assessment Manager.
- **Preconditions**: All sections marked ready. All mandatory requirements answered.
- **Main Flow**:
  1. System validates all mandatory requirements have responses.
  2. System shows submission summary with any blocking items.
  3. Manager confirms submission.
  4. Assessment status changes to SUBMITTED.
  5. All answers become read-only for contributors.
  6. ACSA Review Team Lead receives notification.
- **Audit Events**: `ASSESSMENT_SUBMITTED`.

### 5.5 Reviewing a Submission

- **Actor**: ACSA Reviewer (assigned by Review Team Lead).
- **Preconditions**: Assessment in SUBMITTED or UNDER_INITIAL_REVIEW.
- **Main Flow**:
  1. Reviewer opens work queue, selects assigned assessment.
  2. For each requirement: reads answer and evidence, selects outcome, adds internal note and optional applicant-visible comment.
  3. If more evidence required: creates evidence request (see 5.6).
  4. Reviewer marks section complete.
  5. Once all sections reviewed, Review Team Lead escalates.
- **Audit Events**: `REVIEW_FINDING_RECORDED`, `EVIDENCE_REQUEST_CREATED`, `REVIEW_SECTION_COMPLETE`.

### 5.6 Evidence Request Workflow

- **Main Flow (Reviewer)**:
  1. Reviewer selects "Request Evidence" on a requirement.
  2. Fills: description, reason, recipient, due date, priority.
  3. System creates evidence request in SENT status.
  4. Assessment status changes to EVIDENCE_REQUESTED.
- **Main Flow (Contributor)**:
  1. Contributor opens evidence request from notification.
  2. Uploads evidence or adds text response.
  3. Marks response as submitted. Status changes to RESPONDED.
  4. Reviewer receives notification and accepts or rejects.
- **Audit Events**: `EVIDENCE_REQUEST_SENT`, `EVIDENCE_REQUEST_RESPONDED`, `EVIDENCE_REQUEST_ACCEPTED`.

### 5.7 Adjudication

- **Actor**: Adjudicator.
- **Main Flow**:
  1. Adjudicator reviews all reviewer findings for contested requirements.
  2. Makes binding decision per requirement with rationale.
  3. Recommends overall outcome (approve / reject / return for correction).
  4. Assessment advances to AWAITING_APPROVAL.
- **Audit Events**: `ADJUDICATION_DECISION_RECORDED`.

### 5.8 Approval

- **Actor**: Approver.
- **Preconditions**: Assessment in AWAITING_APPROVAL. Approver was not the primary reviewer.
- **Main Flow**:
  1. Approver reviews adjudication summary and overall findings.
  2. Issues Approved or Rejected decision with rationale.
  3. If approved: system generates final compliance report and certificate PDF.
  4. Organization administrator receives notification with download link.
- **Audit Events**: `ASSESSMENT_APPROVED`, `ASSESSMENT_REJECTED`, `CERTIFICATE_GENERATED`.

---

## SECTION 6 — FUNCTIONAL REQUIREMENTS SPECIFICATION

### Module AUTH — Identity and Access Management

**AUTH-FR-001** — OAuth 2.0 / OIDC Login
- Users authenticate via Keycloak using Authorization Code Flow with PKCE. The application never handles raw passwords.
- Token validation: signature, expiry, issuer, audience. Extract `sub`, `email`, `roles`, `organization_id`.
- Output: access token (15 min TTL), refresh token (24 h session, 30 day rolling).
- Audit: `AUTH_LOGIN_SUCCESS`, `AUTH_LOGIN_FAILURE`. **Priority: Critical.**

**AUTH-FR-002** — Logout and Token Revocation
- User logs out. Access token invalidated. Keycloak session ended. Refresh token revoked. **Priority: Critical.**

**AUTH-FR-003** — Multi-Factor Authentication
- Optional TOTP-based MFA via Keycloak. ACSA Reviewers, Adjudicators, and Approvers must have MFA enabled. **Priority: High.**

**AUTH-FR-004** — User Invitation
- Organization administrators invite users by email. Time-limited invitation token (72 hours). Recipient registers via Keycloak and links to their organization on first login. **Priority: Critical.**

**AUTH-FR-005** — Account Deactivation
- ACSA Administrator or Organization Administrator deactivates a user. Keycloak account disabled. Active sessions revoked. **Priority: High.**

### Module ORG — Organization Management

**ORG-FR-001** — Organization Registration Request
- A user registers an organization: name, type, country, address, primary contact.
- Validation: organization name unique within type and country.
- Output: Organization created in PENDING_APPROVAL status.
- Audit: `ORGANIZATION_REGISTRATION_REQUESTED`. **Priority: Critical.**

**ORG-FR-002** — Organization Approval
- ACSA Administrator reviews the registration and approves or rejects.
- Notification: applicant notified by email on either outcome. **Priority: Critical.**

**ORG-FR-003** — Team Member Invitation
- Organization Administrator invites a user by email with initial role. System sends invitation email. **Priority: High.**

**ORG-FR-004** — Organization Profile Management
- Administrators update: name, description, address, contact details, logo, country. All changes audited. **Priority: Medium.**

### Module ASM — Assessment Management

**ASM-FR-001** — Create Assessment
- Organization Administrator or Assessment Manager creates: name, description, assessed system, questionnaire version, due date.
- Validation: organization must be ACTIVE. Questionnaire version must be PUBLISHED.
- Output: Assessment in DRAFT status. **Priority: Critical.**

**ASM-FR-002** — Section Assignment
- Assessment Manager assigns each section to one or more team members. Assignments trigger notifications.
- Business Rule: a contributor can only answer requirements in their assigned sections. **Priority: High.**

**ASM-FR-003** — Assessment Status Transitions

| From | To | Authorized Role | Trigger |
|---|---|---|---|
| DRAFT | IN_PROGRESS | Assessment Manager | First answer saved |
| IN_PROGRESS | READY_FOR_SUBMISSION | Assessment Manager | All sections ready |
| READY_FOR_SUBMISSION | SUBMITTED | Assessment Manager | Explicit submission |
| SUBMITTED | UNDER_INITIAL_REVIEW | Review Team Lead | Review assignment |
| UNDER_INITIAL_REVIEW | EVIDENCE_REQUESTED | Reviewer | Evidence request created |
| EVIDENCE_REQUESTED | RESPONSE_SUBMITTED | Contributor | Evidence response submitted |
| RESPONSE_SUBMITTED | UNDER_VERIFICATION | Reviewer | Reviewer resumes |
| UNDER_VERIFICATION | UNDER_ADJUDICATION | Review Team Lead | Escalation |
| UNDER_ADJUDICATION | AWAITING_APPROVAL | Adjudicator | Decision recorded |
| AWAITING_APPROVAL | APPROVED | Approver | Approval action |
| AWAITING_APPROVAL | REJECTED | Approver | Rejection action |
| AWAITING_APPROVAL | RETURNED_FOR_CORRECTION | Approver | Return action |
| RETURNED_FOR_CORRECTION | IN_PROGRESS | Assessment Manager | Reopened |
| ANY | WITHDRAWN | Assessment Manager or ACSA Admin | Withdrawal request |
| APPROVED | ARCHIVED | ACSA Admin | Manual archiving |

**Priority: Critical.**

**ASM-FR-004** — Assessment Submission Validation
- Before submission: (a) all mandatory requirements have a non-null response, (b) all evidence-required requirements have at least one evidence item or N/A justification, (c) no unanswered required conditional questions.
- Fail → list of blocking items with direct navigation links. **Priority: Critical.**

**ASM-FR-005** — Assessment Cloning
- Organization may clone an existing assessment. Answers are copied as drafts, evidence is linked (not duplicated). Clone is bound to same or newer questionnaire version. **Priority: Medium.**

**ASM-FR-006** — Questionnaire Version Migration
- When a new version is published while an assessment is in progress, the assessment remains bound to its original version. Optional migration tool maps existing answers to matching requirement IDs; unmatched requirements flagged. **Priority: Medium.**

### Module QNR — Questionnaire Management

**QNR-FR-001** — Questionnaire Version Creation
- Questionnaire Administrator creates a new version (DRAFT) by forking or from scratch. Version has semantic number (e.g., 2.1.0), description, effective date. **Priority: High.**

**QNR-FR-002** — Requirement Configuration
- Each requirement: unique stable ID, name, description, category, type, priority, response type, evidence mandatory flag, guidance, scoring configuration. **Priority: Critical.**

**QNR-FR-003** — Questionnaire Publishing
- Published versions are immutable. New assessments can only be created against PUBLISHED versions.
- Audit: `QUESTIONNAIRE_VERSION_PUBLISHED`. **Priority: Critical.**

**QNR-FR-004** — Questionnaire Translation
- Translations of all text fields per supported language. Missing translations fall back to English. **Priority: High.**

**QNR-FR-005** — Conditional Display Rules
- A requirement can have a display condition: `[requirement_id] [operator] [value]`. If condition not met, requirement is hidden and treated as N/A for scoring. Evaluated client-side and server-side. **Priority: High.**

### Module RSP — Response Management

**RSP-FR-001** — Response Types

| Type | Description |
|---|---|
| `COMPLIANCE_LEVEL` | Prototype's 4-level compliance scale |
| `YES_NO` | Boolean |
| `YES_PARTIALLY_NO` | Three-level enum |
| `SINGLE_SELECT` | Select one option |
| `MULTI_SELECT` | Select multiple options |
| `NUMERIC` | Number with unit |
| `PERCENTAGE` | 0–100 decimal |
| `DATE` | ISO date |
| `TEXT` | Short text |
| `LONG_TEXT` | Multi-paragraph |
| `URL` | Valid URL |
| `FILE_UPLOAD` | References to evidence table |
| `NOT_APPLICABLE` | Explicit N/A with justification |
| `OPERATING_MODE` | Online / Offline / Both |
| `DEPENDENCY_FLAG` | Boolean + dependent systems text |

**Priority: Critical.**

**RSP-FR-002** — Response Autosave
- Client debounces 2 seconds, sends PATCH to server. Server returns updated version number. On conflict (version mismatch) server returns 409 with current state. Client shows conflict resolution prompt. **Priority: Critical.**

**RSP-FR-003** — Response Version History
- Every saved version stored in `response_versions`. Administrators can view full edit history. **Priority: Medium.**

### Module EVD — Evidence Management

**EVD-FR-001** — Evidence Upload
1. Client requests pre-signed PUT URL from server.
2. Client uploads directly to object storage.
3. Client confirms upload to server.
4. Server records metadata and queues virus scan.
5. Evidence created in PENDING_SCAN status.

Validation: allowed file types configurable (default: PDF, DOCX, XLSX, PNG, JPG, MP4). Max size configurable (default 50 MB). **Priority: Critical.**

**EVD-FR-002** — Malware Scanning
- Background worker downloads file, scans with ClamAV, updates status to CLEAN or QUARANTINED. Quarantined files are inaccessible. Uploader notified. **Priority: High.**

**EVD-FR-003** — Evidence Access Control
- Accessible to: uploading contributor, other contributors in same assessment, all assigned reviewers, adjudicators, approvers. CONFIDENTIAL evidence restricted to reviewers and above. **Priority: High.**

**EVD-FR-004** — Evidence Download via Pre-Signed URL
- Download requests generate a time-limited (15-minute) pre-signed GET URL. Server never proxies file content. Download audited.
- Audit: `EVIDENCE_DOWNLOADED`. **Priority: High.**

### Module REV — Review and Verification

**REV-FR-001** — Review Assignment
- Review Team Lead assigns reviewers to an assessment or sections. Assignment triggers notification. **Priority: Critical.**

**REV-FR-002** — Requirement-Level Finding
- Reviewer records outcome: Satisfied / Partially Satisfied / Not Satisfied / N/A / More Evidence Required. Internal note (reviewer-only). Applicant-visible comment (optional, explicitly marked).
- BR-REV-001: Applicant-visible comments only revealed when explicitly marked. **Priority: Critical.**

**REV-FR-003** — Review Completion
- Reviewer marks their scope complete. Review Team Lead notified. When all sections reviewed, Review Team Lead advances status. **Priority: High.**

### Module SCR — Scoring

**SCR-FR-001** — Configurable Scoring Engine
- Scoring configuration stored in the database (not hardcoded). For each response type and option, score value stored. Each requirement has a weight. Section and overall scores computed as `achieved / maximum × 100`. **Priority: Critical.**

**SCR-FR-002** — Prototype Scoring Model (Current)

```
Response scores:
  Fully Meets                    = 2 points
  Meets through Configuration    = 2 points
  Customization Required         = 1 point
  Not Available                  = 0 points

Priority weights:
  Must   = ×2.0
  Should = ×1.5
  Could  = ×1.0

Denominator per requirement = 3 × weight
  (Note: max achievable compliance score = 66.7%)
  (Open Decision OD-001: confirm denominator 3 vs 2)

Compliance score % = round(achieved_weighted / maximum_weighted × 100)
```

**Priority: Critical.**

**SCR-FR-003** — N/A Handling
- Requirements answered N/A are excluded from both numerator and denominator. **Priority: High.**

**SCR-FR-004** — Score Snapshot
- When assessment reaches SUBMITTED, APPROVED, or REJECTED, a score snapshot is taken and stored. Snapshots are immutable. **Priority: High.**

**SCR-FR-005** — Color Coding

| Score Range | Color | Meaning |
|---|---|---|
| ≥ green_threshold | Green | Compliant / Satisfactory |
| amber_threshold ≤ x < green_threshold | Amber | Partially Compliant |
| < amber_threshold | Red | Not Compliant / Critical Gap |
| N/A or Not Assessed | Gray | Not Applicable |

Default thresholds: Green ≥ 80%, Amber ≥ 50%. Configurable per questionnaire version. **Priority: High.**

### Module RPT — Results and Reporting

- **RPT-FR-001**: Overall compliance report (PDF, Excel, CSV).
- **RPT-FR-002**: Section-level report with requirement answers and reviewer outcomes.
- **RPT-FR-003**: Evidence inventory report.
- **RPT-FR-004**: Evidence request report.
- **RPT-FR-005**: Management summary (executive-level, traffic-light summary).
- **RPT-FR-006**: Reviewer productivity report.
- **RPT-FR-007**: Cross-organization comparison (aggregate, de-identified unless authorized).

### Module NOT — Notifications

- **NOT-FR-001**: In-app notification bell with unread count.
- **NOT-FR-002**: Email notifications for all workflow events.
- **NOT-FR-003**: Notification templates stored in database, translatable per language.
- **NOT-FR-004**: User notification preferences (per-event opt-out, except security events).
- **NOT-FR-005**: Delivery status tracked; retries with exponential backoff (max 3 attempts).

### Module ADM — Administration

- **ADM-FR-001**: User management: create, invite, deactivate, reassign roles.
- **ADM-FR-002**: Organization management: approve, deactivate, view all assessments.
- **ADM-FR-003**: Questionnaire management: full CRUD on versions, requirements, translations.
- **ADM-FR-004**: Scoring configuration: update score values, weights, thresholds per version.
- **ADM-FR-005**: Audit log viewer: filter by event type, user, organization, date range.
- **ADM-FR-006**: System settings: file size limits, allowed types, session durations, notification endpoints.
- **ADM-FR-007**: Content management: manuals, videos, FAQ, templates.
- **ADM-FR-008**: Language management: add/remove supported languages, mark translations complete.

---

## SECTION 7 — BUSINESS RULES

| ID | Rule |
|---|---|
| **BR-ASM-001** | An assessment can only be created by an Organization Administrator or Assessment Manager of an ACTIVE organization. |
| **BR-ASM-002** | An assessment must be bound to a single questionnaire version at creation time. The version cannot change after the first response is saved. |
| **BR-ASM-003** | An assessment cannot be submitted until all mandatory requirements have a response and all evidence-required requirements have at least one CLEAN evidence item or an accepted N/A justification. |
| **BR-ASM-004** | Once an assessment is SUBMITTED, all answers are read-only for contributors unless it is RETURNED_FOR_CORRECTION. |
| **BR-ASM-005** | An assessment returned for correction is reopened to IN_PROGRESS. Only flagged items need re-answering, but the full assessment is editable. |
| **BR-ASM-006** | A WITHDRAWN assessment cannot be reactivated. A new assessment must be created. |
| **BR-QNR-001** | A questionnaire version cannot be edited after it is PUBLISHED. |
| **BR-QNR-002** | Requirement IDs must be stable across versions. New requirements receive new IDs. Retired requirements retain their IDs but are marked inactive. |
| **BR-QNR-003** | Assessments remain bound to their questionnaire version for the entire lifecycle, including after the version is retired. |
| **BR-RSP-001** | A response is considered complete when all required sub-fields are populated. For the compliance response type: compliance level, operating mode, and dependency flag must all be set. |
| **BR-RSP-002** | Autosave uses optimistic concurrency. Client sends current `version` integer. Server rejects with HTTP 409 if version does not match. |
| **BR-RSP-003** | Response history is immutable. Historical versions cannot be deleted. |
| **BR-EVD-001** | Files in QUARANTINED status are inaccessible to all users. |
| **BR-EVD-002** | Evidence uploaded to CLEAN status may be replaced. Previous version is archived, not deleted. |
| **BR-EVD-003** | Evidence linked to an APPROVED assessment cannot be deleted or replaced. |
| **BR-REV-001** | A reviewer may not review an assessment in which they participated as a contributor. |
| **BR-REV-002** | An approver may not be the primary reviewer for the assessment they are approving. |
| **BR-REV-003** | Reviewer internal notes are never visible to the applicant organization. |
| **BR-REV-004** | Review findings are locked once the adjudicator has issued a decision. |
| **BR-SCR-001** | Requirements answered N/A are excluded from both numerator and denominator in score calculation. |
| **BR-SCR-002** | Unanswered requirements count as 0 in the score (included in the denominator). |
| **BR-SCR-003** | A score snapshot is captured at SUBMITTED and again at the final decision. These snapshots are immutable. |
| **BR-MON-001** | Progress Monitor users cannot view individual requirement answers or evidence before the assessment is APPROVED. |
| **BR-SEC-001** | Evidence marked CONFIDENTIAL is accessible only to reviewers, adjudicators, approvers, and ACSA administrators. |
| **BR-AUD-001** | Audit logs are append-only. No user role may delete or modify an audit event. |
| **BR-AUD-002** | All data-export actions are audited: who exported, what was exported, and when. |

---

## SECTION 8 — SCREEN INVENTORY AND UI SPECIFICATION

### SCR-001: Splash / Loading Screen
- **Purpose**: Initial load indicator, session restoration.
- **Behavior**: While checking session token validity, show loading state. Redirect to dashboard or login.
- **Accessibility**: `role="status"` on spinner, `aria-label="Loading ACSA Evaluation"`.

### SCR-002: Login Screen
- **Purpose**: Authenticate existing user via Keycloak PKCE redirect.
- **Post-login**: Redirect to dashboard or original deep-link target.

### SCR-003: Registration Screen
- **Fields**: Full name, work email, organization name, organization type, country, job title.
- **Validation**: Email uniqueness checked before Keycloak registration.
- **Success state**: Email verification sent screen.

### SCR-004: Dashboard (Applicant)
- **Components**: Organization name and status, assessment cards (name, status, progress, due date), "New Assessment" button, notification bell.
- **Empty state**: Illustration + "Create your first assessment" CTA.

### SCR-005: Assessment Creation Screen
- **Fields**: Assessment name, description, questionnaire version dropdown, system name, system type, solution provider, deployment model, country coverage, go-live date, connected systems (repeating), due date.

### SCR-006: Assessment Overview
- **Components**: Status badge and workflow timeline, completion ring, section progress list, team assignments, due date, activity feed, submission readiness checklist.

### SCR-007: Section Navigation / Questionnaire Screen
- **Layout (three-panel)**:
  - **Left**: Section list with progress rings, filter chips (All / Incomplete / Flagged / Complete), search box.
  - **Centre**: Active requirement with all response fields, tabs: Evidence & Notes / Review / Discussion.
  - **Right**: Minimap of requirements with color-coded status dots.
- **Keyboard shortcuts**: `/` focus search, `↑↓` navigate, `1-4` set compliance, `Ctrl+Enter` jump to next incomplete.
- **Autosave indicator**: "All changes saved" / "Saving…" pill in header.

### SCR-008: Evidence Upload Panel
- **Components**: Dropzone, file list (name, size, type icon, upload date, scan status badge, remove), confidentiality selector.
- **Upload flow**: Pre-signed URL → upload to object storage → confirm to API.
- **States**: Uploading, Scanning, Clean, Quarantined, Archived.

### SCR-009: Team Management Screen
- **Components**: Team member list with roles and assignments, invite by email form, section assignment grid, reassignment controls.

### SCR-010: Submission Review Screen
- **Components**: Progress summary, blocking issues list with links, score estimate, submission confirmation checkbox, submit button.

### SCR-011: Submission Confirmation Screen
- **Components**: Success state, submission reference number, timestamp, "What happens next" guidance, receipt download.

### SCR-012: Reviewer Dashboard
- **Components**: Work queue (assigned assessments with status and deadline), filter by status, reviewer performance metrics, evidence request queue.

### SCR-013: Reviewer Work Screen
- **Layout**: Same three-panel as SCR-007 but requirement answers are read-only.
- **Centre**: Answer (read-only) + reviewer finding form (outcome, internal note, applicant-visible comment toggle, evidence request button).
- **Right**: Evidence panel with preview, download, and metadata.

### SCR-014: Evidence Request Screen
- **Reviewer creates**: Requirement reference, description, reason, recipient, due date, priority.
- **Contributor responds**: View request detail, upload files, add text, submit.
- **Status timeline**: Visual progression.

### SCR-015: Adjudication Screen
- **Components**: Side-by-side reviewer findings, adjudicator decision form per contested requirement, overall recommendation, decision rationale.

### SCR-016: Approval Screen
- **Components**: Assessment summary, reviewer report, adjudication summary, overall score with color coding, Approve / Reject / Return buttons, decision rationale, digital acknowledgment.

### SCR-017: Results Overview
- **Components**: Overall score gauge, color band classification, section score breakdown, requirement-level results table with reviewer findings and evidence status.
- **Visibility**: Available to applicant after APPROVED.

### SCR-018: Analytics Dashboard
- **Components**: Summary metrics grid, assessments by status chart, average score by section, score distribution, country/org comparison table, filter panel.
- **Access**: ACSA Admin, Reviewer, Approver, Progress Monitor (filtered).

### SCR-019: Reports Screen
- **Components**: Report type selector, parameter forms, generate button, download history.

### SCR-020: Notification Centre
- **Components**: Notification list (type icon, message, timestamp, read/unread, source link), mark all read, notification preferences link.

### SCR-021: User Profile and Settings
- **Fields**: Name, email (managed in Keycloak), language preference, notification preferences, active sessions.

### SCR-022: Organization Settings
- **Tabs**: Profile, Members, Assessments, Documents, Activity.

### SCR-023: Admin — User Management
- **Components**: User table (name, email, org, roles, status, last login), filters, invite, deactivate, role change.

### SCR-024: Admin — Organization Management
- **Components**: Org table, pending approval queue, approve/reject actions.

### SCR-025: Admin — Questionnaire Builder
- **Components**: Hierarchical tree editor (sections → categories → requirements), requirement form, drag-and-drop ordering, bulk CSV import, translation status indicator.

### SCR-026: Admin — Questionnaire Version Manager
- **Components**: Version list (number, status, published date, active assessments count), fork, publish, retire, diff view.

### SCR-027: Admin — Scoring Configuration
- **Components**: Response type → score mapping table, priority weight table, threshold table, worked example calculator.

### SCR-028: Admin — Translation Management
- **Components**: String table (key, EN original, FR, PT, status), filter untranslated, bulk export/import XLIFF.

### SCR-029: Admin — Audit Logs
- **Components**: Event table (timestamp, event type, actor, resource, details), filter, export.

### SCR-030: Admin — System Settings
- **Settings**: Max file size, allowed file types, session timeout, notification provider, default language, feature flags.

### SCR-031: Manuals and Videos
- **Components**: Role-filtered content list, search, PDF viewer, video player, FAQ accordion.

---

## SECTION 9 — REACT NATIVE FRONTEND ARCHITECTURE

### 9.1 Technology Decisions

| Concern | Choice | Rationale |
|---|---|---|
| Language | TypeScript (strict) | Type safety, IDE support |
| Navigation | React Navigation v7 | Production standard, deep-link support |
| State management | Zustand | Lightweight, TypeScript-first |
| Server state | TanStack Query (React Query v5) | Caching, background refresh, optimistic updates |
| Forms | React Hook Form + Zod | Performance, schema-driven validation |
| API client | Axios with interceptors | Token refresh, request/response transforms |
| Token storage | `expo-secure-store` | iOS Keychain / Android Keystore |
| Offline storage | `expo-sqlite` with SQLCipher | Encrypted structured local storage |
| Localization | `i18next` + `react-i18next` + `expo-localization` | Pluralization, RTL ready |
| File upload | `expo-document-picker` + resumable upload to pre-signed URL | Large file support |
| UI components | React Native Paper (Material Design 3) | Accessible, themed, cross-platform |
| Charts | Victory Native | Cross-platform, animated |
| Error tracking | Sentry | Crash reporting |
| Testing | Jest + React Native Testing Library + Detox (E2E) | Standard stack |
| Build | EAS Build (Expo Application Services) | Managed builds, OTA updates |

### 9.2 Directory Structure

```
src/
├── app/
│   ├── App.tsx
│   └── providers/            # QueryClient, i18n, theme, navigation
├── navigation/
│   ├── PublicNavigator.tsx
│   ├── AuthenticatedNavigator.tsx
│   ├── AdminNavigator.tsx
│   ├── ReviewerNavigator.tsx
│   ├── linking.ts
│   └── types.ts
├── screens/
│   ├── auth/
│   ├── dashboard/
│   ├── assessment/
│   ├── questionnaire/
│   ├── evidence/
│   ├── review/
│   ├── results/
│   ├── analytics/
│   ├── admin/
│   └── settings/
├── features/
│   ├── auth/
│   ├── organizations/
│   ├── assessments/
│   ├── questionnaires/
│   ├── responses/
│   │   ├── hooks/
│   │   ├── store/            # Offline drafts (Zustand)
│   │   └── sync/             # Sync queue, conflict resolver
│   ├── evidence/
│   ├── reviews/
│   ├── adjudication/
│   ├── results/
│   ├── analytics/
│   ├── notifications/
│   └── settings/
├── components/
│   ├── ui/                   # Atoms: Button, Input, Badge
│   ├── forms/                # Form field wrappers
│   ├── charts/               # Score gauges, bar charts
│   ├── layouts/              # ScreenLayout, SplitLayout (tablet)
│   └── feedback/             # Toast, ErrorBoundary, EmptyState
├── hooks/
├── services/
├── api/
│   ├── client.ts             # Axios instance, interceptors
│   ├── endpoints.ts
│   └── types/
├── state/
├── storage/
│   ├── secureStorage.ts
│   ├── draftStorage.ts
│   └── db.ts
├── localization/
│   ├── i18n.ts
│   ├── en/
│   ├── fr/
│   └── pt/
├── validation/               # Zod schemas
├── permissions/              # Role-gate components and hooks
├── theme/
│   ├── tokens.ts
│   └── theme.ts
└── types/
```

### 9.3 Navigation Structure

```
RootNavigator
├── PublicStack (unauthenticated)
│   ├── LoginScreen           # OIDC redirect
│   ├── RegisterScreen
│   └── OAuthCallbackScreen
└── AuthenticatedStack
    ├── BottomTabNavigator
    │   ├── DashboardTab
    │   │   └── AssessmentDetailStack
    │   │       ├── AssessmentOverviewScreen
    │   │       ├── QuestionnaireNavigatorScreen
    │   │       ├── EvidenceScreen
    │   │       ├── TeamScreen
    │   │       ├── SubmissionScreen
    │   │       └── ResultsScreen
    │   ├── ReviewTab (Reviewer roles only)
    │   │   └── ReviewStack
    │   │       ├── ReviewerDashboardScreen
    │   │       ├── ReviewWorkScreen
    │   │       └── EvidenceRequestScreen
    │   ├── AnalyticsTab (Admin/Reviewer roles)
    │   ├── NotificationsTab
    │   └── MoreTab
    │       ├── ProfileScreen
    │       ├── OrganizationSettingsScreen
    │       ├── ManualsScreen
    │       └── AdminNavigator (Admin roles only)
    │           ├── UserManagementScreen
    │           ├── OrganizationManagementScreen
    │           ├── QuestionnaireBuilderScreen
    │           ├── ScoringConfigScreen
    │           ├── TranslationScreen
    │           └── AuditLogScreen
    └── ModalStack (overlays)
        ├── EvidenceUploadModal
        ├── EvidenceRequestModal
        └── ConfirmSubmissionModal
```

### 9.4 Offline Strategy

1. All in-progress responses stored in encrypted local SQLite.
2. Sync queue stores pending PATCH operations with timestamp, version, and retry count.
3. On reconnect, queue processed in chronological order.
4. If server returns 409 (version conflict), conflict resolver offers: Keep local / Keep server / Merge (side-by-side diff).
5. Questionnaire structure cached in SQLite for offline reading.
6. Evidence files cached locally until upload confirmed by server.
7. Network status indicator in header: "Connected" / "Offline — changes will sync when reconnected".

---

## SECTION 10 — FASTAPI BACKEND ARCHITECTURE

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

## SECTION 11 — POSTGRESQL DATA MODEL

### 11.1 Global Conventions

- UUID v7 primary keys (time-sortable).
- All tables include `created_at TIMESTAMPTZ NOT NULL DEFAULT now()` and `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`.
- All tables include `created_by UUID REFERENCES users(id)` where a creator exists.
- Soft deletes via `deleted_at TIMESTAMPTZ` on mutable entities.
- Immutable tables (audit_events, response_versions, score_snapshots) have no `deleted_at`.
- Organization-owned data always has `organization_id` for row-level security.

### 11.2 Core Tables

#### `users`
```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keycloak_sub    VARCHAR(255) NOT NULL UNIQUE,
  email           VARCHAR(255) NOT NULL UNIQUE,
  full_name       VARCHAR(255) NOT NULL,
  preferred_lang  CHAR(2) NOT NULL DEFAULT 'en',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);
```

#### `organizations`
```sql
CREATE TABLE organizations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  type_id         SMALLINT NOT NULL REFERENCES organization_types(id),
  country_code    CHAR(2) REFERENCES countries(code),
  status          VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL',
  description     TEXT,
  website         VARCHAR(500),
  approved_by     UUID REFERENCES users(id),
  approved_at     TIMESTAMPTZ,
  created_by      UUID NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);
```

#### `questionnaire_versions`
```sql
CREATE TABLE questionnaire_versions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id  UUID NOT NULL REFERENCES questionnaires(id),
  version_number    VARCHAR(20) NOT NULL,
  status            VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  description       TEXT,
  changelog         TEXT,
  published_at      TIMESTAMPTZ,
  published_by      UUID REFERENCES users(id),
  effective_date    DATE,
  retired_at        TIMESTAMPTZ,
  created_by        UUID NOT NULL REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_qv UNIQUE (questionnaire_id, version_number)
);
```

#### `requirements`
```sql
CREATE TABLE requirements (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_version_id  UUID NOT NULL REFERENCES questionnaire_versions(id),
  section_id                UUID NOT NULL REFERENCES sections(id),
  stable_id                 VARCHAR(50) NOT NULL,
  display_order             SMALLINT NOT NULL DEFAULT 0,
  requirement_type          VARCHAR(50) NOT NULL,
  priority                  VARCHAR(20) NOT NULL,
  response_type_id          UUID NOT NULL REFERENCES response_types(id),
  evidence_required         BOOLEAN NOT NULL DEFAULT false,
  is_mandatory              BOOLEAN NOT NULL DEFAULT true,
  is_active                 BOOLEAN NOT NULL DEFAULT true,
  scoring_rule_id           UUID REFERENCES scoring_rules(id),
  display_condition         JSONB,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_req_stable_version UNIQUE (stable_id, questionnaire_version_id)
);
```

#### `assessments`
```sql
CREATE TABLE assessments (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id           UUID NOT NULL REFERENCES organizations(id),
  questionnaire_version_id  UUID NOT NULL REFERENCES questionnaire_versions(id),
  name                      VARCHAR(255) NOT NULL,
  description               TEXT,
  status                    VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  due_date                  DATE,
  submitted_at              TIMESTAMPTZ,
  approved_at               TIMESTAMPTZ,
  created_by                UUID NOT NULL REFERENCES users(id),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at                TIMESTAMPTZ
);
```

#### `responses`
```sql
CREATE TABLE responses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id       UUID NOT NULL REFERENCES assessments(id),
  requirement_id      UUID NOT NULL REFERENCES requirements(id),
  version             INTEGER NOT NULL DEFAULT 1,
  compliance_code     VARCHAR(50),
  operating_mode      VARCHAR(20),
  depends_on_systems  BOOLEAN,
  dependent_systems   TEXT,
  text_value          TEXT,
  numeric_value       NUMERIC(15,4),
  date_value          DATE,
  boolean_value       BOOLEAN,
  selected_options    TEXT[],
  is_not_applicable   BOOLEAN NOT NULL DEFAULT false,
  na_justification    TEXT,
  evidence_text       TEXT,
  notes               TEXT,
  is_complete         BOOLEAN NOT NULL DEFAULT false,
  review_outcome      VARCHAR(50),
  answered_by         UUID REFERENCES users(id),
  last_updated_by     UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_response UNIQUE (assessment_id, requirement_id)
);
```

#### `evidence`
```sql
CREATE TABLE file_objects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_key      VARCHAR(1000) NOT NULL UNIQUE,
  bucket          VARCHAR(255) NOT NULL,
  original_name   VARCHAR(500) NOT NULL,
  content_type    VARCHAR(255) NOT NULL,
  size_bytes      BIGINT NOT NULL,
  sha256_checksum VARCHAR(64) NOT NULL,
  scan_status     VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  scanned_at      TIMESTAMPTZ,
  uploaded_by     UUID NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE evidence (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id       UUID NOT NULL REFERENCES assessments(id),
  file_object_id      UUID REFERENCES file_objects(id),
  requirement_id      UUID REFERENCES requirements(id),
  evidence_request_id UUID REFERENCES evidence_requests(id),
  title               VARCHAR(500),
  description         TEXT,
  evidence_type       VARCHAR(100),
  url                 VARCHAR(2000),
  confidentiality     VARCHAR(50) NOT NULL DEFAULT 'STANDARD',
  is_archived         BOOLEAN NOT NULL DEFAULT false,
  version             INTEGER NOT NULL DEFAULT 1,
  uploaded_by         UUID NOT NULL REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `review_findings`
```sql
CREATE TABLE review_findings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id         UUID NOT NULL REFERENCES reviews(id),
  requirement_id    UUID NOT NULL REFERENCES requirements(id),
  reviewer_id       UUID NOT NULL REFERENCES users(id),
  outcome           VARCHAR(50),
  score_override    NUMERIC(6,3),
  override_reason   TEXT,
  internal_note     TEXT,
  applicant_comment TEXT,
  show_to_applicant BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_finding UNIQUE (review_id, requirement_id, reviewer_id)
);
```

#### `evidence_requests`
```sql
CREATE TABLE evidence_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id   UUID NOT NULL REFERENCES assessments(id),
  requirement_id  UUID REFERENCES requirements(id),
  request_number  VARCHAR(50) NOT NULL UNIQUE,
  description     TEXT NOT NULL,
  reason          TEXT,
  requested_by    UUID NOT NULL REFERENCES users(id),
  assigned_to     UUID REFERENCES users(id),
  due_date        DATE,
  priority        VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
  status          VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  reviewer_outcome VARCHAR(50),
  closed_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `approval_decisions`
```sql
CREATE TABLE approval_decisions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id   UUID NOT NULL REFERENCES assessments(id),
  approver_id     UUID NOT NULL REFERENCES users(id),
  outcome         VARCHAR(50) NOT NULL,
  rationale       TEXT NOT NULL,
  decided_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  certificate_key VARCHAR(1000)
);
```

#### `scores` and `score_snapshots`
```sql
CREATE TABLE scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id   UUID NOT NULL REFERENCES assessments(id),
  scope           VARCHAR(50) NOT NULL,
  scope_ref_id    UUID,
  achieved_score  NUMERIC(10,4),
  max_score       NUMERIC(10,4),
  percentage      NUMERIC(5,2),
  color_band      VARCHAR(10),
  na_count        INTEGER NOT NULL DEFAULT 0,
  unanswered_count INTEGER NOT NULL DEFAULT 0,
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_score UNIQUE (assessment_id, scope, scope_ref_id)
);

CREATE TABLE score_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id   UUID NOT NULL REFERENCES assessments(id),
  trigger_event   VARCHAR(50) NOT NULL,
  snapshot        JSONB NOT NULL,
  snapshotted_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `audit_events`
```sql
CREATE TABLE audit_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type      VARCHAR(100) NOT NULL,
  actor_id        UUID REFERENCES users(id),
  organization_id UUID REFERENCES organizations(id),
  assessment_id   UUID REFERENCES assessments(id),
  resource_type   VARCHAR(100),
  resource_id     UUID,
  details         JSONB,
  ip_address      INET,
  user_agent      TEXT,
  trace_id        UUID,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Partitioned by month for retention management
CREATE INDEX idx_audit_actor ON audit_events(actor_id, occurred_at);
CREATE INDEX idx_audit_org ON audit_events(organization_id, occurred_at);
CREATE INDEX idx_audit_type ON audit_events(event_type, occurred_at);
```

### 11.3 Database Design Notes

- **Row-Level Security**: Enable PostgreSQL RLS on `assessments`, `responses`, `evidence`, `review_findings`. Policies filter by `organization_id`.
- **JSONB use cases** (appropriate): `display_condition` on requirements, audit event details, response/score snapshots, system configuration blobs.
- **JSONB non-use cases**: Individual response fields, evidence metadata, filtering/sorting/aggregation targets — use normalized columns.
- **Full-Text Search**: `tsvector` columns on requirement name/description and guidance content. `pg_trgm` for partial name search on organizations and users.
- **Partitioning**: `audit_events` by month (`PARTITION BY RANGE (occurred_at)`). `notifications` by month.
- **All foreign keys indexed**. Partial indexes using `WHERE deleted_at IS NULL`. `responses.is_complete` indexed per assessment.

---

## SECTION 12 — API SPECIFICATION

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

## SECTION 13 — NON-FUNCTIONAL REQUIREMENTS

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

## SECTION 14 — LOCALIZATION SPECIFICATION

### 14.1 Initial Languages

| Code | Language | Status |
|---|---|---|
| `en` | English | Primary (fallback) |
| `fr` | French | Required at production launch |
| `pt` | Portuguese | Required at production launch |

### 14.2 Translation Architecture

- **Static UI strings**: i18next JSON files by namespace (`common`, `auth`, `assessment`, `review`, `admin`, `errors`). Missing translations fall back to English.
- **Dynamic questionnaire content**: Stored in `*_translations` tables. API returns content for user's preferred language, falling back to English.
- **Notification templates**: Stored per language in `notification_templates`.
- **Error messages**: Error codes returned from API; translated client-side.
- **Date/number formatting**: `Intl.DateTimeFormat` and `Intl.NumberFormat` with user's locale.

### 14.3 Translation Workflow

1. New questionnaire version created in English.
2. Translation Administrator exports untranslated strings as XLIFF.
3. Translators return XLIFF. System marks strings translated.
4. Translation review by bilingual reviewer within the platform.
5. Version not publishable until all required languages are 100% translated.

### 14.4 Future RTL Support (Arabic)

- Design token `$text-direction: ltr | rtl` on all layout components.
- Logical CSS properties throughout (`margin-inline-start` not `margin-left`).
- React Navigation supports RTL via `I18nManager.isRTL`.
- Adding Arabic requires: language record, translations, `is_rtl=true`.

---

## SECTION 15 — OFFLINE AND CONNECTIVITY STRATEGY

### 15.1 MVP Offline Scope

| Capability | MVP |
|---|---|
| Browse cached questionnaire structure | ✓ |
| View previously loaded answers | ✓ |
| Enter and save answers without network | ✗ (future) |
| Upload evidence without network | ✗ (future) |
| Submit assessment without network | ✗ (never — requires server validation) |

### 15.2 Draft Response Caching (MVP)

- On every successful autosave, response written to encrypted SQLite.
- On reconnect, if local draft is newer than server, it is automatically submitted.
- If server version is newer, conflict dialog shown.
- Network status indicator in header.

### 15.3 Future Full Offline Mode

- All questionnaire data pre-fetched on assignment.
- All draft responses stored locally in encrypted SQLite.
- Sync queue with timestamps and version vectors.
- Evidence files staged locally, uploaded on reconnect with resumable upload.
- Local data encrypted at rest; wiped on logout and after configurable inactivity.

---

## SECTION 16 — FILE AND OBJECT STORAGE SPECIFICATION

### 16.1 Upload Architecture

```
Client → GET /evidence/upload-url → FastAPI → return pre-signed PUT URL
Client → PUT file directly to MinIO/S3 (pre-signed URL)
Client → POST /evidence/confirm {object_key, sha256} → FastAPI
FastAPI → verify file in storage, compute checksum
FastAPI → create file_objects record (status=PENDING_SCAN)
FastAPI → dispatch virus_scan Celery task
Celery  → download file, scan with ClamAV
Celery  → update scan_status = CLEAN | QUARANTINED
Celery  → notify uploader of result
```

### 16.2 Storage Configuration

| Setting | Value |
|---|---|
| Development | MinIO (`docker compose up minio`) |
| Production | AWS S3, Azure Blob, or GCS (S3-compatible API) |
| Bucket structure | `{env}-acsa-evidence/{organization_id}/{assessment_id}/{uuid}/{filename}` |
| Pre-signed upload URL TTL | 15 minutes |
| Pre-signed download URL TTL | 15 minutes |
| Default max file size | 50 MB (configurable in `system_settings`) |
| Allowed types (default) | PDF, DOCX, XLSX, PPTX, PNG, JPG, GIF, MP4, MOV, ZIP |
| Encryption at rest | AES-256 (SSE-S3 or SSE-KMS) |
| Access | Private bucket; all access via pre-signed URLs only |
| Lifecycle policy | Cold storage after 2 years; delete after 7 years (configurable) |

### 16.3 Confidentiality Classification

| Level | Accessible by |
|---|---|
| `STANDARD` | All assessment members + all reviewers |
| `RESTRICTED` | Assessment Manager + Reviewers + Adjudicators + Approvers |
| `CONFIDENTIAL` | Reviewers + Adjudicators + Approvers + ACSA Admins only |

---

## SECTION 17 — DEPLOYMENT SPECIFICATION

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

## SECTION 18 — MONITORING AND OBSERVABILITY

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

## SECTION 19 — TESTING SPECIFICATION

### 19.1 Testing Strategy

| Layer | Tool | Coverage Target |
|---|---|---|
| Backend unit tests | pytest + pytest-asyncio | ≥ 80% line coverage |
| Backend integration tests | pytest + test PostgreSQL | All API endpoints |
| Backend contract tests | Schemathesis (OpenAPI fuzzing) | All endpoints |
| Frontend unit tests | Jest + React Native Testing Library | ≥ 70% line coverage |
| Frontend E2E tests | Detox (native) / Playwright (web) | All critical user journeys |
| Security tests | OWASP ZAP in CI | Pre-release |
| Load tests | Locust | Before major releases |
| Accessibility tests | axe-core in Playwright | All screens |

### 19.2 Key Test Scenarios

- Valid token → access granted. Expired token → 401. Deactivated account → 403.
- Cannot submit with mandatory unanswered requirements.
- Status transitions only allowed by authorized roles.
- Score snapshot taken at submission and at decision; immutable after.
- Quarantined file not downloadable.
- Two contributors save same response simultaneously → second receives 409.
- Published questionnaire version is immutable → PUT returns 409.

### 19.3 Test Data Strategy

- `pytest` fixtures bootstrap complete test dataset: 1 organization, 1 assessment, all 208 requirements with answers, 1 reviewer, 1 adjudicator, 1 approver.
- Questionnaire seeded from `catalogue.json` via Alembic data migration.
- Test environment uses separate schema (`acsa_test`) with transaction rollback between tests.

---

## SECTION 20 — OPEN DECISIONS REQUIRING STAKEHOLDER CONFIRMATION

| ID | Decision | Options | Impact |
|---|---|---|---|
| **OD-001** | Scoring denominator: `3 × weight` (prototype, max = 66.7%) or `2 × weight` (max = 100%)? | Keep 3 or change to 2 | All threshold values and compliance classifications change. Must decide before seeding `scoring_rules`. |
| **OD-002** | Are "Fully Meets" and "Meets through Configuration" both worth 2 pts, or should "Meets through Configuration" be worth less (e.g., 1.5)? | Keep equal or differentiate | Scoring recalibration. |
| **OD-003** | Should operating mode (Online/Offline/Both) affect the score, or is it metadata only? | Metadata (prototype) or scoring factor | Scoring model redesign if scoring factor. |
| **OD-004** | Is the review workflow at the requirement level, section level, or both? | Requirement / Section / Both | Review finding data model. |
| **OD-005** | Should confidential evidence be visible to the applicant after approval? | Applicant post-approval or Reviewers-only always | Evidence access control. |
| **OD-006** | Can an organization have multiple active assessments simultaneously? | Yes or No | Assessment list and dashboard design. |
| **OD-007** | Who may see the preliminary score during an in-progress assessment? | All / Managers only / Nobody until approval | Score visibility API and UI. |
| **OD-008** | Is SMS notification required for initial production release, or email-only? | Email only or Email + SMS | Notification module scope. |
| **OD-009** | Should the platform support a public directory of approved assessments (opt-in)? | Private only or Opt-in public | Data model, access control, public API. |
| **OD-010** | Is there a minimum score a solution must achieve to be approvable, or is approval fully discretionary? | Threshold-gated or Discretionary | Approval workflow validation. |

---

## SECTION 21 — MISSING PRODUCTION FUNCTIONALITY (PROTOTYPE GAPS SUMMARY)

The following production capabilities have **no prototype implementation** and must be built from scratch:

| Capability | Priority |
|---|---|
| Multi-user collaboration | Critical |
| Server-side persistence | Critical |
| OAuth 2.0 / OIDC authentication | Critical |
| Organization management and approval workflow | Critical |
| Questionnaire version management | Critical |
| Section assignment to team members | High |
| Evidence request workflow | Critical |
| Reviewer dashboard and work queue | Critical |
| Adjudication workflow | High |
| Formal approval with certificate generation | Critical |
| Configurable scoring engine | High |
| Notification system | High |
| Report generation (PDF / Excel / CSV) | High |
| Analytics for multiple organizations | High |
| Audit logging | High |
| Administration panel | High |
| Questionnaire translation management | High |
| Conditional question display | High |
| Full-text search server-side | Medium |
| Conflict-of-interest declaration | Medium |
| Assessment cloning | Medium |
| Progress Monitor role and view | Medium |
| Manuals and guidance content | Medium |
| Malware scanning for uploads | High |
| Server-side file storage | Critical |
| Localization (FR, PT) | High |

---

## SECTION 22 — RECOMMENDED IMPLEMENTATION SEQUENCE

### Phase 1 — Foundation (Months 1–3)

1. Docker Compose setup: PostgreSQL, Redis, Keycloak, MinIO, ClamAV, NGINX.
2. Database schema and Alembic migration pipeline.
3. Seed questionnaire Version 1.0.0 from `catalogue.json`.
4. FastAPI skeleton: config, logging, error handling, health endpoints.
5. Keycloak realm: ACSA realm, client, roles, PKCE configuration.
6. Authentication module: token validation, user sync.
7. Organization registration and approval workflow.
8. React Native scaffold: navigation, i18n, theme, API client, secure token storage.
9. Login, registration, and dashboard screens.

### Phase 2 — Core Assessment Workflow (Months 4–6)

1. Assessment creation, questionnaire loading, section navigation.
2. Response autosave with optimistic concurrency.
3. Evidence upload via pre-signed URLs with malware scanning.
4. Per-section completion and submission.
5. Full assessment submission with validation.
6. Team management, section assignment, notifications.
7. MVP reviewer workflow: finding per requirement, approve/request changes.
8. Basic PDF export.

### Phase 3 — Review and Verification (Months 7–9)

1. Reviewer dashboard and work queue.
2. Evidence request workflow.
3. Adjudication workflow.
4. Formal approval and certificate generation.
5. Assessment return for correction.
6. Score snapshots and final results view.
7. Email notification system.

### Phase 4 — Administration and Analytics (Months 10–12)

1. Administration panel (users, organizations, roles).
2. Questionnaire version builder.
3. Configurable scoring engine.
4. Translation management.
5. Analytics dashboards (server-side).
6. Audit log viewer.
7. French and Portuguese localization.
8. Excel and CSV exports.

### Phase 5 — Production Hardening (Month 13)

1. Load testing and performance optimization.
2. OWASP ZAP security scan and remediation.
3. Accessibility audit and remediation.
4. Backup and recovery drill.
5. Runbook and operations documentation finalization.

---

## SECTION 23 — QUESTIONNAIRE SEED DATA SPECIFICATION

The current `catalogue.json` (208 requirements, 36 categories) should be seeded as Questionnaire Version `1.0.0`:

| JSON field | Database column |
|---|---|
| `id` | `requirements.stable_id` |
| `type` | `requirements.requirement_type` |
| `category` | Resolved to `sections.code` |
| `name` | `requirement_translations.name` (lang='en') |
| `description` | `requirement_translations.description` (lang='en') |
| `priority` | `requirements.priority` |

**Scoring rules seed (Version 1.0.0 — pending OD-001):**

```sql
INSERT INTO scoring_rules (questionnaire_version_id, response_type_id, option_code, score, max_possible_score) VALUES
  (v1_id, compliance_type_id, 'FULLY_MEETS',                 2.0, 3.0),
  (v1_id, compliance_type_id, 'MEETS_THROUGH_CONFIGURATION', 2.0, 3.0),
  (v1_id, compliance_type_id, 'CUSTOMIZATION_REQUIRED',      1.0, 3.0),
  (v1_id, compliance_type_id, 'NOT_AVAILABLE',               0.0, 3.0);

INSERT INTO requirement_weights (questionnaire_version_id, priority, weight) VALUES
  (v1_id, 'MUST',   2.0),
  (v1_id, 'SHOULD', 1.5),
  (v1_id, 'COULD',  1.0);

INSERT INTO score_thresholds (questionnaire_version_id, green_threshold, amber_threshold)
VALUES (v1_id, 80.00, 50.00);
```

---

## SECTION 24 — SAMPLE SCORING WORKED EXAMPLE

Using the prototype model (denominator = 3, pending OD-001):

**Scenario**: 5 requirements (Must×3, Should×1, Could×1 — the Could is answered N/A):

| Req | Priority | Weight | Response | Score | Weighted |
|---|---|---|---|---|---|
| REQ-001 | Must | 2.0 | Fully Meets | 2 | 4.0 |
| REQ-002 | Must | 2.0 | Customization Required | 1 | 2.0 |
| REQ-003 | Must | 2.0 | Not Available | 0 | 0.0 |
| REQ-004 | Should | 1.5 | Meets through Configuration | 2 | 3.0 |
| REQ-005 | Could | 1.0 | N/A (excluded) | — | — |

- Achieved = 9.0
- Max (excluding N/A) = (3×2.0)×3 + (3×1.5) − (3×1.0) = 18 + 4.5 − 3 = **19.5**
- Score = round(9.0 / 19.5 × 100) = **46%** → **Red**

**If denominator were changed to 2 (OD-001 alternative)**:
- Max (excluding N/A) = (2×2.0)×3 + (2×1.5) − (2×1.0) = 12 + 3 − 2 = **13.0**
- Score = round(9.0 / 13.0 × 100) = **69%** → **Amber**

Resolve OD-001 before finalizing scoring configuration, as the denominator choice materially changes compliance classification.

---

## APPENDIX A — REQUIREMENTS STATISTICS FROM PROTOTYPE CATALOGUE

| Metric | Value |
|---|---|
| Total requirements | 208 |
| Functional requirements | 130 |
| Non-functional requirements | 78 |
| Must-have requirements | 113 (54.3%) |
| Should requirements | 81 (38.9%) |
| Could requirements | 14 (6.7%) |
| Maximum weighted score (denominator=3) | 1,084.5 |
| Maximum achievable score | 723.0 (66.7%) |
| Functional categories | 18 |
| Non-functional categories | 18 |
| Total categories | 36 |

**Functional categories**: Declaration (10), Registration (9), Certification (8), Amendments & Corrections (5), Client Messaging (4), Master Data & Identifiers (4), Payment and Fees (6), Vital Statistics (6), Mobile & Offline (7), Authentication & Certificate Verification (5), Duplication Management (6), Case Workflow Management (8), User Management (9), User Portal & Appointments (9), Migration & Legacy Capture (7), Reporting & Analytics (7), Interoperability / Data Sharing / Devices & Peripherals (11), Legal Identity (9).

**Non-functional categories**: Performance (12), Security (13), Privacy (2), Usability & Accessibility (7), Localization (2), Reliability & Availability (11), Safety (7), Compliance & Legal (8), Quality/Maintainability (4), Quality/Testability (1), Quality/Deployability (1), Quality/Portability (2), Quality/Interoperability (3), Quality/Reusability (1), Quality/Error Handling (1), Quality/Archiving (1), Quality/Monitoring & Observability (1), Quality/Operations (1).

---

## APPENDIX B — PROTOTYPE TECHNOLOGY STACK SUMMARY

| Component | Technology |
|---|---|
| Framework | Next.js (App Router) |
| Language | TypeScript |
| UI | Plain CSS (no component library) |
| State | React `useState`, `useSyncExternalStore` |
| Persistence | `localStorage` only |
| Authentication | Custom SHA-256 hash in `localStorage` |
| Evidence storage | Base64 `dataUrl` in `localStorage` (1.5 MB limit) |
| Questionnaire | Hard-coded `catalogue.json` (208 requirements) |
| Scoring | Hard-coded JavaScript constants |
| Multi-user | Not supported |
| Backend | None |
| Database | None |

All of the above is replaced for the production system. The prototype's value is its catalogue data, its scoring concept, and its UX patterns for the question-answering workspace.

---

## APPENDIX C — RECOMMENDED LIBRARY VERSIONS

| Package | Version | Notes |
|---|---|---|
| Python | 3.12 | Required for `asyncio` improvements |
| FastAPI | 0.111+ | Pydantic v2 support |
| SQLAlchemy | 2.0+ | Async engine |
| Alembic | 1.13+ | Migration tool |
| Pydantic | 2.7+ | Validation |
| asyncpg | 0.29+ | PostgreSQL async driver |
| celery | 5.4+ | Background tasks |
| aioboto3 | 13+ | Async S3 |
| python-jose | 3.3+ | JWT validation |
| structlog | 24+ | Structured logging |
| WeasyPrint | 62+ | PDF generation |
| openpyxl | 3.1+ | Excel generation |
| React Native | 0.74+ (Expo SDK 51+) | |
| TypeScript | 5.4+ | |
| React Navigation | 7+ | |
| TanStack Query | 5+ | |
| React Hook Form | 7+ | |
| Zod | 3+ | |
| i18next | 23+ | |
| Zustand | 4+ | |
| React Native Paper | 5+ | |

---

*End of ACSA Self-Evaluation Portal Production System Specification v1.0*

*Based on analysis of prototype source code (`app/page.tsx`, `app/auth.tsx`, `app/use-persistent-state.ts`, `app/catalogue.json`) and the stated product requirements. Sections marked OD-xxx require stakeholder confirmation before implementation begins.*
