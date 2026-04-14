"""
HKD export service.

Flow:
  endpoint → get_full_data(db, hkd_id)  →  HKDData (structured dict)
           → export_templates(data, ids) →  per-template builder → docxtpl
                                         →  single .docx or .zip

To add a new template:
  1. Drop  app/templates/hkd/<id>_<description>.docx
  2. Add   @registry.register("<id>") builder below
  3. Done.
"""
import io
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Callable, Dict, List, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.models.hkd import BusinessHousehold, HouseholdIndustry
from app.models.master_data import AdministrativeUnit
from app.services.template_service import (
    TemplateAmbiguousError,
    TemplateNotFoundError,
    render_to_bytes,
)

TEMPLATE_DIR = Path(__file__).parent.parent / "templates" / "hkd"


# ── structured data ───────────────────────────────────────────────────────────
# get_full_data() returns a plain dict matching the agreed JSON format.
# Builders then pull exactly the fields they need — no ORM objects leak out.

def _unit_name(unit: Optional[AdministrativeUnit]) -> str:
    return unit.name if unit else ""


def _fmt_date(d) -> str:
    if not d:
        return ""
    if hasattr(d, "strftime"):
        return d.strftime("%d/%m/%Y")
    return str(d)


def _fmt_money(v) -> str:
    if v is None:
        return ""
    return f"{v:,}".replace(",", ".")


def _gender_int(g) -> Optional[int]:
    return g  # keep as int; builders can convert to string if needed


def _build_address_dict(unit: Optional[AdministrativeUnit], street: Optional[str]) -> dict:
    """
    Build nested address dict. Province is resolved by walking up the unit tree
    only if we have the unit pre-loaded (province/ward are loaded via joinedload).
    """
    province_name = ""
    ward_name = _unit_name(unit)

    # If the unit is a ward, its parent should be the province (or district).
    # Since we load province separately via province_id, this is kept simple.
    return {
        "country": "Việt Nam",
        "province": province_name,   # filled by caller who has province loaded
        "ward": ward_name,
        "street": street or "",
    }


def get_full_data(db: Session, hkd_id: int) -> Optional[dict]:
    """
    Load an HKD record with all relations and return a structured plain dict
    that matches the agreed JSON format. Returns None if not found.
    """
    hkd = (
        db.query(BusinessHousehold)
        .options(
            joinedload(BusinessHousehold.owner),
            joinedload(BusinessHousehold.industry_links).joinedload(HouseholdIndustry.industry),
            # load province/ward for HKD
            joinedload(BusinessHousehold.province),
            joinedload(BusinessHousehold.ward),
            # load province/ward for owner via owner relationship
        )
        .filter(BusinessHousehold.id == hkd_id)
        .first()
    )
    if not hkd:
        return None

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
            for link in hkd.industry_links
        ],
    }


# ── address formatting helpers ─────────────────────────────────────────────────

def _join_address(street: str, ward: str, province: str) -> str:
    """Format: 'số 16, xã Tân Đức, tỉnh Phú Thọ'"""
    parts = [p for p in [street, ward, province] if p]
    return ", ".join(parts)


def _ward_suffix(ward_name: str) -> str:
    """Returns ', Hạ tầng và Đô thị' for non-Xã wards, '' for Xã."""
    if not ward_name:
        return ""
    return "" if ward_name.startswith("Xã") else ", Hạ tầng và Đô thị"


def _gender_str(g: Optional[int]) -> str:
    return {0: "Nam", 1: "Nữ"}.get(g, "")


def _birth_year(birth_date_str: str) -> str:
    """Extract year from dd/mm/yyyy string."""
    if not birth_date_str:
        return ""
    parts = birth_date_str.split("/")
    return parts[-1] if len(parts) == 3 else ""


def _fmt_money_dot(v) -> str:
    """300000000 → '300.000.000 VNĐ'"""
    if v is None:
        return ""
    return f"{v:,}".replace(",", ".") + " VNĐ"


def _so_thanh_chu(n: Optional[int]) -> str:
    """Convert integer to Vietnamese words. E.g. 300_000_000 → 'Ba trăm triệu đồng'."""
    if n is None or n == 0:
        return "Không Việt Nam Đồng"

    donvi  = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"]
    hang   = ["", "nghìn", "triệu", "tỷ"]

    def _doc_ba_chu_so(x: int, is_first_group: bool) -> str:
        """Read a 3-digit group (0–999)."""
        tram  = x // 100
        chuc  = (x % 100) // 10
        dv    = x % 10
        parts = []

        if tram:
            parts.append(f"{donvi[tram]} trăm")
            if chuc == 0 and dv:
                parts.append("linh")
        elif not is_first_group and (chuc or dv):
            parts.append("không trăm")
            if chuc == 0 and dv:
                parts.append("linh")

        if chuc == 1:
            parts.append("mười")
            if dv == 5:
                parts.append("lăm")
            elif dv:
                parts.append(donvi[dv])
        elif chuc > 1:
            parts.append(f"{donvi[chuc]} mươi")
            if dv == 1:
                parts.append("mốt")
            elif dv == 5:
                parts.append("lăm")
            elif dv:
                parts.append(donvi[dv])
        elif dv:
            parts.append(donvi[dv])

        return " ".join(parts)

    # Split into groups of 3 digits right-to-left
    groups = []
    tmp = n
    while tmp:
        groups.append(tmp % 1000)
        tmp //= 1000
    groups.reverse()

    parts = []
    for i, g in enumerate(groups):
        if g == 0:
            continue
        level = len(groups) - 1 - i
        is_first = (i == 0)
        chunk = _doc_ba_chu_so(g, is_first)
        if level:
            chunk += f" {hang[level]}"
        parts.append(chunk)

    result = " ".join(parts).strip()
    # Capitalise first letter
    return result[0].upper() + result[1:] + " Việt Nam Đồng" if result else "Không Việt Nam Đồng"


# ── registry ─────────────────────────────────────────────────────────────────

DataBuilder = Callable[[dict], Dict]


class _TemplateRegistry:
    def __init__(self):
        self._builders: Dict[str, DataBuilder] = {}

    def register(self, template_id: str):
        """Decorator — builder receives the plain HKDData dict."""
        def decorator(fn: DataBuilder) -> DataBuilder:
            self._builders[template_id] = fn
            return fn
        return decorator

    def build(self, template_id: str, data: dict) -> Dict:
        builder = self._builders.get(template_id)
        if builder is None:
            raise HTTPException(
                status_code=400,
                detail=f"No data builder registered for template_id='{template_id}'",
            )
        return builder(data)

    @property
    def registered_ids(self) -> List[str]:
        return list(self._builders.keys())


registry = _TemplateRegistry()


# ── data builders ─────────────────────────────────────────────────────────────
# Builders receive the structured dict from get_full_data().
# Variable names must match {{ placeholders }} in the .docx template.

@registry.register("000")
def _build_gui_kh(data: dict) -> Dict:
    owner  = data.get("owner") or {}
    pi     = owner.get("personal_info", {})
    oci    = owner.get("contact_info", {})
    ca = owner.get("contact_address", {})
    ci     = data.get("company_info", {})
    addr   = ci.get("address", {})
    name   = ci.get("name", {})
    contact = ci.get("contact", {})

    ward   = addr.get("ward", "")
    capital = ci.get("charter_capital")

    industries = [
        {
            "stt":      i + 1,
            "ten_nganh": ind.get("name", ""),
            "ghi_chu": f"\n({ind['note']})" if ind.get("note") else "",
            "ma_nganh": ind.get("code", ""),
            "chinh":    "X" if ind.get("is_main") else "",
        }
        for i, ind in enumerate(data.get("industries") or [])
    ]

    return {
        
        "cus_name":    (pi.get("full_name") or "").upper(),
        "cus_dob":     pi.get("birth_date", ""),
        "cus_gender":  _gender_str(pi.get("gender")),
        "cus_sex": "Ông" if (pi.get("gender") == 0) else "Bà",
        "cus_cccd":    pi.get("id_number", ""),
        "cus_phone":   oci.get("phone", ""),
        "cus_address": _join_address(
            ca.get("street", ""), ca.get("ward", ""), ca.get("province", "")
        ),
        "hkd_phone": ci.get("phone", ""),
        "hkd_email":   contact.get("email", ""),
        "suffix":      _ward_suffix(ward),
        "hkd_ward":    ward,
        "hkd_name":    name.get("full", "").upper(),
        "hkd_foreign": name.get("foreign", "").upper(),
        "hkd_short":   name.get("short", "").upper(),
        "hkd_address": _join_address(addr.get("street", ""), ward, addr.get("province", "")),
        "hkd_von_so":  _fmt_money_dot(capital),
        "hkd_von_chu": _so_thanh_chu(capital),
        "industries":  industries,
    }

@registry.register("001")
def _build_giay_gioi_thieu_base(data: dict) -> Dict:
    """Shared logic cho 003 và 004."""
    ci = data.get("company_info", {})
    addr = ci.get("address", {})
    ward = addr.get("ward", "")
    return {
        "hkd_ward": ward,
        "suffix": _ward_suffix(ward),
        "hkd_name": ci.get("name", {}).get("full", "").upper(),
        "hkd_address": _join_address(
            addr.get("street", ""), addr.get("ward", ""), addr.get("province", "")
        ),
    }
# @registry.register("000")
# def _build_huong_dan_ky(data: dict) -> Dict:
#     """Hướng dẫn ký"""
#     owner = data.get("owner") or {}
#     pi = owner.get("personal_info", {})
#     return {
#         "cus_sex": "Ông" if (pi.get("gender") == 0) else "Bà",
#         "cus_name": (pi.get("full_name") or "").upper(),
#     }


# @registry.register("001")
# def _build_giay_de_nghi(data: dict) -> Dict:
#     """Giấy đề nghị đăng ký hộ kinh doanh"""
#     owner  = data.get("owner") or {}
#     pi     = owner.get("personal_info", {})
#     oci    = owner.get("contact_info", {})

#     ci     = data.get("company_info", {})
#     addr   = ci.get("address", {})
#     name   = ci.get("name", {})
#     contact = ci.get("contact", {})

#     ward   = addr.get("ward", "")
#     capital = ci.get("charter_capital")

#     industries = [
#         {
#             "stt":      i + 1,
#             "ten_nganh": ind.get("name", ""),
#             "ghi_chu": f"\n({ind['note']})" if ind.get("note") else "",
#             "ma_nganh": ind.get("code", ""),
#             "chinh":    "X" if ind.get("is_main") else "",
#         }
#         for i, ind in enumerate(data.get("industries") or [])
#     ]

#     return {
#         "cus_name":    (pi.get("full_name") or "").upper(),
#         "cus_dob":     _birth_year(pi.get("birth_date", "")),
#         "cus_gender":  _gender_str(pi.get("gender")),
#         "cus_cccd":    pi.get("id_number", ""),
#         "cus_phone":   oci.get("phone", ""),
#         "hkd_email":   contact.get("email", ""),
#         "suffix":      _ward_suffix(ward),
#         "hkd_ward":    ward,
#         "hkd_name":    name.get("full", ""),
#         "hkd_foreign": name.get("foreign", ""),
#         "hkd_short":   name.get("short", ""),
#         "hkd_address": _join_address(addr.get("street", ""), ward, addr.get("province", "")),
#         "hkd_von_so":  _fmt_money_dot(capital),
#         "hkd_von_chu": _so_thanh_chu(capital),
#         "industries":  industries,
#     }


# @registry.register("002")
# def _build_hop_dong_dv(data: dict) -> Dict:
#     """Hợp đồng và xác nhận dịch vụ"""
#     owner = data.get("owner") or {}
#     pi = owner.get("personal_info", {})
#     ca = owner.get("contact_address", {})
#     ci = owner.get("contact_info", {})
#     return {
#         "cus_name": (pi.get("full_name") or "").upper(),
#         "cus_dob": _birth_year(pi.get("birth_date", "")),
#         "cus_cccd": pi.get("id_number", ""),
#         "cus_address": _join_address(
#             ca.get("street", ""), ca.get("ward", ""), ca.get("province", "")
#         ),
#         "cus_phone": ci.get("phone", ""),
#     }


# def _build_giay_gioi_thieu_base(data: dict) -> Dict:
#     """Shared logic cho 003 và 004."""
#     ci = data.get("company_info", {})
#     addr = ci.get("address", {})
#     ward = addr.get("ward", "")
#     return {
#         "hkd_ward": ward,
#         "suffix": _ward_suffix(ward),
#         "hkd_name": ci.get("name", {}).get("full", "").upper(),
#         "hkd_address": _join_address(
#             addr.get("street", ""), addr.get("ward", ""), addr.get("province", "")
#         ),
#     }


# @registry.register("003")
# def _build_giay_gioi_thieu_nhan(data: dict) -> Dict:
#     """Giấy giới thiệu nhận"""
#     return _build_giay_gioi_thieu_base(data)


# @registry.register("004")
# def _build_giay_gioi_thieu_nop(data: dict) -> Dict:
#     """Giấy giới thiệu nộp — cùng cấu trúc với 003"""
#     return _build_giay_gioi_thieu_base(data)


# ── public API ────────────────────────────────────────────────────────────────

async def export_templates(data: dict, template_ids: List[str]) -> tuple[bytes, str]:
    """
    Render one or more templates for an HKD data dict.

    Returns:
        (bytes, filename)  — single .docx or .zip for multiple files
    """
    if not template_ids:
        raise HTTPException(status_code=400, detail="template_ids must not be empty")

    results: List[tuple[bytes, str]] = []
    errors: List[str] = []

    for tid in template_ids:
        try:
            template_data = registry.build(tid, data)
            file_bytes, filename = await render_to_bytes(TEMPLATE_DIR, tid, template_data)
            results.append((file_bytes, filename))
        except (TemplateNotFoundError, TemplateAmbiguousError) as e:
            errors.append(str(e))
        except HTTPException:
            raise
        except Exception as e:
            errors.append(f"[{tid}] {e}")

    if errors:
        raise HTTPException(status_code=500, detail="; ".join(errors))

    if len(results) == 1:
        return results[0]

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for file_bytes, filename in results:
            zf.writestr(filename, file_bytes)
    ts = int(datetime.now().timestamp())
    hkd_name = data['company_info']['name']['full'] or data['code']
    return buf.getvalue(), f"HKD_{hkd_name}_{ts}.zip"

