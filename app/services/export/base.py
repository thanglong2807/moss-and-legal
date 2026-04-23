"""
Shared utilities for all export services.

Usage in a service module:
    from app.services.export.base import (
        TemplateRegistry, make_export_templates,
        _unit_name, _fmt_date, _fmt_money, _gender_str,
    )
    registry = TemplateRegistry()
    export_templates = make_export_templates(TEMPLATE_DIR, registry)
"""

import io
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Callable, Dict, List, Optional

from fastapi import HTTPException

from app.models.master_data import AdministrativeUnit
from app.services.template_service import (
    TemplateAmbiguousError,
    TemplateNotFoundError,
    render_to_bytes,
)


# ── Shared formatting helpers ─────────────────────────────────────────────────

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


def _gender_str(g: Optional[int]) -> str:
    return {0: "Nam", 1: "Nữ"}.get(g, "")


def _join_address(street: str, ward: str, province: str) -> str:
    prefix_province = "Tỉnh "
    lst_TP = ["Hà Nội",
            "Hải Phòng",
            "Đà Nẵng",
            "Cần Thơ",
            "Huế",
            "Hồ Chí Minh"
            ]
    if province in lst_TP:
        prefix_province = "Thành phố "
    full_province = prefix_province + province
    
    parts = [p for p in [street, ward, full_province, "Việt Nam"] if p]
    return ", ".join(parts)


def _fmt_money_dot(v) -> str:
    if v is None:
        return ""
    return f"{v:,}".replace(",", ".") + " VNĐ"


def _so_thanh_chu(n: Optional[int]) -> str:
    if n is None or n == 0:
        return "Không Việt Nam Đồng"
    donvi = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"]
    hang  = ["", "nghìn", "triệu", "tỷ"]

    def _doc_ba(x: int, is_first: bool) -> str:
        tram = x // 100; chuc = (x % 100) // 10; dv = x % 10
        parts = []
        if tram:
            parts.append(f"{donvi[tram]} trăm")
            if chuc == 0 and dv: parts.append("linh")
        elif not is_first and (chuc or dv):
            parts.append("không trăm")
            if chuc == 0 and dv: parts.append("linh")
        if chuc == 1:
            parts.append("mười")
            if dv == 5: parts.append("lăm")
            elif dv: parts.append(donvi[dv])
        elif chuc > 1:
            parts.append(f"{donvi[chuc]} mươi")
            if dv == 1: parts.append("mốt")
            elif dv == 5: parts.append("lăm")
            elif dv: parts.append(donvi[dv])
        elif dv:
            parts.append(donvi[dv])
        return " ".join(parts)

    groups = []
    tmp = n
    while tmp:
        groups.append(tmp % 1000); tmp //= 1000
    groups.reverse()
    parts = []
    for i, g in enumerate(groups):
        if g == 0: continue
        level = len(groups) - 1 - i
        chunk = _doc_ba(g, i == 0)
        if level: chunk += f" {hang[level]}"
        parts.append(chunk)
    result = " ".join(parts).strip()
    return (result[0].upper() + result[1:] + " Việt Nam Đồng") if result else "Không Việt Nam Đồng"


# ── Template registry ─────────────────────────────────────────────────────────

DataBuilder = Callable[[dict], Dict]


class TemplateRegistry:
    def __init__(self):
        self._builders: Dict[str, DataBuilder] = {}

    def register(self, template_id: str):
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


# ── Generic export runner ─────────────────────────────────────────────────────

def make_export_templates(template_dir: Path, reg: TemplateRegistry, code_key: str = "code"):
    """
    Factory — returns an async export_templates(data, template_ids) function
    bound to the given template directory and registry.
    """
    async def export_templates(data: dict, template_ids: List[str]) -> tuple[bytes, str]:
        if not template_ids:
            raise HTTPException(status_code=400, detail="template_ids must not be empty")
        results: List[tuple[bytes, str]] = []
        errors: List[str] = []
        for tid in template_ids:
            try:
                tpl_data = reg.build(tid, data)
                file_bytes, filename = await render_to_bytes(template_dir, tid, tpl_data)
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
            for fb, fn in results:
                zf.writestr(fn, fb)
        ts = int(datetime.now().timestamp())
        name = data.get(code_key) or str(ts)
        return buf.getvalue(), f"{name}_{ts}.zip"

    return export_templates
