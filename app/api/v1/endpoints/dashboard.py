"""Dashboard stats endpoint — trả về thống kê theo role."""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.auth.models import Tenant, User
from app.models.customer import Customer
from app.models.hkd import BusinessHousehold
from app.models.subscription import Subscription, SubscriptionPlan, Payment

try:
    from app.models.company import Company
    _has_company = True
except ImportError:
    _has_company = False

router = APIRouter()


def _mask(value: str) -> str:
    """Giữ lại 4 ký tự đầu, che phần còn lại."""
    if not value:
        return ""
    if len(value) <= 4:
        return "••••••"
    return value[:4] + "••••••"


@router.get("/stats")
def get_dashboard_stats(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.is_super_admin:
        return _super_admin_stats(db)
    return _tenant_stats(db, current_user.tenant_id)


# ── Super Admin stats ─────────────────────────────────────────────────────────

def _super_admin_stats(db: Session):
    total_tenants = db.execute(
        select(func.count(Tenant.id)).where(Tenant.is_active == True, Tenant.deleted_at.is_(None))
    ).scalar() or 0

    active_subscriptions = db.execute(
        select(func.count(Subscription.id)).where(
            Subscription.status == "active",
            Subscription.deleted_at.is_(None),
        )
    ).scalar() or 0

    total_users = db.execute(
        select(func.count(User.id)).where(User.deleted_at.is_(None))
    ).scalar() or 0

    total_revenue = db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.status == "success")
    ).scalar() or 0

    return {
        "role": "super_admin",
        "total_tenants": total_tenants,
        "active_subscriptions": active_subscriptions,
        "total_users": total_users,
        "total_revenue": int(total_revenue),
    }


# ── Tenant stats ──────────────────────────────────────────────────────────────

def _tenant_stats(db: Session, tenant_id: int):
    customers_count = db.execute(
        select(func.count(Customer.id)).where(
            Customer.tenant_id == tenant_id,
            Customer.deleted_at.is_(None),
        )
    ).scalar() or 0

    hkd_count = db.execute(
        select(func.count(BusinessHousehold.id)).where(
            BusinessHousehold.tenant_id == tenant_id,
            BusinessHousehold.deleted_at.is_(None),
        )
    ).scalar() or 0

    company_count = 0
    if _has_company:
        company_count = db.execute(
            select(func.count(Company.id)).where(
                Company.tenant_id == tenant_id,
                Company.deleted_at.is_(None),
            )
        ).scalar() or 0

    staff_count = db.execute(
        select(func.count(User.id)).where(
            User.tenant_id == tenant_id,
            User.deleted_at.is_(None),
            User.is_active == True,
        )
    ).scalar() or 0

    # Active subscription
    sub = db.execute(
        select(Subscription)
        .where(
            Subscription.tenant_id == tenant_id,
            Subscription.status == "active",
            Subscription.deleted_at.is_(None),
        )
        .order_by(Subscription.end_date.desc())
    ).scalars().first()

    subscription_info = None
    if sub:
        now = datetime.utcnow()
        days_left = (sub.end_date - now).days if sub.end_date else None
        user_count = db.execute(
            select(func.count(User.id)).where(
                User.tenant_id == tenant_id,
                User.deleted_at.is_(None),
                User.is_active == True,
            )
        ).scalar() or 0
        plan = sub.plan
        subscription_info = {
            "status": sub.status,
            "plan_name": plan.name if plan else None,
            "end_date": sub.end_date.isoformat() if sub.end_date else None,
            "days_left": days_left,
            "max_users": plan.max_users if plan else None,
            "user_count": user_count,
        }

    # Recent HKD — last 5
    from app.models.customer import StatusConfig
    recent_hkd_rows = db.execute(
        select(
            BusinessHousehold.id,
            BusinessHousehold.company_full_name,
            BusinessHousehold.created_at,
            StatusConfig.name.label("status_name"),
        )
        .outerjoin(StatusConfig, BusinessHousehold.status_id == StatusConfig.id)
        .where(
            BusinessHousehold.tenant_id == tenant_id,
            BusinessHousehold.deleted_at.is_(None),
        )
        .order_by(BusinessHousehold.created_at.desc())
        .limit(5)
    ).all()

    recent_hkd = [
        {
            "id": r.id,
            "company_full_name": r.company_full_name,
            "status_name": r.status_name,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in recent_hkd_rows
    ]

    # Recent Customers — last 5
    recent_customers_rows = db.execute(
        select(Customer.id, Customer.name, Customer.phone, Customer.created_at)
        .where(
            Customer.tenant_id == tenant_id,
            Customer.deleted_at.is_(None),
        )
        .order_by(Customer.created_at.desc())
        .limit(5)
    ).all()

    recent_customers = [
        {
            "id": r.id,
            "name": r.name,
            "phone": r.phone,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in recent_customers_rows
    ]

    return {
        "role": "tenant",
        "customers_count": customers_count,
        "hkd_count": hkd_count,
        "company_count": company_count,
        "staff_count": staff_count,
        "subscription": subscription_info,
        "recent_hkd": recent_hkd,
        "recent_customers": recent_customers,
    }
