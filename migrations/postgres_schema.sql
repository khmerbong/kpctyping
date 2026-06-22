-- KPCTyping PostgreSQL schema bootstrap.
-- Matches the runtime tables created in app.py so production deploys do not lose features.

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    xp INTEGER DEFAULT 0,
    progress_json TEXT DEFAULT '{}',
    analytics_json TEXT DEFAULT '{}',
    created_at TEXT NOT NULL,
    last_login TEXT,
    email_verified INTEGER DEFAULT 0,
    email_verification_token TEXT,
    password_reset_token TEXT,
    password_reset_expires TEXT,
    is_admin INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    progress_type TEXT NOT NULL,
    payload TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(user_id, progress_type)
);

CREATE TABLE IF NOT EXISTS leaderboard (
    id SERIAL PRIMARY KEY,
    player_name TEXT NOT NULL DEFAULT 'Player',
    game TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    combo INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    wpm INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rate_limits (
    id SERIAL PRIMARY KEY,
    ip_hash TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_created ON rate_limits(ip_hash, created_at);

CREATE TABLE IF NOT EXISTS ai_key_stats (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    guest_id TEXT,
    key_value TEXT NOT NULL,
    correct_count INTEGER DEFAULT 0,
    wrong_count INTEGER DEFAULT 0,
    total_time_ms INTEGER DEFAULT 0,
    slow_count INTEGER DEFAULT 0,
    last_seen TEXT NOT NULL,
    UNIQUE(user_id, key_value),
    UNIQUE(guest_id, key_value)
);
CREATE INDEX IF NOT EXISTS idx_ai_stats_user_guest ON ai_key_stats(user_id, guest_id);

CREATE TABLE IF NOT EXISTS ai_practice_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    guest_id TEXT,
    lesson_name TEXT DEFAULT 'Training Mode',
    total_keys INTEGER DEFAULT 0,
    correct_keys INTEGER DEFAULT 0,
    wrong_keys INTEGER DEFAULT 0,
    avg_time_ms INTEGER DEFAULT 0,
    weak_keys_json TEXT DEFAULT '[]',
    recommended_text TEXT DEFAULT '',
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_user_guest ON ai_practice_sessions(user_id, guest_id, created_at);

CREATE TABLE IF NOT EXISTS user_xp_events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    xp_amount INTEGER NOT NULL,
    meta_json TEXT DEFAULT '{}',
    event_key TEXT,
    created_at TEXT NOT NULL,
    UNIQUE(user_id, event_key)
);
CREATE INDEX IF NOT EXISTS idx_xp_events_user_created ON user_xp_events(user_id, created_at);

CREATE TABLE IF NOT EXISTS user_achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_key TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    xp_bonus INTEGER DEFAULT 0,
    unlocked_at TEXT NOT NULL,
    UNIQUE(user_id, achievement_key)
);
CREATE INDEX IF NOT EXISTS idx_achievements_user ON user_achievements(user_id, achievement_key);

CREATE TABLE IF NOT EXISTS user_streaks (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    last_activity_date TEXT,
    last_reward_date TEXT,
    reward_day INTEGER DEFAULT 0,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_career_stats (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    lessons_completed INTEGER DEFAULT 0,
    best_wpm INTEGER DEFAULT 0,
    avg_wpm DOUBLE PRECISION DEFAULT 0,
    best_accuracy DOUBLE PRECISION DEFAULT 0,
    avg_accuracy DOUBLE PRECISION DEFAULT 0,
    perfect_lessons INTEGER DEFAULT 0,
    daily_challenges_completed INTEGER DEFAULT 0,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS analytics_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id TEXT DEFAULT 'practice',
    mode TEXT DEFAULT 'training',
    wpm DOUBLE PRECISION DEFAULT 0,
    accuracy DOUBLE PRECISION DEFAULT 0,
    duration_sec INTEGER DEFAULT 0,
    total_keys INTEGER DEFAULT 0,
    correct_keys INTEGER DEFAULT 0,
    wrong_keys INTEGER DEFAULT 0,
    weak_keys_json TEXT DEFAULT '[]',
    key_times_json TEXT DEFAULT '{}',
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_analytics_user_created ON analytics_sessions(user_id, created_at);

CREATE TABLE IF NOT EXISTS global_leaderboard_scores (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    username TEXT NOT NULL,
    country TEXT DEFAULT 'Global',
    game_mode TEXT DEFAULT 'training',
    score INTEGER DEFAULT 0,
    wpm DOUBLE PRECISION DEFAULT 0,
    accuracy DOUBLE PRECISION DEFAULT 0,
    xp INTEGER DEFAULT 0,
    career_rank TEXT DEFAULT 'Beginner',
    season_key TEXT NOT NULL,
    week_key TEXT NOT NULL,
    month_key TEXT NOT NULL,
    evidence_hash TEXT NOT NULL UNIQUE,
    verified INTEGER DEFAULT 1,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_global_scores_wpm ON global_leaderboard_scores(verified, wpm DESC, accuracy DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_global_scores_country ON global_leaderboard_scores(country, verified, wpm DESC, accuracy DESC);
CREATE INDEX IF NOT EXISTS idx_global_scores_week ON global_leaderboard_scores(week_key, verified, wpm DESC, accuracy DESC);
CREATE INDEX IF NOT EXISTS idx_global_scores_month ON global_leaderboard_scores(month_key, verified, wpm DESC, accuracy DESC);
CREATE INDEX IF NOT EXISTS idx_global_scores_season ON global_leaderboard_scores(season_key, verified, wpm DESC, accuracy DESC);

CREATE TABLE IF NOT EXISTS leaderboard_audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    username TEXT DEFAULT '',
    action TEXT NOT NULL,
    status TEXT NOT NULL,
    reason TEXT DEFAULT '',
    payload_json TEXT DEFAULT '{}',
    ip_hash TEXT DEFAULT '',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS hall_of_fame_records (
    id SERIAL PRIMARY KEY,
    record_type TEXT NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    username TEXT NOT NULL,
    country TEXT DEFAULT 'Global',
    value DOUBLE PRECISION NOT NULL,
    meta_json TEXT DEFAULT '{}',
    created_at TEXT NOT NULL,
    UNIQUE(record_type, user_id)
);

CREATE TABLE IF NOT EXISTS friend_requests (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending',
    created_at TEXT NOT NULL,
    responded_at TEXT,
    UNIQUE(sender_id, receiver_id)
);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id, status, created_at);

CREATE TABLE IF NOT EXISTS friends (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    UNIQUE(user_id, friend_id)
);
CREATE INDEX IF NOT EXISTS idx_friends_user ON friends(user_id, friend_id);

CREATE TABLE IF NOT EXISTS user_presence (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'offline',
    last_seen TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS player_activity (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    title TEXT NOT NULL,
    meta_json TEXT DEFAULT '{}',
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activity_user_created ON player_activity(user_id, created_at);

CREATE TABLE IF NOT EXISTS private_challenges (
    id SERIAL PRIMARY KEY,
    challenger_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mode TEXT DEFAULT 'best_of_1',
    prompt_text TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TEXT NOT NULL,
    responded_at TEXT,
    completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_challenges_receiver ON private_challenges(receiver_id, status, created_at);

CREATE TABLE IF NOT EXISTS challenge_results (
    id SERIAL PRIMARY KEY,
    challenge_id INTEGER NOT NULL REFERENCES private_challenges(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wpm DOUBLE PRECISION DEFAULT 0,
    accuracy DOUBLE PRECISION DEFAULT 0,
    score INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    UNIQUE(challenge_id, user_id)
);

CREATE TABLE IF NOT EXISTS blocked_users (
    id SERIAL PRIMARY KEY,
    blocker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    UNIQUE(blocker_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS privacy_settings (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    profile_visibility TEXT DEFAULT 'public',
    allow_friend_requests INTEGER DEFAULT 1,
    allow_challenges INTEGER DEFAULT 1,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS race_rooms (
    id SERIAL PRIMARY KEY,
    room_code TEXT NOT NULL UNIQUE,
    host_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    title TEXT DEFAULT 'Typing Race',
    prompt_text TEXT NOT NULL,
    status TEXT DEFAULT 'waiting',
    countdown_seconds INTEGER DEFAULT 5,
    max_players INTEGER DEFAULT 10,
    created_at TEXT NOT NULL,
    started_at TEXT,
    finished_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_race_rooms_code ON race_rooms(room_code);

CREATE TABLE IF NOT EXISTS race_players (
    id SERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES race_rooms(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    guest_id TEXT,
    player_name TEXT NOT NULL,
    progress INTEGER DEFAULT 0,
    wpm DOUBLE PRECISION DEFAULT 0,
    accuracy DOUBLE PRECISION DEFAULT 100,
    mistakes INTEGER DEFAULT 0,
    position INTEGER DEFAULT 0,
    finished INTEGER DEFAULT 0,
    joined_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    finished_at TEXT,
    UNIQUE(room_id, user_id),
    UNIQUE(room_id, guest_id)
);
CREATE INDEX IF NOT EXISTS idx_race_players_room ON race_players(room_id, updated_at);

CREATE TABLE IF NOT EXISTS tournaments (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    tournament_type TEXT NOT NULL DEFAULT 'daily',
    status TEXT NOT NULL DEFAULT 'open',
    max_players INTEGER NOT NULL DEFAULT 16,
    text_prompt TEXT NOT NULL DEFAULT 'practice makes progress and speed follows accuracy',
    start_at TEXT,
    end_at TEXT,
    champion_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    champion_name TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status, tournament_type, created_at);

CREATE TABLE IF NOT EXISTS tournament_players (
    id SERIAL PRIMARY KEY,
    tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    guest_id TEXT,
    player_name TEXT NOT NULL,
    seed INTEGER DEFAULT 0,
    joined_at TEXT NOT NULL,
    eliminated INTEGER DEFAULT 0,
    UNIQUE(tournament_id, user_id),
    UNIQUE(tournament_id, guest_id)
);
CREATE INDEX IF NOT EXISTS idx_tournament_players_t ON tournament_players(tournament_id, seed);

CREATE TABLE IF NOT EXISTS tournament_matches (
    id SERIAL PRIMARY KEY,
    tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    round_no INTEGER NOT NULL,
    match_no INTEGER NOT NULL,
    player1_id INTEGER REFERENCES tournament_players(id) ON DELETE SET NULL,
    player2_id INTEGER REFERENCES tournament_players(id) ON DELETE SET NULL,
    player1_score INTEGER DEFAULT 0,
    player2_score INTEGER DEFAULT 0,
    player1_wpm DOUBLE PRECISION DEFAULT 0,
    player2_wpm DOUBLE PRECISION DEFAULT 0,
    player1_accuracy DOUBLE PRECISION DEFAULT 0,
    player2_accuracy DOUBLE PRECISION DEFAULT 0,
    winner_player_id INTEGER REFERENCES tournament_players(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(tournament_id, round_no, match_no)
);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_t ON tournament_matches(tournament_id, round_no, match_no);

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
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    status TEXT NOT NULL,
    reason TEXT DEFAULT '',
    payload_json TEXT DEFAULT '{}',
    created_at TEXT NOT NULL
);
