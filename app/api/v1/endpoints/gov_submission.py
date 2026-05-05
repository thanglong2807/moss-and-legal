from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.auth.dependencies import get_current_user
from app.models.gov_submission import GovSubmission
from app.schemas.gov_submission import GovSubmissionCreate, GovSubmissionPatch, GovSubmissionRead

router = APIRouter()


@router.post("/", response_model=GovSubmissionRead)
def create_submission(body: GovSubmissionCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    sub = GovSubmission(**body.model_dump())
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


@router.get("/", response_model=List[GovSubmissionRead])
def list_submissions(
    record_id: int,
    record_type: str,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return (
        db.query(GovSubmission)
        .filter(GovSubmission.record_id == record_id, GovSubmission.record_type == record_type)
        .order_by(GovSubmission.id.desc())
        .limit(20)
        .all()
    )


@router.patch("/{submission_id}", response_model=GovSubmissionRead)
def patch_submission(
    submission_id: int,
    body: GovSubmissionPatch,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    sub = db.query(GovSubmission).filter(GovSubmission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(sub, k, v)
    db.commit()
    db.refresh(sub)
    return sub
