# TerraDeck — Plan

Mobile-first country-learning collection game built with React, TypeScript and
Vite. The web app deploys to GitHub Pages; a Capacitor Android wrapper has a
separate [release guide](ANDROID-RELEASE.md).

This is the current product/architecture overview, not a detailed rules catalogue
or task-status log. Read the relevant topics through the
[decision index](DECISIONS.md) before implementation.

Structure and tooling were inspired by
[webplatformz/-boring-game-name-](https://github.com/webplatformz/-boring-game-name-)
(pack opening, timestamp-based refill, hash navigation and Pages deployment).
TerraDeck's goal is learning geography rather than collecting by rarity.

## Core loop

1. Open a regenerating pack to reveal a country.
2. Select its continent, then its location on an unlabelled map; explicitly confirm
   each answer.
3. Both answers correct on the first attempt earn one mastery stamp. A mistake
   reveals the answer without removing existing stamps.
4. Silver Visitor and gold Explorer are the two mastery stages; Explorer unlocks
   the collectible card and removes that country from normal draws.
5. Progress and unfinished challenges resume after reload.

Current pacing is a 15-minute refill with capacity 10, defined in
`src/domain/config.ts`. See [gameplay decisions](decisions/gameplay.md) for timing,
draw rules, knowledge stages and compatibility with earlier pacing/mastery.

## Product surfaces

- **Home:** pack opening/resume, refill countdown, Atlas Progress, training,
  Daily Tour, achievements and help.
- **Regular challenge:** continent and country selection, feedback and card unlocks.
- **Collection:** 168 playable country slots and a separate archive for previously
  discovered excluded cards; card facts and Field notes unlock with mastery.
- **Continent Training:** one resumable continent, unlimited practice attempts,
  optional hints and explicit completion/cancel actions. Its own save never awards
  packs, stamps or achievements.
- **Daily World Tour:** one numbered five-stop tour per UTC day, shared ordered
  targets, distance-based results and once-only perfect-tour stamp rewards.
- **Achievements:** 27 cosmetic badges across five categories, exact progress,
  earned dates and grouped quiet feedback.
- **Help, releases and project information:** bilingual rules, scope, limitations,
  corrections, privacy, source/licence notices and operator information.
  The first-visit notice has separate acknowledgement storage.

Detailed mode and reward rules live in [game modes](decisions/game-modes.md)
and [gameplay](decisions/gameplay.md), not in this overview.

## Architecture

| Area | Responsibility |
| --- | --- |
| `src/domain/` | Pure game rules, injected clocks/RNG, mastery, refill, draws, modes and achievements |
| `src/data/` | Bundled country content, reviewed groups, generated atlas, tour schedules and release notes |
| `src/persistence/` | Separate stores, validation, compatibility/recovery and serialized main-save transactions |
| `src/game/` | Hooks wiring rules to stores, navigation, clocks and cross-tab refresh |
| `src/map/` | Shared continent/country maps, projections, geometry-first selection and magnifiers |
| `src/screens/`, `src/components/` | Screen composition, cards, feedback and reusable controls |
| `src/i18n/` | Typed EN/DE localization and language-aware formatting |
| `scripts/` | Explicit offline data generation, source collection and bundled notices |
| `tests/` | Domain/persistence/content checks and browser flows |

Gameplay is local: no backend, accounts or cloud-save synchronization. The async
repository interface leaves room for a later implementation without making cloud
behavior a current promise. Save isolation and failure policies are documented in
[saved data](decisions/saved-data.md).

Navigation uses screen state plus URL hashes, without a router dependency.
Main/help screens, Daily Tour and Training have hash entry points; pack/challenge
phases remain game state. `src/game/navigation.ts` is the route reference.

## Map and visual direction

- Natural Earth geometry via `world-atlas`, with only canonical playable countries
  selectable; other shapes remain context.
- Equirectangular continent overview and azimuthal equal-area country maps,
  rendered in SVG with d3 zoom/pan.
- Geometry-first picking, small-country assistance and hold-to-magnify selection;
  map selection still requires confirmation. No artificial country-location markers.
- A premium collectible-atlas look: midnight-blue oceans, warm paper, Fraunces/Inter
  fonts, Visitor/Explorer stamps and card reveals. Phone first, then larger screens.
- CSS motion respects reduced-motion preferences. No sound or video.

See [maps and content](decisions/maps-and-content.md) and
[presentation](decisions/presentation.md) for accepted interaction/content policies.

## Development and validation

- Use Node 24, as specified by `.nvmrc` and `package.json`; CI reads `.nvmrc`.
  Dependencies and scripts in `package.json` are authoritative for current tooling.
- `npm test` uses Node's test runner through `tsx` for domain, persistence and
  content checks; it is not a Vitest suite.
- `npm run test:e2e` uses Playwright with desktop and iPhone-sized touch projects.
  Both currently run Chromium/Chrome: iPhone emulation is not a Safari test.
- Use the smallest relevant checks, plus lint/build when code changes require them.
  Existing commands are in `package.json`; CI is in `.github/workflows/`.
- Emulation covers automated layout and interaction checks, but does not prove
  physical-device behavior. Touch/long-press changes need relevant real-browser/device
  checks before claiming device support; Android acceptance is in its release guide.
- Vite sets the Pages base for web builds; Android has a separate build mode.
  Normal builds prepare licence/source notices without refreshing country datasets.

## Future direction

Keep independent learning modes resilient before expanding scope. A list-based
map-accessibility alternative remains deferred. Cloud saves, accounts and multiplayer
are not current commitments; new features need explicit product decisions.
