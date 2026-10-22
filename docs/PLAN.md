# TerraDeck — Plan

Mobile-first country-learning collection game. React + TypeScript + Vite, deployed to GitHub Pages.
See [DECISIONS.md](DECISIONS.md) for the reasoning behind each choice.

Structure and tech approach are inspired by
[webplatformz/-boring-game-name-](https://github.com/webplatformz/-boring-game-name-) (pack ripping,
pack refill, hash screens, Pages deploy). The game goal differs: learning geography, not collecting by rarity.

## Core loop
1. Packs regenerate over time (one country per pack, max 5 stored).
2. Ripping a pack reveals the country name and starts a challenge: pick the continent, then the country on an unlabelled map.
3. Both answers correct on the first attempt → one mastery stamp.
4. Any mistake ends the encounter and reveals the answer (continent + country location). Existing stamps are kept.
5. Two stamps unlock the country's collectible card: silver Visitor, then gold Explorer; collected countries leave the random pool.
6. Progress and timestamps persist across reloads.

## Screens
- **Home** — the sealed pack as hero, pack count (`3 / 5`), countdown to the next pack
  ("Atlas full" when at 5), collection progress (`7 / 168 cards`) linking to Collection,
  an Achievements card with earned count (`3 / 20`), and How to play / About.
- **Pack opening** — tear the pack (drag or tap), reveal "Find: Peru", then the challenge.
- **Challenge** — step 1 continent picker, step 2 map with select + Confirm, result: stamp earned or answer reveal.
- **Collection** — grid of 168 playable card slots (locked silhouettes, stamp progress, unlocked cards);
  previously discovered excluded countries appear in a separate archive. Tap either to open card detail.
- **Achievements / Erfolge** — 20 cosmetic badges in four categories, exact counters and progress bars,
  earned dates, two hinted surprises and grouped silent notifications after encounter/card feedback.
- **How to play & FAQ** — grouped expandable rules, collection scope and deferrals, data limitations,
  error reporting, privacy, sources, project credits and a name-only draft Impressum.
- **First-visit notice** — short bilingual project/data notice with separate acknowledgement storage;
  help and legal information remain accessible before acknowledgement.

Navigation: screen state in `useGame`, main screens mirrored to the URL hash (`#home`, `#collection`, `#achievements`, `#about`);
help subsections use `#about/<section>` (including privacy, impressum, sources and project);
pack-opening and challenge phases are not routes. No router library.

## Architecture
```
src/
  domain/        Pure TS game rules. No React, storage or Date.now — clock and RNG are injected.
    types.ts       CountryId, Continent, CountryProgress { stamps 0..2 (legacy 3 preserved), encounters, unlockedAt },
                   GameState { schemaVersion, progress, recentIds[], packs, refillAt, activeChallenge? }
    packRefill.ts  reconcilePackRefill(packs, refillAt, now, rules) — lazy regeneration from timestamps
    challenge.ts   startChallenge(state, rng, now), answerContinent(), answerCountry(), completeEncounter()
    selection.ts   pickCountry(): exclude collected and recentIds
    config.ts      cooldownMs, maxPacks, stampsToUnlock, recentWindow
    achievements.ts  Fresh activity tracking, stable badge IDs, pure evaluation and exact progress
  data/          countries.json (roster + card facts), world TopoJSON, continent mapping
  persistence/   ProgressRepository { load(); save(s); update(fallback, pureChange); clear(); subscribe() }
                 LocalStorageRepository — versioned key, migrations, schema validation,
                 corrupt data → back up and reset; Web Locks serialize latest-save mutations
  game/          useGame hook: wires domain + repository + clock; cross-tab sync via `storage` event
  map/           WorldMap (d3-geo + d3-zoom SVG), enlarged hit targets, fit-to-continent
  screens/       Home, PackOpening, Challenge, Collection, Achievements, About
  components/    PackArt, CardFront, CardBack, Stamp, UnlockSequence, TabBar
  theme.ts       design tokens (colours, timings, clip paths)
scripts/         data build: world TopoJSON + country facts → src/data (with source/licence notes)
tests/           Playwright e2e (mobile viewport)
```
Everything stays local for now. The repository interface is async so a cloud implementation
could be added later without touching the rules.

## Map approach
- Natural Earth admin-0 1:50m via `world-atlas` TopoJSON (public domain), ISO-3166 ids.
- Only the 168 retained canonical countries are tappable; non-roster shapes are gray, untappable context.
- Equal Earth world overview, azimuthal equal-area continent maps, SVG rendering and d3-zoom.
- After the continent step, auto-fit to the correct continent with every retained country represented.
- Small countries: geometry-first picking, nearby/ocean snapping and an ambiguity magnifier, not
  enlarged overlapping hit circles or artificial location markers. All 27 playability deferrals and
  one-continent conventions are recorded in [Decisions](DECISIONS.md).
- Tap selects and highlights; a "Confirm" button submits, so a mis-tap is not counted as a mistake.

## Visual direction
Premium explorer's collectible atlas: midnight-blue oceans, warm paper accents, distinctive cards,
two named mastery stamps (silver Visitor / Besucher, gold Explorer / Entdecker) and a satisfying unlock
animation. Phone first, then tablet and desktop. Packs refill every 15 minutes, stacking to five
(10-second debug mode). This pacing reflects field testing rather than a guaranteed completion date.

## Tech stack
- React 18, TypeScript, Vite; ESLint (typescript-eslint, react-hooks).
- d3-geo, d3-zoom, topojson-client, world-atlas.
- Fonts via `@fontsource` packages (Fraunces, Inter).
- Animations with CSS transitions/keyframes and clip-paths (as in the reference); no animation library.
- No sound or video; all feedback remains visual and respects reduced motion.
- Vitest for domain/persistence unit tests; Playwright for e2e on a mobile viewport.
- Vite `base` set only for build (`/TerraDeck/`), `server.host: true` for local network access.
- GitHub Actions → GitHub Pages (`upload-pages-artifact` + `deploy-pages`).

## Testing approach
Web only: Chrome DevTools device emulation (e.g. iPhone 12 Pro 390×844, Pixel 7, iPad) is enough for
manual checks, including touch and pinch emulation. Playwright runs the same mobile viewports in e2e.

## Milestones
1. **Visual prototype** — Vite scaffold, theme tokens and fonts, Home (pack, count, timer, progress, links),
   pack-tear animation, Challenge and Collection with mock state, Card and Stamp components,
   first unlock animation, real map with zoom.
   Done when it renders in Chrome mobile emulation, tablet and desktop widths and the map pinch-zooms.
2. **Playable loop** — domain module (incl. `reconcilePackRefill`) with unit tests, localStorage repository, pack regeneration and countdown,
   continent → country flow, reveal on mistake, stamps, unlock animation, collection reflects progress,
   active challenge resumes after reload.
   Done when a full loop survives reloads with no immediate repeats.
3. **Tests, mobile refinement, deployment** — Vitest (domain, repository, migrations), React Testing Library
   component tests, Playwright e2e on mobile emulation, accessibility pass, reduced motion,
   performance (TopoJSON size), GitHub Actions → Pages workflow.
