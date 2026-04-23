"""add companies rename household_industries

Revision ID: c1a2b3d4e5f6
Revises: fdb3f9f52f2b
Create Date: 2026-04-18

"""
from alembic import op
import sqlalchemy as sa

revision = 'c1a2b3d4e5f6'
down_revision = 'fdb3f9f52f2b'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. profile_industries already exists (renamed outside Alembic).
    #    Use raw SQL to avoid batch_alter FK name collision on MySQL.
    conn = op.get_bind()
    # Drop existing FK on household_id so we can freely repurpose the column
    conn.execute(sa.text("ALTER TABLE profile_industries DROP FOREIGN KEY profile_industries_ibfk_1"))
    # Rename column household_id → profile_id (MySQL 8.0+)
    conn.execute(sa.text("ALTER TABLE profile_industries RENAME COLUMN household_id TO profile_id"))
    # Add service_type column with default 'hkd'
    conn.execute(sa.text("ALTER TABLE profile_industries ADD COLUMN service_type VARCHAR(20) NOT NULL DEFAULT 'hkd'"))

    # 2. company_positions
    op.create_table(
        'company_positions',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('is_llc1', sa.Boolean(), default=False, nullable=False, server_default='0'),
        sa.Column('is_llc2', sa.Boolean(), default=False, nullable=False, server_default='0'),
        sa.Column('is_jsc', sa.Boolean(), default=False, nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
    )

    # 3. companies
    op.create_table(
        'companies',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('code', sa.String(20), unique=True, nullable=False),
        sa.Column('company_type', sa.SmallInteger(), nullable=False),
        sa.Column('company_full_name', sa.String(255), nullable=True),
        sa.Column('company_foreign_name', sa.String(255), nullable=True),
        sa.Column('company_short_name', sa.String(255), nullable=True),
        sa.Column('province_id', sa.Integer(), sa.ForeignKey('administrative_units.id'), nullable=True),
        sa.Column('district_id', sa.Integer(), sa.ForeignKey('administrative_units.id'), nullable=True),
        sa.Column('ward_id', sa.Integer(), sa.ForeignKey('administrative_units.id'), nullable=True),
        sa.Column('street', sa.String(255), nullable=True),
        sa.Column('phone', sa.String(20), nullable=True),
        sa.Column('fax', sa.String(20), nullable=True),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('website', sa.String(255), nullable=True),
        sa.Column('charter_capital', sa.BigInteger(), nullable=True),
        sa.Column('customer_id', sa.Integer(), sa.ForeignKey('customers.id'), nullable=True),
        sa.Column('handling_staff_id', sa.Integer(), sa.ForeignKey('staff_configs.id'), nullable=True),
        sa.Column('supporting_staff_id', sa.Integer(), sa.ForeignKey('staff_configs.id'), nullable=True),
        sa.Column('status_id', sa.Integer(), sa.ForeignKey('status_configs.id'), nullable=True),
        sa.Column('source_id', sa.Integer(), sa.ForeignKey('source_configs.id'), nullable=True),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('crm_link', sa.String(500), nullable=True),
        sa.Column('id_crm', sa.String(100), nullable=True),
        sa.Column('paid_amount', sa.BigInteger(), nullable=True),
        sa.Column('folder_id', sa.String(200), nullable=True),
        sa.Column('accounting_name', sa.String(255), nullable=True),
        sa.Column('accounting_phone', sa.String(20), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
    )

    # 4. company_persons
    op.create_table(
        'company_persons',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('company_id', sa.Integer(), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('person_type', sa.String(20), nullable=False),
        sa.Column('position_id', sa.Integer(), sa.ForeignKey('company_positions.id'), nullable=True),
        sa.Column('full_name', sa.String(255), nullable=True),
        sa.Column('gender', sa.SmallInteger(), nullable=True),
        sa.Column('birth_date', sa.Date(), nullable=True),
        sa.Column('id_number', sa.String(20), nullable=True),
        sa.Column('province_id', sa.Integer(), sa.ForeignKey('administrative_units.id'), nullable=True),
        sa.Column('ward_id', sa.Integer(), sa.ForeignKey('administrative_units.id'), nullable=True),
        sa.Column('street', sa.String(255), nullable=True),
        sa.Column('phone', sa.String(20), nullable=True),
        sa.Column('fax', sa.String(20), nullable=True),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('ownership_percentage', sa.Float(), nullable=True),
        sa.Column('asset_type_ratio', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table('company_persons')
    op.drop_table('companies')
    op.drop_table('company_positions')

    conn = op.get_bind()
    conn.execute(sa.text("ALTER TABLE profile_industries DROP COLUMN service_type"))
    conn.execute(sa.text("ALTER TABLE profile_industries RENAME COLUMN profile_id TO household_id"))
    conn.execute(sa.text("ALTER TABLE profile_industries ADD CONSTRAINT profile_industries_ibfk_1 FOREIGN KEY (household_id) REFERENCES business_households(id) ON DELETE CASCADE"))
