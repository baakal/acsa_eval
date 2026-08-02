# SECTION 4 — USER AND ROLE MODEL

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
