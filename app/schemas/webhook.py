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
