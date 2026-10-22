import type { CountryId, GameState } from './types'

/** Legacy encounter/unlock evidence also discovers a card, without inventing dates. */
export function isDiscovered(state: GameState, id: CountryId): boolean {
  const progress = state.progress[id]
  return state.activeChallenge?.countryId === id ||
    state.retiredChallenge?.countryId === id ||
    progress?.discoveredAt !== undefined ||
    (progress?.encounters ?? 0) > 0 ||
    (progress?.stamps ?? 0) > 0 ||
    progress?.unlockedAt != null
}
