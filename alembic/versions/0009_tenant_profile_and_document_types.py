"""0009 — tenant_profiles + tenant_document_types

Revision ID: 0009
Revises: 0008_customers_phone_unique_per_tenant
Create Date: 2026-05-21
"""
from alembic import op
import sqlalchemy as sa

revision = "0009"
down_revision = "0008_customers_phone_unique_per_tenant"
branch_labels = None
depends_on = None


def upgrade():
    # ── tenant_profiles ──────────────────────────────────────────────────────
    op.create_table(
        "tenant_profiles",
        sa.Column("id",                       sa.Integer(),     primary_key=True, autoincrement=True),
        sa.Column("tenant_id",                sa.Integer(),     sa.ForeignKey("tenants.id"), nullable=False, unique=True),
        sa.Column("company_full_name",        sa.String(255),   nullable=True),
        sa.Column("company_short_name",       sa.String(100),   nullable=True),
        sa.Column("tax_code",                 sa.String(50),    nullable=True),
        sa.Column("address",                  sa.Text(),        nullable=True),
        sa.Column("province",                 sa.String(100),   nullable=True),
        sa.Column("phone",                    sa.String(20),    nullable=True),
        sa.Column("email",                    sa.String(100),   nullable=True),
        sa.Column("website",                  sa.String(200),   nullable=True),
        sa.Column("representative_name",      sa.String(255),   nullable=True),
        sa.Column("representative_title",     sa.String(100),   nullable=True),
        sa.Column("representative_id_number", sa.String(50),    nullable=True),
        sa.Column("representative_id_date",   sa.String(20),    nullable=True),
        sa.Column("representative_id_place",  sa.String(255),   nullable=True),
        sa.Column("business_reg_number",      sa.String(100),   nullable=True),
        sa.Column("business_reg_date",        sa.String(20),    nullable=True),
        sa.Column("business_reg_place",       sa.String(255),   nullable=True),
        sa.Column("bank_name",                sa.String(255),   nullable=True),
        sa.Column("bank_account",             sa.String(50),    nullable=True),
        sa.Column("seal_text",                sa.Text(),        nullable=True),
        sa.Column("created_at",               sa.DateTime(),    nullable=True),
        sa.Column("updated_at",               sa.DateTime(),    nullable=True),
        # Base tự thêm deleted_at vào mọi model
        sa.Column("deleted_at",               sa.DateTime(),    nullable=True),
    )
    op.create_index("ix_tenant_profiles_tenant_id", "tenant_profiles", ["tenant_id"])

    # ── tenant_document_types ────────────────────────────────────────────────
    op.create_table(
        "tenant_document_types",
        sa.Column("id",                sa.Integer(),     primary_key=True, autoincrement=True),
        sa.Column("tenant_id",         sa.Integer(),     sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("name",              sa.String(255),   nullable=False),
        sa.Column("description",       sa.Text(),        nullable=True),
        sa.Column("category",          sa.String(20),    nullable=False, server_default="hkd"),
        sa.Column("template_key",      sa.String(50),    nullable=True),
        sa.Column("template_path",     sa.String(500),   nullable=True),
        sa.Column("original_filename", sa.String(255),   nullable=True),
        sa.Column("is_active",         sa.Boolean(),     nullable=False, server_default=sa.true()),
        sa.Column("sort_order",        sa.Integer(),     nullable=False, server_default="0"),
        sa.Column("created_at",        sa.DateTime(),    nullable=True),
        sa.Column("updated_at",        sa.DateTime(),    nullable=True),
        sa.Column("deleted_at",        sa.DateTime(),    nullable=True),
    )
    op.create_index("ix_tenant_doc_types_tenant_cat", "tenant_document_types", ["tenant_id", "category"])


def downgrade():
    op.drop_index("ix_tenant_doc_types_tenant_cat", "tenant_document_types")
    op.drop_table("tenant_document_types")
    op.drop_index("ix_tenant_profiles_tenant_id", "tenant_profiles")
    op.drop_table("tenant_profiles")
