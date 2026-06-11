KPC Typing V24 Phase 1 Update

Added:
1. Academy Chapters UI
   - Home Row, Top Row, Bottom Row, Numbers, Symbols, Mastery
   - Shows current chapter and lesson progress count.

2. Lesson Length Selector
   - 2 min / 4 min / 8 min
   - Default is 4 minutes.
   - Saved in localStorage: kpc_v24_lesson_duration

3. Time Progress Bar
   - Shows elapsed time and target lesson length.
   - Lesson no longer completes after one quick key round.
   - The key round repeats until the selected lesson duration is reached.

4. Minute XP Reward
   - +20 XP every completed minute during a lesson.

5. Existing V49 Symbol Guide retained
   - Shift + key guide
   - Finger guide
   - Symbol sheet
   - Voice toggle

Important:
- This update edits static/js/training_academy.js and static/css/v43_focus_lesson.css.
- Test /training-mode after unzip.
