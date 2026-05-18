"""Background scheduler — nhắc gia hạn subscription hàng ngày lúc 8:00."""
import logging

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)
scheduler = BackgroundScheduler()


def check_expiring_subscriptions() -> None:
    """Chạy hàng ngày lúc 8:00 sáng. Gửi email nhắc gia hạn cho các subscription sắp hết hạn."""
    from app.core.database import SessionLocal
    from app.models.subscription import Subscription
    from app.auth.models import Tenant
    from app.services.email_service import send_subscription_expiry_warning
    from datetime import date, timedelta
    from sqlalchemy import select

    db = SessionLocal()
    try:
        today = date.today()
        for days in [7, 3, 1]:
            target = today + timedelta(days=days)
            subs = db.execute(
                select(Subscription).where(
                    Subscription.status == "active",
                    Subscription.deleted_at.is_(None),
                    # So sánh phần ngày (end_date là DateTime)
                    Subscription.end_date >= target,
                    Subscription.end_date < target + timedelta(days=1),
                )
            ).scalars().all()
            for sub in subs:
                tenant = db.get(Tenant, sub.tenant_id)
                if tenant and tenant.contact_email:
                    try:
                        send_subscription_expiry_warning(
                            email=tenant.contact_email,
                            tenant_name=tenant.name,
                            days_left=days,
                            end_date=str(target),
                        )
                        logger.info(
                            "Sent expiry warning to %s (tenant=%s, days=%d)",
                            tenant.contact_email, tenant.name, days,
                        )
                    except Exception:
                        logger.exception(
                            "Failed to send expiry warning to %s", tenant.contact_email
                        )
    except Exception:
        logger.exception("Error in check_expiring_subscriptions")
    finally:
        db.close()


def start_scheduler() -> None:
    """Khởi động background scheduler."""
    scheduler.add_job(
        check_expiring_subscriptions,
        CronTrigger(hour=8, minute=0),
        id="check_expiring_subscriptions",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Background scheduler started")
