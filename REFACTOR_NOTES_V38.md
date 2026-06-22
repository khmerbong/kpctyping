# V38 Backend Refactor Notes

This update starts the safe refactor without moving all 100+ routes at once.

Moved out of `app.py` now:
- runtime/security configuration helpers: `config.py`
- API response helpers: `api_response.py`
- frontend toast/mobile-more behavior: standalone JS modules

Kept in `app.py` intentionally:
- route registration and existing endpoint names
- session/login flow
- score, profile, career, race, tournament, and social routes

Reason: moving all route decorators into Blueprints in one pass is high risk for a working app. The project now has cleaner seams for the next refactor while preserving every current URL.
