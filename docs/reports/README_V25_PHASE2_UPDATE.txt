KPC Typing V25 Phase 2 Update

Added:
- Stronger XP / Rank ladder (adds Legend rank)
- More achievements: Gold Accuracy, Symbol Master, Boss Fighter, 1000 XP
- Daily Mission upgrade: 50 correct keys, 3 lesson steps, 10 streak, 4-minute practice
- Weak Key AI tracking: records missed keys and shows focus key in Training / Progress / Daily Challenge
- Anti-cheat leaderboard guardrails in Flask:
  * max WPM 250
  * max score caps by game
  * combo/level caps
  * 3-second submit rate limit by IP
  * player name sanitization including Khmer letters
- Basic security headers
- Progress Dashboard includes Weak Key AI panel
- Daily Challenge page rebuilt with mission dashboard

Run:
python app.py

Then test:
/training-mode
/progress
/daily-challenge
/leaderboard
