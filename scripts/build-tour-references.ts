import { geoCentroid } from 'd3-geo'
import { writeFile } from 'node:fs/promises'
import { COUNTRIES } from '../src/data/countries'
import { loadWorld } from '../src/data/world'

// Offline authoring only. Never regenerate a published scoring version in place.
// v1 reviewed: mainland US/France/Norway/Russia and Fiji/Indonesia/Pacific archipelagos.
const world = await loadWorld()
const points = Object.fromEntries(COUNTRIES.map(country => {
  const shape = world.mainland.get(country.mapName)
  if (!shape) throw new Error(`Missing geometry: ${country.id}`)
  const point = geoCentroid(shape).map(value => Number(value.toFixed(6)))
  if (!point.every(Number.isFinite) || Math.abs(point[0]) > 180 || Math.abs(point[1]) > 90) {
    throw new Error(`Invalid reference: ${country.id}`)
  }
  return [country.id, point]
}))
await writeFile('src/data/generated/tour-references-v1.json', `${JSON.stringify(points, null, 2)}\n`)
console.log(`Generated ${Object.keys(points).length} fixed mainland-centroid references`)
