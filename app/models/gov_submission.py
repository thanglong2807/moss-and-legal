from sqlalchemy import Column, String, Integer, Text
from app.models.base import Base


class GovSubmission(Base):
    __tablename__ = "gov_jobs"

    record_id   = Column(Integer, nullable=True, index=True)
    record_type = Column(String(20), nullable=True)    # 'hkd' | 'company'
    record_name = Column(String(255), nullable=True)
    job_id      = Column(String(100), nullable=True, index=True)
    service     = Column(String(20), nullable=True, default='hkd')  # 'hkd' | 'tldn'
    status      = Column(String(50), nullable=False, default='pending')
    progress    = Column(String(255), nullable=True)
    error       = Column(Text, nullable=True)
