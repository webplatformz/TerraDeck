import { geoCentroid } from 'd3-geo'
import { COUNTRY_BY_ID, COUNTRY_BY_MAP_NAME, COUNTRIES } from '../data/countries'
import type { WorldData } from '../data/world'
import type { ContinentId, CountryId } from './types'
import { continentProjection } from '../map/projections'

export type GeographicDirection =
  | 'northwest' | 'north' | 'northeast'
  | 'west' | 'center' | 'east'
  | 'southwest' | 'south' | 'southeast'

export interface GeographicHint {
  clue:
    | { kind: 'direction'; value: GeographicDirection }
    | { kind: 'size'; value: 'largest' | 'smallest' }
    | { kind: 'border'; neighborId: CountryId }
    | { kind: 'island' }
    | { kind: 'general' }
}

const byContinent = new Map<ContinentId, typeof COUNTRIES[number][]>()
for (const country of COUNTRIES) {
  const group = byContinent.get(country.continent) ?? []
  group.push(country)
  byContinent.set(country.continent, group)
}

const areaRanks = new Map<CountryId, Set<'largest' | 'smallest'>>()
for (const group of byContinent.values()) {
  const byArea = [...group].sort((a, b) => b.areaKm2 - a.areaKm2)
  byArea.slice(0, 5).forEach(country => {
    const ranks = areaRanks.get(country.id) ?? new Set()
    ranks.add('largest')
    areaRanks.set(country.id, ranks)
  })
  byArea.slice(-5).forEach(country => {
    const ranks = areaRanks.get(country.id) ?? new Set()
    ranks.add('smallest')
    areaRanks.set(country.id, ranks)
  })
}

const directionCache = new WeakMap<WorldData, Map<ContinentId, Map<CountryId, GeographicDirection>>>()

function directionsFor(continent: ContinentId, world: WorldData): Map<CountryId, GeographicDirection> {
  let continentCache = directionCache.get(world)
  if (!continentCache) {
    continentCache = new Map()
    directionCache.set(world, continentCache)
  }
  const cached = continentCache.get(continent)
  if (cached) return cached

  const group = byContinent.get(continent) ?? []
  const projection = continentProjection(continent)
  const positions = group.flatMap(entry => {
    const feature = world.mainland.get(entry.mapName) ?? world.byName.get(entry.mapName)
    if (!feature) return []
    const point = projection(geoCentroid(feature))
    return point && point.every(Number.isFinite) ? [{ id: entry.id, x: point[0], y: point[1] }] : []
  })
  if (positions.length < 2) {
    const centered = new Map(group.map(entry => [entry.id, 'center' as const]))
    continentCache.set(continent, centered)
    return centered
  }
  const minX = Math.min(...positions.map(position => position.x))
  const maxX = Math.max(...positions.map(position => position.x))
  const minY = Math.min(...positions.map(position => position.y))
  const maxY = Math.max(...positions.map(position => position.y))
  const directions = new Map<CountryId, GeographicDirection>()
  for (const position of positions) {
    const x = maxX === minX ? 0.5 : (position.x - minX) / (maxX - minX)
    const y = maxY === minY ? 0.5 : (position.y - minY) / (maxY - minY)
    const horizontal = x < 0.34 ? 'west' : x > 0.66 ? 'east' : ''
    const vertical = y < 0.34 ? 'north' : y > 0.66 ? 'south' : ''
    directions.set(position.id, vertical && horizontal
      ? `${vertical}${horizontal}` as GeographicDirection
      : vertical || horizontal || 'center')
  }
  for (const entry of group) if (!directions.has(entry.id)) directions.set(entry.id, 'center')
  continentCache.set(continent, directions)
  return directions
}

function neighborIdsFor(countryId: CountryId, world: WorldData): Set<CountryId> {
  const country = COUNTRY_BY_ID[countryId]!
  return new Set((world.neighbors.get(country.mapName) ?? [])
    .map(name => COUNTRY_BY_MAP_NAME[name]?.id)
    .filter((id): id is CountryId => !!id && id !== countryId && COUNTRY_BY_ID[id]?.continent === country.continent))
}

export function geographicHint(countryId: CountryId, world: WorldData): GeographicHint {
  const country = COUNTRY_BY_ID[countryId]
  if (!country) throw new Error(`Unknown country for geographic hint: ${countryId}`)
  const group = byContinent.get(country.continent) ?? []
  const candidateIds = group.map(entry => entry.id)
  const directions = directionsFor(country.continent, world)
  const direction = directions.get(countryId) ?? 'center'
  const areaMemberships = areaRanks.get(countryId) ?? new Set()
  const countryNeighbors = world.neighbors.get(country.mapName) ?? []
  const neighbors = new Map(candidateIds.map(id => [id, neighborIdsFor(id, world)]))
  const candidates: { clue: GeographicHint['clue']; matches: number; priority: number }[] = []
  const directionAxes = new Set(
    direction === 'center'
      ? ['center']
      : (['north', 'south', 'west', 'east'] as const).filter(axis => direction.includes(axis)),
  )
  for (const axis of directionAxes) {
    const matches = candidateIds.filter(id => {
      const other = directions.get(id) ?? 'center'
      return axis === 'center' ? other === 'center' : other.includes(axis)
    }).length
    if (matches > 1) candidates.push({
      clue: { kind: 'direction', value: axis as GeographicDirection },
      matches,
      priority: axis === direction ? 2 : 3,
    })
  }

  for (const size of areaMemberships) {
    const matches = candidateIds.filter(id => areaRanks.get(id)?.has(size)).length
    if (matches > 1) candidates.push({ clue: { kind: 'size', value: size }, matches, priority: 1 })
  }

  for (const name of countryNeighbors) {
    const neighborId = COUNTRY_BY_MAP_NAME[name]?.id
    if (!neighborId || neighborId === countryId || COUNTRY_BY_ID[neighborId]?.continent !== country.continent) continue
    const matches = candidateIds.filter(id => neighbors.get(id)?.has(neighborId)).length
    if (matches > 1) candidates.push({ clue: { kind: 'border', neighborId }, matches, priority: 0 })
  }

  const matchingIslands = group.filter(entry => world.neighbors.get(entry.mapName)?.length === 0).length
  if (countryNeighbors.length === 0 && matchingIslands > 1) {
    candidates.push({ clue: { kind: 'island' }, matches: matchingIslands, priority: 3 })
  }

  candidates.sort((a, b) => a.matches - b.matches || a.priority - b.priority)
  const best = candidates[0]
  return {
    clue: best?.clue ?? { kind: 'general' },
  }
}
