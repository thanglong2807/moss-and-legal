"""Tenant data export endpoints — xuất CSV cho TenantAdmin."""
import csv
import io
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.database import get_db
from app.auth.dependencies import require_tenant_admin
from app.models.customer import Customer
from app.models.company import Company
from app.models.hkd import BusinessHousehold

router = APIRouter()


def _csv_response(rows: list, headers: list, filename: str) -> StreamingResponse:
    """Tạo StreamingResponse CSV từ danh sách rows."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    writer.writerows(rows)
    output.seek(0)
    # Thêm BOM UTF-8 để Excel mở đúng tiếng Việt
    bom = "﻿"
    content = bom + output.getvalue()
    return StreamingResponse(
        iter([content.encode("utf-8")]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/customers")
def export_customers(
    db: Session = Depends(get_db),
    current_user=Depends(require_tenant_admin),
):
    """Export danh sách khách hàng của tenant ra CSV."""
    customers = db.execute(
        select(Customer).where(
            Customer.tenant_id == current_user.tenant_id,
            Customer.deleted_at.is_(None),
        ).order_by(Customer.id)
    ).scalars().all()

    headers = [
        "ID", "Tên khách hàng", "Số điện thoại", "CCCD",
        "Giới tính", "Ngày sinh", "Đường", "Ngày tạo",
    ]
    rows = [
        [
            c.id,
            c.name,
            c.phone,
            c.id_card or "",
            "Nam" if c.gender == 0 else ("Nữ" if c.gender == 1 else ""),
            c.birth_date.strftime("%d/%m/%Y") if c.birth_date else "",
            c.street or "",
            c.created_at.strftime("%d/%m/%Y %H:%M") if c.created_at else "",
        ]
        for c in customers
    ]
    return _csv_response(rows, headers, "customers.csv")


@router.get("/companies")
def export_companies(
    db: Session = Depends(get_db),
    current_user=Depends(require_tenant_admin),
):
    """Export danh sách công ty của tenant ra CSV."""
    companies = db.execute(
        select(Company).where(
            Company.tenant_id == current_user.tenant_id,
            Company.deleted_at.is_(None),
        ).order_by(Company.id)
    ).scalars().all()

    headers = [
        "ID", "Mã", "Tên công ty", "Tên đầy đủ", "Loại công ty",
        "Mã số thuế", "Điện thoại", "Email", "Địa chỉ", "Vốn điều lệ", "Ngày tạo",
    ]
    company_type_map = {1: "TNHH 1TV", 2: "TNHH 2TV", 3: "Cổ phần"}
    rows = [
        [
            co.id,
            co.code,
            co.company_short_name or co.company_full_name or "",
            co.company_full_name or "",
            company_type_map.get(co.company_type, str(co.company_type)),
            co.tax_code or "",
            co.phone or "",
            co.email or "",
            co.street or "",
            co.charter_capital or "",
            co.created_at.strftime("%d/%m/%Y %H:%M") if co.created_at else "",
        ]
        for co in companies
    ]
    return _csv_response(rows, headers, "companies.csv")


@router.get("/hkd")
def export_hkd(
    db: Session = Depends(get_db),
    current_user=Depends(require_tenant_admin),
):
    """Export danh sách hộ kinh doanh của tenant ra CSV."""
    households = db.execute(
        select(BusinessHousehold).where(
            BusinessHousehold.tenant_id == current_user.tenant_id,
            BusinessHousehold.deleted_at.is_(None),
        ).order_by(BusinessHousehold.id)
    ).scalars().all()

    headers = [
        "ID", "Mã", "Tên HKD", "Tên đầy đủ",
        "Mã số thuế", "Điện thoại", "Email", "Địa chỉ", "Vốn kinh doanh", "Ngày tạo",
    ]
    rows = [
        [
            hk.id,
            hk.code,
            hk.company_short_name or hk.company_full_name or "",
            hk.company_full_name or "",
            hk.tax_code or "",
            hk.phone or "",
            hk.email or "",
            hk.street or "",
            hk.charter_capital or "",
            hk.created_at.strftime("%d/%m/%Y %H:%M") if hk.created_at else "",
        ]
        for hk in households
    ]
    return _csv_response(rows, headers, "hkd.csv")
