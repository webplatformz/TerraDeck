# Saved-data decisions

[Decision index](../DECISIONS.md) | [Product overview](../PLAN.md)

**Decision:** Keep progress local, retain compatible saved data and isolate recovery to the affected feature.

**Rationale:** Existing progress must survive feature additions, reloads and concurrent tabs without duplicate rewards.

**Constraints:** Compatibility policy is not proof of loader support; distinguish current behavior from required future safeguards.

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
- Contributor instructions live in [`.github/copilot-instructions.md`](../../.github/copilot-instructions.md).

## Main-save loading

- `src/persistence/LocalStorageRepository.ts` stores progress under `terradeck:save:v1` per origin. Invalid main saves are backed up best-effort and removed before fallback initialization; storage failures permit logged in-memory play, not a durable-save guarantee.
- The current validator accepts only main schema 1 and does not distinguish an unsupported newer main schema from invalid data. Preserving newer main schemas is a required safeguard before introducing an incompatible version, not an implemented capability of this loader.
- Continent Training has a separate store that preserves unreadable data; see [game modes](game-modes.md#continent-training). Daily-tour recovery is scoped below, not a whole-save reset.

## Roster transition

- **Save transition under the existing Web Lock:** retire an active excluded-country challenge,
  preserve it verbatim as `retiredChallenge`, and leave country and achievement history untouched.
  Unfinished continent/country steps refund one pack after timestamp reconciliation, capped at ten;
  a full stock has no refill deadline. A completed result receives no refund and no replayed awards.
  Clearing the active challenge makes retirement idempotent. Excluded queued debug targets are cleared.
  A persisted localized notice explains both changes until explicitly dismissed, across reloads/tabs.
  Migration runs before initial rendering and every mutation, including external-tab refresh.
  Previously discovered/mastered excluded cards appear in a clearly separated Collection archive,
  never in playable totals or draws. Unfinished archive cards cannot gain more stamps.

## Learning resets

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

## Cross-tab persistence

- **Cross-tab persistence:** game mutations read the latest save and commit under an origin-scoped
  Web Lock, with a per-instance queue. This replaces render-effect writeback, prevents duplicate
  encounters, and keeps acknowledgements from being overwritten by stale tab state. Notifications
  hold a separate Web Lock for their visible lifetime and are eligible only in the focused, visible tab.
  Storage events refresh other tabs. Modern secure-origin browsers (including GitHub Pages and localhost)
  support Web Locks; otherwise a visible single-tab-only warning is shown, with serialized local updates
  but no claim of concurrent-tab safety. Storage failures retain in-memory session state and log warnings;
  malformed achievement extensions are reported without resetting valid country progress.

## Daily-tour recovery

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

### Historical rationale (superseded recovery behavior)

The following describes the old failure path, not current validation rules.

- Demonstrated failure: the former all-or-nothing validator quarantined every
  tour after any invalid record, while Home waited for a newly created run before
  navigating. Git's original v1 schedule can validly produce Asia on 25 October
  whereas the v2 current-day lookup expects Europe: this reproduces one rejection
  path. Historical title equality was another brittle check. Repeated African
  zigzag routes on different dates are valid. Without the affected iPhone's save,
  its exact rejected field remains unconfirmed.

## Implementation references

- Stores/validation: [`LocalStorageRepository.ts`](../../src/persistence/LocalStorageRepository.ts),
  [`ContinentTrainingStore.ts`](../../src/persistence/ContinentTrainingStore.ts),
  [`validate.ts`](../../src/persistence/validate.ts) and
  [`validateDailyTours.ts`](../../src/persistence/validateDailyTours.ts).
- Coverage: [`roster-update.test.mjs`](../../tests/roster-update.test.mjs),
  [`reset-collection.test.mjs`](../../tests/reset-collection.test.mjs),
  [`daily-tour.test.mjs`](../../tests/daily-tour.test.mjs) and
  [`continent-training-flow.spec.ts`](../../tests/e2e/continent-training-flow.spec.ts).
