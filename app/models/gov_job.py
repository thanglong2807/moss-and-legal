from sqlalchemy import Column, String, Integer, ForeignKey, DateTime
from app.models.base import Base


class GovJob(Base):
    __tablename__ = "gov_jobs"

    job_id = Column(String(100), unique=True, nullable=False, index=True)
    profile_id = Column(String(100), nullable=False, index=True)
    task_name = Column(String(100), nullable=False)
    status = Column(String(50), nullable=False, default="pending")
    started_at = Column(DateTime, nullable=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True, index=True)
