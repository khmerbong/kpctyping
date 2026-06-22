"""Runtime configuration helpers for KPCTyping.

This keeps deployment/security configuration out of the large route file so future route
blueprint work can happen safely without changing behavior.
"""
import os
from datetime import timedelta


def resolve_secret_key():
    """Use environment secrets in production; use a stable dev fallback only locally."""
    return os.environ.get("SECRET_KEY") or os.environ.get("FLASK_SECRET_KEY") or "dev-only-secret-change-me"


def secret_key_source():
    return "environment" if (os.environ.get("SECRET_KEY") or os.environ.get("FLASK_SECRET_KEY")) else "dev-fallback"


def apply_runtime_config(app):
    app.secret_key = resolve_secret_key()
    app.config.update(
        MAX_CONTENT_LENGTH=16 * 1024,
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        SESSION_COOKIE_SECURE=os.environ.get("SESSION_COOKIE_SECURE", "").lower() in {"1", "true", "yes", "on"},
        PERMANENT_SESSION_LIFETIME=timedelta(days=14),
        JSON_SORT_KEYS=False,
        SECRET_KEY_SOURCE=secret_key_source(),
    )
    if os.environ.get("FLASK_ENV", "").lower() == "production" and app.config["SECRET_KEY_SOURCE"] != "environment":
        app.logger.warning("Production should set SECRET_KEY or FLASK_SECRET_KEY.")
