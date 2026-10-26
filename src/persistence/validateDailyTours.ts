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
    const expected = getDailyAssignment(a.expiresAt - UTC_DAY_MS, a.version)
    if (!expected || a.number !== expected.number || a.dayKey !== expected.dayKey ||
        a.version !== expected.version || a.definitionId !== expected.definitionId ||
        a.continent !== expected.continent || !same(a.countryIds, expected.countryIds) ||
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
export function validateDailyTours(raw: unknown, now = Date.now(), completedDays: readonly string[] = [], unreadableEvidence = false): DailyTourState {
  const original = raw
  let unwrapped = false
  const wrappers: Record<string, unknown>[] = []
  const newerRun = (run: unknown) => object(run) && object(run.assignment) &&
    typeof run.assignment.version === 'number' && run.assignment.version > 2
  const newer = (value: unknown) => object(value) &&
    ((typeof value.version === 'number' && value.version > 1) ||
      (typeof value.recoveryVersion === 'number' && value.recoveryVersion > 1) ||
      newerRun(value.practice) ||
      (object(value.records) && Object.values(value.records).some(newerRun)))
  // Iterative traversal is bounded by the input, not the call stack. Check every layer
  // before unwrapping so even deeply wrapped newer data is never discarded.
  const seen = new Set<unknown>()
  while (object(raw) && raw.version === 1 && raw.blocked === true && 'quarantined' in raw && !newer(raw)) {
    if (seen.has(raw)) { raw = null; break }
    seen.add(raw)
    wrappers.push(raw)
    raw = raw.quarantined
    unwrapped = true
  }
  if (newer(raw)) {
    console.warn('TerraDeck: newer daily-tour format preserved; update the app to use tours')
    // A stable envelope keeps unknown fields intact without exposing unknown records
    // to game rules. Re-reading this envelope must not add another wrapper.
    return object(original) && original.version === 1 && original.blocked === true &&
      object(original.records) && Object.keys(original.records).length === 0 &&
      'quarantined' in original && !newer(original)
      ? original as unknown as DailyTourState
      : { version: 1, records: {}, blocked: true, quarantined: original }
  }
  const day = (value: unknown): value is string => typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
  const layers = [...wrappers, ...(object(raw) ? [raw] : [])]
  const ledgerValid = layers.every(layer => (layer.rewardDays === undefined ||
    (Array.isArray(layer.rewardDays) && layer.rewardDays.every(day))) &&
    (layer.rewardBlockedThrough === undefined || day(layer.rewardBlockedThrough)))
  const records: Record<string, DailyRun> = {}
  const rewardDays = new Set(completedDays.filter(day))
  let previousBlock: string | undefined
  for (const layer of layers) {
    if (Array.isArray(layer.rewardDays)) for (const value of layer.rewardDays) if (day(value)) rewardDays.add(value)
    if (day(layer.rewardBlockedThrough) && (!previousBlock || layer.rewardBlockedThrough > previousBlock)) {
      previousBlock = layer.rewardBlockedThrough
    }
  }
  for (const wrapper of wrappers) {
    if (object(wrapper.records)) for (const key of Object.keys(wrapper.records)) if (day(key)) rewardDays.add(key)
  }
  let damaged = unreadableEvidence || !object(raw) || raw.version !== 1 || !object(raw.records) || !ledgerValid ||
    (raw.recoveryVersion !== undefined && raw.recoveryVersion !== 1) ||
    (raw.recoveryNotice !== undefined && raw.recoveryNotice !== 'reset' && raw.recoveryNotice !== 'recovered') ||
    (raw.blocked !== undefined && raw.blocked !== false)
  if (object(raw)) {
    if (object(raw.records)) for (const [key, run] of Object.entries(raw.records)) {
      if (day(key) && validRun(run, key, false)) {
        if (raw.version === 1) records[key] = run
        if (run.rewards.applied) rewardDays.add(key)
      } else {
        damaged = true
        // Retire an unreadable dated attempt rather than reopen its rewards.
        if (day(key)) rewardDays.add(key)
      }
    }
  }
  const practice = object(raw) && raw.version === 1 && raw.practice !== undefined && validRun(raw.practice, 'practice', true) ? raw.practice : undefined
  if (object(raw) && raw.practice !== undefined && !practice) damaged = true
  if (!damaged && !unwrapped) return raw as unknown as DailyTourState
  const today = new Date(now).toISOString().slice(0, 10)
  const retained = object(raw) && raw.version === 1 ? { ...raw } : {}
  delete retained.blocked
  delete retained.quarantined
  delete retained.practice
  console.warn(`TerraDeck: daily-tour history ${damaged ? 'partially reset' : 'recovered'}; collection and achievements preserved`)
  return {
    ...retained, version: 1, recoveryVersion: 1, records, ...(practice ? { practice } : {}),
    rewardDays: [...rewardDays].sort(),
    ...(damaged || previousBlock ? { rewardBlockedThrough: previousBlock && previousBlock > today ? previousBlock : damaged ? today : previousBlock } : {}),
    recoveryNotice: damaged ? 'reset' : 'recovered',
  }
}
