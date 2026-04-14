from sqlalchemy import Column, String, Integer, ForeignKey
from app.models.base import Base


class Document(Base):
    __tablename__ = "documents"

    record_id  = Column(Integer, nullable=False, index=True)
    table_name = Column(String(100), nullable=False)   # e.g. "business_households"
    label      = Column(String(20), nullable=False)    # e.g. "000", "001"
    file_name  = Column(String(500), nullable=False)
    drive_link = Column(String(1000), nullable=True)
    drive_file_id = Column(String(200), nullable=True) # for deletion
