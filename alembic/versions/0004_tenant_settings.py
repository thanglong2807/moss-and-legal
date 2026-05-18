"""tenant settings column

Revision ID: 0004_tenant_settings
Revises: 0003_multi_tenant
Create Date: 2025-01-01 00:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = "0004_tenant_settings"
down_revision = "0003_multi_tenant"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("tenants", sa.Column("settings", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("tenants", "settings")
