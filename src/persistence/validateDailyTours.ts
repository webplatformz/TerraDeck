import { COUNTRIES } from '../data/countries'
import { getDailyAssignment, scoreTourAnswer, UTC_DAY_MS } from '../domain/dailyTour'
import type { DailyRun, DailyTourState } from '../domain/dailyTour'

const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const count = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0
const time = (v: unknown): v is number => count(v) && v <= 8_640_000_000_000_000
const ids = (v: unknown): v is string[] => Array.isArray(v) &&
  v.every(id => typeof id === 'string') && new Set(v).size === v.length
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

function validRun(raw: unknown, key: string, practice: boolean): raw is DailyRun {
  if (!object(raw) || typeof raw.id !== 'string' || !raw.id || raw.practice !== practice ||
      !time(raw.startedAt) || !count(raw.index) || raw.index > 4 || !object(raw.assignment)) return false
  const a = raw.assignment
  if ((a.version !== 1 && a.version !== 2) || typeof a.definitionId !== 'string' || !a.definitionId || a.dayKey !== key ||
      !count(a.number) || !time(a.expiresAt) || !ids(a.countryIds) || a.countryIds.length !== 5 ||
      !object(a.title) || typeof a.title.en !== 'string' || !a.title.en.trim() ||
      typeof a.title.de !== 'string' || !a.title.de.trim() ||
      !a.countryIds.every(id => COUNTRIES.some(c => c.id === id && c.continent === a.continent))) return false
  if (practice) {
    if (a.number !== 0 || a.expiresAt !== 8_640_000_000_000_000 ||
        a.definitionId !== raw.id || !raw.id.startsWith('practice:')) return false
  } else {
    const expected = getDailyAssignment(a.expiresAt - UTC_DAY_MS)
    if (!expected || a.number !== expected.number || a.dayKey !== expected.dayKey ||
        a.version !== expected.version || a.definitionId !== expected.definitionId ||
        a.continent !== expected.continent || !same(a.countryIds, expected.countryIds) ||
        a.title.en !== expected.title.en || a.title.de !== expected.title.de ||
        raw.id !== `daily:${a.dayKey}:v${a.version}:${a.definitionId}` ||
        raw.startedAt < a.expiresAt - UTC_DAY_MS || raw.startedAt >= a.expiresAt) return false
  }
  if (!['answer', 'feedback', 'result'].includes(String(raw.phase)) ||
      !['active', 'completed', 'expired'].includes(String(raw.status)) ||
      !Array.isArray(raw.answers) || raw.answers.length > 5 ||
      !count(raw.correctCount) || !count(raw.totalKm)) return false
  let previousTime = raw.startedAt
  for (const [index, answer] of raw.answers.entries()) {
    if (!object(answer) || answer.targetId !== a.countryIds[index] ||
        typeof answer.answerId !== 'string' ||
        !COUNTRIES.some(c => c.id === answer.answerId && c.continent === a.continent) ||
        answer.correct !== (answer.targetId === answer.answerId) ||
        !count(answer.km) || answer.km !== scoreTourAnswer(a.countryIds[index]!, answer.answerId) ||
        !time(answer.answeredAt) || answer.answeredAt < previousTime || answer.answeredAt >= a.expiresAt) return false
    previousTime = answer.answeredAt
  }
  if (raw.correctCount !== raw.answers.filter(answer => answer.correct).length ||
      raw.totalKm !== raw.answers.reduce((sum, answer) => sum + answer.km, 0)) return false
  const completed = raw.answers.length === 5
  if ((raw.status === 'completed') !== completed ||
      (raw.phase === 'result' && !completed) ||
      (raw.phase === 'answer' && (completed || raw.answers.length !== raw.index)) ||
      (raw.phase !== 'answer' && raw.answers.length !== raw.index + 1) ||
      (raw.status === 'active' && completed)) return false
  if (!object(raw.rewards) || typeof raw.rewards.applied !== 'boolean' ||
      !ids(raw.rewards.stampedIds) || !ids(raw.rewards.unlockedIds) || !ids(raw.pendingUnlockIds)) return false
  const r = raw.rewards
  const stampedIds = r.stampedIds as string[]
  const unlockedIds = r.unlockedIds as string[]
  if (r.applied !== (completed && !practice)) return false
  if ((!completed || practice || raw.correctCount !== 5) &&
      (stampedIds.length || unlockedIds.length || raw.pendingUnlockIds.length)) return false
  return stampedIds.every(id => (a.countryIds as string[]).includes(id)) &&
    unlockedIds.every(id => stampedIds.includes(id)) &&
    raw.pendingUnlockIds.every(id => unlockedIds.includes(id))
}

/** Never drop damaged reward markers and accidentally make a day playable again. */
export function validateDailyTours(raw: unknown): DailyTourState {
  if (object(raw) && raw.version === 1 && raw.blocked === true && object(raw.records) &&
      Object.keys(raw.records).length === 0 && 'quarantined' in raw) return raw as unknown as DailyTourState
  if (object(raw) && raw.version === 1 && raw.blocked !== true && object(raw.records) &&
      Object.entries(raw.records).every(([key, run]) => validRun(run, key, false)) &&
      (raw.practice === undefined || validRun(raw.practice, 'practice', true))) {
    return raw as unknown as DailyTourState
  }
  console.warn('TerraDeck: invalid or unsupported daily tours; country progress preserved, daily rewards disabled')
  return { version: 1, records: {}, blocked: true, quarantined: raw }
}
