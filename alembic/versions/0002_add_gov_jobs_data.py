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


EXPECTED_GOV_JOBS_COLS = {
    'record_id':   sa.Integer(),
    'record_type': sa.String(20),
    'record_name': sa.String(255),
    'service':     sa.String(20),
    'progress':    sa.String(255),
    'error':       sa.Text(),
    'data':        sa.Text(),
}


def _existing_cols(table):
    from sqlalchemy import inspect
    return {c['name'] for c in inspect(op.get_bind()).get_columns(table)}


def upgrade():
    existing = _existing_cols('gov_jobs')
    for col, typ in EXPECTED_GOV_JOBS_COLS.items():
        if col not in existing:
            op.add_column('gov_jobs', sa.Column(col, typ, nullable=True))

    if 'birth_date' not in _existing_cols('users'):
        op.add_column('users', sa.Column('birth_date', sa.String(10), nullable=True))


def downgrade():
    op.drop_column('gov_jobs', 'data')
    op.drop_column('users', 'birth_date')
