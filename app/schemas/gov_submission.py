from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class GovSubmissionCreate(BaseModel):
    record_id: int
    record_type: str      # 'hkd' | 'company'
    record_name: Optional[str] = None
    job_id: str
    service: str = 'hkd'  # 'hkd' | 'tldn'


class GovSubmissionPatch(BaseModel):
    status: Optional[str] = None
    progress: Optional[str] = None
    error: Optional[str] = None


class GovSubmissionRead(BaseModel):
    id: int
    record_id: int
    record_type: str
    record_name: Optional[str]
    job_id: Optional[str]
    service: str
    status: str
    progress: Optional[str]
    error: Optional[str]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
