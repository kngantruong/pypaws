# PyPaws Backend

FastAPI backend for PyPaws. PostgreSQL is the canonical database; `db/schema (3).sql` and `db/queries (2).sql` are the source of truth.

## Environment
- Python 3.12 recommended (3.11+ acceptable).
- Node.js 20.19+ or 22.12+.
- PostgreSQL 12+.
- Windows 10/11 supported.

## PostgreSQL
Create an empty database named `pypaws`, then run:
1. `db/schema (3).sql`
2. `db/queries (2).sql`
3. `db/seed_data (1).sql` (optional demo data)

## Windows PowerShell
```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
```
Set the real PostgreSQL password in `backend/.env`. Never commit it.

## Run Backend
From repository root:
```powershell
python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

URLs:
- `http://127.0.0.1:8000/`
- `http://127.0.0.1:8000/api/health`
- `http://127.0.0.1:8000/api/health/db`
- `http://127.0.0.1:8000/docs`

## Tests
```powershell
pytest backend/tests -q
```
Milestone 1 unit tests do not require PostgreSQL. `/api/health/db` requires the canonical schema/functions.

## Frontend
In another terminal:
```powershell
cd frontend
npm install
npm run dev
```
Vite normally uses `http://localhost:5173/`.

## Common problems
- DATABASE_URL missing: create `backend/.env` from `.env.example`.
- connection refused / DB_UNAVAILABLE: start PostgreSQL and verify host/port/database.
- DB_SCHEMA_CHECK_FAILED/degraded: run the canonical SQL files in order.
- CORS: set `CORS_ORIGINS` to the exact Vite origin and restart Uvicorn.
- ModuleNotFoundError: psycopg: activate `.venv` and install requirements.

## Secrets
Never commit `.env`, passwords, API keys, uploads, virtual environments or AI checkpoints.
