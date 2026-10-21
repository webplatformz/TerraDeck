import type { GameConfig } from './config'
import { reconcilePacks } from './packRefill'
import { pickCountry, type Rng } from './selection'
import type { ContinentId, CountryProgress, GameState, RosterEntry } from './types'

export function createInitialState(config: GameConfig): GameState {
  return {
    schemaVersion: 1,
    packs: config.maxPacks,
    refillAt: null,
    progress: {},
    recentIds: [],
    activeChallenge: null,
  }
}

export function syncPacks(state: GameState, now: number, config: GameConfig): GameState {
  const next = reconcilePacks(state, now, config)
  if (next.packs === state.packs && next.refillAt === state.refillAt) return state
  return { ...state, ...next }
}

export function openPack(
  state: GameState,
  roster: readonly RosterEntry[],
  now: number,
  rng: Rng,
  config: GameConfig,
): GameState {
  const synced = syncPacks(state, now, config)
  if (synced.activeChallenge || synced.packs < 1) return synced

  const countryId = pickCountry(
    roster,
    synced.progress,
    synced.recentIds,
    rng,
    config.stampsToUnlock,
    config.recentWindow,
  )
  if (!countryId) return synced

  const stock = reconcilePacks({ packs: synced.packs - 1, refillAt: synced.refillAt }, now, config)
  return {
    ...synced,
    ...stock,
    progress: {
      ...synced.progress,
      [countryId]: {
        stamps: 0, encounters: 0, unlockedAt: null,
        ...synced.progress[countryId],
        discoveredAt: synced.progress[countryId]?.discoveredAt ?? now,
      },
    },
    recentIds: [...synced.recentIds.filter((id) => id !== countryId), countryId].slice(-10),
    activeChallenge: {
      countryId,
      startedAt: now,
      step: 'continent',
      continentAnswer: null,
      countryAnswer: null,
      outcome: null,
      unlocked: false,
    },
  }
}

export function answerContinent(
  state: GameState,
  continent: ContinentId,
  roster: readonly RosterEntry[],
  now: number,
  config: GameConfig,
): GameState {
  const challenge = state.activeChallenge
  if (!challenge || challenge.step !== 'continent') return state
  const target = roster.find((c) => c.id === challenge.countryId)
  const answered = { ...challenge, continentAnswer: continent }

  if (target?.continent === continent) {
    return { ...state, activeChallenge: { ...answered, step: 'country' } }
  }
  return finish({ ...state, activeChallenge: answered }, 'missed', now, config)
}

export function answerCountry(state: GameState, answer: string, now: number, config: GameConfig): GameState {
  const challenge = state.activeChallenge
  if (!challenge || challenge.step !== 'country') return state
  const answered = { ...state, activeChallenge: { ...challenge, countryAnswer: answer } }
  return finish(answered, answer === challenge.countryId ? 'stamp' : 'missed', now, config)
}

export function dismissChallenge(state: GameState): GameState {
  if (state.activeChallenge?.step !== 'result') return state
  return { ...state, activeChallenge: null }
}

function finish(state: GameState, outcome: 'stamp' | 'missed', now: number, config: GameConfig): GameState {
  const challenge = state.activeChallenge!
  const before: CountryProgress = state.progress[challenge.countryId] ?? { stamps: 0, encounters: 0, unlockedAt: null }
  const stamps = outcome === 'stamp' && before.stamps < config.stampsToUnlock ? Math.min(config.stampsToUnlock, before.stamps + 1) : before.stamps
  const unlocked = outcome === 'stamp' && before.stamps < config.stampsToUnlock && stamps >= config.stampsToUnlock

  return {
    ...state,
    progress: {
      ...state.progress,
      [challenge.countryId]: {
        ...before,
        stamps,
        encounters: before.encounters + 1,
        unlockedAt: unlocked ? now : before.unlockedAt,
      },
    },
    activeChallenge: { ...challenge, step: 'result', outcome, unlocked },
  }
}
