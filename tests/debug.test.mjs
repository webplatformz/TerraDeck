import { test } from 'node:test'
import assert from 'node:assert/strict'
import { addDebugPack } from '../src/domain/debug.ts'
import { createInitialState, openPack, answerContinent, answerCountry, dismissChallenge } from '../src/domain/challenge.ts'
import { DEFAULT_CONFIG } from '../src/domain/config.ts'
import { COUNTRIES } from '../src/data/countries.ts'
import { parseGameState } from '../src/persistence/validate.ts'
import { trackAchievements, emptyAchievements } from '../src/domain/achievements.ts'

test('debug pack targets normalize valid codes, cap stock, preserve active challenges and survive reload', () => {
  const state = { ...createInitialState(DEFAULT_CONFIG), packs: 2, refillAt: 9000 }
  const next = addDebugPack(state, ' CH ', COUNTRIES, DEFAULT_CONFIG)
  assert.equal(next.packs, 3)
  assert.equal(next.refillAt, 9000)
  assert.equal(next.debugCountryId, 'ch')
  assert.equal(parseGameState(JSON.parse(JSON.stringify(next))).debugCountryId, 'ch')
  const full = addDebugPack({ ...next, packs: 10 }, 'JP', COUNTRIES, DEFAULT_CONFIG)
  assert.equal(full.packs, 10)
  assert.equal(full.refillAt, null)
  assert.equal(full.debugCountryId, 'jp')
  assert.equal(addDebugPack(full, '', COUNTRIES, DEFAULT_CONFIG).debugCountryId, 'jp')
  const active = openPack(state, COUNTRIES, 100, () => 0, DEFAULT_CONFIG)
  const queued = addDebugPack(active, 'ch', COUNTRIES, DEFAULT_CONFIG)
  assert.deepEqual(queued.activeChallenge, active.activeChallenge)
  assert.strictEqual(openPack(queued, COUNTRIES, 101, () => 0, DEFAULT_CONFIG, 'ch'), queued)
})

test('invalid or non-playable debug codes throw without consuming stock or changing progress', () => {
  const state = createInitialState(DEFAULT_CONFIG)
  for (const code of ['x', 'xxx', 'zz', 'va', 'tv', '12']) {
    assert.throws(() => addDebugPack(state, code, COUNTRIES, DEFAULT_CONFIG), /playable/)
  }
  assert.equal(state.packs, 10)
  assert.deepEqual(state.progress, {})
  assert.throws(() => openPack(state, COUNTRIES, 100, () => 0, DEFAULT_CONFIG, 'zz'), /Unknown debug country/)
})

test('forced debug draws bypass collected/recent exclusions without resetting mastery or giving duplicate stamps', () => {
  const state = { ...createInitialState(DEFAULT_CONFIG), achievements: emptyAchievements() }
  state.progress.ch = { stamps: 3, encounters: 7, unlockedAt: 77, discoveredAt: 1 }
  state.recentIds = ['ch']
  const opened = openPack(state, COUNTRIES, 100, () => { throw new Error('Forced draw must not use RNG') }, DEFAULT_CONFIG, 'ch')
  assert.equal(opened.activeChallenge.countryId, 'ch')
  assert.equal(opened.packs, 9)
  assert.deepEqual(opened.progress.ch, state.progress.ch)
  const continent = answerContinent(opened, 'europe', COUNTRIES, 101, DEFAULT_CONFIG)
  const result = trackAchievements(continent, answerCountry(continent, 'ch', 102, DEFAULT_CONFIG), COUNTRIES, 102)
  assert.equal(result.progress.ch.stamps, 3)
  assert.equal(result.progress.ch.unlockedAt, 77)
  assert.equal(result.activeChallenge.unlocked, false)
  assert.equal(result.achievements.collected.length, 0)
  assert.equal(result.achievements.stampedContinents.length, 0)
  const normal = openPack(dismissChallenge(result), COUNTRIES, 103, () => 0, DEFAULT_CONFIG)
  assert.notEqual(normal.activeChallenge.countryId, 'ch')
})
