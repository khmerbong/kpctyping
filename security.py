"""Small security notes/helpers for future safe refactor.

Routes intentionally stay in app.py for v38 final polish to avoid breaking existing URLs.
This module documents the production-safe CSP/deploy follow-up path.
"""

CSP_COMPATIBILITY_NOTE = "unsafe-inline kept for v38 compatibility; move inline scripts/styles to external assets before removing it."
RENDER_FALLBACK_COMMAND = "gunicorn -w 1 app:app"
