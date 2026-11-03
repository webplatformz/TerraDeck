# TerraDeck contributor rules

## Language

- Keep agent communication and console summaries in English, even when the user
  occasionally writes in German. Continue maintaining EN/DE app localization.

## Repository context and new chats

- Before implementation, read the relevant sections of `docs/PLAN.md` and
  use the task-to-document table in `docs/DECISIONS.md` to read the relevant
  topic files in `docs/decisions/` for accepted decisions. Do this in new chats
  too; do not assume these documents were automatically loaded or retained from
  a previous conversation.
- Keep these instructions as the contributor rules, `docs/PLAN.md` as the
  product/architecture overview and `docs/DECISIONS.md` as the navigation hub
  for accepted decisions and their reasoning in `docs/decisions/`.
  Update the relevant documents when changes affect their content; avoid
  duplicating whole documents here.
- When a task exposes inconsistent or outdated documentation, verify the intended
  behavior against implementation, tests and accepted decisions. Correct directly
  related documentation in the same change. Do not silently choose between
  conflicting product decisions; ask for clarification when the conflict remains.
- Conversation history does not automatically carry into a new chat. Use any
  supplied handoff for unfinished work, recent findings and approval status,
  and verify it against the current repository. If required context is missing,
  ask for it rather than assuming prior decisions or approval.
- Copilot can automatically load this file when repository instructions are
  supported and enabled; this does not automatically load the referenced
  documents or previous conversations.

## Release approval

- Before each release, review `src/data/releases.ts`: check the major version,
  fixed release date and player-facing notes in both English and German against
  changes since the last successful deployment. Retain previous release entries.
- Display versions use `v<Major>.<YYYYMMDD>`. Never derive the release date from
  the build clock. Package/tooling versions remain valid three-part versions;
  app display versions and save-schema versions are independent.
- Present both language drafts and require explicit user approval before
  publication. Do not commit, push (which deploys main), or deploy as part of
  preparing a draft. Approval of wording is not permission to publish.
- Review bundled licence notices/source availability and EN/DE privacy/operator
  information before publication. Regenerate notices with `npm run licenses:prepare`
  after dependency or covered-source changes. Do not publish personal contact
  details without approval or treat technical checks as legal clearance.

## Saved-data compatibility

- Before changing persisted data, validation, or the meaning of saved fields,
  check backward compatibility with existing saves, including missing optional
  fields and in-progress challenges or tours.
- Prefer resilient, additive changes: preserve existing progress and unknown
  fields, accept older saves, and initialize new feature data only when needed.
  Keep the existing schema version when the format and its meaning remain
  compatible. Do not bump versions merely because a feature adds optional data.
- If a change is incompatible, bump the affected schema or extension version
  and provide an explicit migration wherever possible. Keep migrations separate
  from game rules, preserve the original save, and make retries safe.
- Unsupported newer versions must not be treated as corrupt data or overwritten
  with a fresh save. If safe migration is not possible, preserve the saved data
  and report the incompatibility explicitly rather than silently resetting it.
- Add focused compatibility tests for affected old saves and new feature data.
  When introducing a migration, also cover repeated migration and unsupported
  versions. Document the compatibility decision in
  `docs/decisions/saved-data.md`, linking from `docs/DECISIONS.md` when needed.
