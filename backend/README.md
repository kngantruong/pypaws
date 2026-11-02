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

## Backend API handoff

The backend layer is the intermediate layer between Website, AI and Database. It uses FastAPI + the Supabase Python SDK and delegates database business rules to the existing Supabase RPCs. The backend does not modify the group's database SQL file.

### Core website APIs

| Method | Endpoint | Purpose |
|---|---|---|
| POST | /api/auth/register | Register |
| POST | /api/auth/login | Login and receive backend JWT |
| GET | /api/auth/me | Current user |
| POST | /api/posts | Create LOST/FOUND post with 1-6 images |
| GET | /api/posts | List/filter posts |
| GET | /api/posts/{post_id} | Post detail |
| GET | /api/posts/{post_id}/images | Post images |
| POST | /api/posts/{post_id}/cancel | Cancel own active post |
| POST | /api/posts/{post_id}/resolve | Resolve a LOST post |
| POST | /api/matching/posts/{post_id}/images/{image_id}/embedding | Generate/save 512-D DINOv2 embedding |
| POST | /api/matching/posts/{post_id} | Generate ranked candidates |
| GET | /api/posts/{post_id}/candidates | Read ranked candidates |
| POST | /api/candidates/{candidate_id}/contact | Contact candidate |
| POST | /api/candidates/{candidate_id}/reject | Reject candidate |
| POST | /api/candidates/{candidate_id}/resolve | Resolve through matched FOUND |
| GET | /api/notifications | Notifications |
| POST | /api/notifications/{notification_id}/read | Mark notification read |
| GET | /api/health | Backend health |
| GET | /api/health/db | Database accessibility check |

### AI matching flow

1. Website creates a LOST/FOUND post through `POST /api/posts`.
2. Website uploads an image to the embedding endpoint. The backend initializes DINOv2 once per process, validates a `(512,)` L2-normalized vector, and stores it through the existing `save_image_embedding` RPC.
3. Website starts matching with `POST /api/matching/posts/{post_id}`. The backend reads the LOST post and its primary embedding, calls the existing `get_search_pool` RPC for opposite-type ACTIVE posts with embeddings, computes image similarity, combines appearance/location/time signals, filters weak image matches, stores candidates through `save_candidate`, and returns ranked results.
4. Website displays candidates through `GET /api/posts/{post_id}/candidates`. Contact/reject/resolve actions use the existing database workflows.

### Error handling

- `400`: invalid business input or image data
- `401/403`: authentication/ownership/permission failure
- `404`: post/image/candidate not found
- `409`: matching prerequisites are not ready
- `413`: image over 10 MB
- `415`: unsupported image type
- `422`: invalid request fields/radius
- `503`: DINOv2 checkpoint unavailable
- `500`: unexpected backend/database failure

### Example matching response

```json
{
  "post_id": 101,
  "radius_km": 10,
  "items": [
    {
      "candidate_id": 42,
      "post_id": 118,
      "distance_km": 2.31,
      "image_similarity": 0.8731,
      "final_score": 86.42,
      "location_label": "near",
      "image_priority": "high"
    }
  ]
}
```
