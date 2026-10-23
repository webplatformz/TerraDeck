import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ALL_COUNTRIES, COUNTRIES } from '../src/data/countries.ts'
import { resetCollection } from '../src/domain/resetCollection.ts'
import { createInitialState, openPack, answerContinent, answerCountry } from '../src/domain/challenge.ts'
import { DEFAULT_CONFIG } from '../src/domain/config.ts'
import { achievementProgress, emptyAchievements, trackAchievements } from '../src/domain/achievements.ts'
import { isDiscovered } from '../src/domain/discovery.ts'
import { parseGameState } from '../src/persistence/validate.ts'
import { LocalStorageRepository } from '../src/persistence/LocalStorageRepository.ts'

const challenge = (id, step = 'country') => ({
  countryId: id, startedAt: 10, step, continentAnswer: 'europe', countryAnswer: step === 'result' ? id : null,
  outcome: step === 'result' ? 'stamp' : null, unlocked: step === 'result',
})
function fixture() {
  return {
    ...createInitialState(DEFAULT_CONFIG),
    packs: 2, refillAt: 5000,
    progress: Object.fromEntries(['fr', 'li', 'jp', 'sg', 'zz'].map(id =>
      [id, { discoveredAt: 10, stamps: 2, encounters: 3, unlockedAt: 100 }])),
    recentIds: ['fr', 'li', 'jp', 'sg'],
    activeChallenge: challenge('fr'),
    retiredChallenge: challenge('li', 'result'),
    rosterNotice: { countryId: 'li', refunded: false, debugCountryId: 'sg' },
    achievements: {
      ...emptyAchievements(), encounters: 42, perfect: 21, visitors: 12, discovered: ['fr', 'li', 'jp'],
      collected: ['fr', 'li', 'jp'], misses: { fr: 1 },
      earned: { 'first-card': { at: 123, target: 1, acknowledged: true }, 'complete-atlas': { at: 124, target: 190, acknowledged: false } },
    },
  }
}
const reset = (state, scope = 'all', now = 1000) => resetCollection(state, ALL_COUNTRIES, scope, now, DEFAULT_CONFIG)

test('reset all clears every discovery, card, stamp, archive and recent ID without touching achievements', () => {
  const before = fixture()
  const next = reset(before)
  assert.deepEqual(next.progress, {})
  assert.deepEqual(next.recentIds, [])
  assert.equal(next.retiredChallenge, undefined)
  assert.equal(next.rosterNotice, undefined)
  assert.equal(isDiscovered(next, 'li'), false)
  assert.deepEqual({ ...next.achievements, completionCollected: undefined }, { ...before.achievements, completionCollected: undefined })
  assert.deepEqual(parseGameState(JSON.parse(JSON.stringify(next))).achievements, next.achievements)
  assert.deepEqual(achievementProgress('complete-atlas', next, COUNTRIES), achievementProgress('complete-atlas', before, COUNTRIES))
  assert.equal(before.progress.fr.stamps, 2)
})

test('continent reset includes its archives while preserving every other continent and unrelated notice', () => {
  const before = fixture()
  const next = reset(before, 'europe')
  assert.deepEqual(Object.keys(next.progress).sort(), ['jp', 'sg', 'zz'])
  assert.deepEqual(next.progress.jp, before.progress.jp)
  assert.deepEqual(next.recentIds, ['jp', 'sg'])
  assert.equal(next.retiredChallenge, undefined)
  assert.deepEqual(next.rosterNotice, { debugCountryId: 'sg' })
  assert.deepEqual(next.achievements.earned, before.achievements.earned)
  assert.deepEqual(achievementProgress('complete-continent', next, COUNTRIES), achievementProgress('complete-continent', before, COUNTRIES))
})

test('affected unfinished steps refund once, cap stock and reconcile deadlines using normal rules', () => {
  for (const step of ['continent', 'country']) {
    const before = { ...fixture(), activeChallenge: challenge('fr', step) }
    const next = reset(before, 'europe')
    assert.equal(next.packs, 3)
    assert.equal(next.refillAt, 5000)
    assert.equal(next.activeChallenge, null)
    assert.deepEqual(reset(next, 'europe'), next)
    assert.equal(reset({ ...before, packs: 4 }).refillAt, null)
    assert.equal(reset({ ...before, packs: 5 }).packs, 5)
    const elapsed = reset({ ...before, packs: 3, refillAt: 500 })
    assert.equal(elapsed.packs, 5)
    assert.equal(elapsed.refillAt, null)
  }
})

test('completed results never refund and unrelated active encounters and pack deadlines remain intact', () => {
  const before = fixture()
  const done = reset({ ...before, activeChallenge: challenge('fr', 'result') })
  assert.equal(done.activeChallenge, null)
  assert.equal(done.packs, 2)
  assert.equal(done.refillAt, 5000)
  const unrelated = reset({ ...before, activeChallenge: challenge('jp') }, 'europe')
  assert.deepEqual(unrelated.activeChallenge, challenge('jp'))
  assert.equal(unrelated.packs, 2)
  assert.equal(unrelated.refillAt, 5000)
  const noChallenge = reset({ ...before, activeChallenge: null })
  assert.equal(noChallenge.packs, 2)
  assert.equal(noChallenge.refillAt, 5000)
})

test('reset countries reenter draws; repeated activity counts without duplicate historical collection IDs or awards', () => {
  const before = fixture()
  const fresh = reset(before)
  const opened = trackAchievements(fresh, openPack(fresh, COUNTRIES, 1001, () => 0, DEFAULT_CONFIG), COUNTRIES, 1001)
  assert.equal(opened.activeChallenge.countryId, 'fr')
  assert.equal(opened.progress.fr.stamps, 0)
  const continent = answerContinent(opened, 'europe', COUNTRIES, 1002, DEFAULT_CONFIG)
  const done = trackAchievements(continent, answerCountry(continent, 'fr', 1003, DEFAULT_CONFIG), COUNTRIES, 1003)
  assert.equal(done.progress.fr.stamps, 1)
  assert.equal(done.achievements.encounters, before.achievements.encounters + 1)
  assert.equal(done.achievements.perfect, before.achievements.perfect + 1)
  assert.deepEqual(done.achievements.earned['complete-atlas'], before.achievements.earned['complete-atlas'])
  assert.equal(done.achievements.collected.filter(id => id === 'fr').length, 1)
  assert.equal(done.achievements.discovered.filter(id => id === 'fr').length, 1)
})

test('serialized repository resets preserve latest achievement awards and cannot double-refund', async () => {
  const values = new Map()
  const storage = { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) }
  const repository = new LocalStorageRepository(storage)
  await repository.save(fixture())
  const original = fixture().achievements
  await Promise.all([
    repository.update(fixture, state => ({ ...state, achievements: { ...state.achievements, encounters: 43 } })),
    repository.update(fixture, state => reset(state, 'europe')),
    repository.update(fixture, state => reset(state, 'europe')),
  ])
  const saved = await repository.load()
  assert.equal(saved.packs, 3)
  assert.equal(saved.achievements.encounters, 43)
  assert.deepEqual(saved.achievements.earned, original.earned)
  assert.deepEqual(Object.keys(saved.progress).sort(), ['jp', 'sg', 'zz'])
})
