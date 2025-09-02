
# NFL Jim Trivia (Refreshed Final Build)

Brutalist, offline, PFR-style NFL player stats guessing game. Positions: QB/RB/WR/TE. Era: 1980–2024. Regular season only.

## Features
- Endless (default) + Daily modes
- 3 guesses, 60-second timer, hints (College, Fun fact), scoring with penalties
- PFR-style tables per position, single combined row on mid-season trades (`Team Full (KAN/CHI)`)
- Offline sample dataset (replaceable with a larger bundle later)
- Keyboard shortcuts: <kbd>/</kbd> focus guess, <kbd>Enter</kbd> submit, <kbd>1</kbd>/<kbd>2</kbd> hints, <kbd>Esc</kbd> give up
- Accessibility: semantic tables, sticky headers, high contrast
- Netlify SPA routing via `netlify.toml`

## Quick Start
```bash
npm install
npm run dev
# build
npm run build
npm run preview
```

## Deploy on Netlify
- Connect your GitHub repo to Netlify
- Build command: `npm run build`
- Publish directory: `dist/`

## Replace Dataset
Swap `public/data/sample/*.json` with your larger offline bundle (same structure). The app lazy-loads from `/data/sample/` by default.
