from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.api.v1.api import api_router
from app.core.config import settings
from app.core.logging import logger
import os

UI_DIST_PATH = os.path.join(os.path.dirname(__file__), "ui", "dist")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/api")
def root():
    return {"message": "Welcome to Cenvi Launch BE", "version": "1.0.0"}

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