# TerraDeck

A mobile-first country-learning collection game. Find each country on an unlabelled world map,
earn three mastery stamps and unlock its collectible card.

Built with React, TypeScript and Vite; deployed to GitHub Pages. Progress is saved in the browser.

- [Plan](docs/PLAN.md) — architecture, map approach and milestones
- [Decisions](docs/DECISIONS.md) — game rules and technical choices with their reasoning

## Local development

Requires Node 18.19+ (Node 20+ recommended; needed for the latest Playwright).

```sh
npm install          # install dependencies
npm run dev          # dev server at http://localhost:5173 (also reachable on your LAN)
npm run lint         # ESLint
npm run build        # type-check and production build into dist/
npm run preview      # serve the production build locally
npm run geo:build    # regenerate src/data/generated/atlas.json after editing scripts/geo/countries.mjs
```

Useful URLs while developing:

- `http://localhost:5173/?debug` — 10-second pack cooldown, plus "add a pack" and "reset progress" buttons
- `http://localhost:5173/?demo` — a separate save pre-filled with some cards and stamps (combine: `?demo&debug`)
- Test mobile layouts with Chrome DevTools device emulation (Cmd+Shift+M)

### Languages

English (default) and German. Texts live in `src/i18n/locales/*.json`; to add a language, add a JSON file and register it in `src/i18n/index.ts`. The choice is stored under `terradeck:lang`.

### Saved progress

Progress lives in the browser's localStorage for this site (key `terradeck:save:v1`) and survives
reloads. Clearing site data (DevTools → Application → Storage → Clear site data) resets the game.

### Tests (planned)

These scripts are not wired up yet; they arrive with Milestones 2 and 3.

```sh
npm test             # Vitest unit tests for the game rules (Milestone 2)
npm run test:watch   # Vitest in watch mode
npm run e2e          # Playwright end-to-end tests in mobile Chrome emulation (Milestone 3)
npx playwright install chromium   # one-time browser download for e2e
```
