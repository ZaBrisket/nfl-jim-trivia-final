# NFL Trivia — Reliability-Focused Rewrite

This is a production-ready rewrite of the NFL trivia game with the fixes called out in the audit: stronger data loading and fallbacks, deterministic daily mode, robust timer with pause/resume, improved fuzzy matching, schema-versioned local storage, accessibility polish, and CI/testing scaffolding.

> **No telemetry, no PII.** Streaks and recents are local-only. The build ships without source maps by default.

## Quick Start

```bash
# Requires Node 20.x (see .nvmrc) and npm 10.x
nvm use || echo "make sure Node 20 is active"
npm install

# Run dev server
npm run dev

# Typecheck, lint, unit tests, e2e scaffold, and build
npm run check
npm run build
npm run preview
```

## Deploy (Netlify)

1. Create a new site from this repo in Netlify.
2. **Build command:** `npm run build`
3. **Publish directory:** `dist`
4. Add a redirect file for SPA routing: `netlify.toml` is already included.
5. Deploy. The service worker is registered only in production builds.

## Deploy (Vercel)

1. Import the repo into Vercel.
2. **Framework preset:** Vite
3. **Build command:** `npm run build`
4. **Output directory:** `dist`
5. Deploy. Ensure `Clean URLs` is enabled or use the included SPA fallback.

## Deploy (GitHub Pages)

1. In repo settings, enable GitHub Pages for the `gh-pages` branch.
2. Run:
   ```bash
   npm run build
   npm run deploy:gh
   ```
3. Pages will serve from `/` (SPA fallback handled by `index.html`).

## Data: Offline-First Strategy

- The app tries to load JSON from `/data/**` in `public/` **with retries**.
- If network fails, it falls back to a small **embedded dataset** at `src/data/fallbackPlayers.ts` so the app remains usable offline.
- You can replace the public data with real datasets; the app will normalize and cache them the same way.
- A simple service worker caches static assets and JSON after first successful load.

## Project Structure

```
.
├── .github/workflows/ci.yml        # typecheck, lint, unit tests, build
├── .nvmrc                          # Node 20 pin
├── netlify.toml                    # SPA redirects
├── package.json                    # scripts + deps
├── playwright.config.ts            # e2e scaffold
├── public/
│   └── data/                       # optional real datasets (can be large)
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── router.tsx
│   ├── styles.css
│   ├── components/
│   │   ├── DataStatusBanner.tsx
│   │   ├── GuessInput.tsx
│   │   ├── HintButtons.tsx
│   │   ├── KeyboardShortcuts.tsx
│   │   ├── ScoreBoard.tsx
│   │   └── Timer.tsx
│   ├── context/
│   │   └── DataContext.tsx
│   ├── data/
│   │   └── fallbackPlayers.ts
│   ├── hooks/
│   │   └── useVisibilityPause.ts
│   ├── pages/
│   │   ├── Daily.tsx
│   │   └── Game.tsx
│   ├── state/
│   │   └── gameMachine.ts
│   ├── utils/
│   │   ├── date.ts
│   │   ├── fuzzy.ts
│   │   ├── normalize.ts
│   │   ├── random.ts
│   │   ├── retry.ts
│   │   └── storage.ts
│   ├── service-worker.ts           # basic cache for app shell + JSON
│   ├── types.ts
│   └── vite-env.d.ts
├── tests/
│   ├── unit/
│   │   ├── date.spec.ts
│   │   ├── fuzzy.spec.ts
│   │   └── storage.spec.ts
│   └── e2e/
│       └── app.spec.ts
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── index.html
```

## Acceptance Criteria Matrix (from the audit)

- Data loading has retries + user-visible errors + lazy loads → **`utils/retry.ts`, `context/DataContext.tsx`, `components/DataStatusBanner.tsx`**
- Removed globals; all data via context → **`context/DataContext.tsx`**
- Timer is monotonic, pausable on tab blur → **`components/Timer.tsx`, `hooks/useVisibilityPause.ts`**
- Chicago date util is sole source of truth → **`utils/date.ts`** used in Daily + Game
- RNG: crypto-random + stable daily seed → **`utils/random.ts`**
- Round engine: explicit finite states → **`state/gameMachine.ts`**
- Fuzzy matching improved → **`utils/fuzzy.ts`**
- Numeric normalization → **`utils/normalize.ts`**
- LocalStorage versioning + migrations → **`utils/storage.ts`**
- Service worker / offline fallback dataset → **`service-worker.ts`, `src/data/fallbackPlayers.ts`**
- Source maps off in prod → **`vite.config.ts`**
- A11y polish (aria-live, labels, disabled states) → **`components/*`**
- CI/tests → **`.github/workflows/ci.yml`, `tests/**`**

---

## Replace with Real Data (Optional)

Place files in `public/data/`:
- `players.json` (array of players)
- `seasons_qb.json`, `seasons_rb.json`, `seasons_wr.json`, `seasons_te.json` (arrays of season rows)

The loader will attempt to fetch these at runtime; when unavailable, it falls back to the embedded sample.
