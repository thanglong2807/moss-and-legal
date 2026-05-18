from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import BaseModel
from typing import Optional


class GoogleSettings(BaseModel):
    TOKEN_BASE64: str = ""
    DRIVE_HKD: str = ""   # root folder id for HKD service on Drive
    DRIVE_TLDN: str = ""  # root folder id for TLDN (company) service on Drive


class Settings(BaseSettings):
    PROJECT_NAME: str = "MOSS&LEGAL"
    API_V1_STR: str = "/api/v1"
    APP_VERSION: str = "2.0.0"
    APP_PORT: int = 8200

    # MySQL Database Configuration
    MYSQL_USER: str = "root"
    MYSQL_PASSWORD: str = ""
    MYSQL_SERVER: str = "localhost"
    MYSQL_PORT: int = 3306
    MYSQL_DB: str = "gov_automation"

    # Google
    GOOGLE_TOKEN_BASE64: str = ""
    GOOGLE_DRIVE_HKD: str = ""
    GOOGLE_DRIVE_TLDN: str = ""

    # Gemini OCR
    GEMINI_API_KEY: str = ""
    GEMINI_OCR_MODEL: str = "gemini-2.0-flash-lite"

    # CRM Webhook
    WEBHOOK_SECRET_KEY: str = ""
    CRM_WORKSPACE: str = ""
    CRM_TABLE_HKD: str = ""
    CRM_TABLE_TLDN: str = ""

    # JWT Auth
    JWT_SECRET_KEY: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # VNPay
    VNPAY_TMN_CODE: str = ""
    VNPAY_HASH_SECRET: str = ""
    VNPAY_URL: str = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
    VNPAY_RETURN_URL: str = ""

    # Momo
    MOMO_PARTNER_CODE: str = ""
    MOMO_ACCESS_KEY: str = ""
    MOMO_SECRET_KEY: str = ""
    MOMO_ENDPOINT: str = "https://test-payment.momo.vn/v2/gateway/api/create"
    MOMO_RETURN_URL: str = ""
    MOMO_NOTIFY_URL: str = ""

    # App base URL (dùng cho payment return URLs)
    APP_BASE_URL: str = "http://localhost:8200"

    @property
    def DATABASE_URL(self) -> str:
        return f"mysql+pymysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}@{self.MYSQL_SERVER}:{self.MYSQL_PORT}/{self.MYSQL_DB}"

    @property
    def google(self) -> GoogleSettings:
        return GoogleSettings(
            TOKEN_BASE64=self.GOOGLE_TOKEN_BASE64,
            DRIVE_HKD=self.GOOGLE_DRIVE_HKD,
            DRIVE_TLDN=self.GOOGLE_DRIVE_TLDN,
        )

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")


settings = Settings()
