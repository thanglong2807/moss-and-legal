from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, date
from .base import BaseSchema

class ConfigBase(BaseModel):
    crm_id: Optional[str] = None
    name: str

class ConfigRead(ConfigBase, BaseSchema):
    pass

class CustomerBase(BaseModel):
    name: str
    phone: str
    source_id: Optional[int] = None
    staff_id: Optional[int] = None
    status_id: Optional[int] = None
    branch_name: Optional[str] = None
    crm_link: Optional[str] = None
    id_crm: Optional[str] = None
    id_card: Optional[str] = None
    gender: Optional[int] = None
    birth_date: Optional[date] = None
    province_id: Optional[int] = None
    district_id: Optional[int] = None
    ward_id: Optional[int] = None
    street: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(CustomerBase):
    name: Optional[str] = None
    phone: Optional[str] = None

class AdminUnitRead(BaseModel):
    id: int
    name: str
    class Config:
        from_attributes = True

class CustomerRead(CustomerBase, BaseSchema):
    source: Optional[ConfigRead] = None
    staff: Optional[ConfigRead] = None
    status: Optional[ConfigRead] = None
    province: Optional[AdminUnitRead] = None
    ward: Optional[AdminUnitRead] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
