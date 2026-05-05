from app.api.v1.endpoints import hkd, fields, industries, customers, configs, admin_units, export, drive, webhook, ocr, company, gov_submission
from app.auth.router import router as auth_router
from fastapi import APIRouter

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/auth", tags=["Auth"])
api_router.include_router(hkd.router, prefix="/hkd", tags=["HKD"])
api_router.include_router(fields.router, prefix="/fields", tags=["Fields"])
api_router.include_router(industries.router, prefix="/industries", tags=["Industries"])
api_router.include_router(customers.router, prefix="/customers", tags=["Customers"])
api_router.include_router(configs.router, prefix="/configs", tags=["Configuration"])
api_router.include_router(admin_units.router, prefix="/admin-units", tags=["Administrative Units"])
api_router.include_router(export.router, prefix="/export", tags=["Export"])
api_router.include_router(drive.router, prefix="/drive", tags=["Drive"])
api_router.include_router(webhook.router, prefix="/webhook", tags=["WH"])
api_router.include_router(ocr.router, prefix="/ocr", tags=["OCR"])
api_router.include_router(company.router, prefix="/company", tags=["Company"])
api_router.include_router(gov_submission.router, prefix="/gov-submissions", tags=["GOV Submissions"])

