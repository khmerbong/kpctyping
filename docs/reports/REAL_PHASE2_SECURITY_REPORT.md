# REAL Phase 2 — Security Fix Report

This package contains the real Phase 2 security pass applied to the project source code.

## Files changed

### app.py
- Added `ProxyFix` so HTTPS detection works behind deployment proxies.
- Added security headers:
  - `Content-Security-Policy`
  - `X-Content-Type-Options`
  - `X-Frame-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`
  - `Strict-Transport-Security` when served via HTTPS/proxy HTTPS
- Added CSRF token creation and injection into templates.
- Added CSRF validation for score POST API.
- Added same-origin POST protection using `Origin` / `Referer` when available.
- Added SQLite-backed rate limit table instead of memory-only rate limiting.
- Added API `Cache-Control: no-store`.
- Hardened score submission validation and anti-cheat guardrails.
- Switched stored score timestamps to UTC.

### templates/*.html
- Verified pages include `<meta name="csrf-token" content="{{ csrf_token }}">` so game JavaScript can submit CSRF-protected scores.

### static/js/typing_test.js
### static/js/zombie_typing.js
### static/js/vampire_hunter.js
### static/js/space_typing.js
- Verified leaderboard POST requests send `X-CSRFToken` from the meta tag.

## Clean ZIP rules
The output ZIP excludes:
- `.git/`
- `venv/`
- `__pycache__/`
- `leaderboard.db`
- Python compiled cache files

## Test summary
- Python syntax compile: passed
- Flask route smoke tests: passed
- CSRF valid score submit: passed
- Missing CSRF rejection: passed
- Cross-origin POST rejection: passed
- Anti-cheat rejection: passed
- API rate-limit rejection: passed

## Notes
This phase improves security but does not add login/cloud accounts. Score submissions can still be attacked by advanced clients because games are browser-side, but fake scores are now harder through CSRF, rate limit and consistency checks.
