# PyPaws Backend

FastAPI backend for PyPaws. Supabase is now the database access layer: the backend uses the Supabase Python SDK with the project's publishable key. The existing PostgreSQL schema remains the source of truth; this milestone does not create or modify tables, columns, functions, policies, or other database objects.

## Environment
- Python 3.12 recommended (3.11+ acceptable).
- Node.js 20.19+ or 22.12+.
- Supabase project with the existing PyPaws PostgreSQL schema.
- Windows 10/11 supported.

## Supabase configuration
Create or use the group's existing Supabase project. In Supabase, keep the current schema unchanged.

Copy `backend/.env.example` to `backend/.env` and set:
- `SUPABASE_URL=https://<PROJECT_ID>.supabase.co`
- `SUPABASE_PUBLISHABLE_KEY=sb_publishable_...`

Only the publishable key is allowed here. **Do not use or commit a service_role key, secret key, PostgreSQL password, or other privileged credential.**

## Windows PowerShell
```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
```

Then edit `backend/.env` with the real Supabase project URL and publishable key.

If activation is blocked:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

## Run Backend
From the repository root:
```powershell
python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

URLs:
- `http://127.0.0.1:8000/`
- `http://127.0.0.1:8000/api/health`
- `http://127.0.0.1:8000/api/health/db`
- `http://127.0.0.1:8000/docs`

## Milestone 1 verification
Run:
```powershell
pytest backend/tests -q
```

Then start the API and open:
`http://127.0.0.1:8000/api/health/db`

The endpoint checks the six canonical tables through Supabase PostgREST:
- `users`
- `posts`
- `post_images`
- `image_embeddings`
- `candidates`
- `notifications`

The check uses a zero-row read. It does **not** create, update, delete, or alter schema.

### Important RLS behavior
The publishable key is not an admin connection. PostgREST applies Supabase permissions/RLS. Therefore:
- An accessible table means the current anonymous/public role was allowed to perform the health read.
- A `401`/`403` or another PostgREST error may indicate RLS/API permissions, not that the table is missing.
- This health check must not be used as a way to bypass RLS.
- Later authenticated endpoints must propagate the user's Supabase JWT rather than switching to a privileged service key.

## Frontend
In another terminal:
```powershell
cd frontend
npm install
npm run dev
```
Vite normally uses `http://localhost:5173/`.

Milestone 1 deliberately does not modify `feat/pypaws-frontend` or connect React mock state to the API.

## Common problems
- `SUPABASE_URL is not configured`: create `backend/.env` from `.env.example`.
- `SUPABASE_PUBLISHABLE_KEY is not configured`: set the project's publishable key; never substitute a service_role/secret key.
- `SUPABASE_CLIENT_UNAVAILABLE`: check the URL/key and reinstall `supabase`.
- `status: degraded` on `/api/health/db`: inspect the returned PostgREST errors. RLS or API exposure can block reads; do not change schema just to make the health check green.
- CORS error: set `CORS_ORIGINS` to the exact Vite origin and restart Uvicorn.
- `ModuleNotFoundError: supabase`: activate `.venv` and run `pip install -r backend/requirements.txt`.

## Secrets
Never commit `.env`, passwords, API keys, uploaded images, virtual environments or AI checkpoints.
