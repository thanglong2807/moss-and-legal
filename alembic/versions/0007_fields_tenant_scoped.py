"""fields tenant scoped — mỗi tenant có bộ lĩnh vực riêng

Revision ID: 0007_fields_tenant_scoped
Revises: 0006_role_name_unique_per_tenant
Create Date: 2026-05-18 00:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = "0007_fields_tenant_scoped"
down_revision = "0006_role_name_unique_per_tenant"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Thêm cột tenant_id vào bảng fields
    op.add_column(
        "fields",
        sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id"), nullable=True),
    )
    # Index để query nhanh
    op.create_index("ix_fields_tenant_id", "fields", ["tenant_id"])

    # Các fields cũ (không có tenant) hiện là "rác" từ trước multi-tenant.
    # Xóa hết để mỗi tenant bắt đầu sạch (hoặc giữ lại nếu muốn assign về tenant 1).
    # Vì đây là môi trường dev, xóa sạch để tránh dữ liệu lẫn lộn.
    op.execute("DELETE FROM field_industries")
    op.execute("DELETE FROM fields")


def downgrade() -> None:
    op.drop_index("ix_fields_tenant_id", table_name="fields")
    op.drop_column("fields", "tenant_id")
