export const LANGUAGE_STORAGE_KEY = 'terradeck:lang'

/** The player's chosen UI language. Kept apart from the game save: it is a device preference, not progress. */
export const languageStore = {
  load(storage: Storage = window.localStorage): string | null {
    try {
      return storage.getItem(LANGUAGE_STORAGE_KEY)
    } catch {
      return null
    }
  },
  save(language: string, storage: Storage = window.localStorage): void {
    try {
      storage.setItem(LANGUAGE_STORAGE_KEY, language)
    } catch {
      // Storage unavailable (e.g. some private modes): the choice lasts for this session only.
    }
  },
}
