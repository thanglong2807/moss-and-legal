"""CRM Webhook endpoint.

POST /api/v1/webhook/
Header: X-Webhook-Key: <WEBHOOK_SECRET_KEY>

Xác thực key, trả 202 ngay, đẩy xử lý vào BackgroundTasks.
"""
import secrets
from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, status

from app.core.config import settings
from app.core.database import get_db
from app.schemas.webhook import CRMWebhookPayload
from app.services.webhook_service import process_crm_event

router = APIRouter()


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
    db=Depends(get_db),
):
    if not settings.WEBHOOK_SECRET_KEY or not secrets.compare_digest(
        x_webhook_key, settings.WEBHOOK_SECRET_KEY
    ):
        raise HTTPException(status_code=401, detail="Webhook key không hợp lệ")

    background_tasks.add_task(process_crm_event, db, payload)
    return {"message": "accepted"}
