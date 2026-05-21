"""customers phone unique per tenant

Revision ID: 0008_customers_phone_unique_per_tenant
Revises: 0007_fields_tenant_scoped
Create Date: 2026-05-18 00:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = "0008_customers_phone_unique_per_tenant"
down_revision = "0007_fields_tenant_scoped"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Xoá unique index cũ trên phone (toàn cục) — tên thực tế là ix_customers_phone
    # Migration 0003 cố drop tên "phone" nhưng sai tên nên bị skip
    try:
        op.drop_index("ix_customers_phone", table_name="customers")
    except Exception:
        pass
    # Fallback: thử tên khác nếu có
    try:
        op.drop_index("phone", table_name="customers")
    except Exception:
        pass

    # Tạo lại index thường (non-unique) trên phone để vẫn search nhanh
    op.create_index("ix_customers_phone", "customers", ["phone"], unique=False)

    # Tạo unique constraint mới trên (phone, tenant_id)
    # → cùng số điện thoại OK ở tenant khác nhau
    op.create_index(
        "uq_customers_phone_tenant",
        "customers",
        ["phone", "tenant_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("uq_customers_phone_tenant", table_name="customers")
    op.drop_index("ix_customers_phone", table_name="customers")
    op.create_index("ix_customers_phone", "customers", ["phone"], unique=True)
