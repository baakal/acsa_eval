"""initial_schema

Revision ID: 2bde9f8bfcde
Revises: 
Create Date: 2026-08-07 11:35:22.357362

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2bde9f8bfcde'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create initial ACSA database schema."""

    # ── organization_types ────────────────────────────────────────────────────
    op.create_table(
        "organization_types",
        sa.Column("id", sa.SmallInteger(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )

    # ── users ─────────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("keycloak_sub", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("preferred_lang", sa.String(2), nullable=False, server_default="en"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("keycloak_sub"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("idx_users_email", "users", ["email"])
    op.create_index("idx_users_keycloak_sub", "users", ["keycloak_sub"])

    # ── organizations ─────────────────────────────────────────────────────────
    op.create_table(
        "organizations",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("type_id", sa.SmallInteger(), nullable=False),
        sa.Column("country_code", sa.String(2), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="PENDING_APPROVAL"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("website", sa.String(500), nullable=True),
        sa.Column("approved_by", sa.dialects.postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["type_id"], ["organization_types.id"]),
        sa.ForeignKeyConstraint(["approved_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_org_status", "organizations", ["status"], postgresql_where=sa.text("deleted_at IS NULL"))

    # ── organization_members ──────────────────────────────────────────────────
    op.create_table(
        "organization_members",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("organization_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("role", sa.String(50), nullable=False, server_default="member"),
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("invited_by", sa.dialects.postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["invited_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "user_id", name="uq_org_member"),
    )

    # ── questionnaires ────────────────────────────────────────────────────────
    op.create_table(
        "questionnaires",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_by", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # ── questionnaire_versions ────────────────────────────────────────────────
    op.create_table(
        "questionnaire_versions",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("questionnaire_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("version_number", sa.String(20), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="DRAFT"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("changelog", sa.Text(), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("published_by", sa.dialects.postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("effective_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("retired_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["questionnaire_id"], ["questionnaires.id"]),
        sa.ForeignKeyConstraint(["published_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("questionnaire_id", "version_number", name="uq_qv"),
    )

    # ── sections ──────────────────────────────────────────────────────────────
    op.create_table(
        "sections",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("questionnaire_version_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("stable_id", sa.String(100), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("display_order", sa.SmallInteger(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["questionnaire_version_id"], ["questionnaire_versions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # ── requirements ──────────────────────────────────────────────────────────
    op.create_table(
        "requirements",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("questionnaire_version_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("section_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("stable_id", sa.String(50), nullable=False),
        sa.Column("name", sa.String(500), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("guidance", sa.Text(), nullable=True),
        sa.Column("display_order", sa.SmallInteger(), nullable=False, server_default="0"),
        sa.Column("requirement_type", sa.String(50), nullable=False),
        sa.Column("priority", sa.String(20), nullable=False),
        sa.Column("evidence_required", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_mandatory", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("display_condition", sa.dialects.postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["questionnaire_version_id"], ["questionnaire_versions.id"]),
        sa.ForeignKeyConstraint(["section_id"], ["sections.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("stable_id", "questionnaire_version_id", name="uq_req_stable_version"),
    )
    op.create_index("idx_req_section", "requirements", ["section_id"])
    op.create_index("idx_req_version", "requirements", ["questionnaire_version_id"])

    # ── assessments ───────────────────────────────────────────────────────────
    op.create_table(
        "assessments",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("organization_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("questionnaire_version_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="DRAFT"),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["questionnaire_version_id"], ["questionnaire_versions.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_assessment_org", "assessments", ["organization_id"], postgresql_where=sa.text("deleted_at IS NULL"))
    op.create_index("idx_assessment_status", "assessments", ["status"], postgresql_where=sa.text("deleted_at IS NULL"))

    # ── responses ─────────────────────────────────────────────────────────────
    op.create_table(
        "responses",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("assessment_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("requirement_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("compliance_code", sa.String(50), nullable=True),
        sa.Column("operating_mode", sa.String(20), nullable=True),
        sa.Column("depends_on_systems", sa.Boolean(), nullable=True),
        sa.Column("dependent_systems", sa.Text(), nullable=True),
        sa.Column("text_value", sa.Text(), nullable=True),
        sa.Column("is_not_applicable", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("na_justification", sa.Text(), nullable=True),
        sa.Column("evidence_text", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_complete", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("review_outcome", sa.String(50), nullable=True),
        sa.Column("answered_by", sa.dialects.postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("last_updated_by", sa.dialects.postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["assessment_id"], ["assessments.id"]),
        sa.ForeignKeyConstraint(["requirement_id"], ["requirements.id"]),
        sa.ForeignKeyConstraint(["answered_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["last_updated_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("assessment_id", "requirement_id", name="uq_response"),
    )
    op.create_index("idx_response_assessment", "responses", ["assessment_id"])
    op.create_index("idx_response_complete", "responses", ["assessment_id", "is_complete"])

    # ── file_objects ──────────────────────────────────────────────────────────
    op.create_table(
        "file_objects",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("object_key", sa.String(1000), nullable=False),
        sa.Column("bucket", sa.String(255), nullable=False),
        sa.Column("original_name", sa.String(500), nullable=False),
        sa.Column("content_type", sa.String(255), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("sha256_checksum", sa.String(64), nullable=False),
        sa.Column("scan_status", sa.String(50), nullable=False, server_default="PENDING"),
        sa.Column("scanned_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("uploaded_by", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["uploaded_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("object_key"),
    )

    # ── evidence ──────────────────────────────────────────────────────────────
    op.create_table(
        "evidence",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("assessment_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("file_object_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("requirement_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("title", sa.String(500), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("evidence_type", sa.String(100), nullable=True),
        sa.Column("url", sa.String(2000), nullable=True),
        sa.Column("confidentiality", sa.String(50), nullable=False, server_default="STANDARD"),
        sa.Column("is_archived", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("uploaded_by", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["assessment_id"], ["assessments.id"]),
        sa.ForeignKeyConstraint(["file_object_id"], ["file_objects.id"]),
        sa.ForeignKeyConstraint(["requirement_id"], ["requirements.id"]),
        sa.ForeignKeyConstraint(["uploaded_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_evidence_assessment", "evidence", ["assessment_id"])
    op.create_index("idx_evidence_requirement", "evidence", ["requirement_id"])

    # ── reviews ───────────────────────────────────────────────────────────────
    op.create_table(
        "reviews",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("assessment_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("reviewer_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="IN_PROGRESS"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["assessment_id"], ["assessments.id"]),
        sa.ForeignKeyConstraint(["reviewer_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # ── review_findings ───────────────────────────────────────────────────────
    op.create_table(
        "review_findings",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("review_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("requirement_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("reviewer_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("outcome", sa.String(50), nullable=True),
        sa.Column("score_override", sa.Numeric(6, 3), nullable=True),
        sa.Column("override_reason", sa.Text(), nullable=True),
        sa.Column("internal_note", sa.Text(), nullable=True),
        sa.Column("applicant_comment", sa.Text(), nullable=True),
        sa.Column("show_to_applicant", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["review_id"], ["reviews.id"]),
        sa.ForeignKeyConstraint(["requirement_id"], ["requirements.id"]),
        sa.ForeignKeyConstraint(["reviewer_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("review_id", "requirement_id", "reviewer_id", name="uq_finding"),
    )

    # ── evidence_requests ─────────────────────────────────────────────────────
    op.create_table(
        "evidence_requests",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("assessment_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("requirement_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("request_number", sa.String(50), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("requested_by", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("assigned_to", sa.dialects.postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("priority", sa.String(20), nullable=False, server_default="NORMAL"),
        sa.Column("status", sa.String(50), nullable=False, server_default="DRAFT"),
        sa.Column("reviewer_outcome", sa.String(50), nullable=True),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["assessment_id"], ["assessments.id"]),
        sa.ForeignKeyConstraint(["requirement_id"], ["requirements.id"]),
        sa.ForeignKeyConstraint(["requested_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["assigned_to"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("request_number"),
    )

    # ── approval_decisions ────────────────────────────────────────────────────
    op.create_table(
        "approval_decisions",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("assessment_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("approver_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("outcome", sa.String(50), nullable=False),
        sa.Column("rationale", sa.Text(), nullable=False),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("certificate_key", sa.String(1000), nullable=True),
        sa.ForeignKeyConstraint(["assessment_id"], ["assessments.id"]),
        sa.ForeignKeyConstraint(["approver_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # ── audit_events ──────────────────────────────────────────────────────────
    op.create_table(
        "audit_events",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column("actor_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("organization_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("assessment_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("resource_type", sa.String(100), nullable=True),
        sa.Column("resource_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("details", sa.dialects.postgresql.JSONB(), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("trace_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["assessment_id"], ["assessments.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_audit_actor", "audit_events", ["actor_id", "occurred_at"])
    op.create_index("idx_audit_org", "audit_events", ["organization_id", "occurred_at"])
    op.create_index("idx_audit_type", "audit_events", ["event_type", "occurred_at"])

    # ── notifications ─────────────────────────────────────────────────────────
    op.create_table(
        "notifications",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("notification_type", sa.String(100), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("link", sa.String(500), nullable=True),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_notification_user_unread", "notifications", ["user_id", "is_read"],
                    postgresql_where=sa.text("is_read = false"))

    # ── seed: organization_types ──────────────────────────────────────────────
    op.execute("""
        INSERT INTO organization_types (name, description) VALUES
        ('Government',      'National or regional civil registration authority'),
        ('Solution Provider', 'Technology vendor providing a CRVS system'),
        ('NGO',             'Non-governmental organisation supporting civil registration'),
        ('International Organisation', 'International body or donor organisation'),
        ('Other',           'Other organisation type')
    """)


def downgrade() -> None:
    """Drop all tables in reverse dependency order."""
    op.drop_table("notifications")
    op.drop_table("audit_events")
    op.drop_table("approval_decisions")
    op.drop_table("evidence_requests")
    op.drop_table("review_findings")
    op.drop_table("reviews")
    op.drop_table("evidence")
    op.drop_table("file_objects")
    op.drop_table("responses")
    op.drop_table("assessments")
    op.drop_table("requirements")
    op.drop_table("sections")
    op.drop_table("questionnaire_versions")
    op.drop_table("questionnaires")
    op.drop_table("organization_members")
    op.drop_table("organizations")
    op.drop_table("users")
    op.drop_table("organization_types")
