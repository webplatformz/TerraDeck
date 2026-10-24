export type ContinentId = 'africa' | 'asia' | 'europe' | 'north-america' | 'south-america' | 'oceania'

/** ISO 3166-1 alpha-2, lower case (e.g. "fr"). */
export type CountryId = string

export interface CountryProgress {
  /** Optional for v1 saves made before discovery-at-opening was introduced. */
  discoveredAt?: number
  stamps: number
  encounters: number
  unlockedAt: number | null
}

export type ChallengeStep = 'continent' | 'country' | 'result'
export type ChallengeOutcome = 'stamp' | 'missed'

export interface ActiveChallenge {
  countryId: CountryId
  startedAt: number
  step: ChallengeStep
  continentAnswer: ContinentId | null
  /** Country id for roster countries, otherwise an opaque map key. */
  countryAnswer: string | null
  outcome: ChallengeOutcome | null
  /** True when this encounter earned the final stamp. */
  unlocked: boolean
}

export interface GameState {
  schemaVersion: 1
  /** Optional, independently versioned extension; old saves start tracking fresh. */
  achievements?: import('./achievements').AchievementState
  dailyTours?: import('./dailyTour').DailyTourState
  /** Debug-only target for the next opened pack; never used by normal draws. */
  debugCountryId?: string
  /** Preserves the last retired challenge verbatim, including completed results. */
  retiredChallenge?: ActiveChallenge
  rosterNotice?: { countryId?: string; refunded?: boolean; debugCountryId?: string }
  packs: number
  /** When the next pack arrives; null while the stack is full. */
  refillAt: number | null
  progress: Record<CountryId, CountryProgress>
  recentIds: CountryId[]
  activeChallenge: ActiveChallenge | null
}

export interface RosterEntry {
  id: CountryId
  continent: ContinentId
  rarity: Rarity
}
import type { Rarity } from './rarity'
