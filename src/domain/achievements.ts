import type { ContinentId, GameState, RosterEntry } from './types'
import { ACHIEVEMENT_GROUPS } from '../data/achievementGroups'

export const ACHIEVEMENT_IDS = [
  'first-encounter', 'first-visitor', 'first-card', 'discover-10', 'encounters-25',
  'collect-10', 'collect-50', 'all-continents', 'complete-continent', 'complete-atlas',
  'perfect-5', 'stamp-continents', 'discover-50', 'recovery', 'small-5',
  'wrong-continent', 'scenic-route', 'islands-5', 'landlocked-5', 'legendary',
] as const
export type AchievementId = typeof ACHIEVEMENT_IDS[number]
export const ACHIEVEMENT_CATEGORIES = ['footsteps', 'builder', 'bearings', 'oddities'] as const
export type AchievementCategory = typeof ACHIEVEMENT_CATEGORIES[number]

export interface AchievementState {
  version: 1
  encounters: number
  perfect: number
  visitors: number
  discovered: string[]
  collected: string[]
  stampedContinents: ContinentId[]
  misses: Record<string, number>
  recovered: boolean
  scenic: boolean
  wrongContinent: boolean
  earned: Partial<Record<AchievementId, { at: number; acknowledged: boolean; target: number }>>
}

export const emptyAchievements = (): AchievementState => ({
  version: 1, encounters: 0, perfect: 0, visitors: 0, discovered: [], collected: [],
  stampedContinents: [], misses: {}, recovered: false, scenic: false,
  wrongContinent: false, earned: {},
})

export const achievementCategory = (id: AchievementId): AchievementCategory => {
  const index = ACHIEVEMENT_IDS.indexOf(id)
  return index < 5 ? 'footsteps' : index < 10 ? 'builder' : index < 15 ? 'bearings' : 'oddities'
}

export const isHiddenAchievement = (id: AchievementId): id is 'wrong-continent' | 'scenic-route' =>
  id === 'wrong-continent' || id === 'scenic-route'
const add = <T,>(values: T[], value: T): T[] => values.includes(value) ? values : [...values, value]
const knownBefore = (state: GameState, id: string) => {
  const p = state.progress[id]
  return !!p && (p.discoveredAt !== undefined || p.encounters > 0 || p.stamps > 0 || p.unlockedAt !== null)
}

/** Called only at actual game transitions; never reconstructs historical encounters. */
export function trackAchievements(
  before: GameState, next: GameState, roster: readonly RosterEntry[], now: number,
): GameState {
  if (next === before) return next
  const original = before.achievements ?? emptyAchievements()
  let a = original
  const challenge = next.activeChallenge
  if (!challenge) return next
  if (!before.activeChallenge && !knownBefore(before, challenge.countryId)) {
    a = { ...a, discovered: add(a.discovered, challenge.countryId) }
  }
  const finished = before.activeChallenge?.step !== 'result' && challenge.step === 'result'
  if (finished) {
    const country = roster.find(c => c.id === challenge.countryId)
    if (!country) return next
    a = { ...a, encounters: a.encounters + 1 }
    if (challenge.outcome === 'stamp') {
      const earnedStamp = (next.progress[country.id]?.stamps ?? 0) > (before.progress[country.id]?.stamps ?? 0)
      a = {
        ...a, perfect: a.perfect + 1,
        visitors: a.visitors + (earnedStamp && (before.progress[country.id]?.stamps ?? 0) === 0 ? 1 : 0),
        stampedContinents: earnedStamp ? add(a.stampedContinents, country.continent) : a.stampedContinents,
        recovered: a.recovered || (a.misses[country.id] ?? 0) > 0,
        scenic: a.scenic || (challenge.unlocked && (a.misses[country.id] ?? 0) >= 3),
        collected: challenge.unlocked ? add(a.collected, country.id) : a.collected,
      }
    } else {
      a = {
        ...a, misses: { ...a.misses, [country.id]: (a.misses[country.id] ?? 0) + 1 },
        wrongContinent: a.wrongContinent || challenge.continentAnswer !== country.continent,
      }
    }
  }
  if (a === original) return next
  const candidate = { ...next, achievements: a }
  const earned = { ...a.earned }
  for (const id of ACHIEVEMENT_IDS) {
    // Existing collections are consulted only on a genuinely new card unlock.
    if ((id === 'complete-atlas' || id === 'complete-continent') && !(finished && challenge.unlocked)) continue
    const { current, target } = achievementProgress(id, candidate, roster)
    if (!earned[id] && current >= target) earned[id] = { at: now, acknowledged: false, target }
  }
  return { ...candidate, achievements: { ...a, earned } }
}

export function achievementProgress(
  id: AchievementId, state: GameState, roster: readonly RosterEntry[],
): { current: number; target: number } {
  const a = state.achievements ?? emptyAchievements()
  const countries = roster.filter(c => a.collected.includes(c.id))
  const groupCount = (group: readonly string[]) => countries.filter(c => group.includes(c.id)).length
  const continents = [...new Set(roster.map(c => c.continent))]
  const collection = (entries: readonly RosterEntry[]) => entries.filter(c => (state.progress[c.id]?.stamps ?? 0) >= 2).length
  let current = 0
  let target = 1
  switch (id) {
    case 'first-encounter': current = a.encounters; break
    case 'first-visitor': current = a.visitors; break
    case 'first-card': current = countries.length; break
    case 'discover-10': current = a.discovered.length; target = 10; break
    case 'encounters-25': current = a.encounters; target = 25; break
    case 'collect-10': current = countries.length; target = 10; break
    case 'collect-50': current = countries.length; target = 50; break
    case 'all-continents': current = new Set(countries.map(c => c.continent)).size; target = continents.length; break
    case 'complete-continent': {
      // Before earning, show the continent nearest completion by proportion.
      const nearest = continents.map(continent => {
        const entries = roster.filter(c => c.continent === continent)
        return { current: collection(entries), target: entries.length }
      }).sort((x, y) => y.current / y.target - x.current / x.target)[0]
      current = nearest?.current ?? 0
      target = nearest?.target ?? 1
      break
    }
    case 'complete-atlas': current = collection(roster); target = Math.max(1, roster.length); break
    case 'perfect-5': current = a.perfect; target = 5; break
    case 'stamp-continents': current = a.stampedContinents.filter(c => continents.includes(c)).length; target = continents.length; break
    case 'discover-50': current = a.discovered.length; target = 50; break
    case 'recovery': current = Number(a.recovered); break
    case 'small-5': current = groupCount(ACHIEVEMENT_GROUPS.small); target = 3; break
    case 'wrong-continent': current = Number(a.wrongContinent); break
    case 'scenic-route': current = Number(a.scenic); break
    case 'islands-5': current = groupCount(ACHIEVEMENT_GROUPS.islands); target = 5; break
    case 'landlocked-5': current = groupCount(ACHIEVEMENT_GROUPS.landlocked); target = 5; break
    case 'legendary': current = countries.filter(c => c.rarity === 'legendary').length; break
  }
  return { current: Math.min(current, target), target }
}

export function acknowledgeAchievements(state: GameState, ids: readonly AchievementId[]): GameState {
  if (!state.achievements) return state
  const earned = { ...state.achievements.earned }
  let changed = false
  for (const id of ids) {
    const award = earned[id]
    if (award && !award.acknowledged) {
      earned[id] = { ...award, acknowledged: true }
      changed = true
    }
  }
  return changed ? { ...state, achievements: { ...state.achievements, earned } } : state
}
