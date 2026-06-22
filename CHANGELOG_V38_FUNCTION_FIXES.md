# KPCTyping v38 Function Fixes

Fixed based on the function/UI audit:

1. `python app.py` no longer crashes with Flask-SocketIO/Werkzeug local server protection.
   - Added `allow_unsafe_werkzeug=True` to `socketio.run(...)` for local development runs.

2. Fixed `/forgot-password` crash for existing accounts.
   - Replaced `user.get("email")` on SQLite rows with safe row access.

3. Fixed `/reset-password/<token>` crash.
   - Replaced `user.get("password_reset_expires")` on SQLite rows with safe row access.

4. Fixed logged-in `/api/profile/summary` 500 error.
   - Added rank/level/XP normalization helpers so the endpoint works whether career rank is a string or an object.

5. Fixed `/api/social/profile/<username>` crash.
   - Replaced unsafe `.get()` usage on SQLite result rows.
   - Normalized social profile XP, level, and career rank output.

6. Kept guest mode and UI unchanged.

Smoke tested:
- `python app.py`
- `/`
- `/typing-test`
- `/training-mode`
- `/lessons`
- `/global-leaderboard`
- `/profile`
- `/forgot-password`
- `/reset-password/<token>`
- `/api/profile/summary`
- `/api/social/profile/<username>`
- `/api/submit-score`
- `/api/global-leaderboard`
