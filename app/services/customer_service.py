from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, desc
from app.models.customer import Customer
from app.schemas.customer import CustomerCreate, CustomerUpdate

class CustomerService:
    def get_list(self, db: Session, source_id: int = None, branch_name: str = None,
                 search: str = None, skip: int = 0, limit: int = 50, tenant_id: int = None):
        from sqlalchemy import or_
        stmt = select(Customer).options(
            joinedload(Customer.source),
            joinedload(Customer.staff),
            joinedload(Customer.status),
            joinedload(Customer.province),
            joinedload(Customer.ward),
        ).order_by(desc(Customer.id))

        if tenant_id is not None:
            stmt = stmt.where(Customer.tenant_id == tenant_id)
        if source_id:
            stmt = stmt.where(Customer.source_id == source_id)
        if branch_name:
            stmt = stmt.where(Customer.branch_name == branch_name)
        if search:
            s = f"%{search}%"
            stmt = stmt.where(or_(Customer.name.ilike(s), Customer.phone.ilike(s)))

        from sqlalchemy import func
        total = db.execute(select(func.count()).select_from(stmt.subquery())).scalar()
        items = db.execute(stmt.offset(skip).limit(limit)).scalars().all()
        return {"items": items, "total": total}

    def get_by_id(self, db: Session, customer_id: int, tenant_id: int = None):
        stmt = select(Customer).where(Customer.id == customer_id).options(
            joinedload(Customer.source),
            joinedload(Customer.staff),
            joinedload(Customer.status),
            joinedload(Customer.households)
        )
        # Enforce tenant isolation — always filter by tenant_id when provided
        if tenant_id is not None:
            stmt = stmt.where(Customer.tenant_id == tenant_id)
        return db.execute(stmt).scalars().first()

    def create(self, db: Session, obj_in: CustomerCreate, tenant_id: int = None):
        db_obj = Customer(**obj_in.dict())
        if tenant_id is not None:
            db_obj.tenant_id = tenant_id
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, db_obj: Customer, obj_in: CustomerUpdate):
        update_data = obj_in.dict(exclude_unset=True)
        for field in update_data:
            setattr(db_obj, field, update_data[field])
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def delete(self, db: Session, customer_id: int):
        db_obj = db.query(Customer).get(customer_id)
        if db_obj:
            db.delete(db_obj)
            db.commit()
            return True
        return False

    # ── CRM webhook helpers ───────────────────────────────────────────────────

    def get_by_crm_id(self, db: Session, id_crm: str):
        return db.execute(
            select(Customer).where(Customer.id_crm == id_crm)
        ).scalars().first()

    def get_by_phone(self, db: Session, phone: str):
        return db.execute(
            select(Customer).where(Customer.phone == phone)
        ).scalars().first()

    def upsert_from_crm(self, db: Session, id_kh: str, name: str, phone: str, source_id: int):
        """Find customer by CRM id → phone fallback → create. Returns customer."""
        customer = None
        if id_kh:
            customer = self.get_by_crm_id(db, id_kh)
        if customer is None and phone:
            customer = self.get_by_phone(db, phone)
        if customer:
            if name: customer.name = name
            if phone: customer.phone = phone
            if source_id: customer.source_id = source_id
            if id_kh and not customer.id_crm:
                customer.id_crm = id_kh
            db.flush()
        else:
            customer = Customer(
                name=name or phone or "Khách CRM",
                phone=phone or "",
                id_crm=id_kh or None,
                source_id=source_id,
            )
            db.add(customer)
            db.flush()
        return customer

customer_service = CustomerService()
