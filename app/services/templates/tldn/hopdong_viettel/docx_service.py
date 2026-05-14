from pathlib import Path
from app.services.template_service import render_to_bytes

TEMPLATE_DIR = Path(__file__).parents[4] / "templates" / "tldn" / "Hopdong" / "viettel"

FILE_MAP = {
    "PYC1Y":  "001",
    "PYC3Y":  "002",
    "BBXNDL": "003",
}

VALID_KEYS = list(FILE_MAP.keys())


async def render_viettel_docx(file_key: str, data: dict) -> tuple[bytes, str]:
    file_id = FILE_MAP[file_key]
    return await render_to_bytes(TEMPLATE_DIR, file_id, data)
