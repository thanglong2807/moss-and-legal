"""extend_gov_jobs

Revision ID: 920a2f9c594a
Revises: c4da3ea6237f
Create Date: 2026-04-28 16:20:40.345428

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '920a2f9c594a'
down_revision: Union[str, Sequence[str], None] = 'c4da3ea6237f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('gov_jobs', sa.Column('record_id', sa.Integer(), nullable=True))
    op.add_column('gov_jobs', sa.Column('record_type', sa.String(20), nullable=True))
    op.add_column('gov_jobs', sa.Column('record_name', sa.String(255), nullable=True))
    op.add_column('gov_jobs', sa.Column('service', sa.String(20), nullable=True, server_default='hkd'))
    op.add_column('gov_jobs', sa.Column('progress', sa.String(255), nullable=True))
    op.add_column('gov_jobs', sa.Column('error', sa.Text(), nullable=True))
    op.create_index('ix_gov_jobs_record_id', 'gov_jobs', ['record_id'])


def downgrade() -> None:
    op.drop_index('ix_gov_jobs_record_id', table_name='gov_jobs')
    op.drop_column('gov_jobs', 'error')
    op.drop_column('gov_jobs', 'progress')
    op.drop_column('gov_jobs', 'service')
    op.drop_column('gov_jobs', 'record_name')
    op.drop_column('gov_jobs', 'record_type')
    op.drop_column('gov_jobs', 'record_id')
