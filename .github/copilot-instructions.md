# TerraDeck contributor rules

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
