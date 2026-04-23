"""CRM Webhook endpoint.

POST /api/v1/webhook/
Header: X-Webhook-Key: <WEBHOOK_SECRET_KEY>

Xác thực key, trả 202 ngay, đẩy xử lý vào BackgroundTasks.
Background task tự mở session riêng — không dùng session từ request.
"""
import secrets
from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, status

from app.core.config import settings
from app.core.database import SessionLocal
from app.schemas.webhook import CRMWebhookPayload
from app.services.webhook_service import process_crm_event

router = APIRouter()


def _run_in_own_session(payload: CRMWebhookPayload):
    """Mở session riêng, xử lý xong thì đóng — tránh dùng session đã closed từ request."""
    db = SessionLocal()
    try:
        process_crm_event(db, payload)
    finally:
        db.close()


@router.post(
    "/",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Nhận sự kiện từ CRM",
    description="Xác thực X-Webhook-Key, upsert dữ liệu trong background, trả 202 ngay.",
)
async def crm_webhook(
    payload: CRMWebhookPayload,
    background_tasks: BackgroundTasks,
    x_webhook_key: str = Header(default="", alias="X-Webhook-Key"),
):
    if not settings.WEBHOOK_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Webhook chưa được cấu hình")
    if not secrets.compare_digest(x_webhook_key, settings.WEBHOOK_SECRET_KEY):
        raise HTTPException(status_code=401, detail="Webhook key không hợp lệ")

    background_tasks.add_task(_run_in_own_session, payload)
    return {"message": "accepted"}
