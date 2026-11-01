# PyPaws Backend API

## Scope

Quỳnh phụ trách lớp trung gian giữa Website, AI và Database:

**Website -> FastAPI -> Supabase -> FastAPI -> Website**

AI matching uses the group's DINOv2 PetFace embedder. The backend does not add or modify database schema/functions; it calls the existing database functions from `db/queries (2).sql` and uses the existing `posts` / `image_embeddings` tables where needed.

## Run

From the repository root:

```bash
cd backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Open Swagger UI:

`http://127.0.0.1:8000/docs`

## Authentication

The backend issues its own bearer token after `/api/auth/login` or `/api/auth/register`.

Send:

```
Authorization: Bearer <access_token>
```

## Main APIs

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Register |
| POST | `/api/auth/login` | Login and receive token |
| GET | `/api/auth/me` | Current user |
| POST | `/api/posts` | Create LOST/FOUND post |
| GET | `/api/posts` | List/filter posts |
| GET | `/api/posts/{post_id}` | Post detail |
| GET | `/api/posts/{post_id}/images` | Post images |
| POST | `/api/posts/{post_id}/cancel` | Cancel own active post |
| POST | `/api/posts/{post_id}/resolve` | Resolve LOST post |
| PATCH | `/api/posts/{post_id}/location` | Update own post location |
| POST | `/api/matching/posts/{post_id}/images/{image_id}/embedding` | Generate and save 512-D DINOv2 embedding |
| POST | `/api/matching/posts/{post_id}` | Generate ranked LOST -> FOUND candidates |
| GET | `/api/posts/{post_id}/candidates` | Read ranked candidates |
| POST | `/api/candidates/{candidate_id}/contact` | Contact a candidate |
| POST | `/api/candidates/{candidate_id}/reject` | Reject a candidate |
| POST | `/api/candidates/{candidate_id}/resolve` | Resolve through a candidate |
| GET | `/api/notifications` | Read notifications |
| POST | `/api/notifications/{notification_id}/read` | Mark notification read |
| GET | `/api/health` | Backend health |
| GET | `/api/health/db` | Supabase/PostgREST health |

## Create post example

```json
{
  "post_type": "LOST",
  "species": "DOG",
  "description": "Chó lông vàng, mất gần công viên.",
  "event_time": "2026-11-01T18:00:00+07:00",
  "location_text": "Quận 1, TP.HCM",
  "image_paths": ["uploads/pet01.jpg"],
  "cover_index": 0,
  "gender": "MALE",
  "breed": "Poodle",
  "coat_color": "Vàng",
  "appearance_notes": "lông xoăn, vòng cổ đỏ",
  "latitude": 10.7769,
  "longitude": 106.7009,
  "data_source": "USER"
}
```

Response:

```json
{
  "post_id": 101,
  "report_code": "LOST-000101"
}
```

## Embedding example

The website sends the image to:

```
POST /api/matching/posts/101/images/501/embedding
Authorization: Bearer <token>
Content-Type: multipart/form-data
image=<file>
```

The backend:

1. verifies the post owner;
2. verifies that image 501 belongs to post 101;
3. loads the process-wide DINOv2 PetFace model;
4. creates a 512-dimensional float32 vector;
5. verifies finite values and L2 normalization;
6. saves it through the existing `save_image_embedding` database function.

Example response:

```json
{
  "image_id": 501,
  "model_name": "dinov2_petface",
  "model_version": "v1",
  "dim": 512,
  "dtype": "float32",
  "normalized": true
}
```

## AI search example

Start matching from an authenticated LOST post:

```
POST /api/matching/posts/101
Authorization: Bearer <token>
```

Optional radius:

```
POST /api/matching/posts/101?radius_km=10
```

Allowed values: **5, 10, 20 km**.

The backend:

1. verifies the LOST post owner;
2. reads the primary image and its saved embedding;
3. calls existing `get_search_pool` to obtain active opposite-type posts with embeddings;
4. computes DINOv2 cosine similarity;
5. applies the image threshold;
6. combines image, appearance, location and time signals;
7. saves ranked candidates through `save_candidate`;
8. sends a notification for a high-confidence result.

Example:

```json
{
  "post_id": 101,
  "radius_km": 10,
  "items": [
    {
      "candidate_id": 42,
      "post_id": 205,
      "distance_km": 2.31,
      "image_similarity": 0.86,
      "final_score": 84.7,
      "location_label": "near",
      "image_priority": "high"
    }
  ],
  "message": null
}
```

If no candidate passes the current confidence threshold:

```json
{
  "post_id": 101,
  "radius_km": 20,
  "items": [],
  "message": "No candidate passed the current confidence threshold."
}
```

## Error handling

- **400** invalid business/data input.
- **401** missing or invalid backend bearer token.
- **403** authenticated user is not allowed to operate on the resource.
- **404** post/image/notification not found.
- **409** required matching data is not ready, for example the LOST post has no primary embedding.
- **413** image exceeds 10 MB.
- **415** unsupported image type.
- **422** invalid request fields or invalid matching radius.
- **500** database/backend operation failure.
- **503** DINOv2 checkpoint is not configured or cannot be initialized.

## PetFace verification test

For the planned demo, use the images and IDs from `verification.csv` as ground truth:

- one LOST image is the query;
- several FOUND posts contain the same individual and different individuals;
- the dataset ID is the ground-truth identity;
- location and event time are simulated separately from image identity;
- the expected result is that the correct individual ranks above different individuals when the image signal is sufficiently strong.

The backend does not fabricate the ground truth. Test data should be created from the actual verification file and its existing rules.
