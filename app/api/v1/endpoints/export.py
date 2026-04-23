from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.hkd_export_service import export_templates, get_full_data, registry
from app.auth.dependencies import require_permission

router = APIRouter()


class ExportRequest(BaseModel):
    template_ids: list[str]

    @field_validator("template_ids")
    @classmethod
    def must_not_be_empty(cls, v):
        if not v:
            raise ValueError("template_ids must contain at least one ID")
        return v


@router.get("/templates", summary="List available template IDs", dependencies=[Depends(require_permission("hkd", "view"))])
def list_templates():
    return {"template_ids": registry.registered_ids}


@router.post("/hkd/{hkd_id}", summary="Export HKD documents by template IDs", dependencies=[Depends(require_permission("hkd", "view"))])
async def export_hkd(
    hkd_id: int,
    body: ExportRequest,
    db: Session = Depends(get_db),
):
    data = get_full_data(db, hkd_id)
    if not data:
        raise HTTPException(status_code=404, detail="HKD not found")

    file_bytes, filename = await export_templates(data, body.template_ids)

    is_zip = filename.endswith(".zip")
    media_type = (
        "application/zip"
        if is_zip
        else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
    filename_encoded = quote(filename)

    return Response(
        content=file_bytes,
        media_type=media_type,
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{filename_encoded}"
        },
    )
