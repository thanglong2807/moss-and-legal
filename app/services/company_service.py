from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select
from app.models.company import Company, CompanyPerson, CompanyPosition
from app.models.hkd import ProfileIndustry
from app.models.master_data import Industry
from app.schemas.company import CompanyCreate, CompanyUpdate
from app.services.admin_unit_service import admin_unit_service
from fastapi import HTTPException
from datetime import datetime
from deep_translator import GoogleTranslator
import uuid


def _parse_date(s):
    if not s:
        return None
    for fmt in ("%d/%m/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            pass
    return None


def _resolve_addr(db, addr: dict):
    province_id = addr.get("province_id")
    if not province_id and addr.get("province"):
        p = admin_unit_service.get_or_create_by_name(db, addr["province"], "PROVINCE")
        province_id = p.id if p else None
    ward_id = addr.get("ward_id")
    if not ward_id and addr.get("ward"):
        w = admin_unit_service.get_or_create_by_name(db, addr["ward"], "WARD")
        ward_id = w.id if w else None
    return province_id, ward_id


def _validate_capital(persons, company_type: int):
    """LLC2 (2) và JSC (3): tổng ownership_percentage phải = 100%."""
    if company_type not in (2, 3):
        return
    types = {"member"} if company_type == 2 else {"founder"}
    total = sum(float(p.ownership_percentage or 0) for p in persons if p.person_type in types)
    if persons and abs(total - 100) > 0.1:
        raise HTTPException(
            status_code=422,
            detail=f"Tổng vốn điều lệ phải bằng 100% (hiện tại: {total:.1f}%)"
        )


def _validate_industries(industries):
    empty = [i for i in industries if not (i.code or "").strip()]
    if empty:
        raise HTTPException(status_code=422, detail="Có ngành nghề chưa có mã.")
    codes = [i.code.strip() for i in industries]
    seen, duplicates = set(), set()
    for c in codes:
        (duplicates if c in seen else seen).add(c)
    if duplicates:
        raise HTTPException(status_code=422, detail=f"Mã ngành bị trùng: {', '.join(sorted(duplicates))}")


def _get_or_create_industry(db, code):
    ind = db.execute(select(Industry).where(Industry.code == code)).scalars().first()
    if not ind:
        ind = Industry(code=code, name=f"Industry {code}")
        db.add(ind)
        db.flush()
    return ind


def _load_options():
    return [
        joinedload(Company.customer),
        joinedload(Company.handling_staff),
        joinedload(Company.supporting_staff),
        joinedload(Company.status),
        joinedload(Company.source),
        joinedload(Company.province),
        joinedload(Company.ward),
        joinedload(Company.persons).joinedload(CompanyPerson.position),
        joinedload(Company.persons).joinedload(CompanyPerson.province),
        joinedload(Company.persons).joinedload(CompanyPerson.ward),
    ]


def _attach_industries(db, companies):
    """Load ProfileIndustry for company service_type and attach as .industry_links."""
    ids = [c.id for c in companies]
    if not ids:
        return
    links = (
        db.execute(
            select(ProfileIndustry)
            .where(ProfileIndustry.profile_id.in_(ids), ProfileIndustry.service_type == "company")
            .options(joinedload(ProfileIndustry.industry))
        ).scalars().unique().all()
    )
    by_id = {}
    for lnk in links:
        by_id.setdefault(lnk.profile_id, []).append(lnk)
    for c in companies:
        c.__dict__['_industry_links'] = by_id.get(c.id, [])


def _industries_for(company):
    return [
        {"code": lnk.industry.code, "name": lnk.industry.name, "is_main": lnk.is_main, "note": lnk.note}
        for lnk in company.__dict__.get('_industry_links', [])
    ]


class CompanyService:
    def create(self, db: Session, obj_in: CompanyCreate, tenant_id: int = None) -> Company:
        comp_info = obj_in.company_info or {}
        addr = comp_info.get("address", {})
        contact = comp_info.get("contact", {})
        name = comp_info.get("name", {})

        province_id, ward_id = _resolve_addr(db, addr)

        company = Company(
            code=f"TLDN-{uuid.uuid4().hex[:8].upper()}",
            company_type=obj_in.company_type,
            company_full_name=obj_in.company_full_name or name.get("full"),
            company_foreign_name=name.get("foreign"),
            company_short_name=name.get("short"),
            province_id=province_id,
            ward_id=ward_id,
            street=addr.get("street"),
            phone=contact.get("phone"),
            fax=contact.get("fax"),
            email=contact.get("email"),
            website=contact.get("website"),
            charter_capital=comp_info.get("charter_capital"),
            customer_id=obj_in.customer_id,
            handling_staff_id=obj_in.handling_staff_id,
            supporting_staff_id=obj_in.supporting_staff_id,
            status_id=obj_in.status_id,
            source_id=obj_in.source_id,
            note=obj_in.note,
            paid_amount=obj_in.paid_amount,
            accounting_name=obj_in.accounting_name,
            accounting_phone=obj_in.accounting_phone,
            tax_code=obj_in.tax_code,
            approval_date=obj_in.approval_date,
            registration_date=obj_in.registration_date,
            tenant_id=tenant_id,
        )
        db.add(company)
        db.flush()

        for p in (obj_in.persons or []):
            person = CompanyPerson(
                company_id=company.id,
                person_type=p.person_type,
                position_id=p.position_id,
                full_name=p.full_name,
                gender=p.gender,
                birth_date=_parse_date(p.birth_date),
                id_number=p.id_number,
                province_id=p.province_id,
                ward_id=p.ward_id,
                street=p.street,
                phone=p.phone,
                fax=p.fax,
                email=p.email,
                ownership_percentage=p.ownership_percentage,
                asset_type_ratio=p.asset_type_ratio,
            )
            db.add(person)

        _validate_capital(obj_in.persons or [], obj_in.company_type)
        _validate_industries(obj_in.industries or [])
        for ind_in in (obj_in.industries or []):
            ind = _get_or_create_industry(db, ind_in.code)
            db.add(ProfileIndustry(
                profile_id=company.id,
                service_type="company",
                industry_id=ind.id,
                is_main=ind_in.is_main,
                note=ind_in.note,
            ))

        db.commit()
        db.refresh(company)
        _attach_industries(db, [company])
        return company

    def get_list(self, db: Session, skip: int = 0, limit: int = 20,
                 customer_id: int = None, search: str = None, staff_id: int = None,
                 tenant_id: int = None):
        from sqlalchemy import func, or_
        from app.models.customer import Customer
        base = select(Company).where(Company.deleted_at.is_(None))
        if tenant_id is not None:
            base = base.where(Company.tenant_id == tenant_id)
        if customer_id:
            base = base.where(Company.customer_id == customer_id)
        if staff_id:
            base = base.where(or_(Company.handling_staff_id == staff_id, Company.supporting_staff_id == staff_id))
        if search:
            s = f"%{search}%"
            base = base.join(Customer, Company.customer_id == Customer.id, isouter=True).where(
                or_(Company.company_full_name.ilike(s), Company.code.ilike(s), Customer.name.ilike(s))
            )
        total = db.execute(select(func.count()).select_from(base.subquery())).scalar()
        stmt = base.order_by(Company.created_at.desc()).offset(skip).limit(limit).options(*_load_options())
        companies = db.execute(stmt).scalars().unique().all()
        _attach_industries(db, companies)
        return {"items": companies, "total": total}

    def get_by_id(self, db: Session, company_id: int, tenant_id: int = None):
        stmt = select(Company).where(Company.id == company_id).options(*_load_options())
        if tenant_id is not None:
            stmt = stmt.where(Company.tenant_id == tenant_id)
        company = db.execute(stmt).scalars().first()
        if company:
            _attach_industries(db, [company])
        return company

    def update(self, db: Session, company_id: int, obj_in: CompanyUpdate):
        company = self.get_by_id(db, company_id)
        if not company:
            return None

        if obj_in.company_type is not None: company.company_type = obj_in.company_type

        if obj_in.company_info is not None:
            comp_info = obj_in.company_info
            addr = comp_info.get("address", {})
            contact = comp_info.get("contact", {})
            name = comp_info.get("name", {})

            if name.get("full"): company.company_full_name = name["full"]
            if name.get("foreign") is not None: company.company_foreign_name = name["foreign"]
            if name.get("short") is not None: company.company_short_name = name["short"]
            if comp_info.get("charter_capital") is not None: company.charter_capital = comp_info["charter_capital"]

            province_id, ward_id = _resolve_addr(db, addr)
            if province_id: company.province_id = province_id
            if ward_id: company.ward_id = ward_id
            if addr.get("street"): company.street = addr["street"]
            if contact.get("phone"): company.phone = contact["phone"]
            if contact.get("fax"): company.fax = contact["fax"]
            if contact.get("email"): company.email = contact["email"]
            if contact.get("website"): company.website = contact["website"]

        if obj_in.company_full_name is not None: company.company_full_name = obj_in.company_full_name
        if obj_in.customer_id is not None: company.customer_id = obj_in.customer_id
        if obj_in.handling_staff_id is not None: company.handling_staff_id = obj_in.handling_staff_id
        if obj_in.supporting_staff_id is not None: company.supporting_staff_id = obj_in.supporting_staff_id
        if obj_in.status_id is not None: company.status_id = obj_in.status_id
        if obj_in.source_id is not None: company.source_id = obj_in.source_id
        if obj_in.note is not None: company.note = obj_in.note
        if obj_in.paid_amount is not None: company.paid_amount = obj_in.paid_amount
        if obj_in.accounting_name is not None: company.accounting_name = obj_in.accounting_name
        if obj_in.accounting_phone is not None: company.accounting_phone = obj_in.accounting_phone
        company.tax_code = obj_in.tax_code
        company.approval_date = obj_in.approval_date
        company.registration_date = obj_in.registration_date

        if obj_in.persons is not None:
            db.query(CompanyPerson).filter(CompanyPerson.company_id == company.id).delete()
            for p in obj_in.persons:
                db.add(CompanyPerson(
                    company_id=company.id,
                    person_type=p.person_type,
                    position_id=p.position_id,
                    full_name=p.full_name,
                    gender=p.gender,
                    birth_date=_parse_date(p.birth_date),
                    id_number=p.id_number,
                    province_id=p.province_id,
                    ward_id=p.ward_id,
                    street=p.street,
                    phone=p.phone,
                    fax=p.fax,
                    email=p.email,
                    ownership_percentage=p.ownership_percentage,
                    asset_type_ratio=p.asset_type_ratio,
                ))

        if obj_in.persons is not None:
            _validate_capital(obj_in.persons, company.company_type)
        if obj_in.industries is not None:
            _validate_industries(obj_in.industries)
            db.query(ProfileIndustry).filter(
                ProfileIndustry.profile_id == company.id,
                ProfileIndustry.service_type == "company"
            ).delete()
            for ind_in in obj_in.industries:
                ind = _get_or_create_industry(db, ind_in.code)
                db.add(ProfileIndustry(
                    profile_id=company.id,
                    service_type="company",
                    industry_id=ind.id,
                    is_main=ind_in.is_main,
                    note=ind_in.note,
                ))

        db.commit()
        db.refresh(company)
        _attach_industries(db, [company])
        return company

    def delete(self, db: Session, company_id: int):
        company = self.get_by_id(db, company_id)
        if company:
            db.delete(company)
            db.commit()
            return True
        return False

    def get_by_crm_id(self, db: Session, crm_id: str):
        return db.execute(select(Company).where(Company.id_crm == crm_id)).scalars().first()

    def upsert_from_crm(
        self, db: Session, payload,
        customer_id: int, handling_staff_id, supporting_staff_id,
        source_id, status_id,
    ):
        from app.core.config import settings
        import re
        crm_link = (
            f"https://crm.pancake.vn/shop/{settings.CRM_WORKSPACE}"
            f"/table/{settings.CRM_TABLE_TLDN}/?recordId={payload.id}"
        )
        try:
            paid = int(re.sub(r"[^\d]", "", str(payload.amount_paid or "0")) or 0)
        except (ValueError, TypeError):
            paid = 0

        _comp_type_map = {"1tv": 1, "2tv": 2, "cổ phần": 3, "co phan": 3}
        raw_ct = (getattr(payload, "comp_type", None) or "").strip().lower()
        comp_type = _comp_type_map.get(raw_ct, 1)

        existing = self.get_by_crm_id(db, payload.id)
        if existing:
            existing.customer_id = customer_id
            existing.handling_staff_id = handling_staff_id
            existing.supporting_staff_id = supporting_staff_id
            existing.source_id = source_id
            existing.status_id = status_id
            if comp_type: existing.company_type = comp_type
            existing.note = payload.note or existing.note
            existing.paid_amount = paid
            existing.crm_link = crm_link
            db.flush()
            return existing
        else:
            company = Company(
                code=f"TLDN-{uuid.uuid4().hex[:8].upper()}",
                company_type=comp_type,
                company_full_name=payload.name.upper() or None,
                customer_id=customer_id,
                handling_staff_id=handling_staff_id,
                supporting_staff_id=supporting_staff_id,
                source_id=source_id,
                status_id=status_id,
                note=payload.note or None,
                paid_amount=paid,
                crm_link=crm_link,
                id_crm=payload.id,
            )
            db.add(company)
            db.flush()
            return company
    
    # helper
    def translate(self, name, company_type, src='vi', target='en'):
        try:
            _TYPE_SUFFIX = {1: "COMPANY LIMITED", 2: "COMPANY LIMITED", 3: "JOINT STOCK COMPANY"}

            translated = GoogleTranslator(source=src, target=target).translate(name)
            suffix = _TYPE_SUFFIX.get(company_type, "COMPANY LIMITED")
            result = f"{translated.upper()} {suffix}"
            return result
        except Exception as e:
            return ""



company_service = CompanyService()
