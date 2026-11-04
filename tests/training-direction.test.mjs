import assert from 'node:assert/strict'
import test from 'node:test'
import { loadWorld } from '../src/data/world.ts'
import { COUNTRY_BY_ID } from '../src/data/countries.ts'
import { continentTrainingCountryIds } from '../src/domain/continentTraining.ts'
import { CONTINENT_VIEWS, continentProjection } from '../src/map/projections.ts'
import { TRAINING_DIRECTIONS, trainingDirection } from '../src/map/trainingDirection.ts'

test('training arrows cover all eight projected directions', () => {
  const projection = continentProjection('europe')
  const origin = projection([14, 54])
  for (const [index, expected] of TRAINING_DIRECTIONS.entries()) {
    const angle = index * Math.PI / 4
    const coordinates = projection.invert([
      origin[0] + Math.sin(angle) * 20,
      origin[1] - Math.cos(angle) * 20,
    ])
    const point = coordinates => ({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates } })
    const world = { mainland: new Map([['from', point([14, 54])], ['to', point(coordinates)]]), byName: new Map() }
    assert.deepEqual(trainingDirection(world, 'europe', 'from', 'to'), expected)
  }
})

test('training arrows use mainland geometry and reject missing positions', async () => {
  const world = await loadWorld()
  assert.equal(trainingDirection(world, 'europe', 'Germany', 'France').name, 'southwest')
  assert.equal(trainingDirection(world, 'europe', 'France', 'Germany').name, 'northeast')
  const mainlandOnly = { ...world, byName: new Map() }
  assert.deepEqual(
    trainingDirection(mainlandOnly, 'europe', 'Germany', 'France'),
    trainingDirection(world, 'europe', 'Germany', 'France'),
  )
  assert.throws(() => trainingDirection(world, 'europe', 'missing', 'France'), /Missing training country geometry/)
  assert.throws(() => trainingDirection(world, 'europe', 'France', 'France'), /Cannot determine training direction/)
})

test('every distinct playable training pair has an eight-way arrow, including island continents', async () => {
  const world = await loadWorld()
  for (const continent of Object.keys(CONTINENT_VIEWS)) {
    const countries = continentTrainingCountryIds(continent).map(id => COUNTRY_BY_ID[id])
    for (const from of countries) {
      for (const to of countries) {
        if (from.id === to.id) continue
        assert.ok(TRAINING_DIRECTIONS.includes(trainingDirection(world, continent, from.mapName, to.mapName)))
      }
    }
  }
})
