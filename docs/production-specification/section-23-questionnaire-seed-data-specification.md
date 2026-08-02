# SECTION 23 — QUESTIONNAIRE SEED DATA SPECIFICATION

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
