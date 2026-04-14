from typing import Optional, List
from .base import BaseSchema

class AdministrativeUnitBase(BaseSchema):
    code: Optional[str] = None
    name: str
    parent_id: Optional[int] = None
    division_type: str

class FieldBase(BaseSchema):
    name: str

class IndustryBase(BaseSchema):
    name: str
    code: str

class FieldIndustryLink(BaseSchema):
    field_id: int
    industry_id: int
    note: Optional[str] = None
    industry: Optional[IndustryBase] = None

class FieldWithIndustries(FieldBase):
    industries: List[FieldIndustryLink] = []
