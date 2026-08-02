# SECTION 11 — POSTGRESQL DATA MODEL

### 11.1 Global Conventions

- UUID v7 primary keys (time-sortable).
- All tables include `created_at TIMESTAMPTZ NOT NULL DEFAULT now()` and `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`.
- All tables include `created_by UUID REFERENCES users(id)` where a creator exists.
- Soft deletes via `deleted_at TIMESTAMPTZ` on mutable entities.
- Immutable tables (audit_events, response_versions, score_snapshots) have no `deleted_at`.
- Organization-owned data always has `organization_id` for row-level security.

### 11.2 Core Tables

#### `users`
```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keycloak_sub    VARCHAR(255) NOT NULL UNIQUE,
  email           VARCHAR(255) NOT NULL UNIQUE,
  full_name       VARCHAR(255) NOT NULL,
  preferred_lang  CHAR(2) NOT NULL DEFAULT 'en',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);
```

#### `organizations`
```sql
CREATE TABLE organizations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  type_id         SMALLINT NOT NULL REFERENCES organization_types(id),
  country_code    CHAR(2) REFERENCES countries(code),
  status          VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL',
  description     TEXT,
  website         VARCHAR(500),
  approved_by     UUID REFERENCES users(id),
  approved_at     TIMESTAMPTZ,
  created_by      UUID NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);
```

#### `questionnaire_versions`
```sql
CREATE TABLE questionnaire_versions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id  UUID NOT NULL REFERENCES questionnaires(id),
  version_number    VARCHAR(20) NOT NULL,
  status            VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  description       TEXT,
  changelog         TEXT,
  published_at      TIMESTAMPTZ,
  published_by      UUID REFERENCES users(id),
  effective_date    DATE,
  retired_at        TIMESTAMPTZ,
  created_by        UUID NOT NULL REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_qv UNIQUE (questionnaire_id, version_number)
);
```

#### `requirements`
```sql
CREATE TABLE requirements (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_version_id  UUID NOT NULL REFERENCES questionnaire_versions(id),
  section_id                UUID NOT NULL REFERENCES sections(id),
  stable_id                 VARCHAR(50) NOT NULL,
  display_order             SMALLINT NOT NULL DEFAULT 0,
  requirement_type          VARCHAR(50) NOT NULL,
  priority                  VARCHAR(20) NOT NULL,
  response_type_id          UUID NOT NULL REFERENCES response_types(id),
  evidence_required         BOOLEAN NOT NULL DEFAULT false,
  is_mandatory              BOOLEAN NOT NULL DEFAULT true,
  is_active                 BOOLEAN NOT NULL DEFAULT true,
  scoring_rule_id           UUID REFERENCES scoring_rules(id),
  display_condition         JSONB,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_req_stable_version UNIQUE (stable_id, questionnaire_version_id)
);
```

#### `assessments`
```sql
CREATE TABLE assessments (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id           UUID NOT NULL REFERENCES organizations(id),
  questionnaire_version_id  UUID NOT NULL REFERENCES questionnaire_versions(id),
  name                      VARCHAR(255) NOT NULL,
  description               TEXT,
  status                    VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  due_date                  DATE,
  submitted_at              TIMESTAMPTZ,
  approved_at               TIMESTAMPTZ,
  created_by                UUID NOT NULL REFERENCES users(id),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at                TIMESTAMPTZ
);
```

#### `responses`
```sql
CREATE TABLE responses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id       UUID NOT NULL REFERENCES assessments(id),
  requirement_id      UUID NOT NULL REFERENCES requirements(id),
  version             INTEGER NOT NULL DEFAULT 1,
  compliance_code     VARCHAR(50),
  operating_mode      VARCHAR(20),
  depends_on_systems  BOOLEAN,
  dependent_systems   TEXT,
  text_value          TEXT,
  numeric_value       NUMERIC(15,4),
  date_value          DATE,
  boolean_value       BOOLEAN,
  selected_options    TEXT[],
  is_not_applicable   BOOLEAN NOT NULL DEFAULT false,
  na_justification    TEXT,
  evidence_text       TEXT,
  notes               TEXT,
  is_complete         BOOLEAN NOT NULL DEFAULT false,
  review_outcome      VARCHAR(50),
  answered_by         UUID REFERENCES users(id),
  last_updated_by     UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_response UNIQUE (assessment_id, requirement_id)
);
```

#### `evidence`
```sql
CREATE TABLE file_objects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_key      VARCHAR(1000) NOT NULL UNIQUE,
  bucket          VARCHAR(255) NOT NULL,
  original_name   VARCHAR(500) NOT NULL,
  content_type    VARCHAR(255) NOT NULL,
  size_bytes      BIGINT NOT NULL,
  sha256_checksum VARCHAR(64) NOT NULL,
  scan_status     VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  scanned_at      TIMESTAMPTZ,
  uploaded_by     UUID NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE evidence (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id       UUID NOT NULL REFERENCES assessments(id),
  file_object_id      UUID REFERENCES file_objects(id),
  requirement_id      UUID REFERENCES requirements(id),
  evidence_request_id UUID REFERENCES evidence_requests(id),
  title               VARCHAR(500),
  description         TEXT,
  evidence_type       VARCHAR(100),
  url                 VARCHAR(2000),
  confidentiality     VARCHAR(50) NOT NULL DEFAULT 'STANDARD',
  is_archived         BOOLEAN NOT NULL DEFAULT false,
  version             INTEGER NOT NULL DEFAULT 1,
  uploaded_by         UUID NOT NULL REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `review_findings`
```sql
CREATE TABLE review_findings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id         UUID NOT NULL REFERENCES reviews(id),
  requirement_id    UUID NOT NULL REFERENCES requirements(id),
  reviewer_id       UUID NOT NULL REFERENCES users(id),
  outcome           VARCHAR(50),
  score_override    NUMERIC(6,3),
  override_reason   TEXT,
  internal_note     TEXT,
  applicant_comment TEXT,
  show_to_applicant BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_finding UNIQUE (review_id, requirement_id, reviewer_id)
);
```

#### `evidence_requests`
```sql
CREATE TABLE evidence_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id   UUID NOT NULL REFERENCES assessments(id),
  requirement_id  UUID REFERENCES requirements(id),
  request_number  VARCHAR(50) NOT NULL UNIQUE,
  description     TEXT NOT NULL,
  reason          TEXT,
  requested_by    UUID NOT NULL REFERENCES users(id),
  assigned_to     UUID REFERENCES users(id),
  due_date        DATE,
  priority        VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
  status          VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  reviewer_outcome VARCHAR(50),
  closed_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `approval_decisions`
```sql
CREATE TABLE approval_decisions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id   UUID NOT NULL REFERENCES assessments(id),
  approver_id     UUID NOT NULL REFERENCES users(id),
  outcome         VARCHAR(50) NOT NULL,
  rationale       TEXT NOT NULL,
  decided_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  certificate_key VARCHAR(1000)
);
```

#### `scores` and `score_snapshots`
```sql
CREATE TABLE scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id   UUID NOT NULL REFERENCES assessments(id),
  scope           VARCHAR(50) NOT NULL,
  scope_ref_id    UUID,
  achieved_score  NUMERIC(10,4),
  max_score       NUMERIC(10,4),
  percentage      NUMERIC(5,2),
  color_band      VARCHAR(10),
  na_count        INTEGER NOT NULL DEFAULT 0,
  unanswered_count INTEGER NOT NULL DEFAULT 0,
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_score UNIQUE (assessment_id, scope, scope_ref_id)
);

CREATE TABLE score_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id   UUID NOT NULL REFERENCES assessments(id),
  trigger_event   VARCHAR(50) NOT NULL,
  snapshot        JSONB NOT NULL,
  snapshotted_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `audit_events`
```sql
CREATE TABLE audit_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type      VARCHAR(100) NOT NULL,
  actor_id        UUID REFERENCES users(id),
  organization_id UUID REFERENCES organizations(id),
  assessment_id   UUID REFERENCES assessments(id),
  resource_type   VARCHAR(100),
  resource_id     UUID,
  details         JSONB,
  ip_address      INET,
  user_agent      TEXT,
  trace_id        UUID,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Partitioned by month for retention management
CREATE INDEX idx_audit_actor ON audit_events(actor_id, occurred_at);
CREATE INDEX idx_audit_org ON audit_events(organization_id, occurred_at);
CREATE INDEX idx_audit_type ON audit_events(event_type, occurred_at);
```

### 11.3 Database Design Notes

- **Row-Level Security**: Enable PostgreSQL RLS on `assessments`, `responses`, `evidence`, `review_findings`. Policies filter by `organization_id`.
- **JSONB use cases** (appropriate): `display_condition` on requirements, audit event details, response/score snapshots, system configuration blobs.
- **JSONB non-use cases**: Individual response fields, evidence metadata, filtering/sorting/aggregation targets — use normalized columns.
- **Full-Text Search**: `tsvector` columns on requirement name/description and guidance content. `pg_trgm` for partial name search on organizations and users.
- **Partitioning**: `audit_events` by month (`PARTITION BY RANGE (occurred_at)`). `notifications` by month.
- **All foreign keys indexed**. Partial indexes using `WHERE deleted_at IS NULL`. `responses.is_complete` indexed per assessment.

---
