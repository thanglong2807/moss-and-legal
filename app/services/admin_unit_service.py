from sqlalchemy.orm import Session
from app.models.master_data import AdministrativeUnit
from sqlalchemy import select

class AdminUnitService:
    @staticmethod
    def get_or_create_by_name(db: Session, name: str, division_type: str, parent_id: int = None):
        if not name:
            return None
        stmt = select(AdministrativeUnit).where(
            AdministrativeUnit.name == name,
            AdministrativeUnit.division_type == division_type
        )
        unit = db.execute(stmt).scalars().first()
        if not unit:
            unit = AdministrativeUnit(
                name=name,
                division_type=division_type,
                parent_id=parent_id
            )
            db.add(unit)
            db.flush() # Flush to get the ID back without committing the whole transaction
        return unit

    def get_provinces(self, db: Session):
        stmt = select(AdministrativeUnit).where(AdministrativeUnit.division_type == 'PROVINCE')
        return db.execute(stmt).scalars().all()

    def get_children(self, db: Session, parent_id: int):
        stmt = select(AdministrativeUnit).where(AdministrativeUnit.parent_id == parent_id)
        return db.execute(stmt).scalars().all()

admin_unit_service = AdminUnitService()
