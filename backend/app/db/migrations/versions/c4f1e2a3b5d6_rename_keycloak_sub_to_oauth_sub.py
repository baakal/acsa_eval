"""rename_keycloak_sub_to_oauth_sub

Revision ID: c4f1e2a3b5d6
Revises: a1b2c3d4e5f6
Create Date: 2026-08-10 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = 'c4f1e2a3b5d6'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("users", "keycloak_sub", new_column_name="oauth_sub")


def downgrade() -> None:
    op.alter_column("users", "oauth_sub", new_column_name="keycloak_sub")
