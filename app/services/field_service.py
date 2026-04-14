from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select
from app.models.master_data import Field, FieldIndustry, Industry
from app.schemas.master_data import FieldBase

class FieldService:
    def get_list(self, db: Session):
        stmt = select(Field).options(joinedload(Field.industries).joinedload(FieldIndustry.industry))
        return db.execute(stmt).scalars().unique().all()

    def create(self, db: Session, name: str):
        db_obj = Field(name=name)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def add_industry_to_field(self, db: Session, field_id: int, industry_code: str, note: str = None):
        from fastapi import HTTPException
        industry = db.execute(select(Industry).where(Industry.code == industry_code)).scalars().first()
        if not industry:
            raise HTTPException(status_code=404, detail=f"Industry code '{industry_code}' not found")
        link = FieldIndustry(field_id=field_id, industry_id=industry.id, note=note)
        db.add(link)
        db.commit()
        return link

    def remove_industry_from_field(self, db: Session, field_id: int, industry_code: str):
        from sqlalchemy import delete
        industry = db.execute(select(Industry).where(Industry.code == industry_code)).scalars().first()
        if not industry:
            return True
        stmt = delete(FieldIndustry).where(
            FieldIndustry.field_id == field_id,
            FieldIndustry.industry_id == industry.id
        )
        db.execute(stmt)
        db.commit()
        return True

field_service = FieldService()
