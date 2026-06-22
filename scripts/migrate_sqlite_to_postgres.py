#!/usr/bin/env python3
"""Conservative SQLite-to-PostgreSQL migration helper for KPCTyping.

This script copies rows from local leaderboard.db into the PostgreSQL database
configured by DATABASE_URL. It intentionally uses simple INSERT statements and
skips duplicate rows so it is safe to re-run during deployment preparation.
"""
from __future__ import annotations

import os
import sqlite3
import sys
from pathlib import Path

TABLES = [
    "users",
    "user_progress",
    "leaderboard",
    "rate_limits",
    "ai_key_stats",
    "ai_practice_sessions",
    "user_xp_events",
    "user_achievements",
    "global_leaderboard_scores",
    "leaderboard_audit_logs",
    "hall_of_fame_records",
    "friend_requests",
    "friends",
    "player_activity",
    "private_challenges",
    "challenge_results",
    "blocked_users",
    "race_rooms",
    "race_players",
    "tournaments",
    "tournament_players",
    "tournament_matches",
    "tournament_results",
    "tournament_audit_logs",
]


def reset_serial_sequences(cur) -> None:
    """Move PostgreSQL SERIAL sequences past copied SQLite ids."""
    for table in TABLES:
        cur.execute("""
            SELECT pg_get_serial_sequence(%s, 'id')
        """, (table,))
        result = cur.fetchone()
        seq = result[0] if result else None
        if not seq:
            continue
        cur.execute(f"SELECT COALESCE(MAX(id), 0) FROM {table}")
        max_id = cur.fetchone()[0] or 0
        if max_id > 0:
            cur.execute("SELECT setval(%s, %s, true)", (seq, max_id))
            print(f"Reset sequence for {table} to {max_id}")


def main() -> int:
    database_url = os.environ.get("DATABASE_URL", "")
    if not database_url.startswith(("postgres://", "postgresql://")):
        print("Set DATABASE_URL to a PostgreSQL URL before running this migration.")
        return 1

    sqlite_path = Path(os.environ.get("SQLITE_DB_PATH", "leaderboard.db"))
    if not sqlite_path.exists():
        print(f"SQLite database not found: {sqlite_path}")
        return 1

    import psycopg2

    source = sqlite3.connect(sqlite_path)
    source.row_factory = sqlite3.Row
    target = psycopg2.connect(database_url)
    target.autocommit = False

    try:
        with target.cursor() as cur:
            for table in TABLES:
                try:
                    rows = source.execute(f"SELECT * FROM {table}").fetchall()
                except sqlite3.Error:
                    continue
                if not rows:
                    continue
                columns = rows[0].keys()
                placeholders = ", ".join(["%s"] * len(columns))
                col_sql = ", ".join(columns)
                sql = f"INSERT INTO {table} ({col_sql}) VALUES ({placeholders}) ON CONFLICT DO NOTHING"
                for row in rows:
                    cur.execute(sql, tuple(row[col] for col in columns))
                print(f"Copied {len(rows)} rows from {table}")
            reset_serial_sequences(cur)
        target.commit()
    except Exception:
        target.rollback()
        raise
    finally:
        target.close()
        source.close()

    print("Migration complete.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
