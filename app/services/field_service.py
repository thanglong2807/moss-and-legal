from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select
from app.models.master_data import Field, FieldIndustry, Industry
from app.schemas.master_data import FieldBase


class FieldService:
    def get_list(self, db: Session, tenant_id: int = None):
        stmt = select(Field).options(
            joinedload(Field.industries).joinedload(FieldIndustry.industry)
        )
        if tenant_id is not None:
            stmt = stmt.where(Field.tenant_id == tenant_id)
        return db.execute(stmt).scalars().unique().all()

    def create(self, db: Session, name: str, tenant_id: int = None):
        db_obj = Field(name=name, tenant_id=tenant_id)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def add_industry_to_field(self, db: Session, field_id: int, industry_code: str, note: str = None, tenant_id: int = None):
        from fastapi import HTTPException
        industry = db.execute(select(Industry).where(Industry.code == industry_code)).scalars().first()
        if not industry:
            raise HTTPException(status_code=404, detail=f"Industry code '{industry_code}' not found")
        # Verify field belongs to tenant
        if tenant_id is not None:
            field = db.execute(
                select(Field).where(Field.id == field_id, Field.tenant_id == tenant_id)
            ).scalars().first()
            if not field:
                raise HTTPException(status_code=404, detail="Không tìm thấy lĩnh vực trong tenant này")
        link = FieldIndustry(field_id=field_id, industry_id=industry.id, note=note)
        db.add(link)
        db.commit()
        return link

    def remove_industry_from_field(self, db: Session, field_id: int, industry_code: str, tenant_id: int = None):
        from sqlalchemy import delete
        from fastapi import HTTPException
        industry = db.execute(select(Industry).where(Industry.code == industry_code)).scalars().first()
        if not industry:
            return True
        # Verify field belongs to tenant
        if tenant_id is not None:
            field = db.execute(
                select(Field).where(Field.id == field_id, Field.tenant_id == tenant_id)
            ).scalars().first()
            if not field:
                raise HTTPException(status_code=404, detail="Không tìm thấy lĩnh vực trong tenant này")
        stmt = delete(FieldIndustry).where(
            FieldIndustry.field_id == field_id,
            FieldIndustry.industry_id == industry.id
        )
        db.execute(stmt)
        db.commit()
        return True


field_service = FieldService()
