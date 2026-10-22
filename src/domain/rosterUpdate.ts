import { syncPacks } from './challenge'
import type { GameConfig } from './config'
import type { GameState } from './types'

/** Retire only explicitly removed countries; retain their full challenge and progress as history. */
export function reconcileRoster(
  state: GameState, removedIds: readonly string[], now: number, config: GameConfig,
): GameState {
  const challenge = state.activeChallenge
  const retire = challenge && removedIds.includes(challenge.countryId)
  const debugRemoved = state.debugCountryId && removedIds.includes(state.debugCountryId)
  if (!retire && !debugRemoved) return state
  const synced = syncPacks(state, now, config)
  const refund = !!retire && challenge.step !== 'result'
  const packs = Math.min(config.maxPacks, synced.packs + Number(refund))
  return {
    ...synced,
    packs,
    refillAt: packs >= config.maxPacks ? null : synced.refillAt,
    ...(retire ? { activeChallenge: null, retiredChallenge: challenge } : {}),
    ...(debugRemoved ? { debugCountryId: undefined } : {}),
    rosterNotice: {
      ...synced.rosterNotice,
      ...(retire ? { countryId: challenge.countryId, refunded: refund } : {}),
      ...(debugRemoved ? { debugCountryId: state.debugCountryId } : {}),
    },
  }
}
