"""
TLDN (company) export service.

Templates live in app/templates/tldn/{LLC1,LLC2,JSC}/.
File naming convention per folder:
  LLC1  → 000_<name>.docx   (underscore)
  LLC2  → 00. <NAME>.docx   (dot-space, uppercase)
  JSC   → 00. <NAME>.docx   (dot-space, uppercase)

`_find_template` does a prefix glob so naming is flexible.
"""
import copy
import csv
import io
import zipfile
from datetime import datetime
from pathlib import Path
from docxtpl import DocxTemplate
from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select

from app.models.company import Company, CompanyPerson
from app.models.hkd import ProfileIndustry
from app.services.export.base import (
    _join_address,
    _fmt_money_dot,
    _so_thanh_chu,
    _gender_str,
    _fmt_date,
)

TEMPLATE_BASE = Path(__file__).parent.parent.parent / "templates" / "tldn"
DATA_DIR = Path(__file__).parent.parent.parent.parent / "data"

_TYPE_DIR = {1: "LLC1", 2: "LLC2", 3: "JSC"}

# ── Phòng ĐKKD lookup ─────────────────────────────────────────────────────────

_PDKKD_MAP: dict[str, str] = {}

def _load_pdkkd_csv():
    csv_path = DATA_DIR / "Danh_sach_Phong_DKKD.csv"
    if not csv_path.exists():
        return
    with open(csv_path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            province = row.get("Tinh_Thanh_Pho", "").strip()
            phong = row.get("Ten_Phong", "").strip()
            if province and phong:
                _PDKKD_MAP[province] = phong

_load_pdkkd_csv()


def _get_pdkkd(province: str) -> str:
    province = province.strip()
    for full_name, phong in _PDKKD_MAP.items():
        if province.lower() in full_name.lower():
            return f"{phong} {full_name}"
    return f"Phòng Đăng ký kinh doanh Tỉnh {province}"


# ── Template finder ───────────────────────────────────────────────────────────

def _find_template(subdir: Path, file_id: str) -> Path:
    # Try underscore pattern first (LLC1), then dot-space pattern (LLC2/JSC)
    candidates = list(subdir.glob(f"{file_id}_*.docx")) + list(subdir.glob(f"{file_id}. *.docx")) + list(subdir.glob(f"{file_id}.*.docx"))
    if not candidates:
        raise HTTPException(status_code=404, detail=f"Template không tồn tại: {file_id} trong {subdir.name}")
    return candidates[0]


async def _render_docx_bytes(template_path: Path, data: dict) -> tuple[bytes, str]:
    import asyncio

    def _task():
        doc = DocxTemplate(str(template_path))
        doc.render(data)
        raw = io.BytesIO()
        doc.save(raw)
        # Repack with DEFLATE compression
        compressed = io.BytesIO()
        with zipfile.ZipFile(io.BytesIO(raw.getvalue()), "r") as zin, \
             zipfile.ZipFile(compressed, "w", zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                zout.writestr(item, zin.read(item.filename))
        return compressed.getvalue()

    content = await asyncio.to_thread(_task)
    return content, template_path.name


# ── Data transformer ──────────────────────────────────────────────────────────

_EMPTY_PERSON = {
    "position": {"value": None, "text": ""},
    "personal_info": {"full_name": "", "gender": "", "birth_date": "", "id_number": ""},
    "contact_address": {"country": "Việt Nam", "province": "", "ward": "", "street": ""},
    "contact_info": {"phone": "", "fax": "", "email": "", "website": ""},
    "capital_contribution": {"ownership_percentage": 0, "asset_type_ratio": 0},
    "full_address": "",
}


def _fill_person(person: dict) -> dict:
    """Return person dict with all required keys guaranteed (deep-merged with empty template)."""
    result = copy.deepcopy(_EMPTY_PERSON)
    for k, v in person.items():
        if isinstance(v, dict) and isinstance(result.get(k), dict):
            result[k].update(v)
        else:
            result[k] = v
    return result


def _process_person(person: dict) -> None:
    """Mutate person dict in-place: resolve gender string + full_address."""
    pi = person.get("personal_info", {})
    pi["gender"] = _gender_str(pi.get("gender") if isinstance(pi.get("gender"), int) else None)
    addr = person.get("contact_address") or {}
    person["full_address"] = _join_address(
        addr.get("street", ""),
        addr.get("ward", ""),
        addr.get("province", ""),
    )


def process_data(raw: dict) -> dict:
    """
    Transform raw FE data into template context.
    Returns a new dict (does not mutate input).
    """
    data = copy.deepcopy(raw)
    ctype = data.get("company_type", 1)

    # Company address
    ci = data["company_info"]
    ci["full_address"] = _join_address(
        ci["address"].get("street", ""),
        ci["address"].get("ward", ""),
        ci["address"].get("province", ""),
    )

    # Charter capital — keep raw amount for calculations before formatting
    amount = data.get("charter_capital", {}).get("info", {}).get("amount") or 0
    data["charter_capital"]["info"]["amount"] = _fmt_money_dot(amount)
    data["charter_capital"]["info"]["text"] = _so_thanh_chu(amount)
    data["charter_capital"]["info"]["count"] = f"{round(amount / 10000):,}".replace(",", ".")

    def _set_capital_amount(person: dict) -> None:
        pct = person.get("capital_contribution", {}).get("ownership_percentage") or 0
        raw = int(round(amount * pct / 100))
        person["capital_contribution"]["capital_amount"] = _fmt_money_dot(raw)
        person["capital_contribution"]["capital_amount_text"] = _so_thanh_chu(raw)

    # Representatives — fill + process
    reps = [_fill_person(r) for r in (data.get("representatives") or [])]
    for rep in reps:
        _process_person(rep)
    data["representatives"] = reps

    # Owner / members / founders
    condition_cshhl = False
    lst_cshhl = []

    if ctype == 1:
        raw_owner = data.get("owner") or {}
        owner = _fill_person(raw_owner)
        _process_person(owner)
        _set_capital_amount(owner)
        data["owner"] = owner
        condition_cshhl = True
        lst_cshhl.append(owner)
    else:
        key = "members" if ctype == 2 else "founders"
        persons = [_fill_person(p) for p in (data.get(key) or [])]
        for person in persons:
            _process_person(person)
            _set_capital_amount(person)
            pct = person.get("capital_contribution", {}).get("ownership_percentage", 0) or 0
            if pct >= 25:
                condition_cshhl = True
                lst_cshhl.append(person)
        data[key] = persons

    # Pick first CEO-level rep
    rep_ceo = None
    for rep in reps:
        pos_text = rep.get("position", {}).get("text", "")
        if not rep_ceo and (pos_text.lower() == "giám đốc" or pos_text.lower() == "tổng giám đốc"):
            rep_ceo = rep
    if rep_ceo is None and reps:
        rep_ceo = reps[0]
    if rep_ceo is None:
        rep_ceo = _fill_person({})

    # Industries — add stt (index) required by templates
    data["industries"] = [
        {
            "stt": i + 1,
            "ten_nganh": ind.get("name", ""),
            "ma_nganh": ind.get("code", ""),
            "ghi_chu": f"\n({ind['note']})" if ind.get("note") else "",
            "chinh": "X" if ind.get("is_main") else "",
        }
        for i, ind in enumerate(data.get("industries") or [])
    ]

    # Phòng ĐKKD
    province = ci["address"].get("province", "")
    data["pdkkd"] = _get_pdkkd(province)

    # First representative (required by templates)
    data["rep"] = reps[0] if reps else rep_ceo
    data["rep_ceo"] = rep_ceo
    data["condition_cshhl"] = condition_cshhl
    data["beneficial_owners"] = lst_cshhl

    # Taxpayer (người nộp hồ sơ = NV xử lý) — full structure required by 003 template
    tax = data.get("tax", {})
    acc = tax.get("accounting", {})
    taxpayer_raw = data.get("taxpayer") or {}
    data["taxpayer"] = {
        "full_name": taxpayer_raw.get("full_name") or acc.get("full_name", ""),
        "gender": taxpayer_raw.get("gender", ""),
        "id_number": taxpayer_raw.get("id_number", ""),
        "full_address": taxpayer_raw.get("full_address", ""),
        "contact_info": {
            "phone": taxpayer_raw.get("phone") or acc.get("phone", ""),
            "email": taxpayer_raw.get("email", ""),
            "fax": "",
            "website": "",
        },
    }

    return data


# ── DB loader ─────────────────────────────────────────────────────────────────

def _person_to_dict(p: CompanyPerson) -> dict:
    return {
        "position": {
            "value": p.position_id,
            "text": p.position.name if p.position else "",
        },
        "personal_info": {
            "full_name": p.full_name or "",
            "gender": p.gender,
            "birth_date": _fmt_date(p.birth_date),
            "id_number": p.id_number or "",
        },
        "contact_address": {
            "country": "Việt Nam",
            "province": p.province.name if p.province else "",
            "ward": p.ward.name if p.ward else "",
            "street": p.street or "",
        },
        "contact_info": {
            "phone": p.phone or "",
            "fax": p.fax or "",
            "email": p.email or "",
            "website": "",
        },
        "capital_contribution": {
            "ownership_percentage": p.ownership_percentage or 0,
            "asset_type_ratio": p.asset_type_ratio or 0,
        },
    }


def _get_taxpayer(current_user) -> dict:
    """
    Xác định taxpayer (người nộp hồ sơ) từ user đang đăng nhập:
    - Lấy manager của current_user
    - Nếu manager có role_id == 4 → dùng manager làm taxpayer
    - Ngược lại kiểm tra chính current_user có role_id == 4 không
    - Fallback: trả về empty dict
    """
    empty = {"full_name": "", "gender": "", "id_number": "", "full_address": "", "phone": "", "email": ""}

    def _user_to_taxpayer(u) -> dict:
        return {
            "full_name": u.display_name or "",
            "gender": {0: "Nam", 1: "Nữ"}.get(u.gender, ""),
            "id_number": u.id_number or "",
            "full_address": u.address or "",
            "phone": u.phone or "",
            "email": u.email or "",
        }

    manager = getattr(current_user, "manager", None)
    if manager and manager.role_id == 4:
        return _user_to_taxpayer(manager)

    if getattr(current_user, "role_id", None) == 4:
        return _user_to_taxpayer(current_user)

    return empty


def get_full_data(db: Session, company_id: int) -> dict:
    company = db.execute(
        select(Company)
        .options(
            joinedload(Company.province),
            joinedload(Company.ward),
            joinedload(Company.handling_staff),
            joinedload(Company.persons).joinedload(CompanyPerson.position),
            joinedload(Company.persons).joinedload(CompanyPerson.province),
            joinedload(Company.persons).joinedload(CompanyPerson.ward),
        )
        .where(Company.id == company_id, Company.deleted_at.is_(None))
    ).scalars().first()

    if not company:
        raise HTTPException(status_code=404, detail="Không tìm thấy công ty")

    # Load industries
    industry_links = db.execute(
        select(ProfileIndustry)
        .options(joinedload(ProfileIndustry.industry))
        .where(ProfileIndustry.profile_id == company_id, ProfileIndustry.service_type == "company")
    ).scalars().all()

    persons_by_type: dict[str, list] = {"representative": [], "member": [], "owner": [], "founder": []}
    for p in company.persons:
        pt = p.person_type
        if pt in persons_by_type:
            persons_by_type[pt].append(_person_to_dict(p))

    ctype = company.company_type
    data: dict = {
        "company_type": ctype,
        "code": company.code,
        "company_info": {
            "name": {
                "full": company.company_full_name or "",
                "foreign": company.company_foreign_name or "",
                "short": company.company_short_name or "",
            },
            "address": {
                "country": "Việt Nam",
                "province": company.province.name if company.province else "",
                "ward": company.ward.name if company.ward else "",
                "street": company.street or "",
            },
            "contact": {
                "phone": company.phone or "",
                "fax": company.fax or "",
                "email": company.email or "",
                "website": company.website or "",
            },
        },
        "charter_capital": {"info": {"amount": company.charter_capital or 0, "text": ""}},
        "representatives": persons_by_type["representative"],
        "industries": [
            {
                "code": lnk.industry.code,
                "name": lnk.industry.name,
                "is_main": lnk.is_main,
                "note": lnk.note or "",
            }
            for lnk in industry_links
        ],
        "tax": {
            "accounting": {
                "full_name": company.accounting_name or "",
                "phone": company.accounting_phone or "",
            }
        },
        "taxpayer": {},  # filled by export_company_docs with current_user
    }

    if ctype == 1:
        owners = persons_by_type["owner"]
        data["owner"] = owners[0] if owners else {}
    elif ctype == 2:
        data["members"] = persons_by_type["member"]
    else:
        data["founders"] = persons_by_type["founder"]

    return data


# ── Export runner ─────────────────────────────────────────────────────────────

async def export_company_docs(db: Session, company_id: int, template_ids: list[str], current_user=None) -> tuple[bytes, str]:
    raw = get_full_data(db, company_id)
    raw["taxpayer"] = _get_taxpayer(current_user) if current_user else {}
    ctype = raw.get("company_type", 1)
    subdir_name = _TYPE_DIR.get(ctype)
    if not subdir_name:
        raise HTTPException(status_code=400, detail=f"company_type không hợp lệ: {ctype}")

    subdir = TEMPLATE_BASE / subdir_name
    data = process_data(raw)

    results: list[tuple[bytes, str]] = []
    for tid in template_ids:
        tpl_path = _find_template(subdir, tid)
        content, filename = await _render_docx_bytes(tpl_path, data)
        results.append((content, filename))

    if len(results) == 1:
        return results[0]

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for fb, fn in results:
            zf.writestr(fn, fb)
    _TYPE_PREFIX = {1: "CÔNG TY TNHH", 2: "CÔNG TY TNHH", 3: "CÔNG TY CỔ PHẦN"}
    prefix = _TYPE_PREFIX.get(ctype, "CÔNG TY")
    company_name = raw.get("company_info", {}).get("name", {}).get("full", "") or raw.get("code", "")
    ts = int(datetime.now().timestamp())
    zip_name = f"{prefix} {company_name}.zip" if company_name else f"{raw.get('code', str(ts))}.zip"
    return buf.getvalue(), zip_name
