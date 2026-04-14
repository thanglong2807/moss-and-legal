"""
Drive upload endpoints.

POST /drive/hkd/{hkd_id}/upload   — upload one file for an HKD record
GET  /drive/hkd/{hkd_id}          — list documents for an HKD record
DELETE /drive/documents/{doc_id}  — soft-delete document + remove from Drive
"""
from typing import List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.document import Document
from app.models.hkd import BusinessHousehold
from app.schemas.document import DocumentRead
from app.services import drive_service

router = APIRouter()

SERVICE = "hkd"
TABLE_NAME = "business_households"

# Fixed file labels — same order as export menu
DOCUMENT_LABELS = {
    "000": "Hướng dẫn ký",
    "001": "Giấy đề nghị đăng ký HKD",
    "002": "Hợp đồng dịch vụ",
    "003": "Giấy giới thiệu nhận",
    "004": "Giấy giới thiệu nộp",
}


@router.post("/hkd/{hkd_id}/create-folder")
async def create_folder(hkd_id: int, db: Session = Depends(get_db)):
    hkd = db.query(BusinessHousehold).filter(BusinessHousehold.id == hkd_id).first()
    if not hkd:
        raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ HKD")
    if hkd.folder_id:
        return {"folder_id": hkd.folder_id}
    folder_name = f"{hkd.code}_{hkd.company_full_name or hkd_id}"
    try:
        folder_id = await drive_service.ensure_folder(SERVICE, folder_name, None)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    hkd.folder_id = folder_id
    db.commit()
    return {"folder_id": folder_id}


@router.get("/hkd/{hkd_id}", response_model=List[DocumentRead])
def list_documents(hkd_id: int, db: Session = Depends(get_db)):
    return (
        db.query(Document)
        .filter(
            Document.record_id == hkd_id,
            Document.table_name == TABLE_NAME,
            Document.deleted_at == None,
        )
        .all()
    )


@router.post("/hkd/{hkd_id}/upload", response_model=DocumentRead)
async def upload_document(
    hkd_id: int,
    label: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if label not in DOCUMENT_LABELS:
        raise HTTPException(status_code=400, detail=f"Label không hợp lệ: {label}")

    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in ("pdf", "png", "jpg", "jpeg"):
        raise HTTPException(status_code=400, detail="Chỉ chấp nhận PDF hoặc ảnh (png/jpg)")

    hkd = db.query(BusinessHousehold).filter(BusinessHousehold.id == hkd_id).first()
    if not hkd:
        raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ HKD")

    folder_name = f"{hkd.code}_{hkd.company_full_name or hkd_id}"

    try:
        folder_id = await drive_service.ensure_folder(SERVICE, folder_name, hkd.folder_id)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Persist folder_id if newly created
    if not hkd.folder_id:
        hkd.folder_id = folder_id
        db.commit()

    file_bytes = await file.read()
    mime_map = {"pdf": "application/pdf", "png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg"}
    mime_type = mime_map.get(ext, "application/octet-stream")
    display_name = f"{label}_{DOCUMENT_LABELS[label]}.{ext}"

    try:
        drive_file_id, drive_link = await drive_service.upload_file(
            file_bytes, display_name, mime_type, folder_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi upload Drive: {e}")

    doc = Document(
        record_id=hkd_id,
        table_name=TABLE_NAME,
        label=label,
        file_name=display_name,
        drive_link=drive_link,
        drive_file_id=drive_file_id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id, Document.deleted_at == None).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy")

    if doc.drive_file_id:
        try:
            await drive_service.delete_file(doc.drive_file_id)
        except Exception:
            pass  # best-effort: mark deleted in DB regardless

    doc.deleted_at = datetime.utcnow()
    db.commit()
    return {"status": "success"}
