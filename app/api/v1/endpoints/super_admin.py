"""Super Admin endpoints — quản lý tenants, plans, subscriptions."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func, or_
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

def _plan_dict(p: SubscriptionPlan) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "max_users": p.max_users,
        "price_3m": p.price_3m,
        "price_9m": p.price_9m,
        "price_12m": p.price_12m,
        "price_24m": p.price_24m,
        "price_36m": p.price_36m,
        "is_active": p.is_active,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }


@router.get("/plans")
def list_plans(db: Session = Depends(get_db), _=Depends(require_super_admin)):
    plans = db.execute(
        select(SubscriptionPlan).where(SubscriptionPlan.deleted_at.is_(None)).order_by(SubscriptionPlan.id)
    ).scalars().all()
    return [_plan_dict(p) for p in plans]


@router.post("/plans", status_code=201)
def create_plan(data: PlanCreate, db: Session = Depends(get_db), _=Depends(require_super_admin)):
    plan = SubscriptionPlan(**data.model_dump())
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return _plan_dict(plan)


@router.put("/plans/{plan_id}")
def update_plan(plan_id: int, data: PlanUpdate, db: Session = Depends(get_db), _=Depends(require_super_admin)):
    plan = db.execute(select(SubscriptionPlan).where(SubscriptionPlan.id == plan_id, SubscriptionPlan.deleted_at.is_(None))).scalars().first()
    if not plan:
        raise HTTPException(status_code=404, detail="Không tìm thấy gói")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(plan, k, v)
    db.commit()
    db.refresh(plan)
    return _plan_dict(plan)


@router.delete("/plans/{plan_id}", status_code=204)
def delete_plan(plan_id: int, db: Session = Depends(get_db), _=Depends(require_super_admin)):
    plan = db.execute(select(SubscriptionPlan).where(SubscriptionPlan.id == plan_id, SubscriptionPlan.deleted_at.is_(None))).scalars().first()
    if not plan:
        raise HTTPException(status_code=404, detail="Không tìm thấy gói")
    plan.deleted_at = datetime.utcnow()
    db.commit()


# ── Subscription management ───────────────────────────────────────────────────

def _sub_dict(s: Subscription) -> dict:
    return {
        "id": s.id,
        "tenant_id": s.tenant_id,
        "tenant": {"id": s.tenant.id, "name": s.tenant.name} if s.tenant else None,
        "plan_id": s.plan_id,
        "plan": {"id": s.plan.id, "name": s.plan.name} if s.plan else None,
        "status": s.status,
        "duration_months": s.duration_months,
        "start_date": s.start_date.isoformat() if s.start_date else None,
        "end_date": s.end_date.isoformat() if s.end_date else None,
        "amount_paid": s.amount_paid,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }


@router.get("/subscriptions")
def list_subscriptions(db: Session = Depends(get_db), _=Depends(require_super_admin)):
    subs = db.execute(
        select(Subscription)
        .options(joinedload(Subscription.plan), joinedload(Subscription.tenant))
        .where(Subscription.deleted_at.is_(None))
        .order_by(Subscription.created_at.desc())
    ).scalars().unique().all()
    return [_sub_dict(s) for s in subs]


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
    # Reload with relationships to build response dict safely
    sub = db.execute(
        select(Subscription)
        .options(joinedload(Subscription.plan), joinedload(Subscription.tenant))
        .where(Subscription.id == sub.id)
    ).scalars().first()
    return _sub_dict(sub)


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
    from app.services.email_service import send_welcome_admin

    tenant = db.execute(select(Tenant).where(Tenant.id == tenant_id, Tenant.deleted_at.is_(None))).scalars().first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Không tìm thấy tenant")

    existing = db.execute(select(User).where(User.email == data.email, User.deleted_at.is_(None))).scalars().first()
    if existing:
        raise HTTPException(status_code=400, detail="Email đã được sử dụng")

    role = _get_or_create_admin_role(db, tenant_id, tenant.slug)

    # Lưu password plaintext trước khi hash để gửi email
    plain_password = data.password

    user = User(
        email=data.email,
        hashed_password=hash_password(plain_password),
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

    # Gửi email chào mừng (non-blocking — nếu SMTP chưa cấu hình sẽ log warning)
    try:
        send_welcome_admin(
            tenant_name=tenant.name,
            email=user.email,
            display_name=user.display_name,
            password=plain_password,
        )
    except Exception:
        import logging
        logging.getLogger(__name__).exception("Failed to send welcome email to %s", user.email)

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


# ── Users management (cross-tenant) ──────────────────────────────────────────

@router.get("/users")
def list_all_users(
    tenant_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _=Depends(require_super_admin),
):
    """Super admin xem tất cả users toàn platform."""
    from app.auth.models import Role
    stmt = (
        select(User)
        .outerjoin(Role, User.role_id == Role.id)
        .outerjoin(Tenant, User.tenant_id == Tenant.id)
        .where(User.deleted_at.is_(None))
        .order_by(User.id.desc())
    )
    if tenant_id is not None:
        stmt = stmt.where(User.tenant_id == tenant_id)
    if is_active is not None:
        stmt = stmt.where(User.is_active == is_active)
    if search:
        s = f"%{search}%"
        stmt = stmt.where(or_(User.display_name.ilike(s), User.email.ilike(s), User.phone.ilike(s)))

    total = db.execute(select(func.count()).select_from(stmt.subquery())).scalar() or 0
    users = db.execute(stmt.offset(skip).limit(limit)).scalars().unique().all()

    # Pre-fetch tenants for display
    tenant_map = {}
    for u in users:
        if u.tenant_id and u.tenant_id not in tenant_map:
            t = db.execute(select(Tenant).where(Tenant.id == u.tenant_id)).scalars().first()
            tenant_map[u.tenant_id] = t.name if t else f"Tenant #{u.tenant_id}"

    return {
        "total": total,
        "items": [
            {
                "id": u.id,
                "display_name": u.display_name,
                "email": u.email,
                "phone": u.phone,
                "is_active": u.is_active,
                "is_super_admin": u.is_super_admin,
                "tenant_id": u.tenant_id,
                "tenant_name": tenant_map.get(u.tenant_id, "—") if u.tenant_id else "Super Admin",
                "role_name": u.role.name if u.role else None,
                "role_level": u.role.level if u.role else None,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in users
        ],
    }


@router.put("/users/{user_id}/toggle-active")
def toggle_user_active(user_id: int, db: Session = Depends(get_db), _=Depends(require_super_admin)):
    """Khoá / mở khoá tài khoản user bất kỳ."""
    user = db.execute(select(User).where(User.id == user_id, User.deleted_at.is_(None))).scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy user")
    if user.is_super_admin:
        raise HTTPException(status_code=403, detail="Không thể khoá tài khoản Super Admin")
    user.is_active = not user.is_active
    db.commit()
    return {"id": user.id, "is_active": user.is_active}


@router.put("/users/{user_id}/reset-password")
def reset_user_password(
    user_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_super_admin),
):
    """Đặt lại mật khẩu ngẫu nhiên cho user và trả về mật khẩu mới."""
    import secrets, string
    from app.auth.service import hash_password
    user = db.execute(select(User).where(User.id == user_id, User.deleted_at.is_(None))).scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy user")
    alphabet = string.ascii_letters + string.digits
    new_pass = ''.join(secrets.choice(alphabet) for _ in range(12))
    user.hashed_password = hash_password(new_pass)
    db.commit()
    return {"id": user.id, "new_password": new_pass, "message": "Mật khẩu đã được đặt lại — hãy gửi cho user ngay"}


# ── System info & health ──────────────────────────────────────────────────────

@router.get("/system/info")
def system_info(db: Session = Depends(get_db), _=Depends(require_super_admin)):
    """Thông tin hệ thống: version, DB stats, cấu hình."""
    from app.core.config import settings
    import platform, sys

    total_users = db.execute(select(func.count(User.id)).where(User.deleted_at.is_(None))).scalar() or 0
    total_tenants = db.execute(select(func.count(Tenant.id)).where(Tenant.deleted_at.is_(None))).scalar() or 0
    active_subs = db.execute(
        select(func.count(Subscription.id)).where(Subscription.status == "active", Subscription.deleted_at.is_(None))
    ).scalar() or 0

    # Flat structure matching frontend expectations
    return {
        # Stats for StatCards
        "stats": {
            "total_users": total_users,
            "total_tenants": total_tenants,
            "active_subscriptions": active_subs,
        },
        # Version info for detail table
        "version": settings.APP_VERSION,
        "python_version": sys.version.split()[0],
        "db_server": f"{settings.MYSQL_SERVER}:{settings.MYSQL_PORT}",
        "environment": "production" if not settings.DEBUG else "development",
        # Integration status — keys must match frontend INTEGRATIONS[].key
        "integrations": {
            "smtp": bool(getattr(settings, "SMTP_HOST", None) and getattr(settings, "SMTP_USER", None)),
            "gemini": bool(getattr(settings, "GEMINI_API_KEY", None)),
            "google_drive": bool(getattr(settings, "GOOGLE_TOKEN_BASE64", None)),
            "vnpay": bool(getattr(settings, "VNPAY_TMN_CODE", None)),
            "momo": bool(getattr(settings, "MOMO_PARTNER_CODE", None)),
        },
    }


class TestEmailBody(BaseModel):
    email: str


@router.post("/system/test-email")
def test_email(
    body: TestEmailBody,
    db: Session = Depends(get_db),
    _=Depends(require_super_admin),
):
    """Gửi email test để kiểm tra cấu hình SMTP."""
    from app.services.email_service import send_test_email
    try:
        send_test_email(body.email)
        return {"message": f"Email test đã gửi đến {body.email}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gửi email thất bại: {str(e)}")


@router.get("/system/expiring-soon")
def expiring_soon(
    days: int = Query(14, ge=1, le=90),
    db: Session = Depends(get_db),
    _=Depends(require_super_admin),
):
    """Danh sách tenants có subscription sắp hết hạn trong N ngày."""
    from datetime import timedelta
    cutoff = datetime.utcnow() + timedelta(days=days)
    subs = db.execute(
        select(Subscription)
        .options(joinedload(Subscription.tenant), joinedload(Subscription.plan))
        .where(
            Subscription.status == "active",
            Subscription.deleted_at.is_(None),
            Subscription.end_date <= cutoff,
            Subscription.end_date >= datetime.utcnow(),
        )
        .order_by(Subscription.end_date.asc())
    ).scalars().unique().all()

    return [
        {
            "tenant_id": s.tenant_id,
            "tenant_name": s.tenant.name if s.tenant else "—",
            "tenant_email": s.tenant.contact_email if s.tenant else "—",
            "plan_name": s.plan.name if s.plan else "—",
            "end_date": s.end_date.isoformat() if s.end_date else None,
            "days_left": (s.end_date - datetime.utcnow()).days if s.end_date else None,
        }
        for s in subs
    ]


# ── System integration config ─────────────────────────────────────────────────

def _mask_value(value: str) -> str:
    """Giữ lại 4 ký tự đầu, che phần còn lại bằng ••••••."""
    if not value:
        return ""
    if len(value) <= 4:
        return "••••••"
    return value[:4] + "••••••"


def _get_env_path():
    """Trả về đường dẫn tuyệt đối tới file .env ở thư mục gốc dự án."""
    from pathlib import Path
    # app/ nằm trong project root → đi lên 3 cấp từ file này
    return Path(__file__).resolve().parent.parent.parent.parent / ".env"


def _read_env_dict() -> dict:
    """Đọc file .env và trả về dict KEY -> value."""
    env_path = _get_env_path()
    result = {}
    if not env_path.exists():
        return result
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        result[key.strip()] = value.strip()
    return result


def _write_env_dict(updates: dict) -> None:
    """Cập nhật các KEY=VALUE trong file .env theo dict updates."""
    env_path = _get_env_path()
    lines = []
    if env_path.exists():
        lines = env_path.read_text(encoding="utf-8").splitlines()

    updated_keys = set()
    new_lines = []
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            new_lines.append(line)
            continue
        key = stripped.partition("=")[0].strip()
        if key in updates:
            new_lines.append(f"{key}={updates[key]}")
            updated_keys.add(key)
        else:
            new_lines.append(line)

    # Thêm các key chưa có trong file
    for key, value in updates.items():
        if key not in updated_keys:
            new_lines.append(f"{key}={value}")

    env_path.write_text("\n".join(new_lines) + "\n", encoding="utf-8")


class SystemConfigUpdate(BaseModel):
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from: Optional[str] = None
    smtp_tls: Optional[bool] = None
    gemini_api_key: Optional[str] = None
    gemini_model: Optional[str] = None
    google_token_base64: Optional[str] = None
    google_drive_hkd: Optional[str] = None
    google_drive_tldn: Optional[str] = None
    vnpay_tmn_code: Optional[str] = None
    vnpay_hash_secret: Optional[str] = None
    vnpay_url: Optional[str] = None
    vnpay_return_url: Optional[str] = None
    momo_partner_code: Optional[str] = None
    momo_access_key: Optional[str] = None
    momo_secret_key: Optional[str] = None
    momo_endpoint: Optional[str] = None
    momo_return_url: Optional[str] = None
    momo_notify_url: Optional[str] = None


@router.get("/system/config")
def get_system_config(_=Depends(require_super_admin)):
    """Đọc cấu hình tích hợp từ .env, trả về với giá trị nhạy cảm được che."""
    from app.core.config import settings as s

    return {
        "smtp": {
            "host": s.SMTP_HOST,
            "port": s.SMTP_PORT,
            "user": s.SMTP_USER,
            "password": _mask_value(s.SMTP_PASSWORD),
            "from": s.SMTP_FROM,
            "tls": s.SMTP_TLS,
        },
        "gemini": {
            "api_key": _mask_value(s.GEMINI_API_KEY),
            "model": s.GEMINI_OCR_MODEL,
        },
        "google_drive": {
            "token_configured": bool(s.GOOGLE_TOKEN_BASE64),
            "drive_hkd": s.GOOGLE_DRIVE_HKD,
            "drive_tldn": s.GOOGLE_DRIVE_TLDN,
        },
        "vnpay": {
            "tmn_code": _mask_value(s.VNPAY_TMN_CODE),
            "hash_secret": _mask_value(s.VNPAY_HASH_SECRET),
            "url": s.VNPAY_URL,
            "return_url": s.VNPAY_RETURN_URL,
        },
        "momo": {
            "partner_code": _mask_value(s.MOMO_PARTNER_CODE),
            "access_key": _mask_value(s.MOMO_ACCESS_KEY),
            "secret_key": _mask_value(s.MOMO_SECRET_KEY),
            "endpoint": s.MOMO_ENDPOINT,
            "return_url": s.MOMO_RETURN_URL,
            "notify_url": s.MOMO_NOTIFY_URL,
        },
    }


_FIELD_TO_ENV_KEY = {
    "smtp_host": "SMTP_HOST",
    "smtp_port": "SMTP_PORT",
    "smtp_user": "SMTP_USER",
    "smtp_password": "SMTP_PASSWORD",
    "smtp_from": "SMTP_FROM",
    "smtp_tls": "SMTP_TLS",
    "gemini_api_key": "GEMINI_API_KEY",
    "gemini_model": "GEMINI_OCR_MODEL",
    "google_token_base64": "GOOGLE_TOKEN_BASE64",
    "google_drive_hkd": "GOOGLE_DRIVE_HKD",
    "google_drive_tldn": "GOOGLE_DRIVE_TLDN",
    "vnpay_tmn_code": "VNPAY_TMN_CODE",
    "vnpay_hash_secret": "VNPAY_HASH_SECRET",
    "vnpay_url": "VNPAY_URL",
    "vnpay_return_url": "VNPAY_RETURN_URL",
    "momo_partner_code": "MOMO_PARTNER_CODE",
    "momo_access_key": "MOMO_ACCESS_KEY",
    "momo_secret_key": "MOMO_SECRET_KEY",
    "momo_endpoint": "MOMO_ENDPOINT",
    "momo_return_url": "MOMO_RETURN_URL",
    "momo_notify_url": "MOMO_NOTIFY_URL",
}


@router.put("/system/config")
def update_system_config(data: SystemConfigUpdate, _=Depends(require_super_admin)):
    """Cập nhật cấu hình tích hợp vào file .env và settings object ngay lập tức."""
    from app.core.config import settings as s

    env_updates: dict = {}
    payload = data.model_dump(exclude_unset=True)

    for field, value in payload.items():
        if value is None:
            continue
        env_key = _FIELD_TO_ENV_KEY.get(field)
        if env_key is None:
            continue
        str_value = str(value)
        env_updates[env_key] = str_value

        # Cập nhật settings object trực tiếp (hiệu lực ngay)
        settings_attr = env_key  # tên attribute trong Settings trùng env key
        if hasattr(s, settings_attr):
            # Convert type nếu cần
            current = getattr(s, settings_attr)
            if isinstance(current, bool):
                setattr(s, settings_attr, str_value.lower() in ("true", "1", "yes"))
            elif isinstance(current, int):
                try:
                    setattr(s, settings_attr, int(str_value))
                except ValueError:
                    pass
            else:
                setattr(s, settings_attr, str_value)

    if env_updates:
        _write_env_dict(env_updates)

    return {"message": "Đã lưu cấu hình. Một số thay đổi có hiệu lực ngay, một số cần khởi động lại server."}
