import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { COUNTRIES, COUNTRY_BY_ID } from '../src/data/countries.ts'
import { RARITIES, RARITY_WEIGHTS } from '../src/domain/rarity.ts'
import { generateRarity, percentile } from '../scripts/rarity/scoring.mjs'
import { pickCountry } from '../src/domain/selection.ts'
import { createInitialState, openPack, answerContinent, answerCountry } from '../src/domain/challenge.ts'
import { DEFAULT_CONFIG } from '../src/domain/config.ts'
import { isDiscovered } from '../src/domain/discovery.ts'
import { parseGameState } from '../src/persistence/validate.ts'

const json = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))
const source = json('../scripts/rarity/snapshot.json')
const extra = json('../scripts/atlas/snapshot.json')
const initial = json('../scripts/atlas/initial-roster.json')
const roster = json('../scripts/rarity/roster.json')
const catalog = json('../src/data/generated/rarity.json')
const en = json('../src/i18n/locales/en.json')
const de = json('../src/i18n/locales/de.json')
const progress = (stamps = 0) => ({ stamps, encounters: 1, unlockedAt: stamps >= DEFAULT_CONFIG.stampsToUnlock ? 1 : null })
const pool = RARITIES.map((rarity, i) => ({ id: String(i), continent: 'europe', rarity }))
const pick = (rng, entries = pool, saved = {}, recent = []) => pickCountry(entries, saved, recent, () => rng, DEFAULT_CONFIG.stampsToUnlock, DEFAULT_CONFIG.recentWindow)

test('fixed catalog is reproducible, complete and represents five grades', () => {
  assert.deepEqual(generateRarity(source, roster, extra.observerRarity), catalog)
  assert.deepEqual(COUNTRIES.map((c) => c.id), roster)
  assert.equal(COUNTRIES.length, 190)
  assert.equal(new Set(COUNTRIES.map((c) => c.number)).size, 190)
  assert.deepEqual(COUNTRIES.slice(0, 40).map(c => c.id), initial)
  const old = generateRarity(source, initial)
  for (const id of initial) assert.deepEqual(catalog[id], old[id])
  assert.equal(COUNTRY_BY_ID.nz.number, 20)
  assert.equal(COUNTRY_BY_ID.ch.rarity, 'legendary')
  assert.match(catalog.ch.override, /Switzerland/)
  assert.deepEqual(new Set(COUNTRIES.map((c) => c.rarity)), new Set(RARITIES))
  assert.equal(percentile([1, 2, 2, 4], 2), 0.5)
  assert.equal(percentile([1, 2, 2, 4], 0), 0)
  assert.equal(percentile([1, 2, 2, 4], 5), 1)
  assert.equal(percentile([1, 2, 2, 4], 3), 0.75)
})

test('generator rejects missing provenance, invalid measurements and duplicate roster entries', () => {
  assert.throws(() => generateRarity({ ...source, retrievedAt: null }, roster), /provenance/)
  assert.throws(() => generateRarity({ ...source, countries: source.countries.map((c, i) => i ? c : { ...c, coverage: -1 }) }, roster), /source/)
  assert.throws(() => generateRarity(source, [...roster.slice(0, -1), roster[0]]), /unique/)
  assert.throws(() => generateRarity(source, [...roster.slice(0, -1), 'xx']), /Missing rarity/)
})

test('all playable countries have localized content, a flag and a usable map feature', () => {
  const atlas = json('../src/data/generated/atlas.json')
  const features = atlas.objects.countries.geometries
  const flagSource = readFileSync(new URL('../src/data/flags.ts', import.meta.url), 'utf8')
  for (const c of COUNTRIES) {
    for (const locale of [en, de]) {
      assert.ok(locale.countries[c.id]?.name)
      assert.ok(locale.countries[c.id]?.capital)
      assert.ok(locale.countries[c.id]?.fact)
      assert.ok(locale.rarity[c.rarity])
    }
    assert.ok(features.some((f) => f.properties.name === c.mapName && !f.properties.excluded), c.mapName)
    assert.ok(existsSync(new URL(`../node_modules/flag-icons/flags/4x3/${c.id}.svg`, import.meta.url)))
    assert.ok(flagSource.includes(c.id), `Flag catalog: ${c.id}`)
  }
})

test('relative weights and exact cumulative boundaries are correct', () => {
  assert.deepEqual(Object.values(RARITY_WEIGHTS), [1, 0.95, 0.9, 0.85, 0.8])
  const total = 4.5
  let boundary = 0
  for (let i = 0; i < pool.length; i++) {
    const weight = RARITY_WEIGHTS[pool[i].rarity]
    assert.equal(pick((boundary + weight / 2) / total), String(i))
    assert.equal(pick((boundary + 1e-9) / total), String(i))
    assert.equal(pick((boundary + weight - 1e-9) / total), String(i))
    boundary += weight
  }
  assert.equal(pick(0), '0')
  assert.equal(pick(1 - Number.EPSILON), '4')
  // Equal bins approximate the exact probability mass without a flaky random test.
  const counts = Array(5).fill(0)
  for (let i = 0; i < 45_000; i++) counts[Number(pick((i + 0.5) / 45_000))]++
  assert.deepEqual(counts, [10000, 9500, 9000, 8500, 8000])
})

test('picker preserves collected exclusion, recent avoidance and completion behavior', () => {
  assert.equal(pick(0, pool, { 0: progress(3) }, ['1']), '2')
  assert.equal(pick(0, [pool[0]], {}, ['0']), '0')
  assert.equal(pick(0, [], {}, []), null)
  assert.equal(pick(0, [pool[0]], { 0: progress(3) }), null)
  for (const value of [NaN, -0.1, 1, Infinity]) assert.throws(() => pick(value), /RNG/)
  assert.throws(() => pickCountry(pool, {}, [], () => 0, 3, 3, { ...RARITY_WEIGHTS, common: 0 }), /weight/)
})

test('opening discovers immediately, consumes only one pack and survives reload before answering', () => {
  const initial = createInitialState(DEFAULT_CONFIG)
  const next = openPack(initial, COUNTRIES, 1234, () => 0, DEFAULT_CONFIG)
  assert.equal(next.progress.fr.discoveredAt, 1234)
  assert.equal(next.progress.fr.encounters, 0)
  assert.equal(next.progress.fr.stamps, 0)
  assert.equal(next.packs, initial.packs - 1)
  assert.equal(isDiscovered(next, 'fr'), true)
  assert.equal(isDiscovered(next, 'ch'), false)
  assert.equal(parseGameState(JSON.parse(JSON.stringify(next))).progress.fr.discoveredAt, 1234)
  assert.deepEqual(openPack(next, COUNTRIES, 1500, () => 0, DEFAULT_CONFIG), next)
})

test('wrong continent/country preserves progress; the second success unlocks', () => {
  const initial = { ...createInitialState(DEFAULT_CONFIG), progress: { fr: progress(1) } }
  const opened = openPack(initial, COUNTRIES, 1000, () => 0, DEFAULT_CONFIG)
  const miss = answerContinent(opened, 'asia', COUNTRIES, 1100, DEFAULT_CONFIG)
  assert.equal(miss.progress.fr.stamps, 1)
  assert.equal(miss.progress.fr.discoveredAt, 1000)
  const country = answerContinent(opened, 'europe', COUNTRIES, 1100, DEFAULT_CONFIG)
  const countryMiss = answerCountry(country, 'it', 1200, DEFAULT_CONFIG)
  assert.equal(countryMiss.progress.fr.stamps, 1)
  assert.equal(isDiscovered(countryMiss, 'fr'), true)
  const success = answerCountry(country, 'fr', 1200, DEFAULT_CONFIG)
  assert.equal(success.progress.fr.stamps, 2)
  assert.equal(success.progress.fr.unlockedAt, 1200)
  assert.equal(success.activeChallenge.unlocked, true)
})

test('v1 saves remain valid and legacy discovery evidence is preserved', () => {
  const state = { ...createInitialState(DEFAULT_CONFIG), progress: { fr: progress(), ch: progress(1), jp: progress(3) } }
  const loaded = parseGameState(JSON.parse(JSON.stringify(state)))
  assert.deepEqual(loaded, state)
  for (const id of ['fr', 'ch', 'jp']) assert.equal(isDiscovered(loaded, id), true)
  assert.equal(loaded.progress.fr.discoveredAt, undefined)
  assert.equal(parseGameState({ ...state, progress: { fr: { ...progress(), discoveredAt: -1 } } }), null)
  const active = { ...state, progress: {}, activeChallenge: { countryId: 'it', startedAt: 1, step: 'continent', continentAnswer: null, countryAnswer: null, outcome: null, unlocked: false } }
  assert.ok(parseGameState(active))
  assert.equal(isDiscovered(active, 'it'), true)
})
