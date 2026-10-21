import { geoArea, geoCentroid, geoDistance } from 'd3-geo'
import { feature } from 'topojson-client'
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import type { GeometryCollection, Topology } from 'topojson-specification'
import type { ContinentId } from '../domain/types'

export interface CountryProps {
  name: string
  iso: string
  continent: ContinentId
  excluded: boolean
}

export type CountryFeature = Feature<Polygon | MultiPolygon, CountryProps>
export type ContinentFeature = Feature<Polygon | MultiPolygon, { id: ContinentId }>

export interface WorldData {
  /** All country shapes except Antarctica, tagged by scripts/build-geo.mjs. */
  features: CountryFeature[]
  byName: Map<string, CountryFeature>
  /** Main territory per feature (drops far-away overseas parts). */
  mainland: Map<string, CountryFeature>
  /** Six merged continent outlines (no country borders). */
  continents: ContinentFeature[]
}

type Atlas = Topology<{
  countries: GeometryCollection<CountryProps>
  continents: GeometryCollection<{ id: ContinentId }>
}>

let pending: Promise<WorldData> | null = null

export function loadWorld(): Promise<WorldData> {
  pending ??= import('./generated/atlas.json').then((mod) => {
    const topo = (mod.default ?? mod) as unknown as Atlas
    const features = (feature(topo, topo.objects.countries) as FeatureCollection<Polygon | MultiPolygon, CountryProps>).features
    const continents = (feature(topo, topo.objects.continents) as FeatureCollection<Polygon | MultiPolygon, { id: ContinentId }>).features
    return {
      features,
      byName: new Map(features.map((f) => [f.properties.name, f])),
      mainland: new Map(features.map((f) => [f.properties.name, mainlandOf(f)])),
      continents,
    }
  })
  return pending
}

const MAX_MAINLAND_DISTANCE_DEG = 20

function mainlandOf(f: CountryFeature): CountryFeature {
  if (f.geometry.type !== 'MultiPolygon') return f
  if (['KI', 'FM', 'MH', 'FJ', 'ID', 'PH', 'PG', 'VU', 'SB', 'TO', 'WS', 'CV', 'SC'].includes(f.properties.iso)) return f
  const parts = f.geometry.coordinates.map((coordinates) => {
    const polygon: Polygon = { type: 'Polygon', coordinates }
    return { coordinates, area: geoArea(polygon), centroid: geoCentroid(polygon) }
  })
  const largest = parts.reduce((a, b) => (b.area > a.area ? b : a))
  const near = parts.filter((p) => (geoDistance(p.centroid, largest.centroid) * 180) / Math.PI <= MAX_MAINLAND_DISTANCE_DEG)
  return { ...f, geometry: { type: 'MultiPolygon', coordinates: near.map((p) => p.coordinates) } }
}
