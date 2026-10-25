# TerraDeck contributor rules

## Language

- Keep agent communication and console summaries in English, even when the user
  occasionally writes in German. Continue maintaining EN/DE app localization.

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
  versions. Document the compatibility decision in `docs/DECISIONS.md`.
