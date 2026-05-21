from typing import Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select

from app.auth.models import Role, RolePermission
from app.auth.schemas import RoleCreate, RoleUpdate, RolePermissionIn, RoleRead


def _enrich(role: Role) -> RoleRead:
    return RoleRead(
        id=role.id,
        name=role.name,
        level=role.level,
        parent_id=role.parent_id,
        parent_name=role.parent.name if role.parent else None,
        permissions=role.permissions,
    )


def get_roles(db: Session, tenant_id: int = None) -> list[RoleRead]:
    q = (
        select(Role)
        .options(joinedload(Role.permissions), joinedload(Role.parent))
        .order_by(Role.level, Role.name)
    )
    if tenant_id is not None:
        # Trả về roles của tenant + system roles (tenant_id IS NULL)
        from sqlalchemy import or_
        q = q.where(or_(Role.tenant_id == tenant_id, Role.tenant_id.is_(None)))
    roles = db.execute(q).scalars().unique().all()
    return [_enrich(r) for r in roles]


def get_role_by_id(db: Session, role_id: int, tenant_id: int = None) -> Optional[Role]:
    q = select(Role).options(joinedload(Role.permissions)).where(Role.id == role_id)
    if tenant_id is not None:
        q = q.where(Role.tenant_id == tenant_id)
    return db.execute(q).scalars().first()


def create_role(db: Session, obj: RoleCreate, tenant_id: int = None) -> Role:
    data = obj.model_dump()
    if tenant_id is not None:
        data["tenant_id"] = tenant_id
    role = Role(**data)
    db.add(role)
    try:
        db.commit()
    except Exception:
        db.rollback()
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Tên vai trò đã tồn tại, vui lòng chọn tên khác")
    db.refresh(role)
    return role


def update_role(db: Session, role: Role, obj: RoleUpdate) -> Role:
    for k, v in obj.model_dump(exclude_unset=True).items():
        setattr(role, k, v)
    db.commit()
    db.refresh(role)
    return role


def delete_role(db: Session, role: Role) -> None:
    db.delete(role)
    db.commit()


def upsert_permissions(db: Session, role: Role, permissions: list[RolePermissionIn]) -> Role:
    """Replace all permissions for a role."""
    db.execute(
        RolePermission.__table__.delete().where(RolePermission.role_id == role.id)
    )
    for p in permissions:
        db.add(RolePermission(
            role_id=role.id,
            module=p.module,
            can_view=p.can_view,
            can_create=p.can_create,
            can_update=p.can_update,
            can_delete=p.can_delete,
        ))
    db.commit()
    db.refresh(role)
    return role


def permissions_to_dict(role: Optional[Role]) -> dict:
    """Convert role permissions to {module: PermissionSet} dict for /me response."""
    if not role:
        return {}
    return {
        p.module: {
            "can_view": p.can_view,
            "can_create": p.can_create,
            "can_update": p.can_update,
            "can_delete": p.can_delete,
        }
        for p in role.permissions
    }
