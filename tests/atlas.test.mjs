import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { feature } from 'topojson-client'
import { geoPath } from 'd3-geo'
import { COUNTRIES } from '../src/data/countries.ts'
import { continentProjection, framingLand } from '../src/map/projections.ts'
import { createInitialState, openPack, answerContinent, answerCountry } from '../src/domain/challenge.ts'
import { DEFAULT_CONFIG } from '../src/domain/config.ts'
import { DEFERRED, CONTEXT_ONLY_FEATURES } from '../scripts/atlas/policy.mjs'
import { parseGameState } from '../src/persistence/validate.ts'

const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))
const reference = read('../scripts/rarity/snapshot.json')
const source = read('../scripts/atlas/snapshot.json')
const roster = read('../scripts/atlas/roster.json')
const initial = read('../scripts/atlas/initial-roster.json')
const atlas = read('../src/data/generated/atlas.json')
const features = feature(atlas, atlas.objects.countries).features
const ids = new Set(COUNTRIES.map(c => c.id))

test('exact UN-based candidate partition contains 190 playable and five explicitly deferred entries', () => {
  assert.equal(source.countries.length, 195)
  assert.deepEqual(new Set(source.countries.map(c => c.id)), new Set([...reference.countries.map(c => c.id), 'ps', 'va']))
  assert.deepEqual(Object.keys(DEFERRED).sort(), ['mc', 'mv', 'nr', 'tv', 'va'])
  assert.equal(ids.size, 190)
  assert.equal(COUNTRIES.length * DEFAULT_CONFIG.stampsToUnlock, 380)
  assert.deepEqual(COUNTRIES.map(c => c.id), roster.map(c => c.id))
  for (const id of Object.keys(DEFERRED)) assert.equal(ids.has(id), false)
  for (const id of ['tw', 'xk', 'gl', 'pr', 'hk', 'ck', 'nu']) assert.equal(ids.has(id), false)
})

test('every map feature is either an explicit canonical target or gray context, regardless of shared ISO', () => {
  for (const f of features) {
    const canonical = COUNTRIES.find(c => c.mapName === f.properties.name)
    assert.equal(f.properties.excluded, !canonical, f.properties.name)
    if (canonical) {
      assert.equal(f.properties.iso.toLowerCase(), canonical.id)
      assert.equal(f.properties.continent, canonical.continent)
    }
  }
  for (const name of [...CONTEXT_ONLY_FEATURES, 'Kosovo', 'Taiwan', 'W. Sahara', 'Vatican', 'Monaco', 'Nauru', 'Maldives'])
    assert.equal(features.find(f => f.properties.name === name)?.properties.excluded, true, name)
})

test('all 190 countries have real visible polygons after shared continent framing at both phone widths', () => {
  for (const width of [320, 390]) {
    const w = width - 26, h = 418
    const paths = new Map([...new Set(COUNTRIES.map(c => c.continent))].map(continent => [
      continent,
      geoPath(continentProjection(continent)
        .fitExtent([[12, 12], [w - 12, h - 12]], framingLand(continent, features))
        .clipExtent([[-40, -40], [w + 40, h + 40]])),
    ]))
    for (const c of COUNTRIES) {
      const f = features.find(f => f.properties.name === c.mapName)
      assert.ok(f, c.id)
      const path = paths.get(c.continent)
      assert.ok(path(f), `${width}/${c.id}`)
      const bounds = path.bounds(f)
      assert.ok(bounds.flat().every(Number.isFinite), `${width}/${c.id} finite bounds`)
      assert.ok(bounds[1][0] > 0 && bounds[0][0] < w && bounds[1][1] > 0 && bounds[0][1] < h, `${width}/${c.id} screen intersection`)
    }
  }
})

test('old completed 40-country saves retain history and now draw only undiscovered additions', () => {
  const state = createInitialState(DEFAULT_CONFIG)
  state.progress = Object.fromEntries(initial.map(id => [id, { stamps: 3, encounters: 4, unlockedAt: 123 }]))
  const loaded = parseGameState(JSON.parse(JSON.stringify(state)))
  const opened = openPack(loaded, COUNTRIES, 1000, () => 0, DEFAULT_CONFIG)
  assert.equal(initial.includes(opened.activeChallenge.countryId), false)
  for (const id of initial) assert.deepEqual(opened.progress[id], state.progress[id])
})

test('every retained country can complete the ordinary two-success rules and full atlas completion stops draws', () => {
  for (const c of COUNTRIES) {
    const state = createInitialState(DEFAULT_CONFIG)
    state.progress[c.id] = { stamps: 1, encounters: 1, unlockedAt: null, discoveredAt: 100 }
    const opened = openPack(state, [c], 1000, () => 0, DEFAULT_CONFIG)
    const correctContinent = answerContinent(opened, c.continent, COUNTRIES, 1001, DEFAULT_CONFIG)
    const done = answerCountry(correctContinent, c.id, 1002, DEFAULT_CONFIG)
    assert.equal(done.progress[c.id].stamps, 2)
    assert.equal(done.activeChallenge.unlocked, true)
  }
  const complete = createInitialState(DEFAULT_CONFIG)
  complete.progress = Object.fromEntries(COUNTRIES.map(c => [c.id, { stamps: 2, encounters: 2, unlockedAt: 123 }]))
  assert.equal(openPack(complete, COUNTRIES, 1000, () => 0, DEFAULT_CONFIG).activeChallenge, null)
})
