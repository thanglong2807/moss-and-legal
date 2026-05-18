"""VNPay payment gateway integration."""
import hashlib
import hmac
import urllib.parse
from datetime import datetime

from app.core.config import settings


def create_payment_url(order_id: str, amount: int, order_info: str, ip_addr: str) -> str:
    """Tạo URL thanh toán VNPay có chữ ký HMAC-SHA512."""
    params = {
        "vnp_Version": "2.1.0",
        "vnp_Command": "pay",
        "vnp_TmnCode": settings.VNPAY_TMN_CODE,
        "vnp_Amount": str(amount * 100),  # VNPay yêu cầu nhân 100
        "vnp_CurrCode": "VND",
        "vnp_TxnRef": order_id,
        "vnp_OrderInfo": order_info,
        "vnp_OrderType": "billpayment",
        "vnp_Locale": "vn",
        "vnp_ReturnUrl": settings.VNPAY_RETURN_URL,
        "vnp_IpAddr": ip_addr,
        "vnp_CreateDate": datetime.now().strftime("%Y%m%d%H%M%S"),
    }
    sorted_params = sorted(params.items())
    query_string = urllib.parse.urlencode(sorted_params)
    secure_hash = hmac.new(
        settings.VNPAY_HASH_SECRET.encode("utf-8"),
        query_string.encode("utf-8"),
        hashlib.sha512,
    ).hexdigest()
    return f"{settings.VNPAY_URL}?{query_string}&vnp_SecureHash={secure_hash}"


def verify_return(params: dict) -> bool:
    """Xác thực chữ ký HMAC trên callback VNPay. Trả True nếu hợp lệ."""
    params = dict(params)
    received_hash = params.pop("vnp_SecureHash", "")
    params.pop("vnp_SecureHashType", None)
    sorted_params = sorted(params.items())
    query_string = urllib.parse.urlencode(sorted_params)
    expected_hash = hmac.new(
        settings.VNPAY_HASH_SECRET.encode("utf-8"),
        query_string.encode("utf-8"),
        hashlib.sha512,
    ).hexdigest()
    return hmac.compare_digest(expected_hash.lower(), received_hash.lower())
