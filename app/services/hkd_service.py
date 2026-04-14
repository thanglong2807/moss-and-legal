from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, delete
from app.models.hkd import BusinessHousehold, BusinessOwner, HouseholdIndustry
from app.models.master_data import Industry
from app.schemas.hkd import HKDCreate, HKDUpdate
from app.services.admin_unit_service import admin_unit_service
import uuid
from datetime import datetime
from fastapi import HTTPException


def _validate_industries(industries) -> None:
    """Raise 422 if any code is empty or there are duplicates."""
    empty = [i for i in industries if not (i.code or "").strip()]
    if empty:
        raise HTTPException(status_code=422, detail="Có ngành nghề chưa có mã. Vui lòng chọn mã trước khi lưu.")
    codes = [i.code.strip() for i in industries]
    seen, duplicates = set(), set()
    for c in codes:
        (duplicates if c in seen else seen).add(c)
    if duplicates:
        raise HTTPException(status_code=422, detail=f"Mã ngành bị trùng: {', '.join(sorted(duplicates))}")

class HKDService:
    def create(self, db: Session, obj_in: HKDCreate):
        # 1. Handle Auto-fill from Customer if customer_id is provided
        from app.models.customer import Customer
        customer = None
        if obj_in.customer_id:
            customer = db.execute(select(Customer).where(Customer.id == obj_in.customer_id)).scalar_one_or_none()
            
        comp_info = obj_in.company_info
        
        # Merge values from customer if missing in owner_info
        owner_data = obj_in.owner
        p_info = owner_data.get("personal_info", {})
        if customer:
            if not p_info.get("full_name"): p_info["full_name"] = customer.name
            # Also phone if needed, though user only mentioned data auto-fill in general
        
        addr = comp_info.get("address", {})
        contact = comp_info.get("contact", {})
        name = comp_info.get("name", {})
        
        # 2. Administrative Units (support both id-based and name-based)
        if addr.get("province_id"):
            province_id = addr.get("province_id")
        else:
            prov = admin_unit_service.get_or_create_by_name(db, addr.get("province"), "PROVINCE")
            province_id = prov.id if prov else None
        if addr.get("ward_id"):
            ward_id = addr.get("ward_id")
        else:
            ward = admin_unit_service.get_or_create_by_name(db, addr.get("ward"), "WARD")
            ward_id = ward.id if ward else None

        # 3. HKD
        hkd = BusinessHousehold(
            code=f"HKD-{uuid.uuid4().hex[:8].upper()}",
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
            paid_amount=obj_in.paid_amount
        )
        db.add(hkd)
        db.flush()
        
        # 4. Owner
        owner_data = obj_in.owner
        p_info = owner_data.get("personal_info", {})
        o_addr = owner_data.get("contact_address", {})
        o_contact = owner_data.get("contact_info", {})
        
        if o_addr.get("province_id"):
            o_province_id = o_addr.get("province_id")
        else:
            o_prov = admin_unit_service.get_or_create_by_name(db, o_addr.get("province"), "PROVINCE")
            o_province_id = o_prov.id if o_prov else None
        if o_addr.get("ward_id"):
            o_ward_id = o_addr.get("ward_id")
        else:
            o_ward = admin_unit_service.get_or_create_by_name(db, o_addr.get("ward"), "WARD")
            o_ward_id = o_ward.id if o_ward else None

        def parse_d(s):
            if not s: return None
            try: return datetime.strptime(s, "%d/%m/%Y").date()
            except: return None

        owner = BusinessOwner(
            household_id=hkd.id,
            full_name=p_info.get("full_name"),
            gender=p_info.get("gender"),
            birth_date=parse_d(p_info.get("birth_date")),
            id_number=p_info.get("id_number"),
            province_id=o_province_id,
            ward_id=o_ward_id,
            street=o_addr.get("street"),
            phone=o_contact.get("phone"),
            email=o_contact.get("email")
        )
        db.add(owner)
        
        # 5. Industries
        _validate_industries(obj_in.industries)
        for ind_in in obj_in.industries:
            stmt = select(Industry).where(Industry.code == ind_in.code)
            industry = db.execute(stmt).scalars().first()
            if not industry:
                industry = Industry(code=ind_in.code, name=f"Industry {ind_in.code}")
                db.add(industry)
                db.flush()
            
            link = HouseholdIndustry(
                household_id=hkd.id,
                industry_id=industry.id,
                is_main=ind_in.is_main,
                note=ind_in.note
            )
            db.add(link)
            
        db.commit()
        db.refresh(hkd)
        return hkd

    def get_list(self, db: Session, skip: int = 0, limit: int = 100, customer_id: int = None):
        stmt = (
            select(BusinessHousehold)
            .offset(skip)
            .limit(limit)
            .options(
                joinedload(BusinessHousehold.customer),
                joinedload(BusinessHousehold.handling_staff),
                joinedload(BusinessHousehold.supporting_staff),
                joinedload(BusinessHousehold.status),
                joinedload(BusinessHousehold.source),
                joinedload(BusinessHousehold.owner),
                joinedload(BusinessHousehold.industry_links).joinedload(HouseholdIndustry.industry)
            )
        )
        if customer_id:
            stmt = stmt.where(BusinessHousehold.customer_id == customer_id)
            
        return db.execute(stmt).scalars().unique().all()

    def get_by_id(self, db: Session, hkd_id: int):
        stmt = select(BusinessHousehold).where(BusinessHousehold.id == hkd_id).options(
            joinedload(BusinessHousehold.customer),
            joinedload(BusinessHousehold.handling_staff),
            joinedload(BusinessHousehold.supporting_staff),
            joinedload(BusinessHousehold.status),
            joinedload(BusinessHousehold.source),
            joinedload(BusinessHousehold.owner),
            joinedload(BusinessHousehold.industry_links).joinedload(HouseholdIndustry.industry)
        )
        return db.execute(stmt).scalars().first()

    def update(self, db: Session, hkd_id: int, obj_in: HKDUpdate):
        hkd = self.get_by_id(db, hkd_id)
        if not hkd:
            return None
        
        # 1. Update main HKD fields if company_info is provided
        if obj_in.company_info:
            comp_info = obj_in.company_info
            addr = comp_info.get("address", {})
            contact = comp_info.get("contact", {})
            name = comp_info.get("name", {})
            
            if name.get("full"): hkd.company_full_name = name.get("full")
            if name.get("foreign") is not None: hkd.company_foreign_name = name.get("foreign")
            if name.get("short") is not None: hkd.company_short_name = name.get("short")

            if addr.get("province_id"):
                hkd.province_id = addr.get("province_id")
            elif addr.get("province"):
                prov = admin_unit_service.get_or_create_by_name(db, addr.get("province"), "PROVINCE")
                hkd.province_id = prov.id if prov else None
            if addr.get("ward_id"):
                hkd.ward_id = addr.get("ward_id")
            elif addr.get("ward"):
                ward = admin_unit_service.get_or_create_by_name(db, addr.get("ward"), "WARD")
                hkd.ward_id = ward.id if ward else None
            
            if addr.get("street"): hkd.street = addr.get("street")
            if contact.get("phone"): hkd.phone = contact.get("phone")
            if contact.get("fax"): hkd.fax = contact.get("fax")
            if contact.get("email"): hkd.email = contact.get("email")
            if contact.get("website"): hkd.website = contact.get("website")
            if comp_info.get("charter_capital") is not None: hkd.charter_capital = comp_info.get("charter_capital")

        if obj_in.company_full_name is not None: hkd.company_full_name = obj_in.company_full_name
        if obj_in.customer_id is not None: hkd.customer_id = obj_in.customer_id
        if obj_in.handling_staff_id is not None: hkd.handling_staff_id = obj_in.handling_staff_id
        if obj_in.supporting_staff_id is not None: hkd.supporting_staff_id = obj_in.supporting_staff_id
        if obj_in.status_id is not None: hkd.status_id = obj_in.status_id
        if obj_in.source_id is not None: hkd.source_id = obj_in.source_id
        if obj_in.note is not None: hkd.note = obj_in.note
        if obj_in.paid_amount is not None: hkd.paid_amount = obj_in.paid_amount

        # 2. Update Owner if provided
        if obj_in.owner:
            owner_data = obj_in.owner
            p_info = owner_data.get("personal_info", {})
            o_addr = owner_data.get("contact_address", {})
            o_contact = owner_data.get("contact_info", {})
            
            def parse_d(s):
                if not s: return None
                try: return datetime.strptime(s, "%d/%m/%Y").date()
                except: return None

            def resolve_province(pid, pname):
                if pid: return pid
                if pname:
                    p = admin_unit_service.get_or_create_by_name(db, pname, "PROVINCE")
                    return p.id if p else None
                return None

            def resolve_ward(wid, wname):
                if wid: return wid
                if wname:
                    w = admin_unit_service.get_or_create_by_name(db, wname, "WARD")
                    return w.id if w else None
                return None

            if not hkd.owner:
                hkd.owner = BusinessOwner(
                    household_id=hkd.id,
                    full_name=p_info.get("full_name"),
                    gender=p_info.get("gender"),
                    birth_date=parse_d(p_info.get("birth_date")),
                    id_number=p_info.get("id_number"),
                    province_id=resolve_province(o_addr.get("province_id"), o_addr.get("province")),
                    ward_id=resolve_ward(o_addr.get("ward_id"), o_addr.get("ward")),
                    street=o_addr.get("street"),
                    phone=o_contact.get("phone"),
                    email=o_contact.get("email"),
                )
                db.add(hkd.owner)
            else:
                if p_info.get("full_name"): hkd.owner.full_name = p_info.get("full_name")
                if p_info.get("gender") is not None: hkd.owner.gender = p_info.get("gender")
                if p_info.get("birth_date"): hkd.owner.birth_date = parse_d(p_info.get("birth_date"))
                if p_info.get("id_number"): hkd.owner.id_number = p_info.get("id_number")
                pid = resolve_province(o_addr.get("province_id"), o_addr.get("province"))
                if pid: hkd.owner.province_id = pid
                wid = resolve_ward(o_addr.get("ward_id"), o_addr.get("ward"))
                if wid: hkd.owner.ward_id = wid
                if o_addr.get("street"): hkd.owner.street = o_addr.get("street")
                if o_contact.get("phone"): hkd.owner.phone = o_contact.get("phone")
                if o_contact.get("email"): hkd.owner.email = o_contact.get("email")

        # 3. Update Industries if provided (replace all)
        if obj_in.industries is not None:
            _validate_industries(obj_in.industries)
            # Delete old links
            db.query(HouseholdIndustry).filter(HouseholdIndustry.household_id == hkd.id).delete()
            # Add new ones
            for ind_in in obj_in.industries:
                stmt = select(Industry).where(Industry.code == ind_in.code)
                industry = db.execute(stmt).scalars().first()
                if not industry:
                    industry = Industry(code=ind_in.code, name=f"Industry {ind_in.code}")
                    db.add(industry)
                    db.flush()
                
                link = HouseholdIndustry(
                    household_id=hkd.id,
                    industry_id=industry.id,
                    is_main=ind_in.is_main,
                    note=ind_in.note
                )
                db.add(link)
        
        db.commit()
        db.refresh(hkd)
        return hkd

    def delete(self, db: Session, hkd_id: int):
        hkd = self.get_by_id(db, hkd_id)
        if hkd:
            db.delete(hkd)
            db.commit()
            return True
        return False

    def update_crm_link(self, db: Session, hkd_id: int, crm_link: str):
        hkd = self.get_by_id(db, hkd_id)
        if hkd:
            hkd.crm_link = crm_link
            db.commit()
            db.refresh(hkd)
        return hkd

    # ── CRM webhook helpers ───────────────────────────────────────────────────

    def get_by_crm_id(self, db: Session, id_crm: str):
        return db.execute(
            select(BusinessHousehold).where(BusinessHousehold.id_crm == id_crm)
        ).scalars().first()

    def upsert_from_crm(
        self, db: Session, payload,
        customer_id: int, handling_staff_id, supporting_staff_id,
        source_id: int, status_id,
    ):
        from app.core.config import settings
        crm_link = (
            f"https://crm.pancake.vn/shop/{settings.CRM_WORKSPACE}"
            f"/table/{settings.CRM_TABLE_HKD}/?recordId={payload.id}"
        )
        try:
            # "500.000 đ" → "500000" → 500000
            import re
            paid = int(re.sub(r"[^\d]", "", str(payload.amount_paid or "0")) or 0)
        except (ValueError, TypeError):
            paid = 0

        existing = self.get_by_crm_id(db, payload.id)
        if existing:
            existing.customer_id = customer_id
            existing.handling_staff_id = handling_staff_id
            existing.supporting_staff_id = supporting_staff_id
            existing.source_id = source_id
            existing.status_id = status_id
            existing.note = payload.note or existing.note
            existing.paid_amount = paid
            existing.crm_link = crm_link
            db.flush()
            return existing
        else:
            new_hkd = BusinessHousehold(
                code=f"HKD-{uuid.uuid4().hex[:8].upper()}",
                company_full_name=payload.name or None,
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
            db.add(new_hkd)
            db.flush()
            return new_hkd

hkd_service = HKDService()
