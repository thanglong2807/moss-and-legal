from typing import List

from fastapi import APIRouter, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.document import DocumentRead
from app.services import document_service

router = APIRouter()


@router.post("/hkd/{hkd_id}/create-folder")
async def create_folder(hkd_id: int, db: Session = Depends(get_db)):
    folder_id = await document_service.create_folder(db, hkd_id)
    return {"folder_id": folder_id}


@router.get("/hkd/{hkd_id}", response_model=List[DocumentRead])
def list_documents(hkd_id: int, db: Session = Depends(get_db)):
    return document_service.list_documents(db, hkd_id)


@router.post("/hkd/{hkd_id}/upload", response_model=DocumentRead)
async def upload_document(
    hkd_id: int,
    label: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    file_bytes = await file.read()
    return await document_service.upload_document(db, hkd_id, label, file_bytes, file.filename)


@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: int, db: Session = Depends(get_db)):
    await document_service.delete_document(db, doc_id)
    return {"status": "success"}
