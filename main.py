from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from contextlib import asynccontextmanager
from app.api.v1.api import api_router
from app.core.config import settings
from app.core.logging import logger
from datetime import datetime
import os

UI_DIST_PATH = os.path.join(os.path.dirname(__file__), "ui", "dist")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        from app.services.scheduler import start_scheduler
        start_scheduler()
    except ImportError:
        import logging
        logging.getLogger(__name__).warning(
            "apscheduler not installed — renewal reminder scheduler disabled. "
            "Run: pip install apscheduler"
        )
    yield
    # Shutdown
    try:
        from app.services.scheduler import scheduler
        if scheduler.running:
            scheduler.shutdown(wait=False)
    except ImportError:
        pass


app = FastAPI(
    title=settings.PROJECT_NAME,
    # OpenAPI chỉ khả dụng khi DEBUG=true — tắt ở production
    openapi_url=f"{settings.API_V1_STR}/openapi.json" if settings.DEBUG else None,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

# CORS — chỉ cho phép origins được cấu hình trong .env
_allowed_origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

# Subscription expiry check middleware
# SECURITY: use exact prefix + "/" to avoid partial-match bypass (e.g. /auth vs /authXXX)
_SKIP_SUBSCRIPTION_CHECK = (
    f"{settings.API_V1_STR}/auth/",
    f"{settings.API_V1_STR}/payment/",
    f"{settings.API_V1_STR}/super-admin/",
    f"{settings.API_V1_STR}/admin-units/",  # reference data — always accessible
    f"{settings.API_V1_STR}/dashboard/",    # dashboard needs to show expiry warning
    f"{settings.API_V1_STR}/tenant/subscription/",  # tenant can view own subscription
    f"{settings.API_V1_STR}/tenant/profile/",       # tenant profile — always accessible
    f"{settings.API_V1_STR}/tenant/document-types/", # document types mgmt — always accessible
)

@app.middleware("http")
async def check_subscription(request: Request, call_next):
    path = request.url.path
    # Normalize: ensure path has trailing slash for prefix comparison
    path_norm = path if path.endswith("/") else path + "/"
    if any(path_norm.startswith(p) for p in _SKIP_SUBSCRIPTION_CHECK):
        return await call_next(request)

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return await call_next(request)

    from app.auth.service import decode_token
    payload = decode_token(auth_header.removeprefix("Bearer "))
    if not payload or payload.get("sa"):  # super admin bypasses
        return await call_next(request)

    tenant_id = payload.get("tid")
    if tenant_id:
        from app.core.database import get_db
        from app.models.subscription import Subscription
        from sqlalchemy import select
        db = next(get_db())
        try:
            sub = db.execute(
                select(Subscription).where(
                    Subscription.tenant_id == tenant_id,
                    Subscription.status == "active",
                    Subscription.deleted_at.is_(None),
                ).order_by(Subscription.end_date.desc())
            ).scalars().first()
            if not sub or (sub.end_date and sub.end_date < datetime.utcnow()):
                return JSONResponse(
                    status_code=402,
                    content={"detail": "Gói đăng ký đã hết hạn. Vui lòng gia hạn để tiếp tục sử dụng."},
                )
        finally:
            db.close()

    return await call_next(request)


# API routes
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/api")
def root():
    return {"message": "Welcome to MOSS&LEGAL API", "version": settings.APP_VERSION}

# Serve Vite build assets (JS, CSS, images...)
app.mount("/assets", StaticFiles(directory=os.path.join(UI_DIST_PATH, "assets")), name="assets")

# Serve other static files at root level (favicon, icons, etc.)
@app.get("/favicon.svg")
@app.get("/icons.svg")
async def serve_root_static(request: Request):
    file_path = os.path.join(UI_DIST_PATH, request.url.path.lstrip("/"))
    if os.path.isfile(file_path):
        return FileResponse(file_path)
    return FileResponse(os.path.join(UI_DIST_PATH, "index.html"))

# Catch-all: serve index.html for SPA routing
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    return FileResponse(os.path.join(UI_DIST_PATH, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=settings.APP_PORT, reload=True)

'''
Cái có rồi:
Tên công ty
Địa chỉ trụ sở, lấy full 
Tên người đại diện PL đầu
Chức danh
CCCD

Cái chưa có:

Ngày đăng ký
Mã số thuế - cần lưu
Ngày cấp DKKD - cần lưu
Nơi cấp DKKD

Ngày cấp CCCD
Nơi cấp CCCD

Chọn loại form -> hệ thống tự lấy sheet tương ứng



'''