from datetime import datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.document import Document
from app.models.hkd import BusinessHousehold
from app.services import drive_service

TABLE_NAME = "business_households"
SERVICE = "hkd"

DOCUMENT_LABELS = {
    "001": "Giấy đề nghị đăng ký HKD",
    "002": "Hợp đồng dịch vụ",
    "003": "Công chứng 2 mặt CCCD",
    "004": "Giấy giới thiệu nhận & nộp",
    "005": "CCCD mặt trước",
    "006": "CCCD mặt sau",
}


def list_documents(db: Session, hkd_id: int):
    return (
        db.query(Document)
        .filter(
            Document.record_id == hkd_id,
            Document.table_name == TABLE_NAME,
            Document.deleted_at == None,
        )
        .all()
    )


async def create_folder(db: Session, hkd_id: int) -> str:
    hkd = db.query(BusinessHousehold).filter(BusinessHousehold.id == hkd_id).first()
    if not hkd:
        raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ HKD")
    if hkd.folder_id:
        return hkd.folder_id
    folder_name = f"{hkd.code}_{hkd.company_full_name or hkd_id}"
    try:
        folder_id = await drive_service.ensure_folder(SERVICE, folder_name, None)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    hkd.folder_id = folder_id
    db.commit()
    return folder_id


async def upload_document(db: Session, hkd_id: int, label: str, file_bytes: bytes, filename: str) -> Document:
    if label not in DOCUMENT_LABELS:
        raise HTTPException(status_code=400, detail=f"Label không hợp lệ: {label}")

    ext = (filename or "").rsplit(".", 1)[-1].lower()
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

    if not hkd.folder_id:
        hkd.folder_id = folder_id
        db.commit()

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


async def delete_document(db: Session, doc_id: int):
    doc = db.query(Document).filter(Document.id == doc_id, Document.deleted_at == None).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy")
    if doc.drive_file_id:
        try:
            await drive_service.delete_file(doc.drive_file_id)
        except Exception:
            pass
    doc.deleted_at = datetime.utcnow()
    db.commit()
