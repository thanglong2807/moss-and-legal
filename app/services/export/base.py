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

from docx import Document
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import copy

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
    s = str(d)
    # Convert iso yyyy-mm-dd → dd/mm/yyyy
    if len(s) >= 10 and s[4] == '-' and s[7] == '-':
        return f"{s[8:10]}/{s[5:7]}/{s[:4]}"
    return s


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


# ── Word merge ───────────────────────────────────────────────────────────────

def _strip_header_footer_refs(sectPr) -> None:
    """Remove header/footer references — their rIds don't resolve in merged doc."""
    for tag in (qn('w:headerReference'), qn('w:footerReference')):
        for ref in sectPr.findall(tag):
            sectPr.remove(ref)


def _inline_sectPr(base_body, sectPr_elem) -> None:
    """Place sectPr_elem (type=nextPage) into the last paragraph of base_body."""
    sectPr = copy.deepcopy(sectPr_elem) if sectPr_elem is not None else OxmlElement('w:sectPr')
    _strip_header_footer_refs(sectPr)

    type_elem = sectPr.find(qn('w:type'))
    if type_elem is None:
        type_elem = OxmlElement('w:type')
        sectPr.insert(0, type_elem)
    type_elem.set(qn('w:val'), 'nextPage')

    last_para = next((e for e in reversed(list(base_body)) if e.tag == qn('w:p')), None)
    if last_para is None:
        last_para = OxmlElement('w:p')
        base_body.append(last_para)

    pPr = last_para.find(qn('w:pPr'))
    if pPr is None:
        pPr = OxmlElement('w:pPr')
        last_para.insert(0, pPr)

    existing = pPr.find(qn('w:sectPr'))
    if existing is not None:
        pPr.remove(existing)
    pPr.append(sectPr)


def _merge_styles(base_doc: Document, src_doc: Document) -> None:
    """Copy styles + docDefaults from src_doc into base_doc (overwrite same ID)."""
    base_styles = base_doc.styles.element
    src_styles  = src_doc.styles.element

    src_defaults = src_styles.find(qn('w:docDefaults'))
    if src_defaults is not None:
        existing = base_styles.find(qn('w:docDefaults'))
        if existing is not None:
            base_styles.remove(existing)
        base_styles.insert(0, copy.deepcopy(src_defaults))

    existing_map = {s.get(qn('w:styleId')): s for s in base_styles.findall(qn('w:style'))}
    for style in src_styles.findall(qn('w:style')):
        sid = style.get(qn('w:styleId'))
        if sid in existing_map:
            base_styles.remove(existing_map[sid])
        new_style = copy.deepcopy(style)
        base_styles.append(new_style)
        existing_map[sid] = new_style


def _pin_font_sizes(doc: Document) -> None:
    """
    Make w:sz / w:szCs explicit on every run so they survive docDefaults
    changes when the document is merged into another doc with different defaults.
    Only touches w:rPr — never w:pPr — to avoid XML schema ordering issues.
    """
    styles_elem = doc.styles.element

    # Resolve docDefaults sz
    default_sz = default_szCs = None
    doc_defaults = styles_elem.find(qn('w:docDefaults'))
    if doc_defaults is not None:
        rPrDefault = doc_defaults.find(qn('w:rPrDefault'))
        if rPrDefault is not None:
            rPr_def = rPrDefault.find(qn('w:rPr'))
            if rPr_def is not None:
                sz_e   = rPr_def.find(qn('w:sz'))
                szCs_e = rPr_def.find(qn('w:szCs'))
                default_sz   = sz_e.get(qn('w:val'))   if sz_e   is not None else None
                default_szCs = szCs_e.get(qn('w:val')) if szCs_e is not None else None

    if not default_sz:
        return  # nothing to pin — no default defined

    # Build style→effective_sz map (walk basedOn chain)
    style_map = {s.get(qn('w:styleId')): s for s in styles_elem.findall(qn('w:style'))}

    def _eff_sz(style_id):
        visited: set = set()
        sid = style_id
        while sid and sid not in visited:
            visited.add(sid)
            s = style_map.get(sid)
            if s is None:
                break
            rPr = s.find(qn('w:rPr'))
            if rPr is not None:
                sz_e   = rPr.find(qn('w:sz'))
                szCs_e = rPr.find(qn('w:szCs'))
                if sz_e is not None:
                    return sz_e.get(qn('w:val')), (szCs_e.get(qn('w:val')) if szCs_e is not None else sz_e.get(qn('w:val')))
            based = s.find(qn('w:basedOn'))
            sid = based.get(qn('w:val')) if based is not None else None
        return default_sz, default_szCs or default_sz

    sz_cache: dict = {}

    for para in doc.element.body.iter(qn('w:p')):
        pPr = para.find(qn('w:pPr'))
        style_id = None
        if pPr is not None:
            ps = pPr.find(qn('w:pStyle'))
            if ps is not None:
                style_id = ps.get(qn('w:val'))

        if style_id not in sz_cache:
            sz_cache[style_id] = _eff_sz(style_id)
        eff_sz, eff_szCs = sz_cache[style_id]

        for run in para.findall(qn('w:r')):
            rPr = run.find(qn('w:rPr'))
            if rPr is None:
                rPr = OxmlElement('w:rPr')
                run.insert(0, rPr)

            if rPr.find(qn('w:sz')) is None:
                e = OxmlElement('w:sz')
                e.set(qn('w:val'), eff_sz)
                rPr.append(e)

            if rPr.find(qn('w:szCs')) is None:
                e = OxmlElement('w:szCs')
                e.set(qn('w:val'), eff_szCs)
                rPr.append(e)



def merge_docx_files(file_bytes_list: List[bytes]) -> bytes:
    """
    Merge multiple .docx files preserving fonts, styles, page orientation,
    OPC relationships (images, hyperlinks), and numbered list indices.
    Uses docxcompose for OPC-aware merging + manual style copy for fonts.

    docxcompose intentionally skips body-level CT_SectPr when appending, so
    landscape orientation is lost unless we pre-convert each doc's terminal
    sectPr to an inline sectPr inside its last paragraph before composing.
    """
    from docxcompose.composer import Composer

    if not file_bytes_list:
        raise ValueError("No files to merge")
    if len(file_bytes_list) == 1:
        return file_bytes_list[0]

    docs = [Document(io.BytesIO(raw)) for raw in file_bytes_list]
    base_doc = docs[0]

    # Copy styles from all source docs into base so fonts/spacing are preserved
    for src in docs[1:]:
        _merge_styles(base_doc, src)

    # Strip header/footer refs to prevent broken rId references in merged doc
    for doc in docs:
        for sectPr in doc.element.body.iter(qn('w:sectPr')):
            _strip_header_footer_refs(sectPr)

    for doc in docs:
        _pin_font_sizes(doc)

    # docxcompose skips body-level CT_SectPr when appending (see its insert()),
    # so landscape orientation is lost. Fix: copy each doc's terminal sectPr
    # into the last paragraph's pPr as an inline section break so docxcompose
    # copies it with the paragraph content.
    # Keep body-level terminals intact — fix_section_types() needs them to
    # compute section indices correctly; docxcompose skips them anyway.
    for doc in docs:
        body = doc.element.body
        terminal = body.find(qn('w:sectPr'))
        if terminal is not None:
            _inline_sectPr(body, terminal)

    # Replace base_doc's body-level terminal with last doc's so the final
    # section of the merged file inherits the last page's layout.
    last_terminal = docs[-1].element.body.find(qn('w:sectPr'))
    if last_terminal is not None:
        existing = base_doc.element.body.find(qn('w:sectPr'))
        new_terminal = copy.deepcopy(last_terminal)
        _strip_header_footer_refs(new_terminal)
        if existing is not None:
            base_doc.element.body.remove(existing)
        base_doc.element.body.append(new_terminal)

    composer = Composer(base_doc)
    for src_doc in docs[1:]:
        composer.append(src_doc)

    buf = io.BytesIO()
    composer.save(buf)
    return buf.getvalue()


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

def make_export_templates(template_dir: Path, reg: TemplateRegistry, code_key: str = "code", name_key: str | None = None):
    """
    Factory — returns an async export_templates(data, template_ids, is_merge) function.
    is_merge=True  → merge all .docx into one file, page-break separated, no zip.
    is_merge=False → single file returned as-is; multiple files zipped.
    """
    async def export_templates(data: dict, template_ids: List[str], is_merge: bool = False) -> tuple[bytes, str]:
        if not template_ids:
            raise HTTPException(status_code=400, detail="template_ids must not be empty")

        results: List[tuple[bytes, str]] = []
        errors: List[str] = []
        for tid in sorted(template_ids):   # sort by ID to ensure order
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

        code = data.get(code_key) 
        label = data.get(name_key, "") if name_key else ""
        name = f"HKD {label} [{code}]" if label else code

        if len(results) == 1:
            return results[0]

        if is_merge:
            merged = merge_docx_files([fb for fb, _ in results])
            return merged, f"{name}.docx"

        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            for fb, fn in results:
                zf.writestr(fn, fb)
        return buf.getvalue(), f"{name}.zip"

    return export_templates
