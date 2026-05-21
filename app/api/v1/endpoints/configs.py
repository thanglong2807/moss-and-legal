from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.schemas.customer import ConfigRead, ConfigBase
from app.services.config_service import config_service
from app.models.customer import StaffConfig, SourceConfig, StatusConfig
from app.auth.dependencies import require_permission, get_current_user, get_tenant_id

router = APIRouter()


# ── Staff ─────────────────────────────────────────────────────────────────────

@router.get("/staff", response_model=List[ConfigRead])
def list_staff(db: Session = Depends(get_db), _=Depends(get_current_user), tenant_id: int = Depends(get_tenant_id)):
    return config_service.get_staff(db, tenant_id=tenant_id)

@router.post("/staff", response_model=ConfigRead)
def create_staff(data: ConfigBase, db: Session = Depends(get_db), _=Depends(require_permission("config", "create")), tenant_id: int = Depends(get_tenant_id)):
    return config_service.create_staff(db, data, tenant_id=tenant_id)

@router.put("/staff/{id}", response_model=ConfigRead)
def update_staff(id: int, data: ConfigBase, db: Session = Depends(get_db), _=Depends(require_permission("config", "update")), tenant_id: int = Depends(get_tenant_id)):
    obj = config_service.update_config(db, StaffConfig, id, data, tenant_id=tenant_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy")
    return obj

@router.delete("/staff/{id}")
def delete_staff(id: int, db: Session = Depends(get_db), _=Depends(require_permission("config", "delete")), tenant_id: int = Depends(get_tenant_id)):
    if not config_service.soft_delete_config(db, StaffConfig, id, tenant_id=tenant_id):
        raise HTTPException(status_code=404, detail="Không tìm thấy")
    return {"status": "success"}


# ── Sources ───────────────────────────────────────────────────────────────────

@router.get("/sources", response_model=List[ConfigRead])
def list_sources(db: Session = Depends(get_db), _=Depends(get_current_user), tenant_id: int = Depends(get_tenant_id)):
    return config_service.get_sources(db, tenant_id=tenant_id)

@router.post("/sources", response_model=ConfigRead)
def create_source(data: ConfigBase, db: Session = Depends(get_db), _=Depends(require_permission("config", "create")), tenant_id: int = Depends(get_tenant_id)):
    return config_service.create_source(db, data, tenant_id=tenant_id)

@router.put("/sources/{id}", response_model=ConfigRead)
def update_source(id: int, data: ConfigBase, db: Session = Depends(get_db), _=Depends(require_permission("config", "update")), tenant_id: int = Depends(get_tenant_id)):
    obj = config_service.update_config(db, SourceConfig, id, data, tenant_id=tenant_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy")
    return obj

@router.delete("/sources/{id}")
def delete_source(id: int, db: Session = Depends(get_db), _=Depends(require_permission("config", "delete")), tenant_id: int = Depends(get_tenant_id)):
    if not config_service.soft_delete_config(db, SourceConfig, id, tenant_id=tenant_id):
        raise HTTPException(status_code=404, detail="Không tìm thấy")
    return {"status": "success"}


# ── Statuses ──────────────────────────────────────────────────────────────────

@router.get("/statuses", response_model=List[ConfigRead])
def list_statuses(db: Session = Depends(get_db), _=Depends(get_current_user), tenant_id: int = Depends(get_tenant_id)):
    return config_service.get_statuses(db, tenant_id=tenant_id)

@router.post("/statuses", response_model=ConfigRead)
def create_status(data: ConfigBase, db: Session = Depends(get_db), _=Depends(require_permission("config", "create")), tenant_id: int = Depends(get_tenant_id)):
    return config_service.create_status(db, data, tenant_id=tenant_id)

@router.put("/statuses/{id}", response_model=ConfigRead)
def update_status(id: int, data: ConfigBase, db: Session = Depends(get_db), _=Depends(require_permission("config", "update")), tenant_id: int = Depends(get_tenant_id)):
    obj = config_service.update_config(db, StatusConfig, id, data, tenant_id=tenant_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy")
    return obj

@router.delete("/statuses/{id}")
def delete_status(id: int, db: Session = Depends(get_db), _=Depends(require_permission("config", "delete")), tenant_id: int = Depends(get_tenant_id)):
    if not config_service.soft_delete_config(db, StatusConfig, id, tenant_id=tenant_id):
        raise HTTPException(status_code=404, detail="Không tìm thấy")
    return {"status": "success"}
