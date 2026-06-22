"""Database compatibility layer for KPCTyping.

Local development uses SQLite automatically. Production uses PostgreSQL when
DATABASE_URL starts with postgres:// or postgresql://.

This module intentionally keeps the old sqlite-style API used by app.py:
- conn.execute(sql, params)
- with get_connection() as conn:
- rows can be accessed by key, e.g. row["username"]
- cur.lastrowid works for the INSERT statements that need it
"""
from __future__ import annotations

import os
import re
import sqlite3
from pathlib import Path
from typing import Any, Iterable, Optional

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / os.environ.get("SQLITE_DB_NAME", "leaderboard.db")
DATABASE_URL = os.environ.get("DATABASE_URL", "")
REQUIRE_DATABASE_URL = os.environ.get("REQUIRE_DATABASE_URL", "").lower() in {"1", "true", "yes", "on"}
USE_POSTGRES = DATABASE_URL.startswith(("postgres://", "postgresql://"))
DatabaseIntegrityError = sqlite3.IntegrityError

if REQUIRE_DATABASE_URL and not USE_POSTGRES:
    raise RuntimeError("REQUIRE_DATABASE_URL is enabled, but DATABASE_URL is not a PostgreSQL URL. Set DATABASE_URL before production deploy.")

_LASTROWID_TABLES = {
    "users", "leaderboard", "race_rooms", "tournaments", "tournament_players",
    "private_challenges", "global_leaderboard_scores", "analytics_sessions",
    "ai_practice_sessions", "hall_of_fame_records", "friend_requests",
}


def is_postgres() -> bool:
    return USE_POSTGRES


def database_engine() -> str:
    return "postgresql" if USE_POSTGRES else "sqlite"


def _convert_placeholders(sql: str) -> str:
    return sql.replace("?", "%s")


def _convert_sqlite_ddl(sql: str) -> str:
    # Common SQLite DDL -> PostgreSQL DDL conversions used by this project.
    sql = re.sub(r"INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT", "SERIAL PRIMARY KEY", sql, flags=re.I)
    sql = re.sub(r"\bAUTOINCREMENT\b", "", sql, flags=re.I)
    sql = re.sub(r"\bREAL\b", "DOUBLE PRECISION", sql, flags=re.I)
    sql = re.sub(r"\bDATETIME\b", "TIMESTAMP", sql, flags=re.I)
    return sql


def _convert_dml(sql: str) -> str:
    stripped = sql.strip()
    # SQLite UPSERT shortcuts used across app.py.
    if re.match(r"INSERT\s+OR\s+IGNORE\s+INTO", stripped, flags=re.I):
        sql = re.sub(r"INSERT\s+OR\s+IGNORE\s+INTO", "INSERT INTO", sql, count=1, flags=re.I)
        if "ON CONFLICT" not in sql.upper():
            sql = sql.rstrip().rstrip(";") + " ON CONFLICT DO NOTHING"
    elif re.match(r"INSERT\s+OR\s+REPLACE\s+INTO", stripped, flags=re.I):
        # SQLite INSERT OR REPLACE deletes and reinserts. For PostgreSQL we keep
        # stable row ids and update known unique records instead.
        sql = re.sub(r"INSERT\s+OR\s+REPLACE\s+INTO", "INSERT INTO", sql, count=1, flags=re.I)
        if "ON CONFLICT" not in sql.upper():
            table_match = re.match(r"\s*INSERT\s+INTO\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]+)\)", sql, flags=re.I | re.S)
            if table_match and table_match.group(1).lower() == "challenge_results":
                columns = [c.strip().strip('"') for c in table_match.group(2).split(',')]
                updates = [c for c in columns if c not in {"id", "challenge_id", "user_id"}]
                update_sql = ", ".join(f"{c}=excluded.{c}" for c in updates) or "created_at=excluded.created_at"
                sql = sql.rstrip().rstrip(";") + f" ON CONFLICT(challenge_id, user_id) DO UPDATE SET {update_sql}"
            else:
                sql = sql.rstrip().rstrip(";") + " ON CONFLICT DO NOTHING"

    m = re.match(r"\s*INSERT\s+INTO\s+([a-zA-Z_][a-zA-Z0-9_]*)\b", sql, flags=re.I)
    if m and m.group(1).lower() in _LASTROWID_TABLES and "RETURNING" not in sql.upper() and "ON CONFLICT DO NOTHING" not in sql.upper():
        sql = sql.rstrip().rstrip(";") + " RETURNING id"
    return sql


def _prepare_postgres_sql(sql: str) -> str:
    converted = _convert_sqlite_ddl(sql)
    converted = _convert_dml(converted)
    converted = _convert_placeholders(converted)
    return converted


class PostgresCursorCompat:
    def __init__(self, cursor):
        self._cursor = cursor
        self.lastrowid: Optional[int] = None

    def execute(self, sql: str, params: Iterable[Any] | None = None):
        converted = _prepare_postgres_sql(sql)
        try:
            self._cursor.execute(converted, params or ())
            if "RETURNING ID" in converted.upper():
                row = self._cursor.fetchone()
                if row:
                    self.lastrowid = row.get("id") if isinstance(row, dict) else row[0]
        except Exception as exc:
            # Preserve old app.py exception handling behavior for uniqueness errors.
            try:
                import psycopg2
                if isinstance(exc, psycopg2.IntegrityError):
                    raise sqlite3.IntegrityError(str(exc)) from exc
            except ImportError:
                pass
            raise
        return self

    def fetchone(self):
        return self._cursor.fetchone()

    def fetchall(self):
        return self._cursor.fetchall()

    @property
    def rowcount(self):
        return self._cursor.rowcount

    def close(self):
        return self._cursor.close()


class PostgresConnectionCompat:
    def __init__(self, raw):
        self._raw = raw

    def execute(self, sql: str, params: Iterable[Any] | None = None):
        from psycopg2.extras import RealDictCursor
        cur = self._raw.cursor(cursor_factory=RealDictCursor)
        compat = PostgresCursorCompat(cur)
        return compat.execute(sql, params)

    def cursor(self):
        from psycopg2.extras import RealDictCursor
        return PostgresCursorCompat(self._raw.cursor(cursor_factory=RealDictCursor))

    def commit(self):
        return self._raw.commit()

    def rollback(self):
        return self._raw.rollback()

    def close(self):
        return self._raw.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        if exc_type:
            self.rollback()
        else:
            self.commit()
        self.close()
        return False


def get_connection():
    if USE_POSTGRES:
        import psycopg2
        raw = psycopg2.connect(DATABASE_URL, connect_timeout=10)
        return PostgresConnectionCompat(raw)

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def safe_add_column(table: str, column_sql: str) -> None:
    """Add a column if it is missing. Works for SQLite fallback and PostgreSQL production.

    Example: safe_add_column("users", "email_verified INTEGER DEFAULT 0")
    """
    column_name = column_sql.strip().split()[0].strip('"')
    conn = get_connection()
    try:
        if USE_POSTGRES:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column_sql}")
        else:
            existing = [row[1] for row in conn.execute(f"PRAGMA table_info({table})").fetchall()]
            if column_name not in existing:
                conn.execute(f"ALTER TABLE {table} ADD COLUMN {column_sql}")
        conn.commit()
    finally:
        conn.close()
