from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.customer import StaffConfig, SourceConfig, StatusConfig
from app.schemas.customer import ConfigBase


class ConfigService:
    # ── Staff ─────────────────────────────────────────────────────────────────

    def get_staff(self, db: Session, tenant_id: int = None):
        q = select(StaffConfig).where(StaffConfig.deleted_at == None)
        if tenant_id is not None:
            q = q.where(StaffConfig.tenant_id == tenant_id)
        return db.execute(q).scalars().all()

    def create_staff(self, db: Session, obj_in: ConfigBase, tenant_id: int = None):
        db_obj = StaffConfig(**obj_in.dict())
        if tenant_id is not None:
            db_obj.tenant_id = tenant_id
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    # ── Sources ───────────────────────────────────────────────────────────────

    def get_sources(self, db: Session, tenant_id: int = None):
        q = select(SourceConfig).where(SourceConfig.deleted_at == None)
        if tenant_id is not None:
            q = q.where(SourceConfig.tenant_id == tenant_id)
        return db.execute(q).scalars().all()

    def create_source(self, db: Session, obj_in: ConfigBase, tenant_id: int = None):
        db_obj = SourceConfig(**obj_in.dict())
        if tenant_id is not None:
            db_obj.tenant_id = tenant_id
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    # ── Statuses ──────────────────────────────────────────────────────────────

    def get_statuses(self, db: Session, tenant_id: int = None):
        q = select(StatusConfig).where(StatusConfig.deleted_at == None)
        if tenant_id is not None:
            q = q.where(StatusConfig.tenant_id == tenant_id)
        return db.execute(q).scalars().all()

    def create_status(self, db: Session, obj_in: ConfigBase, tenant_id: int = None):
        db_obj = StatusConfig(**obj_in.dict())
        if tenant_id is not None:
            db_obj.tenant_id = tenant_id
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    # ── Get-or-create helpers (used by webhook processor) ────────────────────

    def _get_or_create(self, db: Session, model, name: str):
        """Find by name (case-insensitive, stripped) or create with empty crm_id."""
        name = (name or "").strip()
        if not name:
            return None
        existing = db.execute(
            select(model).where(model.deleted_at == None)
        ).scalars().all()
        for obj in existing:
            if (obj.name or "").strip().lower() == name.lower():
                return obj
        new_obj = model(name=name, crm_id=None)
        db.add(new_obj)
        db.flush()
        return new_obj

    def get_or_create_source(self, db: Session, name: str) -> SourceConfig:
        return self._get_or_create(db, SourceConfig, name)

    def get_or_create_staff(self, db: Session, name: str) -> StaffConfig:
        return self._get_or_create(db, StaffConfig, name)

    def get_or_create_status(self, db: Session, name: str) -> StatusConfig:
        return self._get_or_create(db, StatusConfig, name)

    # ── Generic update & soft-delete ─────────────────────────────────────────

    def update_config(self, db: Session, model, id: int, obj_in: ConfigBase, tenant_id: int = None):
        q = db.query(model).filter(model.id == id, model.deleted_at == None)
        if tenant_id is not None:
            q = q.filter(model.tenant_id == tenant_id)
        db_obj = q.first()
        if not db_obj:
            return None
        for field, value in obj_in.dict().items():
            setattr(db_obj, field, value)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def soft_delete_config(self, db: Session, model, id: int, tenant_id: int = None) -> bool:
        q = db.query(model).filter(model.id == id, model.deleted_at == None)
        if tenant_id is not None:
            q = q.filter(model.tenant_id == tenant_id)
        db_obj = q.first()
        if not db_obj:
            return False
        db_obj.deleted_at = datetime.utcnow()
        db.commit()
        return True


config_service = ConfigService()
