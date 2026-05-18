"""Super Admin endpoints — quản lý tenants, plans, subscriptions."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func
from datetime import datetime
from typing import Optional, Any, Dict
from pydantic import BaseModel

from app.core.database import get_db
from app.auth.dependencies import require_super_admin
from app.auth.models import Tenant, User
from app.models.subscription import SubscriptionPlan, Subscription, Payment

router = APIRouter()


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class TenantCreate(BaseModel):
    name: str
    slug: str
    contact_email: str
    contact_phone: Optional[str] = None
    address: Optional[str] = None

class TenantUpdate(BaseModel):
    name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None

class PlanCreate(BaseModel):
    name: str
    max_users: int
    price_3m: int
    price_9m: int
    price_12m: int
    price_24m: int
    price_36m: int

class PlanUpdate(BaseModel):
    name: Optional[str] = None
    max_users: Optional[int] = None
    price_3m: Optional[int] = None
    price_9m: Optional[int] = None
    price_12m: Optional[int] = None
    price_24m: Optional[int] = None
    price_36m: Optional[int] = None
    is_active: Optional[bool] = None

class SubscriptionCreate(BaseModel):
    tenant_id: int
    plan_id: int
    duration_months: int
    amount_paid: Optional[int] = 0

class SubscriptionActivate(BaseModel):
    pass

class TenantSettingsUpdate(BaseModel):
    modules: Optional[Dict[str, bool]] = None   # { hkd, company, customers, ocr, export }
    notes: Optional[str] = None
    billing_email: Optional[str] = None
    max_users_override: Optional[int] = None    # None = use plan default

class TenantAdminCreate(BaseModel):
    display_name: str
    email: str
    password: str
    phone: Optional[str] = None


# ── Tenant management ─────────────────────────────────────────────────────────

@router.get("/tenants")
def list_tenants(db: Session = Depends(get_db), _=Depends(require_super_admin)):
    tenants = db.execute(
        select(Tenant)
        .options(joinedload(Tenant.subscriptions).joinedload(Subscription.plan))
        .where(Tenant.deleted_at.is_(None))
        .order_by(Tenant.id)
    ).scalars().unique().all()

    result = []
    for t in tenants:
        active_sub = next(
            (s for s in t.subscriptions if s.status == "active" and s.deleted_at is None), None
        )
        result.append({
            "id": t.id,
            "name": t.name,
            "slug": t.slug,
            "contact_email": t.contact_email,
            "contact_phone": t.contact_phone,
            "address": t.address,
            "is_active": t.is_active,
            "created_at": t.created_at,
            "subscription": {
                "plan_name": active_sub.plan.name if active_sub and active_sub.plan else None,
                "end_date": active_sub.end_date.isoformat() if active_sub and active_sub.end_date else None,
                "status": active_sub.status if active_sub else "none",
            } if active_sub else None,
        })
    return result


@router.post("/tenants", status_code=201)
def create_tenant(data: TenantCreate, db: Session = Depends(get_db), _=Depends(require_super_admin)):
    existing = db.execute(select(Tenant).where(Tenant.slug == data.slug)).scalars().first()
    if existing:
        raise HTTPException(status_code=400, detail="Slug đã tồn tại")
    tenant = Tenant(**data.model_dump())
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    return tenant


@router.get("/tenants/{tenant_id}")
def get_tenant(tenant_id: int, db: Session = Depends(get_db), _=Depends(require_super_admin)):
    tenant = db.execute(select(Tenant).where(Tenant.id == tenant_id, Tenant.deleted_at.is_(None))).scalars().first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Không tìm thấy tenant")
    return tenant


@router.put("/tenants/{tenant_id}")
def update_tenant(tenant_id: int, data: TenantUpdate, db: Session = Depends(get_db), _=Depends(require_super_admin)):
    tenant = db.execute(select(Tenant).where(Tenant.id == tenant_id, Tenant.deleted_at.is_(None))).scalars().first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Không tìm thấy tenant")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(tenant, k, v)
    db.commit()
    db.refresh(tenant)
    return tenant


@router.delete("/tenants/{tenant_id}", status_code=204)
def delete_tenant(tenant_id: int, db: Session = Depends(get_db), _=Depends(require_super_admin)):
    tenant = db.execute(select(Tenant).where(Tenant.id == tenant_id, Tenant.deleted_at.is_(None))).scalars().first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Không tìm thấy tenant")
    tenant.deleted_at = datetime.utcnow()
    db.commit()


# ── Plan management ───────────────────────────────────────────────────────────

@router.get("/plans")
def list_plans(db: Session = Depends(get_db), _=Depends(require_super_admin)):
    return db.execute(
        select(SubscriptionPlan).where(SubscriptionPlan.deleted_at.is_(None)).order_by(SubscriptionPlan.id)
    ).scalars().all()


@router.post("/plans", status_code=201)
def create_plan(data: PlanCreate, db: Session = Depends(get_db), _=Depends(require_super_admin)):
    plan = SubscriptionPlan(**data.model_dump())
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@router.put("/plans/{plan_id}")
def update_plan(plan_id: int, data: PlanUpdate, db: Session = Depends(get_db), _=Depends(require_super_admin)):
    plan = db.execute(select(SubscriptionPlan).where(SubscriptionPlan.id == plan_id, SubscriptionPlan.deleted_at.is_(None))).scalars().first()
    if not plan:
        raise HTTPException(status_code=404, detail="Không tìm thấy gói")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(plan, k, v)
    db.commit()
    db.refresh(plan)
    return plan


@router.delete("/plans/{plan_id}", status_code=204)
def delete_plan(plan_id: int, db: Session = Depends(get_db), _=Depends(require_super_admin)):
    plan = db.execute(select(SubscriptionPlan).where(SubscriptionPlan.id == plan_id, SubscriptionPlan.deleted_at.is_(None))).scalars().first()
    if not plan:
        raise HTTPException(status_code=404, detail="Không tìm thấy gói")
    plan.deleted_at = datetime.utcnow()
    db.commit()


# ── Subscription management ───────────────────────────────────────────────────

@router.get("/subscriptions")
def list_subscriptions(db: Session = Depends(get_db), _=Depends(require_super_admin)):
    return db.execute(
        select(Subscription)
        .options(joinedload(Subscription.plan), joinedload(Subscription.tenant))
        .where(Subscription.deleted_at.is_(None))
        .order_by(Subscription.created_at.desc())
    ).scalars().unique().all()


@router.post("/subscriptions", status_code=201)
def create_subscription(data: SubscriptionCreate, db: Session = Depends(get_db), _=Depends(require_super_admin)):
    """Super admin tạo subscription thủ công cho tenant (bypass payment)."""
    plan = db.execute(select(SubscriptionPlan).where(SubscriptionPlan.id == data.plan_id)).scalars().first()
    if not plan:
        raise HTTPException(status_code=404, detail="Không tìm thấy gói")
    tenant = db.execute(select(Tenant).where(Tenant.id == data.tenant_id, Tenant.deleted_at.is_(None))).scalars().first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Không tìm thấy tenant")

    from dateutil.relativedelta import relativedelta
    start = datetime.utcnow()
    end = start + relativedelta(months=data.duration_months)

    sub = Subscription(
        tenant_id=data.tenant_id,
        plan_id=data.plan_id,
        status="active",
        duration_months=data.duration_months,
        start_date=start,
        end_date=end,
        amount_paid=data.amount_paid or 0,
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


@router.put("/subscriptions/{sub_id}/activate")
def activate_subscription(sub_id: int, db: Session = Depends(get_db), _=Depends(require_super_admin)):
    sub = db.execute(select(Subscription).where(Subscription.id == sub_id)).scalars().first()
    if not sub:
        raise HTTPException(status_code=404, detail="Không tìm thấy subscription")
    sub.status = "active"
    if not sub.start_date:
        from dateutil.relativedelta import relativedelta
        sub.start_date = datetime.utcnow()
        sub.end_date = sub.start_date + relativedelta(months=sub.duration_months)
    db.commit()
    return {"message": "Đã kích hoạt"}


@router.put("/subscriptions/{sub_id}/cancel")
def cancel_subscription(sub_id: int, db: Session = Depends(get_db), _=Depends(require_super_admin)):
    sub = db.execute(select(Subscription).where(Subscription.id == sub_id)).scalars().first()
    if not sub:
        raise HTTPException(status_code=404, detail="Không tìm thấy subscription")
    sub.status = "cancelled"
    db.commit()
    return {"message": "Đã huỷ"}


# ── Tenant admin user management ─────────────────────────────────────────────

def _get_or_create_admin_role(db: Session, tenant_id: int, tenant_slug: str):
    """Lấy hoặc tạo role admin (level=1) cho tenant."""
    from app.auth.models import Role
    role = db.execute(
        select(Role).where(Role.tenant_id == tenant_id, Role.level == 1, Role.deleted_at.is_(None))
    ).scalars().first()
    if not role:
        role = Role(name=f"Admin - {tenant_slug}", level=1, tenant_id=tenant_id)
        db.add(role)
        db.flush()
    return role


@router.get("/tenants/{tenant_id}/admins")
def list_tenant_admins(tenant_id: int, db: Session = Depends(get_db), _=Depends(require_super_admin)):
    """Danh sách tài khoản admin của một tenant."""
    from app.auth.models import Role
    tenant = db.execute(select(Tenant).where(Tenant.id == tenant_id, Tenant.deleted_at.is_(None))).scalars().first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Không tìm thấy tenant")
    users = db.execute(
        select(User)
        .join(Role, User.role_id == Role.id)
        .where(
            User.tenant_id == tenant_id,
            User.deleted_at.is_(None),
            Role.level == 1,
        )
    ).scalars().all()
    return [
        {
            "id": u.id,
            "display_name": u.display_name,
            "email": u.email,
            "phone": u.phone,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]


@router.post("/tenants/{tenant_id}/admins", status_code=201)
def create_tenant_admin(
    tenant_id: int,
    data: TenantAdminCreate,
    db: Session = Depends(get_db),
    _=Depends(require_super_admin),
):
    """Tạo tài khoản admin cho tenant."""
    from app.auth.service import hash_password

    tenant = db.execute(select(Tenant).where(Tenant.id == tenant_id, Tenant.deleted_at.is_(None))).scalars().first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Không tìm thấy tenant")

    existing = db.execute(select(User).where(User.email == data.email, User.deleted_at.is_(None))).scalars().first()
    if existing:
        raise HTTPException(status_code=400, detail="Email đã được sử dụng")

    role = _get_or_create_admin_role(db, tenant_id, tenant.slug)

    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        display_name=data.display_name,
        phone=data.phone,
        is_active=True,
        is_super_admin=False,
        tenant_id=tenant_id,
        role_id=role.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {
        "id": user.id,
        "display_name": user.display_name,
        "email": user.email,
        "phone": user.phone,
        "is_active": user.is_active,
        "role_name": role.name,
        "tenant_id": tenant_id,
    }


@router.delete("/tenants/{tenant_id}/admins/{user_id}", status_code=204)
def delete_tenant_admin(
    tenant_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_super_admin),
):
    """Xoá (soft delete) tài khoản admin của tenant."""
    from datetime import datetime as dt
    user = db.execute(
        select(User).where(User.id == user_id, User.tenant_id == tenant_id, User.deleted_at.is_(None))
    ).scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản")
    user.deleted_at = dt.utcnow()
    db.commit()


# ── Tenant settings ───────────────────────────────────────────────────────────

DEFAULT_SETTINGS = {
    "modules": {
        "hkd": True,
        "company": True,
        "customers": True,
        "ocr": True,
        "export": True,
    },
    "notes": "",
    "billing_email": "",
    "max_users_override": None,
}

@router.get("/tenants/{tenant_id}/settings")
def get_tenant_settings(tenant_id: int, db: Session = Depends(get_db), _=Depends(require_super_admin)):
    tenant = db.execute(select(Tenant).where(Tenant.id == tenant_id, Tenant.deleted_at.is_(None))).scalars().first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Không tìm thấy tenant")
    settings = {**DEFAULT_SETTINGS, **(tenant.settings or {})}
    # Merge modules deeply
    settings["modules"] = {**DEFAULT_SETTINGS["modules"], **((tenant.settings or {}).get("modules", {}))}
    return settings


@router.put("/tenants/{tenant_id}/settings")
def update_tenant_settings(
    tenant_id: int,
    data: TenantSettingsUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_super_admin),
):
    tenant = db.execute(select(Tenant).where(Tenant.id == tenant_id, Tenant.deleted_at.is_(None))).scalars().first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Không tìm thấy tenant")
    current = {**DEFAULT_SETTINGS, **(tenant.settings or {})}
    if data.modules is not None:
        current["modules"] = {**current.get("modules", {}), **data.modules}
    if data.notes is not None:
        current["notes"] = data.notes
    if data.billing_email is not None:
        current["billing_email"] = data.billing_email
    if data.max_users_override is not None:
        current["max_users_override"] = data.max_users_override
    tenant.settings = current
    db.commit()
    return current


# ── Reports ───────────────────────────────────────────────────────────────────

@router.get("/reports/overview")
def get_reports_overview(db: Session = Depends(get_db), _=Depends(require_super_admin)):
    """Tổng quan: doanh thu, tenant, subscription stats."""
    from sqlalchemy import case, extract
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Revenue
    total_revenue = db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0))
        .where(Payment.status == "success")
    ).scalar()

    month_revenue = db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0))
        .where(Payment.status == "success", Payment.paid_at >= month_start)
    ).scalar()

    # Tenants
    total_tenants = db.execute(select(func.count(Tenant.id)).where(Tenant.deleted_at.is_(None))).scalar()
    active_tenants = db.execute(select(func.count(Tenant.id)).where(Tenant.deleted_at.is_(None), Tenant.is_active == True)).scalar()
    new_tenants_month = db.execute(
        select(func.count(Tenant.id)).where(Tenant.deleted_at.is_(None), Tenant.created_at >= month_start)
    ).scalar()

    # Subscriptions
    active_subs = db.execute(
        select(func.count(Subscription.id)).where(Subscription.status == "active", Subscription.deleted_at.is_(None))
    ).scalar()
    expired_subs = db.execute(
        select(func.count(Subscription.id)).where(Subscription.status == "expired", Subscription.deleted_at.is_(None))
    ).scalar()

    # Subscription by plan
    subs_by_plan = db.execute(
        select(SubscriptionPlan.name, func.count(Subscription.id))
        .join(Subscription, Subscription.plan_id == SubscriptionPlan.id)
        .where(Subscription.status == "active", Subscription.deleted_at.is_(None))
        .group_by(SubscriptionPlan.name)
    ).all()

    # Payment success rate (last 30 days)
    from datetime import timedelta
    day30_ago = now - timedelta(days=30)
    total_payments_30d = db.execute(
        select(func.count(Payment.id)).where(Payment.created_at >= day30_ago)
    ).scalar()
    success_payments_30d = db.execute(
        select(func.count(Payment.id)).where(Payment.status == "success", Payment.created_at >= day30_ago)
    ).scalar()

    return {
        "revenue": {
            "total": total_revenue,
            "this_month": month_revenue,
        },
        "tenants": {
            "total": total_tenants,
            "active": active_tenants,
            "new_this_month": new_tenants_month,
        },
        "subscriptions": {
            "active": active_subs,
            "expired": expired_subs,
            "by_plan": [{"plan": r[0], "count": r[1]} for r in subs_by_plan],
        },
        "payments": {
            "success_rate_30d": round(success_payments_30d / total_payments_30d * 100, 1) if total_payments_30d else 0,
            "total_30d": total_payments_30d,
            "success_30d": success_payments_30d,
        },
    }


@router.get("/reports/monthly-revenue")
def get_monthly_revenue(db: Session = Depends(get_db), _=Depends(require_super_admin)):
    """Doanh thu theo tháng — 12 tháng gần nhất."""
    from sqlalchemy import text
    rows = db.execute(text(
        "SELECT DATE_FORMAT(paid_at, '%Y-%m') AS month, "
        "SUM(amount) AS revenue, COUNT(*) AS count "
        "FROM payments "
        "WHERE status = 'success' AND paid_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH) "
        "GROUP BY month ORDER BY month ASC"
    )).all()
    return [{"month": r[0], "revenue": int(r[1]), "count": r[2]} for r in rows]


@router.get("/reports/tenants-detail")
def get_tenants_detail(db: Session = Depends(get_db), _=Depends(require_super_admin)):
    """Chi tiết từng tenant: user count, subscription, revenue."""
    tenants = db.execute(
        select(Tenant)
        .options(
            joinedload(Tenant.subscriptions).joinedload(Subscription.plan),
            joinedload(Tenant.users),
        )
        .where(Tenant.deleted_at.is_(None))
        .order_by(Tenant.id)
    ).scalars().unique().all()

    result = []
    for t in tenants:
        active_sub = next((s for s in t.subscriptions if s.status == "active" and s.deleted_at is None), None)
        user_count = sum(1 for u in t.users if u.deleted_at is None and u.is_active)
        tenant_revenue = db.execute(
            select(func.coalesce(func.sum(Payment.amount), 0))
            .where(Payment.tenant_id == t.id, Payment.status == "success")
        ).scalar()
        result.append({
            "id": t.id,
            "name": t.name,
            "slug": t.slug,
            "is_active": t.is_active,
            "user_count": user_count,
            "plan_name": active_sub.plan.name if active_sub and active_sub.plan else None,
            "sub_status": active_sub.status if active_sub else "none",
            "sub_end": active_sub.end_date.isoformat() if active_sub and active_sub.end_date else None,
            "total_revenue": int(tenant_revenue),
            "created_at": t.created_at.isoformat() if t.created_at else None,
        })
    return result
