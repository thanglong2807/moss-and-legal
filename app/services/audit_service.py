"""Audit log service — ghi log hành động người dùng."""
from typing import Optional
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def log(
    db: Session,
    action: str,
    resource: str,
    resource_id: Optional[int] = None,
    detail: Optional[str] = None,
    tenant_id: Optional[int] = None,
    user_id: Optional[int] = None,
    ip: Optional[str] = None,
) -> AuditLog:
    """Tạo bản ghi audit log và add vào session.

    KHÔNG commit ở đây — để caller commit cùng transaction.
    """
    entry = AuditLog(
        tenant_id=tenant_id,
        user_id=user_id,
        action=action,
        resource=resource,
        resource_id=resource_id,
        detail=detail,
        ip_address=ip,
    )
    db.add(entry)
    return entry
