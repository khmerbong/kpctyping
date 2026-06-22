# KPC Typing v39 Typing Function Update

Scope: This patch only updates Typing Test / Training Mode behavior and closely related score-submit handling. It does not redesign the v38/v39 comfort UI and does not remove existing routes.

## Fixed

- Logged-in typing scores now use the authenticated account username on both local leaderboard and global leaderboard mirrors.
- Guest scores still use the local guest name as before.
- `/api/submit-score` now returns `player_name` and `mode` so the frontend can show exactly how the score was saved.
- Global leaderboard save helper now prioritizes the logged-in session username when a user account is active.
- Typing Test now checks the `/api/submit-score` response instead of silently assuming success.
- Typing Test now shows save status/toast for:
  - server saved
  - server rejected / anti-cheat rejected
  - server offline
  - attempt too short
- Training Mode now checks the `/api/submit-score` response and shows local/server save status.
- Mobile touch keyboard now has `ABC`, `123`, and `Symbols` modes.
- Mobile touch keyboard now includes advanced lesson symbols such as `:`, `"`, `#`, `$`, `%`, `&`, `(`, `)`, `*`, `+`, `<`, `=`, `>`, `@`, `[`, `]`, `^`, `_`, `{`, `}`.
- Typing Test timer now uses an end timestamp instead of only decrementing a counter, reducing timer drift on slow/mobile browsers.
- Typing Test now displays spaces as `␣`, matching Training Mode and helping beginners see space characters clearly.
- Typing Test current-letter scrolling is throttled to reduce jitter on mobile.
- Service worker cache version bumped so browsers fetch the updated typing JS.

## Kept intentionally unchanged

- No UI redesign.
- No database schema change.
- No route removal.
- No major backend module refactor.
- Existing guest mode, login/register, profile, leaderboard, career, analytics, AI Coach, race, and tournament functions remain untouched except where score submit needed username correction.
