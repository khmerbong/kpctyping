# KPCTyping Production Clean Release

បានរៀបចំ project សម្រាប់ production ដោយរក្សា feature ដើម។

## អ្វីដែលបានកែ
- លុប `.git/`, `__pycache__/`, file ទទេៗ និង `leaderboard.db` ចេញពី release។
- បន្ថែម session security: `SESSION_COOKIE_SECURE` សម្រាប់ production និង `PERMANENT_SESSION_LIFETIME`។
- ភ្ជាប់ database layer `kpc_db.py` ដើម្បីអាចប្រើ PostgreSQL ពេលមាន `DATABASE_URL` និង fallback ទៅ SQLite សម្រាប់ local។
- រៀប report ចាស់ៗទៅ `docs/archive_reports/` ដើម្បីឲ្យ root folder ស្អាត។
- រក្សា templates/static/scripts/deploy files ដើម ដើម្បីកុំឲ្យ feature បាត់។

## Deploy
Render នឹងប្រើ `render.yaml` និង `requirements-prod.txt`។
Local run: `pip install -r requirements.txt` រួច `python app.py`។
