-- KPCTyping Phase 16 PostgreSQL schema bootstrap.
-- Use this for cloud deployment preparation. Existing SQLite data can be migrated with scripts/migrate_sqlite_to_postgres.py.

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    xp INTEGER DEFAULT 0,
    progress_json TEXT DEFAULT '{}',
    analytics_json TEXT DEFAULT '{}',
    created_at TEXT NOT NULL,
    last_login TEXT
);

CREATE TABLE IF NOT EXISTS user_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    progress_type TEXT NOT NULL,
    payload TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(user_id, progress_type)
);

CREATE TABLE IF NOT EXISTS global_leaderboard (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    username TEXT NOT NULL,
    country TEXT DEFAULT 'Global',
    wpm REAL DEFAULT 0,
    accuracy REAL DEFAULT 0,
    score INTEGER DEFAULT 0,
    duration_sec INTEGER DEFAULT 60,
    total_keys INTEGER DEFAULT 0,
    game_mode TEXT DEFAULT 'typing',
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_global_leaderboard_score ON global_leaderboard(score DESC, wpm DESC, accuracy DESC);
CREATE INDEX IF NOT EXISTS idx_global_leaderboard_country ON global_leaderboard(country, score DESC);

CREATE TABLE IF NOT EXISTS leaderboard_audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    username TEXT,
    action TEXT NOT NULL,
    status TEXT NOT NULL,
    reason TEXT DEFAULT '',
    payload_json TEXT DEFAULT '{}',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tournaments (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    tournament_type TEXT DEFAULT 'daily',
    status TEXT DEFAULT 'open',
    max_players INTEGER DEFAULT 16,
    champion_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    champion_name TEXT,
    starts_at TEXT,
    ends_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tournament_players (
    id SERIAL PRIMARY KEY,
    tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    guest_id TEXT,
    player_name TEXT NOT NULL,
    seed INTEGER DEFAULT 0,
    joined_at TEXT NOT NULL,
    UNIQUE(tournament_id, user_id),
    UNIQUE(tournament_id, guest_id)
);

CREATE TABLE IF NOT EXISTS tournament_matches (
    id SERIAL PRIMARY KEY,
    tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    round_no INTEGER NOT NULL,
    match_no INTEGER NOT NULL,
    player1_id INTEGER REFERENCES tournament_players(id) ON DELETE SET NULL,
    player2_id INTEGER REFERENCES tournament_players(id) ON DELETE SET NULL,
    player1_score INTEGER DEFAULT 0,
    player2_score INTEGER DEFAULT 0,
    player1_wpm REAL DEFAULT 0,
    player2_wpm REAL DEFAULT 0,
    player1_accuracy REAL DEFAULT 0,
    player2_accuracy REAL DEFAULT 0,
    winner_player_id INTEGER REFERENCES tournament_players(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'ready',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(tournament_id, round_no, match_no)
);

CREATE TABLE IF NOT EXISTS tournament_results (
    id SERIAL PRIMARY KEY,
    tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    player_id INTEGER NOT NULL REFERENCES tournament_players(id) ON DELETE CASCADE,
    placement INTEGER NOT NULL,
    xp_reward INTEGER DEFAULT 0,
    badge_key TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    UNIQUE(tournament_id, player_id)
);

CREATE TABLE IF NOT EXISTS tournament_audit_logs (
    id SERIAL PRIMARY KEY,
    tournament_id INTEGER REFERENCES tournaments(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    status TEXT NOT NULL,
    reason TEXT DEFAULT '',
    payload_json TEXT DEFAULT '{}',
    created_at TEXT NOT NULL
);
