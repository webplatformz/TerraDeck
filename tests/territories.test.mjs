import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { feature, neighbors } from 'topojson-client'
import { geoContains, geoArea } from 'd3-geo'
import { framingLand } from '../src/map/projections.ts'
import { EXCLUDED_PARTS, EXCLUDED_TERRITORY_ISOS } from '../scripts/geo/exclusions.mjs'
import { loadWorld } from '../src/data/world.ts'

const atlas = JSON.parse(readFileSync(new URL('../src/data/generated/atlas.json', import.meta.url), 'utf8'))
const countries = feature(atlas, atlas.objects.countries).features
const france = countries.find((f) => f.properties.name === 'France')
const guiana = countries.find((f) => f.properties.name === 'French Guiana')

test('Crimea correction preserves the combined source land area and all Russian non-Crimean polygons', () => {
  const require = createRequire(import.meta.url)
  const source = JSON.parse(readFileSync(require.resolve('world-atlas/countries-50m.json'), 'utf8'))
  const original = feature(source, source.objects.countries).features
  const originalRussia = original.find(f => f.properties.name === 'Russia')
  const originalUkraine = original.find(f => f.properties.name === 'Ukraine')
  const russia = countries.find(f => f.properties.name === 'Russia')
  const ukraine = countries.find(f => f.properties.name === 'Ukraine')
  assert.ok(Math.abs(geoArea(originalRussia) + geoArea(originalUkraine) - geoArea(russia) - geoArea(ukraine)) < 1e-12)
  const retained = originalRussia.geometry.coordinates.filter(coordinates =>
    !geoContains({ type: 'Polygon', coordinates }, [34.1, 44.95]))
  assert.deepEqual(russia.geometry.coordinates, retained)
})

test('Crimea belongs exclusively to Ukraine in country, mainland and continent geometry', async () => {
  const world = await loadWorld()
  const ukraine = world.byName.get('Ukraine')
  const russia = world.byName.get('Russia')
  const outlines = feature(atlas, atlas.objects.continents).features
  for (const point of [[34.1, 44.95], [33.53, 44.6], [36.47, 45.35]]) {
    assert.ok(geoContains(ukraine, point), `Ukraine contains ${point}`)
    assert.equal(geoContains(russia, point), false)
    assert.ok(geoContains(world.mainland.get('Ukraine'), point))
    assert.equal(geoContains(world.mainland.get('Russia'), point), false)
    assert.deepEqual(countries.filter(f => geoContains(f, point)).map(f => f.properties.name), ['Ukraine'])
    assert.ok(geoContains(outlines.find(f => f.properties.id === 'europe'), point))
    assert.equal(geoContains(outlines.find(f => f.properties.id === 'asia'), point), false)
  }
  assert.ok(geoContains(ukraine, [30.52, 50.45]), 'Kyiv remains Ukraine')
  assert.ok(geoContains(russia, [37.62, 55.75]), 'Moscow remains Russia')
  const geometries = atlas.objects.countries.geometries
  const adjacent = neighbors(geometries)
  const ukraineIndex = geometries.findIndex(g => g.properties.name === 'Ukraine')
  const russiaIndex = geometries.findIndex(g => g.properties.name === 'Russia')
  assert.ok(adjacent[ukraineIndex].includes(russiaIndex), 'shared mainland border remains topologically connected')
  assert.equal(geometries[ukraineIndex].arcs.length, 2, 'Crimea merges into mainland Ukraine rather than adding an overlapping polygon')
})

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

test('all configured territory shapes are gray context, retained countries stay playable', () => {
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
