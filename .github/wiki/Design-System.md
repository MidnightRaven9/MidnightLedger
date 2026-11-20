# Design system

## Colour

- Background: `#101012` (near-black, not pure black)
- Accent: `#a855f7` (purple), user-configurable in Settings
- Surfaces: flat cards with hairline borders
- Avoid gradients, glows and glassmorphism

## Typography

- Tabular numerals for money and dates
- A consistent label scale across dashboard, bills and reports
- Use `clamp()` for fluid sizing instead of hard breakpoints

## Icons

Lucide icons are used throughout. The PWA icons live in `public/`. Generate all
web and Android icons from `scripts/generate-icons.mjs`.

## Layout

- Header gutters and content padding scale with viewport width
- Grids use `auto-fit` with `minmax()` so layouts adapt from 320px upward
- Status bars and system navigation stay visible; do not use fullscreen mode
