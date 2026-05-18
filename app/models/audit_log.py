from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from app.models.base import Base


class AuditLog(Base):
    """Bảng ghi lại hành động của người dùng trong hệ thống."""
    __tablename__ = "audit_logs"

    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String(100), nullable=False)    # CREATE, UPDATE, DELETE, LOGIN, EXPORT
    resource = Column(String(100), nullable=False)  # customer, company, hkd, user, subscription
    resource_id = Column(Integer, nullable=True)
    detail = Column(Text, nullable=True)            # JSON string chi tiết
    ip_address = Column(String(50), nullable=True)
    # created_at inherited from Base; override server_default so DB sets it automatically
    # updated_at and deleted_at are inherited but unused for audit logs
