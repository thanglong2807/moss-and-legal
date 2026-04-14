from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.core.database import get_db
from app.services.admin_unit_service import admin_unit_service

router = APIRouter()

class AdminUnitRead(BaseModel):
    id: int
    code: str
    name: str
    division_type: str
    parent_id: Optional[int] = None

    class Config:
        from_attributes = True

@router.get("/provinces", response_model=List[AdminUnitRead])
def list_provinces(db: Session = Depends(get_db)):
    return admin_unit_service.get_provinces(db)

@router.get("/{id}/children", response_model=List[AdminUnitRead])
def list_children(id: int, db: Session = Depends(get_db)):
    return admin_unit_service.get_children(db, id)
