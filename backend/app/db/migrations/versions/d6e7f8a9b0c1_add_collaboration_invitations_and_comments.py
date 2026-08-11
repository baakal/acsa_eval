"""add collaboration invitations and comments

Revision ID: d6e7f8a9b0c1
Revises: c4f1e2a3b5d6
Create Date: 2026-08-11 10:45:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d6e7f8a9b0c1"
down_revision: Union[str, Sequence[str], None] = "c4f1e2a3b5d6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("responses", sa.Column("review_feedback", sa.Text(), nullable=True))

    op.create_table(
        "response_comments",
        sa.Column(
            "id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("response_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("author_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("author_name", sa.String(length=255), nullable=False),
        sa.Column("author_role", sa.String(length=50), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["response_id"], ["responses.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_response_comments_response",
        "response_comments",
        ["response_id", "created_at"],
    )

    op.create_table(
        "invitations",
        sa.Column(
            "id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("organization_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("assessment_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=50), nullable=False, server_default="collaborator"),
        sa.Column("token", sa.String(length=128), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="PENDING"),
        sa.Column("invited_by", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("accepted_by", sa.dialects.postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["accepted_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["assessment_id"], ["assessments.id"]),
        sa.ForeignKeyConstraint(["invited_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token"),
    )
    op.create_index("idx_invitations_email", "invitations", ["email"])


def downgrade() -> None:
    op.drop_index("idx_invitations_email", table_name="invitations")
    op.drop_table("invitations")

    op.drop_index("idx_response_comments_response", table_name="response_comments")
    op.drop_table("response_comments")

    op.drop_column("responses", "review_feedback")
