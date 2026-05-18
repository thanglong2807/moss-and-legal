"""Email service — gửi email qua SMTP."""
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, html: str) -> None:
    """Gửi email qua SMTP. Nếu SMTP chưa cấu hình thì log warning và return."""
    if not settings.SMTP_HOST:
        logger.warning(f"SMTP not configured, skip email to {to}")
        return
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to
    msg.attach(MIMEText(html, "html"))
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as s:
        if settings.SMTP_TLS:
            s.starttls()
        if settings.SMTP_USER:
            s.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        s.sendmail(settings.SMTP_FROM, to, msg.as_string())


def send_welcome_admin(tenant_name: str, email: str, display_name: str, password: str) -> None:
    """Gửi email chào mừng khi tạo tài khoản admin mới."""
    html = f"""
    <h2>Chào mừng đến với MOSS&amp;LEGAL</h2>
    <p>Xin chào <b>{display_name}</b>,</p>
    <p>Tài khoản admin của <b>{tenant_name}</b> đã được tạo thành công.</p>
    <p><b>Email:</b> {email}<br><b>Mật khẩu:</b> {password}</p>
    <p>Đăng nhập tại: <a href="https://mosslegal.vn">mosslegal.vn</a></p>
    <p>Vui lòng đổi mật khẩu sau khi đăng nhập lần đầu.</p>
    """
    send_email(email, f"[MOSS&LEGAL] Tài khoản admin — {tenant_name}", html)


def send_subscription_expiry_warning(
    email: str, tenant_name: str, days_left: int, end_date: str
) -> None:
    """Gửi email cảnh báo gói dịch vụ sắp hết hạn."""
    html = f"""
    <h2>Gói dịch vụ sắp hết hạn</h2>
    <p>Gói dịch vụ của <b>{tenant_name}</b> sẽ hết hạn trong <b>{days_left} ngày</b> (ngày {end_date}).</p>
    <p>Vui lòng gia hạn để tiếp tục sử dụng dịch vụ.</p>
    <p><a href="https://mosslegal.vn/subscription">Gia hạn ngay</a></p>
    """
    send_email(email, f"[MOSS&LEGAL] Gói dịch vụ hết hạn sau {days_left} ngày", html)


def send_payment_success(
    email: str, tenant_name: str, plan_name: str, end_date: str, amount: int
) -> None:
    """Gửi email xác nhận thanh toán thành công."""
    html = f"""
    <h2>Thanh toán thành công</h2>
    <p>Cảm ơn <b>{tenant_name}</b> đã gia hạn dịch vụ MOSS&amp;LEGAL.</p>
    <p><b>Gói:</b> {plan_name}<br><b>Hiệu lực đến:</b> {end_date}<br><b>Số tiền:</b> {amount:,}₫</p>
    """
    send_email(email, "[MOSS&LEGAL] Xác nhận thanh toán thành công", html)
