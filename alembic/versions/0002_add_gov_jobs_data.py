"""add data column to gov_jobs

Revision ID: 0002_add_gov_jobs_data
Revises: 0001_squash_all
Create Date: 2026-05-07
"""
from alembic import op
import sqlalchemy as sa

revision = '0002_add_gov_jobs_data'
down_revision = '0001_squash_all'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('gov_jobs', sa.Column('data', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('birth_date', sa.String(10), nullable=True))


def downgrade():
    op.drop_column('gov_jobs', 'data')
    op.drop_column('users', 'birth_date')
