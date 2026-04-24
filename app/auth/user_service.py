from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select

from app.auth.models import User
from app.auth.schemas import UserCreate, UserUpdate, UserRead
from app.auth.service import hash_password


def _enrich(user: User) -> UserRead:
    return UserRead(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        is_active=user.is_active,
        phone=user.phone,
        personal_email=user.personal_email,
        gender=user.gender,
        id_number=user.id_number,
        address=user.address,
        gov_account=user.gov_account,
        gov_pass=user.gov_pass,
        role_id=user.role_id,
        role_name=user.role.name if user.role else None,
        staff_config_id=user.staff_config_id,
        staff_name=user.staff_config.name if user.staff_config else None,
        manager_id=user.manager_id,
        manager_name=user.manager.display_name if user.manager else None,
        created_at=user.created_at,
    )


def _base_query():
    return (
        select(User)
        .options(
            joinedload(User.role),
            joinedload(User.staff_config),
            joinedload(User.manager),
        )
        .where(User.deleted_at.is_(None))
    )


def get_users(db: Session, skip: int = 0, limit: int = 50, search: str = None):
    from sqlalchemy import or_, func
    q = _base_query()
    if search:
        like = f"%{search}%"
        q = q.where(or_(User.display_name.ilike(like), User.email.ilike(like), User.phone.ilike(like)))
    total = db.execute(select(func.count()).select_from(q.subquery())).scalar()
    users = db.execute(q.order_by(User.id).offset(skip).limit(limit)).scalars().unique().all()
    return {"items": [_enrich(u) for u in users], "total": total}


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.execute(
        select(User).options(joinedload(User.role))
        .where(User.email == email, User.deleted_at.is_(None))
    ).scalars().first()


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.execute(
        _base_query().where(User.id == user_id)
    ).scalars().first()


def create_user(db: Session, obj: UserCreate) -> UserRead:
    user = User(
        email=obj.email or None,
        hashed_password=hash_password(obj.password),
        display_name=obj.display_name,
        is_active=obj.is_active,
        phone=obj.phone,
        personal_email=obj.personal_email,
        gender=obj.gender,
        id_number=obj.id_number,
        address=obj.address,
        gov_account=obj.gov_account,
        gov_pass=obj.gov_pass,
        role_id=obj.role_id,
        staff_config_id=obj.staff_config_id,
        manager_id=obj.manager_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return get_user_by_id(db, user.id)


def update_user(db: Session, user: User, obj: UserUpdate) -> UserRead:
    data = obj.model_dump(exclude_unset=True)
    if "password" in data:
        user.hashed_password = hash_password(data.pop("password"))
    for k, v in data.items():
        setattr(user, k, v)
    db.commit()
    return get_user_by_id(db, user.id)


def delete_user(db: Session, user: User) -> None:
    user.deleted_at = datetime.utcnow()
    db.commit()
