# TerraDeck — Decision index

This is the entry point for accepted decisions, not a task log or release approval.
Read [PLAN.md](PLAN.md) for the product/architecture overview and
[contributor instructions](../.github/copilot-instructions.md) for mandatory working
rules. Follow the links below for the relevant decisions before implementation;
there is no need to load every topic for every task.

## Where to look

| Task | Read |
| --- | --- |
| Packs, mastery, draw rules, country cards, achievement eligibility | [Gameplay](decisions/gameplay.md) |
| Storage, validation, migration, recovery, resets, concurrent tabs | [Saved data](decisions/saved-data.md), plus the affected mode |
| Daily Tour or Continent Training | [Game modes](decisions/game-modes.md) and [saved data](decisions/saved-data.md) |
| Maps, touch selection, roster, geography, country content | [Maps and content](decisions/maps-and-content.md); also [saved data](decisions/saved-data.md#roster-transition) for roster changes |
| UI, achievement feedback, accessibility, localization, help, legal notices | [Presentation](decisions/presentation.md); also [gameplay](decisions/gameplay.md#achievements) when eligibility changes |
| App release | [Contributor release rules](../.github/copilot-instructions.md#release-approval), [release presentation](decisions/presentation.md#release-presentation) and `src/data/releases.ts` |
| Android build, signing or store preparation | [Android release guide](ANDROID-RELEASE.md), plus contributor release rules |
| Tooling, commands, automated checks | `package.json`, `.nvmrc`, `playwright.config.ts`, `.github/workflows/` and [PLAN.md](PLAN.md#development-and-validation) |

## Cross-cutting constraints

- Keep country learning separate from cosmetic rarity and achievements.
- Preserve compatible progress and stable published IDs. Main saves, training and
  daily-tour extensions have different recovery behavior; do not generalize one
  store's policy to all data. The main loader's newer-version limitation is
  explicit in [saved data](decisions/saved-data.md#main-save-loading).
- Keep EN/DE content aligned, respect accessibility/reduced motion and maintain
  bundled source/licence information. Technical checks do not establish legal clearance.
- Release wording approval is scoped to that draft and never grants publication
  permission. See contributor instructions for the required approval steps.

## Maintaining decisions

- Each topic distinguishes the decision, rationale and constraints. Add meaningful
  rationale near the relevant rule; link to code/tests for detailed mechanisms.
- Keep one authoritative description of each rule. Other documents should summarize
  or link rather than repeat a full specification.
- When related documentation disagrees, verify implementation, tests and accepted
  decisions; correct directly related stale text in the same change. Ask about
  unresolved product conflicts instead of silently choosing a new rule.
- Label superseded decisions and retain compatibility-relevant history. Routine
  implementation logs, test-run results and temporary release status belong in
  handoffs or Git history, not current rules.
- Use a separate Architecture Decision Record only for a substantial choice that
  needs its own context, alternatives and consequences; link it here when needed.

## Historical scope

- The original three-tour schedule remains readable after schedule v2; details
  and compatibility constraints are in [game modes](decisions/game-modes.md#daily-world-tour).
- The former five-pack capacity and three-success mastery are superseded; existing
  progress compatibility is described in [gameplay](decisions/gameplay.md).
- Earlier release-candidate notes, including wording approval for `v1.20261026`,
  are historical only. They are not approval of any later wording, commit, push,
  deployment or Android publication. Player-facing entries remain in
  `src/data/releases.ts`; previous document wording remains in Git history.
