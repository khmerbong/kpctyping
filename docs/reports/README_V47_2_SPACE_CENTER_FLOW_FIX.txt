KPC Typing V47.2 Space + Center Flow Fix

Fixed:
- Space no longer displays as a strange symbol.
- Space displays as a clean blank gap with underline.
- Space key works through original training_academy.js logic.
- Removed V46/V47 independent target rewriting conflicts.
- Center flow is now produced by displayTarget() inside training_academy.js.
- Visible input is hidden, but original input remains alive and focused.

No backend changes.
No route changes.
No database changes.
No XP/Level/Progress calculation changes.

Deploy:
git add .
git commit -m "V47.2 Space Center Flow Fix"
git push
