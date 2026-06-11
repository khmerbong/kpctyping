"""Migrate KPCTyping SQLite data into PostgreSQL.
Requires: pip install psycopg2-binary
Env:
  DATABASE_URL=postgresql://...
Usage:
  python scripts/migrate_sqlite_to_postgres.py leaderboard.db
"""
import os, sys, sqlite3, json
from pathlib import Path
import psycopg2
from psycopg2.extras import execute_values

SQLITE_PATH = Path(sys.argv[1] if len(sys.argv) > 1 else "leaderboard.db")
DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise SystemExit("DATABASE_URL is required")
if not SQLITE_PATH.exists():
    raise SystemExit(f"SQLite database not found: {SQLITE_PATH}")

BASE = Path(__file__).resolve().parents[1]
schema = (BASE / "migrations" / "postgres_schema.sql").read_text(encoding="utf-8")

TABLES = [
    "users", "user_progress", "global_leaderboard", "leaderboard_audit_logs",
    "tournaments", "tournament_players", "tournament_matches", "tournament_results", "tournament_audit_logs",
]

def columns(conn, table):
    return [r[1] for r in conn.execute(f"PRAGMA table_info({table})").fetchall()]

def pg_columns(cur, table):
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=%s ORDER BY ordinal_position", (table,))
    return [r[0] for r in cur.fetchall()]

sqlite = sqlite3.connect(SQLITE_PATH)
sqlite.row_factory = sqlite3.Row
pg = psycopg2.connect(DATABASE_URL)
pg.autocommit = False
try:
    with pg.cursor() as cur:
        cur.execute(schema)
        for table in TABLES:
            try:
                src_cols = columns(sqlite, table)
            except sqlite3.OperationalError:
                print(f"SKIP {table}: not found in SQLite")
                continue
            dst_cols = pg_columns(cur, table)
            common = [c for c in src_cols if c in dst_cols and c != "id"]
            rows = sqlite.execute(f"SELECT {', '.join(common)} FROM {table}").fetchall()
            if not rows:
                print(f"SKIP {table}: empty")
                continue
            values = [tuple(row[c] for c in common) for row in rows]
            sql = f"INSERT INTO {table} ({', '.join(common)}) VALUES %s ON CONFLICT DO NOTHING"
            execute_values(cur, sql, values, page_size=500)
            print(f"MIGRATED {table}: {len(values)} rows")
        pg.commit()
except Exception:
    pg.rollback()
    raise
finally:
    sqlite.close(); pg.close()
print("PostgreSQL migration completed.")
