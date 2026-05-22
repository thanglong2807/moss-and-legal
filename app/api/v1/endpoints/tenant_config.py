"""
Tenant configuration endpoints:
  /tenant/profile          — GET / PUT thông tin công ty luật
  /tenant/document-types   — CRUD + upload template file
"""
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.auth.dependencies import get_current_user, get_tenant_id

from app.models.tenant_config import TenantProfile, TenantDocumentType

router = APIRouter()

# Thư mục lưu template upload của từng tenant
UPLOAD_BASE = Path(__file__).parent.parent.parent.parent / "data" / "tenant_templates"
UPLOAD_BASE.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".docx", ".doc"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


# ── Schemas ───────────────────────────────────────────────────────────────────

class ProfileIn(BaseModel):
    company_full_name:        Optional[str] = None
    company_short_name:       Optional[str] = None
    tax_code:                 Optional[str] = None
    address:                  Optional[str] = None
    province:                 Optional[str] = None
    phone:                    Optional[str] = None
    email:                    Optional[str] = None
    website:                  Optional[str] = None
    representative_name:      Optional[str] = None
    representative_title:     Optional[str] = None
    representative_id_number: Optional[str] = None
    representative_id_date:   Optional[str] = None
    representative_id_place:  Optional[str] = None
    business_reg_number:      Optional[str] = None
    business_reg_date:        Optional[str] = None
    business_reg_place:       Optional[str] = None
    bank_name:                Optional[str] = None
    bank_account:             Optional[str] = None
    seal_text:                Optional[str] = None


VALID_CATS = ("hkd", "company", "tldn_1", "tldn_2", "tldn_3")


def _parse_categories(raw) -> list:
    """Normalize input to a list of valid category strings."""
    if isinstance(raw, list):
        return [c for c in raw if c in VALID_CATS]
    if isinstance(raw, str):
        return [c for c in raw.split(",") if c in VALID_CATS]
    return ["hkd"]


def _cats_to_str(cats: list) -> str:
    return ",".join(c for c in cats if c in VALID_CATS) or "hkd"


class DocTypeIn(BaseModel):
    name:        str
    description: Optional[str] = None
    # Accept either a list or a comma-separated string
    categories:  list = ["hkd"]
    sort_order:  int = 0
    is_active:   bool = True


class DocTypeUpdate(BaseModel):
    name:        Optional[str] = None
    description: Optional[str] = None
    categories:  Optional[list] = None
    sort_order:  Optional[int] = None
    is_active:   Optional[bool] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _profile_dict(p: TenantProfile) -> dict:
    return {
        "id":                       p.id,
        "tenant_id":                p.tenant_id,
        "company_full_name":        p.company_full_name,
        "company_short_name":       p.company_short_name,
        "tax_code":                 p.tax_code,
        "address":                  p.address,
        "province":                 p.province,
        "phone":                    p.phone,
        "email":                    p.email,
        "website":                  p.website,
        "representative_name":      p.representative_name,
        "representative_title":     p.representative_title,
        "representative_id_number": p.representative_id_number,
        "representative_id_date":   p.representative_id_date,
        "representative_id_place":  p.representative_id_place,
        "business_reg_number":      p.business_reg_number,
        "business_reg_date":        p.business_reg_date,
        "business_reg_place":       p.business_reg_place,
        "bank_name":                p.bank_name,
        "bank_account":             p.bank_account,
        "seal_text":                p.seal_text,
        "updated_at":               p.updated_at.isoformat() if p.updated_at else None,
    }


def _doctype_dict(d: TenantDocumentType) -> dict:
    raw_cat = d.category or "hkd"
    cats = [c for c in raw_cat.split(",") if c]
    return {
        "id":                d.id,
        "tenant_id":         d.tenant_id,
        "name":              d.name,
        "description":       d.description,
        "category":          raw_cat,         # backward compat
        "categories":        cats,            # new: list of categories
        "template_key":      d.template_key,
        "has_template":      bool(d.template_path),
        "original_filename": d.original_filename,
        "is_active":         d.is_active,
        "sort_order":        d.sort_order,
        "created_at":        d.created_at.isoformat() if d.created_at else None,
    }


# ── Tenant Profile ────────────────────────────────────────────────────────────

@router.get("/profile")
def get_profile(
    tenant_id: int = Depends(get_tenant_id),
    db: Session = Depends(get_db),
):
    """Lấy thông tin công ty / văn phòng của tenant."""
    profile = db.execute(
        select(TenantProfile).where(TenantProfile.tenant_id == tenant_id)
    ).scalars().first()
    if not profile:
        # Trả về profile rỗng nếu chưa có
        return {
            "tenant_id": tenant_id,
            "company_full_name": None, "company_short_name": None,
            "tax_code": None, "address": None, "province": None,
            "phone": None, "email": None, "website": None,
            "representative_name": None, "representative_title": None,
            "representative_id_number": None, "representative_id_date": None,
            "representative_id_place": None, "business_reg_number": None,
            "business_reg_date": None, "business_reg_place": None,
            "bank_name": None, "bank_account": None, "seal_text": None,
            "updated_at": None,
        }
    return _profile_dict(profile)


@router.put("/profile")
def upsert_profile(
    body: ProfileIn,
    tenant_id: int = Depends(get_tenant_id),
    db: Session = Depends(get_db),
):
    """Tạo hoặc cập nhật thông tin công ty của tenant."""
    profile = db.execute(
        select(TenantProfile).where(TenantProfile.tenant_id == tenant_id)
    ).scalars().first()

    data = body.model_dump(exclude_unset=True)

    if profile is None:
        profile = TenantProfile(tenant_id=tenant_id, **data)
        db.add(profile)
    else:
        for k, v in data.items():
            setattr(profile, k, v)
        profile.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(profile)
    return _profile_dict(profile)


# ── Document Types ────────────────────────────────────────────────────────────

@router.get("/document-types")
def list_document_types(
    category: Optional[str] = None,
    tenant_id: int = Depends(get_tenant_id),
    db: Session = Depends(get_db),
):
    """Liệt kê loại hồ sơ của tenant. Nếu có ?category=xxx thì lọc theo loại hình."""
    from sqlalchemy import or_
    q = select(TenantDocumentType).where(
        TenantDocumentType.tenant_id == tenant_id,
        TenantDocumentType.deleted_at.is_(None),
    )
    if category:
        # Match if category appears anywhere in the comma-separated list
        q = q.where(or_(
            TenantDocumentType.category == category,
            TenantDocumentType.category.like(f"{category},%"),
            TenantDocumentType.category.like(f"%,{category},%"),
            TenantDocumentType.category.like(f"%,{category}"),
        ))
    q = q.order_by(TenantDocumentType.sort_order, TenantDocumentType.id)
    items = db.execute(q).scalars().all()
    return {"items": [_doctype_dict(d) for d in items]}


@router.post("/document-types", status_code=201)
def create_document_type(
    body: DocTypeIn,
    tenant_id: int = Depends(get_tenant_id),
    db: Session = Depends(get_db),
):
    """Tạo loại hồ sơ mới (chưa có template file)."""
    cats = _parse_categories(body.categories)
    if not cats:
        raise HTTPException(status_code=400, detail=f"categories phải có ít nhất 1 giá trị trong: {', '.join(VALID_CATS)}")

    # Tạo template_key tự động: t{tenant_id}_{uuid4[:6]}
    key = f"t{tenant_id}_{uuid.uuid4().hex[:6]}"

    dt = TenantDocumentType(
        tenant_id=tenant_id,
        name=body.name,
        description=body.description,
        category=_cats_to_str(cats),
        template_key=key,
        sort_order=body.sort_order,
        is_active=body.is_active,
    )
    db.add(dt)
    db.commit()
    db.refresh(dt)
    return _doctype_dict(dt)


@router.put("/document-types/{doc_type_id}")
def update_document_type(
    doc_type_id: int,
    body: DocTypeUpdate,
    tenant_id: int = Depends(get_tenant_id),
    db: Session = Depends(get_db),
):
    """Cập nhật metadata loại hồ sơ."""
    dt = _get_doc_type(db, doc_type_id, tenant_id)
    data = body.model_dump(exclude_unset=True)
    # Handle categories → convert to comma-separated string
    if "categories" in data:
        cats = _parse_categories(data.pop("categories"))
        if cats:
            dt.category = _cats_to_str(cats)
    for k, v in data.items():
        setattr(dt, k, v)
    dt.updated_at = datetime.utcnow()
    db.commit()
    return _doctype_dict(dt)


@router.delete("/document-types/{doc_type_id}", status_code=204)
def delete_document_type(
    doc_type_id: int,
    tenant_id: int = Depends(get_tenant_id),
    db: Session = Depends(get_db),
):
    """Xóa mềm loại hồ sơ và file template (nếu có)."""
    dt = _get_doc_type(db, doc_type_id, tenant_id)
    # Xóa file vật lý nếu có
    if dt.template_path:
        try:
            Path(dt.template_path).unlink(missing_ok=True)
        except Exception:
            pass
    dt.deleted_at = datetime.utcnow()
    db.commit()


@router.post("/document-types/{doc_type_id}/upload")
async def upload_template(
    doc_type_id: int,
    file: UploadFile = File(...),
    tenant_id: int = Depends(get_tenant_id),
    db: Session = Depends(get_db),
):
    """Upload file .docx template cho loại hồ sơ."""
    dt = _get_doc_type(db, doc_type_id, tenant_id)

    # Validate extension
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Chỉ chấp nhận file .docx hoặc .doc")

    # Validate size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File không được vượt quá 10 MB")

    # Lưu vào thư mục tenant
    tenant_dir = UPLOAD_BASE / str(tenant_id)
    tenant_dir.mkdir(parents=True, exist_ok=True)

    # Xóa file cũ nếu có
    if dt.template_path:
        try:
            Path(dt.template_path).unlink(missing_ok=True)
        except Exception:
            pass

    filename = f"{dt.template_key}_{uuid.uuid4().hex[:8]}{suffix}"
    dest = tenant_dir / filename
    dest.write_bytes(content)

    dt.template_path = str(dest)
    dt.original_filename = file.filename
    dt.updated_at = datetime.utcnow()
    db.commit()

    return {
        "message": "Upload thành công",
        "original_filename": file.filename,
        "size": len(content),
    }


@router.get("/document-types/{doc_type_id}/download")
def download_template(
    doc_type_id: int,
    tenant_id: int = Depends(get_tenant_id),
    db: Session = Depends(get_db),
):
    """Tải về file template."""
    dt = _get_doc_type(db, doc_type_id, tenant_id)
    if not dt.template_path or not Path(dt.template_path).exists():
        raise HTTPException(status_code=404, detail="Chưa có file template cho loại hồ sơ này")
    return FileResponse(
        path=dt.template_path,
        filename=dt.original_filename or f"{dt.template_key}.docx",
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )


# ── Export với tenant profile ─────────────────────────────────────────────────

@router.get("/profile/export-vars")
def get_export_vars(
    tenant_id: int = Depends(get_tenant_id),
    db: Session = Depends(get_db),
):
    """
    Trả về biến mẫu để dùng trong template .docx.
    Các biến này có thể dùng trong template dưới dạng {{ firm_name }}, {{ firm_phone }}...
    """
    profile = db.execute(
        select(TenantProfile).where(TenantProfile.tenant_id == tenant_id)
    ).scalars().first()
    return _build_export_vars(profile)


def _build_export_vars(profile: Optional[TenantProfile]) -> dict:
    """Chuyển TenantProfile thành dict biến dùng trong docxtpl."""
    if not profile:
        return {}
    return {
        "firm_name":           profile.company_full_name or "",
        "firm_name_short":     profile.company_short_name or "",
        "firm_tax_code":       profile.tax_code or "",
        "firm_address":        profile.address or "",
        "firm_province":       profile.province or "",
        "firm_phone":          profile.phone or "",
        "firm_email":          profile.email or "",
        "firm_website":        profile.website or "",
        "firm_rep_name":       profile.representative_name or "",
        "firm_rep_title":      profile.representative_title or "",
        "firm_rep_id":         profile.representative_id_number or "",
        "firm_rep_id_date":    profile.representative_id_date or "",
        "firm_rep_id_place":   profile.representative_id_place or "",
        "firm_biz_reg":        profile.business_reg_number or "",
        "firm_biz_reg_date":   profile.business_reg_date or "",
        "firm_biz_reg_place":  profile.business_reg_place or "",
        "firm_bank_name":      profile.bank_name or "",
        "firm_bank_account":   profile.bank_account or "",
        "firm_seal":           profile.seal_text or "",
    }


# ── Private helper ────────────────────────────────────────────────────────────

def _get_doc_type(db: Session, doc_type_id: int, tenant_id: int) -> TenantDocumentType:
    dt = db.execute(
        select(TenantDocumentType).where(
            TenantDocumentType.id == doc_type_id,
            TenantDocumentType.tenant_id == tenant_id,
            TenantDocumentType.deleted_at.is_(None),
        )
    ).scalars().first()
    if not dt:
        raise HTTPException(status_code=404, detail="Không tìm thấy loại hồ sơ")
    return dt
