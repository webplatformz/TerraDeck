import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { feature } from 'topojson-client'
import { geoContains, geoArea } from 'd3-geo'
import { framingLand } from '../src/map/projections.ts'
import { EXCLUDED_PARTS, EXCLUDED_TERRITORY_ISOS } from '../scripts/geo/exclusions.mjs'

const atlas = JSON.parse(readFileSync(new URL('../src/data/generated/atlas.json', import.meta.url), 'utf8'))
const countries = feature(atlas, atlas.objects.countries).features
const france = countries.find((f) => f.properties.name === 'France')
const guiana = countries.find((f) => f.properties.name === 'French Guiana')

test('French Guiana remains land but cannot be mistaken for mainland France', () => {
  assert.ok(guiana)
  assert.equal(guiana.properties.excluded, true)
  assert.equal(guiana.properties.continent, 'south-america')
  assert.ok(geoContains(guiana, [-53.2, 4]))
  assert.equal(geoContains(france, [-53.2, 4]), false)
  assert.equal(france.properties.excluded, false)
  assert.ok(geoContains(france, [2, 47]))
  const outline = feature(atlas, atlas.objects.continents).features.find((f) => f.properties.id === 'south-america')
  assert.ok(geoContains(outline, [-53.2, 4]))
})

test('all configured territory shapes are gray context, non-roster countries are not excluded', () => {
  for (const f of countries.filter((f) => EXCLUDED_TERRITORY_ISOS.includes(f.properties.iso))) {
    assert.equal(f.properties.excluded, true, f.properties.name)
  }
  for (const part of EXCLUDED_PARTS) {
    assert.ok(countries.some((f) => f.properties.name === part.name && f.properties.excluded), part.name)
  }
  assert.equal(countries.find((f) => f.properties.name === 'Belgium').properties.excluded, false)
})

test('territory exclusions never widen the fitted continent frame', () => {
  for (const id of ['africa', 'asia', 'europe', 'north-america', 'south-america', 'oceania']) {
    const frame = framingLand(id, countries)
    assert.ok(geoArea(frame) > 0)
    assert.deepEqual(frame, framingLand(id, countries.filter((f) => !f.properties.excluded)))
  }
})
