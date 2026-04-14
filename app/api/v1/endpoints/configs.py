from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.schemas.customer import ConfigRead, ConfigBase
from app.services.config_service import config_service
from app.models.customer import StaffConfig, SourceConfig, StatusConfig

router = APIRouter()


# ── Staff ─────────────────────────────────────────────────────────────────────

@router.get("/staff", response_model=List[ConfigRead])
def list_staff(db: Session = Depends(get_db)):
    return config_service.get_staff(db)

@router.post("/staff", response_model=ConfigRead)
def create_staff(data: ConfigBase, db: Session = Depends(get_db)):
    return config_service.create_staff(db, data)

@router.put("/staff/{id}", response_model=ConfigRead)
def update_staff(id: int, data: ConfigBase, db: Session = Depends(get_db)):
    obj = config_service.update_config(db, StaffConfig, id, data)
    if not obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy")
    return obj

@router.delete("/staff/{id}")
def delete_staff(id: int, db: Session = Depends(get_db)):
    if not config_service.soft_delete_config(db, StaffConfig, id):
        raise HTTPException(status_code=404, detail="Không tìm thấy")
    return {"status": "success"}


# ── Sources ───────────────────────────────────────────────────────────────────

@router.get("/sources", response_model=List[ConfigRead])
def list_sources(db: Session = Depends(get_db)):
    return config_service.get_sources(db)

@router.post("/sources", response_model=ConfigRead)
def create_source(data: ConfigBase, db: Session = Depends(get_db)):
    return config_service.create_source(db, data)

@router.put("/sources/{id}", response_model=ConfigRead)
def update_source(id: int, data: ConfigBase, db: Session = Depends(get_db)):
    obj = config_service.update_config(db, SourceConfig, id, data)
    if not obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy")
    return obj

@router.delete("/sources/{id}")
def delete_source(id: int, db: Session = Depends(get_db)):
    if not config_service.soft_delete_config(db, SourceConfig, id):
        raise HTTPException(status_code=404, detail="Không tìm thấy")
    return {"status": "success"}


# ── Statuses ──────────────────────────────────────────────────────────────────

@router.get("/statuses", response_model=List[ConfigRead])
def list_statuses(db: Session = Depends(get_db)):
    return config_service.get_statuses(db)

@router.post("/statuses", response_model=ConfigRead)
def create_status(data: ConfigBase, db: Session = Depends(get_db)):
    return config_service.create_status(db, data)

@router.put("/statuses/{id}", response_model=ConfigRead)
def update_status(id: int, data: ConfigBase, db: Session = Depends(get_db)):
    obj = config_service.update_config(db, StatusConfig, id, data)
    if not obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy")
    return obj

@router.delete("/statuses/{id}")
def delete_status(id: int, db: Session = Depends(get_db)):
    if not config_service.soft_delete_config(db, StatusConfig, id):
        raise HTTPException(status_code=404, detail="Không tìm thấy")
    return {"status": "success"}
