# Map and content decisions

[Decision index](../DECISIONS.md) | [Product overview](../PLAN.md)

**Decision:** Use a curated playable roster, geometry-first maps and bundled bilingual country content.

**Rationale:** Natural visual targets must remain usable on phones, without implying political recognition or precision beyond the source data.

**Constraints:** Preserve published card IDs and geographic policy. Roster changes also require the [saved-data transition](saved-data.md#roster-transition).

## Content
- Six continents, no Antarctica. Each retained country has one accepted game continent, including
  transcontinental countries (see Maps).
- Historical starter 20 (not the current roster limit): France, Italy, Norway, Switzerland; Japan, India, Vietnam, Nepal; Egypt, Kenya, Morocco, Madagascar;
  Canada, Mexico, Cuba; Brazil, Peru, Chile; Australia, New Zealand.
- Cards: flag (`flag-icons`, MIT), capital, population, area, one fact — all bundled with the app.
- **168 playable countries / 336 stamps**, from the 193 UN members plus Vatican City/Holy See and
  Palestine, with **27 exclusions**. The original five remain: **Tuvalu** (absent from the geometry),
  **Vatican City, Monaco, Maldives and Nauru** (insufficient natural visual targets at phone scale).
  Mobile testing additionally excludes **San Marino, Liechtenstein, Malta, Andorra, Singapore,
  Bahrain, Saint Kitts and Nevis, Grenada, Saint Vincent and the Grenadines, Barbados,
  Antigua and Barbuda, Saint Lucia, Dominica, Seychelles, São Tomé and Príncipe, Comoros,
  Mauritius, Marshall Islands, Palau, Micronesia, Tonga and Kiribati**. These are playability
  decisions, not recognition decisions; no artificial location markers are added.
- The shared 190-card catalog retains every published ID, number, metadata value, fact, flag and
  fixed rarity. `ALL_COUNTRIES` retains the catalog; `COUNTRIES` is its generated playable subset;
  `ARCHIVED_COUNTRIES` contains the 22 removed cards. Numbering gaps are intentional. The original
  40 entries and the subsequent 150 ISO-ordered additions are never renumbered or duplicated.
  Playable counts: Europe 37, Asia 46, Africa 50, North America 16, South America 12, Oceania 7.
  Rarity counts: Common 29, Uncommon 46, Rare 42, Epic 35, Legendary 16. No scores or draw weights change.

- `scripts/atlas/policy.mjs` records deferrals and duplicate/context-only map aliases;
  `initial-roster.json` freezes the original numbering; generated `roster.json` binds each playable
  ID to exactly one canonical map feature and continent. Taiwan, Kosovo, Somaliland, Northern Cyprus
  and every other non-roster map entity remain gray and untappable, even when an alias shares a
  retained country's ISO code. A brief in-game scope/continent note replaces the obsolete test-atlas
  wording. The combined Help & FAQ now gives concise explanations of the roster, all 27 deferrals,
  overseas areas and continent grouping, rather than a comprehensive political FAQ.
- Frozen public REST Countries metadata, EN/DE names and capitals are in `scripts/atlas/snapshot.json`,
  with source URLs and retrieval date. Figures are approximate, not live statistics. New bilingual
  facts describe sourced landlocked status or land neighbors (or island status when neither applies).
  Existing localized entries are preserved by regeneration and may be editorially improved.
- Capitals use one conventional display rather than an exhaustive constitutional/seat list. Pretoria
  is labeled executive, Mbabane administrative, and Ramallah administrative seat. Palestine's display
  does not negate its Jerusalem claim or resolve Jerusalem's status. Existing Sucre, and conventional
  Amsterdam, Kuala Lumpur and Sri Jayawardenepura Kotte, remain conventional capital displays.
- Long localized names wrap inside the card frame; full-card typography and fact spacing are compact,
  with a smaller heading for names over 26 characters so expanded content cannot erase the silhouette.
- `npm run atlas:collect` explicitly refreshes metadata and Palestine's supplemental Wikidata
  measurement; `npm run atlas:build` regenerates roster/content additions/flags/rarity/maps offline.
  Neither runs during normal builds or deployment. Review diffs before publishing.

## Country stories and details

- REST Countries details are explicitly collected offline for authoring, with source
  and retrieval metadata. No runtime network request. Intl/CLDR labels plus explicit
  uncommon-language translations support EN/DE. Source languages are not an
  exhaustive inventory of all spoken languages. Show at most two selected source
  languages without claiming speaker share or ranking. Country-specific percentages
  need separate sourcing.
- Front facts are not duplicated on the back: editable front/detail/fun stories
  are authored in `scripts/content/country-stories.json` and bundled offline through
  `src/data/countryStories.ts`; missing front facts retain locale fallbacks.
  Enforce per-language limits of 120/200/170 characters for front/detail/fun.
  Story objects contain only `en` and `de`, with no per-story source URLs.
  Keep the JSON as the single editable content file, not a one-time input or
  generated output.
- Accept user-supplied batches without a mandatory web-verification pass; refine
  wording and translations, preserve other entries, and leave corrections easy to
  make country by country. Prefer playful, memorable details; omit missing stories
  rather than invent filler. [Provenance limits](presentation.md#help-project-notice-and-credits)
  still apply.
- These are bundled content changes, not saved-progress changes: no save version
  bump or migration is required. Unrelated geographic data and licence credits remain.

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
- **Crimea correction:** the installed `world-atlas` 2 `countries-50m.json`
  (Natural Earth public-domain geometry, distributed in the ISC-licensed package)
  assigns the peninsula polygon to Russia. `scripts/build-geo.mjs` transfers that
  existing polygon, identified by an interior point at Simferopol, to Ukraine
  before tagging/merging continents. TopoJSON merging dissolves the shared isthmus
  boundary without introducing coordinates, gaps or duplicate land. All map modes,
  mainland silhouettes, hints and adjacency consume this corrected atlas.
  Country IDs, progress/save schemas and frozen Daily Tour scoring references stay
  unchanged; this is a geometry correction, not a save migration.
- **Excluded territory context:** `scripts/geo/exclusions.mjs` lists separately split overseas polygons;
  the approved canonical roster additionally excludes every non-roster feature.
  Embedded overseas polygons (including French Guiana) are split out before country-map rendering, while
  still being included in the geographically correct merged continent outlines. They stay gray, are omitted
  from frame fitting, country hit/lens candidates, selection marks and parent-country silhouettes, and block
  taps rather than falling through to ocean snapping. Only retained canonical countries can be right
  or wrong answers. This is a collection policy, not a political recognition policy.
- **Continent step:** the world map (rectangular equirectangular projection) shows only the six outlines with no borders, plus wide
  hit targets. The overview is enlarged by up to 12%, cropping the horizontal edges while
  keeping the land's full height inside the frame. Map taps and buttons highlight the pending
  continent without submitting it. Players can change their choice freely; an explicit
  confirmation button submits the selected continent, matching the country step.
- **Continent feedback:** the answer is saved immediately (a reload can't undo it). A correct pick turns the
  continent and its button green for 700 ms, then the country step opens. A wrong pick turns them red and shows
  a "Wrong continent" overlay; its button leads to the existing reveal on the correct continent's map.
- **Country step:** one map per continent, using an azimuthal equal-area projection centred on that
  continent and fitted to the screen. The fit prefers larger land parts, but every retained country
  contributes at least its largest polygon, keeping Cape Verde and Samoa reachable.
  Deferred countries such as Mauritius, Seychelles, Kiribati and Tonga are context,
  not selectable targets and do not widen the fit.
  The Pacific-centered Oceania frame crosses the antimeridian. Large
  countries retain one card, with any included visible part accepted. Archipelagos preserve their
  dispersed island geometry for silhouettes and answer framing; excluded territories never widen fits.
  Remote nonessential parts such as Svalbard, Hawaii and Galápagos need not widen the overview.
  Neighbouring land is faded and can't be tapped. Zoom is limited to 1–8×, panning stays inside the
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
  the map transitions are instant. Continent selection has no auto-submit timer.
- The continent-selection world map uses the same bottom-left zoom controls,
  pinch/wheel zoom, bounded panning and reset interaction as the country map,
  capped at 4× rather than 8×. Double-tap zoom is disabled; dragging does not
  select an answer. Zooming retains the pending selection and explicit confirmation.
  Selecting a continent on the map or via a button gently recenters it at a minimum
  1.5× zoom, retaining a higher manual zoom. Neighbours remain reachable, and reset
  returns to the world overview without clearing the pending answer.
- Country selections in normal challenges and daily tours use the same gentle
  minimum 1.5× recentering, without reducing higher manual zoom. Selection through
  the small-country magnifier also recenters; answer-reveal framing takes priority.
  View transforms are temporary UI state, so the save format is unchanged.
- **Hold-to-magnify:** normal challenges, Daily Tour and Training share the country
  map interaction. Hold about 450 ms, slide the crosshair and release to select;
  explicit confirmation is still required. Normal taps remain available, movement
  before activation pans, and ocean/context land preserves selection. Pinch,
  cancellation, lost capture, blur, hidden pages, map replacement and unmount must
  clean up the gesture. Browser emulation is not proof of native long-press behavior.

## Implementation references

- Policy/data: [`policy.mjs`](../../scripts/atlas/policy.mjs),
  [`countries.mjs`](../../scripts/geo/countries.mjs) and
  [`country-stories.json`](../../scripts/content/country-stories.json).
- Map behavior: [`ContinentMap.tsx`](../../src/map/ContinentMap.tsx),
  [`ContinentPicker.tsx`](../../src/map/ContinentPicker.tsx) and
  [`projections.ts`](../../src/map/projections.ts).
- Coverage: [`atlas.test.mjs`](../../tests/atlas.test.mjs),
  [`territories.test.mjs`](../../tests/territories.test.mjs),
  [`country-details.test.mjs`](../../tests/country-details.test.mjs) and
  [`map-hold-magnify.spec.ts`](../../tests/e2e/map-hold-magnify.spec.ts).
