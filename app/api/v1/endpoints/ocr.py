"""
OCR endpoint — generic, not tied to HKD.

POST /ocr/{doc_type}
  Body: multipart/form-data  { file: UploadFile, service_type?: str, drive_link?: str, drive_file_id?: str }
  Response: {
      "raw": { ...ocr fields... },
      "fields": { "owner_info.personal_info.full_name": "NGUYEN VAN A", ... }
  }

doc_type hiện tại hỗ trợ: "cccd"
"""

import logging

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.services import ocr_service
from app.auth.dependencies import require_permission, get_current_user
from app.auth.models import User

logger = logging.getLogger(__name__)

router = APIRouter()

MIME_MAP = {
    "pdf":  "application/pdf",
    "png":  "image/png",
    "jpg":  "image/jpeg",
    "jpeg": "image/jpeg",
}


@router.post("/{doc_type}", dependencies=[Depends(require_permission("hkd", "update"))])
async def ocr_extract(
    doc_type: str,
    file: UploadFile = File(...),
    service_type: Optional[str] = Form(None),
    drive_file_id: Optional[str] = Form(None),
    drive_link: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if doc_type not in ocr_service.PROMPTS:
        raise HTTPException(status_code=400, detail=f"doc_type '{doc_type}' không được hỗ trợ")

    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    mime_type = MIME_MAP.get(ext)
    if not mime_type:
        raise HTTPException(status_code=400, detail="Chỉ chấp nhận jpg/png/pdf")

    image_bytes = await file.read()

    try:
        raw = await ocr_service.extract(image_bytes, mime_type, doc_type, db=db)
    except Exception as e:
        logger.exception("OCR extract failed")
        raise HTTPException(status_code=500, detail=f"OCR thất bại: {e}")

    try:
        fields = ocr_service.map_to_form(raw, doc_type, db=db)
    except Exception as e:
        logger.exception("OCR map_to_form failed; raw=%s", raw)
        raise HTTPException(status_code=500, detail=f"Lỗi map form: {e}")

    try:
        ocr_service.save_log(
            db,
            doc_type=doc_type,
            raw_result=raw,
            fields_result=fields,
            user_id=current_user.id if current_user else None,
            service_type=service_type,
            drive_file_id=drive_file_id,
            drive_link=drive_link,
        )
    except Exception:
        logger.exception("OCR save_log failed (non-fatal)")

    return {"raw": raw, "fields": fields}
