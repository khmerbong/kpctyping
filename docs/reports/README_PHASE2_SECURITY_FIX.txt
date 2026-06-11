KPC Typing — Phase 2 Security Fix

Completed:
1. Added stronger security headers in app.py:
   - Content-Security-Policy
   - X-Content-Type-Options
   - X-Frame-Options
   - Referrer-Policy
   - Permissions-Policy
   - Strict-Transport-Security when running under HTTPS / X-Forwarded-Proto=https

2. Added Flask session security:
   - Secret key from SECRET_KEY / FLASK_SECRET_KEY environment variable with safe fallback
   - HttpOnly session cookie
   - SameSite=Lax
   - 16KB max JSON/body limit

3. Added CSRF protection for score POST endpoints:
   - CSRF token injected into every page as meta[name="csrf-token"]
   - All game JavaScript score submissions now send X-CSRFToken
   - Invalid/missing CSRF returns 403

4. Replaced in-memory rate limit:
   - New SQLite table: rate_limits
   - IP is stored as SHA-256 hash, not raw IP
   - Rate limit survives app runtime and is cleaned automatically

5. Hardened score API:
   - Requires JSON request
   - Sanitizes player name
   - Validates score/combo/level/WPM limits
   - Adds score consistency check
   - Rejects empty score submissions

Tested:
- /, /typing-test, /zombie-typing, /vampire-hunter, /space-typing, /leaderboard, /training-mode, /progress, /daily-challenge, /robots.txt, /sitemap.xml all returned 200 in Flask test client.
- Valid score POST with CSRF returned 200.
- Missing CSRF returned 403.
- Rapid duplicate score POST returned 429.

Notes:
- Existing inline scripts are still allowed in CSP to avoid breaking the current templates.
- For a later production hardening phase, move inline scripts into static JS and remove 'unsafe-inline' from CSP.
