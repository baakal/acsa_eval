# SECTION 6 — FUNCTIONAL REQUIREMENTS SPECIFICATION

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
