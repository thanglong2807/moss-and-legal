from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from sqlalchemy import select
from app.core.database import get_db
from app.schemas.master_data import IndustryBase
from app.models.master_data import Field, FieldIndustry, Industry, AdministrativeUnit
from app.schemas.master_data import FieldBase, FieldWithIndustries
from app.services.field_service import field_service
from app.auth.dependencies import require_permission, get_current_user

router = APIRouter()

@router.get("/", response_model=List[FieldWithIndustries], dependencies=[Depends(get_current_user)])
def list_fields(db: Session = Depends(get_db)):
    return field_service.get_list(db)

@router.post("/", response_model=FieldWithIndustries, dependencies=[Depends(require_permission("fields", "create"))])
def create_field(data: FieldBase, db: Session = Depends(get_db)):
    return field_service.create(db, data.name)

@router.put("/{field_id}", dependencies=[Depends(require_permission("fields", "update"))])
def update_field(field_id: int, data: FieldBase, db: Session = Depends(get_db)):
    stmt = select(Field).where(Field.id == field_id)
    db_obj = db.execute(stmt).scalars().first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Field not found")
    db_obj.name = data.name
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.delete("/{field_id}", dependencies=[Depends(require_permission("fields", "delete"))])
def delete_field(field_id: int, db: Session = Depends(get_db)):
    stmt = select(Field).where(Field.id == field_id)
    db_obj = db.execute(stmt).scalars().first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Field not found")
    db.delete(db_obj)
    db.commit()
    return {"status": "success"}

@router.post("/{field_id}/industries/", dependencies=[Depends(require_permission("fields", "update"))])
def link_industry(field_id: int, industry_code: str, note: str = None, db: Session = Depends(get_db)):
    return field_service.add_industry_to_field(db, field_id, industry_code, note)

@router.patch("/{field_id}/industries/", dependencies=[Depends(require_permission("fields", "update"))])
def update_industry_note(field_id: int, industry_code: str, note: str = None, db: Session = Depends(get_db)):
    from sqlalchemy import update as sql_update
    industry = db.execute(select(Industry).where(Industry.code == industry_code)).scalars().first()
    if not industry:
        raise HTTPException(status_code=404, detail="Industry not found")
    stmt = sql_update(FieldIndustry).where(
        FieldIndustry.field_id == field_id,
        FieldIndustry.industry_id == industry.id
    ).values(note=note)
    db.execute(stmt)
    db.commit()
    return {"status": "success"}

@router.delete("/{field_id}/industries/", dependencies=[Depends(require_permission("fields", "update"))])
def unlink_industry(field_id: int, industry_code: str, db: Session = Depends(get_db)):
    field_service.remove_industry_from_field(db, field_id, industry_code)
    return {"status": "success"}
