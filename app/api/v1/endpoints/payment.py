"""Payment gateway endpoints — VNPay và Momo callbacks."""
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from sqlalchemy import select
from datetime import datetime

from app.core.database import get_db
from app.core.config import settings
from app.models.subscription import Subscription, Payment
from app.services import vnpay_service, momo_service

router = APIRouter()


def _activate_payment(db: Session, order_id: str, transaction_id: str, provider_data: dict):
    """Kích hoạt subscription sau khi thanh toán thành công."""
    payment = db.execute(
        select(Payment).where(Payment.order_id == order_id)
    ).scalars().first()
    if not payment or payment.status == "success":
        return

    payment.status = "success"
    payment.transaction_id = transaction_id
    payment.provider_data = provider_data
    payment.paid_at = datetime.utcnow()

    sub = db.execute(
        select(Subscription).where(Subscription.id == payment.subscription_id)
    ).scalars().first()
    if sub and sub.status == "pending":
        from dateutil.relativedelta import relativedelta
        sub.status = "active"
        sub.start_date = datetime.utcnow()
        sub.end_date = sub.start_date + relativedelta(months=sub.duration_months)
        sub.amount_paid = payment.amount

    db.commit()


# ── VNPay ─────────────────────────────────────────────────────────────────────

@router.get("/vnpay/return")
def vnpay_return(request: Request, db: Session = Depends(get_db)):
    """VNPay redirect user về sau khi thanh toán."""
    params = dict(request.query_params)
    result_code = params.get("vnp_ResponseCode", "")
    order_id = params.get("vnp_TxnRef", "")

    if not vnpay_service.verify_return(params):
        return RedirectResponse(f"{settings.APP_BASE_URL}/payment/result?status=invalid&order_id={order_id}")

    if result_code == "00":
        transaction_id = params.get("vnp_TransactionNo", "")
        _activate_payment(db, order_id, transaction_id, params)
        return RedirectResponse(f"{settings.APP_BASE_URL}/payment/result?status=success&order_id={order_id}")

    return RedirectResponse(f"{settings.APP_BASE_URL}/payment/result?status=failed&order_id={order_id}&code={result_code}")


@router.post("/vnpay/ipn")
def vnpay_ipn(request: Request, db: Session = Depends(get_db)):
    """VNPay IPN webhook."""
    import asyncio
    params = dict(request.query_params)

    if not vnpay_service.verify_return(params):
        return {"RspCode": "97", "Message": "Invalid signature"}

    order_id = params.get("vnp_TxnRef", "")
    result_code = params.get("vnp_ResponseCode", "")

    payment = db.execute(select(Payment).where(Payment.order_id == order_id)).scalars().first()
    if not payment:
        return {"RspCode": "01", "Message": "Order not found"}
    if payment.status == "success":
        return {"RspCode": "02", "Message": "Order already confirmed"}

    if result_code == "00":
        transaction_id = params.get("vnp_TransactionNo", "")
        _activate_payment(db, order_id, transaction_id, params)

    return {"RspCode": "00", "Message": "Confirm success"}


# ── Momo ──────────────────────────────────────────────────────────────────────

@router.post("/momo/notify")
async def momo_notify(request: Request, db: Session = Depends(get_db)):
    """Momo IPN webhook."""
    try:
        params = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    if not momo_service.verify_notify(params):
        return {"message": "Invalid signature"}

    result_code = params.get("resultCode", -1)
    order_id = params.get("orderId", "")

    if result_code == 0:
        transaction_id = str(params.get("transId", ""))
        _activate_payment(db, order_id, transaction_id, params)

    return {"message": "ok"}


@router.get("/momo/return")
def momo_return(request: Request, db: Session = Depends(get_db)):
    """Momo redirect user về sau khi thanh toán."""
    params = dict(request.query_params)
    order_id = params.get("orderId", "")
    result_code = int(params.get("resultCode", -1))

    if not momo_service.verify_notify(params):
        return RedirectResponse(f"{settings.APP_BASE_URL}/payment/result?status=invalid&order_id={order_id}")

    if result_code == 0:
        transaction_id = str(params.get("transId", ""))
        _activate_payment(db, order_id, transaction_id, params)
        return RedirectResponse(f"{settings.APP_BASE_URL}/payment/result?status=success&order_id={order_id}")

    return RedirectResponse(f"{settings.APP_BASE_URL}/payment/result?status=failed&order_id={order_id}&code={result_code}")


@router.get("/status/{order_id}")
def payment_status(order_id: str, db: Session = Depends(get_db)):
    """Poll trạng thái thanh toán — frontend dùng để hiển thị kết quả."""
    payment = db.execute(select(Payment).where(Payment.order_id == order_id)).scalars().first()
    if not payment:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")
    return {"order_id": order_id, "status": payment.status, "amount": payment.amount}
