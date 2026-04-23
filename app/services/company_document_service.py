import asyncio
from datetime import datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.document import Document
from app.models.company import Company
from app.services import drive_service

TABLE_NAME = "companies"
SERVICE = "tldn"

_TYPE_PREFIX = {1: "CÔNG TY TNHH", 2: "CÔNG TY TNHH", 3: "CÔNG TY CỔ PHẦN"}

# Template subfolder per company type on Drive (under DRIVE_TLDN root)
TEMPLATE_FOLDERS = {1: "LLC1", 2: "LLC2", 3: "JSC"}

# Registration document labels per company type (user-uploaded docs)
# Key: label code, Value: display name
REG_LABELS: dict[int, dict[str, str]] = {
    1: {  # LLC1 / 1TV
        "001": "Giấy đề nghị đăng ký doanh nghiệp",
        "002": "Điều lệ công ty",
        "004": "Văn bản ủy quyền cho người đại diện làm thủ tục ĐKDN",
        "005": "Danh sách chủ sở hữu hưởng lợi của doanh nghiệp",
    },
    2: {  # LLC2 / 2TV
        "001": "Giấy đề nghị đăng ký doanh nghiệp",
        "002": "Điều lệ công ty",
        "003": "Danh sách thành viên",
        "004": "Văn bản ủy quyền cho người đại diện làm thủ tục ĐKDN",
        "005": "Danh sách chủ sở hữu hưởng lợi của doanh nghiệp",
    },
    3: {  # JSC / Cổ phần
        "001": "Giấy đề nghị đăng ký doanh nghiệp",
        "002": "Điều lệ công ty",
        "003": "Danh sách cổ đông sáng lập",
        "004": "Văn bản ủy quyền cho người đại diện làm thủ tục ĐKDN",
        "005": "Danh sách chủ sở hữu hưởng lợi của doanh nghiệp",
    },
}

# Export template labels per company type (auto-generated from template)
EXPORT_LABELS: dict[int, dict[str, str]] = {
    1: {
        "000": "Hướng dẫn ký",
        "001": "Giấy đề nghị",
        "002": "Điều lệ",
        "003": "Giấy ủy quyền",
        "004": "Danh sách chủ sở hữu hưởng lợi",
    },
    2: {
        "000": "Hướng dẫn ký",
        "001": "Giấy đề nghị",
        "002": "Điều lệ",
        "003": "Danh sách thành viên",
        "004": "Giấy ủy quyền",
        "005": "Danh sách chủ sở hữu hưởng lợi",
    },
    3: {
        "000": "Hướng dẫn ký",
        "001": "Giấy đề nghị",
        "002": "Điều lệ",
        "003": "Danh sách cổ đông",
        "004": "Giấy ủy quyền",
        "005": "Danh sách chủ sở hữu hưởng lợi",
    },
}

# CCCD labels: prefix "C" + side code to avoid collision with reg doc labels
# "C000_{person_type}_{index}" = CCCD mặt trước, "C001_..." = CCCD mặt sau
_CCCD_SIDES = {"C000": "CCCD mặt trước", "C001": "CCCD mặt sau"}


def _label_type(label: str) -> str:
    """Returns 'cccd' | 'reg' | 'unknown'."""
    if label.startswith("C0"):
        return "cccd"
    if label[:3] in ("001", "002", "003", "004", "005"):
        return "reg"
    return "unknown"


def _validate_label(label: str, company_type: int):
    lt = _label_type(label)
    if lt == "cccd":
        if label[:4] not in _CCCD_SIDES:
            raise HTTPException(status_code=400, detail=f"Label CCCD không hợp lệ: {label}")
    elif lt == "reg":
        if label[:3] not in REG_LABELS.get(company_type, {}):
            raise HTTPException(status_code=400, detail=f"Label '{label}' không tồn tại cho loại hình này")
    else:
        raise HTTPException(status_code=400, detail=f"Label không hợp lệ: {label}")


def _display_name(label: str, company_type: int, ext: str) -> str:
    lt = _label_type(label)
    if lt == "cccd":
        side_label = _CCCD_SIDES.get(label[:4], "CCCD")
        return f"{label}_{side_label}.{ext}"
    name = REG_LABELS.get(company_type, {}).get(label[:3], label)
    return f"{label[:3]}_{name}.{ext}"


def _folder_name(company: Company) -> str:
    prefix = _TYPE_PREFIX.get(company.company_type, "CÔNG TY TNHH")
    name = company.company_full_name or str(company.id)
    return f"{company.code}_{prefix}_{name}"


def list_documents(db: Session, company_id: int):
    return (
        db.query(Document)
        .filter(
            Document.record_id == company_id,
            Document.table_name == TABLE_NAME,
            Document.deleted_at == None,
        )
        .all()
    )


def get_labels_for_type(company_type: int) -> dict:
    """Return {label_code: display_name} for upload slots of given company type."""
    return REG_LABELS.get(company_type, {})


async def create_folder(db: Session, company_id: int) -> str:
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ TLDN")
    if company.folder_id:
        return company.folder_id
    try:
        folder_id = await drive_service.ensure_folder(SERVICE, _folder_name(company), None)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    company.folder_id = folder_id
    db.commit()
    return folder_id


async def upload_document(db: Session, company_id: int, label: str, file_bytes: bytes, filename: str) -> Document:
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ TLDN")

    _validate_label(label, company.company_type)

    ext = (filename or "").rsplit(".", 1)[-1].lower()
    if ext not in ("pdf", "png", "jpg", "jpeg"):
        raise HTTPException(status_code=400, detail="Chỉ chấp nhận PDF hoặc ảnh (png/jpg)")

    try:
        folder_id = await drive_service.ensure_folder(SERVICE, _folder_name(company), company.folder_id)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    if not company.folder_id:
        company.folder_id = folder_id
        db.commit()

    existing_doc = (
        db.query(Document)
        .filter(Document.record_id == company_id, Document.table_name == TABLE_NAME,
                Document.label == label, Document.deleted_at == None)
        .first()
    )

    mime_map = {"pdf": "application/pdf", "png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg"}
    mime_type = mime_map.get(ext, "application/octet-stream")
    display_name = _display_name(label, company.company_type, ext)

    try:
        drive_file_id, drive_link = await drive_service.upload_file(
            file_bytes, display_name, mime_type, folder_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi upload Drive: {e}")

    doc = Document(
        record_id=company_id,
        table_name=TABLE_NAME,
        label=label,
        file_name=display_name,
        drive_link=drive_link,
        drive_file_id=drive_file_id,
    )
    db.add(doc)

    if existing_doc:
        old_drive_file_id = existing_doc.drive_file_id
        existing_doc.deleted_at = datetime.utcnow()
        if old_drive_file_id:
            async def _delete_old():
                try:
                    await drive_service.delete_file(old_drive_file_id)
                except Exception:
                    pass
            asyncio.create_task(_delete_old())

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
