# SECTION 24 — SAMPLE SCORING WORKED EXAMPLE

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
