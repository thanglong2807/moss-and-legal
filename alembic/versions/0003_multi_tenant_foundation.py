"""multi_tenant_foundation

Revision ID: 0003_multi_tenant
Revises: 7c2caf38cc76
Create Date: 2026-05-18 00:00:00.000000

"""
from typing import Sequence, Union
from datetime import datetime

from alembic import op
import sqlalchemy as sa

revision: str = "0003_multi_tenant"
down_revision: Union[str, None] = "7c2caf38cc76"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Step 1: Create tenants table ─────────────────────────────────────────
    op.create_table(
        "tenants",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(100), nullable=False),
        sa.Column("contact_email", sa.String(255), nullable=False),
        sa.Column("contact_phone", sa.String(20), nullable=True),
        sa.Column("address", sa.String(500), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=True, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=True, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug", name="uq_tenants_slug"),
    )
    op.create_index("ix_tenants_slug", "tenants", ["slug"])

    # ── Step 2: Create subscription_plans table ───────────────────────────────
    op.create_table(
        "subscription_plans",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("max_users", sa.Integer(), nullable=False),
        sa.Column("price_3m", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("price_9m", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("price_12m", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("price_24m", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("price_36m", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=True, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=True, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    # ── Step 3: Create subscriptions table ───────────────────────────────────
    op.create_table(
        "subscriptions",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("plan_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("duration_months", sa.Integer(), nullable=False),
        sa.Column("start_date", sa.DateTime(), nullable=True),
        sa.Column("end_date", sa.DateTime(), nullable=True),
        sa.Column("amount_paid", sa.BigInteger(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=True, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.ForeignKeyConstraint(["plan_id"], ["subscription_plans.id"]),
    )
    op.create_index("ix_subscriptions_tenant_id", "subscriptions", ["tenant_id"])

    # ── Step 4: Create payments table ─────────────────────────────────────────
    op.create_table(
        "payments",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("subscription_id", sa.Integer(), nullable=True),
        sa.Column("provider", sa.String(20), nullable=False),
        sa.Column("transaction_id", sa.String(255), nullable=True),
        sa.Column("order_id", sa.String(255), nullable=False),
        sa.Column("amount", sa.BigInteger(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("provider_data", sa.JSON(), nullable=True),
        sa.Column("paid_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=True, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("transaction_id", name="uq_payments_transaction_id"),
        sa.UniqueConstraint("order_id", name="uq_payments_order_id"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.ForeignKeyConstraint(["subscription_id"], ["subscriptions.id"]),
    )
    op.create_index("ix_payments_tenant_id", "payments", ["tenant_id"])

    # ── Step 5: Seed default tenant ───────────────────────────────────────────
    op.execute(
        "INSERT INTO tenants (id, name, slug, contact_email, is_active, created_at, updated_at) "
        "VALUES (1, 'Default', 'default', 'admin@mosslegal.vn', 1, NOW(), NOW())"
    )

    # ── Step 6: Seed default subscription plans ───────────────────────────────
    op.execute(
        "INSERT INTO subscription_plans (name, max_users, price_3m, price_9m, price_12m, price_24m, price_36m, is_active, created_at, updated_at) VALUES "
        "('Basic', 5, 1500000, 4050000, 5100000, 9000000, 12600000, 1, NOW(), NOW()), "
        "('Pro', 20, 3000000, 8100000, 10200000, 18000000, 25200000, 1, NOW(), NOW()), "
        "('Enterprise', -1, 6000000, 16200000, 20400000, 36000000, 50400000, 1, NOW(), NOW())"
    )

    # ── Step 7-18: Add tenant_id columns to all data tables ──────────────────
    tables_with_tenant = [
        "users", "roles", "companies", "business_households",
        "customers", "staff_configs", "source_configs", "status_configs",
        "documents", "gov_jobs", "ocr_logs",
    ]
    for tbl in tables_with_tenant:
        op.add_column(tbl, sa.Column("tenant_id", sa.Integer(), nullable=True))
        op.create_foreign_key(
            f"fk_{tbl}_tenant_id",
            tbl, "tenants",
            ["tenant_id"], ["id"],
        )
        op.create_index(f"ix_{tbl}_tenant_id", tbl, ["tenant_id"])

    # ── Step 8: Add is_super_admin to users ───────────────────────────────────
    op.add_column("users", sa.Column("is_super_admin", sa.Boolean(), nullable=False, server_default="0"))

    # ── Step 19: Backfill all existing rows to tenant_id = 1 ─────────────────
    for tbl in tables_with_tenant:
        op.execute(f"UPDATE {tbl} SET tenant_id = 1 WHERE tenant_id IS NULL")

    # ── Step 20: Drop old unique index on customers.phone (if exists) ──────────
    try:
        op.drop_index("phone", table_name="customers")
    except Exception:
        pass  # index already absent or different name — safe to continue

    # ── Step 21: Create active subscription for default tenant ───────────────
    op.execute(
        "INSERT INTO subscriptions (tenant_id, plan_id, status, duration_months, start_date, end_date, amount_paid, created_at, updated_at) "
        "SELECT 1, id, 'active', 36, NOW(), DATE_ADD(NOW(), INTERVAL 36 MONTH), 0, NOW(), NOW() "
        "FROM subscription_plans WHERE name = 'Enterprise' LIMIT 1"
    )


def downgrade() -> None:
    # Remove tenant_id columns
    tables_with_tenant = [
        "users", "roles", "companies", "business_households",
        "customers", "staff_configs", "source_configs", "status_configs",
        "documents", "gov_jobs", "ocr_logs",
    ]
    for tbl in tables_with_tenant:
        try:
            op.drop_constraint(f"fk_{tbl}_tenant_id", tbl, type_="foreignkey")
        except Exception:
            pass
        try:
            op.drop_index(f"ix_{tbl}_tenant_id", table_name=tbl)
        except Exception:
            pass
        op.drop_column(tbl, "tenant_id")

    op.drop_column("users", "is_super_admin")

    # Recreate customers.phone unique index
    op.create_index("phone", "customers", ["phone"], unique=True)

    op.drop_table("payments")
    op.drop_table("subscriptions")
    op.drop_table("subscription_plans")
    op.drop_table("tenants")
