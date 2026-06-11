KPC Typing V49 Symbol Guide Update

Updated feature in training mode:
- Shows exact combo for symbols, for example ^ = Shift + 6.
- Adds an All Symbols cheat sheet button.
- Adds Voice On/Off button using browser speechSynthesis.
- Highlights both Shift and the target key for symbols.
- Shows clearer wrong-key explanation for Shift symbols.
- Adds virtual SHIFT keys to the live keyboard display.

Changed files:
- static/js/v43_focus_lesson.js
- static/css/v43_focus_lesson.css

Cleaned from this ZIP:
- .git/
- venv/
- __pycache__/

Note:
leaderboard.db is still included if it existed in the original project. For production, consider using persistent database storage.
