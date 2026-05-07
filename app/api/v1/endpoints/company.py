from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.core.database import get_db
from app.schemas.company import CompanyCreate, CompanyUpdate, CompanyRead, CompanyPositionRead, TranslateNameRequest
from app.schemas.document import DocumentRead
from app.services.company_service import company_service
from app.services import company_document_service
from app.models.company import CompanyPosition
from app.auth.dependencies import require_permission, get_current_user
from sqlalchemy import select

router = APIRouter()





@router.post("/translate-name", dependencies=[Depends(get_current_user)])
def translate_company_name(body: TranslateNameRequest):
    try:
        result = company_service.translate(body.name, body.company_type)
        if not result:
            raise HTTPException(status_code=500, detail=f"Lỗi khi dịch, chắc là hết tiền")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi dịch: {e}")
    return {"result": result }

@router.get("/positions", response_model=List[CompanyPositionRead], dependencies=[Depends(get_current_user)])
def list_positions(company_type: Optional[int] = None, db: Session = Depends(get_db)):
    stmt = select(CompanyPosition)
    if company_type == 1:
        stmt = stmt.where(CompanyPosition.is_llc1 == True)
    elif company_type == 2:
        stmt = stmt.where(CompanyPosition.is_llc2 == True)
    elif company_type == 3:
        stmt = stmt.where(CompanyPosition.is_jsc == True)
    return db.execute(stmt).scalars().all()


@router.get("/", dependencies=[Depends(require_permission("company", "view"))])
def list_companies(
    skip: int = 0, limit: int = 20, customer_id: Optional[int] = None,
    search: Optional[str] = None, staff_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    return company_service.get_list(db, skip=skip, limit=limit, customer_id=customer_id,
                                    search=search, staff_id=staff_id)


@router.post("/", response_model=CompanyRead, dependencies=[Depends(require_permission("company", "create"))])
def create_company(data: CompanyCreate, db: Session = Depends(get_db)):
    return company_service.create(db, data)


@router.get("/{company_id}", response_model=CompanyRead, dependencies=[Depends(require_permission("company", "view"))])
def get_company(company_id: int, db: Session = Depends(get_db)):
    obj = company_service.get_by_id(db, company_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Company not found")
    return obj


@router.put("/{company_id}", response_model=CompanyRead, dependencies=[Depends(require_permission("company", "update"))])
def update_company(company_id: int, data: CompanyUpdate, db: Session = Depends(get_db)):
    obj = company_service.update(db, company_id, data)
    if not obj:
        raise HTTPException(status_code=404, detail="Company not found")
    return obj


@router.delete("/{company_id}", dependencies=[Depends(require_permission("company", "delete"))])
def delete_company(company_id: int, db: Session = Depends(get_db)):
    if not company_service.delete(db, company_id):
        raise HTTPException(status_code=404, detail="Company not found")
    return {"status": "success"}


class ExportRequest(BaseModel):
    template_ids: list[str]
    is_merge: bool = False


@router.post("/{company_id}/export")
async def export_company(company_id: int, body: ExportRequest, db: Session = Depends(get_db),
                         current_user=Depends(require_permission("company", "view"))):
    from app.services.export.tldn import export_company_docs
    from app.auth.models import User as UserModel
    from sqlalchemy.orm import joinedload
    # Reload user on the current session so all columns (incl. birth_date) are accessible
    fresh_user = db.execute(
        select(UserModel).options(joinedload(UserModel.manager)).where(UserModel.id == current_user.id)
    ).scalars().first()
    file_bytes, filename = await export_company_docs(db, company_id, body.template_ids, fresh_user, is_merge=body.is_merge)
    from urllib.parse import quote
    media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document" \
        if filename.endswith(".docx") else "application/zip"
    encoded = quote(filename, safe="")
    disposition = f"attachment; filename*=UTF-8''{encoded}"
    return Response(content=file_bytes, media_type=media_type,
                    headers={"Content-Disposition": disposition})


@router.get("/labels/{company_type}", dependencies=[Depends(get_current_user)])
def get_labels(company_type: int):
    """Return upload label map for a given company type (1/2/3)."""
    return company_document_service.get_labels_for_type(company_type)


@router.get("/{company_id}/documents", response_model=List[DocumentRead], dependencies=[Depends(require_permission("company", "view"))])
def list_company_documents(company_id: int, db: Session = Depends(get_db)):
    return company_document_service.list_documents(db, company_id)


@router.post("/{company_id}/create-folder", dependencies=[Depends(require_permission("company", "update"))])
async def create_drive_folder(company_id: int, db: Session = Depends(get_db)):
    folder_id = await company_document_service.create_folder(db, company_id)
    return {"folder_id": folder_id}


@router.post("/{company_id}/upload", response_model=DocumentRead, dependencies=[Depends(require_permission("company", "update"))])
async def upload_drive_file(
    company_id: int,
    label: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    file_bytes = await file.read()
    return await company_document_service.upload_document(db, company_id, label, file_bytes, file.filename)


@router.delete("/documents/{doc_id}", dependencies=[Depends(require_permission("company", "update"))])
async def delete_company_document(doc_id: int, db: Session = Depends(get_db)):
    await company_document_service.delete_document(db, doc_id)
    return {"status": "success"}


def _build_gov_payload(company) -> dict:
    """Chuyển Company model → dict payload cho GOV_internal biz_register."""

    def _addr(province_obj, ward_obj, street):
        return {
            "country": "Việt Nam",
            "province": (province_obj.name if province_obj else "").replace("Tỉnh ", "").replace("Thành phố ", "").strip(),
            "ward": ward_obj.name if ward_obj else "",
            "street": street or "",
        }

    def _person_base(p):
        return {
            "personal_info": {
                "full_name": p.full_name or "",
                "gender": p.gender if p.gender is not None else 0,
                "birth_date": p.birth_date.strftime("%d/%m/%Y") if p.birth_date else "",
                "id_number": p.id_number or "",
            },
            "contact_address": _addr(p.province, p.ward, p.street),
            "contact_info": {"phone": p.phone or "", "fax": p.fax or "", "email": p.email or "", "website": ""},
        }

    def _capital_contribution(p):
        return {
            "ownership_percentage": int(p.ownership_percentage or 0),
            "asset_type_ratio": int(p.asset_type_ratio or 0),
        }

    comp_info = company.company_info or {}
    charter_capital = company.charter_capital or 0

    industries = [
        {"code": ind["code"], "is_main": ind.get("is_main", False), "note": ind.get("note", "")}
        for ind in (company.industries or [])
    ]

    company_info_payload = {
        "name": {
            "full": company.company_full_name or "",
            "foreign": company.company_foreign_name or "",
            "short": company.company_short_name or "",
        },
        "address": _addr(company.province, company.ward, company.street),
        "contact": {
            "phone": company.phone or "",
            "fax": company.fax or "",
            "email": company.email or "",
            "website": company.website or "",
        },
    }

    charter_capital_payload = {"info": {"amount": charter_capital, "text": ""}}

    tax_payload = {
        "accounting": {
            "full_name": company.accounting_name or "",
            "phone": company.accounting_phone or "",
        }
    }

    persons = company.persons or []
    representatives = [
        {**_person_base(p), "position": {"value": p.position_id or 0, "text": p.position.name if p.position else ""}}
        for p in persons if p.person_type == "representative"
    ]

    base = {
        "company_type": company.company_type,
        "company_info": company_info_payload,
        "charter_capital": charter_capital_payload,
        "tax": tax_payload,
        "representatives": representatives,
        "industries": industries,
    }

    if company.company_type == 1:  # LLC1
        owners = [p for p in persons if p.person_type == "owner"]
        owner = owners[0] if owners else None
        base["owner"] = {
            **({"type": 1, **_person_base(owner), "capital_contribution": _capital_contribution(owner)} if owner else {}),
        }
    elif company.company_type == 2:  # LLC2
        base["members"] = [
            {"type": 1, **_person_base(p), "capital_contribution": _capital_contribution(p)}
            for p in persons if p.person_type == "member"
        ]
    elif company.company_type == 3:  # JSC
        base["founders"] = [
            {"type": 1, **_person_base(p), "capital_contribution": _capital_contribution(p)}
            for p in persons if p.person_type == "founder"
        ]

    return base
