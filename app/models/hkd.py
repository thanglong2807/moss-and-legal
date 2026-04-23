from sqlalchemy import Column, String, Integer, ForeignKey, BigInteger, Date, Boolean, Text
from sqlalchemy.orm import relationship
from app.models.base import Base
from app.models.customer import Customer, StaffConfig, SourceConfig, StatusConfig  # noqa: F401
from app.models.master_data import AdministrativeUnit, Industry  # noqa: F401

class BusinessHousehold(Base):
    __tablename__ = "business_households"
    code = Column(String(20), unique=True, index=True, nullable=False)
    company_full_name = Column(String(255), nullable=True)
    company_foreign_name = Column(String(255))
    company_short_name = Column(String(255))
    
    province_id = Column(Integer, ForeignKey("administrative_units.id"))
    district_id = Column(Integer, ForeignKey("administrative_units.id"))
    ward_id = Column(Integer, ForeignKey("administrative_units.id"))
    street = Column(String(255))
    
    phone = Column(String(20))
    fax = Column(String(20))
    email = Column(String(255))
    website = Column(String(255))
    charter_capital = Column(BigInteger)
    
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    handling_staff_id = Column(Integer, ForeignKey("staff_configs.id"), nullable=True)
    supporting_staff_id = Column(Integer, ForeignKey("staff_configs.id"), nullable=True)
    status_id = Column(Integer, ForeignKey("status_configs.id"), nullable=True)
    source_id = Column(Integer, ForeignKey("source_configs.id"), nullable=True)
    note = Column(Text)
    crm_link = Column(String(500))
    id_crm = Column(String(100), nullable=True)
    paid_amount = Column(BigInteger, nullable=True)
    folder_id = Column(String(200), nullable=True)   # Google Drive folder id

    # Relationships
    customer = relationship("Customer", back_populates="households")
    handling_staff = relationship("StaffConfig", foreign_keys=[handling_staff_id])
    supporting_staff = relationship("StaffConfig", foreign_keys=[supporting_staff_id])
    status = relationship("StatusConfig")
    source = relationship("SourceConfig")
    owner = relationship("BusinessOwner", back_populates="household", uselist=False, cascade="all, delete-orphan")
    # industry_links populated by hkd_service via _attach_industries

    province = relationship("AdministrativeUnit", foreign_keys=[province_id], lazy="select")
    ward = relationship("AdministrativeUnit", foreign_keys=[ward_id], lazy="select")

    @property
    def company_info(self):
        return {
            "charter_capital": self.charter_capital,
            "name": {
                "foreign": self.company_foreign_name,
                "short": self.company_short_name,
            },
            "contact": {
                "phone": self.phone,
                "fax": self.fax,
                "email": self.email,
                "website": self.website
            },
            "address": {
                "province_id": self.province_id,
                "ward_id": self.ward_id,
                "street": self.street
            }
        }

    @property
    def owner_info(self):
        if not self.owner: return None
        return {
            "personal_info": {
                "full_name": self.owner.full_name,
                "gender": self.owner.gender,
                "birth_date": self.owner.birth_date.strftime("%d/%m/%Y") if self.owner.birth_date else None,
                "id_number": self.owner.id_number
            },
            "contact_address": {
                "province_id": self.owner.province_id,
                "ward_id": self.owner.ward_id,
                "street": self.owner.street
            },
            "contact_info": {
                "phone": self.owner.phone,
                "email": self.owner.email
            }
        }

    @property
    def industries(self):
        return [
            {"code": lnk.industry.code, "name": lnk.industry.name, "is_main": lnk.is_main, "note": lnk.note}
            for lnk in self.__dict__.get('_industry_links', [])
        ]

class BusinessOwner(Base):
    __tablename__ = "business_owners"
    household_id = Column(Integer, ForeignKey("business_households.id", ondelete="CASCADE"), nullable=False)
    
    full_name = Column(String(255), nullable=True)
    gender = Column(Integer) # 0: Nam, 1: Nữ
    birth_date = Column(Date)
    id_number = Column(String(20))
    
    province_id = Column(Integer, ForeignKey("administrative_units.id"))
    district_id = Column(Integer, ForeignKey("administrative_units.id"))
    ward_id = Column(Integer, ForeignKey("administrative_units.id"))
    street = Column(String(255))
    
    phone = Column(String(20))
    fax = Column(String(20))
    email = Column(String(255))
    website = Column(String(255))

    household = relationship("BusinessHousehold", back_populates="owner")

class ProfileIndustry(Base):
    __tablename__ = "profile_industries"
    profile_id = Column(Integer, nullable=False)
    service_type = Column(String(20), nullable=False, default="hkd")  # hkd | company
    industry_id = Column(Integer, ForeignKey("industries.id"), nullable=False)
    is_main = Column(Boolean, default=False)
    note = Column(Text)

    # No back-ref to BusinessHousehold (polymorphic profile_id)

    industry = relationship("Industry")

# Backwards-compat alias
HouseholdIndustry = ProfileIndustry
