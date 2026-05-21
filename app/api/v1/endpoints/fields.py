from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from sqlalchemy import select, update as sql_update
from app.core.database import get_db
from app.schemas.master_data import IndustryBase
from app.models.master_data import Field, FieldIndustry, Industry, AdministrativeUnit
from app.schemas.master_data import FieldBase, FieldWithIndustries
from app.services.field_service import field_service
from app.auth.dependencies import require_permission, get_current_user

router = APIRouter()


def _get_tenant_id(current_user=Depends(get_current_user)) -> int | None:
    """Trả về tenant_id của user hiện tại. SuperAdmin = None (nhưng thực tế SA không dùng module này)."""
    return current_user.tenant_id if not current_user.is_super_admin else None


@router.get("/", response_model=List[FieldWithIndustries])
def list_fields(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    tenant_id = current_user.tenant_id if not current_user.is_super_admin else None
    return field_service.get_list(db, tenant_id=tenant_id)


@router.post("/", response_model=FieldWithIndustries)
def create_field(
    data: FieldBase,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("fields", "create")),
):
    tenant_id = current_user.tenant_id if not current_user.is_super_admin else None
    return field_service.create(db, data.name, tenant_id=tenant_id)


@router.put("/{field_id}")
def update_field(
    field_id: int,
    data: FieldBase,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("fields", "update")),
):
    tenant_id = current_user.tenant_id if not current_user.is_super_admin else None
    stmt = select(Field).where(Field.id == field_id)
    if tenant_id is not None:
        stmt = stmt.where(Field.tenant_id == tenant_id)
    db_obj = db.execute(stmt).scalars().first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy lĩnh vực")
    db_obj.name = data.name
    db.commit()
    db.refresh(db_obj)
    return db_obj


@router.delete("/{field_id}")
def delete_field(
    field_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("fields", "delete")),
):
    tenant_id = current_user.tenant_id if not current_user.is_super_admin else None
    stmt = select(Field).where(Field.id == field_id)
    if tenant_id is not None:
        stmt = stmt.where(Field.tenant_id == tenant_id)
    db_obj = db.execute(stmt).scalars().first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy lĩnh vực")
    db.delete(db_obj)
    db.commit()
    return {"status": "success"}


@router.post("/{field_id}/industries/")
def link_industry(
    field_id: int,
    industry_code: str,
    note: str = None,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("fields", "update")),
):
    tenant_id = current_user.tenant_id if not current_user.is_super_admin else None
    return field_service.add_industry_to_field(db, field_id, industry_code, note, tenant_id=tenant_id)


@router.patch("/{field_id}/industries/")
def update_industry_note(
    field_id: int,
    industry_code: str,
    note: str = None,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("fields", "update")),
):
    tenant_id = current_user.tenant_id if not current_user.is_super_admin else None
    industry = db.execute(select(Industry).where(Industry.code == industry_code)).scalars().first()
    if not industry:
        raise HTTPException(status_code=404, detail="Industry not found")
    # Verify field belongs to tenant
    if tenant_id is not None:
        field = db.execute(
            select(Field).where(Field.id == field_id, Field.tenant_id == tenant_id)
        ).scalars().first()
        if not field:
            raise HTTPException(status_code=404, detail="Không tìm thấy lĩnh vực trong tenant này")
    stmt = sql_update(FieldIndustry).where(
        FieldIndustry.field_id == field_id,
        FieldIndustry.industry_id == industry.id
    ).values(note=note)
    db.execute(stmt)
    db.commit()
    return {"status": "success"}


@router.delete("/{field_id}/industries/")
def unlink_industry(
    field_id: int,
    industry_code: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("fields", "update")),
):
    tenant_id = current_user.tenant_id if not current_user.is_super_admin else None
    field_service.remove_industry_from_field(db, field_id, industry_code, tenant_id=tenant_id)
    return {"status": "success"}
