import requests
from googleapiclient.discovery import build

from app.services.drive_service import oauth2_credential
from .config import SPREADSHEET_ID, DATA_COLUMNS, SHEET_CONFIGS


def export_viettel_contract(sheet_name: str, data: dict) -> bytes:
    if sheet_name not in SHEET_CONFIGS:
        raise ValueError(f"Sheet '{sheet_name}' không hợp lệ")

    creds = oauth2_credential()
    sheets = build("sheets", "v4", credentials=creds, cache_discovery=False).spreadsheets()

    # 1. Tính dòng tiếp theo trong DATA (cột A)
    result = sheets.values().get(
        spreadsheetId=SPREADSHEET_ID,
        range="DATA!A:A",
    ).execute()
    rows = result.get("values", [])
    next_row = len(rows) + 1
    stt = next_row - 2

    # 2. Ghi dòng mới vào DATA (uppercase tất cả giá trị string)
    def _val(col):
        if col is None: return ""
        v = data.get(col, "") or ""
        return v.upper() if isinstance(v, str) else v

    row_values = [stt] + [_val(col) for col in DATA_COLUMNS]
    sheets.values().update(
        spreadsheetId=SPREADSHEET_ID,
        range=f"DATA!A{next_row}",
        valueInputOption="USER_ENTERED",
        body={"values": [row_values]},
    ).execute()

    # 3. Ghi STT vào ô lookup của sheet template để VLOOKUP load đúng dữ liệu
    stt_cell = SHEET_CONFIGS[sheet_name]["stt_cell"]
    sheets.values().update(
        spreadsheetId=SPREADSHEET_ID,
        range=f"{sheet_name}!{stt_cell}",
        valueInputOption="USER_ENTERED",
        body={"values": [[stt]]},
    ).execute()

    # 4. Lấy GID của sheet
    meta = sheets.get(spreadsheetId=SPREADSHEET_ID).execute()
    sheet_gid = next(
        s["properties"]["sheetId"]
        for s in meta["sheets"]
        if s["properties"]["title"] == sheet_name
    )

    # 5. Export PDF
    cfg = SHEET_CONFIGS[sheet_name]
    ex = cfg["export"]
    rng = cfg["range"]

    def _b(v): return "true" if v else "false"

    export_url = (
        f"https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/export"
        f"?format=pdf"
        f"&gid={sheet_gid}"
        f"&range={sheet_name}!{rng}"
        f"&size={ex['size']}"
        f"&portrait={_b(ex['portrait'])}"
        f"&scale={ex['scale']}"
        f"&fitw={_b(ex.get('fitw'))}"
        f"&top_margin={ex['top_margin']}"
        f"&bottom_margin={ex['bottom_margin']}"
        f"&left_margin={ex['left_margin']}"
        f"&right_margin={ex['right_margin']}"
        f"&gridlines={_b(ex.get('gridlines'))}"
        f"&printtitle={_b(ex.get('printtitle'))}"
        f"&sheetnames={_b(ex.get('sheetnames'))}"
        f"&pagenumbers={_b(ex.get('pagenumbers'))}"
        f"&fzr={_b(ex.get('fzr'))}"
    )

    resp = requests.get(export_url, headers={"Authorization": f"Bearer {creds.token}"})
    resp.raise_for_status()
    return resp.content
