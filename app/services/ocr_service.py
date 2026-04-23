"""
Generic OCR service using Google Gemini Vision.

Usage:
    raw = await extract(image_bytes, mime_type, doc_type="cccd")
    fields = await map_to_form(raw, doc_type="cccd", db=db)
    # fields → {"owner_info.personal_info.full_name": "NGUYEN VAN A", ...}

Adding a new document type:
    1. Add a prompt to PROMPTS
    2. Add a mapping to FIELD_MAPS
    That's it — endpoint and FE auto-fill logic reuse this service.
"""

import asyncio
import json
import re
from typing import Optional

from sqlalchemy.orm import Session

# Cache province names loaded from DB (populated on first OCR call)
_province_names_cache: list[str] = []


def _get_province_names(db: Session) -> list[str]:
    global _province_names_cache
    if _province_names_cache:
        return _province_names_cache
    from app.models.master_data import AdministrativeUnit
    rows = db.query(AdministrativeUnit.name).filter(
        AdministrativeUnit.division_type == "PROVINCE",
        AdministrativeUnit.deleted_at == None,
    ).order_by(AdministrativeUnit.name).all()
    _province_names_cache = [r[0] for r in rows]
    return _province_names_cache

from app.core.config import settings

# ── Thinking support (only Gemini 2.5+ models) ───────────────────────────────
_THINKING_MODELS = ("gemini-2.5",)

def _supports_thinking(model: str) -> bool:
    return any(model.startswith(p) for p in _THINKING_MODELS)

def _thinking_off(types) -> dict:
    return {"thinking_config": types.ThinkingConfig(thinking_budget=0)}


# ── Lazy client (init once) ───────────────────────────────────────────────────
_client = None

def _get_client():
    global _client
    if _client is None:
        from google import genai
        _client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _client


# ── Prompts per doc type ──────────────────────────────────────────────────────
_CCCD_PROMPT_BASE = """
Đọc CCCD/CMND Việt Nam trong ảnh. Trả về JSON hợp lệ, không thêm text nào khác:
{
  "id_number": "",
  "full_name": "",
  "birth_date": "",
  "gender": "",
  "nationality": "",
  "place_of_origin": "",
  "province_name": "",
  "ward_name": "",
  "street": "",
  "expiry_date": "",
  "side": ""
}
Quy tắc:
- birth_date, expiry_date: dd/MM/yyyy
- gender: "Nam" hoặc "Nữ"
- full_name: IN HOA
- side: "front" (mặt trước) hoặc "back" (mặt sau)
- Địa chỉ liên hệ: tách thành province_name (tỉnh/thành phố), ward_name (xã/phường/thị trấn), street (số nhà, tên đường, thôn/xóm còn lại)
- province_name: chọn tên CHÍNH XÁC từ danh sách bên dưới, không thêm tiền tố "Tỉnh"/"Thành phố". Nếu không khớp thì để chuỗi rỗng ""
- Trường không đọc được hoặc không có: để chuỗi rỗng ""
""".strip()

PROMPTS: dict[str, str] = {"cccd": _CCCD_PROMPT_BASE}


def build_prompt(doc_type: str, province_names: list[str]) -> str:
    base = PROMPTS.get(doc_type, "")
    if doc_type == "cccd" and province_names:
        province_list = ", ".join(province_names)
        return f"{base}\nDanh sách tỉnh/thành phố hợp lệ: {province_list}"
    return base


# ── Field mappings: OCR key → form field path ─────────────────────────────────
FIELD_MAPS: dict[str, dict[str, str | None]] = {
    "cccd": {
        "full_name":     "owner_info.personal_info.full_name",
        "id_number":     "owner_info.personal_info.id_number",
        "birth_date":    "owner_info.personal_info.birth_date",
        "gender":        "owner_info.personal_info.gender",       # "Nam"→0 / "Nữ"→1
        # address fields resolved via DB lookup:
        "province_name": "_resolve_province",
        "district_name": "_resolve_district",
        "ward_name":     "_resolve_ward",
        "street":        "owner_info.contact_address.street",
        # not mapped to form:
        "nationality":   None,
        "place_of_origin": None,
        "expiry_date":   None,
        "side":          None,
    },
}

# Sentinel prefix for DB-resolved fields
_RESOLVE_PREFIX = "_resolve_"


# ── Value transformers ────────────────────────────────────────────────────────
def _transform(field_path: str, value: str) -> str | int | None:
    """Convert raw OCR string values to the type the form expects."""
    if value == "":
        return None
    if field_path and field_path.endswith(".gender"):
        return 0 if value.strip() == "Nam" else 1
    return value


# ── Admin unit DB lookup ──────────────────────────────────────────────────────
# Only strip province-level prefixes. Ward/district names in DB include their prefix (e.g. "Xã Quảng Đức").
_PROVINCE_PREFIXES = ["thành phố", "tỉnh", "tp."]

def _strip_admin_prefix(name: str) -> str:
    """Strip province-level prefixes only, e.g. 'Tỉnh Phú Thọ' → 'Phú Thọ'."""
    lower = name.strip().lower()
    for prefix in _PROVINCE_PREFIXES:
        if lower.startswith(prefix + " "):
            return name.strip()[len(prefix):].strip()
    return name.strip()


def _lookup_admin_unit(db: Session, name: str, division_type: Optional[str] = None) -> Optional[int]:
    """
    Find an administrative unit id by name (case-insensitive, stripped).
    Tries exact match first, then strips common prefixes (Tỉnh, Thành phố, ...).
    division_type: "PROVINCE", "DISTRICT", or "WARD"
    Returns id or None if not found.
    """
    if not name or not name.strip():
        return None

    from app.models.master_data import AdministrativeUnit
    from sqlalchemy import select, func

    def _query(name_val: str):
        stmt = select(AdministrativeUnit.id).where(
            func.lower(AdministrativeUnit.name) == func.lower(name_val)
        )
        if division_type:
            stmt = stmt.where(AdministrativeUnit.division_type == division_type)
        return db.execute(stmt).scalars().first()

    result = _query(name.strip())
    if result is None:
        result = _query(_strip_admin_prefix(name))
    return result


# ── Core extract (sync, runs in thread) ──────────────────────────────────────
def _extract_sync(image_bytes: bytes, mime_type: str, doc_type: str, province_names: list[str] = (), _retries: int = 3) -> dict:
    import time
    from google.genai import types
    from google.genai.errors import ServerError

    prompt = build_prompt(doc_type, list(province_names))
    if not prompt:
        raise ValueError(f"Không có prompt cho doc_type='{doc_type}'")

    client = _get_client()
    for attempt in range(_retries):
        try:
            response = client.models.generate_content(
                model=settings.GEMINI_OCR_MODEL,
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                    prompt,
                ],
                config=types.GenerateContentConfig(
                    temperature=0,
                    response_mime_type="application/json",
                    **(_thinking_off(types) if _supports_thinking(settings.GEMINI_OCR_MODEL) else {}),
                ),
            )
            raw = response.text.strip()
            raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw, flags=re.MULTILINE).strip()
            return json.loads(raw)
        except ServerError as e:
            if e.code == 503 and attempt < _retries - 1:
                time.sleep(2 ** attempt)  # 1s, 2s, 4s
                continue
            raise


# ── Public API ────────────────────────────────────────────────────────────────
async def extract(image_bytes: bytes, mime_type: str, doc_type: str = "cccd", db: Optional[Session] = None) -> dict:
    """
    Run OCR on image bytes. Returns raw dict with doc-specific keys.
    Pass db to inject province list into prompt for more accurate matching.
    """
    province_names = _get_province_names(db) if db else []
    return await asyncio.to_thread(_extract_sync, image_bytes, mime_type, doc_type, province_names)


def map_to_form(ocr_result: dict, doc_type: str = "cccd", db: Optional[Session] = None) -> dict:
    """
    Convert raw OCR result → {form_field_path: value} dict.
    If db is provided, resolves province/district/ward names to IDs.
    Only includes keys with a mapped path (None paths are excluded).
    FE applies this dict to update form state.
    """
    field_map = FIELD_MAPS.get(doc_type, {})
    out = {}

    for ocr_key, form_path in field_map.items():
        if form_path is None:
            continue

        raw_val = ocr_result.get(ocr_key, "")

        # DB-resolved address fields
        if form_path.startswith(_RESOLVE_PREFIX):
            if not db or not raw_val:
                continue
            resolve_type = form_path[len(_RESOLVE_PREFIX):]  # "province" / "district" / "ward"
            level_map = {
                "province": ("PROVINCE", "owner_info.contact_address.province_id"),
                "district": ("DISTRICT", "owner_info.contact_address.district_id"),
                "ward":     ("WARD",     "owner_info.contact_address.ward_id"),
            }
            if resolve_type not in level_map:
                continue
            division_type, target_path = level_map[resolve_type]
            unit_id = _lookup_admin_unit(db, raw_val, division_type=division_type)
            if unit_id is not None:
                out[target_path] = unit_id
            # if not found → skip (dropdown stays empty, user selects manually)
            continue

        transformed = _transform(form_path, raw_val)
        if transformed is not None:
            out[form_path] = transformed

    return out


def save_log(
    db: Session,
    *,
    doc_type: str,
    raw_result: dict,
    fields_result: dict,
    user_id: Optional[int] = None,
    service_type: Optional[str] = None,
    drive_file_id: Optional[str] = None,
    drive_link: Optional[str] = None,
) -> None:
    from app.models.ocr_log import OcrLog
    log = OcrLog(
        user_id=user_id,
        doc_type=doc_type,
        model_name=settings.GEMINI_OCR_MODEL,
        service_type=service_type,
        drive_file_id=drive_file_id,
        drive_link=drive_link,
        raw_result=raw_result,
        fields_result=fields_result,
    )
    db.add(log)
    db.commit()
