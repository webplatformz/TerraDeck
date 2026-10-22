import type { GameConfig } from './config'
import type { GameState, RosterEntry } from './types'

export function addDebugPack(state: GameState, code: string, roster: readonly RosterEntry[], config: GameConfig): GameState {
  const countryId = code.trim().toLowerCase()
  if (countryId && (!/^[a-z]{2}$/.test(countryId) || !roster.some(c => c.id === countryId))) {
    throw new Error('Debug country code must identify a playable country')
  }
  const packs = Math.min(state.packs + 1, config.maxPacks)
  return {
    ...state, packs,
    refillAt: packs === config.maxPacks ? null : state.refillAt,
    ...(countryId ? { debugCountryId: countryId } : {}),
  }
}
