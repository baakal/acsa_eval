# SECTION 5 — USER JOURNEYS

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
