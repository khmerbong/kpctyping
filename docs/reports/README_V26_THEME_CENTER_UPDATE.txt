KPC Typing V26 Theme Center Update

Added:
- 6 training screen themes based on the preview collage:
  1. Aurora Night
  2. Clean Light (DEFAULT)
  3. Ocean
  4. Neon Purple
  5. Wood Desk
  6. Cyber Dark
- Floating Theme Center custom panel on /training-mode
- Theme is saved with localStorage: kpc_v26_theme
- Keyboard skin selector: Classic / Glass / Neon / Soft
- Keyboard skin is saved with localStorage: kpc_v26_key_skin

Files added:
- static/css/v26_theme_center.css
- static/js/v26_theme_center.js

Files edited:
- templates/training_mode.html

Notes:
- Theme #2 Clean Light is the default if the user has not selected a theme.
- This update uses CSS gradients and light decorations, so it does not require large image assets.
- For 100% identical art backgrounds, replace the CSS backgrounds with real 1920x1080 PNG/JPG assets later.
