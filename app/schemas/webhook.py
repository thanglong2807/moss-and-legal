from typing import Optional
from pydantic import BaseModel


class CRMWebhookPayload(BaseModel):
    table: str
    id: str
    id_kh: Optional[str] = ""
    nv_sale: Optional[str] = ""
    nv_support: Optional[str] = ""
    name: Optional[str] = ""
    phone: Optional[str] = ""
    source: Optional[str] = ""
    amount_paid: Optional[str] = "0"
    status: Optional[str] = ""
    note: Optional[str] = ""
    comp_type: Optional[str] = None  # "1tv" | "2tv" | "cổ phần" — chỉ dùng cho TLDN
