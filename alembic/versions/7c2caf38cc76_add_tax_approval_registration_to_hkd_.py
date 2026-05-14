"""add_tax_approval_registration_to_hkd_company

Revision ID: 7c2caf38cc76
Revises: 0002_add_gov_jobs_data
Create Date: 2026-05-14 06:20:50.336941

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision: str = '7c2caf38cc76'
down_revision: Union[str, Sequence[str], None] = '0002_add_gov_jobs_data'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('business_households', sa.Column('tax_code', sa.String(length=20), nullable=True))
    op.add_column('business_households', sa.Column('approval_date', sa.String(length=10), nullable=True))
    op.add_column('business_households', sa.Column('registration_date', sa.String(length=10), nullable=True))
    op.add_column('companies', sa.Column('tax_code', sa.String(length=20), nullable=True))
    op.add_column('companies', sa.Column('approval_date', sa.String(length=10), nullable=True))
    op.add_column('companies', sa.Column('registration_date', sa.String(length=10), nullable=True))


def downgrade() -> None:
    op.drop_column('companies', 'registration_date')
    op.drop_column('companies', 'approval_date')
    op.drop_column('companies', 'tax_code')
    op.drop_column('business_households', 'registration_date')
    op.drop_column('business_households', 'approval_date')
    op.drop_column('business_households', 'tax_code')
