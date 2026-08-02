# SECTION 20 — OPEN DECISIONS REQUIRING STAKEHOLDER CONFIRMATION

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
