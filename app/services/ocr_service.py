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
PROMPTS: dict[str, str] = {
    "cccd": """
Đọc CCCD/CMND Việt Nam trong ảnh. Trả về JSON hợp lệ, không thêm text nào khác:
{
  "id_number": "",
  "full_name": "",
  "birth_date": "",
  "gender": "",
  "nationality": "",
  "place_of_origin": "",
  "province_name": "",
  "district_name": "",
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
- Địa chỉ thường trú: tách thành province_name (tỉnh/thành phố), district_name (huyện/quận), ward_name (xã/phường/thị trấn), street (số nhà, tên đường, thôn/xóm còn lại)
- Trường không đọc được hoặc không có: để chuỗi rỗng ""
""".strip(),
}


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
def _lookup_admin_unit(db: Session, name: str, division_type: Optional[str] = None) -> Optional[int]:
    """
    Find an administrative unit id by name (case-insensitive, stripped).
    division_type: "PROVINCE", "DISTRICT", or "WARD"
    Returns id or None if not found.
    """
    if not name or not name.strip():
        return None

    from app.models.master_data import AdministrativeUnit
    from sqlalchemy import select, func

    name_clean = name.strip()
    stmt = select(AdministrativeUnit.id).where(
        func.lower(AdministrativeUnit.name) == func.lower(name_clean)
    )
    if division_type:
        stmt = stmt.where(AdministrativeUnit.division_type == division_type)

    result = db.execute(stmt).scalars().first()
    return result


# ── Core extract (sync, runs in thread) ──────────────────────────────────────
def _extract_sync(image_bytes: bytes, mime_type: str, doc_type: str) -> dict:
    from google.genai import types

    prompt = PROMPTS.get(doc_type)
    if not prompt:
        raise ValueError(f"Không có prompt cho doc_type='{doc_type}'")

    client = _get_client()
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
    # Strip markdown fences in case model ignores response_mime_type
    raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw, flags=re.MULTILINE).strip()
    return json.loads(raw)


# ── Public API ────────────────────────────────────────────────────────────────
async def extract(image_bytes: bytes, mime_type: str, doc_type: str = "cccd") -> dict:
    """
    Run OCR on image bytes. Returns raw dict with doc-specific keys.
    Runs in a thread so it doesn't block the event loop.
    """
    return await asyncio.to_thread(_extract_sync, image_bytes, mime_type, doc_type)


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
