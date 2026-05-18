"""Momo payment gateway integration."""
import hashlib
import hmac
import json
import uuid

import requests

from app.core.config import settings


def create_payment(order_id: str, amount: int, order_info: str) -> dict:
    """Tạo yêu cầu thanh toán Momo. Trả về response dict chứa payUrl."""
    request_id = str(uuid.uuid4())
    raw_signature = (
        f"accessKey={settings.MOMO_ACCESS_KEY}"
        f"&amount={amount}"
        f"&extraData="
        f"&ipnUrl={settings.MOMO_NOTIFY_URL}"
        f"&orderId={order_id}"
        f"&orderInfo={order_info}"
        f"&partnerCode={settings.MOMO_PARTNER_CODE}"
        f"&redirectUrl={settings.MOMO_RETURN_URL}"
        f"&requestId={request_id}"
        f"&requestType=payWithMethod"
    )
    signature = hmac.new(
        settings.MOMO_SECRET_KEY.encode("utf-8"),
        raw_signature.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    payload = {
        "partnerCode": settings.MOMO_PARTNER_CODE,
        "requestId": request_id,
        "amount": amount,
        "orderId": order_id,
        "orderInfo": order_info,
        "redirectUrl": settings.MOMO_RETURN_URL,
        "ipnUrl": settings.MOMO_NOTIFY_URL,
        "lang": "vi",
        "extraData": "",
        "requestType": "payWithMethod",
        "signature": signature,
    }
    response = requests.post(settings.MOMO_ENDPOINT, json=payload, timeout=15)
    return response.json()


def verify_notify(params: dict) -> bool:
    """Xác thực chữ ký IPN webhook từ Momo. Trả True nếu hợp lệ."""
    received_sig = params.get("signature", "")
    raw = (
        f"accessKey={settings.MOMO_ACCESS_KEY}"
        f"&amount={params.get('amount', '')}"
        f"&extraData={params.get('extraData', '')}"
        f"&message={params.get('message', '')}"
        f"&orderId={params.get('orderId', '')}"
        f"&orderInfo={params.get('orderInfo', '')}"
        f"&orderType={params.get('orderType', '')}"
        f"&partnerCode={params.get('partnerCode', '')}"
        f"&payType={params.get('payType', '')}"
        f"&requestId={params.get('requestId', '')}"
        f"&responseTime={params.get('responseTime', '')}"
        f"&resultCode={params.get('resultCode', '')}"
        f"&transId={params.get('transId', '')}"
    )
    expected = hmac.new(
        settings.MOMO_SECRET_KEY.encode("utf-8"),
        raw.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, received_sig)
