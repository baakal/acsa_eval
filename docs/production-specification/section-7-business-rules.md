# SECTION 7 — BUSINESS RULES

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
