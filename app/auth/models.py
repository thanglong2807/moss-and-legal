from sqlalchemy import Column, String, Boolean, Integer, ForeignKey, SmallInteger
from sqlalchemy.orm import relationship
from app.models.base import Base
from app.models.customer import StaffConfig  # noqa: F401 — needed for relationship resolution


class Role(Base):
    __tablename__ = "roles"

    name = Column(String(100), nullable=False, unique=True)
    level = Column(Integer, default=1)
    parent_id = Column(Integer, ForeignKey("roles.id"), nullable=True)

    permissions = relationship("RolePermission", back_populates="role", cascade="all, delete-orphan")
    users = relationship("User", back_populates="role")
    children = relationship("Role", foreign_keys=[parent_id], back_populates="parent")
    parent = relationship("Role", foreign_keys=[parent_id], remote_side="Role.id", back_populates="children")


class RolePermission(Base):
    __tablename__ = "role_permissions"

    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    module = Column(String(50), nullable=False)
    can_view = Column(Boolean, default=False)
    can_create = Column(Boolean, default=False)
    can_update = Column(Boolean, default=False)
    can_delete = Column(Boolean, default=False)

    role = relationship("Role", back_populates="permissions")

    # deleted_at not needed for permissions — override Base
    __mapper_args__ = {}


class User(Base):
    __tablename__ = "users"

    email = Column(String(255), nullable=True, unique=True, index=True)
    hashed_password = Column(String(255), nullable=False)
    display_name = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)

    phone = Column(String(20), nullable=True)
    personal_email = Column(String(255), nullable=True)
    gender = Column(SmallInteger, nullable=True)   # 0=Nam 1=Nữ
    birth_date = Column(String(10), nullable=True)  # dd/mm/yyyy
    id_number = Column(String(20), nullable=True)  # CCCD
    address = Column(String(500), nullable=True)

    gov_account = Column(String(255), nullable=True)
    gov_pass = Column(String(255), nullable=True)   # plain text intentionally

    role_id = Column(Integer, ForeignKey("roles.id"), nullable=True)
    staff_config_id = Column(Integer, ForeignKey("staff_configs.id"), nullable=True)
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    role = relationship("Role", back_populates="users")
    staff_config = relationship("StaffConfig")
    manager = relationship("User", foreign_keys=[manager_id], remote_side="User.id")
