"""squash_all

Revision ID: 0001_squash_all
Revises:
Create Date: 2026-04-28

Single squashed migration representing full DB schema.
All previous migrations are backed up in alembic/versions_backup/.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0001_squash_all'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('customers',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('phone', sa.String(20), nullable=False),
        sa.Column('source_id', sa.Integer(), nullable=True),
        sa.Column('staff_id', sa.Integer(), nullable=True),
        sa.Column('status_id', sa.Integer(), nullable=True),
        sa.Column('branch_name', sa.String(100), nullable=True),
        sa.Column('crm_link', sa.String(500), nullable=True),
        sa.Column('id_crm', sa.String(100), nullable=True),
        sa.Column('id_card', sa.String(20), nullable=True),
        sa.Column('gender', sa.SmallInteger(), nullable=True),
        sa.Column('birth_date', sa.Date(), nullable=True),
        sa.Column('province_id', sa.Integer(), nullable=True),
        sa.Column('district_id', sa.Integer(), nullable=True),
        sa.Column('ward_id', sa.Integer(), nullable=True),
        sa.Column('street', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_customers_id', 'customers', ['id'])
    op.create_index('ix_customers_phone', 'customers', ['phone'], unique=True)

    op.create_table('source_configs',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('crm_id', sa.String(50), nullable=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_source_configs_id', 'source_configs', ['id'])
    op.create_index('ix_source_configs_crm_id', 'source_configs', ['crm_id'], unique=True)

    op.create_table('staff_configs',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('crm_id', sa.String(50), nullable=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_staff_configs_id', 'staff_configs', ['id'])
    op.create_index('ix_staff_configs_crm_id', 'staff_configs', ['crm_id'], unique=True)

    op.create_table('status_configs',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('crm_id', sa.String(50), nullable=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_status_configs_id', 'status_configs', ['id'])
    op.create_index('ix_status_configs_crm_id', 'status_configs', ['crm_id'], unique=True)

    op.create_table('roles',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('level', sa.Integer(), nullable=True),
        sa.Column('parent_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_roles_id', 'roles', ['id'])
    op.create_index('ix_roles_name', 'roles', ['name'], unique=True)

    op.create_table('role_permissions',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('role_id', sa.Integer(), nullable=False),
        sa.Column('module', sa.String(50), nullable=False),
        sa.Column('can_view', sa.SmallInteger(), nullable=True),
        sa.Column('can_create', sa.SmallInteger(), nullable=True),
        sa.Column('can_update', sa.SmallInteger(), nullable=True),
        sa.Column('can_delete', sa.SmallInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_role_permissions_id', 'role_permissions', ['id'])

    op.create_table('users',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('display_name', sa.String(255), nullable=False),
        sa.Column('is_active', sa.SmallInteger(), nullable=True),
        sa.Column('gov_account', sa.String(255), nullable=True),
        sa.Column('gov_pass', sa.String(255), nullable=True),
        sa.Column('role_id', sa.Integer(), nullable=True),
        sa.Column('staff_config_id', sa.Integer(), nullable=True),
        sa.Column('phone', sa.String(20), nullable=True),
        sa.Column('personal_email', sa.String(255), nullable=True),
        sa.Column('gender', sa.SmallInteger(), nullable=True),
        sa.Column('birth_date', sa.String(10), nullable=True),
        sa.Column('id_number', sa.String(20), nullable=True),
        sa.Column('address', sa.String(500), nullable=True),
        sa.Column('manager_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_users_id', 'users', ['id'])
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    op.create_table('administrative_units',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('code', sa.String(20), nullable=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('parent_id', sa.Integer(), nullable=True),
        sa.Column('division_type', sa.String(50), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_administrative_units_id', 'administrative_units', ['id'])
    op.create_index('ix_administrative_units_code', 'administrative_units', ['code'])

    op.create_table('business_households',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('code', sa.String(20), nullable=False),
        sa.Column('company_full_name', sa.String(255), nullable=True),
        sa.Column('company_foreign_name', sa.String(255), nullable=True),
        sa.Column('company_short_name', sa.String(255), nullable=True),
        sa.Column('province_id', sa.Integer(), nullable=True),
        sa.Column('district_id', sa.Integer(), nullable=True),
        sa.Column('ward_id', sa.Integer(), nullable=True),
        sa.Column('street', sa.String(255), nullable=True),
        sa.Column('phone', sa.String(20), nullable=True),
        sa.Column('fax', sa.String(20), nullable=True),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('website', sa.String(255), nullable=True),
        sa.Column('charter_capital', sa.BigInteger(), nullable=True),
        sa.Column('customer_id', sa.Integer(), nullable=True),
        sa.Column('handling_staff_id', sa.Integer(), nullable=True),
        sa.Column('supporting_staff_id', sa.Integer(), nullable=True),
        sa.Column('status_id', sa.Integer(), nullable=True),
        sa.Column('source_id', sa.Integer(), nullable=True),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('crm_link', sa.String(500), nullable=True),
        sa.Column('id_crm', sa.String(100), nullable=True),
        sa.Column('paid_amount', sa.BigInteger(), nullable=True),
        sa.Column('folder_id', sa.String(200), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_business_households_id', 'business_households', ['id'])
    op.create_index('ix_business_households_code', 'business_households', ['code'], unique=True)

    op.create_table('business_owners',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('household_id', sa.Integer(), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=True),
        sa.Column('gender', sa.Integer(), nullable=True),
        sa.Column('birth_date', sa.Date(), nullable=True),
        sa.Column('id_number', sa.String(20), nullable=True),
        sa.Column('province_id', sa.Integer(), nullable=True),
        sa.Column('district_id', sa.Integer(), nullable=True),
        sa.Column('ward_id', sa.Integer(), nullable=True),
        sa.Column('street', sa.String(255), nullable=True),
        sa.Column('phone', sa.String(20), nullable=True),
        sa.Column('fax', sa.String(20), nullable=True),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('website', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_business_owners_id', 'business_owners', ['id'])

    op.create_table('fields',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_fields_id', 'fields', ['id'])

    op.create_table('industries',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('code', sa.String(20), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_industries_id', 'industries', ['id'])
    op.create_index('ix_industries_code', 'industries', ['code'], unique=True)

    op.create_table('field_industries',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('field_id', sa.Integer(), nullable=False),
        sa.Column('industry_id', sa.Integer(), nullable=False),
        sa.Column('note', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_field_industries_id', 'field_industries', ['id'])

    op.create_table('profile_industries',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('profile_id', sa.Integer(), nullable=False),
        sa.Column('industry_id', sa.Integer(), nullable=False),
        sa.Column('is_main', sa.SmallInteger(), nullable=True),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('service_type', sa.String(20), nullable=False, server_default='hkd'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_profile_industries_id', 'profile_industries', ['id'])

    op.create_table('documents',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('record_id', sa.Integer(), nullable=False),
        sa.Column('table_name', sa.String(100), nullable=False),
        sa.Column('label', sa.String(20), nullable=False),
        sa.Column('file_name', sa.String(500), nullable=False),
        sa.Column('drive_link', sa.String(1000), nullable=True),
        sa.Column('drive_file_id', sa.String(200), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_documents_id', 'documents', ['id'])
    op.create_index('ix_documents_record_id', 'documents', ['record_id'])

    op.create_table('ocr_logs',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('doc_type', sa.String(50), nullable=False),
        sa.Column('model_name', sa.String(100), nullable=True),
        sa.Column('service_type', sa.String(50), nullable=True),
        sa.Column('drive_file_id', sa.String(255), nullable=True),
        sa.Column('drive_link', sa.String(500), nullable=True),
        sa.Column('raw_result', sa.JSON(), nullable=True),
        sa.Column('fields_result', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_ocr_logs_id', 'ocr_logs', ['id'])
    op.create_index('ix_ocr_logs_user_id', 'ocr_logs', ['user_id'])

    op.create_table('companies',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('code', sa.String(20), nullable=False),
        sa.Column('company_type', sa.SmallInteger(), nullable=False),
        sa.Column('company_full_name', sa.String(255), nullable=True),
        sa.Column('company_foreign_name', sa.String(255), nullable=True),
        sa.Column('company_short_name', sa.String(255), nullable=True),
        sa.Column('province_id', sa.Integer(), nullable=True),
        sa.Column('district_id', sa.Integer(), nullable=True),
        sa.Column('ward_id', sa.Integer(), nullable=True),
        sa.Column('street', sa.String(255), nullable=True),
        sa.Column('phone', sa.String(20), nullable=True),
        sa.Column('fax', sa.String(20), nullable=True),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('website', sa.String(255), nullable=True),
        sa.Column('charter_capital', sa.BigInteger(), nullable=True),
        sa.Column('customer_id', sa.Integer(), nullable=True),
        sa.Column('handling_staff_id', sa.Integer(), nullable=True),
        sa.Column('supporting_staff_id', sa.Integer(), nullable=True),
        sa.Column('status_id', sa.Integer(), nullable=True),
        sa.Column('source_id', sa.Integer(), nullable=True),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('crm_link', sa.String(500), nullable=True),
        sa.Column('id_crm', sa.String(100), nullable=True),
        sa.Column('paid_amount', sa.BigInteger(), nullable=True),
        sa.Column('folder_id', sa.String(200), nullable=True),
        sa.Column('accounting_name', sa.String(255), nullable=True),
        sa.Column('accounting_phone', sa.String(20), nullable=True),
        sa.Column('accounting_gender', sa.Integer(), nullable=True),
        sa.Column('accounting_birth_date', sa.Date(), nullable=True),
        sa.Column('accounting_id_number', sa.String(20), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_companies_id', 'companies', ['id'])
    op.create_index('ix_companies_code', 'companies', ['code'], unique=True)

    op.create_table('company_positions',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('is_llc1', sa.SmallInteger(), nullable=True, server_default='0'),
        sa.Column('is_llc2', sa.SmallInteger(), nullable=True, server_default='0'),
        sa.Column('is_jsc', sa.SmallInteger(), nullable=True, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_company_positions_id', 'company_positions', ['id'])

    op.create_table('company_persons',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('company_id', sa.Integer(), nullable=False),
        sa.Column('person_type', sa.String(20), nullable=False),
        sa.Column('position_id', sa.Integer(), nullable=True),
        sa.Column('full_name', sa.String(255), nullable=True),
        sa.Column('gender', sa.SmallInteger(), nullable=True),
        sa.Column('birth_date', sa.Date(), nullable=True),
        sa.Column('id_number', sa.String(20), nullable=True),
        sa.Column('province_id', sa.Integer(), nullable=True),
        sa.Column('ward_id', sa.Integer(), nullable=True),
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
    op.create_index('ix_company_persons_id', 'company_persons', ['id'])

    op.create_table('gov_jobs',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('profile_id', sa.String(100), nullable=True),
        sa.Column('job_id', sa.String(100), nullable=False),
        sa.Column('task_name', sa.String(100), nullable=True),
        sa.Column('status', sa.String(50), nullable=False, server_default='pending'),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('record_id', sa.Integer(), nullable=True),
        sa.Column('record_type', sa.String(20), nullable=True),
        sa.Column('record_name', sa.String(255), nullable=True),
        sa.Column('service', sa.String(20), nullable=True, server_default='hkd'),
        sa.Column('progress', sa.String(255), nullable=True),
        sa.Column('error', sa.Text(), nullable=True),
        sa.Column('data', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_gov_jobs_id', 'gov_jobs', ['id'])
    op.create_index('ix_gov_jobs_job_id', 'gov_jobs', ['job_id'])
    op.create_index('ix_gov_jobs_record_id', 'gov_jobs', ['record_id'])


def downgrade() -> None:
    op.drop_table('gov_jobs')
    op.drop_table('company_persons')
    op.drop_table('company_positions')
    op.drop_table('companies')
    op.drop_table('ocr_logs')
    op.drop_table('documents')
    op.drop_table('profile_industries')
    op.drop_table('field_industries')
    op.drop_table('industries')
    op.drop_table('fields')
    op.drop_table('business_owners')
    op.drop_table('business_households')
    op.drop_table('administrative_units')
    op.drop_table('users')
    op.drop_table('role_permissions')
    op.drop_table('roles')
    op.drop_table('status_configs')
    op.drop_table('staff_configs')
    op.drop_table('source_configs')
    op.drop_table('customers')
