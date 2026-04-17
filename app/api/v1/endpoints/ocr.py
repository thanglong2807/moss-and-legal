"""
OCR endpoint — generic, not tied to HKD.

POST /ocr/{doc_type}
  Body: multipart/form-data  { file: UploadFile }
  Response: {
      "raw": { ...ocr fields... },
      "fields": { "owner_info.personal_info.full_name": "NGUYEN VAN A", ... }
  }

doc_type hiện tại hỗ trợ: "cccd"
Mở rộng sau: "business_license", "tax_cert", ...
"""

import logging

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services import ocr_service

logger = logging.getLogger(__name__)

router = APIRouter()

MIME_MAP = {
    "pdf":  "application/pdf",
    "png":  "image/png",
    "jpg":  "image/jpeg",
    "jpeg": "image/jpeg",
}


@router.post("/{doc_type}")
async def ocr_extract(doc_type: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    if doc_type not in ocr_service.PROMPTS:
        raise HTTPException(status_code=400, detail=f"doc_type '{doc_type}' không được hỗ trợ")

    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    mime_type = MIME_MAP.get(ext)
    if not mime_type:
        raise HTTPException(status_code=400, detail="Chỉ chấp nhận jpg/png/pdf")

    image_bytes = await file.read()

    try:
        raw = await ocr_service.extract(image_bytes, mime_type, doc_type)
    except Exception as e:
        logger.exception("OCR extract failed")
        raise HTTPException(status_code=500, detail=f"OCR thất bại: {e}")

    try:
        fields = ocr_service.map_to_form(raw, doc_type, db=db)
    except Exception as e:
        logger.exception("OCR map_to_form failed; raw=%s", raw)
        raise HTTPException(status_code=500, detail=f"Lỗi map form: {e}")

    return {"raw": raw, "fields": fields}
