from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.master_data import Industry
from app.schemas.master_data import IndustryBase

class IndustryService:
    def get_all(self, db: Session):
        return db.execute(select(Industry)).scalars().all()

    def create(self, db: Session, obj_in: IndustryBase):
        db_obj = Industry(name=obj_in.name, code=obj_in.code)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, industry_id: int, obj_in: IndustryBase):
        stmt = select(Industry).where(Industry.id == industry_id)
        db_obj = db.execute(stmt).scalars().first()
        if db_obj:
            db_obj.name = obj_in.name
            db_obj.code = obj_in.code
            db.commit()
            db.refresh(db_obj)
        return db_obj

    def delete(self, db: Session, industry_id: int):
        stmt = select(Industry).where(Industry.id == industry_id)
        db_obj = db.execute(stmt).scalars().first()
        if db_obj:
            db.delete(db_obj)
            db.commit()
            return True
        return False

industry_service = IndustryService()
