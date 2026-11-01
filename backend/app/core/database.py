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


def get_db() -> Client:
    """FastAPI dependency alias used by data-access layers."""
    return get_supabase()
