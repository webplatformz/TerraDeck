import { geoPath } from 'd3-geo'
import type { WorldData } from '../data/world'
import type { ContinentId } from '../domain/types'
import { continentProjection } from './projections'

export const TRAINING_DIRECTIONS = [
  { name: 'north', arrow: '↑' },
  { name: 'northeast', arrow: '↗' },
  { name: 'east', arrow: '→' },
  { name: 'southeast', arrow: '↘' },
  { name: 'south', arrow: '↓' },
  { name: 'southwest', arrow: '↙' },
  { name: 'west', arrow: '←' },
  { name: 'northwest', arrow: '↖' },
] as const

export function trainingDirection(world: WorldData, continent: ContinentId, from: string, to: string) {
  const source = world.mainland.get(from) ?? world.byName.get(from)
  const target = world.mainland.get(to) ?? world.byName.get(to)
  if (!source || !target) throw new Error(`Missing training country geometry: ${from} / ${to}`)
  const path = geoPath(continentProjection(continent))
  const [x0, y0] = path.centroid(source)
  const [x1, y1] = path.centroid(target)
  if (![x0, y0, x1, y1].every(Number.isFinite) || (x0 === x1 && y0 === y1)) {
    throw new Error(`Cannot determine training direction: ${from} / ${to}`)
  }
  const angle = Math.atan2(x1 - x0, y0 - y1)
  return TRAINING_DIRECTIONS[(Math.round(angle / (Math.PI / 4)) + 8) % 8]!
}
