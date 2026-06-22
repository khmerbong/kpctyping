from flask import Flask, render_template, request, jsonify, send_from_directory, session, g, redirect, send_file, url_for
from werkzeug.middleware.proxy_fix import ProxyFix
from werkzeug.security import generate_password_hash, check_password_hash
from urllib.parse import urlparse
from kpc_db import get_connection, database_engine, DatabaseIntegrityError, safe_add_column
import re
import os
import json
import secrets
import hashlib
from pathlib import Path
from datetime import datetime, timedelta
from functools import wraps
from lessons_data import get_lessons, get_lesson, lesson_groups
from config import apply_runtime_config
from api_response import api_error, api_success

# Optional realtime layer. The app still works with HTTP polling when Flask-SocketIO is not installed.
try:
    from flask_socketio import SocketIO, join_room
except Exception:  # pragma: no cover - production optional dependency
    SocketIO = None
    join_room = None

# Optional production-grade request limiter. The internal DB limiter still works
# when Flask-Limiter is not installed, so local development remains simple.
try:
    from flask_limiter import Limiter
    from flask_limiter.util import get_remote_address
except Exception:  # pragma: no cover - optional dependency
    Limiter = None
    get_remote_address = None

app = Flask(__name__)
# Trust the common reverse-proxy headers used by Render/Railway/Fly/NGINX so HTTPS security checks work after deployment.
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1)
apply_runtime_config(app)
app.config["DATABASE_ENGINE"] = database_engine()
app.config["PRODUCTION_STRICT_DATABASE"] = os.environ.get("REQUIRE_DATABASE_URL", "").lower() in {"1", "true", "yes", "on"}
app.config["REALTIME_SOCKETIO_ENABLED"] = SocketIO is not None
app.config["FLASK_LIMITER_ENABLED"] = Limiter is not None
socketio = SocketIO(app, async_mode="threading", cors_allowed_origins="*") if SocketIO else None

limiter = None
if Limiter:
    limiter = Limiter(
        key_func=get_remote_address,
        app=app,
        default_limits=[os.environ.get("DEFAULT_RATE_LIMIT", "300 per hour")],
        storage_uri=os.environ.get("RATELIMIT_STORAGE_URI", "memory://"),
    )

def limit_rule(rule):
    """Use Flask-Limiter when available; otherwise keep functions unchanged."""
    def decorator(func):
        return limiter.limit(rule)(func) if limiter else func
    return decorator

if socketio:
    @socketio.on("join_race_room")
    def _socket_join_race_room(data):
        code = str((data or {}).get("room_code", "")).strip().upper()
        if code and join_room:
            join_room(code)

def _emit_race_update(room_code, payload):
    """Push race state instantly when SocketIO is available; polling remains as fallback."""
    if socketio and room_code and payload:
        socketio.emit("race_update", payload, to=str(room_code).upper())


BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "leaderboard.db"  # SQLite fallback path; production can use DATABASE_URL via kpc_db.py


def sanitize_player_name(value):
    value = (value or "").strip()
    # Safe display name: English, Khmer Unicode, numbers, spaces, dot, @, _ and -
    value = re.sub(r"[^0-9A-Za-z_\- .@\u1780-\u17FF]", "", value)
    return value[:40]

# REAL Phase 6.1 Local User System
def get_db_connection():
    """Database connection wrapper. Uses PostgreSQL when DATABASE_URL is set, otherwise SQLite.
    Keeps the old sqlite-style API so existing features continue working.
    """
    return get_connection()

def ensure_user_tables():
    conn = get_db_connection()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            email TEXT UNIQUE,
            password_hash TEXT NOT NULL,
            xp INTEGER DEFAULT 0,
            progress_json TEXT DEFAULT '{}',
            analytics_json TEXT DEFAULT '{}',
            created_at TEXT NOT NULL,
            last_login TEXT
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS user_progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            progress_type TEXT NOT NULL,
            payload TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(user_id, progress_type),
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    """)
    # REAL PHASE 8: AI Coach persistent tracking tables.
    conn.execute("""
        CREATE TABLE IF NOT EXISTS ai_key_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            guest_id TEXT,
            key_value TEXT NOT NULL,
            correct_count INTEGER DEFAULT 0,
            wrong_count INTEGER DEFAULT 0,
            total_time_ms INTEGER DEFAULT 0,
            slow_count INTEGER DEFAULT 0,
            last_seen TEXT NOT NULL,
            UNIQUE(user_id, key_value),
            UNIQUE(guest_id, key_value),
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS ai_practice_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            guest_id TEXT,
            lesson_name TEXT DEFAULT 'Training Mode',
            total_keys INTEGER DEFAULT 0,
            correct_keys INTEGER DEFAULT 0,
            wrong_keys INTEGER DEFAULT 0,
            avg_time_ms INTEGER DEFAULT 0,
            weak_keys_json TEXT DEFAULT '[]',
            recommended_text TEXT DEFAULT '',
            created_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_ai_stats_user_guest ON ai_key_stats (user_id, guest_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_ai_sessions_user_guest ON ai_practice_sessions (user_id, guest_id, created_at)")

    # REAL PHASE 9: XP, career ranks, achievements and daily reward tables.
    conn.execute("""
        CREATE TABLE IF NOT EXISTS user_xp_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            event_type TEXT NOT NULL,
            xp_amount INTEGER NOT NULL,
            meta_json TEXT DEFAULT '{}',
            event_key TEXT,
            created_at TEXT NOT NULL,
            UNIQUE(user_id, event_key),
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS user_achievements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            achievement_key TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            xp_bonus INTEGER DEFAULT 0,
            unlocked_at TEXT NOT NULL,
            UNIQUE(user_id, achievement_key),
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS user_streaks (
            user_id INTEGER PRIMARY KEY,
            current_streak INTEGER DEFAULT 0,
            best_streak INTEGER DEFAULT 0,
            last_activity_date TEXT,
            last_reward_date TEXT,
            reward_day INTEGER DEFAULT 0,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS user_career_stats (
            user_id INTEGER PRIMARY KEY,
            lessons_completed INTEGER DEFAULT 0,
            best_wpm INTEGER DEFAULT 0,
            avg_wpm REAL DEFAULT 0,
            best_accuracy REAL DEFAULT 0,
            avg_accuracy REAL DEFAULT 0,
            perfect_lessons INTEGER DEFAULT 0,
            daily_challenges_completed INTEGER DEFAULT 0,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_xp_events_user_created ON user_xp_events (user_id, created_at)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_achievements_user ON user_achievements (user_id, achievement_key)")

    # REAL PHASE 10: Pro analytics dashboard tables.
    conn.execute("""
        CREATE TABLE IF NOT EXISTS analytics_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            lesson_id TEXT DEFAULT 'practice',
            mode TEXT DEFAULT 'training',
            wpm REAL DEFAULT 0,
            accuracy REAL DEFAULT 0,
            duration_sec INTEGER DEFAULT 0,
            total_keys INTEGER DEFAULT 0,
            correct_keys INTEGER DEFAULT 0,
            wrong_keys INTEGER DEFAULT 0,
            weak_keys_json TEXT DEFAULT '[]',
            key_times_json TEXT DEFAULT '{}',
            created_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_analytics_user_created ON analytics_sessions (user_id, created_at)")



    # REAL PHASE 13: Global leaderboard, rankings, seasons, public player profiles and audit logs.
    conn.execute("""
        CREATE TABLE IF NOT EXISTS global_leaderboard_scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            username TEXT NOT NULL,
            country TEXT DEFAULT 'Global',
            game_mode TEXT DEFAULT 'training',
            score INTEGER DEFAULT 0,
            wpm REAL DEFAULT 0,
            accuracy REAL DEFAULT 0,
            xp INTEGER DEFAULT 0,
            career_rank TEXT DEFAULT 'Beginner',
            season_key TEXT NOT NULL,
            week_key TEXT NOT NULL,
            month_key TEXT NOT NULL,
            evidence_hash TEXT NOT NULL,
            verified INTEGER DEFAULT 1,
            created_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS leaderboard_audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            username TEXT DEFAULT '',
            action TEXT NOT NULL,
            status TEXT NOT NULL,
            reason TEXT DEFAULT '',
            payload_json TEXT DEFAULT '{}',
            ip_hash TEXT DEFAULT '',
            created_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS hall_of_fame_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            record_type TEXT NOT NULL,
            user_id INTEGER,
            username TEXT NOT NULL,
            country TEXT DEFAULT 'Global',
            value REAL NOT NULL,
            meta_json TEXT DEFAULT '{}',
            created_at TEXT NOT NULL,
            UNIQUE(record_type, user_id),
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_global_scores_wpm ON global_leaderboard_scores (verified, wpm DESC, accuracy DESC, created_at DESC)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_global_scores_country ON global_leaderboard_scores (country, verified, wpm DESC, accuracy DESC)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_global_scores_week ON global_leaderboard_scores (week_key, verified, wpm DESC, accuracy DESC)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_global_scores_month ON global_leaderboard_scores (month_key, verified, wpm DESC, accuracy DESC)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_global_scores_season ON global_leaderboard_scores (season_key, verified, wpm DESC, accuracy DESC)")

    # REAL PHASE 14: Friends, social presence, private challenges and privacy tables.
    conn.execute("""
        CREATE TABLE IF NOT EXISTS friend_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id INTEGER NOT NULL,
            receiver_id INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at TEXT NOT NULL,
            responded_at TEXT,
            UNIQUE(sender_id, receiver_id),
            FOREIGN KEY(sender_id) REFERENCES users(id),
            FOREIGN KEY(receiver_id) REFERENCES users(id)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS friends (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            friend_id INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            UNIQUE(user_id, friend_id),
            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(friend_id) REFERENCES users(id)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS user_presence (
            user_id INTEGER PRIMARY KEY,
            status TEXT DEFAULT 'offline',
            last_seen TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS player_activity (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            activity_type TEXT NOT NULL,
            title TEXT NOT NULL,
            meta_json TEXT DEFAULT '{}',
            created_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS private_challenges (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            challenger_id INTEGER NOT NULL,
            receiver_id INTEGER NOT NULL,
            mode TEXT DEFAULT 'best_of_1',
            prompt_text TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at TEXT NOT NULL,
            responded_at TEXT,
            completed_at TEXT,
            FOREIGN KEY(challenger_id) REFERENCES users(id),
            FOREIGN KEY(receiver_id) REFERENCES users(id)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS challenge_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            challenge_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            wpm REAL DEFAULT 0,
            accuracy REAL DEFAULT 0,
            score INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            UNIQUE(challenge_id, user_id),
            FOREIGN KEY(challenge_id) REFERENCES private_challenges(id),
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS blocked_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            blocker_id INTEGER NOT NULL,
            blocked_id INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            UNIQUE(blocker_id, blocked_id),
            FOREIGN KEY(blocker_id) REFERENCES users(id),
            FOREIGN KEY(blocked_id) REFERENCES users(id)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS privacy_settings (
            user_id INTEGER PRIMARY KEY,
            profile_visibility TEXT DEFAULT 'public',
            allow_friend_requests INTEGER DEFAULT 1,
            allow_challenges INTEGER DEFAULT 1,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests (receiver_id, status, created_at)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_friends_user ON friends (user_id, friend_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_activity_user_created ON player_activity (user_id, created_at)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_challenges_receiver ON private_challenges (receiver_id, status, created_at)")

    # REAL PHASE 11: Multiplayer Race polling-based race rooms.
    conn.execute("""
        CREATE TABLE IF NOT EXISTS race_rooms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room_code TEXT NOT NULL UNIQUE,
            host_user_id INTEGER,
            title TEXT DEFAULT 'Typing Race',
            prompt_text TEXT NOT NULL,
            status TEXT DEFAULT 'waiting',
            countdown_seconds INTEGER DEFAULT 5,
            max_players INTEGER DEFAULT 10,
            created_at TEXT NOT NULL,
            started_at TEXT,
            finished_at TEXT,
            FOREIGN KEY(host_user_id) REFERENCES users(id)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS race_players (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room_id INTEGER NOT NULL,
            user_id INTEGER,
            guest_id TEXT,
            player_name TEXT NOT NULL,
            progress INTEGER DEFAULT 0,
            wpm REAL DEFAULT 0,
            accuracy REAL DEFAULT 100,
            mistakes INTEGER DEFAULT 0,
            position INTEGER DEFAULT 0,
            finished INTEGER DEFAULT 0,
            joined_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            finished_at TEXT,
            UNIQUE(room_id, user_id),
            UNIQUE(room_id, guest_id),
            FOREIGN KEY(room_id) REFERENCES race_rooms(id),
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_race_rooms_code ON race_rooms (room_code)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_race_players_room ON race_players (room_id, updated_at)")
    conn.commit()
    conn.close()

def current_user():
    uid = session.get("user_id")
    if not uid:
        return None
    conn = get_db_connection()
    user = conn.execute("SELECT id, username, email, xp, created_at, last_login, email_verified, email_verification_token, is_admin FROM users WHERE id = ?", (uid,)).fetchone()
    conn.close()
    return dict(user) if user else None


def _row_value(row, key, default=None):
    """Safely read from dict, sqlite3.Row, or psycopg2 RealDictRow objects."""
    if row is None:
        return default
    try:
        value = row.get(key, default) if hasattr(row, "get") else row[key]
        return default if value is None else value
    except Exception:
        return default


def _career_rank_name(career, default="Beginner"):
    """Normalize career rank whether older code returns a string or newer code returns {name: ...}."""
    if not isinstance(career, dict):
        return default
    rank = career.get("rank")
    if isinstance(rank, dict):
        return rank.get("name") or default
    if isinstance(rank, str) and rank.strip():
        return rank
    return default


def _career_level_number(career, default=1):
    if not isinstance(career, dict):
        return default
    level = career.get("level", default)
    if isinstance(level, dict):
        return int(level.get("level") or default)
    try:
        return int(level or default)
    except Exception:
        return default


def _career_total_xp(career, fallback=0):
    if not isinstance(career, dict):
        return int(fallback or 0)
    value = career.get("total_xp", career.get("xp", fallback))
    try:
        return int(value or 0)
    except Exception:
        return int(fallback or 0)

@app.context_processor
def inject_current_user():
    return {"current_user": current_user(), "csrf_token_value": session.get("csrf_token", ""), "realtime_socketio_enabled": app.config.get("REALTIME_SOCKETIO_ENABLED", False)}

def login_required_view():
    if not session.get("user_id"):
        return False
    return True


def guest_required_response(feature_name="this feature"):
    """Friendly gate for login-only features. Guest users can still play and browse public pages."""
    return render_template(
        "guest_required.html",
        feature_name=feature_name,
        next_url=request.path,
    )

def admin_required(view_func):
    """Protect future admin pages without changing normal user features."""
    @wraps(view_func)
    def wrapped(*args, **kwargs):
        user = current_user()
        if not user:
            return redirect(url_for("login", next=request.path))
        if not int(user.get("is_admin") or 0):
            return render_template("guest_required.html", feature_name="Admin Dashboard", next_url="/"), 403
        return view_func(*args, **kwargs)
    return wrapped


def guest_name():
    gid = session.get("guest_id")
    if not gid:
        gid = secrets.token_hex(4)
        session["guest_id"] = gid
    return f"Guest-{gid[:4].upper()}"

def ensure_auth_upgrade_columns():
    """Non-breaking auth columns for email verification/password reset readiness."""
    for column in (
        "email_verified INTEGER DEFAULT 0",
        "email_verification_token TEXT",
        "password_reset_token TEXT",
        "password_reset_expires TEXT",
        "is_admin INTEGER DEFAULT 0",
    ):
        try:
            safe_add_column("users", column)
        except Exception:
            # Keep legacy installs bootable; deployment smoke tests will reveal DB permission issues.
            pass

ensure_user_tables()
ensure_auth_upgrade_columns()


# Phase 2 Security: stronger headers without breaking existing inline template scripts.
@app.after_request
def add_security_headers(response):
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()")
    response.headers.setdefault(
        "Content-Security-Policy",
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com data:; "
        "img-src 'self' data: blob: https:; "
        "connect-src 'self' https://www.google-analytics.com; "
        "frame-ancestors 'self'; "
        "base-uri 'self'; "
        "form-action 'self'; "
        "object-src 'none'"
    )
    if request.path.startswith("/api/"):
        response.headers.setdefault("Cache-Control", "no-store")
    if request.is_secure or request.headers.get("X-Forwarded-Proto", "").lower() == "https":
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
        response.set_cookie("secure_context", "1", secure=True, httponly=True, samesite="Lax", max_age=31536000)
    return response


@app.after_request
def normalize_api_response_shape(response):
    """Keep old `ok` responses working while adding a production-friendly `success`/`error` shape.
    This is intentionally non-breaking: existing frontend code can still read `ok`, while new code can
    rely on `success` and `error` consistently for /api/* responses.
    """
    if not request.path.startswith("/api/"):
        return response
    if not (response.mimetype or "").startswith("application/json"):
        return response
    try:
        payload = response.get_json(silent=True)
    except Exception:
        payload = None
    if not isinstance(payload, dict):
        return response
    success = payload.get("success")
    if success is None:
        success = bool(payload.get("ok", 200 <= response.status_code < 400))
        payload["success"] = success
    if "ok" not in payload:
        payload["ok"] = bool(success)
    if not success and "error" not in payload:
        payload["error"] = payload.get("message") or payload.get("reason") or "Request failed"
    response.set_data(json.dumps(payload, ensure_ascii=False, separators=(",", ":")))
    response.mimetype = "application/json"
    return response

@app.before_request
def prepare_csrf_token():
    if "csrf_token" not in session:
        session["csrf_token"] = secrets.token_urlsafe(32)
    g.csrf_token = session["csrf_token"]

@app.before_request
def reject_cross_origin_posts():
    if not _same_origin_post():
        return _json_error("Cross-origin POST blocked.", 403)

@app.context_processor
def inject_security_context():
    return {"csrf_token": g.get("csrf_token", session.get("csrf_token", ""))}

def _client_ip_hash():
    raw_ip = request.headers.get("X-Forwarded-For", request.remote_addr or "local").split(",")[0].strip()
    return hashlib.sha256(raw_ip.encode("utf-8")).hexdigest()

def _json_error(message, status=400):
    return api_error(message, status)


def _is_api_path():
    return request.path.startswith("/api/")


@app.errorhandler(404)
def handle_not_found(error):
    if _is_api_path():
        return api_error("API endpoint not found.", 404, code="not_found", path=request.path)
    return render_template("guest_required.html", title="Page not found", message="The page you requested was not found."), 404


@app.errorhandler(405)
def handle_method_not_allowed(error):
    if _is_api_path():
        return api_error("Method not allowed for this API endpoint.", 405, code="method_not_allowed", path=request.path)
    return render_template("guest_required.html", title="Method not allowed", message="This action is not available here."), 405


@app.errorhandler(500)
def handle_internal_error(error):
    if _is_api_path():
        return api_error("Internal server error.", 500, code="internal_server_error")
    return render_template("guest_required.html", title="Something went wrong", message="Please refresh and try again."), 500


def _same_origin_post():
    """Reject cross-site POSTs before CSRF validation. Safe for same-origin fetch() and normal local testing."""
    if request.method not in {"POST", "PUT", "PATCH", "DELETE"}:
        return True
    origin = request.headers.get("Origin") or request.headers.get("Referer")
    if not origin:
        # Some privacy tools strip Origin/Referer. CSRF token is still required, so allow this case.
        return True
    parsed = urlparse(origin)
    origin_host = parsed.netloc.lower()
    request_host = request.host.lower()
    return origin_host == request_host

def _validate_csrf():
    token = (
        request.headers.get("X-CSRFToken")
        or request.headers.get("X-CSRF-Token")
        or request.form.get("csrf_token")
        or ((request.get_json(silent=True) or {}).get("csrf_token") if request.is_json else "")
        or ""
    )
    return bool(token and secrets.compare_digest(token, session.get("csrf_token", "")))

def _make_token(prefix="tok"):
    return f"{prefix}_{secrets.token_urlsafe(32)}"

def _send_auth_email(to_email, subject, body):
    """Send auth email when SMTP env vars exist. Returns False when email is not configured."""
    host = os.environ.get("SMTP_HOST")
    port = int(os.environ.get("SMTP_PORT", "587"))
    username = os.environ.get("SMTP_USERNAME")
    password = os.environ.get("SMTP_PASSWORD")
    sender = os.environ.get("MAIL_FROM") or username
    if not (host and sender):
        return False
    try:
        import smtplib
        from email.message import EmailMessage
        msg = EmailMessage()
        msg["From"] = sender
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.set_content(body)
        with smtplib.SMTP(host, port, timeout=10) as smtp:
            smtp.starttls()
            if username and password:
                smtp.login(username, password)
            smtp.send_message(msg)
        return True
    except Exception:
        return False

def _public_base_url():
    return os.environ.get("PUBLIC_BASE_URL") or os.environ.get("RENDER_EXTERNAL_URL") or os.environ.get("BASE_URL") or request.url_root.rstrip("/")


def _check_rate_limit(endpoint="generic", limit_seconds=3, max_hits=None, window_minutes=15, record=True):
    """Simple DB-backed rate limiter.

    record=False lets login check existing failed attempts without counting every
    successful login against the abuse limit. Score/password-reset flows keep the
    original record-on-check behavior.
    """
    ip_hash = _client_ip_hash()
    cutoff = (datetime.utcnow() - timedelta(minutes=window_minutes)).strftime("%Y-%m-%d %H:%M:%S")
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    with get_db() as conn:
        conn.execute("DELETE FROM rate_limits WHERE created_at < ?", (cutoff,))
        rows = conn.execute(
            "SELECT created_at FROM rate_limits WHERE ip_hash = ? AND endpoint = ? ORDER BY created_at DESC",
            (ip_hash, endpoint),
        ).fetchall()
        if rows and limit_seconds:
            last = datetime.strptime(rows[0]["created_at"], "%Y-%m-%d %H:%M:%S")
            if (datetime.utcnow() - last).total_seconds() < limit_seconds:
                return False
        if max_hits is not None and len(rows) >= max_hits:
            return False
        if record:
            conn.execute("INSERT INTO rate_limits (ip_hash, endpoint, created_at) VALUES (?, ?, ?)", (ip_hash, endpoint, now))
            conn.commit()
    return True


def _record_rate_limit(endpoint="generic"):
    ip_hash = _client_ip_hash()
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    with get_db() as conn:
        conn.execute("INSERT INTO rate_limits (ip_hash, endpoint, created_at) VALUES (?, ?, ?)", (ip_hash, endpoint, now))
        conn.commit()


def _clear_rate_limit(endpoint="generic"):
    ip_hash = _client_ip_hash()
    with get_db() as conn:
        conn.execute("DELETE FROM rate_limits WHERE ip_hash = ? AND endpoint = ?", (ip_hash, endpoint))
        conn.commit()

def _check_score_rate_limit(limit_seconds=3):
    return _check_rate_limit("submit_score", limit_seconds=limit_seconds, max_hits=60, window_minutes=60)


GAMES = [
    {
        "title": "Speed Typing Test",
        "emoji": "⌨️",
        "desc": "60-second typing challenge with WPM, accuracy and score.",
        "url": "/typing-test",
        "status": "Play now",
    },
    {
        "title": "Zombie Typing",
        "emoji": "🧟",
        "desc": "Stop the zombies before they reach your base.",
        "url": "/zombie-typing",
        "status": "Play now",
    },
    {
        "title": "Vampire Hunter",
        "emoji": "🦇",
        "desc": "Hunt vampires in a night castle typing battle.",
        "url": "/vampire-hunter",
        "status": "Play now",
    },
    {
        "title": "Space Typing",
        "emoji": "🚀",
        "desc": "Space adventure typing game. Play Now.",
        "url": "/space-typing",
        "status": "Play Now",
    },
]

def get_db():
    """Compatibility alias used by leaderboard/rate-limit code."""
    return get_connection()

def init_db():
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS leaderboard (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player_name TEXT NOT NULL DEFAULT 'Guest Player',
                game TEXT NOT NULL,
                score INTEGER NOT NULL DEFAULT 0,
                combo INTEGER NOT NULL DEFAULT 0,
                level INTEGER NOT NULL DEFAULT 1,
                wpm INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS rate_limits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ip_hash TEXT NOT NULL,
                endpoint TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_created ON rate_limits (ip_hash, created_at)")
        conn.commit()

def clean_game(value):
    value = str(value or "all").strip().lower()
    allowed = {"speed", "zombie", "vampire", "space", "lesson", "all"}
    return value if value in allowed else "all"

@app.route("/")
def home():
    return render_template("index.html", games=GAMES)

@app.route("/api/home-stats")
def api_home_stats():
    """Small real-data summary used by the homepage.

    The original landing numbers remain visible as fallback while this endpoint fills
    them with saved local/global scores when available.
    """
    with get_db_connection() as conn:
        best = conn.execute("SELECT MAX(wpm) AS best_wpm, MAX(accuracy) AS best_accuracy, MAX(score) AS best_score FROM global_leaderboard_scores WHERE verified=1").fetchone()
        top = conn.execute("SELECT username, country, wpm, accuracy, score FROM global_leaderboard_scores WHERE verified=1 ORDER BY wpm DESC, accuracy DESC, score DESC, created_at DESC LIMIT 3").fetchall()
        local_best = conn.execute("SELECT MAX(wpm) AS best_wpm, MAX(score) AS best_score FROM leaderboard").fetchone()
        tests = conn.execute("SELECT COUNT(*) AS c FROM leaderboard").fetchone()
        lessons_done = conn.execute("SELECT COUNT(*) AS c FROM leaderboard WHERE game='lesson'").fetchone()
    def cell(row, key, default=0):
        try:
            return row[key] if row and row[key] is not None else default
        except Exception:
            return default
    best_wpm = round(float(cell(best, "best_wpm", cell(local_best, "best_wpm", 0))), 1)
    best_acc = round(float(cell(best, "best_accuracy", 0)), 1)
    return jsonify({
        "ok": True,
        "stats": {
            "best_wpm": best_wpm,
            "accuracy": best_acc,
            "tests_saved": int(cell(tests, "c", 0)),
            "lessons_saved": int(cell(lessons_done, "c", 0)),
            "best_score": int(cell(best, "best_score", cell(local_best, "best_score", 0))),
            "total_lessons": len(get_lessons()),
        },
        "top_players": [{"username": r["username"], "country": r["country"], "wpm": round(float(r["wpm"] or 0), 1), "accuracy": round(float(r["accuracy"] or 0), 1), "score": int(r["score"] or 0)} for r in top],
    })

@app.route("/typing-test")
def typing_test():
    return render_template("typing_test.html")

@app.route("/zombie-typing")
def zombie_typing():
    return render_template("zombie_typing.html")

@app.route("/vampire-hunter")
def vampire_hunter():
    return render_template("vampire_hunter.html")


@app.route("/space-typing")
def space_typing():
    return render_template("space_typing.html")

@app.route("/leaderboard")
def leaderboard():
    game = clean_game(request.args.get("game", "all"))
    if game == "all":
        query = "SELECT * FROM leaderboard ORDER BY score DESC, combo DESC, level DESC, wpm DESC LIMIT 50"
        params = ()
    else:
        query = "SELECT * FROM leaderboard WHERE game = ? ORDER BY score DESC, combo DESC, level DESC, wpm DESC LIMIT 50"
        params = (game,)

    with get_db() as conn:
        rows = conn.execute(query, params).fetchall()

    return render_template("leaderboard.html", rows=rows, selected_game=game)

@app.route("/api/leaderboard", methods=["GET"])
def api_leaderboard():
    game = clean_game(request.args.get("game", "all"))
    if game == "all":
        query = "SELECT * FROM leaderboard ORDER BY score DESC, combo DESC, level DESC, wpm DESC LIMIT 20"
        params = ()
    else:
        query = "SELECT * FROM leaderboard WHERE game = ? ORDER BY score DESC, combo DESC, level DESC, wpm DESC LIMIT 20"
        params = (game,)

    with get_db() as conn:
        rows = conn.execute(query, params).fetchall()

    scores = [dict(row) for row in rows]
    return api_success(data=scores, scores=scores)

@app.route("/api/score", methods=["POST"])
@app.route("/api/submit-score", methods=["POST"])
@limit_rule("30 per minute")
def submit_score():
    if not request.is_json:
        return _json_error("JSON request required.", 415)
    if not _validate_csrf():
        return _json_error("Security token missing or expired. Refresh the page and try again.", 403)
    if not _check_score_rate_limit(limit_seconds=3):
        return _json_error("Please wait before submitting another score.", 429)

    data = request.get_json(silent=True) or {}

    active_user = current_user()
    raw_name = str(data.get("player_name") or "Guest Player").strip()
    # Logged-in typing results must always use the authenticated account name.
    # The browser may still have an old Guest name in localStorage; do not let that
    # override the real account on the leaderboard. Guests keep their local name.
    if active_user:
        player_name = sanitize_player_name(active_user.get("username") or session.get("username") or "Account Player") or "Account Player"
    else:
        # Keep names friendly and safe: letters, numbers, Khmer unicode, spaces, _ and - only.
        player_name = re.sub(r"[^0-9A-Za-z_\-\s\u1780-\u17FF]", "", raw_name)[:24].strip() or "Guest Player"
    game = clean_game(str(data.get("game") or "all"))
    if game == "all":
        game = "speed"

    def to_int(name, default=0):
        try:
            return max(0, int(float(data.get(name, default))))
        except (TypeError, ValueError):
            return default

    score = to_int("score")
    combo = to_int("combo")
    level = max(1, to_int("level", 1))
    wpm = to_int("wpm")
    accuracy = max(0, min(100, to_int("accuracy", 100)))
    duration_sec = max(10, min(7200, to_int("duration_sec", 60)))
    total_keys = max(0, min(50000, to_int("total_keys", combo)))
    country = _safe_country(data.get("country") or "Global") if "_safe_country" in globals() else "Global"
    created_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    # Phase 2 anti-cheat guardrails. These limits reduce impossible browser-posted scores.
    max_values = {
        "speed": {"score": 50000, "combo": 1000, "level": 100, "wpm": 250},
        "lesson": {"score": 50000, "combo": 5000, "level": 60, "wpm": 250},
        "zombie": {"score": 150000, "combo": 1000, "level": 100, "wpm": 250},
        "vampire": {"score": 150000, "combo": 1000, "level": 100, "wpm": 250},
        "space": {"score": 200000, "combo": 1500, "level": 100, "wpm": 250},
    }.get(game, {"score": 50000, "combo": 1000, "level": 100, "wpm": 250})
    if score > max_values["score"] or combo > max_values["combo"] or level > max_values["level"] or wpm > max_values["wpm"]:
        return _json_error("Score rejected by anti-cheat limits.", 400)
    if wpm > 0 and score > (wpm * 600 + combo * 120 + level * 2500):
        return _json_error("Score rejected by consistency checks.", 400)

    # Avoid saving totally empty games
    if score <= 0 and combo <= 0 and wpm <= 0:
        return _json_error("Empty score ignored.", 400)

    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO leaderboard (player_name, game, score, combo, level, wpm, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (player_name, game, score, combo, level, wpm, created_at),
        )
        # Keep the old game leaderboard, but also mirror real typing/training results
        # into the Global Leaderboard so the public leaderboard becomes functional.
        global_payload = {
            "username": player_name,
            "country": country,
            "game_mode": "training" if game == "lesson" else game,
            "score": score,
            "wpm": wpm,
            "accuracy": accuracy,
            "duration_sec": duration_sec,
            "total_keys": total_keys,
            "source": "api_submit_score",
        }
        mirror = _save_global_score(conn, global_payload, action="submit_score_mirror") if "_save_global_score" in globals() else {"saved": False}
        conn.commit()

    return jsonify({"ok": True, "player_name": player_name, "mode": "account" if active_user else "guest", "global_leaderboard": mirror})

init_db()





@app.route("/healthz")
def healthz():
    """Small deploy health check for Render/Railway/Fly/Nginx."""
    return jsonify({
        "ok": True,
        "database_engine": app.config.get("DATABASE_ENGINE"),
        "strict_database": app.config.get("PRODUCTION_STRICT_DATABASE", False),
        "socketio": app.config.get("REALTIME_SOCKETIO_ENABLED", False),
        "flask_limiter": app.config.get("FLASK_LIMITER_ENABLED", False),
    })

@app.route("/register", methods=["GET", "POST"])
@limit_rule("10 per hour")
def register():
    if request.method == "GET":
        return render_template("register.html")
    if not _validate_csrf():
        return render_template("register.html", error="Security token expired. Please try again."), 400

    username = sanitize_player_name(request.form.get("username", ""))
    email = (request.form.get("email", "") or "").strip().lower()
    password = request.form.get("password", "")
    confirm = request.form.get("confirm_password", "")

    if len(username) < 3:
        return render_template("register.html", error="Username must be at least 3 characters."), 400
    if email and not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        return render_template("register.html", error="Please enter a valid email address."), 400
    if len(password) < 8:
        return render_template("register.html", error="Password must be at least 8 characters."), 400
    if password != confirm:
        return render_template("register.html", error="Passwords do not match."), 400

    password_hash = generate_password_hash(password)
    now = datetime.utcnow().isoformat()
    verification_token = _make_token("verify") if email else None
    try:
        conn = get_db_connection()
        cur = conn.execute(
            "INSERT INTO users (username, email, password_hash, email_verification_token, created_at, last_login) VALUES (?, ?, ?, ?, ?, ?)",
            (username, email or None, password_hash, verification_token, now, now)
        )
        conn.commit()
        user_id = cur.lastrowid
        conn.close()
    except DatabaseIntegrityError:
        return render_template("register.html", error="Username or email already exists."), 409

    session["user_id"] = user_id
    session["username"] = username
    session.permanent = True
    if email and verification_token:
        verify_link = f"{_public_base_url()}/verify-email/{verification_token}"
        _send_auth_email(email, "Verify your KPCTyping email", f"Click this link to verify your email:\n\n{verify_link}")
    return redirect("/profile")

@app.route("/login", methods=["GET", "POST"])
@limit_rule("20 per hour")
def login():
    if request.method == "GET":
        return render_template("login.html", next_url=request.args.get("next", ""))
    if not _validate_csrf():
        return render_template("login.html", error="Security token expired. Please try again."), 400

    identity = (request.form.get("identity", "") or "").strip()
    password = request.form.get("password", "")

    if not _check_rate_limit("login_failed", limit_seconds=0, max_hits=8, window_minutes=15, record=False):
        return render_template("login.html", error="Too many failed login attempts. Please wait a little and try again."), 429

    conn = get_db_connection()
    user = conn.execute(
        "SELECT * FROM users WHERE username = ? OR email = ?",
        (identity, identity.lower())
    ).fetchone()
    if not user or not check_password_hash(user["password_hash"], password):
        _record_rate_limit("login_failed")
        conn.close()
        return render_template("login.html", error="Invalid username/email or password."), 401

    now = datetime.utcnow().isoformat()
    conn.execute("UPDATE users SET last_login = ? WHERE id = ?", (now, user["id"]))
    conn.commit()
    conn.close()
    _clear_rate_limit("login_failed")

    session["user_id"] = user["id"]
    session["username"] = user["username"]
    session.permanent = True
    next_url = request.form.get("next") or request.args.get("next") or "/profile"
    if not str(next_url).startswith("/") or str(next_url).startswith("//"):
        next_url = "/profile"
    return redirect(next_url)

@app.route("/logout")
def logout():
    session.pop("user_id", None)
    session.pop("username", None)
    return redirect("/")

@app.route("/forgot-password", methods=["GET", "POST"])
@limit_rule("8 per hour")
def forgot_password():
    if request.method == "GET":
        return render_template("forgot_password.html")
    if not _validate_csrf():
        return render_template("forgot_password.html", error="Security token expired. Please try again."), 400
    identity = (request.form.get("identity", "") or "").strip().lower()
    # Always show a generic message to avoid account enumeration.
    generic = "If the account exists, a password reset link has been prepared."
    reset_link = None
    if identity and _check_rate_limit("password_reset", limit_seconds=5, max_hits=6, window_minutes=60):
        token = _make_token("reset")
        expires = (datetime.utcnow() + timedelta(hours=1)).isoformat()
        conn = get_db_connection()
        user = conn.execute("SELECT * FROM users WHERE username = ? OR email = ?", (identity, identity)).fetchone()
        if user:
            conn.execute("UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?", (token, expires, user["id"]))
            conn.commit()
            if user["email"]:
                reset_link = f"{_public_base_url()}/reset-password/{token}"
                sent = _send_auth_email(user["email"], "Reset your KPCTyping password", f"Use this link within 1 hour:\n\n{reset_link}")
                if sent or os.environ.get("SHOW_DEV_AUTH_LINKS", "").lower() not in {"1", "true", "yes", "on"}:
                    reset_link = None
        conn.close()
    return render_template("forgot_password.html", message=generic, dev_reset_link=reset_link)

@app.route("/reset-password/<token>", methods=["GET", "POST"])
@limit_rule("12 per hour")
def reset_password(token):
    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE password_reset_token = ?", (token,)).fetchone()
    if not user:
        conn.close()
        return render_template("reset_password.html", error="Invalid or expired reset link."), 400
    expires_raw = user["password_reset_expires"] or ""
    try:
        expired = datetime.fromisoformat(expires_raw) < datetime.utcnow()
    except Exception:
        expired = True
    if expired:
        conn.execute("UPDATE users SET password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?", (user["id"],))
        conn.commit(); conn.close()
        return render_template("reset_password.html", error="Reset link expired. Please request a new one."), 400
    if request.method == "GET":
        conn.close()
        return render_template("reset_password.html", token=token)
    if not _validate_csrf():
        conn.close()
        return render_template("reset_password.html", token=token, error="Security token expired. Please try again."), 400
    password = request.form.get("password", "")
    confirm = request.form.get("confirm_password", "")
    if len(password) < 8 or password != confirm:
        conn.close()
        return render_template("reset_password.html", token=token, error="Password must be 8+ characters and match confirmation."), 400
    conn.execute(
        "UPDATE users SET password_hash = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?",
        (generate_password_hash(password), user["id"]),
    )
    conn.commit(); conn.close()
    return redirect(url_for("login"))

@app.route("/verify-email/<token>")
def verify_email(token):
    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE email_verification_token = ?", (token,)).fetchone()
    if not user:
        conn.close()
        return render_template("verify_email.html", error="Invalid or already-used verification link."), 400
    conn.execute("UPDATE users SET email_verified = 1, email_verification_token = NULL WHERE id = ?", (user["id"],))
    conn.commit(); conn.close()
    return render_template("verify_email.html", message="Email verified successfully. You can continue using KPCTyping.")

@app.route("/resend-verification", methods=["POST"])
@limit_rule("5 per hour")
def resend_verification():
    if not current_user():
        return redirect(url_for("login", next="/profile"))
    if not _validate_csrf():
        return _json_error("Security token expired.", 403)
    user = current_user()
    if int(user.get("email_verified") or 0):
        return jsonify({"ok": True, "message": "Email already verified."})
    if not user.get("email"):
        return jsonify({"ok": False, "message": "No email is attached to this account."}), 400
    token = user.get("email_verification_token") or _make_token("verify")
    conn = get_db_connection()
    conn.execute("UPDATE users SET email_verification_token = ? WHERE id = ?", (token, user["id"]))
    conn.commit(); conn.close()
    link = f"{_public_base_url()}/verify-email/{token}"
    sent = _send_auth_email(user["email"], "Verify your KPCTyping email", f"Click this link to verify your email:\n\n{link}")
    payload = {"ok": True, "message": "Verification email prepared."}
    if not sent and os.environ.get("SHOW_DEV_AUTH_LINKS", "").lower() in {"1", "true", "yes", "on"}:
        payload["dev_verify_link"] = link
    return jsonify(payload)

@app.route("/admin")
@admin_required
def admin_dashboard():
    return render_template("admin_dashboard.html")

@app.route("/profile")
def profile():
    # v31: profile is useful for guests too. Account data is loaded through
    # /api/profile/summary; guests use localStorage via profile_live.js.
    return render_template("profile.html", user=current_user())

@app.route("/api/profile/summary")
def api_profile_summary():
    user = current_user()
    if not user:
        return jsonify({"ok": False, "error": "guest_profile_local_only"}), 401
    with get_db_connection() as conn:
        best = conn.execute("""
            SELECT MAX(wpm) AS best_wpm, MAX(accuracy) AS best_accuracy, MAX(score) AS best_score, COUNT(*) AS tests
            FROM global_leaderboard_scores
            WHERE user_id = ? AND verified = 1
        """, (user["id"],)).fetchone()
        recent = conn.execute("""
            SELECT game_mode AS mode, game_mode AS lesson_id, wpm, accuracy, score, created_at
            FROM global_leaderboard_scores
            WHERE user_id = ? AND verified = 1
            ORDER BY created_at DESC LIMIT 10
        """, (user["id"],)).fetchall()
        analytics = conn.execute("""
            SELECT COUNT(*) AS sessions, AVG(wpm) AS avg_wpm, AVG(accuracy) AS avg_accuracy, SUM(duration_sec) AS duration_sec
            FROM analytics_sessions WHERE user_id = ?
        """, (user["id"],)).fetchone()
        career = _career_summary(conn, user["id"]) if "_career_summary" in globals() else {}
        ai_rows = _ai_stats_rows(conn, user["id"], None) if "_ai_stats_rows" in globals() else []
        ai_summary = _build_ai_coach_summary(ai_rows) if "_build_ai_coach_summary" in globals() else {"weak_keys": []}
    def cell(row, key, default=0):
        try:
            value = row[key] if row and row[key] is not None else default
            return value
        except Exception:
            return default
    stats = (career.get("stats") or {}) if isinstance(career, dict) else {}
    rank = _career_rank_name(career)
    profile_data = {
        "username": user.get("username"),
        "player_name": user.get("username"),
        "country": "Global",
        "tests_completed": int(cell(best, "tests", 0)),
        "best_wpm": round(float(cell(best, "best_wpm", 0)), 1),
        "best_accuracy": round(float(cell(best, "best_accuracy", 0)), 1),
        "best_score": int(cell(best, "best_score", 0)),
        "avg_wpm": round(float(cell(analytics, "avg_wpm", stats.get("avg_wpm", 0) or 0)), 1),
        "avg_accuracy": round(float(cell(analytics, "avg_accuracy", stats.get("avg_accuracy", 0) or 0)), 1),
        "total_practice_minutes": round(float(cell(analytics, "duration_sec", 0) or 0) / 60, 1),
        "lessons_completed": int(stats.get("lessons_completed", 0) or 0),
        "xp": _career_total_xp(career, user.get("xp", 0) or 0),
        "level": _career_level_number(career),
        "rank": rank,
        "streak": (career.get("streak") or {}).get("current_streak", 0) if isinstance(career, dict) else 0,
        "weak_key_heatmap": [{"key": k.get("key"), "count": k.get("wrong", 0) + k.get("slow", 0)} for k in ai_summary.get("weak_keys", [])],
    }
    return jsonify({"ok": True, "guest": False, "profile": profile_data, "recent": [dict(r) for r in recent]})

@app.route("/api/user/sync", methods=["POST"])
def api_user_sync():
    if not session.get("user_id"):
        return jsonify({"ok": False, "error": "login_required"}), 401
    if not _validate_csrf():
        return jsonify({"ok": False, "error": "csrf_failed"}), 403

    data = request.get_json(silent=True) or {}
    progress_type = sanitize_player_name(str(data.get("type", "progress")))[:30] or "progress"
    payload = data.get("payload", {})
    try:
        payload_text = json.dumps(payload, ensure_ascii=False)[:20000]
    except Exception:
        return jsonify({"ok": False, "error": "invalid_payload"}), 400

    now = datetime.utcnow().isoformat()
    conn = get_db_connection()
    conn.execute(
        """
        INSERT INTO user_progress (user_id, progress_type, payload, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, progress_type)
        DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at
        """,
        (session["user_id"], progress_type, payload_text, now)
    )
    if progress_type == "analytics":
        conn.execute("UPDATE users SET analytics_json = ? WHERE id = ?", (payload_text, session["user_id"]))
    if progress_type == "progress":
        conn.execute("UPDATE users SET progress_json = ? WHERE id = ?", (payload_text, session["user_id"]))
    if isinstance(payload, dict) and "xp" in payload:
        try:
            conn.execute("UPDATE users SET xp = ? WHERE id = ?", (int(payload.get("xp") or 0), session["user_id"]))
        except Exception:
            pass
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "updated_at": now})

@app.route("/api/user/progress")
def api_user_progress():
    if not session.get("user_id"):
        return jsonify({"ok": False, "error": "login_required"}), 401
    conn = get_db_connection()
    rows = conn.execute(
        "SELECT progress_type, payload, updated_at FROM user_progress WHERE user_id = ?",
        (session["user_id"],)
    ).fetchall()
    conn.close()
    data = {}
    for row in rows:
        try:
            data[row["progress_type"]] = {"payload": json.loads(row["payload"]), "updated_at": row["updated_at"]}
        except Exception:
            data[row["progress_type"]] = {"payload": {}, "updated_at": row["updated_at"]}
    return jsonify({"ok": True, "data": data})



# ==============================
# REAL PHASE 8 — Smart AI Coach
# ==============================
def _clean_guest_id(value):
    value = (value or "").strip()
    value = re.sub(r"[^a-zA-Z0-9_\-]", "", value)
    return value[:80] or None

def _clean_key_value(value):
    value = str(value or "").strip()
    if not value:
        return "?"
    return value[:8]

def _ai_identity():
    user_id = session.get("user_id")
    guest_id = None if user_id else _clean_guest_id(request.headers.get("X-Guest-ID") or request.args.get("guest_id"))
    return user_id, guest_id

def _ai_stats_rows(conn, user_id, guest_id):
    if user_id:
        return conn.execute("SELECT * FROM ai_key_stats WHERE user_id = ? ORDER BY wrong_count DESC, slow_count DESC, key_value ASC", (user_id,)).fetchall()
    if guest_id:
        return conn.execute("SELECT * FROM ai_key_stats WHERE guest_id = ? ORDER BY wrong_count DESC, slow_count DESC, key_value ASC", (guest_id,)).fetchall()
    return []

def _build_ai_coach_summary(rows):
    total_correct = sum(int(r["correct_count"] or 0) for r in rows)
    total_wrong = sum(int(r["wrong_count"] or 0) for r in rows)
    total_slow = sum(int(r["slow_count"] or 0) for r in rows)
    total_keys = total_correct + total_wrong
    accuracy = round((total_correct / total_keys) * 100, 1) if total_keys else 100.0
    enriched = []
    for r in rows:
        attempts = int(r["correct_count"] or 0) + int(r["wrong_count"] or 0)
        avg_time = round((int(r["total_time_ms"] or 0) / attempts), 0) if attempts else 0
        key_acc = round((int(r["correct_count"] or 0) / attempts) * 100, 1) if attempts else 100.0
        risk = int(r["wrong_count"] or 0) * 3 + int(r["slow_count"] or 0) * 2 + max(0, 90 - int(key_acc))
        enriched.append({
            "key": r["key_value"],
            "correct": int(r["correct_count"] or 0),
            "wrong": int(r["wrong_count"] or 0),
            "slow": int(r["slow_count"] or 0),
            "attempts": attempts,
            "accuracy": key_acc,
            "avg_time_ms": int(avg_time),
            "risk": risk,
        })
    weak_keys = sorted(enriched, key=lambda x: (-x["risk"], -x["wrong"], -x["slow"], x["key"]))[:8]
    slow_keys = sorted([x for x in enriched if x["avg_time_ms"]], key=lambda x: (-x["avg_time_ms"], -x["slow"]))[:8]
    if weak_keys:
        base = " ".join(k["key"] for k in weak_keys[:4])
        recommended = " ".join(([base, base[::-1] if len(base) > 1 else base, "focus accuracy first"] * 3)).strip()
        coach_message = "Practice your weak keys slowly before increasing speed."
    else:
        recommended = "f j d k s l a ; f j d k s l a ;"
        coach_message = "Start with home-row accuracy. The coach will adapt after you type."
    return {
        "total_keys": total_keys,
        "correct_keys": total_correct,
        "wrong_keys": total_wrong,
        "slow_keys_count": total_slow,
        "accuracy": accuracy,
        "weak_keys": weak_keys,
        "slow_keys": slow_keys,
        "recommended_lesson": recommended,
        "coach_message": coach_message,
    }

@app.route("/ai-coach")
def ai_coach():
    return render_template("ai_coach.html")

@app.route("/api/ai-coach", methods=["GET"])
def api_ai_coach():
    user_id, guest_id = _ai_identity()
    with get_db_connection() as conn:
        rows = _ai_stats_rows(conn, user_id, guest_id)
        summary = _build_ai_coach_summary(rows)
        if user_id:
            sessions = conn.execute("SELECT * FROM ai_practice_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 10", (user_id,)).fetchall()
        elif guest_id:
            sessions = conn.execute("SELECT * FROM ai_practice_sessions WHERE guest_id = ? ORDER BY created_at DESC LIMIT 10", (guest_id,)).fetchall()
        else:
            sessions = []
    summary["ok"] = True
    summary["mode"] = "account" if user_id else "guest"
    summary["recent_sessions"] = [dict(r) for r in sessions]
    return jsonify(summary)

@app.route("/api/ai-coach/track", methods=["POST"])
def api_ai_coach_track():
    if not request.is_json:
        return jsonify({"ok": False, "error": "json_required"}), 415
    if not _validate_csrf():
        return jsonify({"ok": False, "error": "csrf_failed"}), 403
    data = request.get_json(silent=True) or {}
    user_id, guest_id = _ai_identity()
    if not user_id and not guest_id:
        guest_id = "guest-local"
    events = data.get("events") if isinstance(data.get("events"), list) else []
    if not events and data.get("key"):
        events = [data]
    if len(events) > 250:
        events = events[:250]
    now = datetime.utcnow().isoformat()
    total = correct = wrong = total_time = slow_count = 0
    with get_db_connection() as conn:
        for ev in events:
            key = _clean_key_value(ev.get("key") or ev.get("key_value"))
            is_correct = bool(ev.get("correct", True))
            try:
                time_ms = max(0, min(60000, int(float(ev.get("time_ms", ev.get("duration", 0)) or 0))))
            except Exception:
                time_ms = 0
            is_slow = bool(ev.get("slow", False)) or time_ms >= 900
            total += 1
            correct += 1 if is_correct else 0
            wrong += 0 if is_correct else 1
            total_time += time_ms
            slow_count += 1 if is_slow else 0
            # Nullable composite UNIQUE constraints do not reliably prevent duplicates
            # when either user_id or guest_id is NULL, so update by the active identity first.
            if user_id:
                existing = conn.execute(
                    "SELECT id FROM ai_key_stats WHERE user_id = ? AND key_value = ?",
                    (user_id, key),
                ).fetchone()
            else:
                existing = conn.execute(
                    "SELECT id FROM ai_key_stats WHERE guest_id = ? AND key_value = ?",
                    (guest_id, key),
                ).fetchone()
            if existing:
                conn.execute(
                    """
                    UPDATE ai_key_stats
                    SET correct_count = correct_count + ?,
                        wrong_count = wrong_count + ?,
                        total_time_ms = total_time_ms + ?,
                        slow_count = slow_count + ?,
                        last_seen = ?
                    WHERE id = ?
                    """,
                    (1 if is_correct else 0, 0 if is_correct else 1, time_ms, 1 if is_slow else 0, now, existing["id"]),
                )
            else:
                conn.execute(
                    """
                    INSERT INTO ai_key_stats (user_id, guest_id, key_value, correct_count, wrong_count, total_time_ms, slow_count, last_seen)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (user_id, guest_id, key, 1 if is_correct else 0, 0 if is_correct else 1, time_ms, 1 if is_slow else 0, now),
                )
        rows = _ai_stats_rows(conn, user_id, guest_id)
        summary = _build_ai_coach_summary(rows)
        weak_json = json.dumps([k["key"] for k in summary["weak_keys"]], ensure_ascii=False)
        avg_time = int(total_time / total) if total else 0
        conn.execute(
            """
            INSERT INTO ai_practice_sessions (user_id, guest_id, lesson_name, total_keys, correct_keys, wrong_keys, avg_time_ms, weak_keys_json, recommended_text, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (user_id, guest_id, sanitize_player_name(str(data.get("lesson_name") or "Training Mode")) or "Training Mode", total, correct, wrong, avg_time, weak_json, summary["recommended_lesson"], now),
        )
        conn.commit()
    summary.update({"ok": True, "saved_events": total, "mode": "account" if user_id else "guest"})
    return jsonify(summary)



# ==============================
# REAL PHASE 9 — XP & Career System
# ==============================
XP_RULES = {
    "lesson_complete": 10,
    "perfect_accuracy": 20,
    "daily_challenge": 25,
    "personal_best": 30,
    "achievement_bonus": 50,
    "manual_practice": 5,
}
DAILY_REWARD_XP = [10, 20, 30, 40, 50, 75, 100]
RANKS = [
    ("Beginner", 0, 0, 0),
    ("Student", 100, 20, 80),
    ("Apprentice", 300, 30, 85),
    ("Skilled", 700, 45, 90),
    ("Expert", 1500, 60, 92),
    ("Master", 3000, 75, 94),
    ("Legend", 6000, 90, 96),
    ("Grandmaster", 10000, 110, 97),
]
ACHIEVEMENTS = {
    "first_lesson": ("First Lesson", "Complete your first typing lesson."),
    "ten_lessons": ("10 Lessons", "Complete 10 typing lessons."),
    "hundred_lessons": ("100 Lessons", "Complete 100 typing lessons."),
    "wpm_50": ("50 WPM", "Reach 50 WPM."),
    "wpm_80": ("80 WPM", "Reach 80 WPM."),
    "wpm_100": ("100 WPM", "Reach 100 WPM."),
    "accuracy_95": ("95% Accuracy", "Finish a lesson with 95% accuracy or higher."),
    "perfect_accuracy": ("Perfect Accuracy", "Finish a lesson with 100% accuracy."),
    "streak_7": ("7-Day Streak", "Practice for 7 days in a row."),
    "streak_30": ("30-Day Streak", "Practice for 30 days in a row."),
    "xp_1000": ("1000 XP", "Earn 1000 total XP."),
}

def _login_required_json():
    if not session.get("user_id"):
        return jsonify({"ok": False, "error": "login_required"}), 401
    return None

def _level_for_xp(xp):
    xp = max(0, int(xp or 0))
    level = 1
    needed = 100
    while xp >= needed and level < 100:
        level += 1
        needed += 100 + (level - 1) * 50
    prev_needed = 0 if level == 1 else needed - (100 + (level - 1) * 50)
    return {
        "level": level,
        "current_xp": xp,
        "level_start_xp": prev_needed,
        "next_level_xp": needed,
        "xp_into_level": xp - prev_needed,
        "xp_needed_for_next": max(0, needed - xp),
        "progress_percent": round(((xp - prev_needed) / max(1, needed - prev_needed)) * 100, 1),
    }

def _rank_for_stats(total_xp, avg_wpm, avg_accuracy):
    best = RANKS[0][0]
    for name, req_xp, req_wpm, req_acc in RANKS:
        if total_xp >= req_xp and avg_wpm >= req_wpm and avg_accuracy >= req_acc:
            best = name
    return best

def _ensure_career_rows(conn, user_id):
    now = datetime.utcnow().isoformat()
    conn.execute("INSERT OR IGNORE INTO user_streaks (user_id, updated_at) VALUES (?, ?)", (user_id, now))
    conn.execute("INSERT OR IGNORE INTO user_career_stats (user_id, updated_at) VALUES (?, ?)", (user_id, now))

def _get_total_xp(conn, user_id):
    row = conn.execute("SELECT COALESCE(SUM(xp_amount), 0) AS total FROM user_xp_events WHERE user_id = ?", (user_id,)).fetchone()
    return int(row["total"] or 0) if row else 0

def _safe_int(value, default=0, low=0, high=100000):
    try:
        return max(low, min(high, int(float(value))))
    except Exception:
        return default

def _safe_float(value, default=0.0, low=0.0, high=100.0):
    try:
        return max(low, min(high, float(value)))
    except Exception:
        return default

def _record_xp(conn, user_id, event_type, amount, meta=None, event_key=None):
    amount = max(0, min(500, int(amount or 0)))
    if amount <= 0:
        return 0
    now = datetime.utcnow().isoformat()
    meta_text = json.dumps(meta or {}, ensure_ascii=False)[:5000]
    try:
        conn.execute(
            "INSERT INTO user_xp_events (user_id, event_type, xp_amount, meta_json, event_key, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (user_id, event_type[:40], amount, meta_text, event_key, now),
        )
        total = _get_total_xp(conn, user_id)
        conn.execute("UPDATE users SET xp = ? WHERE id = ?", (total, user_id))
        return amount
    except DatabaseIntegrityError:
        return 0

def _unlock_achievement(conn, user_id, key):
    if key not in ACHIEVEMENTS:
        return None
    title, desc = ACHIEVEMENTS[key]
    now = datetime.utcnow().isoformat()
    try:
        conn.execute(
            "INSERT INTO user_achievements (user_id, achievement_key, title, description, xp_bonus, unlocked_at) VALUES (?, ?, ?, ?, ?, ?)",
            (user_id, key, title, desc, 50, now),
        )
        _record_xp(conn, user_id, "achievement_bonus", 50, {"achievement": key}, f"achievement:{key}")
        return {"key": key, "title": title, "description": desc, "xp_bonus": 50}
    except DatabaseIntegrityError:
        return None

def _update_streak(conn, user_id, activity_date=None):
    _ensure_career_rows(conn, user_id)
    today = activity_date or datetime.utcnow().date().isoformat()
    row = conn.execute("SELECT * FROM user_streaks WHERE user_id = ?", (user_id,)).fetchone()
    current = int(row["current_streak"] or 0)
    best = int(row["best_streak"] or 0)
    last = row["last_activity_date"]
    if last != today:
        try:
            delta = (datetime.fromisoformat(today).date() - datetime.fromisoformat(last).date()).days if last else None
        except Exception:
            delta = None
        current = current + 1 if delta == 1 else 1
        best = max(best, current)
        conn.execute("UPDATE user_streaks SET current_streak=?, best_streak=?, last_activity_date=?, updated_at=? WHERE user_id=?", (current, best, today, datetime.utcnow().isoformat(), user_id))
    unlocked = []
    if current >= 7:
        a = _unlock_achievement(conn, user_id, "streak_7")
        if a: unlocked.append(a)
    if current >= 30:
        a = _unlock_achievement(conn, user_id, "streak_30")
        if a: unlocked.append(a)
    return {"current_streak": current, "best_streak": best, "unlocked": unlocked}

def _check_progress_achievements(conn, user_id):
    total_xp = _get_total_xp(conn, user_id)
    stats = conn.execute("SELECT * FROM user_career_stats WHERE user_id = ?", (user_id,)).fetchone()
    unlocked = []
    if stats:
        lessons = int(stats["lessons_completed"] or 0)
        best_wpm = int(stats["best_wpm"] or 0)
        best_acc = float(stats["best_accuracy"] or 0)
        tests = [
            (lessons >= 1, "first_lesson"), (lessons >= 10, "ten_lessons"), (lessons >= 100, "hundred_lessons"),
            (best_wpm >= 50, "wpm_50"), (best_wpm >= 80, "wpm_80"), (best_wpm >= 100, "wpm_100"),
            (best_acc >= 95, "accuracy_95"), (best_acc >= 100, "perfect_accuracy"),
            (total_xp >= 1000, "xp_1000"),
        ]
        for ok, key in tests:
            if ok:
                a = _unlock_achievement(conn, user_id, key)
                if a: unlocked.append(a)
    return unlocked

def _career_summary(conn, user_id):
    _ensure_career_rows(conn, user_id)
    total_xp = _get_total_xp(conn, user_id)
    conn.execute("UPDATE users SET xp = ? WHERE id = ?", (total_xp, user_id))
    stats = conn.execute("SELECT * FROM user_career_stats WHERE user_id = ?", (user_id,)).fetchone()
    streak = conn.execute("SELECT * FROM user_streaks WHERE user_id = ?", (user_id,)).fetchone()
    ach = conn.execute("SELECT achievement_key, title, description, xp_bonus, unlocked_at FROM user_achievements WHERE user_id = ? ORDER BY unlocked_at DESC", (user_id,)).fetchall()
    avg_wpm = float(stats["avg_wpm"] or 0) if stats else 0
    avg_accuracy = float(stats["avg_accuracy"] or 0) if stats else 0
    return {
        "ok": True,
        "xp": total_xp,
        "total_xp": total_xp,
        "level": _level_for_xp(total_xp),
        "rank": _rank_for_stats(total_xp, avg_wpm, avg_accuracy),
        "next_rank": _next_rank_hint(total_xp, avg_wpm, avg_accuracy),
        "stats": dict(stats) if stats else {},
        "streak": dict(streak) if streak else {},
        "achievements": [dict(r) for r in ach],
        "achievement_count": len(ach),
    }

def _next_rank_hint(total_xp, avg_wpm, avg_accuracy):
    current = _rank_for_stats(total_xp, avg_wpm, avg_accuracy)
    names = [r[0] for r in RANKS]
    idx = names.index(current)
    if idx >= len(RANKS) - 1:
        return {"name": "Max Rank", "message": "You reached the highest career rank."}
    name, xp_req, wpm_req, acc_req = RANKS[idx + 1]
    return {"name": name, "need_xp": max(0, xp_req - total_xp), "need_wpm": max(0, wpm_req - avg_wpm), "need_accuracy": max(0, round(acc_req - avg_accuracy, 1))}

@app.route("/career")
def career_dashboard():
    # Guest mode enabled: the page can run with local browser progress.
    # Account save still works after login through /api/career.
    return render_template("career.html")

@app.route("/api/career", methods=["GET"])
def api_career():
    err = _login_required_json()
    if err: return err
    with get_db_connection() as conn:
        summary = _career_summary(conn, session["user_id"])
        conn.commit()
    return jsonify(summary)

@app.route("/api/xp", methods=["GET"])
def api_xp():
    err = _login_required_json()
    if err: return err
    with get_db_connection() as conn:
        total = _get_total_xp(conn, session["user_id"])
    return jsonify({"ok": True, "xp": total, "level": _level_for_xp(total)})

@app.route("/api/level", methods=["GET"])
def api_level():
    err = _login_required_json()
    if err: return err
    with get_db_connection() as conn:
        total = _get_total_xp(conn, session["user_id"])
    return jsonify({"ok": True, **_level_for_xp(total)})

@app.route("/api/rank", methods=["GET"])
def api_rank():
    err = _login_required_json()
    if err: return err
    with get_db_connection() as conn:
        summary = _career_summary(conn, session["user_id"])
    return jsonify({"ok": True, "rank": summary["rank"], "next_rank": summary["next_rank"]})

@app.route("/api/achievements", methods=["GET"])
def api_achievements():
    err = _login_required_json()
    if err: return err
    with get_db_connection() as conn:
        rows = conn.execute("SELECT achievement_key, title, description, xp_bonus, unlocked_at FROM user_achievements WHERE user_id = ? ORDER BY unlocked_at DESC", (session["user_id"],)).fetchall()
    return jsonify({"ok": True, "achievements": [dict(r) for r in rows], "available": ACHIEVEMENTS})

@app.route("/api/xp/claim", methods=["POST"])
def api_xp_claim():
    err = _login_required_json()
    if err: return err
    if not request.is_json:
        return jsonify({"ok": False, "error": "json_required"}), 415
    if not _validate_csrf():
        return jsonify({"ok": False, "error": "csrf_failed"}), 403
    data = request.get_json(silent=True) or {}
    event_type = re.sub(r"[^a-zA-Z0-9_\-]", "", str(data.get("event_type") or "manual_practice"))[:40] or "manual_practice"
    allowed = set(XP_RULES.keys())
    if event_type not in allowed:
        return jsonify({"ok": False, "error": "invalid_event_type"}), 400
    wpm = _safe_int(data.get("wpm"), 0, 0, 250)
    accuracy = _safe_float(data.get("accuracy"), 0, 0, 100)
    lesson_id = sanitize_player_name(str(data.get("lesson_id") or data.get("lesson_name") or "lesson"))[:60] or "lesson"
    today = datetime.utcnow().date().isoformat()
    # Anti-farming event keys. One lesson-complete reward per lesson per day; bonuses are tied to same lesson/day.
    event_key = f"{event_type}:{lesson_id}:{today}"
    base_xp = XP_RULES[event_type]
    # Server-side validation: do not trust the browser for unlimited XP.
    if event_type == "perfect_accuracy" and accuracy < 100:
        return jsonify({"ok": False, "error": "perfect_accuracy_requires_100"}), 400
    if event_type == "personal_best" and wpm < 10:
        return jsonify({"ok": False, "error": "personal_best_requires_wpm"}), 400
    if event_type == "daily_challenge":
        event_key = f"daily_challenge:{today}"
    user_id = session["user_id"]
    unlocked = []
    with get_db_connection() as conn:
        _ensure_career_rows(conn, user_id)
        awarded = _record_xp(conn, user_id, event_type, base_xp, {"wpm": wpm, "accuracy": accuracy, "lesson_id": lesson_id}, event_key)
        if awarded:
            old = conn.execute("SELECT * FROM user_career_stats WHERE user_id = ?", (user_id,)).fetchone()
            lessons = int(old["lessons_completed"] or 0)
            avg_wpm = float(old["avg_wpm"] or 0)
            avg_acc = float(old["avg_accuracy"] or 0)
            if event_type in {"lesson_complete", "perfect_accuracy", "manual_practice"}:
                lessons += 1 if event_type == "lesson_complete" else 0
            new_avg_wpm = ((avg_wpm * max(0, lessons - 1)) + wpm) / max(1, lessons) if wpm else avg_wpm
            new_avg_acc = ((avg_acc * max(0, lessons - 1)) + accuracy) / max(1, lessons) if accuracy else avg_acc
            perfect_lessons = int(old["perfect_lessons"] or 0) + (1 if accuracy >= 100 else 0)
            dailies = int(old["daily_challenges_completed"] or 0) + (1 if event_type == "daily_challenge" else 0)
            conn.execute(
                """UPDATE user_career_stats SET lessons_completed=?, best_wpm=?, avg_wpm=?, best_accuracy=?, avg_accuracy=?, perfect_lessons=?, daily_challenges_completed=?, updated_at=? WHERE user_id=?""",
                (lessons, max(int(old["best_wpm"] or 0), wpm), round(new_avg_wpm, 2), max(float(old["best_accuracy"] or 0), accuracy), round(new_avg_acc, 2), perfect_lessons, dailies, datetime.utcnow().isoformat(), user_id)
            )
            streak_info = _update_streak(conn, user_id)
            unlocked.extend(streak_info.get("unlocked", []))
            unlocked.extend(_check_progress_achievements(conn, user_id))
        summary = _career_summary(conn, user_id)
        conn.commit()
    return jsonify({"ok": True, "awarded_xp": awarded, "duplicate": awarded == 0, "unlocked": unlocked, "career": summary})

@app.route("/api/daily-reward", methods=["POST"])
def api_daily_reward():
    err = _login_required_json()
    if err: return err
    if not _validate_csrf():
        return jsonify({"ok": False, "error": "csrf_failed"}), 403
    user_id = session["user_id"]
    today = datetime.utcnow().date().isoformat()
    with get_db_connection() as conn:
        _ensure_career_rows(conn, user_id)
        row = conn.execute("SELECT * FROM user_streaks WHERE user_id = ?", (user_id,)).fetchone()
        if row and row["last_reward_date"] == today:
            summary = _career_summary(conn, user_id)
            return jsonify({"ok": True, "claimed": False, "message": "Daily reward already claimed today.", "career": summary})
        reward_day = (int(row["reward_day"] or 0) % 7) + 1 if row else 1
        amount = DAILY_REWARD_XP[reward_day - 1]
        _record_xp(conn, user_id, "daily_reward", amount, {"reward_day": reward_day}, f"daily_reward:{today}")
        _update_streak(conn, user_id, today)
        conn.execute("UPDATE user_streaks SET last_reward_date=?, reward_day=?, updated_at=? WHERE user_id=?", (today, reward_day, datetime.utcnow().isoformat(), user_id))
        unlocked = _check_progress_achievements(conn, user_id)
        summary = _career_summary(conn, user_id)
        conn.commit()
    return jsonify({"ok": True, "claimed": True, "reward_day": reward_day, "awarded_xp": amount, "unlocked": unlocked, "career": summary})



# REAL PHASE 10: Pro Analytics Dashboard
def _parse_date(value, fallback):
    try:
        return datetime.fromisoformat(str(value)[:10])
    except Exception:
        return fallback

def _analytics_row_to_dict(row):
    item = dict(row)
    for key, default in (("weak_keys_json", []), ("key_times_json", {})):
        raw = item.get(key) or ("[]" if isinstance(default, list) else "{}")
        try:
            item[key.replace("_json", "")] = json.loads(raw)
        except Exception:
            item[key.replace("_json", "")] = default
    return item

def _build_analytics_summary(rows):
    sessions = [_analytics_row_to_dict(r) for r in rows]
    count = len(sessions)
    if not count:
        return {
            "session_count": 0, "best_wpm": 0, "avg_wpm": 0, "best_accuracy": 0, "avg_accuracy": 0,
            "total_practice_minutes": 0, "total_keys": 0, "wrong_keys": 0, "daily": [], "weekly": [],
            "weak_key_heatmap": [], "speed_trend": [], "accuracy_trend": [], "recent_sessions": [],
        }
    total_duration = sum(int(x.get("duration_sec") or 0) for x in sessions)
    total_keys = sum(int(x.get("total_keys") or 0) for x in sessions)
    wrong_keys = sum(int(x.get("wrong_keys") or 0) for x in sessions)
    avg_wpm = round(sum(float(x.get("wpm") or 0) for x in sessions) / count, 1)
    avg_accuracy = round(sum(float(x.get("accuracy") or 0) for x in sessions) / count, 1)
    best_wpm = round(max(float(x.get("wpm") or 0) for x in sessions), 1)
    best_accuracy = round(max(float(x.get("accuracy") or 0) for x in sessions), 1)
    daily_map = {}
    weekly_map = {}
    weak_counts = {}
    for x in sessions:
        day = str(x.get("created_at") or "")[:10]
        daily_map.setdefault(day, {"date": day, "sessions": 0, "avg_wpm": 0, "avg_accuracy": 0, "practice_minutes": 0})
        daily_map[day]["sessions"] += 1
        daily_map[day]["avg_wpm"] += float(x.get("wpm") or 0)
        daily_map[day]["avg_accuracy"] += float(x.get("accuracy") or 0)
        daily_map[day]["practice_minutes"] += round(int(x.get("duration_sec") or 0) / 60, 1)
        try:
            week = datetime.fromisoformat(day).strftime("%Y-W%U")
        except Exception:
            week = "unknown"
        weekly_map.setdefault(week, {"week": week, "sessions": 0, "avg_wpm": 0, "avg_accuracy": 0})
        weekly_map[week]["sessions"] += 1
        weekly_map[week]["avg_wpm"] += float(x.get("wpm") or 0)
        weekly_map[week]["avg_accuracy"] += float(x.get("accuracy") or 0)
        for k in x.get("weak_keys") or []:
            kk = str(k).upper()[:8]
            weak_counts[kk] = weak_counts.get(kk, 0) + 1
    daily = []
    for item in daily_map.values():
        item["avg_wpm"] = round(item["avg_wpm"] / max(1, item["sessions"]), 1)
        item["avg_accuracy"] = round(item["avg_accuracy"] / max(1, item["sessions"]), 1)
        daily.append(item)
    daily.sort(key=lambda x: x["date"])
    weekly = []
    for item in weekly_map.values():
        item["avg_wpm"] = round(item["avg_wpm"] / max(1, item["sessions"]), 1)
        item["avg_accuracy"] = round(item["avg_accuracy"] / max(1, item["sessions"]), 1)
        weekly.append(item)
    weekly.sort(key=lambda x: x["week"])
    weak_heatmap = [{"key": k, "count": v} for k, v in sorted(weak_counts.items(), key=lambda kv: kv[1], reverse=True)[:20]]
    recent = sorted(sessions, key=lambda x: x.get("created_at") or "", reverse=True)[:10]
    return {
        "session_count": count, "best_wpm": best_wpm, "avg_wpm": avg_wpm, "best_accuracy": best_accuracy,
        "avg_accuracy": avg_accuracy, "total_practice_minutes": round(total_duration / 60, 1),
        "total_keys": total_keys, "wrong_keys": wrong_keys, "daily": daily[-30:], "weekly": weekly[-12:],
        "weak_key_heatmap": weak_heatmap,
        "speed_trend": [{"label": x["date"], "value": x["avg_wpm"]} for x in daily[-14:]],
        "accuracy_trend": [{"label": x["date"], "value": x["avg_accuracy"]} for x in daily[-14:]],
        "recent_sessions": recent,
    }

@app.route("/analytics-pro")
def analytics_pro_dashboard():
    return render_template("analytics_pro.html")

@app.route("/api/analytics/pro", methods=["GET"])
def api_analytics_pro():
    err = _login_required_json()
    if err: return err
    days = _safe_int(request.args.get("days"), 30, 1, 365)
    since = (datetime.utcnow() - timedelta(days=days)).isoformat()
    with get_db_connection() as conn:
        rows = conn.execute("SELECT * FROM analytics_sessions WHERE user_id = ? AND created_at >= ? ORDER BY created_at ASC", (session["user_id"], since)).fetchall()
        summary = _build_analytics_summary(rows)
        career = _career_summary(conn, session["user_id"])
        ai_rows = _ai_stats_rows(conn, session["user_id"], None)
        ai_summary = _build_ai_coach_summary(ai_rows)
    summary.update({"ok": True, "days": days, "career": career, "ai_coach": ai_summary})
    return jsonify(summary)

@app.route("/api/analytics/track", methods=["POST"])
def api_analytics_track():
    err = _login_required_json()
    if err: return err
    if not request.is_json:
        return jsonify({"ok": False, "error": "json_required"}), 415
    if not _validate_csrf():
        return jsonify({"ok": False, "error": "csrf_failed"}), 403
    data = request.get_json(silent=True) or {}
    lesson_id = sanitize_player_name(str(data.get("lesson_id") or data.get("lesson_name") or "practice"))[:80] or "practice"
    mode = re.sub(r"[^a-zA-Z0-9_\-]", "", str(data.get("mode") or "training"))[:40] or "training"
    wpm = _safe_float(data.get("wpm"), 0, 0, 250)
    accuracy = _safe_float(data.get("accuracy"), 0, 0, 100)
    duration = _safe_int(data.get("duration_sec"), 0, 0, 7200)
    total_keys = _safe_int(data.get("total_keys"), 0, 0, 100000)
    correct_keys = _safe_int(data.get("correct_keys"), 0, 0, 100000)
    wrong_keys = _safe_int(data.get("wrong_keys"), 0, 0, 100000)
    weak_keys = data.get("weak_keys") if isinstance(data.get("weak_keys"), list) else []
    weak_keys = [str(k)[:8] for k in weak_keys[:30]]
    key_times = data.get("key_times") if isinstance(data.get("key_times"), dict) else {}
    safe_key_times = {str(k)[:8]: _safe_int(v, 0, 0, 60000) for k, v in list(key_times.items())[:100]}
    now = datetime.utcnow().isoformat()
    with get_db_connection() as conn:
        conn.execute("""INSERT INTO analytics_sessions (user_id, lesson_id, mode, wpm, accuracy, duration_sec, total_keys, correct_keys, wrong_keys, weak_keys_json, key_times_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (session["user_id"], lesson_id, mode, wpm, accuracy, duration, total_keys, correct_keys, wrong_keys, json.dumps(weak_keys, ensure_ascii=False), json.dumps(safe_key_times, ensure_ascii=False), now))
        conn.commit()
    return jsonify({"ok": True, "saved": True})



# REAL PHASE 11 ROUTES: Multiplayer Race (polling-based, works on normal Flask hosting)
RACE_PROMPTS = [
    "practice makes progress when every key feels calm and clear",
    "speed grows from accuracy and accuracy grows from patience",
    "khmer typing and english typing can both become smooth with daily practice",
    "focus on the next letter not the finish line and your hands will learn",
]

def _race_guest_id():
    gid = session.get("race_guest_id")
    if not gid:
        gid = secrets.token_urlsafe(12)
        session["race_guest_id"] = gid
    return gid

def _race_room_code():
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(secrets.choice(alphabet) for _ in range(6))

def _race_identity():
    uid = session.get("user_id")
    guest_id = None if uid else _race_guest_id()
    name = "Guest Player"
    if uid:
        try:
            with get_db_connection() as conn:
                row = conn.execute("SELECT username FROM users WHERE id = ?", (uid,)).fetchone()
                if row:
                    name = row["username"]
        except Exception:
            name = "Guest Player"
    req_name = ""
    if request.is_json:
        req_name = str((request.get_json(silent=True) or {}).get("player_name") or "")
    return uid, guest_id, sanitize_player_name(req_name) or name

def _race_room_payload(conn, room_code):
    room = conn.execute("SELECT * FROM race_rooms WHERE room_code = ?", (room_code.upper(),)).fetchone()
    if not room:
        return None
    players = conn.execute("SELECT * FROM race_players WHERE room_id = ? ORDER BY finished DESC, progress DESC, wpm DESC, updated_at ASC", (room["id"],)).fetchall()
    status = room["status"]
    if status == "running" and players and all(int(p["finished"] or 0) == 1 for p in players):
        status = "finished"
        conn.execute("UPDATE race_rooms SET status=?, finished_at=? WHERE id=?", (status, datetime.utcnow().isoformat(), room["id"]))
        conn.commit()
        room = conn.execute("SELECT * FROM race_rooms WHERE id = ?", (room["id"],)).fetchone()
    return {
        "room_code": room["room_code"], "title": room["title"], "prompt_text": room["prompt_text"],
        "status": status, "countdown_seconds": int(room["countdown_seconds"] or 5),
        "max_players": int(room["max_players"] or 10), "created_at": room["created_at"], "started_at": room["started_at"],
        "players": [{"name": p["player_name"], "progress": int(p["progress"] or 0), "wpm": round(float(p["wpm"] or 0), 1), "accuracy": round(float(p["accuracy"] or 0), 1), "mistakes": int(p["mistakes"] or 0), "finished": bool(p["finished"]), "position": int(p["position"] or 0), "updated_at": p["updated_at"]} for p in players],
    }

@app.route("/multiplayer-race")
def multiplayer_race_dashboard():
    return render_template("multiplayer_race.html")


@app.route("/api/race/realtime-status")
def api_race_realtime_status():
    return jsonify({
        "ok": True,
        "socketio_available": bool(socketio),
        "mode": "websocket_plus_polling_fallback" if socketio else "polling_only",
        "polling_fallback": True,
    })

@app.route("/api/race/create", methods=["POST"])
def api_race_create():
    if not request.is_json:
        return jsonify({"ok": False, "error": "json_required"}), 415
    if not _validate_csrf():
        return jsonify({"ok": False, "error": "csrf_failed"}), 403
    data = request.get_json(silent=True) or {}
    title = sanitize_player_name(str(data.get("title") or "Typing Race"))[:60] or "Typing Race"
    prompt = re.sub(r"\s+", " ", str(data.get("prompt_text") or secrets.choice(RACE_PROMPTS)).strip())[:360]
    if len(prompt) < 30:
        prompt = secrets.choice(RACE_PROMPTS)
    max_players = _safe_int(data.get("max_players"), 10, 2, 10)
    countdown = _safe_int(data.get("countdown_seconds"), 5, 3, 20)
    uid, guest_id, name = _race_identity()
    now = datetime.utcnow().isoformat()
    with get_db_connection() as conn:
        for _ in range(10):
            code = _race_room_code()
            try:
                conn.execute("""INSERT INTO race_rooms (room_code, host_user_id, title, prompt_text, status, countdown_seconds, max_players, created_at) VALUES (?, ?, ?, ?, 'waiting', ?, ?, ?)""", (code, uid, title, prompt, countdown, max_players, now))
                room_id = conn.execute("SELECT id FROM race_rooms WHERE room_code = ?", (code,)).fetchone()["id"]
                conn.execute("""INSERT INTO race_players (room_id, user_id, guest_id, player_name, joined_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)""", (room_id, uid, guest_id, name, now, now))
                conn.commit()
                payload = _race_room_payload(conn, code)
                _emit_race_update(code, payload)
                return jsonify({"ok": True, "room": payload})
            except DatabaseIntegrityError:
                continue
    return jsonify({"ok": False, "error": "room_create_failed"}), 500

@app.route("/api/race/join", methods=["POST"])
def api_race_join():
    if not request.is_json:
        return jsonify({"ok": False, "error": "json_required"}), 415
    if not _validate_csrf():
        return jsonify({"ok": False, "error": "csrf_failed"}), 403
    data = request.get_json(silent=True) or {}
    code = re.sub(r"[^A-Za-z0-9]", "", str(data.get("room_code") or "")).upper()[:8]
    uid, guest_id, name = _race_identity()
    now = datetime.utcnow().isoformat()
    with get_db_connection() as conn:
        room = conn.execute("SELECT * FROM race_rooms WHERE room_code = ?", (code,)).fetchone()
        if not room:
            return jsonify({"ok": False, "error": "room_not_found"}), 404
        if room["status"] not in ("waiting", "running"):
            return jsonify({"ok": False, "error": "race_finished"}), 409
        count = conn.execute("SELECT COUNT(*) AS c FROM race_players WHERE room_id = ?", (room["id"],)).fetchone()["c"]
        if count >= int(room["max_players"] or 10):
            return jsonify({"ok": False, "error": "room_full"}), 409
        identity_where = "user_id = ?" if uid else "guest_id = ?"
        identity_value = uid if uid else guest_id
        existing_player = conn.execute(f"SELECT id FROM race_players WHERE room_id = ? AND {identity_where}", (room["id"], identity_value)).fetchone()
        if not existing_player:
            conn.execute("""INSERT INTO race_players (room_id, user_id, guest_id, player_name, joined_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)""", (room["id"], uid, guest_id, name, now, now))
        conn.commit()
        payload = _race_room_payload(conn, code)
        _emit_race_update(code, payload)
        return jsonify({"ok": True, "room": payload})

@app.route("/api/race/start", methods=["POST"])
def api_race_start():
    if not request.is_json:
        return jsonify({"ok": False, "error": "json_required"}), 415
    if not _validate_csrf():
        return jsonify({"ok": False, "error": "csrf_failed"}), 403
    code = re.sub(r"[^A-Za-z0-9]", "", str((request.get_json(silent=True) or {}).get("room_code") or "")).upper()[:8]
    now = datetime.utcnow().isoformat()
    with get_db_connection() as conn:
        room = conn.execute("SELECT * FROM race_rooms WHERE room_code = ?", (code,)).fetchone()
        if not room:
            return jsonify({"ok": False, "error": "room_not_found"}), 404
        conn.execute("UPDATE race_rooms SET status='running', started_at=COALESCE(started_at, ?) WHERE id=?", (now, room["id"]))
        conn.commit()
        payload = _race_room_payload(conn, code)
        _emit_race_update(code, payload)
        return jsonify({"ok": True, "room": payload})

@app.route("/api/race/state", methods=["GET"])
def api_race_state():
    code = re.sub(r"[^A-Za-z0-9]", "", str(request.args.get("room_code") or "")).upper()[:8]
    with get_db_connection() as conn:
        payload = _race_room_payload(conn, code)
    if not payload:
        return jsonify({"ok": False, "error": "room_not_found"}), 404
    payload["ok"] = True
    return jsonify(payload)

@app.route("/api/race/progress", methods=["POST"])
def api_race_progress():
    if not request.is_json:
        return jsonify({"ok": False, "error": "json_required"}), 415
    if not _validate_csrf():
        return jsonify({"ok": False, "error": "csrf_failed"}), 403
    data = request.get_json(silent=True) or {}
    code = re.sub(r"[^A-Za-z0-9]", "", str(data.get("room_code") or "")).upper()[:8]
    uid = session.get("user_id")
    guest_id = None if uid else _race_guest_id()
    progress = _safe_int(data.get("progress"), 0, 0, 100)
    wpm = _safe_float(data.get("wpm"), 0, 0, 250)
    accuracy = _safe_float(data.get("accuracy"), 100, 0, 100)
    mistakes = _safe_int(data.get("mistakes"), 0, 0, 10000)
    finished = 1 if progress >= 100 or data.get("finished") else 0
    now = datetime.utcnow().isoformat()
    with get_db_connection() as conn:
        room = conn.execute("SELECT * FROM race_rooms WHERE room_code = ?", (code,)).fetchone()
        if not room:
            return jsonify({"ok": False, "error": "room_not_found"}), 404
        where = "user_id = ?" if uid else "guest_id = ?"
        ident = uid if uid else guest_id
        player = conn.execute(f"SELECT * FROM race_players WHERE room_id = ? AND {where}", (room["id"], ident)).fetchone()
        if not player:
            return jsonify({"ok": False, "error": "not_joined"}), 403
        position = player["position"] or 0
        if finished and not player["finished"]:
            position = conn.execute("SELECT COUNT(*) AS c FROM race_players WHERE room_id=? AND finished=1", (room["id"],)).fetchone()["c"] + 1
        conn.execute(f"""UPDATE race_players SET progress=?, wpm=?, accuracy=?, mistakes=?, finished=?, position=?, updated_at=?, finished_at=CASE WHEN ?=1 THEN COALESCE(finished_at, ?) ELSE finished_at END WHERE room_id=? AND {where}""", (progress, wpm, accuracy, mistakes, finished, position, now, finished, now, room["id"], ident))
        conn.commit()
        payload = _race_room_payload(conn, code)
    _emit_race_update(code, payload)
    payload["ok"] = True
    return jsonify(payload)



# REAL PHASE 13: Global Leaderboard helpers and routes.
def _phase13_period_keys(now=None):
    now = now or datetime.utcnow()
    iso = now.isocalendar()
    return {
        "week_key": f"{iso.year}-W{iso.week:02d}",
        "month_key": now.strftime("%Y-%m"),
        "season_key": f"S{now.year}-Q{((now.month - 1) // 3) + 1}",
    }

def _safe_country(value):
    country = re.sub(r"[^a-zA-Z .-]", "", (value or "Global").strip())[:40]
    return country or "Global"

def _leaderboard_score_row(row, rank=None):
    return {
        "rank": rank,
        "username": row["username"],
        "country": row["country"] or "Global",
        "game_mode": row["game_mode"] or "training",
        "score": int(row["score"] or 0),
        "wpm": round(float(row["wpm"] or 0), 2),
        "accuracy": round(float(row["accuracy"] or 0), 2),
        "xp": int(row["xp"] or 0),
        "career_rank": row["career_rank"] or "Beginner",
        "created_at": row["created_at"],
        "season_key": row["season_key"],
        "week_key": row["week_key"],
        "month_key": row["month_key"],
    }

def _leaderboard_query(conn, where="", params=(), limit=100):
    """Return best verified leaderboard rows.

    Dedupe in Python instead of relying on SQLite-only relaxed GROUP BY behavior.
    This keeps the same code working in SQLite and PostgreSQL.
    """
    query = """
        SELECT *
        FROM global_leaderboard_scores
        WHERE verified = 1 {where}
        ORDER BY wpm DESC, accuracy DESC, score DESC, xp DESC, created_at DESC
        LIMIT ?
    """.replace("{where}", where)
    raw_limit = max(int(limit or 100) * 5, int(limit or 100))
    rows = conn.execute(query, (*params, raw_limit)).fetchall()
    best = []
    seen = set()
    for row in rows:
        key = (str(row["username"] or "").lower(), row["country"] or "Global", row["game_mode"] or "training")
        if key in seen:
            continue
        seen.add(key)
        best.append(row)
        if len(best) >= limit:
            break
    return [_leaderboard_score_row(row, idx + 1) for idx, row in enumerate(best)]

def _record_leaderboard_audit(conn, user_id, username, action, status, reason="", payload=None):
    conn.execute(
        """INSERT INTO leaderboard_audit_logs (user_id, username, action, status, reason, payload_json, ip_hash, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (user_id, username or "", action, status, reason, json.dumps(payload or {}, ensure_ascii=False), _client_ip_hash(), datetime.utcnow().isoformat())
    )

def _leaderboard_career_snapshot(conn, user_id):
    if not user_id:
        return {"xp": 0, "career_rank": "Guest"}
    try:
        summary = _career_summary(conn, user_id)
        return {"xp": _career_total_xp(summary), "career_rank": _career_rank_name(summary)}
    except Exception:
        user = conn.execute("SELECT xp FROM users WHERE id=?", (user_id,)).fetchone()
        return {"xp": int(user["xp"] or 0) if user else 0, "career_rank": "Beginner"}

def _update_hall_of_fame(conn, user_id, username, country, wpm, accuracy, score):
    now = datetime.utcnow().isoformat()
    records = [("highest_wpm", wpm), ("highest_accuracy", accuracy), ("highest_score", score)]
    for record_type, value in records:
        if user_id:
            existing = conn.execute("SELECT id, value FROM hall_of_fame_records WHERE record_type=? AND user_id = ?", (record_type, user_id)).fetchone()
        else:
            existing = conn.execute("SELECT id, value FROM hall_of_fame_records WHERE record_type=? AND user_id IS NULL AND LOWER(username)=LOWER(?)", (record_type, username)).fetchone()
        meta = json.dumps({"score": score, "wpm": wpm, "accuracy": accuracy}, ensure_ascii=False)
        if existing is None:
            conn.execute(
                "INSERT INTO hall_of_fame_records (record_type, user_id, username, country, value, meta_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (record_type, user_id, username, country, float(value), meta, now),
            )
        elif float(value) > float(existing["value"] or 0):
            conn.execute(
                "UPDATE hall_of_fame_records SET username=?, country=?, value=?, meta_json=?, created_at=? WHERE id=?",
                (username, country, float(value), meta, now, existing["id"]),
            )


def _save_global_score(conn, data, action="submit_global_score"):
    """Validate and persist a real score for the Global Leaderboard."""
    now = datetime.utcnow()
    uid = session.get("user_id")
    if uid:
        username = sanitize_player_name(session.get("username") or data.get("username") or data.get("player_name") or "Account Player") or "Account Player"
    else:
        username = sanitize_player_name(data.get("username") or data.get("player_name") or "Guest Player") or "Guest Player"
    country = _safe_country(data.get("country") or "Global")
    game_mode = re.sub(r"[^a-zA-Z0-9_-]", "", str(data.get("game_mode") or data.get("game") or "training"))[:30] or "training"
    wpm = _safe_float(data.get("wpm"), 0, 0, 300)
    accuracy = _safe_float(data.get("accuracy"), 100, 0, 100)
    score = _safe_int(data.get("score"), int(wpm * max(accuracy, 1)), 0, 1000000)
    duration_sec = _safe_int(data.get("duration_sec"), 60, 10, 7200)
    total_keys = _safe_int(data.get("total_keys"), 0, 0, 50000)

    reason = ""
    verified = 1
    if wpm > 220:
        verified, reason = 0, "wpm_too_high"
    elif accuracy < 40 or accuracy > 100:
        verified, reason = 0, "accuracy_invalid"
    elif duration_sec < 10:
        verified, reason = 0, "duration_too_short"
    elif total_keys and wpm > 0 and total_keys < max(10, int(wpm * 1.5)):
        verified, reason = 0, "key_count_suspicious"

    keys = _phase13_period_keys(now)
    nonce = data.get("attempt_id") or data.get("created_at") or now.isoformat(timespec="microseconds")
    evidence = f"{uid}|{username}|{country}|{game_mode}|{wpm}|{accuracy}|{score}|{duration_sec}|{total_keys}|{nonce}"
    evidence_hash = hashlib.sha256(evidence.encode("utf-8")).hexdigest()
    try:
        snap = _leaderboard_career_snapshot(conn, uid)
        conn.execute("""INSERT INTO global_leaderboard_scores
            (user_id, username, country, game_mode, score, wpm, accuracy, xp, career_rank, season_key, week_key, month_key, evidence_hash, verified, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (uid, username, country, game_mode, score, wpm, accuracy, snap["xp"], snap["career_rank"], keys["season_key"], keys["week_key"], keys["month_key"], evidence_hash, verified, now.isoformat()))
        if verified:
            _update_hall_of_fame(conn, uid, username, country, wpm, accuracy, score)
        _record_leaderboard_audit(conn, uid, username, action, "accepted" if verified else "flagged", reason, {**data, **keys})
        return {"saved": True, "verified": bool(verified), "reason": reason, "keys": keys}
    except DatabaseIntegrityError:
        _record_leaderboard_audit(conn, uid, username, action, "rejected", "duplicate_score", data)
        return {"saved": False, "verified": False, "reason": "duplicate_score", "keys": keys}

@app.route("/global-leaderboard")
def global_leaderboard_page():
    return render_template("global_leaderboard.html")

@app.route("/country-leaderboard")
def country_leaderboard_page():
    return render_template("country_leaderboard.html")

@app.route("/weekly-ranking")
def weekly_ranking_page():
    return render_template("global_leaderboard.html", default_period="weekly")

@app.route("/monthly-ranking")
def monthly_ranking_page():
    return render_template("global_leaderboard.html", default_period="monthly")

@app.route("/season-ranking")
def season_ranking_page():
    return render_template("global_leaderboard.html", default_period="season")

@app.route("/hall-of-fame")
def hall_of_fame_page():
    return render_template("hall_of_fame.html")

@app.route("/player/<username>")
def public_player_profile(username):
    return render_template("public_player.html", profile_username=sanitize_player_name(username))

@app.route("/api/global-leaderboard")
def api_global_leaderboard():
    period = (request.args.get("period") or "all").lower()
    limit = _safe_int(request.args.get("limit"), 100, 1, 100)
    keys = _phase13_period_keys()
    where = ""
    params = []
    if period == "weekly":
        where = "AND week_key = ?"
        params = [keys["week_key"]]
    elif period == "monthly":
        where = "AND month_key = ?"
        params = [keys["month_key"]]
    elif period == "season":
        where = "AND season_key = ?"
        params = [keys["season_key"]]
    with get_db_connection() as conn:
        rows = _leaderboard_query(conn, where, tuple(params), limit)
    return jsonify({"ok": True, "period": period, "keys": keys, "players": rows})

@app.route("/api/country-leaderboard")
def api_country_leaderboard():
    country = _safe_country(request.args.get("country") or "Cambodia")
    period = (request.args.get("period") or "all").lower()
    limit = _safe_int(request.args.get("limit"), 100, 1, 100)
    keys = _phase13_period_keys()
    where = "AND country = ?"
    params = [country]
    if period == "weekly":
        where += " AND week_key = ?"
        params.append(keys["week_key"])
    elif period == "monthly":
        where += " AND month_key = ?"
        params.append(keys["month_key"])
    elif period == "season":
        where += " AND season_key = ?"
        params.append(keys["season_key"])
    with get_db_connection() as conn:
        rows = _leaderboard_query(conn, where, tuple(params), limit)
    return jsonify({"ok": True, "country": country, "period": period, "players": rows})

def _api_global_period(period):
    limit = _safe_int(request.args.get("limit"), 100, 1, 100)
    keys = _phase13_period_keys()
    field = {"weekly": "week_key", "monthly": "month_key", "season": "season_key"}[period]
    key = {"weekly": keys["week_key"], "monthly": keys["month_key"], "season": keys["season_key"]}[period]
    with get_db_connection() as conn:
        rows = _leaderboard_query(conn, f"AND {field} = ?", (key,), limit)
    return jsonify({"ok": True, "period": period, "keys": keys, "players": rows})

@app.route("/api/weekly-ranking")
def api_weekly_ranking():
    return _api_global_period("weekly")

@app.route("/api/monthly-ranking")
def api_monthly_ranking():
    return _api_global_period("monthly")

@app.route("/api/season-ranking")
def api_season_ranking():
    return _api_global_period("season")

@app.route("/api/hall-of-fame")
def api_hall_of_fame():
    with get_db_connection() as conn:
        records = {}
        for kind in ["highest_wpm", "highest_accuracy", "highest_score"]:
            rows = conn.execute("SELECT * FROM hall_of_fame_records WHERE record_type=? ORDER BY value DESC LIMIT 10", (kind,)).fetchall()
            records[kind] = [{"username": r["username"], "country": r["country"], "value": round(float(r["value"]), 2), "meta": json.loads(r["meta_json"] or "{}"), "created_at": r["created_at"]} for r in rows]
    return jsonify({"ok": True, "records": records})

@app.route("/api/player/<username>")
def api_public_player(username):
    username = sanitize_player_name(username)
    with get_db_connection() as conn:
        best = conn.execute("SELECT * FROM global_leaderboard_scores WHERE LOWER(username)=LOWER(?) AND verified=1 ORDER BY wpm DESC, accuracy DESC, score DESC LIMIT 1", (username,)).fetchone()
        recent = conn.execute("SELECT * FROM global_leaderboard_scores WHERE LOWER(username)=LOWER(?) AND verified=1 ORDER BY created_at DESC LIMIT 10", (username,)).fetchall()
    if not best:
        return jsonify({"ok": False, "error": "player_not_found"}), 404
    return jsonify({"ok": True, "profile": _leaderboard_score_row(best), "recent_scores": [_leaderboard_score_row(r) for r in recent]})

@app.route("/api/leaderboard/submit-global", methods=["POST"])
def api_submit_global_score():
    if not request.is_json:
        return jsonify({"ok": False, "error": "json_required"}), 415
    if not _validate_csrf():
        return jsonify({"ok": False, "error": "csrf_failed"}), 403
    data = request.get_json(silent=True) or {}
    with get_db_connection() as conn:
        result = _save_global_score(conn, data, action="submit_global_score")
        conn.commit()
    status = 200 if result.get("saved") else 409 if result.get("reason") == "duplicate_score" else 400
    return jsonify({"ok": bool(result.get("saved")), **result}), status

@app.route("/api/phase13/status")
def api_phase13_status():
    return jsonify({
        "ok": True,
        "phase": "13",
        "name": "Global Leaderboard",
        "routes": ["/global-leaderboard", "/country-leaderboard", "/weekly-ranking", "/monthly-ranking", "/season-ranking", "/hall-of-fame", "/player/<username>"],
        "apis": ["/api/global-leaderboard", "/api/country-leaderboard", "/api/hall-of-fame", "/api/leaderboard/submit-global", "/api/player/<username>"],
        "anti_cheat": ["max_wpm_validation", "accuracy_validation", "duplicate_hash", "audit_logs"],
    })



# REAL PHASE 14: Friends & Social System helpers and routes.
def _require_user_json():
    uid = session.get("user_id")
    if not uid:
        return None, (jsonify({"ok": False, "error": "login_required"}), 401)
    return uid, None

def _user_brief(conn, user_id):
    row = conn.execute("SELECT id, username, email, xp, created_at, last_login FROM users WHERE id=?", (user_id,)).fetchone()
    if not row:
        return None
    career = {"level": 1, "rank": {"name": "Beginner"}, "total_xp": int(row["xp"] or 0), "stats": {}}
    try:
        career = _career_summary(conn, user_id)
    except Exception:
        pass
    best = conn.execute("SELECT MAX(wpm) AS best_wpm, MAX(accuracy) AS best_accuracy FROM global_leaderboard_scores WHERE user_id=? AND verified=1", (user_id,)).fetchone()
    presence = conn.execute("SELECT status, last_seen FROM user_presence WHERE user_id=?", (user_id,)).fetchone()
    return {
        "id": row["id"],
        "username": row["username"],
        "xp": _career_total_xp(career, row["xp"] or 0),
        "level": _career_level_number(career),
        "career_rank": _career_rank_name(career),
        "best_wpm": round(float(_row_value(best, "best_wpm", 0) or 0), 2) if best else 0,
        "best_accuracy": round(float(_row_value(best, "best_accuracy", 0) or 0), 2) if best else 0,
        "presence": presence["status"] if presence else "offline",
        "last_seen": presence["last_seen"] if presence else row["last_login"],
    }

def _is_friend(conn, user_id, other_id):
    return bool(conn.execute("SELECT 1 FROM friends WHERE user_id=? AND friend_id=?", (user_id, other_id)).fetchone())

def _is_blocked(conn, user_id, other_id):
    return bool(conn.execute("SELECT 1 FROM blocked_users WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?)", (user_id, other_id, other_id, user_id)).fetchone())

def _log_activity(conn, user_id, activity_type, title, meta=None):
    conn.execute("INSERT INTO player_activity (user_id, activity_type, title, meta_json, created_at) VALUES (?, ?, ?, ?, ?)", (user_id, activity_type, title, json.dumps(meta or {}, ensure_ascii=False), datetime.utcnow().isoformat()))

def _touch_presence(conn, user_id, status="online"):
    now = datetime.utcnow().isoformat()
    conn.execute("""INSERT INTO user_presence (user_id, status, last_seen, updated_at) VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET status=excluded.status, last_seen=excluded.last_seen, updated_at=excluded.updated_at""", (user_id, status, now, now))

def _default_challenge_prompt():
    return "Practice builds speed. Focus on clean accuracy first, then let your fingers move faster with confidence."

@app.route("/friends")
def friends_page():
    if not login_required_view():
        return guest_required_response("Friends")
    return render_template("friends.html")

@app.route("/friends/requests")
def friend_requests_page():
    if not login_required_view():
        return guest_required_response("Friend requests")
    return render_template("friend_requests.html")

@app.route("/friends/leaderboard")
def friends_leaderboard_page():
    if not login_required_view():
        return guest_required_response("Friends leaderboard")
    return render_template("friends_leaderboard.html")

@app.route("/activity")
def activity_feed_page():
    if not login_required_view():
        return guest_required_response("Activity feed")
    return render_template("activity_feed.html")

@app.route("/challenges")
def challenges_page():
    if not login_required_view():
        return guest_required_response("Challenges")
    return render_template("challenges.html")

@app.route("/social-profile/<username>")
def social_public_profile(username):
    return render_template("social_profile.html", profile_username=sanitize_player_name(username))

@app.route("/api/friends")
def api_friends_list():
    uid, err = _require_user_json()
    if err: return err
    with get_db_connection() as conn:
        _touch_presence(conn, uid)
        rows = conn.execute("SELECT friend_id FROM friends WHERE user_id=? ORDER BY created_at DESC", (uid,)).fetchall()
        friends = [_user_brief(conn, r["friend_id"]) for r in rows]
        pending_in = conn.execute("SELECT COUNT(*) AS c FROM friend_requests WHERE receiver_id=? AND status='pending'", (uid,)).fetchone()["c"]
        conn.commit()
    return jsonify({"ok": True, "friends": [f for f in friends if f], "pending_requests": pending_in})

@app.route("/api/friends/search")
def api_friends_search():
    uid, err = _require_user_json()
    if err: return err
    q = sanitize_player_name(request.args.get("q") or "")
    if len(q) < 2:
        return jsonify({"ok": True, "users": []})
    with get_db_connection() as conn:
        _touch_presence(conn, uid)
        rows = conn.execute("SELECT id FROM users WHERE id != ? AND LOWER(username) LIKE LOWER(?) ORDER BY username LIMIT 20", (uid, f"%{q}%")).fetchall()
        users = []
        for r in rows:
            blocked = _is_blocked(conn, uid, r["id"])
            if blocked:
                continue
            item = _user_brief(conn, r["id"])
            item["is_friend"] = _is_friend(conn, uid, r["id"])
            pending = conn.execute("SELECT status FROM friend_requests WHERE ((sender_id=? AND receiver_id=?) OR (sender_id=? AND receiver_id=?)) AND status='pending'", (uid, r["id"], r["id"], uid)).fetchone()
            item["pending"] = bool(pending)
            users.append(item)
        conn.commit()
    return jsonify({"ok": True, "users": users})

@app.route("/api/friends/request", methods=["POST"])
def api_friend_request():
    uid, err = _require_user_json()
    if err: return err
    if not _validate_csrf():
        return jsonify({"ok": False, "error": "csrf_failed"}), 403
    data = request.get_json(silent=True) or {}
    target_username = sanitize_player_name(data.get("username") or "")
    now = datetime.utcnow().isoformat()
    with get_db_connection() as conn:
        target = conn.execute("SELECT id, username FROM users WHERE LOWER(username)=LOWER(?)", (target_username,)).fetchone()
        if not target or target["id"] == uid:
            return jsonify({"ok": False, "error": "user_not_found"}), 404
        if _is_blocked(conn, uid, target["id"]):
            return jsonify({"ok": False, "error": "blocked"}), 403
        privacy = conn.execute("SELECT allow_friend_requests FROM privacy_settings WHERE user_id=?", (target["id"],)).fetchone()
        if privacy and int(privacy["allow_friend_requests"] or 0) != 1:
            return jsonify({"ok": False, "error": "friend_requests_disabled"}), 403
        if _is_friend(conn, uid, target["id"]):
            return jsonify({"ok": False, "error": "already_friends"}), 409
        recent = conn.execute("SELECT COUNT(*) AS c FROM friend_requests WHERE sender_id=? AND created_at > ?", (uid, (datetime.utcnow()-timedelta(hours=1)).isoformat())).fetchone()["c"]
        if recent >= 20:
            return jsonify({"ok": False, "error": "rate_limited"}), 429
        conn.execute("INSERT OR IGNORE INTO friend_requests (sender_id, receiver_id, status, created_at) VALUES (?, ?, 'pending', ?)", (uid, target["id"], now))
        _log_activity(conn, uid, "friend_request_sent", f"Sent a friend request to {target['username']}", {"target_id": target["id"]})
        _touch_presence(conn, uid)
        conn.commit()
    return jsonify({"ok": True, "message": "friend_request_sent"})

@app.route("/api/friends/requests")
def api_friend_requests():
    uid, err = _require_user_json()
    if err: return err
    with get_db_connection() as conn:
        incoming = conn.execute("SELECT fr.id, fr.sender_id, fr.created_at FROM friend_requests fr WHERE fr.receiver_id=? AND fr.status='pending' ORDER BY fr.created_at DESC", (uid,)).fetchall()
        outgoing = conn.execute("SELECT fr.id, fr.receiver_id, fr.created_at FROM friend_requests fr WHERE fr.sender_id=? AND fr.status='pending' ORDER BY fr.created_at DESC", (uid,)).fetchall()
        payload_in = [{"request_id": r["id"], "user": _user_brief(conn, r["sender_id"]), "created_at": r["created_at"]} for r in incoming]
        payload_out = [{"request_id": r["id"], "user": _user_brief(conn, r["receiver_id"]), "created_at": r["created_at"]} for r in outgoing]
        _touch_presence(conn, uid)
        conn.commit()
    return jsonify({"ok": True, "incoming": payload_in, "outgoing": payload_out})

@app.route("/api/friends/respond", methods=["POST"])
def api_friend_respond():
    uid, err = _require_user_json()
    if err: return err
    if not _validate_csrf():
        return jsonify({"ok": False, "error": "csrf_failed"}), 403
    data = request.get_json(silent=True) or {}
    request_id = _safe_int(data.get("request_id"), 0, 1, 10**9)
    action = (data.get("action") or "accept").lower()
    now = datetime.utcnow().isoformat()
    with get_db_connection() as conn:
        fr = conn.execute("SELECT * FROM friend_requests WHERE id=? AND receiver_id=? AND status='pending'", (request_id, uid)).fetchone()
        if not fr:
            return jsonify({"ok": False, "error": "request_not_found"}), 404
        if action == "accept":
            conn.execute("UPDATE friend_requests SET status='accepted', responded_at=? WHERE id=?", (now, request_id))
            conn.execute("INSERT OR IGNORE INTO friends (user_id, friend_id, created_at) VALUES (?, ?, ?)", (uid, fr["sender_id"], now))
            conn.execute("INSERT OR IGNORE INTO friends (user_id, friend_id, created_at) VALUES (?, ?, ?)", (fr["sender_id"], uid, now))
            _log_activity(conn, uid, "friend_added", "Accepted a new friend request", {"friend_id": fr["sender_id"]})
            _log_activity(conn, fr["sender_id"], "friend_added", "Became friends with a new player", {"friend_id": uid})
        else:
            conn.execute("UPDATE friend_requests SET status='rejected', responded_at=? WHERE id=?", (now, request_id))
        _touch_presence(conn, uid)
        conn.commit()
    return jsonify({"ok": True, "action": action})

@app.route("/api/friends/remove", methods=["POST"])
def api_friend_remove():
    uid, err = _require_user_json()
    if err: return err
    if not _validate_csrf():
        return jsonify({"ok": False, "error": "csrf_failed"}), 403
    data = request.get_json(silent=True) or {}
    friend_id = _safe_int(data.get("friend_id"), 0, 1, 10**9)
    with get_db_connection() as conn:
        conn.execute("DELETE FROM friends WHERE (user_id=? AND friend_id=?) OR (user_id=? AND friend_id=?)", (uid, friend_id, friend_id, uid))
        _log_activity(conn, uid, "friend_removed", "Removed a friend", {"friend_id": friend_id})
        _touch_presence(conn, uid)
        conn.commit()
    return jsonify({"ok": True})

@app.route("/api/friends/leaderboard")
def api_friends_leaderboard():
    uid, err = _require_user_json()
    if err: return err
    with get_db_connection() as conn:
        friend_ids = [r["friend_id"] for r in conn.execute("SELECT friend_id FROM friends WHERE user_id=?", (uid,)).fetchall()]
        ids = [uid] + friend_ids
        items = []
        for fid in ids:
            brief = _user_brief(conn, fid)
            if brief:
                items.append(brief)
        items.sort(key=lambda x: (x.get("best_wpm", 0), x.get("best_accuracy", 0), x.get("xp", 0)), reverse=True)
        for i, item in enumerate(items, 1):
            item["rank"] = i
        _touch_presence(conn, uid)
        conn.commit()
    return jsonify({"ok": True, "players": items})

@app.route("/api/activity")
def api_activity_feed():
    uid, err = _require_user_json()
    if err: return err
    with get_db_connection() as conn:
        friend_ids = [r["friend_id"] for r in conn.execute("SELECT friend_id FROM friends WHERE user_id=?", (uid,)).fetchall()]
        ids = [uid] + friend_ids
        placeholders = ",".join("?" for _ in ids)
        rows = conn.execute(f"SELECT pa.*, u.username FROM player_activity pa JOIN users u ON u.id=pa.user_id WHERE pa.user_id IN ({placeholders}) ORDER BY pa.created_at DESC LIMIT 50", ids).fetchall()
        activities = [{"id": r["id"], "username": r["username"], "type": r["activity_type"], "title": r["title"], "meta": json.loads(r["meta_json"] or "{}"), "created_at": r["created_at"]} for r in rows]
        _touch_presence(conn, uid)
        conn.commit()
    return jsonify({"ok": True, "activities": activities})

@app.route("/api/challenges", methods=["GET"])
def api_challenges_list():
    uid, err = _require_user_json()
    if err: return err
    with get_db_connection() as conn:
        rows = conn.execute("""SELECT c.*, u1.username AS challenger, u2.username AS receiver FROM private_challenges c
            JOIN users u1 ON u1.id=c.challenger_id JOIN users u2 ON u2.id=c.receiver_id
            WHERE c.challenger_id=? OR c.receiver_id=? ORDER BY c.created_at DESC LIMIT 50""", (uid, uid)).fetchall()
        challenges = [dict(r) for r in rows]
        _touch_presence(conn, uid)
        conn.commit()
    return jsonify({"ok": True, "challenges": challenges})

@app.route("/api/challenges/create", methods=["POST"])
def api_challenge_create():
    uid, err = _require_user_json()
    if err: return err
    if not _validate_csrf():
        return jsonify({"ok": False, "error": "csrf_failed"}), 403
    data = request.get_json(silent=True) or {}
    target_username = sanitize_player_name(data.get("username") or "")
    mode = data.get("mode") if data.get("mode") in {"best_of_1", "best_of_3", "best_of_5"} else "best_of_1"
    prompt_text = (data.get("prompt_text") or _default_challenge_prompt()).strip()[:500]
    now = datetime.utcnow().isoformat()
    with get_db_connection() as conn:
        target = conn.execute("SELECT id, username FROM users WHERE LOWER(username)=LOWER(?)", (target_username,)).fetchone()
        if not target or target["id"] == uid:
            return jsonify({"ok": False, "error": "user_not_found"}), 404
        if not _is_friend(conn, uid, target["id"]):
            return jsonify({"ok": False, "error": "friends_only"}), 403
        if _is_blocked(conn, uid, target["id"]):
            return jsonify({"ok": False, "error": "blocked"}), 403
        recent = conn.execute("SELECT COUNT(*) AS c FROM private_challenges WHERE challenger_id=? AND created_at > ?", (uid, (datetime.utcnow()-timedelta(hours=1)).isoformat())).fetchone()["c"]
        if recent >= 10:
            return jsonify({"ok": False, "error": "challenge_rate_limited"}), 429
        cur = conn.execute("INSERT INTO private_challenges (challenger_id, receiver_id, mode, prompt_text, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)", (uid, target["id"], mode, prompt_text, now))
        challenge_id = cur.lastrowid
        _log_activity(conn, uid, "challenge_sent", f"Sent a typing challenge to {target['username']}", {"challenge_id": challenge_id})
        _touch_presence(conn, uid)
        conn.commit()
    return jsonify({"ok": True, "challenge_id": challenge_id})

@app.route("/api/challenges/respond", methods=["POST"])
def api_challenge_respond():
    uid, err = _require_user_json()
    if err: return err
    if not _validate_csrf():
        return jsonify({"ok": False, "error": "csrf_failed"}), 403
    data = request.get_json(silent=True) or {}
    challenge_id = _safe_int(data.get("challenge_id"), 0, 1, 10**9)
    action = "accepted" if (data.get("action") or "accept").lower() == "accept" else "rejected"
    with get_db_connection() as conn:
        row = conn.execute("SELECT * FROM private_challenges WHERE id=? AND receiver_id=? AND status='pending'", (challenge_id, uid)).fetchone()
        if not row:
            return jsonify({"ok": False, "error": "challenge_not_found"}), 404
        conn.execute("UPDATE private_challenges SET status=?, responded_at=? WHERE id=?", (action, datetime.utcnow().isoformat(), challenge_id))
        _log_activity(conn, uid, "challenge_responded", f"{action.title()} a typing challenge", {"challenge_id": challenge_id})
        _touch_presence(conn, uid)
        conn.commit()
    return jsonify({"ok": True, "status": action})

@app.route("/api/challenges/submit", methods=["POST"])
def api_challenge_submit():
    uid, err = _require_user_json()
    if err: return err
    if not _validate_csrf():
        return jsonify({"ok": False, "error": "csrf_failed"}), 403
    data = request.get_json(silent=True) or {}
    challenge_id = _safe_int(data.get("challenge_id"), 0, 1, 10**9)
    wpm = float(_safe_int(data.get("wpm"), 0, 0, 250))
    accuracy = float(_safe_int(data.get("accuracy"), 0, 0, 100))
    score = _safe_int(data.get("score"), int(wpm * accuracy), 0, 1000000)
    now = datetime.utcnow().isoformat()
    with get_db_connection() as conn:
        row = conn.execute("SELECT * FROM private_challenges WHERE id=? AND (challenger_id=? OR receiver_id=?) AND status='accepted'", (challenge_id, uid, uid)).fetchone()
        if not row:
            return jsonify({"ok": False, "error": "challenge_not_active"}), 404
        conn.execute("INSERT OR REPLACE INTO challenge_results (challenge_id, user_id, wpm, accuracy, score, created_at) VALUES (?, ?, ?, ?, ?, ?)", (challenge_id, uid, wpm, accuracy, score, now))
        count = conn.execute("SELECT COUNT(*) AS c FROM challenge_results WHERE challenge_id=?", (challenge_id,)).fetchone()["c"]
        if count >= 2:
            conn.execute("UPDATE private_challenges SET status='completed', completed_at=? WHERE id=?", (now, challenge_id))
        _log_activity(conn, uid, "challenge_score", f"Submitted a challenge score: {int(wpm)} WPM", {"challenge_id": challenge_id, "wpm": wpm, "accuracy": accuracy})
        _touch_presence(conn, uid)
        conn.commit()
    return jsonify({"ok": True})

@app.route("/api/social/profile/<username>")
def api_social_profile(username):
    username = sanitize_player_name(username)
    with get_db_connection() as conn:
        user = conn.execute("SELECT id FROM users WHERE LOWER(username)=LOWER(?)", (username,)).fetchone()
        if not user:
            return jsonify({"ok": False, "error": "player_not_found"}), 404
        privacy = conn.execute("SELECT profile_visibility FROM privacy_settings WHERE user_id=?", (user["id"],)).fetchone()
        viewer = session.get("user_id")
        visibility = privacy["profile_visibility"] if privacy else "public"
        if visibility == "private" and viewer != user["id"]:
            return jsonify({"ok": False, "error": "private_profile"}), 403
        if visibility == "friends" and viewer != user["id"] and not (viewer and _is_friend(conn, viewer, user["id"])):
            return jsonify({"ok": False, "error": "friends_only_profile"}), 403
        profile = _user_brief(conn, user["id"])
        activities = conn.execute("SELECT activity_type, title, meta_json, created_at FROM player_activity WHERE user_id=? ORDER BY created_at DESC LIMIT 10", (user["id"],)).fetchall()
        profile["recent_activity"] = [{"type": r["activity_type"], "title": r["title"], "meta": json.loads(r["meta_json"] or "{}"), "created_at": r["created_at"]} for r in activities]
    return jsonify({"ok": True, "profile": profile})

@app.route("/api/privacy", methods=["GET", "POST"])
def api_privacy_settings():
    uid, err = _require_user_json()
    if err: return err
    now = datetime.utcnow().isoformat()
    with get_db_connection() as conn:
        if request.method == "POST":
            if not _validate_csrf():
                return jsonify({"ok": False, "error": "csrf_failed"}), 403
            data = request.get_json(silent=True) or {}
            visibility = data.get("profile_visibility") if data.get("profile_visibility") in {"public", "friends", "private"} else "public"
            allow_friend_requests = 1 if data.get("allow_friend_requests", True) else 0
            allow_challenges = 1 if data.get("allow_challenges", True) else 0
            conn.execute("""INSERT INTO privacy_settings (user_id, profile_visibility, allow_friend_requests, allow_challenges, updated_at) VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET profile_visibility=excluded.profile_visibility, allow_friend_requests=excluded.allow_friend_requests, allow_challenges=excluded.allow_challenges, updated_at=excluded.updated_at""", (uid, visibility, allow_friend_requests, allow_challenges, now))
            conn.commit()
        row = conn.execute("SELECT * FROM privacy_settings WHERE user_id=?", (uid,)).fetchone()
        if not row:
            conn.execute("INSERT INTO privacy_settings (user_id, updated_at) VALUES (?, ?)", (uid, now))
            conn.commit()
            row = conn.execute("SELECT * FROM privacy_settings WHERE user_id=?", (uid,)).fetchone()
    return jsonify({"ok": True, "privacy": dict(row)})

@app.route("/api/block-user", methods=["POST"])
def api_block_user():
    uid, err = _require_user_json()
    if err: return err
    if not _validate_csrf():
        return jsonify({"ok": False, "error": "csrf_failed"}), 403
    data = request.get_json(silent=True) or {}
    target_username = sanitize_player_name(data.get("username") or "")
    action = (data.get("action") or "block").lower()
    with get_db_connection() as conn:
        target = conn.execute("SELECT id FROM users WHERE LOWER(username)=LOWER(?)", (target_username,)).fetchone()
        if not target or target["id"] == uid:
            return jsonify({"ok": False, "error": "user_not_found"}), 404
        if action == "unblock":
            conn.execute("DELETE FROM blocked_users WHERE blocker_id=? AND blocked_id=?", (uid, target["id"]))
        else:
            conn.execute("INSERT OR IGNORE INTO blocked_users (blocker_id, blocked_id, created_at) VALUES (?, ?, ?)", (uid, target["id"], datetime.utcnow().isoformat()))
            conn.execute("DELETE FROM friends WHERE (user_id=? AND friend_id=?) OR (user_id=? AND friend_id=?)", (uid, target["id"], target["id"], uid))
        conn.commit()
    return jsonify({"ok": True, "action": action})

@app.route("/api/phase14/status")
def api_phase14_status():
    return jsonify({
        "ok": True,
        "phase": "14",
        "name": "Friends & Social System",
        "routes": ["/friends", "/friends/requests", "/friends/leaderboard", "/activity", "/challenges", "/social-profile/<username>"],
        "apis": ["/api/friends", "/api/friends/search", "/api/friends/request", "/api/friends/respond", "/api/friends/leaderboard", "/api/activity", "/api/challenges", "/api/challenges/create", "/api/challenges/respond", "/api/privacy", "/api/block-user"],
        "security": ["csrf", "friends_only_challenges", "rate_limits", "block_system", "privacy_settings"],
    })



# ==============================
# REAL PHASE 15 — Tournament System
# ==============================
TOURNAMENT_REWARDS = {
    "daily": {"champion_xp": 150, "runner_up_xp": 75, "participant_xp": 10},
    "weekly": {"champion_xp": 300, "runner_up_xp": 150, "participant_xp": 20},
    "monthly": {"champion_xp": 600, "runner_up_xp": 300, "participant_xp": 35},
    "season": {"champion_xp": 1000, "runner_up_xp": 500, "participant_xp": 50},
}

def ensure_tournament_tables():
    conn = get_db_connection()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS tournaments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            tournament_type TEXT NOT NULL DEFAULT 'daily',
            status TEXT NOT NULL DEFAULT 'open',
            max_players INTEGER NOT NULL DEFAULT 16,
            text_prompt TEXT NOT NULL DEFAULT 'practice makes progress and speed follows accuracy',
            start_at TEXT,
            end_at TEXT,
            champion_user_id INTEGER,
            champion_name TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(champion_user_id) REFERENCES users(id)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS tournament_players (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tournament_id INTEGER NOT NULL,
            user_id INTEGER,
            guest_id TEXT,
            player_name TEXT NOT NULL,
            seed INTEGER DEFAULT 0,
            joined_at TEXT NOT NULL,
            eliminated INTEGER DEFAULT 0,
            UNIQUE(tournament_id, user_id),
            UNIQUE(tournament_id, guest_id),
            FOREIGN KEY(tournament_id) REFERENCES tournaments(id),
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS tournament_matches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tournament_id INTEGER NOT NULL,
            round_no INTEGER NOT NULL,
            match_no INTEGER NOT NULL,
            player1_id INTEGER,
            player2_id INTEGER,
            player1_score INTEGER DEFAULT 0,
            player2_score INTEGER DEFAULT 0,
            player1_wpm REAL DEFAULT 0,
            player2_wpm REAL DEFAULT 0,
            player1_accuracy REAL DEFAULT 0,
            player2_accuracy REAL DEFAULT 0,
            winner_player_id INTEGER,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(tournament_id) REFERENCES tournaments(id),
            FOREIGN KEY(player1_id) REFERENCES tournament_players(id),
            FOREIGN KEY(player2_id) REFERENCES tournament_players(id),
            FOREIGN KEY(winner_player_id) REFERENCES tournament_players(id),
            UNIQUE(tournament_id, round_no, match_no)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS tournament_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tournament_id INTEGER NOT NULL,
            player_id INTEGER NOT NULL,
            placement INTEGER NOT NULL,
            xp_reward INTEGER DEFAULT 0,
            badge_key TEXT DEFAULT '',
            created_at TEXT NOT NULL,
            UNIQUE(tournament_id, player_id),
            FOREIGN KEY(tournament_id) REFERENCES tournaments(id),
            FOREIGN KEY(player_id) REFERENCES tournament_players(id)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS tournament_audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tournament_id INTEGER,
            user_id INTEGER,
            action TEXT NOT NULL,
            status TEXT NOT NULL,
            reason TEXT DEFAULT '',
            payload_json TEXT DEFAULT '{}',
            created_at TEXT NOT NULL
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments (status, tournament_type, created_at)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_tournament_players_t ON tournament_players (tournament_id, seed)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_tournament_matches_t ON tournament_matches (tournament_id, round_no, match_no)")
    conn.commit()
    conn.close()

ensure_tournament_tables()

def _tournament_audit(conn, tournament_id, action, status, reason='', payload=None):
    conn.execute("""INSERT INTO tournament_audit_logs (tournament_id, user_id, action, status, reason, payload_json, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)""",
                 (tournament_id, session.get('user_id'), action, status, reason, json.dumps(payload or {}, ensure_ascii=False), datetime.utcnow().isoformat()))

def _ensure_default_tournament(conn):
    open_row = conn.execute("SELECT id FROM tournaments WHERE status IN ('open','active') ORDER BY id DESC LIMIT 1").fetchone()
    if open_row:
        return open_row['id']
    now = datetime.utcnow()
    cur = conn.execute("""INSERT INTO tournaments (title, tournament_type, status, max_players, text_prompt, start_at, end_at, created_at, updated_at)
                          VALUES (?, ?, 'open', 16, ?, ?, ?, ?, ?)""",
                       ("Daily Speed Cup", "daily", "Fast fingers win, but clean accuracy makes the champion.", now.isoformat(), (now+timedelta(days=1)).isoformat(), now.isoformat(), now.isoformat()))
    return cur.lastrowid

def _tournament_summary(conn, row):
    players = conn.execute("SELECT COUNT(*) AS c FROM tournament_players WHERE tournament_id=?", (row['id'],)).fetchone()['c']
    matches = conn.execute("SELECT COUNT(*) AS c FROM tournament_matches WHERE tournament_id=?", (row['id'],)).fetchone()['c']
    return {**dict(row), "players_count": players, "matches_count": matches, "spots_left": max(0, int(row['max_players'])-players)}

def _public_tournaments(conn):
    _ensure_default_tournament(conn)
    rows = conn.execute("SELECT * FROM tournaments ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'open' THEN 1 WHEN 'completed' THEN 2 ELSE 3 END, id DESC LIMIT 50").fetchall()
    return [_tournament_summary(conn, r) for r in rows]

def _current_player_name():
    user = current_user()
    if user:
        return sanitize_player_name(user.get('username')) or 'Guest Player'
    return sanitize_player_name(request.cookies.get('guest_name') or request.json.get('player_name') if request.is_json else request.args.get('player_name')) or 'Guest Player'

def _award_tournament_xp(conn, user_id, event_key, xp_amount, meta):
    if not user_id or xp_amount <= 0:
        return False
    conn.execute("""INSERT OR IGNORE INTO user_xp_events (user_id, event_type, xp_amount, meta_json, event_key, created_at)
                    VALUES (?, 'tournament_reward', ?, ?, ?, ?)""",
                 (user_id, xp_amount, json.dumps(meta or {}, ensure_ascii=False), event_key, datetime.utcnow().isoformat()))
    conn.execute("UPDATE users SET xp = (SELECT COALESCE(SUM(xp_amount),0) FROM user_xp_events WHERE user_id=?) WHERE id=?", (user_id, user_id))
    return True

def _generate_tournament_bracket(conn, tournament_id):
    t = conn.execute("SELECT * FROM tournaments WHERE id=?", (tournament_id,)).fetchone()
    if not t:
        return False, 'tournament_not_found'
    existing = conn.execute("SELECT COUNT(*) AS c FROM tournament_matches WHERE tournament_id=?", (tournament_id,)).fetchone()['c']
    if existing:
        return True, 'already_generated'
    players = conn.execute("SELECT * FROM tournament_players WHERE tournament_id=? ORDER BY seed ASC, joined_at ASC", (tournament_id,)).fetchall()
    if len(players) < 2:
        return False, 'need_at_least_2_players'
    now = datetime.utcnow().isoformat()
    match_no = 1
    for i in range(0, len(players), 2):
        p1 = players[i]
        p2 = players[i+1] if i+1 < len(players) else None
        status = 'bye' if p2 is None else 'ready'
        winner = p1['id'] if p2 is None else None
        conn.execute("""INSERT OR IGNORE INTO tournament_matches
            (tournament_id, round_no, match_no, player1_id, player2_id, winner_player_id, status, created_at, updated_at)
            VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?)""",
            (tournament_id, match_no, p1['id'], p2['id'] if p2 else None, winner, status, now, now))
        match_no += 1
    conn.execute("UPDATE tournaments SET status='active', updated_at=? WHERE id=?", (now, tournament_id))
    _tournament_audit(conn, tournament_id, 'generate_bracket', 'accepted', f'{len(players)} players', {})
    return True, 'generated'

def _advance_if_round_complete(conn, tournament_id):
    t = conn.execute("SELECT * FROM tournaments WHERE id=?", (tournament_id,)).fetchone()
    if not t or t['status'] == 'completed':
        return
    current_round = conn.execute("SELECT MAX(round_no) AS r FROM tournament_matches WHERE tournament_id=?", (tournament_id,)).fetchone()['r'] or 1
    rows = conn.execute("SELECT * FROM tournament_matches WHERE tournament_id=? AND round_no=? ORDER BY match_no", (tournament_id, current_round)).fetchall()
    if not rows or any(r['winner_player_id'] is None for r in rows):
        return
    winners = [r['winner_player_id'] for r in rows]
    now = datetime.utcnow().isoformat()
    if len(winners) == 1:
        champ_player = conn.execute("SELECT * FROM tournament_players WHERE id=?", (winners[0],)).fetchone()
        conn.execute("UPDATE tournaments SET status='completed', champion_user_id=?, champion_name=?, updated_at=? WHERE id=?", (champ_player['user_id'], champ_player['player_name'], now, tournament_id))
        rewards = TOURNAMENT_REWARDS.get(t['tournament_type'], TOURNAMENT_REWARDS['daily'])
        _award_tournament_xp(conn, champ_player['user_id'], f'tournament:{tournament_id}:champion', rewards['champion_xp'], {"tournament_id": tournament_id, "placement": 1})
        conn.execute("INSERT OR IGNORE INTO tournament_results (tournament_id, player_id, placement, xp_reward, badge_key, created_at) VALUES (?, ?, 1, ?, 'tournament_champion', ?)", (tournament_id, champ_player['id'], rewards['champion_xp'], now))
        _tournament_audit(conn, tournament_id, 'complete_tournament', 'accepted', 'champion_set', {"champion": champ_player['player_name']})
        return
    next_round = current_round + 1
    match_no = 1
    for i in range(0, len(winners), 2):
        p1 = winners[i]
        p2 = winners[i+1] if i+1 < len(winners) else None
        status = 'bye' if p2 is None else 'ready'
        winner = p1 if p2 is None else None
        conn.execute("""INSERT OR IGNORE INTO tournament_matches
            (tournament_id, round_no, match_no, player1_id, player2_id, winner_player_id, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""", (tournament_id, next_round, match_no, p1, p2, winner, status, now, now))
        match_no += 1

def _match_dict(conn, m):
    def player(pid):
        if not pid: return None
        p = conn.execute("SELECT id, player_name, user_id, seed FROM tournament_players WHERE id=?", (pid,)).fetchone()
        return dict(p) if p else None
    return {**dict(m), "player1": player(m['player1_id']), "player2": player(m['player2_id']), "winner": player(m['winner_player_id'])}

@app.route('/tournaments')
def tournaments_page():
    return render_template('tournaments.html')

@app.route('/tournament/<int:tournament_id>')
def tournament_detail_page(tournament_id):
    return render_template('tournament_detail.html', tournament_id=tournament_id)

@app.route('/champions')
def champions_page():
    return render_template('champions.html')

@app.route('/api/tournaments')
def api_tournaments():
    with get_db_connection() as conn:
        data = _public_tournaments(conn)
        conn.commit()
    return jsonify({"ok": True, "tournaments": data})

@app.route('/api/tournament/<int:tournament_id>')
def api_tournament_detail(tournament_id):
    with get_db_connection() as conn:
        t = conn.execute("SELECT * FROM tournaments WHERE id=?", (tournament_id,)).fetchone()
        if not t:
            return jsonify({"ok": False, "error": "not_found"}), 404
        players = conn.execute("SELECT * FROM tournament_players WHERE tournament_id=? ORDER BY seed ASC, joined_at ASC", (tournament_id,)).fetchall()
        matches = conn.execute("SELECT * FROM tournament_matches WHERE tournament_id=? ORDER BY round_no ASC, match_no ASC", (tournament_id,)).fetchall()
        results = conn.execute("SELECT r.*, p.player_name FROM tournament_results r JOIN tournament_players p ON p.id=r.player_id WHERE r.tournament_id=? ORDER BY placement ASC", (tournament_id,)).fetchall()
        payload = {"ok": True, "tournament": _tournament_summary(conn, t), "players": [dict(p) for p in players], "matches": [_match_dict(conn, m) for m in matches], "results": [dict(r) for r in results]}
    return jsonify(payload)

@app.route('/api/tournament/join', methods=['POST'])
def api_tournament_join():
    if not request.is_json:
        return jsonify({"ok": False, "error": "json_required"}), 415
    if not _validate_csrf():
        return jsonify({"ok": False, "error": "csrf_failed"}), 403
    data = request.get_json(silent=True) or {}
    tid = _safe_int(data.get('tournament_id'), 0, 0, 999999999)
    guest_id = sanitize_player_name(data.get('guest_id') or request.cookies.get('guest_id') or session.get('guest_id') or '')[:60] or None
    if not guest_id:
        guest_id = secrets.token_urlsafe(12)
        session['guest_id'] = guest_id
    user = current_user()
    uid = user['id'] if user else None
    name = sanitize_player_name((user or {}).get('username') or data.get('player_name') or 'Guest Player') or 'Guest Player'
    with get_db_connection() as conn:
        if not tid:
            tid = _ensure_default_tournament(conn)
        t = conn.execute("SELECT * FROM tournaments WHERE id=?", (tid,)).fetchone()
        if not t or t['status'] not in ('open','active'):
            return jsonify({"ok": False, "error": "tournament_not_open"}), 400
        identity_where = "user_id = ?" if uid else "guest_id = ?"
        identity_value = uid if uid else guest_id
        if identity_value:
            already = conn.execute(f"SELECT id FROM tournament_players WHERE tournament_id = ? AND {identity_where}", (tid, identity_value)).fetchone()
            if already:
                return jsonify({"ok": False, "error": "already_joined"}), 409
        count = conn.execute("SELECT COUNT(*) AS c FROM tournament_players WHERE tournament_id=?", (tid,)).fetchone()['c']
        if count >= int(t['max_players']):
            return jsonify({"ok": False, "error": "tournament_full"}), 400
        seed = count + 1
        now = datetime.utcnow().isoformat()
        try:
            conn.execute("""INSERT INTO tournament_players (tournament_id, user_id, guest_id, player_name, seed, joined_at)
                            VALUES (?, ?, ?, ?, ?, ?)""", (tid, uid, guest_id, name, seed, now))
        except DatabaseIntegrityError:
            return jsonify({"ok": False, "error": "already_joined"}), 409
        _tournament_audit(conn, tid, 'join', 'accepted', '', {"player_name": name})
        conn.commit()
    return jsonify({"ok": True, "tournament_id": tid, "player_name": name, "seed": seed})

@app.route('/api/tournament/start', methods=['POST'])
def api_tournament_start():
    if not request.is_json:
        return jsonify({"ok": False, "error": "json_required"}), 415
    if not _validate_csrf():
        return jsonify({"ok": False, "error": "csrf_failed"}), 403
    data = request.get_json(silent=True) or {}
    tid = _safe_int(data.get('tournament_id'), 0, 1, 999999999)
    with get_db_connection() as conn:
        ok, msg = _generate_tournament_bracket(conn, tid)
        conn.commit()
    return jsonify({"ok": ok, "message": msg})

@app.route('/api/tournament/match/result', methods=['POST'])
def api_tournament_match_result():
    if not request.is_json:
        return jsonify({"ok": False, "error": "json_required"}), 415
    if not _validate_csrf():
        return jsonify({"ok": False, "error": "csrf_failed"}), 403
    data = request.get_json(silent=True) or {}
    match_id = _safe_int(data.get('match_id'), 0, 1, 999999999)
    wpm = _safe_float(data.get('wpm'), 0, 0, 250)
    accuracy = _safe_float(data.get('accuracy'), 0, 0, 100)
    score = _safe_int(data.get('score'), int(wpm*accuracy), 0, 999999)
    # Anti-cheat: reject impossible score submissions.
    if wpm > 220 or accuracy > 100 or score > 500000:
        return jsonify({"ok": False, "error": "score_flagged"}), 400
    user = current_user()
    guest_id = sanitize_player_name(data.get('guest_id') or request.cookies.get('guest_id') or session.get('guest_id') or '')[:60] or None
    with get_db_connection() as conn:
        m = conn.execute("SELECT * FROM tournament_matches WHERE id=?", (match_id,)).fetchone()
        if not m or m['status'] not in ('ready','active'):
            return jsonify({"ok": False, "error": "match_not_available"}), 400
        p1 = conn.execute("SELECT * FROM tournament_players WHERE id=?", (m['player1_id'],)).fetchone()
        p2 = conn.execute("SELECT * FROM tournament_players WHERE id=?", (m['player2_id'],)).fetchone() if m['player2_id'] else None
        submitter = None
        for p in (p1, p2):
            if not p: continue
            if (user and p['user_id'] == user['id']) or (guest_id and p['guest_id'] == guest_id):
                submitter = p
        if not submitter:
            return jsonify({"ok": False, "error": "not_match_player"}), 403
        field = 'player1' if submitter['id'] == m['player1_id'] else 'player2'
        conn.execute(f"UPDATE tournament_matches SET {field}_score=?, {field}_wpm=?, {field}_accuracy=?, status='active', updated_at=? WHERE id=?", (score, wpm, accuracy, datetime.utcnow().isoformat(), match_id))
        m2 = conn.execute("SELECT * FROM tournament_matches WHERE id=?", (match_id,)).fetchone()
        winner = None
        if (m2['player1_score'] or 0) > 0 and (m2['player2_id'] is None or (m2['player2_score'] or 0) > 0):
            if (m2['player1_score'], m2['player1_accuracy']) >= (m2['player2_score'], m2['player2_accuracy']):
                winner = m2['player1_id']
            else:
                winner = m2['player2_id']
            conn.execute("UPDATE tournament_matches SET winner_player_id=?, status='completed', updated_at=? WHERE id=?", (winner, datetime.utcnow().isoformat(), match_id))
            _advance_if_round_complete(conn, m2['tournament_id'])
        _tournament_audit(conn, m2['tournament_id'], 'submit_match_result', 'accepted', '', {"match_id": match_id, "score": score, "wpm": wpm, "accuracy": accuracy})
        conn.commit()
    return jsonify({"ok": True, "winner_player_id": winner})

@app.route('/api/champions')
def api_champions():
    with get_db_connection() as conn:
        rows = conn.execute("SELECT * FROM tournaments WHERE status='completed' ORDER BY updated_at DESC LIMIT 50").fetchall()
        winners = [dict(r) for r in rows]
    return jsonify({"ok": True, "champions": winners})

@app.route('/api/phase15/status')
def api_phase15_status():
    return jsonify({
        "ok": True,
        "phase": "15",
        "name": "Tournament System",
        "routes": ["/tournaments", "/tournament/<id>", "/champions"],
        "apis": ["/api/tournaments", "/api/tournament/<id>", "/api/tournament/join", "/api/tournament/start", "/api/tournament/match/result", "/api/champions"],
        "security": ["csrf", "duplicate_join_prevention", "score_validation", "audit_logs"],
    })

# REAL PHASE 12: Mobile Experience + PWA routes

@app.route("/favicon.ico")
def favicon():
    return send_from_directory(BASE_DIR, "favicon.ico", mimetype="image/vnd.microsoft.icon")

@app.route("/manifest.json")
def pwa_manifest_alias():
    return send_from_directory(BASE_DIR / "static", "manifest.json", mimetype="application/manifest+json")

@app.route("/service-worker.js")
def pwa_service_worker():
    response = send_from_directory(BASE_DIR, "service-worker.js", mimetype="application/javascript")
    response.headers["Cache-Control"] = "no-cache"
    return response

@app.route("/offline.html")
def pwa_offline_page():
    return send_from_directory(BASE_DIR, "offline.html")

@app.route("/mobile-app")
def mobile_app_page():
    return render_template("mobile_app.html")

@app.route("/api/pwa/status")
def pwa_status():
    return jsonify({
        "phase": "12",
        "pwa": True,
        "manifest": "/static/manifest.json",
        "service_worker": "/service-worker.js",
        "offline_page": "/offline.html",
        "mobile_navigation": True,
        "touch_keyboard": True,
        "offline_cache_pages": ["/", "/typing-test", "/lessons", "/training-mode", "/career", "/ai-coach", "/analytics-pro", "/global-leaderboard", "/tournaments", "/multiplayer-race"]
    })

@app.route("/sitemap.xml")
def sitemap_xml():
    return send_from_directory(".", "sitemap.xml", mimetype="application/xml")

@app.route("/robots.txt")
def robots_txt():
    return send_from_directory(".", "robots.txt", mimetype="text/plain")


@app.route("/lessons")
def lessons_page():
    return render_template("lessons.html", lesson_groups=lesson_groups(), lessons=get_lessons())

@app.route("/api/lessons")
def api_lessons():
    return jsonify({"ok": True, "total": len(get_lessons()), "groups": lesson_groups(), "lessons": get_lessons()})

@app.route("/training-mode")
def training_mode():
    selected = get_lesson(request.args.get("lesson", 1))
    return render_template("training_mode.html", lesson=selected, lesson_groups=lesson_groups(), lessons=get_lessons())


@app.route("/progress")
def progress_dashboard():
    return render_template("progress_dashboard.html")


@app.route("/daily-challenge")
def daily_challenge():
    return render_template("daily_challenge.html")


# REAL PHASE 16: Deployment and database readiness status
@app.route("/deploy-status")
def deploy_status_page():
    return render_template("deploy_status.html")

@app.route("/api/deploy/status")
def api_deploy_status():
    database_url = os.environ.get("DATABASE_URL", "")
    db_engine = "postgresql_configured" if database_url.startswith(("postgres://", "postgresql://")) else "sqlite_local"
    return jsonify({
        "ok": True,
        "phase": "16",
        "name": "Audit, Bug Fix, PostgreSQL Migration, Deploy Test",
        "database_engine": db_engine,
        "database_url_configured": bool(database_url),
        "required_env": ["SECRET_KEY", "DATABASE_URL", "PUBLIC_BASE_URL"],
        "deploy_files": ["render.yaml", "requirements-prod.txt", ".env.example", "scripts/deploy_smoke_test.py", "scripts/migrate_sqlite_to_postgres.py"],
        "health_routes": ["/", "/tournaments", "/api/tournaments", "/api/phase15/status", "/api/pwa/status"],
        "note": "SQLite remains available for local development; PostgreSQL migration tools are included for cloud deployment."
    })

if __name__ == "__main__":
    if socketio:
        socketio.run(app, host="0.0.0.0", port=5000, debug=False, allow_unsafe_werkzeug=True)
    else:
        app.run(host="0.0.0.0", port=5000, debug=False)
