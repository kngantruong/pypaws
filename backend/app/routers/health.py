"""Application and PostgreSQL health endpoints."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from psycopg import Connection

from app.core.database import connect

router = APIRouter(prefix="/api/health", tags=["Health"])

REQUIRED_TABLES = (
    "users",
    "posts",
    "post_images",
    "image_embeddings",
    "candidates",
    "notifications",
)

REQUIRED_FUNCTIONS = (
    "create_user",
    "get_user_by_email",
    "create_post",
    "get_posts",
    "get_post_detail",
    "get_post_images",
    "cancel_post",
    "get_images_needing_embedding",
    "save_image_embedding",
    "get_search_pool",
    "refresh_candidate_ranks",
    "clear_candidates",
    "save_candidate",
    "get_candidates_for_post",
    "get_contact_info",
    "contact_candidate",
    "reject_candidate",
    "notify_candidate",
    "get_notifications",
    "mark_notification_read",
    "resolve_lost_post",
)


@router.get("", summary="Application health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "pypaws-backend"}


def _inspect_schema(connection: Connection) -> dict[str, Any]:
    with connection.cursor() as cursor:
        cursor.execute("SELECT current_database(), current_user, version()")
        database, user, version = cursor.fetchone()

        cursor.execute(
            """
            SELECT table_name, to_regclass('public.' || table_name) IS NOT NULL AS present
            FROM unnest(%s::text[]) AS required(table_name)
            """,
            (list(REQUIRED_TABLES),),
        )
        tables = {name: bool(present) for name, present in cursor.fetchall()}

        cursor.execute(
            """
            SELECT required.function_name,
                   EXISTS (
                       SELECT 1
                       FROM pg_proc p
                       JOIN pg_namespace n ON n.oid = p.pronamespace
                       WHERE n.nspname = 'public'
                         AND p.proname = required.function_name
                   ) AS present
            FROM unnest(%s::text[]) AS required(function_name)
            """,
            (list(REQUIRED_FUNCTIONS),),
        )
        functions = {name: bool(present) for name, present in cursor.fetchall()}

    return {
        "status": "ok" if all(tables.values()) and all(functions.values()) else "degraded",
        "database": database,
        "user": user,
        "postgresql_version": version,
        "tables": tables,
        "functions": functions,
    }


@router.get("/db", summary="Check PostgreSQL connection and PyPaws schema")
def database_health() -> dict[str, Any]:
    try:
        connection = connect()
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail={"code": "DB_UNAVAILABLE", "message": str(exc)},
        ) from exc

    try:
        result = _inspect_schema(connection)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail={"code": "DB_SCHEMA_CHECK_FAILED", "message": str(exc)},
        ) from exc
    finally:
        connection.close()

    if result["status"] != "ok":
        raise HTTPException(status_code=503, detail=result)
    return result
