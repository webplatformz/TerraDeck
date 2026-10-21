/**
 * Builds src/data/generated/atlas.json from world-atlas countries-50m:
 * - `countries`: every shape except Antarctica, tagged { name, iso, continent }
 * - `continents`: six outlines made by merging the country shapes
 * Run with `npm run geo:build`. The output is committed.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mergeArcs, feature } from 'topojson-client'
import { geoCentroid } from 'd3-geo'
import { COUNTRIES, EXCLUDED, OVERSEAS_PARTS } from './geo/countries.mjs'
import { EXCLUDED_PARTS, EXCLUDED_TERRITORY_ISOS } from './geo/exclusions.mjs'
const roster = JSON.parse(readFileSync(new URL('./atlas/roster.json', import.meta.url), 'utf8'))

const CONTINENT_IDS = ['africa', 'asia', 'europe', 'north-america', 'south-america', 'oceania']
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const source = JSON.parse(readFileSync(require.resolve('world-atlas/countries-50m.json'), 'utf8'))
const out = resolve(root, 'src/data/generated/atlas.json')

// ---- validate the list against the map ----
const errors = []
const listed = new Map()
for (const [name, iso, continent] of COUNTRIES) {
  if (listed.has(name)) errors.push(`listed twice: ${name}`)
  if (!/^[A-Z]{2}$/.test(iso)) errors.push(`bad ISO code for ${name}: ${iso}`)
  if (!CONTINENT_IDS.includes(continent)) errors.push(`unknown continent for ${name}: ${continent}`)
  listed.set(name, { iso, continent })
}
const shapes = source.objects.countries.geometries
const onMap = new Set(shapes.map((g) => g.properties.name))
for (const name of onMap) if (!listed.has(name) && !EXCLUDED.includes(name)) errors.push(`missing from list: ${name}`)
for (const name of listed.keys()) if (!onMap.has(name)) errors.push(`not on the map: ${name}`)
for (const [name] of OVERSEAS_PARTS) if (!listed.has(name)) errors.push(`overseas part of unknown shape: ${name}`)
if (errors.length) {
  console.error(`build-geo: ${errors.length} problem(s)\n  ${errors.join('\n  ')}`)
  process.exit(1)
}

// ---- tag countries ----
const inBox = ([lon, lat], [w, s, e, n]) => lon >= w && lon <= e && lat >= s && lat <= n
const countries = shapes
  .filter((g) => !EXCLUDED.includes(g.properties.name))
  .flatMap((g) => {
    const { iso, continent } = listed.get(g.properties.name)
    const polygons = g.type === 'MultiPolygon' ? g.arcs : [g.arcs]
    const main = []
    const regions = new Map()
    for (const arcs of polygons) {
      const centroid = geoCentroid(feature(source, { type: 'Polygon', arcs }))
      const excluded = EXCLUDED_PARTS.find((p) => p.parent === g.properties.name && inBox(centroid, p.box))
      if (excluded) {
        if (!regions.has(excluded)) regions.set(excluded, [])
        regions.get(excluded).push(arcs)
      } else main.push(arcs)
    }
    const entries = []
    if (main.length) entries.push({
      type: 'MultiPolygon', arcs: main,
      properties: { name: g.properties.name, iso, continent, excluded: EXCLUDED_TERRITORY_ISOS.includes(iso) || !roster.some(c => c.mapName === g.properties.name) },
    })
    for (const [region, arcs] of regions) entries.push({
      type: 'MultiPolygon', arcs,
      properties: { name: region.name, iso, continent: region.continent, excluded: true },
    })
    return entries
  })

// ---- continent outlines: split into polygon parts, assign each part, merge ----
const partsByContinent = Object.fromEntries(CONTINENT_IDS.map((id) => [id, []]))
for (const g of countries) {
  const polygons = g.type === 'MultiPolygon' ? g.arcs : [g.arcs]
  for (const arcs of polygons) {
    const part = { type: 'Polygon', arcs }
    const centroid = geoCentroid(feature(source, part))
    const overseas = OVERSEAS_PARTS.find(([name, box]) => name === g.properties.name && inBox(centroid, box))
    partsByContinent[overseas ? overseas[2] : g.properties.continent].push(part)
  }
}
const continents = CONTINENT_IDS.map((id) => ({ ...mergeArcs(source, partsByContinent[id]), properties: { id } }))

// ---- drop arcs no longer used (Antarctica) and re-index ----
const used = new Map()
const remap = (i) => {
  const j = i < 0 ? ~i : i
  if (!used.has(j)) used.set(j, used.size)
  return i < 0 ? ~used.get(j) : used.get(j)
}
const remapGeometry = (g) => ({
  ...g,
  arcs: g.type === 'Polygon' ? g.arcs.map((ring) => ring.map(remap)) : g.arcs.map((poly) => poly.map((ring) => ring.map(remap))),
})
const topology = {
  type: 'Topology',
  transform: source.transform,
  bbox: source.bbox,
  objects: {
    countries: { type: 'GeometryCollection', geometries: countries.map(remapGeometry) },
    continents: { type: 'GeometryCollection', geometries: continents.map(remapGeometry) },
  },
}
topology.arcs = [...used.keys()].map((j) => source.arcs[j])

mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, JSON.stringify(topology))
const counts = CONTINENT_IDS.map((id) => `${id} ${countries.filter((c) => c.properties.continent === id).length}`).join(', ')
console.log(`build-geo: ${countries.length} shapes (${counts}); ${topology.arcs.length}/${source.arcs.length} arcs → ${out.replace(root + '/', '')}`)
