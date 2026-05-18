from sqlalchemy import Column, String, Boolean, Integer, ForeignKey, BigInteger, DateTime, JSON
from sqlalchemy.orm import relationship
from app.models.base import Base


class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    name = Column(String(100), nullable=False)
    max_users = Column(Integer, nullable=False)   # -1 = unlimited
    price_3m = Column(BigInteger, nullable=False)
    price_9m = Column(BigInteger, nullable=False)
    price_12m = Column(BigInteger, nullable=False)
    price_24m = Column(BigInteger, nullable=False)
    price_36m = Column(BigInteger, nullable=False)
    is_active = Column(Boolean, default=True)

    subscriptions = relationship("Subscription", back_populates="plan")


class Subscription(Base):
    __tablename__ = "subscriptions"

    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    plan_id = Column(Integer, ForeignKey("subscription_plans.id"), nullable=False)
    # status: pending | active | expired | cancelled
    status = Column(String(20), nullable=False, default="pending")
    duration_months = Column(Integer, nullable=False)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    amount_paid = Column(BigInteger, nullable=True)

    tenant = relationship("Tenant", back_populates="subscriptions")
    plan = relationship("SubscriptionPlan", back_populates="subscriptions")
    payments = relationship("Payment", back_populates="subscription")


class Payment(Base):
    __tablename__ = "payments"

    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=True)
    # provider: vnpay | momo
    provider = Column(String(20), nullable=False)
    transaction_id = Column(String(255), nullable=True, unique=True)
    order_id = Column(String(255), nullable=False, unique=True)
    amount = Column(BigInteger, nullable=False)
    # status: pending | success | failed | refunded
    status = Column(String(20), nullable=False, default="pending")
    provider_data = Column(JSON, nullable=True)
    paid_at = Column(DateTime, nullable=True)

    tenant = relationship("Tenant")
    subscription = relationship("Subscription", back_populates="payments")
