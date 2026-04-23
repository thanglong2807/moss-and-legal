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


def get_roles(db: Session) -> list[RoleRead]:
    roles = db.execute(
        select(Role)
        .options(joinedload(Role.permissions), joinedload(Role.parent))
        .order_by(Role.level, Role.name)
    ).scalars().unique().all()
    return [_enrich(r) for r in roles]


def get_role_by_id(db: Session, role_id: int) -> Optional[Role]:
    return db.execute(
        select(Role).options(joinedload(Role.permissions)).where(Role.id == role_id)
    ).scalars().first()


def create_role(db: Session, obj: RoleCreate) -> Role:
    role = Role(**obj.model_dump())
    db.add(role)
    db.commit()
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
