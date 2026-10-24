import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
import { geoCentroid } from 'd3-geo'
import { COUNTRIES } from '../src/data/countries.ts'
import { DAILY_SCHEDULES } from '../src/data/dailyTours.ts'
import { loadWorld } from '../src/data/world.ts'
import {
  DAILY_EPOCH, UTC_DAY_MS, TOUR_REFERENCE_POINTS, getDailyAssignment, scoreTourAnswer,
  getDailyRun, startDailyTour, answerDailyTour, advanceDailyTour, acknowledgeTourUnlock,
  startPracticeTour, expireDailyTours,
} from '../src/domain/dailyTour.ts'
import { createInitialState, openPack, answerContinent, answerCountry } from '../src/domain/challenge.ts'
import { DEFAULT_CONFIG } from '../src/domain/config.ts'
import { emptyAchievements } from '../src/domain/achievements.ts'
import { resetCollection } from '../src/domain/resetCollection.ts'
import { parseGameState } from '../src/persistence/validate.ts'
import { LocalStorageRepository } from '../src/persistence/LocalStorageRepository.ts'

const fresh = () => ({ ...createInitialState(DEFAULT_CONFIG), achievements: emptyAchievements() })
const clone = value => JSON.parse(JSON.stringify(value))
const daily = (state, now = DAILY_EPOCH) => state.dailyTours.records[getDailyAssignment(now).dayKey]
function play(state, { now = DAILY_EPOCH, perfect = true, practice = false, finalAdvance = false } = {}) {
  let run = practice ? state.dailyTours.practice : daily(state, now)
  for (let index = run.index; index < 5; index++) {
    const target = run.assignment.countryIds[index]
    const answer = !perfect && index === 2
      ? run.assignment.countryIds[(index + 1) % 5] : target
    state = answerDailyTour(state, answer, run.id, index, now + index * 2 + 1)
    if (index < 4 || finalAdvance) state = advanceDailyTour(state, run.id, now + index * 2 + 2)
    run = getDailyRun(state, run.id)
  }
  return state
}
const memoryStorage = () => {
  const data = new Map()
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) }
}

test('three immutable ordered tours have five unique playable same-continent countries and bilingual titles', () => {
  assert.equal(DAILY_SCHEDULES.length, 1)
  const schedule = DAILY_SCHEDULES[0]
  assert.equal(schedule.version, 1)
  assert.equal(schedule.effectiveAt, DAILY_EPOCH)
  assert.equal(schedule.tours.length, 3)
  assert.deepEqual(schedule.tours.map(t => t.continent), ['europe', 'africa', 'asia'])
  assert.equal(new Set(schedule.tours.map(t => t.id)).size, 3)
  for (const tour of schedule.tours) {
    assert.equal(tour.countryIds.length, 5)
    assert.equal(new Set(tour.countryIds).size, 5)
    for (const id of tour.countryIds) assert.equal(COUNTRIES.find(c => c.id === id).continent, tour.continent)
    assert.ok(tour.title.en && tour.title.de)
  }
})

test('every one of 168 playable countries has a finite frozen mainland centroid reference', async () => {
  assert.equal(COUNTRIES.length, 168)
  assert.deepEqual(Object.keys(TOUR_REFERENCE_POINTS).sort(), COUNTRIES.map(c => c.id).sort())
  const world = await loadWorld()
  for (const country of COUNTRIES) {
    const point = TOUR_REFERENCE_POINTS[country.id]
    assert.equal(point.length, 2)
    assert.ok(point.every(Number.isFinite))
    assert.ok(Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 90)
    assert.deepEqual(point, geoCentroid(world.mainland.get(country.mapName)).map(v => Number(v.toFixed(6))))
  }
  // Review guards for dropped remote territories and antimeridian archipelagos.
  assert.ok(TOUR_REFERENCE_POINTS.us[0] < -90 && TOUR_REFERENCE_POINTS.us[1] < 50)
  assert.ok(TOUR_REFERENCE_POINTS.fr[1] > 40)
  assert.ok(TOUR_REFERENCE_POINTS.fj[0] > 170)
  assert.ok(TOUR_REFERENCE_POINTS.id[0] > 100 && TOUR_REFERENCE_POINTS.id[0] < 140)
})

test('UTC epoch, midnight boundaries, 3/4 and 6/7 rotations, and pre-epoch availability', () => {
  assert.equal(getDailyAssignment(DAILY_EPOCH - 1), null)
  assert.equal(getDailyAssignment(NaN), null)
  assert.equal(getDailyAssignment(Infinity), null)
  for (let day = 0; day < 10; day++) {
    const a = getDailyAssignment(DAILY_EPOCH + day * UTC_DAY_MS)
    assert.equal(a.number, day + 1)
    assert.equal(a.version, 1)
    assert.equal(a.definitionId, DAILY_SCHEDULES[0].tours[day % 3].id)
    assert.equal(a.expiresAt, DAILY_EPOCH + (day + 1) * UTC_DAY_MS)
    assert.deepEqual(getDailyAssignment(a.expiresAt - 1), a)
  }
  assert.equal(getDailyAssignment(Date.parse('2026-10-23T14:00:00+14:00')).number, 1)
  assert.equal(getDailyAssignment(Date.parse('2026-10-24T01:00:00+01:00')).number, 2)
  const assignment = getDailyAssignment(DAILY_EPOCH)
  assignment.countryIds.reverse()
  assert.equal(getDailyAssignment(DAILY_EPOCH).countryIds[0], 'no')
})

test('scoring is symmetric, integer, correct zero, and agrees with independent haversine', () => {
  function haversine(a, b) {
    const [lon1, lat1] = a.map(x => x * Math.PI / 180)
    const [lon2, lat2] = b.map(x => x * Math.PI / 180)
    const h = Math.sin((lat2 - lat1) / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2
    return Math.max(1, Math.round(6371.0088 * 2 * Math.asin(Math.sqrt(h))))
  }
  for (const [a, b] of [['fr', 'de'], ['fj', 'nz'], ['id', 'jp'], ['ru', 'us'], ['np', 'bt']]) {
    assert.equal(scoreTourAnswer(a, a), 0)
    assert.equal(scoreTourAnswer(a, b), scoreTourAnswer(b, a))
    assert.equal(scoreTourAnswer(a, b), haversine(TOUR_REFERENCE_POINTS[a], TOUR_REFERENCE_POINTS[b]))
    assert.ok(scoreTourAnswer(a, b) >= 1)
  }
  assert.throws(() => scoreTourAnswer('invalid', 'fr'), /Unknown/)
  assert.throws(() => scoreTourAnswer('toString', 'fr'), /Unknown/)
})

test('start discovers only current stop, preserves pack/challenge state, and is idempotent', () => {
  const before = openPack(fresh(), COUNTRIES, DAILY_EPOCH, () => 0, DEFAULT_CONFIG)
  const state = startDailyTour(before, DAILY_EPOCH)
  const run = daily(state)
  assert.equal(run.index, 0)
  assert.equal(run.phase, 'answer')
  assert.equal(run.status, 'active')
  assert.equal(run.assignment.number, 1)
  assert.equal(state.progress.no.discoveredAt, DAILY_EPOCH)
  for (const id of run.assignment.countryIds.slice(1)) assert.equal(state.progress[id], before.progress[id])
  assert.equal(state.packs, before.packs)
  assert.equal(state.refillAt, before.refillAt)
  assert.deepEqual(state.activeChallenge, before.activeChallenge)
  assert.deepEqual(state.recentIds, before.recentIds)
  assert.deepEqual(state.achievements.discovered, ['no'])
  assert.strictEqual(startDailyTour(state, DAILY_EPOCH + 1), state)
  assert.strictEqual(startDailyTour(before, DAILY_EPOCH - 1), before)
})

test('first answer is final, guards reject stale selections, invalid continent errors, no skipping', () => {
  const started = startDailyTour(fresh(), DAILY_EPOCH)
  const run = daily(started)
  assert.strictEqual(advanceDailyTour(started, run.id, DAILY_EPOCH), started)
  assert.strictEqual(answerDailyTour(started, 'no', 'stale', 0, DAILY_EPOCH), started)
  assert.strictEqual(answerDailyTour(started, 'no', run.id, 1, DAILY_EPOCH), started)
  assert.throws(() => answerDailyTour(started, 'jp', run.id, 0, DAILY_EPOCH), /Invalid tour answer/)
  assert.throws(() => answerDailyTour(started, 'not-a-country', run.id, 0, DAILY_EPOCH), /Invalid tour answer/)
  const answered = answerDailyTour(started, 'fr', run.id, 0, DAILY_EPOCH)
  assert.equal(daily(answered).index, 0)
  assert.equal(daily(answered).phase, 'feedback')
  assert.deepEqual(daily(answered).answers[0], {
    targetId: 'no', answerId: 'fr', correct: false, km: scoreTourAnswer('no', 'fr'), answeredAt: DAILY_EPOCH,
  })
  assert.strictEqual(answerDailyTour(answered, 'no', run.id, 0, DAILY_EPOCH), answered)
  const advanced = advanceDailyTour(answered, run.id, DAILY_EPOCH)
  assert.equal(daily(advanced).index, 1)
  assert.equal(advanced.progress.de.discoveredAt, DAILY_EPOCH)
  assert.strictEqual(advanceDailyTour(advanced, run.id, DAILY_EPOCH), advanced)
})

test('imperfect run records integer total and discovery but awards no mastery or encounter effects', () => {
  const state = play(startDailyTour(fresh(), DAILY_EPOCH), { perfect: false })
  const run = daily(state)
  assert.equal(run.correctCount, 4)
  assert.equal(run.totalKm, run.answers.reduce((sum, a) => sum + a.km, 0))
  assert.equal(run.status, 'completed')
  assert.deepEqual(run.rewards, { applied: true, stampedIds: [], unlockedIds: [] })
  assert.equal(state.achievements.discovered.length, 5)
  for (const id of run.assignment.countryIds) {
    assert.equal(state.progress[id].stamps, 0)
    assert.equal(state.progress[id].encounters, 0)
  }
  assert.equal(state.achievements.encounters, 0)
  assert.equal(state.achievements.perfect, 0)
  assert.equal(state.achievements.visitors, 0)
  assert.deepEqual(state.achievements.misses, {})
  assert.equal(state.achievements.recovered, false)
  assert.equal(state.achievements.scenic, false)
  assert.equal(state.achievements.wrongContinent, false)
})

test('perfect fifth answer atomically grants capped stamps, achievements, and unlock queue exactly once', () => {
  const initial = fresh()
  initial.progress.no = { stamps: 1, encounters: 9, unlockedAt: null }
  initial.progress.de = { stamps: 2, encounters: 4, unlockedAt: 10 }
  initial.achievements.misses.no = 3
  const state = play(startDailyTour(initial, DAILY_EPOCH))
  const run = daily(state)
  assert.equal(run.phase, 'feedback')
  assert.equal(run.status, 'completed')
  assert.equal(run.correctCount, 5)
  assert.equal(run.totalKm, 0)
  assert.deepEqual(run.rewards, { applied: true, stampedIds: ['no', 'fr', 'it', 'gr'], unlockedIds: ['no'] })
  assert.deepEqual(run.pendingUnlockIds, ['no'])
  assert.equal(state.progress.no.stamps, 2)
  assert.equal(state.progress.no.encounters, 9)
  assert.equal(state.progress.de.stamps, 2)
  assert.equal(state.progress.de.unlockedAt, 10)
  assert.equal(state.achievements.visitors, 3)
  assert.ok(state.achievements.earned['first-visitor'])
  assert.ok(state.achievements.earned['first-card'])
  assert.equal(state.achievements.encounters, 0)
  assert.equal(state.achievements.perfect, 0)
  assert.equal(state.achievements.recovered, false)
  assert.equal(state.achievements.scenic, false)
  assert.deepEqual(state.achievements.collected, ['no'])
  assert.deepEqual(state.achievements.stampedContinents, ['europe'])
  assert.strictEqual(answerDailyTour(state, 'gr', run.id, 4, DAILY_EPOCH + 100), state)
  const reloaded = parseGameState(clone(state))
  assert.deepEqual(reloaded, state)
  assert.strictEqual(answerDailyTour(reloaded, 'gr', run.id, 4, DAILY_EPOCH + 100), reloaded)
  const result = advanceDailyTour(reloaded, run.id, DAILY_EPOCH + UTC_DAY_MS + 1)
  assert.equal(daily(result).phase, 'result')
  assert.deepEqual(result.progress, state.progress)
  const acknowledged = acknowledgeTourUnlock(result, 'no')
  assert.deepEqual(daily(acknowledged).pendingUnlockIds, [])
  assert.deepEqual(daily(acknowledged).rewards, run.rewards)
  assert.strictEqual(acknowledgeTourUnlock(acknowledged, 'no'), acknowledged)
})

test('all collected countries remain unchanged and multiple unlocks are sequentially acknowledgeable', () => {
  for (const stamps of [1, 2]) {
    const initial = fresh()
    const ids = getDailyAssignment(DAILY_EPOCH).countryIds
    for (const id of ids) initial.progress[id] = { stamps, encounters: 0, unlockedAt: stamps === 2 ? 10 : null }
    let state = play(startDailyTour(initial, DAILY_EPOCH))
    assert.equal(daily(state).pendingUnlockIds.length, stamps === 1 ? 5 : 0)
    assert.equal(daily(state).rewards.stampedIds.length, stamps === 1 ? 5 : 0)
    for (const id of ids) {
      assert.equal(state.progress[id].stamps, 2)
      state = acknowledgeTourUnlock(state, id)
    }
    assert.deepEqual(daily(state).pendingUnlockIds, [])
  }
})

test('midnight expires unfinished tours, including feedback, but preserves completed fifth answer', () => {
  const started = startDailyTour(fresh(), DAILY_EPOCH)
  const run = daily(started)
  const expired = answerDailyTour(started, 'no', run.id, 0, DAILY_EPOCH + UTC_DAY_MS)
  assert.equal(daily(expired).status, 'expired')
  assert.equal(daily(expired).answers.length, 0)
  assert.strictEqual(expireDailyTours(expired, DAILY_EPOCH + UTC_DAY_MS), expired)
  assert.strictEqual(startDailyTour(expired, DAILY_EPOCH + 1), expired)
  const feedback = answerDailyTour(started, 'no', run.id, 0, DAILY_EPOCH)
  assert.equal(daily(advanceDailyTour(feedback, run.id, DAILY_EPOCH + UTC_DAY_MS)).status, 'expired')
  const complete = play(started, { now: DAILY_EPOCH + UTC_DAY_MS - 11 })
  assert.equal(daily(expireDailyTours(complete, DAILY_EPOCH + UTC_DAY_MS)).status, 'completed')
  assert.equal(daily(advanceDailyTour(complete, run.id, DAILY_EPOCH + UTC_DAY_MS)).phase, 'result')
  const next = startDailyTour(expired, DAILY_EPOCH + UTC_DAY_MS)
  assert.equal(Object.keys(next.dailyTours.records).length, 2)
  assert.equal(daily(next, DAILY_EPOCH + UTC_DAY_MS).assignment.number, 2)
})

test('clock rollback preserves recorded days and rejects answers earlier than last evidence', () => {
  const tomorrow = startDailyTour(fresh(), DAILY_EPOCH + UTC_DAY_MS)
  assert.strictEqual(startDailyTour(tomorrow, DAILY_EPOCH), tomorrow)
  const started = startDailyTour(fresh(), DAILY_EPOCH + 100)
  const run = daily(started)
  assert.strictEqual(answerDailyTour(started, 'no', run.id, 0, DAILY_EPOCH), started)
  const answered = answerDailyTour(started, 'no', run.id, 0, DAILY_EPOCH + 200)
  assert.strictEqual(advanceDailyTour(answered, run.id, DAILY_EPOCH + 199), answered)
  const next = advanceDailyTour(answered, run.id, DAILY_EPOCH + 201)
  assert.strictEqual(answerDailyTour(next, 'de', run.id, 1, DAILY_EPOCH + 199), next)
})

test('practice samples five unique same-continent targets, replaces without stale IDs, and changes no progression', () => {
  const initial = startDailyTour(fresh(), DAILY_EPOCH)
  let state = startPracticeTour(initial, 100, () => 0)
  const first = state.dailyTours.practice
  assert.equal(first.practice, true)
  assert.equal(new Set(first.assignment.countryIds).size, 5)
  assert.ok(first.assignment.countryIds.every(id => COUNTRIES.find(c => c.id === id).continent === first.assignment.continent))
  assert.deepEqual(parseGameState(clone(state)), state)
  assert.strictEqual(startDailyTour(state, 100), state)
  assert.throws(() => startPracticeTour(state, 100, () => 1), /Invalid practice/)
  const history = []
  for (let i = 0; i < 20; i++) {
    history.push(state.dailyTours.practice.id)
    state = startPracticeTour(state, 100, () => 0)
  }
  assert.equal(new Set(history).size, 20)
  assert.strictEqual(answerDailyTour(state, first.assignment.countryIds[0], first.id, 0, 100), state)
  state = play(state, { now: 100, practice: true, finalAdvance: true })
  const run = state.dailyTours.practice
  assert.equal(run.phase, 'result')
  assert.equal(run.correctCount, 5)
  assert.deepEqual(run.rewards, { applied: false, stampedIds: [], unlockedIds: [] })
  assert.deepEqual(state.progress, initial.progress)
  assert.deepEqual(state.achievements, initial.achievements)
  assert.deepEqual(state.dailyTours.records, initial.dailyTours.records)
  assert.equal(state.packs, initial.packs)
  assert.deepEqual(parseGameState(clone(state)), state)
})

test('practice random sampling covers every eligible continent without duplicate targets', () => {
  const continents = [...new Set(COUNTRIES.map(c => c.continent))].filter(id => COUNTRIES.filter(c => c.continent === id).length >= 5)
  for (let index = 0; index < continents.length; index++) {
    let call = 0
    const state = startPracticeTour(fresh(), 100, () => call++ === 0 ? (index + 0.5) / continents.length : 0.999999)
    assert.equal(state.dailyTours.practice.assignment.continent, continents[index])
    assert.equal(new Set(state.dailyTours.practice.assignment.countryIds).size, 5)
  }
})

test('legacy saves preserved; malformed or unsupported extension quarantines rewards and valid progress survives', () => {
  const base = fresh()
  assert.deepEqual(parseGameState(clone(base)), base)
  const good = play(startDailyTour(base, DAILY_EPOCH))
  const cases = [
    null, [], { version: 99, records: { future: { reward: true } } },
    { version: 1, records: [] },
    { version: 1, records: { '2026-10-23': { ...daily(good), rewards: { ...daily(good).rewards, applied: false } } } },
  ]
  for (const mutate of [
    run => { run.answers[0].km = -1 },
    run => { run.answers[0].answerId = 'jp' },
    run => { run.totalKm = 1 },
    run => { run.index = 0 },
    run => { run.assignment.countryIds.reverse() },
    run => { run.assignment.version = 2 },
    run => { run.pendingUnlockIds = ['xx'] },
    run => { run.assignment.expiresAt += 1 },
  ]) {
    const bad = clone(good.dailyTours)
    mutate(bad.records['2026-10-23'])
    cases.push(bad)
  }
  const warn = mock.method(console, 'warn', () => {})
  try {
    for (const bad of cases) {
      const state = parseGameState({ ...good, dailyTours: bad })
      assert.ok(state.dailyTours.blocked)
      assert.deepEqual(state.progress, good.progress)
      assert.deepEqual(state.dailyTours.quarantined, bad)
      assert.strictEqual(startDailyTour(state, DAILY_EPOCH + UTC_DAY_MS), state)
      assert.strictEqual(startPracticeTour(state, DAILY_EPOCH, () => 0), state)
      assert.strictEqual(answerDailyTour(state, 'gr', daily(good).id, 4, DAILY_EPOCH + 100), state)
      assert.deepEqual(parseGameState(clone(state)), state)
    }
    const both = parseGameState({ ...good, achievements: { version: 9 }, dailyTours: null })
    assert.equal(both.achievements, undefined)
    assert.equal(both.dailyTours.blocked, true)
  } finally { warn.mock.restore() }
})

test('every valid answer/feedback/completed/expired daily state survives persistence', () => {
  let state = startDailyTour(fresh(), DAILY_EPOCH)
  const run = daily(state)
  for (let index = 0; index < 5; index++) {
    assert.deepEqual(parseGameState(clone(state)), state)
    const expired = expireDailyTours(state, DAILY_EPOCH + UTC_DAY_MS)
    assert.deepEqual(parseGameState(clone(expired)), expired)
    state = answerDailyTour(state, run.assignment.countryIds[index], run.id, index, DAILY_EPOCH + index)
    assert.deepEqual(parseGameState(clone(state)), state)
    const expiredFeedback = expireDailyTours(state, DAILY_EPOCH + UTC_DAY_MS)
    assert.deepEqual(parseGameState(clone(expiredFeedback)), expiredFeedback)
    state = advanceDailyTour(state, run.id, DAILY_EPOCH + index)
  }
  assert.deepEqual(parseGameState(clone(state)), state)
})

test('learning resets retain outcomes and cannot reclaim completed rewards', () => {
  const complete = play(startDailyTour(fresh(), DAILY_EPOCH))
  const reset = resetCollection(complete, COUNTRIES, 'all', DAILY_EPOCH + 100, DEFAULT_CONFIG)
  assert.deepEqual(reset.dailyTours, complete.dailyTours)
  assert.deepEqual(reset.progress, {})
  assert.strictEqual(startDailyTour(reset, DAILY_EPOCH + 101), reset)
  assert.strictEqual(answerDailyTour(reset, 'gr', daily(complete).id, 4, DAILY_EPOCH + 102), reset)
  assert.deepEqual(advanceDailyTour(reset, daily(complete).id, DAILY_EPOCH + 103).progress, {})
})

test('daily unlock in existing normal challenge cannot duplicate a card unlock', () => {
  let state = fresh()
  state.progress.no = { stamps: 1, encounters: 0, unlockedAt: null }
  state = openPack(state, COUNTRIES, DAILY_EPOCH, () => 0, DEFAULT_CONFIG, 'no')
  state = play(startDailyTour(state, DAILY_EPOCH))
  assert.deepEqual(daily(state).rewards.unlockedIds, ['no'])
  state = answerContinent(state, 'europe', COUNTRIES, DAILY_EPOCH + 20, DEFAULT_CONFIG)
  state = answerCountry(state, 'no', DAILY_EPOCH + 21, DEFAULT_CONFIG)
  assert.equal(state.activeChallenge.unlocked, false)
  assert.equal(state.progress.no.stamps, 2)
})

test('daily discovery and unlocks feed existing discovery, collection, group and completion achievements only', () => {
  const state = fresh()
  for (const country of COUNTRIES) state.progress[country.id] = { stamps: 2, encounters: 0, unlockedAt: 1 }
  for (const id of getDailyAssignment(DAILY_EPOCH).countryIds) state.progress[id] = { stamps: 1, encounters: 0, unlockedAt: null }
  state.achievements.discovered = COUNTRIES.filter(c => !getDailyAssignment(DAILY_EPOCH).countryIds.includes(c.id)).map(c => c.id)
  state.achievements.collected = [...state.achievements.discovered]
  const complete = play(startDailyTour(state, DAILY_EPOCH))
  for (const id of ['first-card', 'collect-10', 'collect-50', 'all-continents', 'complete-continent', 'complete-atlas', 'legendary']) {
    assert.ok(complete.achievements.earned[id], id)
  }
  for (const id of ['first-encounter', 'encounters-25', 'perfect-5', 'recovery', 'wrong-continent', 'scenic-route']) {
    assert.equal(complete.achievements.earned[id], undefined, id)
  }
})

test('daily presentation crosses discovery achievement thresholds without regular encounter evidence', () => {
  const initial = fresh()
  initial.achievements.discovered = COUNTRIES.filter(c => c.id !== 'no').slice(0, 49).map(c => c.id)
  const started = startDailyTour(initial, DAILY_EPOCH)
  assert.equal(started.achievements.discovered.length, 50)
  assert.ok(started.achievements.earned['discover-10'])
  assert.ok(started.achievements.earned['discover-50'])
  assert.equal(started.achievements.earned['first-encounter'], undefined)
  assert.equal(started.achievements.encounters, 0)
})

test('nonfinite, fractional and out-of-range mutation clocks cannot create an unloadable run', () => {
  const initial = fresh()
  const started = startDailyTour(initial, DAILY_EPOCH)
  const run = daily(started)
  for (const now of [NaN, Infinity, -1, DAILY_EPOCH + 0.5, 8_640_000_000_000_000]) {
    assert.strictEqual(startDailyTour(initial, now), initial)
    assert.strictEqual(startPracticeTour(initial, now, () => 0), initial)
    assert.strictEqual(answerDailyTour(started, 'no', run.id, 0, now), started)
    assert.strictEqual(advanceDailyTour(started, run.id, now), started)
    assert.strictEqual(expireDailyTours(started, now), started)
  }
})

test('repository reload and serialized duplicate fifth submissions cannot reapply rewards', async () => {
  const warn = mock.method(console, 'warn', () => {})
  try {
    const repository = new LocalStorageRepository(memoryStorage())
    let state = startDailyTour(fresh(), DAILY_EPOCH)
    const run = daily(state)
    for (let index = 0; index < 4; index++) {
      state = answerDailyTour(state, run.assignment.countryIds[index], run.id, index, DAILY_EPOCH + index)
      state = advanceDailyTour(state, run.id, DAILY_EPOCH + index)
    }
    await repository.save(state)
    const submit = () => repository.update(fresh, s => answerDailyTour(s, 'gr', run.id, 4, DAILY_EPOCH + 10))
    await Promise.all([submit(), submit(), submit()])
    const loaded = await repository.load()
    assert.equal(daily(loaded).answers.length, 5)
    for (const id of run.assignment.countryIds) assert.equal(loaded.progress[id].stamps, 1)
    assert.equal(loaded.achievements.visitors, 5)
    assert.deepEqual(daily(loaded).rewards.stampedIds, run.assignment.countryIds)
  } finally { warn.mock.restore() }
})
