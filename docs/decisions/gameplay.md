# Gameplay decisions

[Decision index](../DECISIONS.md) | [Product overview](../PLAN.md)

**Decision:** Use a country-learning collection loop with two-stage mastery and cosmetic rewards.

**Rationale:** Repeat encounters build geographic knowledge; rarity adds variety without replacing mastery.

**Constraints:** Keep gameplay eligibility separate from UI and persistence. See [saved-data](saved-data.md) for resets and compatibility.

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
- Country-story authoring and sourcing are defined in
  [maps and content](maps-and-content.md#country-stories-and-details).
  Detail/fun stories are independently optional; missing stories leave empty space
  without fallback fields or headings. All backs share the same layout, and long
  stories expand inline without turning.
- Card headers display uppercase ISO codes, not catalog numbers. Data numbering
  remains intact. Rarity badges and decorative frames remain, but colored ribbons
  are removed. Explorer backs omit front-side capital/population/area and visible
  stage headings.

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

## Implementation references

- Rules: [`config.ts`](../../src/domain/config.ts),
  [`challenge.ts`](../../src/domain/challenge.ts),
  [`rarity.ts`](../../src/domain/rarity.ts) and
  [`achievements.ts`](../../src/domain/achievements.ts).
- Coverage: [`mastery.test.mjs`](../../tests/mastery.test.mjs),
  [`rarity.test.mjs`](../../tests/rarity.test.mjs) and
  [`achievements.test.mjs`](../../tests/achievements.test.mjs).
