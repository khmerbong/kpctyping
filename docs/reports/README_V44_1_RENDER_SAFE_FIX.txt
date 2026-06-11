KPC Typing V44.1 Render Safe Fix

Fix goal:
Repair V44 deploy failure safely.

What changed:
- Removed old V44 references from training_mode.html
- Added v44_1_auto_capture_fix.css
- Added v44_1_auto_capture_fix.js
- Keeps academyInput hidden but alive
- User can type directly without clicking input
- No backend changes
- No requirements changes
- No route changes
- No database changes
- No XP/progress/level logic changes

Deploy:
git add .
git commit -m "V44.1 Render Safe Fix"
git push
