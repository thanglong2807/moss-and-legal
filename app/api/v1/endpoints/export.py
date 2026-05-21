from pathlib import Path
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.hkd_export_service import export_templates, get_full_data, registry, TEMPLATE_DIR
from app.auth.dependencies import require_permission, get_current_user
from app.services.template_service import render_to_bytes
from app.services.export.base import merge_docx_files, TemplateRegistry

router = APIRouter()


class ExportRequest(BaseModel):
    template_ids: list[str]         # system IDs (e.g. "000") or tenant IDs (e.g. "t1_abc123")
    is_merge: bool = False

    @field_validator("template_ids")
    @classmethod
    def must_not_be_empty(cls, v):
        if not v:
            raise ValueError("template_ids must contain at least one ID")
        return v


@router.get("/templates", summary="List available template IDs (system + tenant custom)")
def list_templates(
    current_user=Depends(require_permission("hkd", "view")),
    db: Session = Depends(get_db),
):
    """Trả về danh sách template: system defaults + custom của tenant."""
    system = [{"id": tid, "name": tid, "source": "system"} for tid in registry.registered_ids]

    custom = []
    if not current_user.is_super_admin and current_user.tenant_id:
        from app.models.tenant_config import TenantDocumentType
        rows = db.execute(
            select(TenantDocumentType).where(
                TenantDocumentType.tenant_id == current_user.tenant_id,
                TenantDocumentType.category == "hkd",
                TenantDocumentType.is_active == True,
                TenantDocumentType.template_path.isnot(None),
                TenantDocumentType.deleted_at.is_(None),
            ).order_by(TenantDocumentType.sort_order, TenantDocumentType.id)
        ).scalars().all()
        custom = [
            {"id": r.template_key, "name": r.name, "source": "custom", "doc_type_id": r.id}
            for r in rows
        ]

    return {"template_ids": [t["id"] for t in system], "templates": system + custom}


@router.post("/hkd/{hkd_id}", summary="Export HKD documents by template IDs")
async def export_hkd(
    hkd_id: int,
    body: ExportRequest,
    current_user=Depends(require_permission("hkd", "view")),
    db: Session = Depends(get_db),
):
    data = get_full_data(db, hkd_id)
    if not data:
        raise HTTPException(status_code=404, detail="HKD not found")

    # Inject firm variables từ tenant profile
    if not current_user.is_super_admin and current_user.tenant_id:
        from app.models.tenant_config import TenantProfile
        from app.api.v1.endpoints.tenant_config import _build_export_vars
        profile = db.execute(
            select(TenantProfile).where(TenantProfile.tenant_id == current_user.tenant_id)
        ).scalars().first()
        data.update(_build_export_vars(profile))

    # Phân tách system IDs và custom IDs (custom bắt đầu bằng "t<tenant_id>_")
    system_ids = []
    custom_ids = []
    if not current_user.is_super_admin and current_user.tenant_id:
        prefix = f"t{current_user.tenant_id}_"
        for tid in body.template_ids:
            if tid.startswith(prefix):
                custom_ids.append(tid)
            else:
                system_ids.append(tid)
    else:
        system_ids = body.template_ids

    all_results: list[tuple[bytes, str]] = []

    # Xuất system templates
    if system_ids:
        sys_bytes, sys_name = await export_templates(data, system_ids, is_merge=False)
        if sys_name.endswith(".zip"):
            # Unpack zip để gộp sau
            import zipfile, io
            with zipfile.ZipFile(io.BytesIO(sys_bytes)) as zf:
                for name in zf.namelist():
                    all_results.append((zf.read(name), name))
        else:
            all_results.append((sys_bytes, sys_name))

    # Xuất custom templates
    if custom_ids and not current_user.is_super_admin and current_user.tenant_id:
        from app.models.tenant_config import TenantDocumentType
        for tid in custom_ids:
            row = db.execute(
                select(TenantDocumentType).where(
                    TenantDocumentType.template_key == tid,
                    TenantDocumentType.tenant_id == current_user.tenant_id,
                    TenantDocumentType.deleted_at.is_(None),
                )
            ).scalars().first()
            if not row or not row.template_path:
                raise HTTPException(status_code=400, detail=f"Template '{tid}' chưa có file. Vui lòng upload trước.")
            tpl_dir = Path(row.template_path).parent
            tpl_key = Path(row.template_path).stem  # dùng stem làm id khi render
            try:
                file_bytes, fn = await render_to_bytes(tpl_dir, tpl_key, data)
                all_results.append((file_bytes, fn))
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Lỗi render template '{row.name}': {e}")

    if not all_results:
        raise HTTPException(status_code=400, detail="Không có template nào để xuất")

    # Build final output
    code = data.get("code", str(hkd_id))
    name = data.get("hkd_name", code)

    if body.is_merge and len(all_results) > 1:
        merged = merge_docx_files([fb for fb, _ in all_results])
        file_bytes = merged
        filename = f"HKD {name} [{code}].docx"
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    elif len(all_results) == 1:
        file_bytes, filename = all_results[0]
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    else:
        import zipfile, io
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            for fb, fn in all_results:
                zf.writestr(fn, fb)
        file_bytes = buf.getvalue()
        filename = f"HKD {name} [{code}].zip"
        media_type = "application/zip"

    return Response(
        content=file_bytes,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(filename)}"},
    )
