"""PostgreSQL connection helpers used by FastAPI dependencies."""
from __future__ import annotations

from collections.abc import Generator

import psycopg
from psycopg import Connection

from app.core.config import get_settings


def connect() -> Connection:
    settings = get_settings()
    return psycopg.connect(
        settings.database_url,
        connect_timeout=settings.db_connect_timeout,
        application_name="pypaws-backend",
    )


def get_db() -> Generator[Connection, None, None]:
    """Yield one PostgreSQL connection for a request.

    Services in later milestones can explicitly commit their transaction. On an
    exception the request transaction is rolled back before the connection is closed.
    """
    connection = connect()
    try:
        yield connection
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()
