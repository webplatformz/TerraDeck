import { geoDistance } from 'd3-geo'
import { COUNTRIES } from '../data/countries'
import { DAILY_SCHEDULES } from '../data/dailyTours'
import references from '../data/generated/tour-references-v1.json'
import { trackDailyAchievements } from './achievements'
import { awardMasteryStamp } from './mastery'
import type { Rng } from './selection'
import type { ContinentId, CountryProgress, GameState } from './types'

export const DAILY_EPOCH = Date.UTC(2026, 9, 23)
export const UTC_DAY_MS = 86_400_000
/** IUGG mean Earth radius; distances are game reference-point estimates. */
export const TOUR_EARTH_RADIUS_KM = 6371.0088
export const TOUR_REFERENCE_POINTS = references as unknown as Record<string, [number, number]>

export interface DailyAssignment {
  number: number
  dayKey: string
  expiresAt: number
  definitionId: string
  version: 1
  continent: ContinentId
  countryIds: string[]
  title: { en: string; de: string }
}
export interface DailyAnswer {
  targetId: string
  answerId: string
  correct: boolean
  km: number
  answeredAt: number
}
export interface DailyRun {
  id: string
  practice: boolean
  assignment: DailyAssignment
  startedAt: number
  index: number
  phase: 'answer' | 'feedback' | 'result'
  status: 'active' | 'completed' | 'expired'
  answers: DailyAnswer[]
  correctCount: number
  totalKm: number
  rewards: { applied: boolean; stampedIds: string[]; unlockedIds: string[] }
  pendingUnlockIds: string[]
}
export interface DailyTourState {
  version: 1
  records: Record<string, DailyRun>
  practice?: DailyRun
  /** A damaged/unsupported extension is retained but cannot issue new rewards. */
  blocked?: boolean
  quarantined?: unknown
}

export function getDailyAssignment(now: number): DailyAssignment | null {
  if (!Number.isFinite(now) || now < DAILY_EPOCH || now > 8_639_999_913_600_000) return null
  const number = Math.floor((now - DAILY_EPOCH) / UTC_DAY_MS) + 1
  const start = DAILY_EPOCH + (number - 1) * UTC_DAY_MS
  const schedule = [...DAILY_SCHEDULES].reverse().find(s => s.effectiveAt <= start)!
  const offset = Math.floor((start - schedule.effectiveAt) / UTC_DAY_MS)
  const definition = schedule.tours[offset % schedule.tours.length]!
  return {
    number, dayKey: new Date(start).toISOString().split('T')[0]!, expiresAt: start + UTC_DAY_MS,
    definitionId: definition.id, version: schedule.version, continent: definition.continent,
    countryIds: [...definition.countryIds], title: { ...definition.title },
  }
}

export function scoreTourAnswer(targetId: string, answerId: string): number {
  const target = TOUR_REFERENCE_POINTS[targetId]
  const answer = TOUR_REFERENCE_POINTS[answerId]
  if (!Object.prototype.hasOwnProperty.call(TOUR_REFERENCE_POINTS, targetId) ||
      !Object.prototype.hasOwnProperty.call(TOUR_REFERENCE_POINTS, answerId) ||
      !target || !answer) throw new Error('Unknown tour country')
  return targetId === answerId ? 0 : Math.max(1, Math.round(geoDistance(target, answer) * TOUR_EARTH_RADIUS_KM))
}

const usable = (state: GameState) => !state.dailyTours ||
  (state.dailyTours.version === 1 && !state.dailyTours.blocked)
const validTime = (now: number) => Number.isSafeInteger(now) && now >= 0 && now < 8_640_000_000_000_000
const emptyProgress = (): CountryProgress => ({ stamps: 0, encounters: 0, unlockedAt: null })

export function getDailyRun(state: GameState, runId: string): DailyRun | undefined {
  if (!usable(state)) return undefined
  if (state.dailyTours?.practice?.id === runId) return state.dailyTours.practice
  return Object.values(state.dailyTours?.records ?? {}).find(run => run.id === runId)
}

function putRun(state: GameState, run: DailyRun): GameState {
  const dailyTours: DailyTourState = state.dailyTours ?? { version: 1, records: {} }
  return { ...state, dailyTours: run.practice
    ? { ...dailyTours, practice: run }
    : { ...dailyTours, records: { ...dailyTours.records, [run.assignment.dayKey]: run } } }
}

function discoverStop(state: GameState, run: DailyRun, now: number): GameState {
  if (run.practice) return state
  const id = run.assignment.countryIds[run.index]!
  const progress = state.progress[id] ?? emptyProgress()
  if (progress.discoveredAt !== undefined) return state
  const next = { ...state, progress: { ...state.progress, [id]: { ...progress, discoveredAt: now } } }
  return trackDailyAchievements(state, next, COUNTRIES, now, [id])
}

function newRun(assignment: DailyAssignment, now: number, practice: boolean, id: string): DailyRun {
  return {
    id, practice, assignment, startedAt: now, index: 0, phase: 'answer', status: 'active',
    answers: [], correctCount: 0, totalKm: 0,
    rewards: { applied: false, stampedIds: [], unlockedIds: [] }, pendingUnlockIds: [],
  }
}

export function startDailyTour(state: GameState, now: number): GameState {
  if (!validTime(now)) return state
  const synced = expireDailyTours(state, now)
  const assignment = getDailyAssignment(now)
  if (!usable(synced) || !assignment || synced.dailyTours?.records[assignment.dayKey]) return synced
  // A clock rollback must never reopen an earlier unrecorded day.
  if (Object.keys(synced.dailyTours?.records ?? {}).some(day => day > assignment.dayKey)) return synced
  const run = newRun(assignment, now, false, `daily:${assignment.dayKey}:v${assignment.version}:${assignment.definitionId}`)
  return discoverStop(putRun(synced, run), run, now)
}

export function answerDailyTour(
  state: GameState, answerId: string, expectedRunId: string, expectedIndex: number, now: number,
): GameState {
  if (!validTime(now)) return state
  const synced = expireDailyTours(state, now)
  const run = getDailyRun(synced, expectedRunId)
  if (!run || run.status !== 'active' || run.phase !== 'answer' ||
      run.index !== expectedIndex || now < (run.answers[run.answers.length - 1]?.answeredAt ?? run.startedAt)) return synced
  if (!COUNTRIES.some(c => c.id === answerId && c.continent === run.assignment.continent)) {
    throw new Error('Invalid tour answer: choose a playable country on the tour continent')
  }
  const targetId = run.assignment.countryIds[run.index]!
  const answer: DailyAnswer = {
    targetId, answerId, correct: targetId === answerId, km: scoreTourAnswer(targetId, answerId), answeredAt: now,
  }
  const answers = [...run.answers, answer]
  const completed = answers.length === 5
  let updated: DailyRun = {
    ...run, answers, phase: 'feedback', status: completed ? 'completed' : 'active',
    correctCount: answers.filter(a => a.correct).length, totalKm: answers.reduce((sum, a) => sum + a.km, 0),
  }
  let next = synced
  if (completed && !run.practice) {
    const stampedIds: string[] = []
    const unlockedIds: string[] = []
    if (updated.correctCount === 5) {
      const progress = { ...next.progress }
      for (const id of run.assignment.countryIds) {
        const award = awardMasteryStamp(progress[id] ?? emptyProgress(), now)
        progress[id] = award.progress
        if (award.earned) stampedIds.push(id)
        if (award.unlocked) unlockedIds.push(id)
      }
      next = trackDailyAchievements(synced, { ...next, progress }, COUNTRIES, now, [], stampedIds, unlockedIds)
    }
    updated = { ...updated, rewards: { applied: true, stampedIds, unlockedIds }, pendingUnlockIds: [...unlockedIds] }
  }
  return putRun(next, updated)
}

export function advanceDailyTour(state: GameState, expectedRunId: string, now: number): GameState {
  if (!validTime(now)) return state
  const synced = expireDailyTours(state, now)
  const run = getDailyRun(synced, expectedRunId)
  if (!run || run.phase !== 'feedback' || run.status === 'expired' ||
      now < (run.answers[run.answers.length - 1]?.answeredAt ?? run.startedAt)) return synced
  if (run.status === 'completed') return putRun(synced, { ...run, phase: 'result' })
  const updated: DailyRun = { ...run, index: run.index + 1, phase: 'answer' }
  return discoverStop(putRun(synced, updated), updated, now)
}

export function acknowledgeTourUnlock(state: GameState, countryId: string, practice = false): GameState {
  if (!usable(state)) return state
  const runs = practice ? [state.dailyTours?.practice] : Object.values(state.dailyTours?.records ?? {})
  let next = state
  for (const run of runs) {
    if (run?.pendingUnlockIds.includes(countryId)) {
      next = putRun(next, { ...run, pendingUnlockIds: run.pendingUnlockIds.filter(id => id !== countryId) })
    }
  }
  return next
}

export function startPracticeTour(state: GameState, now: number, rng: Rng): GameState {
  if (!usable(state) || !validTime(now)) return state
  const randomIndex = (length: number) => {
    const value = rng()
    if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('Invalid practice random value')
    return Math.floor(value * length)
  }
  const continents = [...new Set(COUNTRIES.map(c => c.continent))]
    .filter(continent => COUNTRIES.filter(c => c.continent === continent).length >= 5)
  const continent = continents[randomIndex(continents.length)]!
  const candidates = COUNTRIES.filter(c => c.continent === continent).map(c => c.id)
  const countryIds = Array.from({ length: 5 }, () => candidates.splice(randomIndex(candidates.length), 1)[0]!)
  const previous = state.dailyTours?.practice
  const sequence = Number(previous?.id.split(':').slice(-1)[0] ?? 0) + 1
  const id = `practice:${now}:${countryIds.join('-')}:${sequence}`
  const assignment: DailyAssignment = {
    number: 0, dayKey: 'practice', expiresAt: 8_640_000_000_000_000, definitionId: id, version: 1,
    continent, countryIds, title: { en: 'Practice tour', de: 'Übungstour' },
  }
  return putRun(state, newRun(assignment, now, true, id))
}

export function expireDailyTours(state: GameState, now: number): GameState {
  if (!usable(state) || !state.dailyTours || !validTime(now)) return state
  let next = state
  for (const run of Object.values(state.dailyTours.records)) {
    if (run.status === 'active' && now >= run.assignment.expiresAt) {
      next = putRun(next, { ...run, status: 'expired' })
    }
  }
  return next
}
