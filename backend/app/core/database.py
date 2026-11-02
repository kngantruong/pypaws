"""Supabase client lifecycle and request-scoped auth helpers."""
from __future__ import annotations

from supabase import Client, create_client

from app.core.config import get_settings


def get_supabase() -> Client:
    """Create a Supabase client using only the public publishable key.

    The client must not be treated as a database-admin connection. Supabase
    PostgREST permissions and RLS remain authoritative for every request.
    """
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_publishable_key)


def get_supabase_admin() -> Client:
    """Create a server-only Supabase client for trusted backend operations."""
    settings = get_settings()
    if not settings.supabase_service_role_key:
        raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY is not configured.")
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def get_db() -> Client:
    """FastAPI dependency alias used by data-access layers."""
    return get_supabase()
