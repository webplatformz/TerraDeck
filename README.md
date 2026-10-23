# TerraDeck

A mobile-first country-learning collection game. Find each country on an unlabelled world map,
earn the silver Visitor and gold Explorer stamps to unlock its collectible card.

Built with React, TypeScript and Vite; deployed to GitHub Pages. Progress is saved in the browser.

- [Plan](docs/PLAN.md) — architecture, map approach and milestones
- [Decisions](docs/DECISIONS.md) — game rules and technical choices with their reasoning

## Local development

Requires Node 24 LTS. The `.nvmrc` file selects the same major version locally and in
GitHub Actions. With nvm installed, run `nvm install` once, then `nvm use` in each
new terminal. In JetBrains, select the installed Node 24 interpreter for this project.
The toolchain uses Vite 8 with React plugin 6, ESLint 10 and Playwright 1.64;
the app remains on React 18 and TypeScript 5.9.
Production SVG flags are emitted as separate hashed assets rather than embedded in the
main JavaScript bundle, so only displayed flags need to be downloaded.

```sh
npm ci               # install the locked dependencies
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

### Optional Android trial

The Android wrapper is for local device testing only. It bundles the normal game
with a separate device-local save; it does not load GitHub Pages or a Mac dev server.
No accounts, cloud sync, browser-save transfer or Play Store setup are included.
The ordinary `npm run build` and Pages deployment still use `dist/` and `/TerraDeck/`.

Install Android Studio and SDK Platform 36, Build Tools and Platform Tools through
its setup wizard/SDK Manager. Use Android Studio's bundled Gradle JDK rather than
changing the Mac's global Java configuration. Enable USB debugging on the phone
and authorize the Mac when prompted.

```sh
nvm use
npm run android:sync # builds root-based dist-android/ and copies assets/plugins
npm run android:open # open the generated android/ project in Android Studio
```

Let Gradle sync finish, select the connected phone, then Run. To obtain an APK,
use Android Studio's Build APK(s) action for the debug variant. The output is
`android/app/build/outputs/apk/debug/app-debug.apk`. No release key is needed.
Repeat `android:sync` after web changes before rebuilding/running Android.

Keep the app ID (`com.webplatformz.terradeck`) and debug signing key stable for
in-place updates. Uninstalling/clearing app data can erase the Android collection;
the website collection is unaffected. Native assets/build products and SDK-local
paths are ignored by Git. Capacitor dependencies and the generated Android source
are the optional wrapper, not a change to the game's rules.

First-device acceptance is still required: cold start in airplane mode, fonts/flags
and maps, touch/magnifier/8x zoom, EN/DE, status/navigation bar clearance,
background/resume, saved encounters after force-stop, and in-place updates.
Use the existing in-app navigation for this initial trial; Android system Back
is not yet adapted to expedition/overlay state. Check external-link return too.

The Capacitor 8.5.3 CLI currently brings an npm advisory chain through its
iOS-only `xcode`/`uuid` tooling. It is a development dependency, not bundled game
code or an Android runtime dependency; reassess before expanding beyond the trial.

In debug mode, the field before **add a pack** accepts a playable two-letter country code
(for example `CH`, case-insensitive). It adds stock up to the usual five-pack cap and targets the
next pack, even if that country is collected or was recently drawn. The target survives reloads,
waits for any active challenge to finish, and is consumed once. Setting another code replaces it.
An empty field only adds stock; an invalid or excluded code shows an error without changing the save.
Normal mode ignores debug targets. Test encounters use the normal mastery and achievement rules.

### Languages

English (default) and German. Texts live in `src/i18n/locales/*.json`; to add a language, add a JSON file and register it in `src/i18n/index.ts`. The choice is stored under `terradeck:lang`.

### Country introductions and field notes

The first (Silver Visitor) stamp opens a compact introduction: capital, approximate
population and area. Read it from the country's Collection slot, not the challenge
result. Merely discovering a country without a stamp does not reveal it.
The second (Gold Explorer) stamp unlocks a tappable, keyboard-accessible card,
available during the reveal and later in Collection. Notes add languages and
currencies. Capital, population and area stay on the front only.
Sourced EN/DE front facts, back details and fun facts are authored in
`scripts/content/country-stories.json` and bundled through `src/data/countryStories.ts`.
This batch supplies 168 front facts, 23 details and 19 fun facts. Front facts missing
from the batch (including archival cards) retain their existing locale text.
All backs share the same layout; detail and fun facts are
independently optional. Missing facts leave empty space, with no fallback text or headings.
Long back stories have See more/See less controls that do not turn the card.
Both faces keep the same card dimensions, paper and decorative frame; a small
“Tap to turn” hint replaces a separate flip button. Long notes scroll inside the
card. Silver introductions reuse the revealed front layout, with a centered flag
instead of the country silhouette, the unlock hint instead of the fact, and only
the Visitor stamp earned. Explorer backs omit the bottom mastery stamps and labels.
Archived countries use the same mastery gates. Learning resets remove access again;
there are no new save fields, stamps, awards or gameplay rules.

Language/currency data are bundled in `src/data/generated/country-details.json`,
with source/retrieval metadata. `npm run details:collect` refreshes all 190 catalog
entries from REST Countries; this is an explicit online authoring step, never an
app request. Display labels use Intl/CLDR plus explicit uncommon-language labels.
At most two selected languages are shown, not a ranking or exhaustive list;
speaker percentages are omitted until reliable country-specific data are sourced.
Card headers show uppercase ISO codes instead of catalog numbers, with rarity
badges retained but no full-width colored ribbon. Catalog numbers remain unchanged
in the data for compatibility.

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

The curated atlas contains **168 playable countries / 336 mastery stamps**, selected from the
193 UN members plus the two observer states. **27 countries** are excluded because the current
map data or natural touch targets are insufficient. The original five are Tuvalu, Vatican City,
Monaco, Maldives and Nauru; the 22 further exclusions are San Marino, Liechtenstein, Malta,
Andorra, Singapore, Bahrain, Saint Kitts and Nevis, Grenada, Saint Vincent and the Grenadines,
Barbados, Antigua and Barbuda, Saint Lucia, Dominica, Seychelles, São Tomé and Príncipe, Comoros,
Mauritius, Marshall Islands, Palau, Micronesia, Tonga and Kiribati. The FAQ links every excluded
country to its verified English/German Wikipedia article. There are no
artificial location markers. Other countries and territories are gray, untappable context, not
distractors; this collection policy makes no statement about their political status.

The published **190-card catalog** remains intact for archival compatibility: original numbers,
rarity assignments and saved progress never change. Only 168 entries are playable; numbering gaps
are intentional. Previously discovered excluded countries appear in a separate Collection archive,
with their stamps and collected cards preserved but no contribution to completion totals.
An unfinished challenge for an excluded country is retired with one pack refunded up to the cap of five;
completed results are preserved without a refund or replay. A persisted explanation survives reloads
until dismissed. Queued debug targets for excluded countries are cleared with an explanation.
Transcontinental countries use one accepted game continent, explained
in How to play. Rarity is fixed in
`src/data/generated/rarity.json`: Common, Uncommon, Rare, Epic and Legendary.
Opening a pack reveals its country's name and rarity immediately; full cards need two successful
encounters: Visitor, then Explorer.

The generator uses a frozen 193-country reference snapshot: 80% Wikipedia language-edition
coverage (a rough familiarity proxy), 20% country area. Switzerland has an explicit Legendary
override. These are game grades, not a ranking of countries' worth or an objective recognition survey.

- `scripts/rarity/snapshot.json`: sourced measurements, Wikidata article IDs, edition lists and reference set.
- `scripts/rarity/scoring.mjs`: formula, grade thresholds and overrides.
- `scripts/atlas/roster.json`: canonical map features and continent assignments for the 168 playable cards.
- `src/data/generated/playable-country-ids.json`: runtime playable subset of the shared catalog.
- `scripts/atlas/initial-roster.json`: the immutable original 40 card numbers.
- `scripts/atlas/policy.mjs`: all 27 deferrals and noncanonical map aliases.
- `scripts/atlas/snapshot.json`: frozen REST Countries metadata, English/German names, capitals and
  source provenance, plus verified Wikidata coverage for Palestine (outside the 193-member baseline).
- `scripts/rarity/roster.json`: the unchanged 190-card catalog in stable card-number order, including archives.
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
Roster-update checks cover the exact 168/27 partition, frozen card numbering/rarity, archival progress,
idempotent challenge refunds and debug-target removal. The small-country badge now requires three
new eligible cards; its stable `small-5` ID and previously earned five-card targets remain intact.
Lint and the production build remain separate commands.

`npm run test:e2e` uses an existing Google Chrome installation; no browser or operating-system
dependency installation step is run. Chrome must be available locally and on the CI runner;
a missing installation fails explicitly. Playwright remains the single browser-test dependency.
The suite starts its own Vite server on port 5178 and uses two viewport/language projects:
desktop at 1280x800 in English, and iPhone 16-sized touch emulation at 393x852 in German.
Phone emulation uses Chrome, not an actual iPhone or Safari. Both runs check pack opening,
first-entry map/SVG dimensions **without resizing**, continent/country answers, saved-challenge
reload/resume and the result. Gameplay, wrong-answer feedback, collection resets and cross-tab
refunds are independent tests with fresh browser storage and separate 30-second budgets, rather
than one growing end-to-end chain. Failed runs retain traces in the ignored `test-results/` directory.
Confirmed wrong-country answers show the selected and target countries with flags and subtle
red/green panels. Successful results and revealed wrong-continent answers use the same
country-and-flag styling. Names are not revealed while choosing; existing map feedback is unchanged.
Continent map taps and buttons share an 800 ms correction window: the pending choice
highlights immediately, and another selection restarts the window before the answer counts.

Collection's **Learn again** controls reset all countries or the selected continent after confirmation.
Affected discovery/stamps/cards (including archives) are cleared; earned achievements, original dates
and unfinished achievement tracking remain intact. Repeated encounters count as new activity, while
historical discovery/collection ID lists remain unique. Pack stock and refill deadlines are preserved
apart from normal elapsed refills and a one-pack refund for an affected unfinished encounter (cap five).
Affected completed results are cancelled without refund; other encounters stay intact. Resetting does
not restrict draws to a continent. The debug-only full-save reset still clears everything, including badges.
Unit and browser tests also run before GitHub Pages deployment. Challenge maps have a minimum
height with scrolling on short screens, rather than shrinking to an unusable strip.
