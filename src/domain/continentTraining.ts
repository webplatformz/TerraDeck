import { COUNTRIES } from '../data/countries'
import type { ContinentId, CountryId } from './types'

export interface ContinentTrainingSession {
  [key: string]: unknown
  continent: ContinentId
  placedIds: CountryId[]
  streak: number
}

export const CONTINENT_TRAINING_VERSION = 1
export const CONTINENT_TRAINING_STORAGE_KEY = 'terradeck:continent-training:v1'

const CONTINENT_IDS: readonly ContinentId[] = ['africa', 'asia', 'europe', 'north-america', 'south-america', 'oceania']
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export function continentTrainingCountryIds(continent: ContinentId): CountryId[] {
  return COUNTRIES.filter(country => country.continent === continent).map(country => country.id)
}

export function createContinentTraining(continent: ContinentId): ContinentTrainingSession {
  return { continent, placedIds: [], streak: 0 }
}

export function recordContinentTrainingGuess(
  session: ContinentTrainingSession,
  targetId: CountryId,
  answerId: CountryId | undefined,
): { session: ContinentTrainingSession; correct: boolean } {
  if (answerId !== targetId) return { session: { ...session, streak: 0 }, correct: false }
  if (session.placedIds.includes(targetId)) return { session, correct: true }
  return {
    session: { ...session, placedIds: [...session.placedIds, targetId], streak: session.streak + 1 },
    correct: true,
  }
}

/** Explorer knowledge fills after half the continent's countries, rounded up. */
export function explorerKnowledgePercent(streak: number, total: number): number {
  if (total <= 0) return 0
  return Math.min(1, Math.max(0, streak) / Math.ceil(total / 2)) * 100
}

export function validateContinentTraining(value: unknown): ContinentTrainingSession | null {
  if (!isRecord(value) || !CONTINENT_IDS.includes(value.continent as ContinentId)) return null
  if (!Array.isArray(value.placedIds) || !value.placedIds.every(id => typeof id === 'string')) return null
  if (new Set(value.placedIds).size !== value.placedIds.length) return null
  if (!Number.isSafeInteger(value.streak) || (value.streak as number) < 0) return null
  const continent = value.continent as ContinentId
  const countryIds = new Set(continentTrainingCountryIds(continent))
  if (!value.placedIds.every(id => countryIds.has(id as string))) return null
  if ((value.streak as number) > countryIds.size || (value.streak as number) > value.placedIds.length) return null
  return {
    ...value,
    continent,
    placedIds: [...value.placedIds] as CountryId[],
    streak: value.streak as number,
  }
}

export function parseContinentTraining(raw: string): { session: ContinentTrainingSession | null; error: string | null } {
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return { session: null, error: 'The saved training data is malformed and has been kept unchanged.' }
  }
  if (!isRecord(value) || !Number.isSafeInteger(value.version)) {
    return { session: null, error: 'The saved training data is invalid and has been kept unchanged.' }
  }
  if (value.version !== CONTINENT_TRAINING_VERSION) {
    return { session: null, error: 'This training data was saved by a different app version and has been kept unchanged.' }
  }
  const session = validateContinentTraining(value.session)
  return session
    ? { session, error: null }
    : { session: null, error: 'The saved training data is invalid and has been kept unchanged.' }
}
