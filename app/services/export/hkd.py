"""
HKD export service.

Flow:
  endpoint → get_full_data(db, hkd_id)  →  structured dict
           → export_templates(data, ids) →  per-template builder → docxtpl
                                         →  single .docx or .zip

To add a new template:
  1. Drop  app/templates/hkd/<id>_<description>.docx
  2. Add   @registry.register("<id>") builder below
  3. Done.
"""
from pathlib import Path
from typing import Optional

from sqlalchemy.orm import Session, joinedload

from app.models.hkd import BusinessHousehold, ProfileIndustry
from sqlalchemy import select
from app.models.master_data import AdministrativeUnit
from app.services.export.base import (
    TemplateRegistry,
    make_export_templates,
    _unit_name,
    _fmt_date,
    _join_address,
    _fmt_money_dot,
    _so_thanh_chu,
    _gender_str,
)

TEMPLATE_DIR = Path(__file__).parent.parent.parent / "templates" / "hkd"

registry = TemplateRegistry()


# ── Data loader ───────────────────────────────────────────────────────────────

def get_full_data(db: Session, hkd_id: int) -> Optional[dict]:
    hkd = (
        db.query(BusinessHousehold)
        .options(
            joinedload(BusinessHousehold.owner),
            joinedload(BusinessHousehold.province),
            joinedload(BusinessHousehold.ward),
        )
        .filter(BusinessHousehold.id == hkd_id)
        .first()
    )
    if not hkd:
        return None

    industry_links = db.execute(
        select(ProfileIndustry)
        .options(joinedload(ProfileIndustry.industry))
        .where(ProfileIndustry.profile_id == hkd_id, ProfileIndustry.service_type == "hkd")
    ).scalars().all()

    owner = hkd.owner
    o_province: Optional[AdministrativeUnit] = None
    o_ward: Optional[AdministrativeUnit] = None
    if owner:
        if owner.province_id:
            o_province = db.get(AdministrativeUnit, owner.province_id)
        if owner.ward_id:
            o_ward = db.get(AdministrativeUnit, owner.ward_id)

    return {
        "id": hkd.id,
        "code": hkd.code,
        "hkd_name": hkd.company_full_name or "",
        "company_info": {
            "name": {
                "full": hkd.company_full_name or "",
                "foreign": hkd.company_foreign_name or "",
                "short": hkd.company_short_name or "",
            },
            "address": {
                "country": "Việt Nam",
                "province": _unit_name(hkd.province) if hasattr(hkd, "province") else "",
                "ward": _unit_name(hkd.ward) if hasattr(hkd, "ward") else "",
                "street": hkd.street or "",
            },
            "contact": {
                "phone": hkd.phone or "",
                "fax": hkd.fax or "",
                "email": hkd.email or "",
                "website": hkd.website or "",
            },
            "charter_capital": hkd.charter_capital,
        },
        "owner": {
            "personal_info": {
                "full_name": owner.full_name or "" if owner else "",
                "gender": owner.gender if owner else None,
                "birth_date": _fmt_date(owner.birth_date) if owner else "",
                "id_number": owner.id_number or "" if owner else "",
            },
            "contact_address": {
                "country": "Việt Nam",
                "province": _unit_name(o_province),
                "ward": _unit_name(o_ward),
                "street": owner.street or "" if owner else "",
            },
            "contact_info": {
                "phone": owner.phone or "" if owner else "",
                "fax": owner.fax or "" if owner else "",
                "email": owner.email or "" if owner else "",
                "website": owner.website or "" if owner else "",
            },
        } if owner else None,
        "industries": [
            {
                "code": link.industry.code,
                "name": link.industry.name,
                "is_main": link.is_main,
                "note": link.note or "",
            }
            for link in industry_links
        ],
    }


# ── Address helpers ───────────────────────────────────────────────────────────

def _ward_suffix(ward_name: str) -> str:
    if not ward_name:
        return ""
    return "" if ward_name.startswith("Xã") else ", Hạ tầng và Đô thị"



# ── Data builders ─────────────────────────────────────────────────────────────

@registry.register("000")
def _build_gui_kh(data: dict) -> dict:
    owner = data.get("owner") or {}
    pi    = owner.get("personal_info", {})
    oci   = owner.get("contact_info", {})
    ca    = owner.get("contact_address", {})
    ci    = data.get("company_info", {})
    addr  = ci.get("address", {})
    name  = ci.get("name", {})
    contact = ci.get("contact", {})
    ward  = addr.get("ward", "")
    capital = ci.get("charter_capital")

    industries = [
        {
            "stt":       i + 1,
            "ten_nganh": ind.get("name", ""),
            "ghi_chu":   f"\n{ind['note']}" if ind.get("note") else "",
            "ma_nganh":  ind.get("code", ""),
            "chinh":     "X" if ind.get("is_main") else "",
        }
        for i, ind in enumerate(data.get("industries") or [])
    ]

    return {
        "cus_name":    (pi.get("full_name") or "").upper(),
        "cus_dob":     pi.get("birth_date", ""),
        "cus_gender":  _gender_str(pi.get("gender")),
        "cus_sex":     "Ông" if pi.get("gender") == 0 else "Bà",
        "cus_cccd":    pi.get("id_number", ""),
        "cus_phone":   oci.get("phone", ""),
        "cus_address": _join_address(ca.get("street", ""), ca.get("ward", ""), ca.get("province", "")),
        "hkd_phone":   contact.get("phone", ""),
        "hkd_fax":     contact.get("fax", ""),
        "hkd_web":     contact.get("website", ""),
        "hkd_email":   contact.get("email", ""),
        "suffix":      _ward_suffix(ward),
        "hkd_ward":    ward,
        "hkd_province": addr.get("province", ""),
        "hkd_name":    name.get("full", "").upper(),
        "hkd_foreign": name.get("foreign", "").upper(),
        "hkd_short":   name.get("short", "").upper(),
        "hkd_address": _join_address(addr.get("street", ""), ward, addr.get("province", "")),
        "hkd_von_so":  _fmt_money_dot(capital),
        "hkd_von_chu": _so_thanh_chu(capital),
        "industries":  industries,
    }


@registry.register("001")
def _build_giay_gioi_thieu(data: dict) -> dict:
    ci   = data.get("company_info", {})
    addr = ci.get("address", {})
    ward = addr.get("ward", "")
    return {
        "hkd_ward":     ward,
        "suffix":       _ward_suffix(ward),
        "hkd_province": addr.get("province", ""),
        "hkd_name":     ci.get("name", {}).get("full", "").upper(),
        "hkd_address":  _join_address(addr.get("street", ""), addr.get("ward", ""), addr.get("province", "")),
    }


# ── Public API ────────────────────────────────────────────────────────────────

export_templates = make_export_templates(TEMPLATE_DIR, registry, name_key="hkd_name")
