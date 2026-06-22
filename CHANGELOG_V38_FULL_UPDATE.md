# KPC Typing v38 Full Update Changelog

## Updated
- Fixed deploy/runtime configuration and verified `runtime.txt` uses `python-3.11.9`.
- Added Render `healthCheckPath: /healthz` and kept SocketIO deployment command as `gunicorn --worker-class eventlet -w 1 app:app`.
- Added missing production dependencies to `requirements-prod.txt`.
- Optimized/refactored CSS organization by adding `base.css`, `pages.css`, and `animations.css` alongside existing `layout.css`, `components.css`, and `mobile.css`.
- Replaced social `alert(JSON.stringify(...))` actions with reusable toast notifications.
- Added reusable `static/js/kpc_toast.js` and `static/js/kpc_mobile_more.js`.
- Refactored shared runtime configuration into `config.py`.
- Refactored shared API response helpers into `api_response.py`.
- Added non-breaking API response normalization so `/api/*` responses include both legacy `ok` and new `success` fields.
- Improved production security settings with environment-based secret key handling and existing security headers/CSRF protection kept active.
- Improved mobile navigation with a `More` menu containing AI Coach, Race, Career, Analytics, Friends, and Settings.
- Improved profile API fallback handling with a visible warning/toast when account profile loading fails.
- Added `REFACTOR_NOTES_V38.md` explaining the safe staged backend refactor approach.

## Notes
- The full route migration into Blueprints was not forced in one pass because the project has 100+ routes and moving all decorators at once is high risk. Shared config and response helpers were safely extracted now; route modules remain prepared for a staged migration.
- Large compatibility CSS files remain loaded to preserve the v38 Comfort UI exactly. The new CSS module files isolate new global/toast/mobile-more/page rules without redesigning the UI.
