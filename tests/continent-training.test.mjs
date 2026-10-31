import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  CONTINENT_TRAINING_STORAGE_KEY,
  continentTrainingCountryIds,
  createContinentTraining,
  explorerKnowledgePercent,
  recordContinentTrainingGuess,
  parseContinentTraining,
  validateContinentTraining,
} from '../src/domain/continentTraining.ts'
import { ContinentTrainingStore } from '../src/persistence/ContinentTrainingStore.ts'
import { COUNTRIES, COUNTRY_BY_ID } from '../src/data/countries.ts'
import { CONTINENTS } from '../src/data/continents.ts'
import { loadWorld } from '../src/data/world.ts'
import { geographicHint } from '../src/domain/geographicHint.ts'

const memoryStorage = () => {
  const values = new Map()
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  }
}

test('Explorer knowledge caps at the rounded-up half-continent threshold', () => {
  assert.equal(explorerKnowledgePercent(0, 5), 0)
  assert.ok(Math.abs(explorerKnowledgePercent(2, 5) - 200 / 3) < 1e-10)
  assert.equal(explorerKnowledgePercent(3, 5), 100)
  assert.equal(explorerKnowledgePercent(4, 5), 100)
})

test('wrong guesses reset only the streak and preserve placed countries', () => {
  const ids = continentTrainingCountryIds('europe')
  const starting = { ...createContinentTraining('europe'), placedIds: [ids[0]], streak: 1 }
  const result = recordContinentTrainingGuess(starting, ids[1], ids[2])
  assert.equal(result.correct, false)
  assert.deepEqual(result.session.placedIds, [ids[0]])
  assert.equal(result.session.streak, 0)
})

test('a perfect continent run retains a full streak through the last correct placement', () => {
  const ids = continentTrainingCountryIds('oceania')
  let session = createContinentTraining('oceania')
  for (const id of ids) {
    const result = recordContinentTrainingGuess(session, id, id)
    assert.equal(result.correct, true)
    session = result.session
  }
  assert.deepEqual(session.placedIds, ids)
  assert.equal(session.streak, ids.length)
  assert.equal(explorerKnowledgePercent(session.streak, ids.length), 100)
})

test('sessions resume from isolated storage and confirmed close clears only training data', () => {
  const storage = memoryStorage()
  const store = new ContinentTrainingStore(storage)
  const main = '{"activeChallenge":{"countryId":"fr"},"dailyTours":{"records":{}},"achievements":{"earned":{}}}'
  storage.setItem('terradeck:save:v1', main)
  storage.setItem('terradeck:lang', 'de')
  const session = { ...createContinentTraining('asia'), placedIds: ['jp'], streak: 1 }
  assert.deepEqual(store.read(), { session: null, error: null })
  store.write(session)
  assert.deepEqual(new ContinentTrainingStore(storage).read(), { session, error: null })
  store.clear()
  assert.equal(storage.getItem(CONTINENT_TRAINING_STORAGE_KEY), null)
  assert.equal(storage.getItem('terradeck:save:v1'), main)
  assert.equal(storage.getItem('terradeck:lang'), 'de')
})

test('all continent rosters use playable countries and half-continent streak thresholds', () => {
  for (const continent of CONTINENTS) {
    const ids = continentTrainingCountryIds(continent.id)
    assert.ok(ids.length > 0)
    assert.equal(new Set(ids).size, ids.length)
    assert.ok(ids.every(id => COUNTRY_BY_ID[id].continent === continent.id))
    const threshold = Math.ceil(ids.length / 2)
    assert.equal(explorerKnowledgePercent(threshold, ids.length), 100)
    assert.ok(explorerKnowledgePercent(threshold - 1, ids.length) < 100)
  }
})

test('duplicate placement does not inflate progress and a recovered run is not perfect', () => {
  const ids = continentTrainingCountryIds('oceania')
  let session = recordContinentTrainingGuess(createContinentTraining('oceania'), ids[0], ids[0]).session
  assert.deepEqual(recordContinentTrainingGuess(session, ids[0], ids[0]).session, session)
  session = recordContinentTrainingGuess(session, ids[1], undefined).session
  for (const id of ids.slice(1)) session = recordContinentTrainingGuess(session, id, id).session
  assert.equal(session.placedIds.length, ids.length)
  assert.equal(session.streak, ids.length - 1)
})

test('invalid training fields are rejected without altering saved data', () => {
  const session = createContinentTraining('europe')
  for (const invalid of [
    null, [], { ...session, continent: 'unknown' }, { ...session, placedIds: ['jp'] },
    { ...session, placedIds: ['fr', 'fr'] }, { ...session, placedIds: [3] },
    { ...session, streak: -1 }, { ...session, streak: 0.5 }, { ...session, streak: 1 },
    { ...session, placedIds: undefined }, { ...session, streak: undefined },
  ]) {
    assert.equal(validateContinentTraining(invalid), null)
    const storage = memoryStorage()
    const store = new ContinentTrainingStore(storage)
    store.write(session)
    const before = storage.getItem(CONTINENT_TRAINING_STORAGE_KEY)
    assert.throws(() => store.write(invalid))
    assert.equal(storage.getItem(CONTINENT_TRAINING_STORAGE_KEY), before)
  }
})

test('compatible v1 saves preserve unknown fields across reading and progress updates', () => {
  const session = { ...createContinentTraining('europe'), extra: { futurePreference: true } }
  const raw = JSON.stringify({ version: 1, extraEnvelope: { retained: true }, session })
  const storage = memoryStorage()
  storage.setItem(CONTINENT_TRAINING_STORAGE_KEY, raw)
  const store = new ContinentTrainingStore(storage)
  assert.deepEqual(parseContinentTraining(raw), { session, error: null })
  const next = recordContinentTrainingGuess(store.read().session, 'fr', 'fr').session
  store.write(next)
  store.write(store.read().session)
  const saved = JSON.parse(storage.getItem(CONTINENT_TRAINING_STORAGE_KEY))
  assert.deepEqual(saved.extraEnvelope, { retained: true })
  assert.deepEqual(saved.session.extra, session.extra)
  assert.deepEqual(saved.session.placedIds, ['fr'])
})

test('malformed and unsupported saves are reported and never overwritten or cleared', () => {
  for (const raw of ['{broken', JSON.stringify({ version: 2, session: null })]) {
    const storage = memoryStorage()
    storage.setItem(CONTINENT_TRAINING_STORAGE_KEY, raw)
    const store = new ContinentTrainingStore(storage)
    assert.ok(store.read().error)
    assert.throws(() => store.write(createContinentTraining('europe')))
    assert.throws(() => store.clear())
    assert.equal(storage.getItem(CONTINENT_TRAINING_STORAGE_KEY), raw)
  }
})

test('every playable country gets exactly one geographic clue', async () => {
  const world = await loadWorld()
  const directions = new Set([
    'northwest', 'north', 'northeast', 'west', 'center', 'east',
    'southwest', 'south', 'southeast',
  ])
  for (const country of COUNTRIES) {
    const hint = geographicHint(country.id, world)
    assert.equal(Object.keys(hint).length, 1)
    assert.ok(['direction', 'size', 'border', 'island', 'general'].includes(hint.clue.kind))
    if (hint.clue.kind === 'direction') assert.ok(directions.has(hint.clue.value), `missing direction for ${country.id}`)
  }
  for (const country of COUNTRIES) {
    const { clue } = geographicHint(country.id, world)
    const group = COUNTRIES.filter(entry => entry.continent === country.continent)
    if (clue.kind === 'border') {
      const neighbor = COUNTRY_BY_ID[clue.neighborId]
      assert.equal(neighbor.continent, country.continent)
      assert.ok(world.neighbors.get(country.mapName).includes(neighbor.mapName))
    } else if (clue.kind === 'size') {
      const sorted = [...group].sort((a, b) => b.areaKm2 - a.areaKm2)
      assert.ok((clue.value === 'largest' ? sorted.slice(0, 5) : sorted.slice(-5)).some(entry => entry.id === country.id))
    } else if (clue.kind === 'island') {
      assert.deepEqual(world.neighbors.get(country.mapName), [])
    }
  }
})
