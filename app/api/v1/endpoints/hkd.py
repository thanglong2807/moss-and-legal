from fastapi import APIRouter, Depends, HTTPException, Query
import uuid
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.schemas.hkd import HKDCreate, HKDRead, HKDUpdate
from app.services.hkd_service import hkd_service
from app.auth.dependencies import require_permission, get_current_user, get_tenant_id

router = APIRouter()

@router.post("/", response_model=HKDRead)
def create_hkd(
    data: HKDCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("hkd", "create")),
    tenant_id: int = Depends(get_tenant_id),
):
    return hkd_service.create(db, data, tenant_id=tenant_id)

@router.get("/")
def list_hkd(
    customer_id: Optional[int] = None,
    search: Optional[str] = None,
    branch_name: Optional[str] = None,
    staff_id: Optional[int] = None,
    source_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("hkd", "view")),
    tenant_id: int = Depends(get_tenant_id),
):
    return hkd_service.get_list(db, skip=skip, limit=limit, customer_id=customer_id,
                                search=search, branch_name=branch_name, staff_id=staff_id,
                                source_id=source_id, tenant_id=tenant_id)

@router.get("/{hkd_id}", response_model=HKDRead)
def get_hkd(
    hkd_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("hkd", "view")),
    tenant_id: int = Depends(get_tenant_id),
):
    item = hkd_service.get_by_id(db, hkd_id, tenant_id=tenant_id)
    if not item:
        raise HTTPException(status_code=404, detail="HKD not found")
    return item

@router.put("/{hkd_id}", response_model=HKDRead)
def update_hkd(
    hkd_id: int, data: HKDUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("hkd", "update")),
    tenant_id: int = Depends(get_tenant_id),
):
    # Verify ownership before update
    existing = hkd_service.get_by_id(db, hkd_id, tenant_id=tenant_id)
    if not existing:
        raise HTTPException(status_code=404, detail="HKD not found")
    item = hkd_service.update(db, hkd_id, data, tenant_id=tenant_id)
    if not item:
        raise HTTPException(status_code=404, detail="HKD not found")
    return item

@router.delete("/{hkd_id}")
def delete_hkd(
    hkd_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("hkd", "delete")),
    tenant_id: int = Depends(get_tenant_id),
):
    # Verify ownership before delete
    existing = hkd_service.get_by_id(db, hkd_id, tenant_id=tenant_id)
    if not existing:
        raise HTTPException(status_code=404, detail="HKD not found")
    success = hkd_service.delete(db, hkd_id)
    if not success:
        raise HTTPException(status_code=404, detail="HKD not found")
    return {"status": "success"}

@router.post("/{hkd_id}/sync-crm")
def sync_hkd_to_crm(
    hkd_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("hkd", "update")),
    tenant_id: int = Depends(get_tenant_id),
):
    item = hkd_service.get_by_id(db, hkd_id, tenant_id=tenant_id)
    if not item:
        raise HTTPException(status_code=404, detail="HKD not found")
    
    # Placeholder CRM sync logic
    # In reality, you'd call an external API here
    crm_url = f"https://crm.mosslegal.vn/records/hkd/{hkd_id}-{uuid.uuid4().hex[:6]}"
    
    updated = hkd_service.update_crm_link(db, hkd_id, crm_url)
    return {"status": "success", "crm_link": updated.crm_link}
