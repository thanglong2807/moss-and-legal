from fastapi import APIRouter, Depends, HTTPException, status, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import select
from datetime import datetime

from app.core.database import get_db
from app.auth import user_service, role_service
from app.auth.service import verify_password, create_access_token, create_refresh_token, decode_token
from app.auth.dependencies import get_current_user, require_admin

_bearer = HTTPBearer(auto_error=False)
from app.auth.schemas import (
    UserCreate, UserUpdate, UserRead,
    RoleCreate, RoleUpdate, RoleRead,
    RolePermissionIn,
)

router = APIRouter()


def _get_subscription_data(db: Session, tenant_id):
    """Lấy thông tin subscription active của tenant (hoặc None)."""
    if not tenant_id:
        return None
    from app.models.subscription import Subscription, SubscriptionPlan
    sub = db.execute(
        select(Subscription)
        .where(
            Subscription.tenant_id == tenant_id,
            Subscription.status == "active",
            Subscription.deleted_at.is_(None),
        )
        .order_by(Subscription.end_date.desc())
    ).scalars().first()
    if not sub:
        return None
    return {
        "plan_name": sub.plan.name if sub.plan else None,
        "max_users": sub.plan.max_users if sub.plan else None,
        "end_date": sub.end_date.isoformat() if sub.end_date else None,
        "status": sub.status,
    }


# ── Auth ──────────────────────────────────────────────────────────────────────

@router.post("/login")
def login(
    username: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db),
):
    user = user_service.get_user_by_email(db, username)
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Sai email hoặc mật khẩu")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Tài khoản bị khoá")

    perms = role_service.permissions_to_dict(user.role)
    subscription_data = _get_subscription_data(db, user.tenant_id)
    return {
        "access_token": create_access_token(user.id, user.tenant_id, user.is_super_admin),
        "refresh_token": create_refresh_token(user.id, user.tenant_id, user.is_super_admin),
        "user": {
            "id": user.id,
            "email": user.email,
            "display_name": user.display_name,
            "roles": [user.role.name] if user.role else [],
            "permissions": perms,
            "tenant_id": user.tenant_id,
            "is_super_admin": user.is_super_admin,
            "subscription": subscription_data,
        },
    }


@router.get("/me")
def me(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    user = user_service.get_user_by_id(db, current_user.id)
    perms = role_service.permissions_to_dict(user.role)
    subscription_data = _get_subscription_data(db, user.tenant_id)
    return {
        "id": user.id,
        "email": user.email,
        "display_name": user.display_name,
        "roles": [user.role.name] if user.role else [],
        "permissions": perms,
        "tenant_id": user.tenant_id,
        "is_super_admin": user.is_super_admin,
        "subscription": subscription_data,
    }


@router.put("/me/password")
def change_password(
    current_password: str = Form(...),
    new_password: str = Form(...),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.auth.service import hash_password
    user = user_service.get_user_by_id(db, current_user.id)
    if not verify_password(current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Mật khẩu hiện tại không đúng")
    user.hashed_password = hash_password(new_password)
    db.commit()
    return {"message": "Đổi mật khẩu thành công"}


@router.put("/me/profile")
def update_profile(
    display_name: str = Form(...),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = user_service.get_user_by_id(db, current_user.id)
    user.display_name = display_name
    db.commit()
    return {"message": "Cập nhật thành công", "display_name": user.display_name}


@router.post("/logout")
def logout():
    # Stateless JWT — client clears tokens; nothing to do server-side
    return {"message": "ok"}


@router.get("/refresh-token")
def refresh(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: Session = Depends(get_db),
):
    if not credentials:
        raise HTTPException(status_code=401, detail="Missing token")
    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Token không hợp lệ")
    user = user_service.get_user_by_id(db, int(payload["sub"]))
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Tài khoản không tồn tại")
    return {
        "access_token": create_access_token(user.id, user.tenant_id, user.is_super_admin),
        "refresh_token": create_refresh_token(user.id, user.tenant_id, user.is_super_admin),
    }


# ── Users (admin only) ────────────────────────────────────────────────────────

@router.get("/users")
def list_users(
    skip: int = 0, limit: int = 50, search: str = None,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    # Super admin thấy tất cả; tenant admin chỉ thấy users trong tenant của mình
    tenant_id = None if current_user.is_super_admin else current_user.tenant_id
    return user_service.get_users(db, skip=skip, limit=limit, search=search, tenant_id=tenant_id)


@router.post("/users", status_code=201)
def create_user(obj: UserCreate, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    if obj.email and user_service.get_user_by_email(db, obj.email):
        raise HTTPException(status_code=400, detail="Email đã tồn tại")
    return user_service.create_user(db, obj, acting_user=current_user)


@router.put("/users/{user_id}")
def update_user(user_id: int, obj: UserUpdate, db: Session = Depends(get_db), _=Depends(require_admin)):
    user = user_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy user")
    return user_service.update_user(db, user, obj)


@router.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    user = user_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy user")
    user_service.delete_user(db, user)


# ── Roles (admin only) ────────────────────────────────────────────────────────

@router.get("/roles")
def list_roles(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    tenant_id = None if current_user.is_super_admin else current_user.tenant_id
    return role_service.get_roles(db, tenant_id=tenant_id)


@router.post("/roles", status_code=201)
def create_role(obj: RoleCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    return role_service.create_role(db, obj)


@router.put("/roles/{role_id}")
def update_role(role_id: int, obj: RoleUpdate, db: Session = Depends(get_db), _=Depends(require_admin)):
    role = role_service.get_role_by_id(db, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Không tìm thấy role")
    return role_service.update_role(db, role, obj)


@router.delete("/roles/{role_id}", status_code=204)
def delete_role(role_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    role = role_service.get_role_by_id(db, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Không tìm thấy role")
    role_service.delete_role(db, role)


@router.put("/roles/{role_id}/permissions")
def set_permissions(
    role_id: int,
    permissions: list[RolePermissionIn],
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    role = role_service.get_role_by_id(db, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Không tìm thấy role")
    return role_service.upsert_permissions(db, role, permissions)
