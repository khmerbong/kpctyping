KPC Typing V44 Clean Auto Capture Patch

Audit result:
✅ app.py exists
✅ templates/training_mode.html exists
✅ static/js/training_academy.js exists
✅ static/js/gamification.js exists
✅ static/css/v43_focus_lesson.css exists
✅ static/js/v43_focus_lesson.js exists
✅ app.py syntax OK
✅ training_academy.js syntax OK
✅ gamification.js syntax OK
✅ v43_focus_lesson.js syntax OK
✅ route / exists
✅ route /training-mode exists
✅ route /progress exists
✅ route /daily-challenge exists
✅ route /sitemap.xml exists
✅ route /robots.txt exists
✅ academyInput found and converted to auto-capture status

Update:
- Based on working V43 layout.
- Removes failed V44/V44.1 references.
- Hides the visible typing input box.
- Keeps original academyInput alive and focused.
- Does not dispatch synthetic key events.
- Does not change backend, routes, database, XP, progress, or level data.

Deploy:
git add .
git commit -m "V44 Clean Auto Capture Patch"
git push
