"""Tenant Staff management — TenantAdmin quản lý nhân viên."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from typing import Optional
from datetime import datetime
from pydantic import BaseModel

from app.core.database import get_db
from app.auth.dependencies import require_tenant_admin
from app.auth.models import User, Role
from app.models.subscription import Subscription, SubscriptionPlan

router = APIRouter()


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class StaffCreate(BaseModel):
    display_name: str
    email: str
    password: str
    phone: Optional[str] = None
    role_id: Optional[int] = None


class StaffUpdate(BaseModel):
    display_name: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None
    role_id: Optional[int] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _check_user_limit(db: Session, tenant_id: int) -> None:
    """Kiểm tra giới hạn số user theo plan hiện tại. Raise 400 nếu vượt quá."""
    active_sub = db.execute(
        select(Subscription)
        .where(
            Subscription.tenant_id == tenant_id,
            Subscription.status == "active",
            Subscription.deleted_at.is_(None),
        )
        .order_by(Subscription.end_date.desc())
    ).scalars().first()

    if not active_sub:
        raise HTTPException(status_code=402, detail="Tenant chưa có gói đăng ký active")

    plan = db.get(SubscriptionPlan, active_sub.plan_id)
    if not plan:
        return

    # -1 = unlimited
    if plan.max_users == -1:
        return

    # Đếm user hiện tại (không bao gồm đã xoá)
    current_count = db.execute(
        select(func.count(User.id)).where(
            User.tenant_id == tenant_id,
            User.deleted_at.is_(None),
        )
    ).scalar() or 0

    if current_count >= plan.max_users:
        raise HTTPException(
            status_code=400,
            detail=f"Đã đạt giới hạn {plan.max_users} người dùng của gói {plan.name}",
        )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/roles")
def list_roles(
    db: Session = Depends(get_db),
    current_user=Depends(require_tenant_admin),
):
    """Danh sách roles của tenant hiện tại."""
    roles = db.execute(
        select(Role).where(
            Role.tenant_id == current_user.tenant_id,
            Role.deleted_at.is_(None),
        ).order_by(Role.level, Role.id)
    ).scalars().all()

    return [
        {
            "id": r.id,
            "name": r.name,
            "level": r.level,
            "parent_id": r.parent_id,
        }
        for r in roles
    ]


@router.get("/")
def list_staff(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(require_tenant_admin),
):
    """Danh sách nhân viên của tenant (trừ role level=1 admin)."""
    stmt = (
        select(User)
        .join(Role, User.role_id == Role.id, isouter=True)
        .where(
            User.tenant_id == current_user.tenant_id,
            User.deleted_at.is_(None),
        )
        .where(
            # Chỉ lấy user không phải admin (level != 1) hoặc chưa có role
            (Role.level != 1) | (User.role_id.is_(None))
        )
    )
    total = len(db.execute(stmt).scalars().all())

    users = db.execute(
        stmt.order_by(User.id).offset((page - 1) * limit).limit(limit)
    ).scalars().all()

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "items": [
            {
                "id": u.id,
                "display_name": u.display_name,
                "email": u.email,
                "phone": u.phone,
                "is_active": u.is_active,
                "role_id": u.role_id,
                "role_name": u.role.name if u.role else None,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in users
        ],
    }


@router.post("/", status_code=201)
def create_staff(
    data: StaffCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_tenant_admin),
):
    """Tạo nhân viên mới cho tenant."""
    from app.auth.service import hash_password

    # Kiểm tra giới hạn user
    _check_user_limit(db, current_user.tenant_id)

    # Kiểm tra email trùng
    existing = db.execute(
        select(User).where(User.email == data.email, User.deleted_at.is_(None))
    ).scalars().first()
    if existing:
        raise HTTPException(status_code=400, detail="Email đã được sử dụng")

    # Kiểm tra role_id thuộc tenant này
    if data.role_id is not None:
        role = db.execute(
            select(Role).where(
                Role.id == data.role_id,
                Role.tenant_id == current_user.tenant_id,
                Role.deleted_at.is_(None),
            )
        ).scalars().first()
        if not role:
            raise HTTPException(status_code=404, detail="Không tìm thấy role trong tenant này")

    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        display_name=data.display_name,
        phone=data.phone,
        is_active=True,
        is_super_admin=False,
        tenant_id=current_user.tenant_id,
        role_id=data.role_id,
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
        "role_id": user.role_id,
        "tenant_id": user.tenant_id,
    }


@router.put("/{user_id}")
def update_staff(
    user_id: int,
    data: StaffUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_tenant_admin),
):
    """Cập nhật thông tin nhân viên."""
    user = db.execute(
        select(User).where(
            User.id == user_id,
            User.tenant_id == current_user.tenant_id,
            User.deleted_at.is_(None),
        )
    ).scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhân viên")

    # Kiểm tra role_id nếu có
    if data.role_id is not None:
        role = db.execute(
            select(Role).where(
                Role.id == data.role_id,
                Role.tenant_id == current_user.tenant_id,
                Role.deleted_at.is_(None),
            )
        ).scalars().first()
        if not role:
            raise HTTPException(status_code=404, detail="Không tìm thấy role trong tenant này")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)

    return {
        "id": user.id,
        "display_name": user.display_name,
        "email": user.email,
        "phone": user.phone,
        "is_active": user.is_active,
        "role_id": user.role_id,
    }


@router.delete("/{user_id}", status_code=204)
def delete_staff(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_tenant_admin),
):
    """Soft delete nhân viên."""
    user = db.execute(
        select(User).where(
            User.id == user_id,
            User.tenant_id == current_user.tenant_id,
            User.deleted_at.is_(None),
        )
    ).scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhân viên")

    # Không cho xoá chính mình
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Không thể xoá tài khoản đang đăng nhập")

    user.deleted_at = datetime.utcnow()
    db.commit()
