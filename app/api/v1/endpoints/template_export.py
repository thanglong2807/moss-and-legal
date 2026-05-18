from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from io import BytesIO

from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.models.company import Company, CompanyPerson
from app.schemas.template_export import (
    ViettelContractRequest,
    ViettelDocxRequest,
    MergeAllRequest,
)
from app.services.templates.tldn.hopdong_viettel import service as viettel_service
from app.services.templates.tldn.hopdong_viettel.config import VALID_SHEETS
from app.services.templates.tldn.hopdong_viettel import docx_service
from app.services.export.tldn import export_company_docs, get_full_data, process_data
from app.services.export.base import merge_docx_files

router = APIRouter()


@router.post("/viettel-contract/{sheet_name}", dependencies=[Depends(get_current_user)])
def export_viettel_contract(
    sheet_name: str,
    body: ViettelContractRequest,
    db: Session = Depends(get_db),
):
    if sheet_name not in VALID_SHEETS:
        raise HTTPException(status_code=400, detail=f"Sheet '{sheet_name}' không hợp lệ. Hợp lệ: {VALID_SHEETS}")

    company = db.get(Company, body.company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Không tìm thấy doanh nghiệp")

    rep = db.query(CompanyPerson).filter(
        CompanyPerson.company_id == body.company_id,
        CompanyPerson.person_type == "representative",
    ).first()

    address_parts = []
    if company.street:
        address_parts.append(company.street)
    if company.ward:
        address_parts.append(company.ward.name)
    if company.province:
        address_parts.append(company.province.name)
    address = ", ".join(filter(None, address_parts))

    data = {
        "company_name":          company.company_full_name or "",
        "company_tax_code":      company.tax_code or "",
        "company_biz_reg_date":  company.approval_date or "",
        "company_address":       address,
        "rep_name":              rep.full_name if rep else "",
        "rep_title":             rep.position.name if rep and rep.position else "",
        "company_phone":         company.phone or "",
        "company_email":         company.email or "",
        "rep_id_number":         rep.id_number if rep else "",
        "rep_id_date":           body.rep_id_date or "",
        "rep_id_place":          body.rep_id_place or "",
        "contract_reg_date":     company.registration_date or "",
        "company_biz_reg_place": body.company_biz_reg_place or "",
    }

    try:
        pdf_bytes = viettel_service.export_viettel_contract(sheet_name, data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xuất PDF: {e}")

    filename = f"HopDong_Viettel_{sheet_name}_{company.code}.pdf"
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/viettel-docx/{file_key}", dependencies=[Depends(get_current_user)])
async def export_viettel_docx(
    file_key: str,
    body: ViettelDocxRequest,
    db: Session = Depends(get_db),
):
    if file_key not in docx_service.VALID_KEYS:
        raise HTTPException(status_code=400, detail=f"File key '{file_key}' không hợp lệ. Hợp lệ: {docx_service.VALID_KEYS}")

    try:
        raw = get_full_data(db, body.company_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

    data = process_data(raw)
    data["rep_place"] = body.rep_place or ""
    data["rep_date"] = body.rep_date or ""
    company_code = raw.get("code", str(body.company_id))

    try:
        docx_bytes, _ = await docx_service.render_viettel_docx(file_key, data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xuất docx: {e}")

    filename = f"HopDong_Viettel_{file_key}_{company_code}.docx"
    return StreamingResponse(
        BytesIO(docx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{filename}"},
    )


@router.post("/merge-all", dependencies=[Depends(get_current_user)])
async def export_merge_all(
    body: MergeAllRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    invalid = [k for k in body.viettel.ids if k not in docx_service.VALID_KEYS]
    if invalid:
        raise HTTPException(status_code=400, detail=f"Viettel key không hợp lệ: {invalid}")

    try:
        raw = get_full_data(db, body.company_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

    viettel_data = process_data(raw)
    viettel_data["rep_place"] = body.viettel.data.rep_place or ""
    viettel_data["rep_date"] = body.viettel.data.rep_date or ""
    company_code = raw.get("code", str(body.company_id))

    tldn_ids = body.moss_legal.ids if body.moss_legal else []

    all_bytes: list[bytes] = []

    try:
        for tid in tldn_ids:
            b, _ = await export_company_docs(db, body.company_id, [tid], current_user, is_merge=False)
            all_bytes.append(b)

        for key in body.viettel.ids:
            b, _ = await docx_service.render_viettel_docx(key, viettel_data)
            all_bytes.append(b)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi render: {e}")

    if not all_bytes:
        raise HTTPException(status_code=400, detail="Không có file nào được chọn")

    try:
        merged = merge_docx_files(all_bytes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi gộp file: {e}")

    filename = f"HoSo_TLDN_{company_code}.docx"
    return StreamingResponse(
        BytesIO(merged),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{filename}"},
    )
