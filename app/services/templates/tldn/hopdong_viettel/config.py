SPREADSHEET_ID = "1sqJKv4JK7Q1tOxZprMvB_6SW5Zdt6gWOXJjgf2ltua8"

# Thứ tự cột trong sheet DATA bắt đầu từ cột B
# None = cột tồn tại trong sheet nhưng không dùng (ghi "")
DATA_COLUMNS = [
    "company_name",           # B - TÊN DOANH NGHIỆP
    "company_tax_code",       # C - MÃ SỐ DOANH NGHIỆP (MÃ SỐ THUẾ)
    "company_biz_reg_date",   # D - NGÀY CẤP ĐĂNG KÝ KINH DOANH
    "company_address",        # E - ĐỊA CHỈ TRỤ SỞ CHÍNH
    "rep_name",               # F - NGƯỜI ĐẠI DIỆN THEO PHÁP LUẬT
    "rep_title",              # G - CHỨC VỤ
    "company_phone",          # H - ĐIỆN THOẠI
    "company_email",          # I - EMAIL
    "rep_id_number",          # J - CMND
    "rep_id_date",            # K - Ngày cấp
    "rep_id_place",           # L - Nơi cấp
    None,                     # M - ĐỊA CHỈ TRẢ/NHẬN HỒ SƠ (skip)
    None,                     # N - ĐIỆN THOẠI LIÊN HỆ KHÁC (skip)
    None,                     # O - THEO ỦY QUYỀN (NẾU CÓ) (skip)
    "contract_reg_date",      # P - NGÀY ĐĂNG KÝ
    None,                     # Q - Ngày bàn giao (skip)
    None,                     # R - Số Hợp đồng (skip)
    "company_biz_reg_place",  # S - Nơi cấp đăng ký kinh doanh
]

_EXPORT_DEFAULT = {
    "size": 7,
    "portrait": True,
    "scale": 2,
    "fitw": True,
    "top_margin": 0.85,
    "bottom_margin": 0.85,
    "left_margin": 0.75,
    "right_margin": 0.75,
    "gridlines": False,
    "printtitle": False,
    "sheetnames": False,
    "pagenumbers": False,
    "fzr": False,
}
_EXPORT_BBXNDL= {
    "size": 7,
    "portrait": True,
    "scale": 2,
    "fitw": True,
    "top_margin": 0.8,
    "bottom_margin": 0.8,
    "left_margin": 0.75,
    "right_margin": 0.75,
    "gridlines": False,
    "printtitle": False,
    "sheetnames": False,
    "pagenumbers": False,
    "fzr": False,
}

SHEET_CONFIGS: dict = {
    "PYC1Y":  {"range": "A1:P131", "stt_cell": "R1", "export": _EXPORT_DEFAULT},
    "PYC3Y":  {"range": "A1:P131", "stt_cell": "R1", "export": _EXPORT_DEFAULT},
    "AM1Y":   {"range": "A1:P131", "stt_cell": "R1", "export": _EXPORT_DEFAULT},
    "AM3Y":   {"range": "A1:P131", "stt_cell": "R1", "export": _EXPORT_DEFAULT},
    "BBXNDL": {"range": "B1:J50", "stt_cell": "M1", "export": _EXPORT_BBXNDL},  # cập nhật range sau
}

VALID_SHEETS = list(SHEET_CONFIGS.keys())
'''

'''