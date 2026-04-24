"""add gov_jobs table

Revision ID: 07624fb82111
Revises: 17b109925252
Create Date: 2026-04-24 11:12:32.082913

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '07624fb82111'
down_revision: Union[str, Sequence[str], None] = '17b109925252'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'gov_jobs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('job_id', sa.String(100), nullable=False),
        sa.Column('profile_id', sa.String(100), nullable=False),
        sa.Column('task_name', sa.String(100), nullable=False),
        sa.Column('status', sa.String(50), nullable=False, server_default='pending'),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_gov_jobs_id', 'gov_jobs', ['id'], unique=False)
    op.create_index('ix_gov_jobs_job_id', 'gov_jobs', ['job_id'], unique=True)
    op.create_index('ix_gov_jobs_profile_id', 'gov_jobs', ['profile_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_gov_jobs_profile_id', table_name='gov_jobs')
    op.drop_index('ix_gov_jobs_job_id', table_name='gov_jobs')
    op.drop_index('ix_gov_jobs_id', table_name='gov_jobs')
    op.drop_table('gov_jobs')
