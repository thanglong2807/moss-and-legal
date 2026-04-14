# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the App

```bash
# Start the development server
python main.py
# or
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

The API is served at `http://127.0.0.1:8000`. Interactive docs at `/api/v1/openapi.json`.

## Database & Migrations

- **Primary DB**: MySQL (`gov_automation` database). Configure via `.env` file with `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_SERVER`, `MYSQL_PORT`, `MYSQL_DB`.
- **Local SQLite** (`cenvi_launch.db`) exists but MySQL is the main store.

```bash
# Create a new migration after model changes
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Import seed data
python scripts/import_provinces.py
python scripts/import_industries.py
```

## Architecture

**Request flow**: `main.py` → `app/api/v1/endpoints/<module>.py` → `app/services/<module>_service.py` → SQLAlchemy models

- **`app/api/v1/endpoints/`** — FastAPI routers, thin layer: validates input, calls service, raises HTTPException
- **`app/services/`** — All business logic lives here. Each service is a class instantiated as a singleton (e.g. `hkd_service = HKDService()`).
- **`app/models/`** — SQLAlchemy ORM models. `base.py` defines the declarative `Base`.
- **`app/schemas/`** — Pydantic schemas for request/response validation.
- **`app/core/`** — `config.py` (settings from `.env`), `database.py` (engine + `get_db` dependency), `logging.py`.

## Key Domain Concepts

- **HKD (Hộ Kinh Doanh)** — Business Household, the core entity. Has nested `company_info`, `owner`, and `industries` in its JSON-shaped API input. Stored across `business_households`, `business_owners`, and `household_industries` tables.
- **Administrative Units** — Province/District/Ward hierarchy in `administrative_units` table. The `admin_unit_service.get_or_create_by_name()` pattern auto-creates units on write.
- **Industries/Fields** — `industries` table (unique by `code`), grouped into `fields` via `field_industries` join table.
- **Customers & Configs** — CRM-linked customer records; configs are key-value settings stored in DB.

## Patterns to Follow

- Services use `select()` + `joinedload()` for related data — avoid lazy loading.
- Industry updates on HKD are **replace-all**: delete existing `HouseholdIndustry` rows then re-insert.
- Dates from frontend are strings in `dd/MM/yyyy` format; parse with `datetime.strptime(s, "%d/%m/%Y").date()`.
- HKD codes are auto-generated: `HKD-{uuid4().hex[:8].upper()}`.
