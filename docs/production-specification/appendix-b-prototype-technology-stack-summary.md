# APPENDIX B — PROTOTYPE TECHNOLOGY STACK SUMMARY

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
