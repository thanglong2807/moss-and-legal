"""fix_gov_jobs_constraints

Revision ID: 4faa75814a4c
Revises: 920a2f9c594a
Create Date: 2026-04-28 17:24:56.013205

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4faa75814a4c'
down_revision: Union[str, Sequence[str], None] = '920a2f9c594a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop unique constraint on job_id — same job_id can be resubmitted
    op.drop_index('ix_gov_jobs_job_id', table_name='gov_jobs')
    op.create_index('ix_gov_jobs_job_id', 'gov_jobs', ['job_id'], unique=False)
    # Make legacy columns nullable so new inserts don't need them
    op.alter_column('gov_jobs', 'profile_id', existing_type=sa.String(100), nullable=True)
    op.alter_column('gov_jobs', 'task_name', existing_type=sa.String(100), nullable=True)


def downgrade() -> None:
    op.alter_column('gov_jobs', 'task_name', existing_type=sa.String(100), nullable=False)
    op.alter_column('gov_jobs', 'profile_id', existing_type=sa.String(100), nullable=False)
    op.drop_index('ix_gov_jobs_job_id', table_name='gov_jobs')
    op.create_index('ix_gov_jobs_job_id', 'gov_jobs', ['job_id'], unique=True)
