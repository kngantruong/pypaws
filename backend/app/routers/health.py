"""Application and Supabase health endpoints."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException

from app.core.database import get_supabase

router = APIRouter(prefix="/api/health", tags=["Health"])

REQUIRED_TABLES = (
    "users",
    "posts",
    "post_images",
    "image_embeddings",
    "candidates",
    "notifications",
)


@router.get("", summary="Application health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "pypaws-backend"}


def _check_table(client: Any, table_name: str) -> dict[str, Any]:
    """Check table accessibility through PostgREST.

    We intentionally issue a zero-row select. This verifies that the table is
    exposed to the current Supabase API role without changing data. A 403/401
    or another PostgREST error is reported as inaccessible, not as evidence that
    the table does not exist. This distinction matters with RLS.
    """
    try:
        response = client.table(table_name).select("*", count="exact").limit(0).execute()
        return {
            "accessible": True,
            "count": response.count,
            "error": None,
        }
    except Exception as exc:
        return {
            "accessible": False,
            "count": None,
            "error": str(exc),
        }


@router.get("/db", summary="Check Supabase connection and canonical tables")
def database_health() -> dict[str, Any]:
    try:
        client = get_supabase()
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail={"code": "SUPABASE_CLIENT_UNAVAILABLE", "message": str(exc)},
        ) from exc

    tables = {name: _check_table(client, name) for name in REQUIRED_TABLES}
    accessible = all(item["accessible"] for item in tables.values())

    return {
        "status": "ok" if accessible else "degraded",
        "provider": "supabase",
        "tables": tables,
        "rls_note": (
            "Table accessibility is evaluated using the publishable key. "
            "An inaccessible table may be caused by RLS/API permissions and "
            "is not treated as proof that the table is absent."
        ),
    }
