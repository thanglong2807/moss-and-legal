"""
Google Drive service.
Handles folder creation and file upload/delete for each business service.
"""
import base64
import json
import asyncio
from io import BytesIO
from typing import Optional

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload

from app.core.config import settings

SCOPES = [
    "https://www.googleapis.com/auth/drive",
    "https://mail.google.com/",
    "https://www.googleapis.com/auth/documents",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/calendar",
]

# Root folder id per service — extend when new services are added
SERVICE_ROOT_FOLDERS = {
    "hkd": lambda: settings.google.DRIVE_HKD,
}


def oauth2_credential() -> Credentials:
    try:
        token_json = base64.b64decode(settings.google.TOKEN_BASE64).decode("utf-8")
        token_info = json.loads(token_json)
        creds = Credentials.from_authorized_user_info(token_info, SCOPES)
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
        return creds
    except Exception as e:
        raise RuntimeError("Không thể tạo credentials", e)


def _drive_client():
    return build("drive", "v3", credentials=oauth2_credential(), cache_discovery=False)


def _create_folder_sync(name: str, parent_id: str) -> str:
    """Create a Drive folder and return its id."""
    service = _drive_client()
    meta = {
        "name": name,
        "mimeType": "application/vnd.google-apps.folder",
        "parents": [parent_id],
    }
    folder = service.files().create(
        body=meta, fields="id",
        supportsAllDrives=True,
    ).execute()
    return folder["id"]


def _upload_file_sync(
    file_bytes: bytes,
    file_name: str,
    mime_type: str,
    folder_id: str,
) -> tuple[str, str]:
    """Upload a file to Drive. Returns (file_id, web_view_link)."""
    service = _drive_client()
    meta = {"name": file_name, "parents": [folder_id]}
    media = MediaIoBaseUpload(BytesIO(file_bytes), mimetype=mime_type, resumable=False)
    f = service.files().create(
        body=meta, media_body=media, fields="id,webViewLink",
        supportsAllDrives=True,
    ).execute()
    return f["id"], f.get("webViewLink", "")


def _delete_file_sync(file_id: str) -> None:
    service = _drive_client()
    service.files().delete(fileId=file_id, supportsAllDrives=True).execute()


# ── Async wrappers ────────────────────────────────────────────────────────────

async def ensure_folder(service: str, folder_name: str, existing_folder_id: Optional[str]) -> str:
    """Return existing folder_id or create new one under service root."""
    if existing_folder_id:
        return existing_folder_id
    root = SERVICE_ROOT_FOLDERS.get(service, lambda: "")()
    if not root:
        raise RuntimeError(f"Root Drive folder not configured for service='{service}'")
    return await asyncio.to_thread(_create_folder_sync, folder_name, root)


async def upload_file(
    file_bytes: bytes,
    file_name: str,
    mime_type: str,
    folder_id: str,
) -> tuple[str, str]:
    return await asyncio.to_thread(_upload_file_sync, file_bytes, file_name, mime_type, folder_id)


async def delete_file(file_id: str) -> None:
    await asyncio.to_thread(_delete_file_sync, file_id)
