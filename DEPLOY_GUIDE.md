# KPCTyping 2026 Deploy Guide

## 1. Local Run

```bash
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r requirements.txt
python app.py
```

Open: `http://127.0.0.1:5000`

## 2. Production Environment

Set these environment variables before deploy:

```text
SECRET_KEY=change-this-to-a-long-random-secret
DATABASE_URL=postgresql://user:password@host:5432/database
FLASK_ENV=production
```

## 3. Render Deploy

Included files:

```text
render.yaml
Procfile
requirements-prod.txt
runtime.txt
```

Recommended start command:

```bash
gunicorn app:app
```

## 4. Database

Local development can use SQLite. For production, use PostgreSQL and run the included migration/helper scripts if needed:

```bash
python scripts/init_production_db.py
python scripts/migrate_sqlite_to_postgres.py
```

## 5. Smoke Test

After deploy, check:

```text
/api/health
/api/deploy/status
/api/pwa/status
/api/security/status
```

## 6. PWA Check

Verify:

```text
/manifest.json
/service-worker.js
/offline.html
```
