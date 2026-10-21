# TerraDeck — Decisions

## Cooldown and packs
- **Cooldown: 30 minutes per pack** (debug mode via `?debug`: 10 seconds).
  - Target: a regular daytime player collects every country in about 4 weeks.
  - 195 countries × 3 stamps = 585 perfect encounters.
  - Assuming ~75% first-try success: ~780 encounters.
  - 28 days × 16 waking hours = 448 hours → ~34 minutes per pack, rounded down to 30.
- **Packs stack up to 5.** The cooldown starts when a pack is opened.
  - One pack regenerates every 30 minutes while fewer than 5 are stored.
  - The timer pauses at 5 and restarts when a pack is opened from a full stack.
  - Pack count is computed from saved timestamps on load, so it accrues while the app is closed.
  - Stored as `{ packs, refillAt }`; `refillAt` is null when full (same pattern as the reference project's `packRefill.ts`).
  - New players start with a full stack of 5.
  - Note: the stack fills after 2.5 hours, so a player checking in 4–5 times a day gets ~25 packs/day (~31 days to finish).

## Challenge rules
- **Reload mid-challenge** resumes the same challenge, so reloading cannot skip a country.
- **Wrong continent** ends the encounter immediately and shows the correct continent's map, zoomed to the
  pulsing target country. No stamp; existing stamps are kept.
- **Wrong country** shows the correct continent's map with the target highlighted (gold) and the player's
  wrong tap marked (red), framed so both are visible.
- **Repeats:** the last 3 countries are excluded from selection.
- **Collected countries** (3 stamps) are removed from the random pool. When the pool is empty, show "Atlas complete".

## Content
- Six continents, no Antarctica. Transcontinental countries are avoided in the starter set.
- Starter 20: France, Italy, Norway, Switzerland; Japan, India, Vietnam, Nepal; Egypt, Kenya, Morocco, Madagascar;
  Canada, Mexico, Cuba; Brazil, Peru, Chile; Australia, New Zealand.
- Cards: flag (`flag-icons`, MIT), capital, population, area, one fact — all bundled with the app.

## Maps
- **Continent rule:** every country belongs to the continent that holds most of its land area. So Russia,
  Turkey, Kazakhstan, the Caucasus states, Cyprus, Iran and the Middle East are Asia; Egypt is Africa;
  Greenland, the Caribbean and Central America are North America; Papua New Guinea is Oceania.
  Overseas parts follow geography: French Guiana → South America; Guadeloupe, Martinique and the
  Caribbean Netherlands → North America; Réunion and Mayotte → Africa. Antarctica is removed.
- **One reviewable list:** `scripts/geo/countries.mjs` maps each of the 240 world-atlas 50m shapes to an
  ISO code and continent. Shapes with no official ISO code use the closest one (Somaliland SO, N. Cyprus CY,
  Kosovo XK…).
- **Generated data:** `npm run geo:build` validates the list (fails on missing or unknown shapes), tags
  every shape, merges the six continent outlines (topojson merge) and writes `src/data/generated/atlas.json`.
  The output is committed and lazy-loaded at runtime.
- **Continent step:** the world map (Equal Earth) shows only the six outlines with no borders, plus wide
  invisible tap edges. A tap highlights the continent and answers after 300 ms with no confirmation; a second
  tap within that time switches, and only the last one counts. The buttons stay as an alternative.
- **Continent feedback:** the answer is saved immediately (a reload can't undo it). A correct pick turns the
  continent and its button green for 700 ms, then the country step opens. A wrong pick turns them red and shows
  a "Wrong continent" overlay; its button leads to the existing reveal on the correct continent's map.
- **Country step:** one map per continent, using an azimuthal equal-area projection centred on that
  continent and fitted to the screen. The fit uses only the continent's larger land parts, so small remote
  islands don't widen it; Svalbard, Hawaii and Galápagos fall outside the frame but are still drawn.
  Neighbouring land is faded and can't be tapped. Zoom is limited to 1–6×, panning stays inside the
  frame, and double-tap zoom is off so it can't clash with the magnifier. Zoom buttons sit bottom-left so
  they don't cover the Lesser Antilles.
- **Tap resolution:** taps are resolved by geometry rather than by enlarged hit circles, which used to cover
  neighbours (tapping Switzerland picked Liechtenstein). Order: the country under the finger, then the
  nearest small country (< 30 px on screen), then the nearest country within 28 px for taps in the sea.
- **Magnifier:** opens when a tap is ambiguous: no direct hit with 2+ small countries within 24 px; a small
  country hit with another small one nearby; or a large country hit with a small one within 12 px.
  It shows a 96 px-radius circle at 3–6× magnification. Tapping inside it picks the exact country; tapping
  outside, zooming or panning closes it. This works in Europe (the Alps, Benelux, the Balkans) and in the
  Caribbean.
- Rings mark small selected or revealed countries so they stay visible at low zoom. With reduced motion,
  the map transitions are instant (the 300 ms continent pick delay stays, because it is input timing).

## Technical
- Reference project for structure and tooling: webplatformz/-boring-game-name-.
- Everything is local (localStorage); no backend or accounts.
- Animation: CSS transitions/keyframes, respecting `prefers-reduced-motion`.
- Fonts: Fraunces (headings), Inter (body), via `@fontsource`.
- Navigation: screen state plus URL hash, no router library; Vite `base: '/TerraDeck/'` for builds.
- Manual testing in Chrome mobile emulation; no real-device testing required.
- No notifications or offline mode for now; show a countdown instead.
- Corrupted saved data is backed up and reset.
- Multiple tabs stay in sync via the browser `storage` event.
- Map accessibility: keyboard navigation now; a list-based alternative later.
- Local Node is 18.19, so the project uses Vite 5 and Playwright 1.48 (newer Playwright needs Node 20). CI can use Node 20.
- Full-screen overlays (card modal, unlock) render through a portal to `document.body`, because screen enter animations use transforms that would otherwise trap `position: fixed`.
- Progress is saved in the browser's localStorage under `terradeck:save:v1` (per site origin), so it survives reloads; clearing site data erases it. `?demo` uses a separate key seeded with a partly filled atlas (`src/game/prototypeState.ts`).

## Languages (i18n)

- `i18next` + `react-i18next`, one JSON file per language in `src/i18n/locales/` (`en.json`, `de.json`). Keys are typed from `en.json`; `de.json` must match it or the build fails.
- English is the default. The language is stored under `terradeck:lang` only after the player picks one on the Home screen; it is separate from the game save. `<html lang>` follows the active language.
- Country names, capitals, facts and continent names live in the locale files, not in `src/data`. Numbers are formatted per language via `src/i18n/useContent.ts`.
- German uses standard spelling (ß). Prompts avoid starting with a country name because some names need an article.
- To add a language: add `locales/<code>.json`, register it in `LANGUAGES` in `src/i18n/index.ts`.
