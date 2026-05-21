"""Tenant admin endpoints — quản lý subscription của tenant."""
import uuid
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func
from datetime import datetime
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.auth.dependencies import require_tenant_admin, get_tenant_id, get_current_user
from app.auth.models import User
from app.models.subscription import SubscriptionPlan, Subscription, Payment

router = APIRouter()


class UpgradeRequest(BaseModel):
    plan_id: int
    duration_months: int
    provider: str  # "vnpay" | "momo"


@router.get("/subscription")
def get_subscription(
    db: Session = Depends(get_db),
    current_user=Depends(require_tenant_admin),
):
    """Xem gói đăng ký hiện tại + số user đang dùng."""
    tenant_id = current_user.tenant_id

    sub = db.execute(
        select(Subscription)
        .options(joinedload(Subscription.plan))
        .where(
            Subscription.tenant_id == tenant_id,
            Subscription.status == "active",
            Subscription.deleted_at.is_(None),
        )
        .order_by(Subscription.end_date.desc())
    ).scalars().first()

    user_count = db.execute(
        select(func.count(User.id)).where(
            User.tenant_id == tenant_id,
            User.deleted_at.is_(None),
            User.is_active == True,
        )
    ).scalar()

    if not sub:
        return {
            "status": "none",
            "plan": None,
            "user_count": user_count,
            "max_users": 0,
        }

    days_left = (sub.end_date - datetime.utcnow()).days if sub.end_date else None

    return {
        "status": sub.status,
        "plan": {
            "id": sub.plan.id,
            "name": sub.plan.name,
            "max_users": sub.plan.max_users,
        } if sub.plan else None,
        "start_date": sub.start_date.isoformat() if sub.start_date else None,
        "end_date": sub.end_date.isoformat() if sub.end_date else None,
        "duration_months": sub.duration_months,
        "days_left": days_left,
        "user_count": user_count,
        "max_users": sub.plan.max_users if sub.plan else 0,
    }


@router.get("/subscription/history")
def get_subscription_history(
    db: Session = Depends(get_db),
    current_user=Depends(require_tenant_admin),
):
    """Lịch sử các kỳ đăng ký và thanh toán."""
    tenant_id = current_user.tenant_id

    payments = db.execute(
        select(Payment)
        .options(joinedload(Payment.subscription).joinedload(Subscription.plan))
        .where(Payment.tenant_id == tenant_id)
        .order_by(Payment.created_at.desc())
    ).scalars().unique().all()

    result = []
    for p in payments:
        result.append({
            "id": p.id,
            "provider": p.provider,
            "order_id": p.order_id,
            "amount": p.amount,
            "status": p.status,
            "paid_at": p.paid_at.isoformat() if p.paid_at else None,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "subscription": {
                "plan_name": p.subscription.plan.name if p.subscription and p.subscription.plan else None,
                "duration_months": p.subscription.duration_months if p.subscription else None,
                "start_date": p.subscription.start_date.isoformat() if p.subscription and p.subscription.start_date else None,
                "end_date": p.subscription.end_date.isoformat() if p.subscription and p.subscription.end_date else None,
            } if p.subscription else None,
        })
    return result


@router.post("/subscription/upgrade")
def upgrade_subscription(
    body: UpgradeRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(require_tenant_admin),
):
    """Tạo payment request để nâng cấp / gia hạn gói."""
    from app.services import vnpay_service, momo_service

    tenant_id = current_user.tenant_id

    plan = db.execute(
        select(SubscriptionPlan).where(
            SubscriptionPlan.id == body.plan_id,
            SubscriptionPlan.is_active == True,
            SubscriptionPlan.deleted_at.is_(None),
        )
    ).scalars().first()
    if not plan:
        raise HTTPException(status_code=404, detail="Không tìm thấy gói")

    duration_price_map = {
        3: plan.price_3m,
        9: plan.price_9m,
        12: plan.price_12m,
        24: plan.price_24m,
        36: plan.price_36m,
    }
    amount = duration_price_map.get(body.duration_months)
    if amount is None:
        raise HTTPException(status_code=400, detail="Thời hạn không hợp lệ (3/9/12/24/36 tháng)")

    if body.provider not in ("vnpay", "momo"):
        raise HTTPException(status_code=400, detail="Cổng thanh toán không hợp lệ")

    order_id = f"ML-{tenant_id}-{uuid.uuid4().hex[:8].upper()}"
    order_info = f"Dang ky goi {plan.name} {body.duration_months} thang"

    # Tạo pending subscription
    sub = Subscription(
        tenant_id=tenant_id,
        plan_id=plan.id,
        status="pending",
        duration_months=body.duration_months,
        amount_paid=amount,
    )
    db.add(sub)
    db.flush()

    # Tạo pending payment
    payment = Payment(
        tenant_id=tenant_id,
        subscription_id=sub.id,
        provider=body.provider,
        order_id=order_id,
        amount=amount,
        status="pending",
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    if body.provider == "vnpay":
        ip_addr = request.client.host if request.client else "127.0.0.1"
        payment_url = vnpay_service.create_payment_url(order_id, amount, order_info, ip_addr)
    else:
        resp = momo_service.create_payment(order_id, amount, order_info)
        payment_url = resp.get("payUrl", "")
        if not payment_url:
            raise HTTPException(status_code=502, detail="Momo không trả về payUrl")

    return {"payment_url": payment_url, "order_id": order_id, "amount": amount}


@router.get("/plans")
def list_available_plans(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Danh sách gói để tenant xem và chọn."""
    plans = db.execute(
        select(SubscriptionPlan)
        .where(SubscriptionPlan.is_active == True, SubscriptionPlan.deleted_at.is_(None))
        .order_by(SubscriptionPlan.id)
    ).scalars().all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "max_users": p.max_users,
            "price_3m": p.price_3m,
            "price_9m": p.price_9m,
            "price_12m": p.price_12m,
            "price_24m": p.price_24m,
            "price_36m": p.price_36m,
            "is_active": p.is_active,
        }
        for p in plans
    ]
