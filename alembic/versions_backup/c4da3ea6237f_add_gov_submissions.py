"""add_gov_submissions

Revision ID: c4da3ea6237f
Revises: 07624fb82111
Create Date: 2026-04-28 16:09:50.143239

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4da3ea6237f'
down_revision: Union[str, Sequence[str], None] = '07624fb82111'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'gov_submissions',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('record_id', sa.Integer(), nullable=False, index=True),
        sa.Column('record_type', sa.String(20), nullable=False),
        sa.Column('record_name', sa.String(255), nullable=True),
        sa.Column('job_id', sa.String(100), nullable=True, index=True),
        sa.Column('service', sa.String(20), nullable=False, server_default='hkd'),
        sa.Column('status', sa.String(50), nullable=False, server_default='pending'),
        sa.Column('progress', sa.String(255), nullable=True),
        sa.Column('error', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table('gov_submissions')
