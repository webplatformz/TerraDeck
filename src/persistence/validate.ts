import type { ActiveChallenge, CountryProgress, GameState } from '../domain/types'

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isNumOrNull = (v: unknown) => v === null || isNum(v)
const isStrOrNull = (v: unknown) => v === null || typeof v === 'string'

function isProgress(v: unknown): v is CountryProgress {
  return isObject(v) && isNum(v.stamps) && v.stamps >= 0 && isNum(v.encounters) && v.encounters >= 0 && isNumOrNull(v.unlockedAt)
}

function isChallenge(v: unknown): v is ActiveChallenge {
  return (
    isObject(v) &&
    typeof v.countryId === 'string' &&
    isNum(v.startedAt) &&
    (v.step === 'continent' || v.step === 'country' || v.step === 'result') &&
    isStrOrNull(v.continentAnswer) &&
    isStrOrNull(v.countryAnswer) &&
    (v.outcome === null || v.outcome === 'stamp' || v.outcome === 'missed') &&
    typeof v.unlocked === 'boolean'
  )
}

/** Returns the state if it matches the current schema, otherwise null. */
export function parseGameState(raw: unknown): GameState | null {
  if (!isObject(raw) || raw.schemaVersion !== 1) return null
  if (!isNum(raw.packs) || raw.packs < 0 || !isNumOrNull(raw.refillAt)) return null
  if (!isObject(raw.progress) || !Object.values(raw.progress).every(isProgress)) return null
  if (!Array.isArray(raw.recentIds) || !raw.recentIds.every((id) => typeof id === 'string')) return null
  if (raw.activeChallenge !== null && !isChallenge(raw.activeChallenge)) return null
  return raw as unknown as GameState
}
