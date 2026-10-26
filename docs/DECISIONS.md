# TerraDeck — Decisions

## App release version and notes

- Player-facing versions use `v<Major>.<YYYYMMDD>` from the major and fixed release
  date in `src/data/releases.ts`; the clock never changes the release date.
  This date-based display is independent of the three-part npm package version,
  Android native versioning and saved-data schema versions.
- The existing main-screen footer links to `#releases`; fullscreen challenges
  and tours remain footer-free. Notes are bilingual local data, newest first,
  with older releases retained. No router or Markdown dependency is needed.
  Each release has a localized title and version; each bullet uses a short
  bold label (one to three words), a colon and a technical/feature-focused
  description with light humor. The first production entry may introduce
  existing launch features without presenting them as newly implemented.
- Before publication, verify the date, version and EN/DE notes against changes
  since the last successful deployment, then obtain explicit user approval of
  the notes. This check is part of every release, not optional copy editing.
  Wording approval alone does not authorize a push or deployment.
- The initial draft introduces the first production release, then covers changes
  after deployed commit `a07f599`: the country-text refresh and version/notes page.
  Tours and achievements appear as launch context, not newly implemented changes;
  they and map zoom were already deployed.
- Release notes and navigation are bundled UI data only; saved progress and the
  save schema are unchanged, so no migration or schema-version bump is needed.

## Saved-data evolution

- Check backward compatibility before changing persisted structures, validators,
  or saved-field semantics. Prefer additive optional fields and safe initialization
  of new feature data; retain the current version when older saves remain compatible.
- Incompatible changes require a version bump for the affected schema or extension
  and, wherever possible, an explicit, retry-safe migration separate from game rules.
  Preserve original saves and verify affected legacy saves with focused tests.
- Preserve unsupported newer saves without overwriting them or silently resetting
  progress; report incompatibility when no safe migration exists. This is a required
  safeguard before introducing an incompatible main-save version, not a claim that
  the current v1 loader already provides it.
- Contributor instructions live in `.github/copilot-instructions.md`.

## Daily World Tour

- One numbered five-stop tour per UTC day, starting with #1 at
  `2026-10-23T00:00:00Z`. Initially three fixed Europe/Africa/Asia tours rotate.
  Schedule v2 starts `2026-10-25T00:00:00Z`: 36 unique, named routes span
  six continents. Keep v1 assignments readable.
  Future schedules must be forward-effective rather than reassign published days.
- The catalogue mixes 12 regional, 13 thematic and 11 dispersed journeys.
  Themes use English display names (five letters, shared S initials, `stan`
  endings) or the five smallest/largest playable countries on a continent by
  stored area. These rankings do not claim to include non-playable microstates.
  Dispersed routes retain substantial map jumps; thematic routes can deliberately
  be more predictable. Names are localized, with the English-name basis explicit
  in the German five-letter title. Full country coverage and a fixed route count
  are guidelines, not requirements; quality takes priority. Completion targets,
  localized descriptions and gold badge numbers follow the catalogue size.
  This revision was made on 24 October,
  before schedule v2 becomes available; published v1 definitions remain unchanged.
  Save and extension versions stay unchanged: no persisted format changes or
  migration are needed, and existing v1 results and achievement evidence are retained.
- Same continent and ordered targets for everyone; explicit country confirmation,
  then answer reveal and Continue. No continent question or auto-submit delay.
- Correct = 0 km; wrong = rounded great-circle distance between frozen country
  reference points. Rank correct count before kilometres. This is an estimated game
  distance, not a border-distance measurement or precision pin placement.
- Only 5/5 rewards stamps; capped mastery and atomic once-only rewards. Discovery
  happens as each stop is presented. Mastery/collection/discovery achievements
  count, regular encounter/perfect/miss-specific achievements do not.
- Normal pack progress remains independent. Learning resets retain daily attempts
  and rewards; unfinished daily runs expire at midnight. Completed results remain
  shareable with their original number.
- Browser sharing with copy/manual-copy fallback; canonical public Pages URL,
  no answers or debug parameters. No native Android sharing plugin, backend,
  account or leaderboard. Local device-clock/save limitations are intentional.
- Debug offers one reset for today's attempt, retaining collection progress and
  earlier days. Replays follow the real daily flow but cannot repeat that day's stamp rewards.

### Bounded daily-tour recovery

- Main schema stays at 1. Daily-tour format stays at 1 with additive
  `recoveryVersion: 1`, independent of schedule versions 1/2. Missing optional
  fields remain valid. No play-date retention limit is imposed.
- Recognized v1 blocked/quarantined envelopes are unwrapped iteratively, without
  recursive stack growth or creating more wrappers. Valid sibling runs/practice
  survive; unknown additive fields in recognized v1 data are retained.
  Saved schedule version selects the corresponding immutable schedule, even if an
  older client played after a newer schedule became effective. Display titles are
  required nonblank strings, not identity checks against today's catalogue.
  Country order, run IDs, timing, answer distances, totals, phases and reward
  consistency remain validated.
- Unknown older formats (anything below v1, with no reliable migration) and damaged
  records are disposable, not grounds for an indefinite tour lock. Only recognized
  v1 records are salvaged. No collection/stamp/card/pack/normal-challenge reset occurs.
  Existing earned achievements remain untouched by tour recovery. If only `tourDays`
  in the achievement extension is malformed, valid days and all other valid badge
  evidence/counters survive. Removed historical results that had not been reconciled
  into achievements can no longer contribute to traveller goals; no missing evidence
  is invented.
- `rewardDays` is a sorted unique ledger of completed/retired UTC days independent of
  disposable `records`; known achievement completion days also prevent repeat awards.
  Stamp awards and the day's marker are written in the same serialized repository
  transaction. Invalid dated records retire their day conservatively. If evidence
  is unreadable, `rewardBlockedThrough` conservatively suppresses stamps through
  the recovery UTC day (including clock rollback); later UTC days remain eligible.
  This may sacrifice an unclaimed current-day reward. It never removes stamps
  already earned. Valid tours/discovery/traveller achievements remain playable;
  recovery is not an anti-cheat or cross-device synchronization system.
- Read-time recovery is committed even for a no-op repository transaction, so
  reloading cannot repeatedly move the reward block to tomorrow. `recoveryNotice`
  is acknowledged through that same queue and removed persistently. Home always
  opens the daily screen: incompatible saves and refused starts receive localized
  feedback instead of a silent button. A reset notice explains its limited scope.
- Newer extension/recovery/schedule versions are not guessed at or erased. Their
  complete payload remains inside one stable compatibility envelope; only tours
  are blocked until an app update/reload can read them. Regular play remains usable.
- Demonstrated failure: the former all-or-nothing validator quarantined every
  tour after any invalid record, while Home waited for a newly created run before
  navigating. Git's original v1 schedule can validly produce Asia on 25 October
  whereas the v2 current-day lookup expects Europe: this reproduces one rejection
  path. Historical title equality was another brittle check. Repeated African
  zigzag routes on different dates are valid. Without the affected iPhone's save,
  its exact rejected field remains unconfirmed.

### Approved local release candidate

`v1.20261026` contains the approved short EN/DE tour-recovery notes in
`src/data/releases.ts`, retaining the original `2026-10-25` entry.
Android's independent upload counter is 2. Preparation does not authorize
commit, push/deployment, Android asset sync or signing a new bundle.

## Country knowledge stages

- Silver Visitor unlocks capital, approximate population and area in Collection
  only, without a notes opener in the challenge result. Zero-stamp discovery does
  not unlock these notes. The Visitor card reuses the revealed front layout with a
  centered flag instead of a silhouette, an unlock hint instead of the fact, and
  only the Visitor stamp earned. Explorer backs omit mastery stamps and labels.
- Gold Explorer adds a reversible Field notes view in the reveal and Collection,
  with languages, currencies and any curated detail/fun facts.
  The illustrated front and reveal animation remain; notes scroll rather
  than shrink text on short phones. Both faces retain the same fixed card proportions and
  decorative frame, with internal scrolling. Tap the card (or Enter/Space) to
  turn it; a subtle hint replaces a separate Field notes button.
- Coverage includes all 190 catalog entries, including archival cards. Access derives
  from current stamps, so learning resets relock it without altering save schema.
- REST Countries details are explicitly collected offline for authoring, with source
  and retrieval metadata. No runtime network request. Intl/CLDR labels plus explicit
  uncommon-language translations support EN/DE. Source languages are not an
  exhaustive inventory of all spoken languages. Show at most two selected source
  languages without claiming speaker share or ranking. Country-specific percentages
  need separate sourcing. Front facts are not duplicated on the back: editable
  front/detail/fun stories are authored in `scripts/content/country-stories.json`
  and bundled offline through `src/data/countryStories.ts`; missing front facts
  retain locale fallbacks. Enforce per-language limits of 120/200/170 characters
  for front/detail/fun respectively. Story objects contain only `en` and `de`,
  with no per-story source URLs. Keep the JSON as the single editable content
  file, not a one-time input or generated output. Accept user-supplied batches
  without a mandatory web-verification pass; refine wording and translations,
  preserve other entries, and leave corrections easy to make country by country.
  Prefer playful, memorable details; omit missing stories rather than invent filler.
  These are bundled content changes, not saved progress changes: no save version
  bump or migration is required. Unrelated geographic data and license credits remain.
  Both story types are independently optional;
  missing stories leave empty space without fallback fields or headings. All backs
  share the same layout. Long stories expand inline without turning.
- Card headers display uppercase ISO codes, not catalog numbers. Data numbering
  remains intact. Rarity badges and decorative frames remain, but colored ribbons
  are removed. Explorer backs omit front-side capital/population/area and visible
  stage headings.

## Cooldown and packs
- **Cooldown: 15 minutes per pack** (debug mode via `?debug`: 10 seconds).
  - Field testing showed geography challenges were harder than expected: reduce both the former
    30-minute interval and three-success requirement to make repeat learning more approachable.
  - The curated 168-country roster needs 336 perfect encounters at two successes each.
    Mistakes, check-in frequency and the stock cap affect completion.
  - The original four-week worldwide goal remains an unvalidated long-term aim, not a guarantee from
    these settings. Reassess with play data rather than retaining the obsolete completion calculation.
- **Packs stack up to 10.** The cooldown starts when a pack is opened.
  - One pack regenerates every 15 minutes while fewer than 10 are stored.
  - The timer pauses at 10 and restarts when a pack is opened from a full stack.
  - Pack count is computed from saved timestamps on load, so it accrues while the app is closed.
  - Stored as `{ packs, refillAt }`; `refillAt` is null when full (same pattern as the reference project's `packRefill.ts`).
  - New players start with a full stack of 10. Existing five-pack saves resume refilling.
  - An empty stack fills in 150 minutes. Existing future deadlines are capped at 15 minutes remaining;
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
- **Debug targeting:** the optional two-letter code beside "add a pack" queues one playable country
  for the next debug pack. Codes are case-insensitive; invalid/excluded entries show an error.
  Stock still caps at ten; a target can be set at full stock, survives reloads and waits for active
  challenges. A new code replaces the target; an empty field only adds stock. Debug draws can repeat
  recent or collected countries without resetting stamps or replaying card unlocks. Normal mode
  ignores the target and keeps ordinary draw rules. Completed debug encounters still count as new activity.
- **Existing saves:** retain the v1 storage key/schema, raw stamp counts, encounters, discovery and unlock
  dates. One stamp stays one; legacy two/three-stamp countries count as collected and display 2/2.
  No invented historical unlock dates or automatic unlock replay on load. Already-active challenges
  still resume without reducing historical counts or awarding duplicate unlocks.

## Content
- Six continents, no Antarctica. Each retained country has one accepted game continent, including
  transcontinental countries (see Maps).
- Starter 20: France, Italy, Norway, Switzerland; Japan, India, Vietnam, Nepal; Egypt, Kenya, Morocco, Madagascar;
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
- **Save transition under the existing Web Lock:** retire an active excluded-country challenge,
  preserve it verbatim as `retiredChallenge`, and leave country and achievement history untouched.
  Unfinished continent/country steps refund one pack after timestamp reconciliation, capped at ten;
  a full stock has no refill deadline. A completed result receives no refund and no replayed awards.
  Clearing the active challenge makes retirement idempotent. Excluded queued debug targets are cleared.
  A persisted localized notice explains both changes until explicitly dismissed, across reloads/tabs.
  Migration runs before initial rendering and every mutation, including external-tab refresh.
  Previously discovered/mastered excluded cards appear in a clearly separated Collection archive,
  never in playable totals or draws. Unfinished archive cards cannot gain more stamps.
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

## Rarity and discovery

- **Five fixed grades:** Common, Uncommon, Rare, Epic, Legendary. Rarity is a game mechanic, not a
  country's worth, importance or a political recognition statement.
- **Familiarity proxy:** the count of active Wikipedia language editions with an article linked from the
  country's Wikidata item. Wikidata ISO claims verify article identity; Wikimedia's site matrix excludes
  non-Wikipedia projects and closed sites. This is editorial/online coverage, not a survey of recognition.
  Page views were considered, but API rate limiting led to using coverage with the user's approval.
- **Frozen baseline:** 193 UN member countries, independent of the curated playable roster.
  Guinea-Bissau's erroneous membership flag in the upstream dataset is explicitly corrected.
  This reference set is for scoring only, not the final game roster. Palestine uses a separately
  verified Q219060/PS Wikipedia sitelink measurement counted against the same frozen edition list.
- **Formula:** midrank percentile `(number lower + (number equal - 1) / 2) / (193 - 1)` for both
  coverage and country area. Rarity score is `0.8 * (1 - coverage percentile) + 0.2 * (1 - area percentile)`.
  Areas are source country areas, not a uniform measurement of land-only area.
  Score bands `[0,.2)`, `[.2,.4)`, `[.4,.6)`, `[.6,.8)`, `[.8,1]` yield the five grades.
  Supplemental values not present in the reference use `number lower / 193`; exact reference values
  retain the original midrank. Scores remain bounded without changing the original 40 assignments.
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
  contributes at least its largest polygon, keeping Cape Verde, Mauritius, Seychelles, Kiribati,
  Samoa and Tonga reachable. The Pacific-centered Oceania frame crosses the antimeridian. Large
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

## Technical
- Reference project for structure and tooling: webplatformz/-boring-game-name-.
- Everything is local (localStorage); no backend or accounts.
- Animation: CSS transitions/keyframes, respecting `prefers-reduced-motion`.
- **No sound or video.** Feedback uses text, static artwork and optional reduced-motion-aware CSS only.
- Fonts: Fraunces (headings), Inter (body), via `@fontsource`.
- Navigation: screen state plus URL hash, no router library; Vite `base: '/TerraDeck/'` for builds.
- Manual testing in Chrome mobile emulation; no real-device testing required.
- No operating-system notifications or offline mode; show a countdown instead.
  Achievement feedback is an in-app banner, never a browser permission request.
- Corrupted saved data is backed up and reset.
- Multiple tabs stay in sync via the browser `storage` event.
- Map accessibility: keyboard navigation now; a list-based alternative later.
- Local Node is 18.19, so the project uses Vite 5 and Playwright 1.48 (newer Playwright needs Node 20). CI can use Node 20.
- Full-screen overlays (card modal, unlock) render through a portal to `document.body`, because screen enter animations use transforms that would otherwise trap `position: fixed`.
- Progress is saved in the browser's localStorage under `terradeck:save:v1` (per site origin), so it survives reloads; clearing site data erases it. `?demo` uses a separate key seeded with a partly filled atlas (`src/game/prototypeState.ts`).

## Achievements

- **27 cosmetic badges**: five each in First footsteps, Atlas builder, Finding your
  bearings and Expedition oddities, plus seven in World traveller. The separate **Achievements / Erfolge** screen uses
  `#achievements`. Badges do not alter packs, cooldowns, randomness, rarity or mastery.
  No streaks or consecutive-day requirements; no goal family has more than three tiers.
- **Tour evidence:** first completed official result per UTC day is retained independently
  of resettable daily runs. Backfill valid existing completions; never count practice or
  repeat debug attempts as additional days. Later rotations can perfect missing routes.
  Goals: first tour, ten days, first perfect, five perfect days, a miss within 500 km,
  all catalogue routes completed, and all catalogue routes perfected. Tour and atlas completion
  use special gold Explorer-stamp badges and celebratory notifications.
- **Stable IDs and pure rules:** `src/domain/achievements.ts` owns tracking, progress and evaluation;
  the UI and repository do not define eligibility. Evaluate actual pack-opening and completed-encounter
  transitions, not renders or timers. An unfinished encounter earns no encounter credit.
  Reloading or answering an already-finished challenge cannot count again.
- **Fresh tracking, not retroactive awards.** The optional `achievements` extension has its own
  `version: 1` inside the unchanged v1 save/key. Loading an old save initializes empty tracking without
  modifying country progress, raw stamps, dates, packs or active challenges. Previously known countries
  do not count as new discoveries. A first Visitor earned now and a newly unlocked card count even if
  the country was discovered or partly mastered earlier. A resumed unfinished encounter counts when
  completed; a saved result does not replay. Historical mistakes, dates and successes are never guessed.
- **Completion exception:** continent and atlas completion consult the whole saved collection, including
  legacy cards, but evaluation requires a genuinely new card unlock. All other collection/group goals
  count only cards unlocked since tracking began. Existing atlas-complete players must wait for roster
  additions to earn new-activity collection badges; no backfill or replay mode is introduced.
- **Permanent within the save:** award IDs, actual earned timestamps and the target at the time of
  earning are persisted once. A roster expansion never revokes an award, changes its date or makes its
  progress bar incomplete. Locked completion goals derive targets from the playable roster.
  Collection's **Learn again** reset preserves the entire achievement extension, including unfinished
  tracking, earned dates, acknowledgement flags and frozen targets. Only the debug-only full-save reset
  or clearing site storage removes badges.
- **Learning resets:** confirmed all-country or selected-continent actions clear affected progress,
  including archives, recent IDs and retired-challenge discovery evidence. Other continents remain
  untouched; all-country reset also clears unknown legacy progress. Draws still use the whole playable
  roster. Counters continue with repeated activity, but discovery/collection tracking IDs stay unique.
  Optional `completionCollected` IDs preserve actually mastered cards for locked continent/atlas badge
  progress only; they do not reveal cards or count toward the reset Collection. No dates or awards are
  invented. Completion awards still require a genuinely new card unlock.
  Under the existing save transaction, reconcile elapsed packs and cancel affected active challenges;
  refund one pack only for unfinished challenges (cap ten), preserving a non-full refill deadline.
  Repeated resets cannot refund twice. Tabs showing a cancelled encounter return Home.
- **Progress:** all visible goals have a native accessible progress bar and exact current/target counter.
  Before completion, the continent goal shows the continent nearest completion by proportion.
  Earned goals show their frozen completed target. The two hidden goals show hints without
  revealing names, requirements or counters until earned.
- **Thresholds and conditions:**

  | Category | Stable IDs | Requirements |
  | --- | --- | --- |
  | First footsteps | `first-encounter`, `first-visitor`, `first-card`, `discover-10`, `encounters-25` | First finished encounter (mistakes count), first newly earned Visitor, first new card, 10 new discoveries, 25 finished encounters |
  | Atlas builder | `collect-10`, `collect-50`, `all-continents`, `complete-continent`, `complete-atlas` | 10/50 new cards, a new card from all six continents, one complete continent, complete playable atlas |
  | Finding your bearings | `perfect-5`, `stamp-continents`, `discover-50`, `recovery`, `small-5` | Five perfect encounters total, new stamp on each continent, 50 new discoveries, perfect encounter after a newly recorded miss of that country, three new small-country cards |
  | Expedition oddities | `wrong-continent`, `scenic-route`, `islands-5`, `landlocked-5`, `legendary` | First wrong-continent answer, new card after at least three newly recorded misses of that country, five new island/landlocked cards, first new Legendary card |

- **Reviewed geographic groups:** `src/data/achievementGroups.ts` contains explicit playable-country IDs,
  independent of runtime map geometry. The source is the frozen REST Countries metadata in
  `scripts/atlas/snapshot.json`, with editorial island review. Tests enforce unique, playable IDs
  and exact small/landlocked membership against that snapshot.
  - Small: total source area **at most 10,000 km²**, not visual map footprint; deferred countries stay excluded.
    The remaining group has **seven**, not five: Brunei, Cape Verde, Cyprus, Luxembourg, Palestine,
    Samoa and Trinidad and Tobago. The badge now requires **three**, retaining stable ID `small-5`.
    Previously earned awards keep their original target (including five), date and acknowledgement.
    All historical activity arrays/counters stay intact; locked collection/group progress filters to
    eligible playable countries. Completion targets use the new roster, without awarding on migration.
  - Landlocked: no open-ocean coastline. Caspian-bordering Azerbaijan, Kazakhstan and Turkmenistan count.
    Kosovo and Vatican City are outside the playable roster.
  - Island: countries whose principal territory is on islands, including shared-island countries
    (Ireland/UK, Haiti/Dominican Republic, Brunei/Indonesia, Papua New Guinea, Timor-Leste).
    Japan, New Zealand and Madagascar count; continental Australia and mainland countries with
    offshore islands do not. Overseas possessions do not change group membership.
- **Quiet, grouped feedback:** no banner during an active challenge, answer reveal or card celebration.
  After the encounter is dismissed, one compact banner groups all pending awards. Tapping opens an
  optional native modal with earned badge details; viewing or closing the banner acknowledges exactly
  that batch. Pending awards survive reloads; acknowledged awards never celebrate again.
  The first-visit notice takes priority too.
- **Cross-tab persistence:** game mutations read the latest save and commit under an origin-scoped
  Web Lock, with a per-instance queue. This replaces render-effect writeback, prevents duplicate
  encounters, and keeps acknowledgements from being overwritten by stale tab state. Notifications
  hold a separate Web Lock for their visible lifetime and are eligible only in the focused, visible tab.
  Storage events refresh other tabs. Modern secure-origin browsers (including GitHub Pages and localhost)
  support Web Locks; otherwise a visible single-tab-only warning is shown, with serialized local updates
  but no claim of concurrent-tab safety. Storage failures retain in-memory session state and log warnings;
  malformed achievement extensions are reported without resetting valid country progress.

## Help, project notice and credits

- **One Help & FAQ page**, grouped into gameplay, included places and project information.
  Fourteen entries give each topic one home: play/mastery and roster/deferrals are combined,
  data limitations live under accuracy, inspiration under Project, storage details under Privacy,
  and Sources is an attribution list. The first-visit notice stays self-contained.
  Native `details`/`summary` support independent expanded entries and keyboard interaction.
  The first gameplay answer starts open; other answers stay closed until opened or linked.
  Footer links reach the project, privacy, sources and Impressum sections, including from expeditions.
- **Deep links:** `#about/<section>` opens, focuses and scrolls to the relevant entry; existing
  `#about` works; old `stamps` and `deferred` links resolve to `play` and `roster`.
  Hash/history navigation is separate from game state and does not answer,
  consume or dismiss an active encounter. Resume remains available on the help page.
- **First-visit notice:** short EN/DE text describes the independent, non-commercial learning
  project, source limitations, neutral selection and playful rarity. A native modal dialog/portal
  makes the background inert, manages focus, cycles through all interactive controls and scrolls
  on short screens. Language and legal-information links are accessible within it.
- Only the explicit acknowledgement action saves the current notice version under
  `terradeck:project-notice`, independently of progress and language. Escape dismisses for the
  current app session without storing acknowledgement. Information pages are readable before
  acknowledgement; returning to gameplay restores a pending notice. Only substantive version
  changes re-show it for previously acknowledged browsers. This is not cookie consent,
  a contract or a waiver of statutory rights.
- Blocked storage must not prevent loading the game/help or trap players in a popup. The notice
  store reports session-only acknowledgement visibly; progress-storage failures are logged and
  allow in-memory play, without claiming a durable save.
- **Corrections:** public GitHub Issues, with a clear public/account-required warning and no
  automatic uploads. The user chose this instead of publishing an email/address. A report should
  identify the entry/problem and ideally a reliable source; no promised response deadline.
- **Impressum:** retain the approved creator name and public issue link only.
  At the user's request, omit visible missing-information warnings; this does not
  establish legal completeness. Do not publish a personal email or address without permission.
  Direct private contact and address publication are deferred; applicable operator/contact
  requirements remain unresolved, not represented as legally cleared for release.
- The idea arose at a camp, inspired by **Bundeshaus Pack**. Credit its developers collectively
  and link to the app; do not invent individual contributors, the camp's identity or endorsement.
- **Privacy:** distinguish browser-local progress/language/notice/demo/backups from GitHub Pages
  hosting request data. No application analytics, advertising tracking, accounts or cloud saves
  are currently integrated. External sources, inspiration and public GitHub reports have their own
  handling. Do not import the reference app's unrelated profiling, accounts or analytics claims.
  Explain international hosting processing, local retention and GitHub's own retention
  responsibility, and applicable rights. Do not invent hosting log-retention periods
  or treat public GitHub Issues as a private data-rights contact.
- **Sources:** link Natural Earth public-domain data, world-atlas ISC packaging, flag-icons MIT,
  REST Countries, Wikidata CC0 and Fraunces/Inter SIL OFL fonts. There are no portraits requiring
  a photo-credit inventory. Current source/license links are in `src/data/project.ts`; EN/DE
  descriptive copy is in the locale files.
- **Bundled notices:** generate complete installed production-dependency licence/copyright
  texts and font OFL notices with `scripts/prepare-notices.mjs`, including supporting
  tools/platform packages conservatively. Ship a local notice file and corresponding
  REST Countries-derived editable sources archive, linked with Vite's base URL.
  REST Countries is MPL-2.0; preserve its upstream licence and source availability
  for derived material without relicensing independent app code. Regenerate offline
  before dev/web/Android web builds; no new runtime dependency or network request.
- **Provenance limits:** structured collectors use REST Countries fields and Wikidata
  sitelinks, not Wikipedia article prose. Country-story drafts are separately edited,
  but have not received exhaustive source-by-source wording/rights clearance.
  Removing source URLs or translating does not remove upstream obligations.

## Languages (i18n)

- `i18next` + `react-i18next`, one JSON file per language in `src/i18n/locales/` (`en.json`, `de.json`). Keys are typed from `en.json`; `de.json` must match it or the build fails.
- English is the default. The language is stored under `terradeck:lang` only after the player picks one
  on Home, Help or the first-visit notice; it is separate from the game save. `<html lang>` follows
  the active language.
- Country names, capitals, facts and continent names live in the locale files, not in `src/data`. Numbers are formatted per language via `src/i18n/useContent.ts`.
- German uses standard spelling (ß). Prompts avoid starting with a country name because some names need an article.
- To add a language: add `locales/<code>.json`, register it in `LANGUAGES` in `src/i18n/index.ts`.
