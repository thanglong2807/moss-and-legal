"""
Pure template rendering — knows nothing about business domain.
Supports .docx (via docxtpl) and text-based formats (.html, .txt, .md).
"""
import asyncio
import zipfile
from io import BytesIO
from pathlib import Path
from typing import Dict, Optional

from docxtpl import DocxTemplate


SUPPORTED_EXTENSIONS = ["docx", "html", "txt", "md"]


class TemplateNotFoundError(FileNotFoundError):
    pass


class TemplateAmbiguousError(RuntimeError):
    pass


def _find_template(template_dir: Path, file_id: str) -> Path:
    matches = []
    for ext in SUPPORTED_EXTENSIONS:
        matches.extend(template_dir.glob(f"{file_id}_*.{ext}"))

    if not matches:
        raise TemplateNotFoundError(f"No template found for id='{file_id}' in {template_dir}")
    if len(matches) > 1:
        raise TemplateAmbiguousError(f"Multiple templates match id='{file_id}': {[m.name for m in matches]}")

    return matches[0]


async def render_to_bytes(template_dir: Path, file_id: str, data: Dict) -> tuple[bytes, str]:
    template_path = _find_template(template_dir, file_id)
    ext = template_path.suffix.lower()

    if ext == ".docx":
        content = await _render_docx(template_path, data)
    else:
        content = await _render_text(template_path, data)

    return content, template_path.name


async def _render_docx(template_path: Path, data: Dict) -> bytes:
    def _task():
        doc = DocxTemplate(str(template_path))
        doc.render(data)

        raw = BytesIO()
        doc.save(raw)

        # Repack with DEFLATE — docxtpl saves with ZIP_STORED (uncompressed)
        compressed = BytesIO()
        with zipfile.ZipFile(BytesIO(raw.getvalue()), "r") as zin, \
             zipfile.ZipFile(compressed, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zout:
            for item in zin.infolist():
                zout.writestr(item, zin.read(item.filename))

        return compressed.getvalue()

    return await asyncio.to_thread(_task)


async def _render_text(template_path: Path, data: Dict) -> bytes:
    def _task():
        text = template_path.read_text(encoding="utf-8")
        for key, value in data.items():
            text = text.replace(f"{{{{{key}}}}}", str(value) if value is not None else "")
        return text.encode("utf-8")

    return await asyncio.to_thread(_task)
