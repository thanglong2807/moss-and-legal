from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, Date, SmallInteger
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.base import Base

class StaffConfig(Base):
    __tablename__ = "staff_configs"
    crm_id = Column(String(50), unique=True, index=True, nullable=True)
    name = Column(String(255), nullable=False)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True, index=True)

class SourceConfig(Base):
    __tablename__ = "source_configs"
    crm_id = Column(String(50), unique=True, index=True, nullable=True)
    name = Column(String(255), nullable=False)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True, index=True)

class StatusConfig(Base):
    __tablename__ = "status_configs"
    crm_id = Column(String(50), unique=True, index=True, nullable=True)
    name = Column(String(255), nullable=False)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True, index=True)

class Customer(Base):
    __tablename__ = "customers"
    name = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=False, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True, index=True)
    
    source_id = Column(Integer, ForeignKey("source_configs.id"))
    staff_id = Column(Integer, ForeignKey("staff_configs.id"))
    status_id = Column(Integer, ForeignKey("status_configs.id"))
    branch_name = Column(String(100))
    crm_link = Column(String(500))
    id_crm = Column(String(100), nullable=True)
    # Extended personal info
    id_card = Column(String(20))
    gender = Column(SmallInteger)  # 0: Nam, 1: Nữ
    birth_date = Column(Date)
    province_id = Column(Integer, ForeignKey("administrative_units.id"), nullable=True)
    district_id = Column(Integer, ForeignKey("administrative_units.id"), nullable=True)
    ward_id = Column(Integer, ForeignKey("administrative_units.id"), nullable=True)
    street = Column(String(255))
    
    # Relationships
    source = relationship("SourceConfig")
    staff = relationship("StaffConfig")
    status = relationship("StatusConfig")
    households = relationship("BusinessHousehold", back_populates="customer")
    province = relationship("AdministrativeUnit", foreign_keys=[province_id])
    ward = relationship("AdministrativeUnit", foreign_keys=[ward_id])

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
