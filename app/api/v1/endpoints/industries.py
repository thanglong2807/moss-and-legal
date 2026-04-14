from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.schemas.master_data import IndustryBase
from app.services.industry_service import industry_service

router = APIRouter()

@router.get("/", response_model=List[IndustryBase])
def list_industries(db: Session = Depends(get_db)):
    return industry_service.get_all(db)

@router.post("/", response_model=IndustryBase)
def create_industry(data: IndustryBase, db: Session = Depends(get_db)):
    return industry_service.create(db, data)

@router.put("/{industry_id}", response_model=IndustryBase)
def update_industry(industry_id: int, data: IndustryBase, db: Session = Depends(get_db)):
    item = industry_service.update(db, industry_id, data)
    if not item:
        raise HTTPException(status_code=404, detail="Industry not found")
    return item

@router.delete("/{industry_id}")
def delete_industry(industry_id: int, db: Session = Depends(get_db)):
    success = industry_service.delete(db, industry_id)
    if not success:
        raise HTTPException(status_code=404, detail="Industry not found")
    return {"status": "success"}
