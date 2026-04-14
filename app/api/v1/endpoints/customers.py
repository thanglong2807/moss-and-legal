from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.schemas.customer import CustomerRead, CustomerCreate, CustomerUpdate
from app.services.customer_service import customer_service
from app.services.crm_service import crm_service

router = APIRouter()

@router.get("/", response_model=List[CustomerRead])
def list_customers(
    source_id: Optional[int] = Query(None),
    branch_name: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1),
    db: Session = Depends(get_db)
):
    return customer_service.get_list(db, source_id=source_id, branch_name=branch_name, skip=skip, limit=limit)

@router.get("/{customer_id}", response_model=CustomerRead)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    item = customer_service.get_by_id(db, customer_id)
    if not item:
        raise HTTPException(status_code=404, detail="Customer not found")
    return item

@router.post("/", response_model=CustomerRead)
def create_customer(data: CustomerCreate, db: Session = Depends(get_db)):
    return customer_service.create(db, data)

@router.put("/{customer_id}", response_model=CustomerRead)
def update_customer(customer_id: int, data: CustomerUpdate, db: Session = Depends(get_db)):
    db_obj = customer_service.get_by_id(db, customer_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer_service.update(db, db_obj, data)

@router.delete("/{customer_id}")
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    if not customer_service.delete(db, customer_id):
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"status": "success"}

@router.post("/{customer_id}/sync-crm")
async def sync_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = customer_service.get_by_id(db, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    success = await crm_service.sync_customer(customer)
    if not success:
        raise HTTPException(status_code=500, detail="CRM Sync failed")
    return {"status": "success", "message": "Synchronized to CRM"}
