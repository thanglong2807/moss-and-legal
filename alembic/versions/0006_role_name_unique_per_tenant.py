"""role name unique per tenant

Revision ID: 0006_role_name_unique_per_tenant
Revises: 0005_audit_log
Create Date: 2026-05-18 00:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = "0006_role_name_unique_per_tenant"
down_revision = "0005_audit_log"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Xoá unique index cũ trên name (toàn cục)
    try:
        op.drop_index("ix_roles_name", table_name="roles")
    except Exception:
        pass
    try:
        op.drop_constraint("roles_ibfk_name", "roles", type_="unique")
    except Exception:
        pass

    # Tạo unique constraint mới trên (name, tenant_id)
    # NULL tenant_id = system role; các tenant có thể dùng cùng tên
    op.create_index(
        "uq_roles_name_tenant",
        "roles",
        ["name", "tenant_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("uq_roles_name_tenant", table_name="roles")
    op.create_index("ix_roles_name", "roles", ["name"], unique=True)
