# KPC Typing UI Design System 2026

This release adds a modern UI layer without PNG assets.

## Added files

- `static/css/kpc_design_system_2026.css`
- `static/js/kpc_svg_icon_system_2026.js`

## Design direction

- Dark SaaS + gaming learning platform
- Neon purple / electric blue / cyan glow
- Glassmorphism cards and panels
- Sticky navigation
- Responsive card grids
- CSS-only hero visual polish
- Inline SVG icon system
- No PNG assets required

## Main tokens

- Background: `#02040d`, `#060a18`, `#0b1024`
- Purple: `#8b5cf6`
- Magenta: `#d946ef`
- Blue: `#2563eb`
- Cyan: `#06d6ff`
- Gold: `#fbbf24`

## Notes

Older UI files are preserved to avoid breaking existing features. The new design system is loaded last, so it safely overrides visual styles while keeping existing Flask routes, templates, JS, and features.
