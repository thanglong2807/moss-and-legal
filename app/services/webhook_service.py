"""Xử lý logic nghiệp vụ cho CRM webhook events."""
import logging
from sqlalchemy.orm import Session

from app.schemas.webhook import CRMWebhookPayload
from app.services.config_service import config_service
from app.services.customer_service import customer_service
from app.services.hkd_service import hkd_service

logger = logging.getLogger(__name__)


def _handle_hkd(db: Session, payload: CRMWebhookPayload) -> None:
    # 1. Source
    source = config_service.get_or_create_source(db, payload.source)

    # 2. Customer
    customer = customer_service.upsert_from_crm(
        db,
        id_kh=payload.id_kh,
        name=payload.name,
        phone=payload.phone,
        source_id=source.id if source else None,
    )

    # 3. Staff
    sale    = config_service.get_or_create_staff(db, payload.nv_sale)    if (payload.nv_sale    or "").strip() else None
    support = config_service.get_or_create_staff(db, payload.nv_support) if (payload.nv_support or "").strip() else None

    # 4. Status
    status_obj = config_service.get_or_create_status(db, payload.status) if (payload.status or "").strip() else None

    # 5. HKD upsert
    hkd_service.upsert_from_crm(
        db,
        payload=payload,
        customer_id=customer.id,
        handling_staff_id=sale.id    if sale    else None,
        supporting_staff_id=support.id if support else None,
        source_id=source.id          if source  else None,
        status_id=status_obj.id      if status_obj else None,
    )

    db.commit()
    logger.info("CRM webhook processed: table=%s crm_id=%s", payload.table, payload.id)


def process_crm_event(db: Session, payload: CRMWebhookPayload) -> None:
    """Orchestrator: route đến handler tương ứng theo payload.table."""
    try:
        if payload.table == "hkd":
            _handle_hkd(db, payload)
        else:
            logger.warning("CRM webhook: unknown table '%s', skipped", payload.table)
    except Exception as exc:
        db.rollback()
        logger.error("CRM webhook error: %s | payload=%s", exc, payload.model_dump())
