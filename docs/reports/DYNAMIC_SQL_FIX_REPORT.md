# KPCTyping27 Dynamic SQL Fix Report

## Fixed

1. `/api/race/progress`
   - Removed interpolated `WHERE` fragment from SELECT.
   - Removed interpolated `WHERE` fragment from UPDATE.
   - Replaced with explicit `user_id` and `guest_id` query branches.

2. Tournament match result submit
   - Removed interpolated `{field}_score`, `{field}_wpm`, `{field}_accuracy` columns.
   - Replaced with explicit whitelisted `player1_*` and `player2_*` update branches.

3. SQLite to PostgreSQL migration helper
   - Added identifier validation/quoting helpers for table and column names.
   - Reduced risk from dynamic table/column SQL during migration.

## Remaining dynamic SQL notes

- `/api/activity` still builds an `IN (?, ?, ?)` placeholder list. This is safe because only placeholders are generated dynamically; values are still passed separately as SQL parameters.
- Migration script still composes SQL for schema-driven table/column migration, but identifiers are validated/quoted and table names are restricted to the `TABLES` allowlist.

## Tests Performed

- Python compile check:
  - `python3 -m py_compile app.py scripts/migrate_sqlite_to_postgres.py`
- Production smoke test:
  - `/` => 200
  - `/login` => 200
  - `/register` => 200
  - `/api/health` => 200
  - `/deploy-status` => 200

Result: PASS
