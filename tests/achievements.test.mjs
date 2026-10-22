import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ACHIEVEMENT_IDS, ACHIEVEMENT_CATEGORIES, achievementCategory, achievementProgress, emptyAchievements, trackAchievements, acknowledgeAchievements } from '../src/domain/achievements.ts'
import { createInitialState, openPack, answerContinent, answerCountry, dismissChallenge } from '../src/domain/challenge.ts'
import { DEFAULT_CONFIG } from '../src/domain/config.ts'
import { COUNTRIES } from '../src/data/countries.ts'
import { ACHIEVEMENT_GROUPS } from '../src/data/achievementGroups.ts'
import { parseGameState } from '../src/persistence/validate.ts'
import { LocalStorageRepository, STORAGE_KEY } from '../src/persistence/LocalStorageRepository.ts'
import { routeFromHash, mainHash } from '../src/game/navigation.ts'

const fresh = () => ({ ...createInitialState(DEFAULT_CONFIG), achievements: emptyAchievements() })
let now = 1000
function begin(state, country = COUNTRIES[0], roster = COUNTRIES) {
  const before = { ...dismissChallenge(state), packs: 5 }
  return trackAchievements(before, openPack(before, [country], ++now, () => 0, DEFAULT_CONFIG), roster, now)
}
function finish(state, country = COUNTRIES[0], outcome = 'perfect', roster = COUNTRIES) {
  const continent = outcome === 'continent-miss' ? (country.continent === 'asia' ? 'africa' : 'asia') : country.continent
  let next = answerContinent(state, continent, roster, ++now, DEFAULT_CONFIG)
  next = trackAchievements(state, next, roster, now)
  if (outcome === 'continent-miss') return next
  const result = answerCountry(next, outcome === 'perfect' ? country.id : 'wrong', ++now, DEFAULT_CONFIG)
  return trackAchievements(next, result, roster, now)
}
const encounter = (state, country = COUNTRIES[0], outcome = 'perfect', roster = COUNTRIES) => finish(begin(state, country, roster), country, outcome, roster)
const earned = (state, id) => !!state.achievements.earned[id]
const memoryStorage = () => {
  const map = new Map()
  return { getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, v), removeItem: k => map.delete(k) }
}

test('20 stable IDs, four coherent categories and complete bilingual definitions', () => {
  assert.equal(ACHIEVEMENT_IDS.length, 20)
  assert.equal(new Set(ACHIEVEMENT_IDS).size, 20)
  for (const c of ACHIEVEMENT_CATEGORIES) assert.equal(ACHIEVEMENT_IDS.filter(id => achievementCategory(id) === c).length, 5)
  const en = JSON.parse(readFileSync(new URL('../src/i18n/locales/en.json', import.meta.url)))
  const de = JSON.parse(readFileSync(new URL('../src/i18n/locales/de.json', import.meta.url)))
  assert.deepEqual(Object.keys(en.achievements), Object.keys(de.achievements))
  for (const locale of [en, de]) {
    assert.ok(locale.nav.achievements)
    assert.deepEqual(Object.keys(locale.achievements.badges).sort(), [...ACHIEVEMENT_IDS].sort())
    for (const id of ACHIEVEMENT_IDS) {
      assert.ok(locale.achievements.badges[id].name)
      assert.ok(locale.achievements.badges[id].description)
    }
    for (const id of ['wrong-continent', 'scenic-route']) assert.ok(locale.achievements.badges[id].hint)
  }
  assert.equal(routeFromHash(mainHash('achievements')).screen, 'achievements')
})

test('discovery counts on opening; feedback awards first encounter even after a mistake', () => {
  let state = begin(fresh())
  assert.equal(state.achievements.discovered.length, 1)
  assert.equal(state.achievements.encounters, 0)
  assert.equal(earned(state, 'first-encounter'), false)
  state = finish(state, COUNTRIES[0], 'continent-miss')
  assert.equal(earned(state, 'first-encounter'), true)
  assert.equal(earned(state, 'wrong-continent'), true)
  assert.equal(state.achievements.perfect, 0)
  assert.equal(state.progress.fr.stamps, 0)
  assert.equal(earned(state, 'first-visitor'), false)
})

test('simultaneous awards, retries, reloads and acknowledgements are idempotent', () => {
  const result = encounter(fresh())
  assert.equal(earned(result, 'first-encounter'), true)
  assert.equal(earned(result, 'first-visitor'), true)
  assert.equal(Object.keys(result.achievements.earned).length, 2)
  const loaded = parseGameState(JSON.parse(JSON.stringify(result)))
  const noOp = answerCountry(loaded, 'fr', ++now, DEFAULT_CONFIG)
  assert.strictEqual(trackAchievements(loaded, noOp, COUNTRIES, now), loaded)
  const acknowledged = acknowledgeAchievements(loaded, ['first-encounter', 'first-visitor'])
  assert.ok(acknowledged.achievements.earned['first-visitor'].acknowledged)
  assert.strictEqual(acknowledgeAchievements(acknowledged, ['first-visitor']), acknowledged)
  const later = encounter(acknowledged)
  assert.deepEqual(later.achievements.earned['first-visitor'], acknowledged.achievements.earned['first-visitor'])
  assert.equal(earned(later, 'first-card'), true)
})

test('perfect five is cumulative, mistakes keep progress, and unfinished encounters do not count', () => {
  let state = fresh()
  for (let i = 0; i < 4; i++) {
    state = encounter(state, COUNTRIES[i])
    state = encounter(state, COUNTRIES[i], 'country-miss')
  }
  assert.equal(state.achievements.perfect, 4)
  assert.equal(earned(state, 'perfect-5'), false)
  const opened = begin(state, COUNTRIES[4])
  assert.equal(opened.achievements.perfect, 4)
  state = finish(parseGameState(JSON.parse(JSON.stringify(opened))), COUNTRIES[4])
  assert.equal(earned(state, 'perfect-5'), true)
  assert.deepEqual(achievementProgress('perfect-5', state, COUNTRIES), { current: 5, target: 5 })
})

test('recovery and scenic route require new miss evidence, with the exact three-miss threshold', () => {
  let state = encounter(fresh(), COUNTRIES[0], 'country-miss')
  state = encounter(state)
  assert.equal(earned(state, 'recovery'), true)
  state = encounter(state, COUNTRIES[0], 'continent-miss')
  const twoMisses = encounter(state)
  assert.equal(earned(twoMisses, 'scenic-route'), false)
  state = encounter(state, COUNTRIES[0], 'country-miss')
  state = encounter(state)
  assert.equal(earned(state, 'scenic-route'), true)
})

test('legacy saves do not backfill; existing active encounters may finish without replaying results', () => {
  let legacy = createInitialState(DEFAULT_CONFIG)
  legacy.progress.fr = { stamps: 1, encounters: 25, discoveredAt: 100, unlockedAt: null }
  legacy.progress.ch = { stamps: 3, encounters: 9, unlockedAt: 200 }
  assert.deepEqual(parseGameState(legacy), legacy)
  let state = begin(legacy)
  assert.equal(state.achievements, undefined) // known discovery alone does not create historical evidence
  state = finish(state)
  assert.equal(state.achievements.encounters, 1)
  assert.deepEqual(state.achievements.collected, ['fr'])
  assert.equal(earned(state, 'first-visitor'), false)
  assert.equal(earned(state, 'recovery'), false)
  assert.equal(earned(state, 'scenic-route'), false)
  assert.equal(earned(state, 'legendary'), false)
  assert.equal(earned(state, 'encounters-25'), false)
  assert.deepEqual(state.progress.ch, legacy.progress.ch)
  assert.strictEqual(trackAchievements(state, state, COUNTRIES, ++now), state)
})

test('discovery 10/50, encounter 25 and collection 10/50 thresholds are exact', () => {
  let state = fresh()
  for (let i = 0; i < 50; i++) {
    state = encounter(state, COUNTRIES[i])
    assert.equal(earned(state, 'discover-10'), i >= 9)
    assert.equal(earned(state, 'discover-50'), i >= 49)
    assert.equal(earned(state, 'encounters-25'), i * 2 + 1 >= 25)
    state = encounter(state, COUNTRIES[i])
    assert.equal(earned(state, 'collect-10'), i >= 9)
    assert.equal(earned(state, 'collect-50'), i >= 49)
  }
  assert.deepEqual(achievementProgress('collect-50', state, COUNTRIES), { current: 50, target: 50 })
})

test('resumed already-collected legacy encounters count a perfect answer, not a nonexistent new stamp', () => {
  const state = fresh()
  state.progress.fr = { stamps: 3, encounters: 4, unlockedAt: 10 }
  state.activeChallenge = {
    countryId: 'fr', startedAt: 5, step: 'continent', continentAnswer: null,
    countryAnswer: null, outcome: null, unlocked: false,
  }
  const result = finish(state)
  assert.equal(result.progress.fr.stamps, 3)
  assert.equal(result.achievements.perfect, 1)
  assert.equal(result.achievements.visitors, 0)
  assert.deepEqual(result.achievements.stampedContinents, [])
  assert.deepEqual(result.achievements.collected, [])
})

test('explicit groups contain unique playable IDs and match reviewed size/landlocked conventions', () => {
  const snapshot = JSON.parse(readFileSync(new URL('../scripts/atlas/snapshot.json', import.meta.url)))
  const playable = new Set(COUNTRIES.map(c => c.id))
  for (const ids of Object.values(ACHIEVEMENT_GROUPS)) {
    assert.equal(ids.length, new Set(ids).size)
    assert.ok(ids.every(id => playable.has(id)))
  }
  const expected = predicate => snapshot.countries.filter(c => playable.has(c.id) && predicate(c)).map(c => c.id).sort()
  assert.deepEqual([...ACHIEVEMENT_GROUPS.small].sort(), expected(c => c.areaKm2 <= 10000))
  assert.deepEqual([...ACHIEVEMENT_GROUPS.landlocked].sort(), expected(c => c.landlocked))
  for (const id of ['ie', 'gb', 'ht', 'do', 'bn', 'id', 'pg', 'tl']) assert.ok(ACHIEVEMENT_GROUPS.islands.includes(id))
  assert.equal(ACHIEVEMENT_GROUPS.islands.includes('au'), false)
  for (const group of ['small', 'landlocked', 'islands']) {
    let state = fresh()
    for (const [i, id] of ACHIEVEMENT_GROUPS[group].slice(0, 5).entries()) {
      const country = COUNTRIES.find(c => c.id === id)
      state = encounter(encounter(state, country), country)
      assert.equal(earned(state, `${group}-5`), i === 4)
    }
  }
})

test('six-continent and Legendary awards count only new stamps and collections', () => {
  let state = fresh()
  const continents = [...new Set(COUNTRIES.map(c => c.continent))]
  for (const [i, continent] of continents.entries()) {
    const country = COUNTRIES.find(c => c.continent === continent)
    state = encounter(state, country)
    assert.equal(earned(state, 'stamp-continents'), i === 5)
    state = encounter(state, country)
    assert.equal(earned(state, 'all-continents'), i === 5)
  }
  const legendary = COUNTRIES.find(c => c.rarity === 'legendary')
  state = encounter(state, legendary)
  assert.equal(earned(state, 'legendary'), false)
  state = encounter(state, legendary)
  assert.equal(earned(state, 'legendary'), true)
})

test('completion uses the current roster, checks only a new unlock, and stays earned after expansion', () => {
  const roster = COUNTRIES.slice(0, 2)
  let state = fresh()
  state.progress.fr = { stamps: 2, encounters: 2, unlockedAt: 10 }
  state = encounter(state, roster[1], 'country-miss', roster)
  assert.equal(earned(state, 'complete-continent'), false)
  state = encounter(state, roster[1], 'perfect', roster)
  assert.equal(earned(state, 'complete-atlas'), false)
  state = encounter(state, roster[1], 'perfect', roster)
  assert.equal(earned(state, 'complete-continent'), true)
  assert.equal(earned(state, 'complete-atlas'), true)
  const award = { ...state.achievements.earned['complete-atlas'] }
  assert.equal(award.target, 2)
  state = encounter(state, COUNTRIES[2])
  assert.deepEqual(state.achievements.earned['complete-atlas'], award)
  assert.equal(state.achievements.collected.length, 1)
})

test('full 190-country playthrough completes the atlas without changing mastery or economy', () => {
  let state = fresh()
  for (const country of COUNTRIES) state = encounter(encounter(state, country), country)
  assert.equal(state.achievements.collected.length, 190)
  assert.equal(state.achievements.perfect, 380)
  assert.equal(earned(state, 'complete-atlas'), true)
  assert.equal(state.achievements.earned['complete-atlas'].target, 190)
  assert.ok(COUNTRIES.every(c => state.progress[c.id].stamps === 2))
})

test('invalid achievement extensions never discard valid country progress', () => {
  const warning = mock.method(console, 'warn', () => {})
  try {
    const state = encounter(fresh())
    for (const invalid of [{ version: 999 }, { ...state.achievements, encounters: -1 }, { ...state.achievements, earned: { 'first-card': { at: 'bad' } } }, { ...state.achievements, earned: { 'first-card': { at: Number.MAX_SAFE_INTEGER, target: 1, acknowledged: false } } }]) {
      const loaded = parseGameState({ ...state, achievements: invalid })
      assert.deepEqual(loaded.progress, state.progress)
      assert.deepEqual(loaded.activeChallenge, state.activeChallenge)
      assert.equal(loaded.achievements, undefined)
    }
    assert.equal(warning.mock.callCount(), 4)
  } finally { warning.mock.restore() }
})

test('unknown future badge IDs survive validation and subsequent evaluations', () => {
  const state = fresh()
  state.achievements.earned['future-badge'] = { at: 100, target: 5, acknowledged: true }
  const loaded = parseGameState(JSON.parse(JSON.stringify(state)))
  assert.deepEqual(encounter(loaded).achievements.earned['future-badge'], state.achievements.earned['future-badge'])
})

test('serialized cross-tab transactions prevent duplicate encounters and acknowledgement resurrection', async () => {
  const storage = memoryStorage()
  const queues = new Map()
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { locks: { request(key, callback) {
      const result = (queues.get(key) ?? Promise.resolve()).then(callback)
      queues.set(key, result.catch(() => {}))
      return result
    } } },
  })
  try {
    const a = new LocalStorageRepository(storage)
    const b = new LocalStorageRepository(storage)
    const initial = begin(fresh())
    await a.save(initial)
    const change = state => finish(state)
    await Promise.all([a.update(fresh, change), b.update(fresh, change)])
    let saved = await a.load()
    assert.equal(saved.achievements.encounters, 1)
    assert.equal(saved.progress.fr.stamps, 1)
    const date = saved.achievements.earned['first-visitor'].at
    await Promise.all([
      a.update(fresh, state => acknowledgeAchievements(state, ['first-visitor'])),
      b.update(fresh, state => ({ ...state, packs: 4 })),
    ])
    saved = await b.load()
    assert.equal(saved.achievements.earned['first-visitor'].acknowledged, true)
    assert.equal(saved.achievements.earned['first-visitor'].at, date)
    assert.equal(saved.packs, 4)
    assert.ok(storage.getItem(STORAGE_KEY))
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'navigator', descriptor)
    else delete globalThis.navigator
  }
})

test('blocked or full storage preserves session progress instead of rereading an obsolete save', async () => {
  const warning = mock.method(console, 'warn', () => {})
  try {
    const old = fresh()
    const storage = { getItem: () => JSON.stringify(old), setItem() { throw new Error('quota') } }
    const repo = new LocalStorageRepository(storage)
    const first = await repo.update(fresh, state => encounter(state))
    const second = await repo.update(fresh, state => encounter(state))
    assert.equal(first.progress.fr.stamps, 1)
    assert.equal(second.progress.fr.stamps, 2)
    assert.equal(second.achievements.encounters, 2)
  } finally { warning.mock.restore() }
})
