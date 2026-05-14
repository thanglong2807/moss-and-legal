from typing import List, Optional, Any
from pydantic import BaseModel
from .base import BaseSchema
from .customer import CustomerRead, ConfigRead

class HKDIndustryInput(BaseModel):
    code: str
    is_main: bool = False
    note: Optional[str] = ""

class HKDCreate(BaseModel):
    company_full_name: Optional[str] = None
    company_info: Optional[dict] = {}
    owner: Optional[dict] = {}
    industries: Optional[List[HKDIndustryInput]] = []
    customer_id: Optional[int] = None
    handling_staff_id: Optional[int] = None
    supporting_staff_id: Optional[int] = None
    status_id: Optional[int] = None
    source_id: Optional[int] = None
    note: Optional[str] = None
    paid_amount: Optional[int] = None
    tax_code: Optional[str] = None
    approval_date: Optional[str] = None
    registration_date: Optional[str] = None

class HKDUpdate(BaseModel):
    company_full_name: Optional[str] = None
    company_info: Optional[dict] = None
    owner: Optional[dict] = None
    industries: Optional[List[HKDIndustryInput]] = None
    customer_id: Optional[int] = None
    handling_staff_id: Optional[int] = None
    supporting_staff_id: Optional[int] = None
    status_id: Optional[int] = None
    source_id: Optional[int] = None
    note: Optional[str] = None
    paid_amount: Optional[int] = None
    id_crm: Optional[str] = None
    tax_code: Optional[str] = None
    approval_date: Optional[str] = None
    registration_date: Optional[str] = None

class HKDRead(BaseSchema):
    code: str
    company_full_name: Optional[str] = None
    company_foreign_name: Optional[str] = None
    company_short_name: Optional[str] = None
    customer_id: Optional[int] = None
    handling_staff_id: Optional[int] = None
    supporting_staff_id: Optional[int] = None
    status_id: Optional[int] = None
    source_id: Optional[int] = None
    note: Optional[str] = None
    crm_link: Optional[str] = None
    id_crm: Optional[str] = None
    paid_amount: Optional[int] = None
    folder_id: Optional[str] = None
    tax_code: Optional[str] = None
    approval_date: Optional[str] = None
    registration_date: Optional[str] = None

    # Relationships
    customer: Optional[CustomerRead] = None
    handling_staff: Optional[ConfigRead] = None
    supporting_staff: Optional[ConfigRead] = None
    status: Optional[ConfigRead] = None
    source: Optional[ConfigRead] = None

    # Nested display data can be added here
    company_info: Optional[dict] = None
    owner_info: Optional[dict] = None
    industries: List[Any] = []
