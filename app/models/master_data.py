from sqlalchemy import Column, String, Integer, ForeignKey
from app.models.base import Base

class AdministrativeUnit(Base):
    __tablename__ = "administrative_units"
    code = Column(String(20), index=True)
    name = Column(String(255), nullable=False)
    parent_id = Column(Integer, ForeignKey("administrative_units.id"), nullable=True)
    division_type = Column(String(50), nullable=False) # PROVINCE, DISTRICT, WARD

from sqlalchemy.orm import relationship

class Field(Base):
    __tablename__ = "fields"
    name = Column(String(255), nullable=False)
    
    # Relationships
    industries = relationship("FieldIndustry", back_populates="field", cascade="all, delete-orphan")

class Industry(Base):
    __tablename__ = "industries"
    name = Column(String(255), nullable=False)
    code = Column(String(20), unique=True, index=True, nullable=False)

class FieldIndustry(Base):
    __tablename__ = "field_industries"
    field_id = Column(Integer, ForeignKey("fields.id", ondelete="CASCADE"), nullable=False)
    industry_id = Column(Integer, ForeignKey("industries.id", ondelete="CASCADE"), nullable=False)
    note = Column(String(500), nullable=True)

    # Relationships
    field = relationship("Field", back_populates="industries")
    industry = relationship("Industry")
