# TerraDeck — Decisions

## Cooldown and packs
- **Cooldown: 15 minutes per pack** (debug mode via `?debug`: 10 seconds).
  - Field testing showed geography challenges were harder than expected: reduce both the former
    30-minute interval and three-success requirement to make repeat learning more approachable.
  - A 195-country planning baseline needs 390 perfect encounters at two successes each; the current
    40-country test roster needs 80. Mistakes, check-in frequency and the stock cap affect completion.
  - The original four-week worldwide goal remains an unvalidated long-term aim, not a guarantee from
    these settings. Reassess with play data rather than retaining the obsolete completion calculation.
- **Packs stack up to 5.** The cooldown starts when a pack is opened.
  - One pack regenerates every 15 minutes while fewer than 5 are stored.
  - The timer pauses at 5 and restarts when a pack is opened from a full stack.
  - Pack count is computed from saved timestamps on load, so it accrues while the app is closed.
  - Stored as `{ packs, refillAt }`; `refillAt` is null when full (same pattern as the reference project's `packRefill.ts`).
  - New players start with a full stack of 5.
  - An empty stack fills in 75 minutes. Existing future deadlines are capped at 15 minutes remaining;
    shorter waits and stored packs stay intact, and repeated reconciliation never postpones the deadline.

## Challenge rules
- **Reload mid-challenge** resumes the same challenge, so reloading cannot skip a country.
- **Wrong continent** ends the encounter immediately and shows the correct continent's map, zoomed to the
  pulsing target country. No stamp; existing stamps are kept.
- **Wrong country** shows the correct continent's map with the target highlighted (green) and the player's
  wrong tap marked (red), framed so both are visible.
- **Repeats:** the last 3 countries are excluded from selection.
- **Two-stage mastery:** the first correct first-attempt continent + country encounter earns the
  silver **Visitor / Besucher** stamp (I); the second earns gold **Explorer / Entdecker** (II) and unlocks
  the card. Both passport stamps remain visible with localized names and earned/empty states.
- **Collected countries** (at least 2 stamps) are removed from the random pool. When the pool is empty, show "Atlas complete".
- **Existing saves:** retain the v1 storage key/schema, raw stamp counts, encounters, discovery and unlock
  dates. One stamp stays one; legacy two/three-stamp countries count as collected and display 2/2.
  No invented historical unlock dates or automatic unlock replay on load. Already-active challenges
  still resume without reducing historical counts or awarding duplicate unlocks.

## Content
- Six continents, no Antarctica. Transcontinental countries are avoided in the starter set.
- Starter 20: France, Italy, Norway, Switzerland; Japan, India, Vietnam, Nepal; Egypt, Kenya, Morocco, Madagascar;
  Canada, Mexico, Cuba; Brazil, Peru, Chile; Australia, New Zealand.
- Cards: flag (`flag-icons`, MIT), capital, population, area, one fact — all bundled with the app.
- The test roster now contains **40 countries**, retaining the original 20 and their card numbers.
  Added: Germany, Spain, United Kingdom, Greece; China, South Korea, Indonesia, Bhutan; Algeria, Ghana,
  Namibia, Lesotho; United States, Costa Rica, Jamaica; Argentina, Bolivia, Uruguay; Fiji, Vanuatu.
  Their number, population and area data are sourced from the public REST Countries dataset captured in
  `scripts/rarity/snapshot.json`; figures are approximate, not live statistics. Short geographic facts are
  maintained in both locale files. The final worldwide roster and corner-case FAQ remain future work.

## Rarity and discovery

- **Five fixed grades:** Common, Uncommon, Rare, Epic, Legendary. Rarity is a game mechanic, not a
  country's worth, importance or a political recognition statement.
- **Familiarity proxy:** the count of active Wikipedia language editions with an article linked from the
  country's Wikidata item. Wikidata ISO claims verify article identity; Wikimedia's site matrix excludes
  non-Wikipedia projects and closed sites. This is editorial/online coverage, not a survey of recognition.
  Page views were considered, but API rate limiting led to using coverage with the user's approval.
- **Frozen baseline:** 193 UN member countries, independent of the 40-country playable sample.
  Guinea-Bissau's erroneous membership flag in the upstream dataset is explicitly corrected.
  This reference set is for scoring only, not the final game roster.
- **Formula:** midrank percentile `(number lower + (number equal - 1) / 2) / (193 - 1)` for both
  coverage and country area. Rarity score is `0.8 * (1 - coverage percentile) + 0.2 * (1 - area percentile)`.
  Areas are source country areas, not a uniform measurement of land-only area.
  Score bands `[0,.2)`, `[.2,.4)`, `[.4,.6)`, `[.6,.8)`, `[.8,1]` yield the five grades.
  The checked-in snapshot contains source URLs, retrieval date, edition lists and raw measurements;
  generated output retains intermediate scores. **Switzerland is explicitly Legendary**, regardless
  of its calculated score. Only explicit regeneration/review changes assignments.
- **Separate generation and draws:** `npm run rarity:collect` explicitly refreshes networked inputs;
  `npm run rarity:build` deterministically generates the small browser catalog offline. Neither runs in
  normal builds. Draw logic has injected RNG and weights in `src/domain/rarity.ts`, independent of UI/storage.
- **Gentle weights:** Common 1.00, Uncommon 0.95, Rare 0.90, Epic 0.85, Legendary 0.80 per eligible
  country, after collected/recent filtering. A Legendary country has 80% of an eligible Common country's
  chance; these are not tier probabilities, which depend on the remaining roster. No persisted RNG seed.
- **Discovery on opening:** optional `discoveredAt` is saved as soon as a pack opens. The card name and
  rarity are visible immediately, even before answering or after a zero-stamp mistake. Existing encounter,
  stamp or unlock evidence and active challenges also imply discovery, without invented historical dates.
  Valid v1 saves keep the same storage key/schema and all existing progress.
- **Presentation:** orders, discovered backs, collection grid/focus, and collected/unlock cards share a
  top-right localized rarity badge and compact colored header banner with a thin gradient top edge,
  inset within the decorative frame so the border remains visible on every side. The game-style palette
  is Common silver/gray, Uncommon green, Rare blue, Epic purple and Legendary gold; text and 1–5 pips
  supplement color. Epic has static foil; Legendary has metallic gold and a gentle intermittent sheen
  only on large cards and the Find panel. Thumbnails stay static, and reduced motion disables the sheen.
  Undiscovered cards expose no rarity styling or labels. Flags still need one stamp on
  backs, and full cards need two. Mastery silver/gold is independent of country rarity.

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
- **Excluded territory context:** `scripts/geo/exclusions.mjs` is the explicit initial game-only list.
  Embedded overseas polygons (including French Guiana) are split out before country-map rendering, while
  still being included in the geographically correct merged continent outlines. They stay gray, are omitted
  from frame fitting, country hit/lens candidates, selection marks and parent-country silhouettes, and block
  taps rather than falling through to ocean snapping. Other non-roster countries remain possible wrong
  answers. The exclusions do not claim a complete recognition policy.
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
