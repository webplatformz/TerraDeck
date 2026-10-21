import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_CONFIG, DEBUG_CONFIG } from '../src/domain/config.ts'
import { MASTERY_STAGES, MASTERY_STAMP_COUNT, displayedStamps } from '../src/domain/mastery.ts'
import { createInitialState, openPack, answerContinent, answerCountry, dismissChallenge, syncPacks } from '../src/domain/challenge.ts'
import { reconcilePacks } from '../src/domain/packRefill.ts'
import { isCollected, pickCountry } from '../src/domain/selection.ts'
import { parseGameState } from '../src/persistence/validate.ts'

const roster = [{ id: 'fr', continent: 'europe', rarity: 'common' }]
const config = DEFAULT_CONFIG
const minute = 60_000
const savedProgress = (stamps, unlockedAt = null) => ({ stamps, unlockedAt, encounters: 4, discoveredAt: 100 })
const round = (state, now) => answerCountry(
  answerContinent(openPack(state, roster, now, () => 0, config), 'europe', roster, now + 1, config),
  'fr', now + 2, config,
)

test('Visitor then Explorer unlock on exactly two encounters, persist and leave the pool', () => {
  assert.deepEqual(MASTERY_STAGES.map(s => s.id), ['visitor', 'explorer'])
  assert.equal(MASTERY_STAMP_COUNT, 2)
  assert.equal(config.stampsToUnlock, 2)
  const first = round(createInitialState(config), 1000)
  assert.equal(first.progress.fr.stamps, 1)
  assert.equal(first.activeChallenge.unlocked, false)
  assert.equal(first.progress.fr.unlockedAt, null)
  const second = round(dismissChallenge(parseGameState(JSON.parse(JSON.stringify(first)))), 2000)
  assert.equal(second.progress.fr.stamps, 2)
  assert.equal(second.progress.fr.unlockedAt, 2002)
  assert.equal(second.activeChallenge.unlocked, true)
  assert.equal(second.progress.fr.discoveredAt, 1000)
  assert.equal(pickCountry(roster, second.progress, [], () => 0, 2, 3), null)
  assert.equal(openPack(dismissChallenge(second), roster, 3000, () => 0, config).activeChallenge, null)
})

test('legacy zero/one/two/three stamp saves preserve history, cap display and collect at two', () => {
  for (const stamps of [0, 1, 2, 3]) {
    const state = {
      ...createInitialState(config),
      progress: { fr: savedProgress(stamps, stamps === 3 ? 777 : null) },
    }
    const loaded = parseGameState(JSON.parse(JSON.stringify(state)))
    assert.deepEqual(loaded, state)
    assert.equal(displayedStamps(loaded.progress.fr.stamps), Math.min(stamps, 2))
    assert.equal(isCollected(loaded.progress.fr, config.stampsToUnlock), stamps >= 2)
    assert.equal(loaded.activeChallenge, null)
    if (stamps >= 2) assert.equal(openPack(loaded, roster, 1000, () => 0, config).activeChallenge, null)
  }
})

test('already-active legacy challenges neither reduce earned counts nor create duplicate unlock dates', () => {
  for (const stamps of [2, 3]) {
    const state = {
      ...createInitialState(config),
      progress: { fr: savedProgress(stamps, stamps === 3 ? 777 : null) },
      activeChallenge: {
        countryId: 'fr', startedAt: 500, step: 'continent', continentAnswer: null,
        countryAnswer: null, outcome: null, unlocked: false,
      },
    }
    const resumed = parseGameState(JSON.parse(JSON.stringify(state)))
    const selected = answerContinent(resumed, 'europe', roster, 1000, config)
    for (const answer of ['fr', 'it']) {
      const finished = answerCountry(selected, answer, 1001, config)
      assert.equal(finished.progress.fr.stamps, stamps)
      assert.equal(finished.progress.fr.unlockedAt, state.progress.fr.unlockedAt)
      assert.equal(finished.progress.fr.encounters, 5)
      assert.equal(finished.activeChallenge.unlocked, false)
    }
  }
})

test('normal refill is exactly 15 minutes, debug remains 10 seconds, full capacity remains five', () => {
  assert.equal(config.cooldownMs, 15 * minute)
  assert.equal(DEBUG_CONFIG.cooldownMs, 10_000)
  assert.equal(config.maxPacks, 5)
  for (const rules of [config, DEBUG_CONFIG]) {
    const opened = openPack(createInitialState(rules), roster, 1000, () => 0, rules)
    assert.equal(opened.packs, 4)
    assert.equal(opened.refillAt, 1000 + rules.cooldownMs)
    assert.equal(syncPacks(opened, opened.refillAt - 1, rules).packs, 4)
    const filled = syncPacks(opened, opened.refillAt, rules)
    assert.equal(filled.packs, 5)
    assert.equal(filled.refillAt, null)
  }
})

test('offline refills accrue at the new interval and stop at five', () => {
  const stock = { packs: 0, refillAt: 15 * minute }
  assert.deepEqual(reconcilePacks(stock, 45 * minute, config), { packs: 3, refillAt: 60 * minute })
  assert.deepEqual(reconcilePacks(stock, 75 * minute, config), { packs: 5, refillAt: null })
  assert.deepEqual(reconcilePacks(stock, 300 * minute, config), { packs: 5, refillAt: null })
  assert.deepEqual(reconcilePacks({ packs: 5, refillAt: 1 }, 1000, config), { packs: 5, refillAt: null })
})

test('legacy future deadlines are capped without postponing shorter waits or granting early packs', () => {
  const legacy = { packs: 2, refillAt: 30 * minute }
  const adapted = reconcilePacks(legacy, 0, config)
  assert.deepEqual(adapted, { packs: 2, refillAt: 15 * minute })
  assert.deepEqual(reconcilePacks(adapted, minute, config), adapted)
  assert.deepEqual(reconcilePacks(adapted, 15 * minute - 1, config), adapted)
  assert.deepEqual(reconcilePacks(adapted, 15 * minute, config), { packs: 3, refillAt: 30 * minute })
  const shorter = { packs: 2, refillAt: 5 * minute }
  assert.equal(reconcilePacks(shorter, 0, config), shorter)
  assert.deepEqual(reconcilePacks({ packs: 2, refillAt: null }, 1000, config), { packs: 2, refillAt: 1000 + 15 * minute })
  const state = { ...createInitialState(config), ...legacy }
  assert.equal(parseGameState(JSON.parse(JSON.stringify(syncPacks(state, 0, config)))).refillAt, 15 * minute)
})
