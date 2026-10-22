import type { ActiveChallenge, CountryProgress, GameState } from '../domain/types'
import type { AchievementState } from '../domain/achievements'

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isNumOrNull = (v: unknown) => v === null || isNum(v)
const isStrOrNull = (v: unknown) => v === null || typeof v === 'string'
const isCount = (v: unknown): v is number => isNum(v) && Number.isSafeInteger(v) && v >= 0
const isIds = (v: unknown) => Array.isArray(v) && v.every(id => typeof id === 'string') && new Set(v).size === v.length

export function isAchievementState(v: unknown): v is AchievementState {
  if (!isObject(v) || v.version !== 1) return false
  if (![v.encounters, v.perfect, v.visitors].every(isCount)) return false
  if (![v.discovered, v.collected, v.stampedContinents].every(isIds)) return false
  if (!(v.stampedContinents as string[]).every(c => ['africa', 'asia', 'europe', 'north-america', 'south-america', 'oceania'].includes(c))) return false
  if (!isObject(v.misses) || !Object.values(v.misses).every(isCount)) return false
  if (![v.recovered, v.scenic, v.wrongContinent].every(flag => typeof flag === 'boolean')) return false
  if (!isObject(v.earned)) return false
  // Retain well-formed awards with future IDs when an older tab reads a newer save.
  return Object.values(v.earned).every(award => isObject(award) &&
    isCount(award.at) && award.at <= 8_640_000_000_000_000 &&
    isCount(award.target) && award.target > 0 && typeof award.acknowledged === 'boolean')
}

function isProgress(v: unknown): v is CountryProgress {
  return isObject(v) && isNum(v.stamps) && v.stamps >= 0 && isNum(v.encounters) && v.encounters >= 0 && isNumOrNull(v.unlockedAt) &&
    (v.discoveredAt === undefined || (isNum(v.discoveredAt) && v.discoveredAt >= 0))
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
  if (raw.debugCountryId !== undefined && (typeof raw.debugCountryId !== 'string' || !/^[a-z]{2}$/.test(raw.debugCountryId))) {
    console.warn('TerraDeck: invalid debug country target; country progress preserved')
    return parseGameState({ ...raw, debugCountryId: undefined })
  }
  if (raw.achievements !== undefined && !isAchievementState(raw.achievements)) {
    console.warn('TerraDeck: invalid achievement extension; country progress preserved')
    return { ...raw, achievements: undefined } as unknown as GameState
  }
  return raw as unknown as GameState
}
