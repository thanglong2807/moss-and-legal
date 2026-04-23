"""
Shared fixtures cho toàn bộ test suite.
Dùng SQLite in-memory để tránh ảnh hưởng DB dev.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.models.base import Base
import app.models.hkd  # noqa: register all models
import app.models.company  # noqa
import app.models.customer  # noqa
import app.auth.models  # noqa

from app.core.database import get_db
from main import app

DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


@pytest.fixture(scope="session", autouse=True)
def create_tables():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(scope="module")
def _admin_setup():
    """Create admin user once per module, shared across tests."""
    from app.auth.models import Role, RolePermission, User
    from app.auth.service import hash_password

    session = TestingSessionLocal()
    try:
        existing = session.query(Role).filter_by(name="Admin").first()
        if not existing:
            role = Role(name="Admin", level=1)
            session.add(role)
            session.flush()
            modules = ["hkd", "customers", "fields", "config", "users", "company"]
            for m in modules:
                session.add(RolePermission(role_id=role.id, module=m,
                                           can_view=True, can_create=True,
                                           can_update=True, can_delete=True))
            user = User(email="test@cenvi.vn", hashed_password=hash_password("test123"),
                        display_name="Test Admin", is_active=True, role_id=role.id)
            session.add(user)
            session.commit()
    finally:
        session.close()


@pytest.fixture
def auth_headers(client, _admin_setup):
    """Login và trả về Authorization header."""
    res = client.post("/api/v1/auth/login", data={"username": "test@cenvi.vn", "password": "test123"})
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
