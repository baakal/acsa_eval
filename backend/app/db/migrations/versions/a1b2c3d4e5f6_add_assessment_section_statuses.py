"""add_assessment_section_statuses

Revision ID: a1b2c3d4e5f6
Revises: 2bde9f8bfcde
Create Date: 2026-08-09 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '2bde9f8bfcde'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "assessment_section_statuses",
        sa.Column(
            "id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("assessment_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("section_stable_id", sa.String(100), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="Draft"),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.ForeignKeyConstraint(["assessment_id"], ["assessments.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("assessment_id", "section_stable_id", name="uq_section_status"),
    )
    op.create_index(
        "idx_section_status_assessment",
        "assessment_section_statuses",
        ["assessment_id"],
    )


def downgrade() -> None:
    op.drop_index("idx_section_status_assessment", table_name="assessment_section_statuses")
    op.drop_table("assessment_section_statuses")
