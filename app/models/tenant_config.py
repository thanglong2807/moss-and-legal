"""
Tenant-level configuration models:
  - TenantProfile   — law firm info used in document exports
  - TenantDocumentType — custom per-tenant document templates
"""
from datetime import datetime
from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey,
    Integer, String, Text,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class TenantProfile(Base):
    """Thông tin công ty luật / văn phòng — dùng để điền vào mẫu hồ sơ xuất ra."""
    __tablename__ = "tenant_profiles"

    id                      = Column(Integer, primary_key=True, autoincrement=True)
    tenant_id               = Column(Integer, ForeignKey("tenants.id"), nullable=False, unique=True, index=True)

    # Tên công ty
    company_full_name       = Column(String(255), nullable=True)
    company_short_name      = Column(String(100), nullable=True)
    tax_code                = Column(String(50),  nullable=True)

    # Địa chỉ
    address                 = Column(Text,        nullable=True)
    province                = Column(String(100), nullable=True)

    # Liên hệ
    phone                   = Column(String(20),  nullable=True)
    email                   = Column(String(100), nullable=True)
    website                 = Column(String(200), nullable=True)

    # Người đại diện pháp lý
    representative_name     = Column(String(255), nullable=True)
    representative_title    = Column(String(100), nullable=True)
    representative_id_number= Column(String(50),  nullable=True)
    representative_id_date  = Column(String(20),  nullable=True)   # dd/mm/yyyy
    representative_id_place = Column(String(255), nullable=True)

    # Giấy phép
    business_reg_number     = Column(String(100), nullable=True)   # số GCN DKKD
    business_reg_date       = Column(String(20),  nullable=True)   # dd/mm/yyyy
    business_reg_place      = Column(String(255), nullable=True)

    # Thông tin bổ sung
    bank_name               = Column(String(255), nullable=True)
    bank_account            = Column(String(50),  nullable=True)
    seal_text               = Column(Text,        nullable=True)   # text con dấu

    created_at              = Column(DateTime, default=datetime.utcnow)
    updated_at              = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tenant                  = relationship("Tenant", foreign_keys=[tenant_id])


class TenantDocumentType(Base):
    """Loại hồ sơ tùy chỉnh theo từng tenant — cho phép upload template .docx riêng."""
    __tablename__ = "tenant_document_types"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    tenant_id       = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)

    name            = Column(String(255), nullable=False)          # tên hiển thị
    description     = Column(Text,        nullable=True)
    # category: comma-separated list, e.g. "hkd,tldn_1,tldn_2"
    category        = Column(String(100), nullable=False, default="hkd")
    # template_key: ID dùng để match file template (ví dụ "t001", "custom_01")
    template_key    = Column(String(50),  nullable=True)
    # đường dẫn tương đối tới file template đã upload
    template_path   = Column(String(500), nullable=True)
    # tên file gốc khi upload
    original_filename = Column(String(255), nullable=True)

    is_active       = Column(Boolean, default=True)
    sort_order      = Column(Integer, default=0)

    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at      = Column(DateTime, nullable=True)

    tenant          = relationship("Tenant", foreign_keys=[tenant_id])
