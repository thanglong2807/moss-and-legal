"""Audit log endpoints."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import Optional

from app.core.database import get_db
from app.auth.dependencies import require_tenant_admin, require_super_admin
from app.models.audit_log import AuditLog

router = APIRouter()


@router.get("/")
def list_audit_logs(
    action: Optional[str] = Query(None, description="Lọc theo hành động (CREATE, UPDATE, DELETE, LOGIN, EXPORT)"),
    resource: Optional[str] = Query(None, description="Lọc theo loại tài nguyên"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(require_tenant_admin),
):
    """TenantAdmin xem audit log của tenant mình."""
    stmt = select(AuditLog).where(AuditLog.tenant_id == current_user.tenant_id)
    if action:
        stmt = stmt.where(AuditLog.action == action.upper())
    if resource:
        stmt = stmt.where(AuditLog.resource == resource.lower())

    total = db.execute(
        select(AuditLog).where(AuditLog.tenant_id == current_user.tenant_id)
    ).scalars().all()

    stmt = stmt.order_by(AuditLog.created_at.desc()).offset((page - 1) * limit).limit(limit)
    logs = db.execute(stmt).scalars().all()

    return {
        "total": len(total),
        "page": page,
        "limit": limit,
        "items": [
            {
                "id": log.id,
                "user_id": log.user_id,
                "action": log.action,
                "resource": log.resource,
                "resource_id": log.resource_id,
                "detail": log.detail,
                "ip_address": log.ip_address,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ],
    }


@router.get("/super-admin")
def list_audit_logs_super(
    tenant_id: Optional[int] = Query(None, description="Lọc theo tenant_id"),
    action: Optional[str] = Query(None),
    resource: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=200),
    db: Session = Depends(get_db),
    _=Depends(require_super_admin),
):
    """SuperAdmin xem toàn bộ audit log, có thể lọc theo tenant."""
    stmt = select(AuditLog)
    count_stmt = select(AuditLog)

    if tenant_id is not None:
        stmt = stmt.where(AuditLog.tenant_id == tenant_id)
        count_stmt = count_stmt.where(AuditLog.tenant_id == tenant_id)
    if action:
        stmt = stmt.where(AuditLog.action == action.upper())
        count_stmt = count_stmt.where(AuditLog.action == action.upper())
    if resource:
        stmt = stmt.where(AuditLog.resource == resource.lower())
        count_stmt = count_stmt.where(AuditLog.resource == resource.lower())

    total = len(db.execute(count_stmt).scalars().all())
    stmt = stmt.order_by(AuditLog.created_at.desc()).offset((page - 1) * limit).limit(limit)
    logs = db.execute(stmt).scalars().all()

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "items": [
            {
                "id": log.id,
                "tenant_id": log.tenant_id,
                "user_id": log.user_id,
                "action": log.action,
                "resource": log.resource,
                "resource_id": log.resource_id,
                "detail": log.detail,
                "ip_address": log.ip_address,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ],
    }
