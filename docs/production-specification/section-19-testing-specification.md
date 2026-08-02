# SECTION 19 — TESTING SPECIFICATION

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
