# Game-mode decisions

[Decision index](../DECISIONS.md) | [Product overview](../PLAN.md)

**Decision:** Offer independent continent practice and one shared daily five-stop tour.

**Rationale:** Training supports repetition without collection pressure; tours provide a bounded shared challenge.

**Constraints:** Training never awards main-game progress. Tours can award stamps only once per eligible day; see [saved-data recovery](saved-data.md#daily-tour-recovery).

## Continent Training

- Training progress uses its own `terradeck:continent-training:v1` local-storage
  key and versioned envelope. It is not part of the game save, achievements or
  daily-tour state. Missing data means no active training; valid unfinished
  sessions resume with their placed countries and current streak.
- Corrupt or unsupported training data is reported and left untouched. Training
  cannot start, overwrite, or clear that data until it can be safely interpreted.
  Confirmed cancel/close clears the isolated training entry; replay replaces it
  with a fresh session. The main save schema remains unchanged.
- Training remains compatible with existing main saves (including missing optional
  extensions and in-progress challenges/tours) because it never writes their key.
  Training v1 accepts and preserves unknown session/envelope fields on progress
  updates; replay intentionally starts a fresh session. No migration is needed.
- Names appear automatically only for correctly placed countries at zoom 2 or
  above, with overlapping/offscreen labels omitted. This is presentation-only;
  no map controls or label preferences are added to saved data.
- One continent is active at a time. Players choose countries by flag/name and
  use the shared select-and-confirm map flow, with unlimited attempts and optional
  geographic hints. Correct placements turn green and leave the remaining list;
  mistakes show one of eight arrows toward the target from the selected country's
  mainland center in the continent projection, without revealing its exact location.
- Completion remains visible until an explicit close or replay. Cancel/close
  requires confirmation and explains that training progress is cleared.
  Storage failures are shown and preserve retryable progress rather than reporting
  successful closure.
- During play, the continent heading shares a row with back navigation and a direct
  Cancel training button. Compact progress/streak meters
  sit side by side even on mobile. Reclaimed header height belongs to the map;
  the country sheet keeps its previous responsive height allocation, including
  scrollable hints on short screens. Selection and completion retain their headers.
  Correct/incorrect feedback overlays the map without shifting content; localized
  status text remains available to screen readers.
  Wrong-direction badges remain for 1.8 seconds, or until another country is chosen.
  Badges and wrong-country colors fade during the final 35% of their existing
  lifetime, unless reduced motion is requested. Wrong colors return to the
  country's previous state; correctly placed countries remain green.

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
  Historically, this revision was made on 24 October before schedule v2 became
  effective; published v1 definitions remain unchanged.
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

Persistence, compatibility envelopes and reward ledgers are documented in [saved-data](saved-data.md#daily-tour-recovery).

## Implementation references

- Rules/schedules: [`continentTraining.ts`](../../src/domain/continentTraining.ts),
  [`dailyTour.ts`](../../src/domain/dailyTour.ts) and
  [`dailyTours.ts`](../../src/data/dailyTours.ts).
- Coverage: [`continent-training.test.mjs`](../../tests/continent-training.test.mjs),
  [`daily-tour.test.mjs`](../../tests/daily-tour.test.mjs),
  [`continent-training-flow.spec.ts`](../../tests/e2e/continent-training-flow.spec.ts) and
  [`daily-tour-recovery.spec.ts`](../../tests/e2e/daily-tour-recovery.spec.ts).
