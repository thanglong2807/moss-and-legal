from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, Dict
from datetime import datetime


# ── Permission ────────────────────────────────────────────────────────────────
class PermissionSet(BaseModel):
    can_view: bool = False
    can_create: bool = False
    can_update: bool = False
    can_delete: bool = False


class RolePermissionIn(BaseModel):
    module: str
    can_view: bool = False
    can_create: bool = False
    can_update: bool = False
    can_delete: bool = False

    model_config = {"from_attributes": True}


# ── Role ──────────────────────────────────────────────────────────────────────
class RoleCreate(BaseModel):
    name: str
    level: int = 2
    parent_id: Optional[int] = None


class RoleUpdate(BaseModel):
    name: Optional[str] = None
    level: Optional[int] = None
    parent_id: Optional[int] = None


class RoleRead(BaseModel):
    id: int
    name: str
    level: int
    parent_id: Optional[int]
    parent_name: Optional[str] = None
    permissions: list[RolePermissionIn] = []

    model_config = {"from_attributes": True}


# ── User ──────────────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    email: Optional[EmailStr] = None
    password: str
    display_name: str
    is_active: bool = True
    phone: Optional[str] = None
    personal_email: Optional[str] = None
    gender: Optional[int] = None
    birth_date: Optional[str] = None
    id_number: Optional[str] = None
    address: Optional[str] = None
    gov_account: Optional[str] = None
    gov_pass: Optional[str] = None
    role_id: Optional[int] = None
    staff_config_id: Optional[int] = None
    manager_id: Optional[int] = None

    @field_validator('email', 'personal_email', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        return None if v == '' else v


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    display_name: Optional[str] = None
    is_active: Optional[bool] = None
    phone: Optional[str] = None
    personal_email: Optional[str] = None
    gender: Optional[int] = None
    birth_date: Optional[str] = None
    id_number: Optional[str] = None
    address: Optional[str] = None
    gov_account: Optional[str] = None
    gov_pass: Optional[str] = None
    role_id: Optional[int] = None
    staff_config_id: Optional[int] = None
    manager_id: Optional[int] = None

    @field_validator('email', 'personal_email', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        return None if v == '' else v


class UserRead(BaseModel):
    id: int
    email: Optional[str]
    display_name: str
    is_active: bool
    phone: Optional[str] = None
    personal_email: Optional[str] = None
    gender: Optional[int] = None
    birth_date: Optional[str] = None
    id_number: Optional[str] = None
    address: Optional[str] = None
    gov_account: Optional[str]
    # gov_pass intentionally excluded — never return credentials in API responses
    role_id: Optional[int]
    role_name: Optional[str] = None
    staff_config_id: Optional[int]
    staff_name: Optional[str] = None
    manager_id: Optional[int] = None
    manager_name: Optional[str] = None
    created_at: Optional[datetime]

    model_config = {"from_attributes": True}


# ── Auth ──────────────────────────────────────────────────────────────────────
class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: dict


class MeResponse(BaseModel):
    id: int
    email: str
    display_name: str
    roles: list[str]
    permissions: Dict[str, PermissionSet]
