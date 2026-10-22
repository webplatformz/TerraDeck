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
npm run atlas:build  # regenerate the curated roster, content additions, flags, rarity and maps offline
```

Useful URLs while developing:

- `http://localhost:5173/?debug` — 10-second pack cooldown, plus "add a pack" and "reset progress" buttons
- `http://localhost:5173/?demo` — a separate save pre-filled with some cards and stamps (combine: `?demo&debug`)
- Test mobile layouts with Chrome DevTools device emulation (Cmd+Shift+M)

In debug mode, the field before **add a pack** accepts a playable two-letter country code
(for example `CH`, case-insensitive). It adds stock up to the usual five-pack cap and targets the
next pack, even if that country is collected or was recently drawn. The target survives reloads,
waits for any active challenge to finish, and is consumed once. Setting another code replaces it.
An empty field only adds stock; an invalid or excluded code shows an error without changing the save.
Normal mode ignores debug targets. Test encounters use the normal mastery and achievement rules.

### Languages

English (default) and German. Texts live in `src/i18n/locales/*.json`; to add a language, add a JSON file and register it in `src/i18n/index.ts`. The choice is stored under `terradeck:lang`.

### Saved progress

Progress lives in the browser's localStorage for this site (key `terradeck:save:v1`) and survives
reloads. Clearing site data resets the game.
Existing one-stamp progress stays intact; countries with two or three saved stamps count as collected.
Historical stamp counts and unlock dates are preserved, while progress displays stop at two.

Normal packs refill every **15 minutes**, up to five stored packs. Existing future refill deadlines
are capped at a 15-minute remaining wait; shorter waits and stored packs are preserved.

### Achievements

Open **Achievements / Erfolge** (`#achievements`) for 20 cosmetic explorer badges across four
categories. Visible goals have progress bars and exact counters; two playful surprises stay hidden
behind hints until earned. No consecutive-success goals, date requirements, sound or video.
Home links to achievements through an earned-count card; the atlas progress panel still opens Collection.

Tracking starts fresh when this feature first loads: old activity is not backfilled. Newly unlocked
cards count, including countries that already had a stamp. Continent/atlas completion checks the full
collection after the next new card unlock. Earned badges retain their date and completed target even
when the roster expands; resetting progress removes badges too.

One silent banner groups pending awards after encounter feedback and country-card celebrations.
View it for details or dismiss it to acknowledge the batch across tabs. Pending batches survive reloads.
Rules live in `src/domain/achievements.ts`, reviewed country groups in `src/data/achievementGroups.ts`,
and the independently versioned achievement extension stays inside the existing local save.
Web Locks serialize browser-tab mutations and notification ownership; browsers without them show
a single-tab-only warning. See [Decisions](docs/DECISIONS.md#achievements) for thresholds and conventions.

### Help and project information

**How to play & FAQ** combines expandable game instructions, the country-selection policy,
data limitations, privacy and source credits in English and German. Footer links work during
expeditions too; reading help does not consume a pack or dismiss an active challenge.
Direct links include `#about/privacy`, `#about/impressum`, `#about/sources` and `#about/project`.
The existing `#about` link still works.

A short first-visit project notice is informational, not cookie consent or a waiver.
Explicit acknowledgement is stored separately under `terradeck:project-notice`; the content
version lives in `src/persistence/noticeStore.ts`. Change it only for substantive notice updates.
Language changes and game-progress resets do not re-show an acknowledged notice. Escape dismisses
it for the current app session without recording acknowledgement. Legal/help links remain readable
before acknowledgement; returning to gameplay shows any still-pending notice.
If browser storage is unavailable, acknowledgement lasts for the app session and a hint explains it.

Project links and the approved public creator name live in `src/data/project.ts`. Error reports
use [GitHub Issues](https://github.com/webplatformz/TerraDeck/issues), which are public and generally
require a GitHub account. The camp inspiration and Bundeshaus Pack developers are credited.
The **name-only Impressum is explicitly incomplete**: no address or direct contact has been supplied.
Applicable provider-information requirements must be checked before treating the site as publication-ready;
the welcome acknowledgement does not make the legal notice complete.

### Rarity and country content

The curated atlas contains **190 playable countries / 380 mastery stamps**, selected from the
193 UN members plus the two observer states. **Tuvalu, Vatican City, Monaco, Maldives and Nauru**
are deferred because the current map data or natural touch targets are insufficient. There are no
artificial location markers. Other countries and territories are gray, untappable context, not
distractors; this collection policy makes no statement about their political status.

The original 40 card numbers, rarity assignments and saved progress remain intact; 150 additions
follow in stable ISO-code order. Transcontinental countries use one accepted game continent, explained
in How to play. Rarity is fixed in
`src/data/generated/rarity.json`: Common, Uncommon, Rare, Epic and Legendary.
Opening a pack reveals its country's name and rarity immediately; full cards need two successful
encounters: Visitor, then Explorer.

The generator uses a frozen 193-country reference snapshot: 80% Wikipedia language-edition
coverage (a rough familiarity proxy), 20% country area. Switzerland has an explicit Legendary
override. These are game grades, not a ranking of countries' worth or an objective recognition survey.

- `scripts/rarity/snapshot.json`: sourced measurements, Wikidata article IDs, edition lists and reference set.
- `scripts/rarity/scoring.mjs`: formula, grade thresholds and overrides.
- `scripts/atlas/roster.json`: canonical map features and continent assignments for all 190 cards.
- `scripts/atlas/initial-roster.json`: the immutable original 40 card numbers.
- `scripts/atlas/policy.mjs`: the five deferrals and noncanonical map aliases.
- `scripts/atlas/snapshot.json`: frozen REST Countries metadata, English/German names, capitals and
  source provenance, plus verified Wikidata coverage for Palestine (outside the 193-member baseline).
- `scripts/rarity/roster.json`: the same 190-country selection, in stable card-number order.
- `src/domain/rarity.ts`: independently tunable per-country draw weights (1.00 to 0.80).
- `scripts/geo/exclusions.mjs`: gray, untappable territories and overseas polygons, including French Guiana.

`npm run rarity:build` is deterministic and offline. To deliberately refresh the inputs, run
`npm run rarity:collect` (requires internet access to Wikidata and the public REST Countries data
repository), then regenerate and review the diff. Never run collection as part of deployment:
changing source coverage must not silently change published grades. Source/API errors stop collection
without replacing the previous snapshot.

`npm run atlas:collect` explicitly refreshes the 195-candidate metadata and supplemental Palestine
coverage, separately from the frozen rarity baseline. `npm run atlas:build` is offline and never runs
as part of deployment. Existing localized country entries are preserved; newly appended facts use
sourced landlocked status or land neighbors. Review source and output diffs before publishing.
Capital displays use a single conventional capital, with explicit roles for Pretoria (executive),
Mbabane (administrative) and Ramallah (administrative seat). The latter does not resolve Jerusalem's status.

### Tests

`npm test` uses Node's built-in test runner with `tsx` for TypeScript imports. It covers weighted
selection, discovery/save compatibility, the exact roster partition, source/catalog/content invariants,
all-country completion rules, phone-width map visibility, excluded map polygons, help hashes and
separate/versioned notice preferences (including unavailable storage).
Achievement coverage includes exact thresholds, simultaneous awards, fresh legacy tracking, reloads,
acknowledgements, cross-tab transactions, geographic groups and permanent awards after roster expansion.
Lint and the production build remain separate commands. Browser flows are currently checked manually
with Chrome mobile emulation; a repository-managed end-to-end runner is not configured yet.
