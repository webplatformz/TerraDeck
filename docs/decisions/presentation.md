# Presentation decisions

[Decision index](../DECISIONS.md) | [Product overview](../PLAN.md)

**Decision:** Use a bilingual, accessible collectible-atlas interface with quiet optional feedback.

**Rationale:** Keep attention on learning while making supporting information and corrections easy to find.

**Constraints:** Respect reduced motion, keep legal uncertainty explicit and never infer publication approval from technical checks.

## Release presentation

- App display versions and EN/DE player-facing history live in `src/data/releases.ts`; keep previous entries. Main-screen footers link to `#releases`; fullscreen challenges and tours remain footer-free. This is bundled UI data, not a saved-progress migration.
- Each release has a localized title and version; bullets use short bold labels (one to three words), a colon and technical/feature-focused descriptions with light humor. Launch context must not be presented as newly implemented work.
- Release review and explicit wording/publication approvals are governed by [contributor instructions](../../.github/copilot-instructions.md#release-approval). Android operational steps remain in [ANDROID-RELEASE.md](../ANDROID-RELEASE.md).

## Rarity presentation

- **Presentation:** orders, discovered backs, collection grid/focus, and collected/unlock cards share a
  top-right localized rarity badge and compact colored header banner with a thin gradient top edge,
  inset within the decorative frame so the border remains visible on every side. The game-style palette
  is Common silver/gray, Uncommon green, Rare blue, Epic purple and Legendary gold; text and 1–5 pips
  supplement color. Epic has static foil; Legendary has metallic gold and a gentle intermittent sheen
  only on large cards and the Find panel. Thumbnails stay static, and reduced motion disables the sheen.
  Undiscovered cards expose no rarity styling or labels. Flags still need one stamp on
  backs, and full cards need two. Mastery silver/gold is independent of country rarity.

## Achievement presentation

- **Progress:** all visible goals have a native accessible progress bar and exact current/target counter.
  Before completion, the continent goal shows the continent nearest completion by proportion.
  Earned goals show their frozen completed target. The two hidden goals show hints without
  revealing names, requirements or counters until earned.
- **Quiet, grouped feedback:** no banner during an active challenge, answer reveal or card celebration.
  After the encounter is dismissed, one compact banner groups all pending awards. Tapping opens an
  optional native modal with earned badge details; viewing or closing the banner acknowledges exactly
  that batch. Pending awards survive reloads; acknowledged awards never celebrate again.
  The first-visit notice takes priority too.

Eligibility, thresholds and stable IDs live in [gameplay](gameplay.md#achievements); acknowledgement serialization lives in [saved-data](saved-data.md#cross-tab-persistence).

## Shared UI constraints

- Use CSS transitions/keyframes and respect `prefers-reduced-motion`. No sound, video or operating-system notifications; achievement feedback is in-app and never requests browser permission.
- Fullscreen card/unlock overlays render through a portal to `document.body`, because screen-entry transforms would otherwise trap `position: fixed`.
- Map keyboard navigation is part of accessibility; a list-based alternative remains deferred.

## Help, project notice and credits

- **One Help & FAQ page**, grouped into gameplay, included places and project information.
  Each topic has one home: play/mastery and roster/deferrals are combined,
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
- Country names, capitals, fallback facts and continent labels live in the locale
  files; authored bilingual stories are bundled separately as described in
  [content authoring](maps-and-content.md#country-stories-and-details).
  Numbers are formatted per language via `src/i18n/useContent.ts`.
- German uses standard spelling (ß). Prompts avoid starting with a country name because some names need an article.
- To add a language: add `locales/<code>.json`, register it in `LANGUAGES` in `src/i18n/index.ts`.

## Home and sharing

- Atlas Progress and Training share progress-count styling, including spaces around
  `/`. An active Training tile names its continent and shows only that continent's
  progress; an inactive tile shows an invitation instead of an empty progress bar.
- On small screens Progress and Training each occupy a row; on wider screens they
  share the first tile row, followed by Achievements and FAQ. Training is no longer
  labelled Beta; older Beta release entries remain historical.
- Help includes a small QR code with the TerraDeck logo for the canonical public URL
  from `src/data/project.ts`, with "Like it? Share it!" in both languages.

## Implementation references

- UI/content: [`Home.tsx`](../../src/screens/Home.tsx),
  [`About.tsx`](../../src/screens/About.tsx),
  [`project.ts`](../../src/data/project.ts),
  [`releases.ts`](../../src/data/releases.ts) and
  [`i18n`](../../src/i18n/).
- Coverage: [`help.test.mjs`](../../tests/help.test.mjs),
  [`notices.test.mjs`](../../tests/notices.test.mjs),
  [`home-layout.spec.ts`](../../tests/e2e/home-layout.spec.ts) and
  [`share-qr.spec.ts`](../../tests/e2e/share-qr.spec.ts).
