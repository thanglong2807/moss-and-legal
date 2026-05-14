from sqlalchemy import Column, String, Integer, ForeignKey, BigInteger, Date, Boolean, Text, Float, SmallInteger
from sqlalchemy.orm import relationship
from app.models.base import Base
# Import related models so SQLAlchemy registry can resolve string references
from app.models.customer import Customer, StaffConfig, SourceConfig, StatusConfig  # noqa: F401
from app.models.master_data import AdministrativeUnit  # noqa: F401


class CompanyPosition(Base):
    __tablename__ = "company_positions"
    name = Column(String(255), nullable=False)
    is_llc1 = Column(Boolean, default=False)
    is_llc2 = Column(Boolean, default=False)
    is_jsc = Column(Boolean, default=False)


class Company(Base):
    __tablename__ = "companies"
    code = Column(String(20), unique=True, index=True, nullable=False)
    company_type = Column(SmallInteger, nullable=False)  # 1=LLC1, 2=LLC2, 3=JSC

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
    folder_id = Column(String(200), nullable=True)

    accounting_name = Column(String(255))
    accounting_phone = Column(String(20))
    accounting_gender = Column(Integer, nullable=True)
    accounting_birth_date = Column(Date, nullable=True)
    accounting_id_number = Column(String(20), nullable=True)
    tax_code = Column(String(20), nullable=True)
    approval_date = Column(String(10), nullable=True)   # dd/mm/yyyy
    registration_date = Column(String(10), nullable=True)  # dd/mm/yyyy

    # Relationships
    customer = relationship("Customer")
    handling_staff = relationship("StaffConfig", foreign_keys=[handling_staff_id])
    supporting_staff = relationship("StaffConfig", foreign_keys=[supporting_staff_id])
    status = relationship("StatusConfig")
    source = relationship("SourceConfig")
    province = relationship("AdministrativeUnit", foreign_keys=[province_id])
    ward = relationship("AdministrativeUnit", foreign_keys=[ward_id])
    persons = relationship("CompanyPerson", back_populates="company", cascade="all, delete-orphan")

    @property
    def company_info(self):
        return {
            "charter_capital": self.charter_capital,
            "name": {"foreign": self.company_foreign_name, "short": self.company_short_name},
            "contact": {"phone": self.phone, "fax": self.fax, "email": self.email, "website": self.website},
            "address": {"province_id": self.province_id, "ward_id": self.ward_id, "street": self.street},
        }

    @property
    def industries(self):
        return [
            {"code": lnk.industry.code, "name": lnk.industry.name, "is_main": lnk.is_main, "note": lnk.note}
            for lnk in self.__dict__.get('_industry_links', [])
        ]


class CompanyPerson(Base):
    __tablename__ = "company_persons"
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    person_type = Column(String(20), nullable=False)  # representative|member|owner|founder
    position_id = Column(Integer, ForeignKey("company_positions.id"), nullable=True)

    full_name = Column(String(255))
    gender = Column(SmallInteger)  # 0=Nam, 1=Nữ
    birth_date = Column(Date)
    id_number = Column(String(20))

    province_id = Column(Integer, ForeignKey("administrative_units.id"))
    ward_id = Column(Integer, ForeignKey("administrative_units.id"))
    street = Column(String(255))

    phone = Column(String(20))
    fax = Column(String(20))
    email = Column(String(255))

    ownership_percentage = Column(Float, nullable=True)
    asset_type_ratio = Column(Float, nullable=True)

    company = relationship("Company", back_populates="persons")
    position = relationship("CompanyPosition")
    province = relationship("AdministrativeUnit", foreign_keys=[province_id])
    ward = relationship("AdministrativeUnit", foreign_keys=[ward_id])
