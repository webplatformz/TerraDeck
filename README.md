# TerraDeck

A mobile-first country-learning collection game. Find each country on an unlabelled world map,
earn the silver Visitor and gold Explorer stamps to unlock its collectible card.

Built with React, TypeScript and Vite; deployed to GitHub Pages. Progress is saved in the browser.

- [Plan](docs/PLAN.md) — architecture, map approach and milestones
- [Decisions](docs/DECISIONS.md) — game rules and technical choices with their reasoning

## Local development

Requires Node 18.19+ (Node 20+ recommended; needed for the latest Playwright).

```sh
npm install          # install dependencies
npm run dev          # dev server at http://localhost:5173 (also reachable on your LAN)
npm run lint         # ESLint
npm test             # deterministic game-rule, rarity, save and map-data checks
npm run build        # type-check and production build into dist/
npm run preview      # serve the production build locally
npm run geo:build    # regenerate src/data/generated/atlas.json after editing scripts/geo/countries.mjs
npm run rarity:build # regenerate fixed rarity grades from the checked-in source snapshot
```

Useful URLs while developing:

- `http://localhost:5173/?debug` — 10-second pack cooldown, plus "add a pack" and "reset progress" buttons
- `http://localhost:5173/?demo` — a separate save pre-filled with some cards and stamps (combine: `?demo&debug`)
- Test mobile layouts with Chrome DevTools device emulation (Cmd+Shift+M)

### Languages

English (default) and German. Texts live in `src/i18n/locales/*.json`; to add a language, add a JSON file and register it in `src/i18n/index.ts`. The choice is stored under `terradeck:lang`.

### Saved progress

Progress lives in the browser's localStorage for this site (key `terradeck:save:v1`) and survives
reloads. Clearing site data resets the game.
Existing one-stamp progress stays intact; countries with two or three saved stamps count as collected.
Historical stamp counts and unlock dates are preserved, while progress displays stop at two.

Normal packs refill every **15 minutes**, up to five stored packs. Existing future refill deadlines
are capped at a 15-minute remaining wait; shorter waits and stored packs are preserved.

### Rarity and country content

The test atlas contains 40 playable countries. Rarity is fixed in
`src/data/generated/rarity.json`: Common, Uncommon, Rare, Epic and Legendary.
Opening a pack reveals its country's name and rarity immediately; full cards need two successful
encounters: Visitor, then Explorer.

The generator uses a frozen 193-country reference snapshot: 80% Wikipedia language-edition
coverage (a rough familiarity proxy), 20% country area. Switzerland has an explicit Legendary
override. These are game grades, not a ranking of countries' worth or an objective recognition survey.

- `scripts/rarity/snapshot.json`: sourced measurements, Wikidata article IDs, edition lists and reference set.
- `scripts/rarity/scoring.mjs`: formula, grade thresholds and overrides.
- `scripts/rarity/roster.json`: the 40-country test selection, in stable card-number order.
- `src/domain/rarity.ts`: independently tunable per-country draw weights (1.00 to 0.80).
- `scripts/geo/exclusions.mjs`: gray, untappable territories and overseas polygons, including French Guiana.

`npm run rarity:build` is deterministic and offline. To deliberately refresh the inputs, run
`npm run rarity:collect` (requires internet access to Wikidata and the public REST Countries data
repository), then regenerate and review the diff. Never run collection as part of deployment:
changing source coverage must not silently change published grades. Source/API errors stop collection
without replacing the previous snapshot.

### Tests

`npm test` uses Node's built-in test runner with `tsx` for TypeScript imports. It covers weighted
selection, discovery/save compatibility, source/catalog/content invariants and excluded map polygons.
Lint and the production build remain separate commands. Browser flows are currently checked manually
with Chrome mobile emulation; a repository-managed end-to-end runner is not configured yet.
