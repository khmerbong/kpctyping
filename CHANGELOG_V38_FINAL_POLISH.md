# KPCTyping v38 Final Polish Changelog

Date: 2026-06-22

This patch follows the remaining function/UI audit points without redesigning the v38 Comfort UI and without removing existing routes.

## Fixed

- Standardized `/api/leaderboard` response shape.
  - Now returns `{ ok, success, data, scores }`.
  - Updated `static/js/leaderboard_live.js` to support both the new wrapped response and the older raw-list response shape.
- Added API JSON error handling for `/api/*` routes.
  - `/api/*` 404 now returns JSON instead of HTML.
  - `/api/*` 405 now returns JSON instead of HTML.
  - `/api/*` 500 now returns JSON instead of HTML.
  - Non-API page routes still return HTML responses.
- Updated `service-worker.js` precache list.
  - Added `/static/css/base.css`.
  - Added `/static/css/pages.css`.
  - Added `/static/css/animations.css`.
  - Added `/static/js/kpc_toast.js`.
  - Added `/static/js/kpc_mobile_more.js`.
  - Bumped cache version to `kpc-typing-v38-final-polish-v2`.
- Improved login rate limiter UX.
  - Successful login no longer counts against the failed-login abuse counter.
  - Failed login attempts are still tracked and blocked after repeated failures.
  - Successful login clears the failed-login counter for that client.
- Added Render fallback deploy note.
  - Kept `runtime.txt = python-3.11.9`.
  - Kept current SocketIO/eventlet start command for compatibility.
  - Documented fallback command: `gunicorn -w 1 app:app`.
- Performed safe CSS cleanup.
  - Removed safe comment/whitespace noise from `final-ui-polish.css`.
  - Did not alter colors, spacing, layout, selectors, or UI structure.
- Added small `security.py` helper/notes module for gradual future refactor.
  - Routes were intentionally not moved to avoid breaking existing URLs.

## Kept unchanged intentionally

- v38 Comfort UI visual design was not redesigned.
- Existing routes and template paths were not removed.
- Database schema was not changed.
- `unsafe-inline` remains in CSP for compatibility with existing inline scripts/styles. It should be reduced only after inline code is moved to external assets.
- Eventlet remains in Render start command because the project still supports SocketIO; fallback is documented if a host image fails.

## Files changed

- `app.py`
- `api_response.py` import usage in `app.py`
- `service-worker.js`
- `static/js/leaderboard_live.js`
- `static/css/final-ui-polish.css`
- `render.yaml`
- `security.py`
- `CHANGELOG_V38_FINAL_POLISH.md`
- `V38_FINAL_POLISH_TEST_REPORT.md`
