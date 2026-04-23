from typing import List, Optional, Any
from pydantic import BaseModel
from .base import BaseSchema
from .customer import CustomerRead, ConfigRead


class CompanyPositionRead(BaseSchema):
    name: str
    is_llc1: bool
    is_llc2: bool
    is_jsc: bool


class CompanyPersonInput(BaseModel):
    person_type: str  # representative|member|owner|founder
    position_id: Optional[int] = None
    full_name: Optional[str] = None
    gender: Optional[int] = None
    birth_date: Optional[str] = None
    id_number: Optional[str] = None
    province_id: Optional[int] = None
    ward_id: Optional[int] = None
    street: Optional[str] = None
    phone: Optional[str] = None
    fax: Optional[str] = None
    email: Optional[str] = None
    ownership_percentage: Optional[float] = None
    asset_type_ratio: Optional[float] = None


class CompanyPersonRead(BaseSchema):
    person_type: str
    position_id: Optional[int] = None
    full_name: Optional[str] = None
    gender: Optional[int] = None
    birth_date: Optional[Any] = None
    id_number: Optional[str] = None
    province_id: Optional[int] = None
    ward_id: Optional[int] = None
    street: Optional[str] = None
    phone: Optional[str] = None
    fax: Optional[str] = None
    email: Optional[str] = None
    ownership_percentage: Optional[float] = None
    asset_type_ratio: Optional[float] = None
    position: Optional[CompanyPositionRead] = None


class CompanyIndustryInput(BaseModel):
    code: str
    is_main: bool = False
    note: Optional[str] = ""


class CompanyCreate(BaseModel):
    company_type: int  # 1=LLC1, 2=LLC2, 3=JSC
    company_full_name: Optional[str] = None
    company_info: Optional[dict] = {}
    persons: Optional[List[CompanyPersonInput]] = []
    industries: Optional[List[CompanyIndustryInput]] = []
    customer_id: Optional[int] = None
    handling_staff_id: Optional[int] = None
    supporting_staff_id: Optional[int] = None
    status_id: Optional[int] = None
    source_id: Optional[int] = None
    note: Optional[str] = None
    paid_amount: Optional[int] = None
    accounting_name: Optional[str] = None
    accounting_phone: Optional[str] = None
    accounting_gender: Optional[int] = None
    accounting_birth_date: Optional[str] = None
    accounting_id_number: Optional[str] = None


class CompanyUpdate(BaseModel):
    company_type: Optional[int] = None
    company_full_name: Optional[str] = None
    company_info: Optional[dict] = None
    persons: Optional[List[CompanyPersonInput]] = None
    industries: Optional[List[CompanyIndustryInput]] = None
    customer_id: Optional[int] = None
    handling_staff_id: Optional[int] = None
    supporting_staff_id: Optional[int] = None
    status_id: Optional[int] = None
    source_id: Optional[int] = None
    note: Optional[str] = None
    paid_amount: Optional[int] = None
    accounting_name: Optional[str] = None
    accounting_phone: Optional[str] = None
    accounting_gender: Optional[int] = None
    accounting_birth_date: Optional[str] = None
    accounting_id_number: Optional[str] = None


class CompanyRead(BaseSchema):
    code: str
    company_type: int
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
    accounting_name: Optional[str] = None
    accounting_phone: Optional[str] = None
    accounting_gender: Optional[int] = None
    accounting_birth_date: Optional[str] = None
    accounting_id_number: Optional[str] = None

    customer: Optional[CustomerRead] = None
    handling_staff: Optional[ConfigRead] = None
    supporting_staff: Optional[ConfigRead] = None
    status: Optional[ConfigRead] = None
    source: Optional[ConfigRead] = None

    company_info: Optional[dict] = None
    persons: List[CompanyPersonRead] = []
    industries: List[Any] = []

class TranslateNameRequest(BaseModel):
    name: str
    company_type: int