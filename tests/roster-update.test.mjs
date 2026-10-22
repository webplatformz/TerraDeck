import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
import { ALL_COUNTRIES, ARCHIVED_COUNTRIES, COUNTRIES, COUNTRY_BY_ID, COUNTRY_BY_MAP_NAME } from '../src/data/countries.ts'
import { createInitialState, openPack, answerContinent, answerCountry } from '../src/domain/challenge.ts'
import { DEFAULT_CONFIG } from '../src/domain/config.ts'
import { reconcileRoster } from '../src/domain/rosterUpdate.ts'
import { parseGameState } from '../src/persistence/validate.ts'
import { LocalStorageRepository } from '../src/persistence/LocalStorageRepository.ts'
import { achievementProgress, emptyAchievements, trackAchievements } from '../src/domain/achievements.ts'
import { addDebugPack } from '../src/domain/debug.ts'
import { isDiscovered } from '../src/domain/discovery.ts'
import { ACHIEVEMENT_GROUPS } from '../src/data/achievementGroups.ts'

const removed = ARCHIVED_COUNTRIES.map(c => c.id)
const challenge = (step, countryId = 'li') => ({
  countryId, startedAt: 100, step, continentAnswer: step === 'continent' ? null : 'europe',
  countryAnswer: step === 'result' ? countryId : null, outcome: step === 'result' ? 'stamp' : null, unlocked: step === 'result',
})
const initial = step => ({
  ...createInitialState(DEFAULT_CONFIG), packs: 2, refillAt: 5000,
  progress: { li: { stamps: step === 'result' ? 2 : 1, encounters: step === 'result' ? 3 : 2, discoveredAt: 100, unlockedAt: step === 'result' ? 200 : null } },
  activeChallenge: challenge(step), debugCountryId: 'mt',
  achievements: { ...emptyAchievements(), encounters: 42, perfect: 21, discovered: ['li', 'mt'], collected: ['mt'],
    misses: { li: 2 }, stampedContinents: ['europe'],
    earned: { 'small-5': { at: 90, target: 5, acknowledged: true }, 'complete-atlas': { at: 95, target: 190, acknowledged: false } } },
})

test('every archived catalog entry keeps metadata, numbering, rarity and flags, but cannot draw or debug-target', () => {
  for (const c of ARCHIVED_COUNTRIES) {
    assert.strictEqual(COUNTRY_BY_ID[c.id], c)
    assert.equal(COUNTRY_BY_MAP_NAME[c.mapName], undefined)
    assert.equal(ALL_COUNTRIES[c.number - 1].id, c.id)
    assert.throws(() => addDebugPack(createInitialState(DEFAULT_CONFIG), c.id, COUNTRIES, DEFAULT_CONFIG), /playable/)
    const state = reconcileRoster({ ...createInitialState(DEFAULT_CONFIG), activeChallenge: challenge('continent', c.id) }, removed, 1000, DEFAULT_CONFIG)
    assert.equal(state.activeChallenge, null)
    assert.equal(isDiscovered(state, c.id), true) // even an old challenge without a progress row remains discoverable
    assert.equal(state.progress[c.id], undefined)
  }
  const complete = createInitialState(DEFAULT_CONFIG)
  complete.progress = Object.fromEntries(COUNTRIES.map(c => [c.id, { stamps: 2, encounters: 2, unlockedAt: 100 }]))
  assert.equal(openPack(complete, COUNTRIES, 1000, () => 0, DEFAULT_CONFIG).activeChallenge, null)
  assert.ok(ARCHIVED_COUNTRIES.every(c => complete.progress[c.id] === undefined))
})

test('unfinished retired challenges refund once, retain every historical field and explain removed debug target', () => {
  for (const step of ['continent', 'country']) {
    const before = initial(step)
    const next = reconcileRoster(before, removed, 1000, DEFAULT_CONFIG)
    assert.equal(next.packs, 3)
    assert.equal(next.refillAt, 5000)
    assert.equal(next.activeChallenge, null)
    assert.deepEqual(next.retiredChallenge, before.activeChallenge)
    assert.deepEqual(next.progress, before.progress)
    assert.deepEqual(next.achievements, before.achievements)
    assert.equal(next.debugCountryId, undefined)
    assert.deepEqual(next.rosterNotice, { countryId: 'li', refunded: true, debugCountryId: 'mt' })
    const loaded = parseGameState(JSON.parse(JSON.stringify(next)))
    assert.strictEqual(reconcileRoster(loaded, removed, 1001, DEFAULT_CONFIG), loaded)
    const dismissed = { ...loaded, rosterNotice: undefined }
    assert.strictEqual(reconcileRoster(dismissed, removed, 1002, DEFAULT_CONFIG), dismissed)
  }
})

test('refund reconciles elapsed refills first, caps at five and preserves shorter future deadlines', () => {
  const full = reconcileRoster({ ...initial('country'), packs: 4 }, removed, 1000, DEFAULT_CONFIG)
  assert.equal(full.packs, 5)
  assert.equal(full.refillAt, null)
  const accrued = reconcileRoster({ ...initial('continent'), packs: 3, refillAt: 500 }, removed, 1000, DEFAULT_CONFIG)
  assert.equal(accrued.packs, 5)
  assert.equal(accrued.refillAt, null)
  const noDeadline = reconcileRoster({ ...initial('country'), packs: 1, refillAt: null }, removed, 1000, DEFAULT_CONFIG)
  assert.equal(noDeadline.packs, 2)
  assert.equal(noDeadline.refillAt, 1000 + DEFAULT_CONFIG.cooldownMs)
})

test('completed retired results are preserved without refunds, awards or unlock replays', () => {
  for (const outcome of ['stamp', 'missed']) {
    const before = initial('result')
    before.activeChallenge = { ...before.activeChallenge, outcome, unlocked: outcome === 'stamp' }
    const next = reconcileRoster(before, removed, 1000, DEFAULT_CONFIG)
    assert.equal(next.packs, 2)
    assert.equal(next.activeChallenge, null)
    assert.deepEqual(next.retiredChallenge, before.activeChallenge)
    assert.equal(next.rosterNotice.refunded, false)
    assert.deepEqual(next.progress, before.progress)
    assert.deepEqual(next.achievements, before.achievements)
    assert.strictEqual(trackAchievements(before, next, COUNTRIES, 1000), next)
  }
})

test('a queued debug removal alone leaves a retained active challenge untouched', () => {
  const before = { ...initial('country'), activeChallenge: challenge('country', 'fr') }
  const next = reconcileRoster(before, removed, 1000, DEFAULT_CONFIG)
  assert.strictEqual(next.activeChallenge, before.activeChallenge)
  assert.equal(next.packs, before.packs)
  assert.deepEqual(next.rosterNotice, { debugCountryId: 'mt' })
  assert.equal(next.retiredChallenge, undefined)
  assert.strictEqual(reconcileRoster({ ...before, debugCountryId: 'ch' }, removed, 1000, DEFAULT_CONFIG).activeChallenge, before.activeChallenge)
})

test('small-country goal is exactly three of seven retained countries; frozen earned targets survive', () => {
  assert.deepEqual([...ACHIEVEMENT_GROUPS.small].sort(), ['bn', 'cv', 'cy', 'lu', 'ps', 'tt', 'ws'])
  const state = { ...createInitialState(DEFAULT_CONFIG), achievements: emptyAchievements() }
  state.achievements.collected = ['li', 'sm', 'ad', 'mt', 'sg', 'lu', 'bn']
  assert.deepEqual(achievementProgress('small-5', state, COUNTRIES), { current: 2, target: 3 })
  state.achievements.collected.push('cv')
  assert.deepEqual(achievementProgress('small-5', state, COUNTRIES), { current: 3, target: 3 })
  const before = initial('country')
  const next = reconcileRoster(before, removed, 1000, DEFAULT_CONFIG)
  assert.deepEqual(next.achievements.earned, before.achievements.earned)
  assert.deepEqual(achievementProgress('complete-atlas', next, COUNTRIES), { current: 0, target: 168 })
  assert.deepEqual(next.achievements.discovered, ['li', 'mt'])
  assert.deepEqual(next.achievements.misses, { li: 2 })
})

test('retained-country encounters continue ordinary mastery and achievement progression after migration', () => {
  let state = reconcileRoster(initial('country'), removed, 1000, DEFAULT_CONFIG)
  const opened = openPack(state, COUNTRIES, 1001, () => 0, DEFAULT_CONFIG)
  state = trackAchievements(state, opened, COUNTRIES, 1001)
  const continent = answerContinent(state, 'europe', COUNTRIES, 1002, DEFAULT_CONFIG)
  const result = trackAchievements(continent, answerCountry(continent, 'fr', 1003, DEFAULT_CONFIG), COUNTRIES, 1003)
  assert.equal(result.progress.fr.stamps, 1)
  assert.deepEqual(result.progress.li, state.progress.li)
  assert.equal(result.achievements.encounters, 43)
  assert.deepEqual(result.achievements.earned['small-5'], state.achievements.earned['small-5'])
})

test('lowered locked goals do not award on migration; the next real activity may earn the three-card badge', () => {
  const before = initial('country')
  before.achievements.earned = {}
  before.achievements.collected = ['bn', 'cv', 'lu']
  before.progress.lu = { stamps: 2, encounters: 2, unlockedAt: 123 }
  const migrated = reconcileRoster(before, removed, 1000, DEFAULT_CONFIG)
  assert.deepEqual(migrated.achievements.earned, {})
  assert.deepEqual(achievementProgress('small-5', migrated, COUNTRIES), { current: 3, target: 3 })
  assert.deepEqual(achievementProgress('complete-continent', migrated, COUNTRIES), { current: 1, target: 37 })
  assert.deepEqual(achievementProgress('complete-atlas', migrated, COUNTRIES), { current: 1, target: 168 })
  const opened = openPack(migrated, COUNTRIES, 1001, () => 0, DEFAULT_CONFIG)
  const continent = answerContinent(opened, 'europe', COUNTRIES, 1002, DEFAULT_CONFIG)
  const result = trackAchievements(continent, answerCountry(continent, 'fr', 1003, DEFAULT_CONFIG), COUNTRIES, 1003)
  assert.deepEqual(result.achievements.earned['small-5'], { at: 1003, target: 3, acknowledged: false })
  assert.equal(result.achievements.earned['complete-atlas'], undefined)
})

test('cross-tab migration transactions cannot refund twice or reintroduce retired challenges', async () => {
  const values = new Map()
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  const queues = new Map()
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: { request(key, fn) {
    const next = (queues.get(key) ?? Promise.resolve()).then(fn)
    queues.set(key, next.catch(() => {}))
    return next
  } } } })
  try {
    const a = new LocalStorageRepository(storage)
    const b = new LocalStorageRepository(storage)
    await a.save(initial('continent'))
    const migrate = state => reconcileRoster(state, removed, 1000, DEFAULT_CONFIG)
    await Promise.all([a.update(() => initial('continent'), migrate), b.update(() => initial('continent'), migrate)])
    const saved = await a.load()
    assert.equal(saved.packs, 3)
    assert.equal(saved.activeChallenge, null)
    assert.equal(saved.retiredChallenge.countryId, 'li')
    assert.deepEqual(saved.progress, initial('continent').progress)
    await b.update(() => initial('continent'), s => ({ ...migrate(s), rosterNotice: undefined }))
    assert.equal((await a.update(() => initial('continent'), migrate)).rosterNotice, undefined)
  } finally {
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator)
    else delete globalThis.navigator
  }
})

test('malformed roster extensions do not discard otherwise valid game progress', () => {
  const warning = mock.method(console, 'warn', () => {})
  try {
    const state = { ...initial('country'), retiredChallenge: { countryId: 'li' }, rosterNotice: 'bad' }
    const parsed = parseGameState(state)
    assert.deepEqual(parsed.progress, state.progress)
    assert.deepEqual(parsed.activeChallenge, state.activeChallenge)
    assert.equal(parsed.retiredChallenge, undefined)
    assert.equal(parsed.rosterNotice, undefined)
    assert.equal(warning.mock.callCount(), 2)
    const result = challenge('result')
    const validResult = parseGameState({ ...state, retiredChallenge: result })
    assert.deepEqual(validResult.retiredChallenge, result)
    const notice = { countryId: 'li', refunded: false }
    const validNotice = parseGameState({ ...state, rosterNotice: notice })
    assert.deepEqual(validNotice.rosterNotice, notice)
  } finally { warning.mock.restore() }
})
