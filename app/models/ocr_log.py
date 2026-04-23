from sqlalchemy import Column, Integer, String, Text, JSON, ForeignKey
from app.models.base import Base


class OcrLog(Base):
    __tablename__ = "ocr_logs"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    doc_type = Column(String(50), nullable=False)           # "cccd", ...
    model_name = Column(String(100), nullable=True)
    service_type = Column(String(50), nullable=True)        # "hkd", "company", ...
    drive_file_id = Column(String(255), nullable=True)
    drive_link = Column(String(500), nullable=True)
    raw_result = Column(JSON, nullable=True)                # raw OCR output
    fields_result = Column(JSON, nullable=True)             # mapped form fields
