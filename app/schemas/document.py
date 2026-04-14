from pydantic import BaseModel
from typing import Optional
from app.schemas.base import BaseSchema


class DocumentRead(BaseSchema):
    record_id: int
    table_name: str
    label: str
    file_name: str
    drive_link: Optional[str] = None
    drive_file_id: Optional[str] = None
