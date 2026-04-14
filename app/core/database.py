from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.models.base import Base
from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

from app.models.base import Base
from app.models import document  # noqa: F401 — register Document model for Alembic

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
