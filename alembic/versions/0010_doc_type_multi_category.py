"""0010 — widen tenant_document_types.category for multi-category support

Revision ID: 0010
Revises: 0009
Create Date: 2026-05-21
"""
from alembic import op
import sqlalchemy as sa

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade():
    # Widen category column to hold comma-separated values like "hkd,tldn_1,tldn_2"
    op.alter_column(
        "tenant_document_types",
        "category",
        type_=sa.String(100),
        existing_nullable=False,
        existing_server_default="hkd",
    )


def downgrade():
    op.alter_column(
        "tenant_document_types",
        "category",
        type_=sa.String(20),
        existing_nullable=False,
        existing_server_default="hkd",
    )
