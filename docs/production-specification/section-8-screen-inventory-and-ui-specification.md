# SECTION 8 — SCREEN INVENTORY AND UI SPECIFICATION

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
