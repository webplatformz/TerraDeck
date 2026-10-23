import { syncPacks } from './challenge'
import { emptyAchievements } from './achievements'
import type { GameConfig } from './config'
import type { ContinentId, GameState, RosterEntry } from './types'

export function resetCollection(
  state: GameState, roster: readonly RosterEntry[], continent: ContinentId | 'all', now: number, config: GameConfig,
): GameState {
  const ids = new Set(roster.filter(c => continent === 'all' || c.continent === continent).map(c => c.id))
  const affected = (id: string) => continent === 'all' || ids.has(id)
  const synced = syncPacks(state, now, config)
  const history = synced.achievements?.completionCollected ?? []
  const completed = roster.filter(c => affected(c.id) && (synced.progress[c.id]?.stamps ?? 0) >= config.stampsToUnlock)
    .map(c => c.id).filter(id => !history.includes(id))
  const cancel = !!synced.activeChallenge && affected(synced.activeChallenge.countryId)
  const refund = cancel && synced.activeChallenge?.step !== 'result'
  const packs = Math.min(config.maxPacks, synced.packs + Number(refund))
  const notice = synced.rosterNotice
  const remainingNotice = notice && {
    ...(notice.countryId && !affected(notice.countryId) ? { countryId: notice.countryId, refunded: notice.refunded } : {}),
    ...(notice.debugCountryId && !affected(notice.debugCountryId) ? { debugCountryId: notice.debugCountryId } : {}),
  }
  return {
    ...synced,
    achievements: completed.length
      ? { ...(synced.achievements ?? emptyAchievements()), completionCollected: [...history, ...completed] }
      : synced.achievements,
    packs,
    refillAt: packs >= config.maxPacks ? null : synced.refillAt,
    progress: Object.fromEntries(Object.entries(synced.progress).filter(([id]) => !affected(id))),
    recentIds: synced.recentIds.filter(id => !affected(id)),
    activeChallenge: cancel ? null : synced.activeChallenge,
    retiredChallenge: synced.retiredChallenge && affected(synced.retiredChallenge.countryId) ? undefined : synced.retiredChallenge,
    rosterNotice: remainingNotice && Object.keys(remainingNotice).length ? remainingNotice : undefined,
  }
}
