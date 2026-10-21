import { geoArea, geoAzimuthalEqualArea, geoCentroid, type GeoProjection } from 'd3-geo'
import type { MultiPolygon, Polygon } from 'geojson'
import type { CountryFeature } from '../data/world'
import type { ContinentId } from '../domain/types'

interface ContinentView {
  /** Centre of the azimuthal equal-area projection: [lon, lat]. */
  center: [number, number]
  /** Land whose centre lies in this box is framed on screen: [west, south, east, north]. East may exceed 180. */
  frame: Box
  /** Land in these boxes never widens the frame (it is still drawn and tappable). */
  exclude?: Box[]
}

type Box = [west: number, south: number, east: number, north: number]

export const CONTINENT_VIEWS: Record<ContinentId, ContinentView> = {
  africa: { center: [17, 2], frame: [-26, -36, 60, 38] },
  asia: { center: [95, 42], frame: [26, -12, 192, 82] },
  // North of 72° (Svalbard) is left out so mainland Europe gets more room.
  europe: { center: [14, 54], frame: [-30, 34, 45, 72] },
  // Hawaii is left out; the Lesser Antilles are kept.
  'north-america': { center: [-94, 45], frame: [-170, 5, -10, 84], exclude: [[-180, 15, -150, 25]] },
  // Galápagos is left out.
  'south-america': { center: [-60, -20], frame: [-85, -60, -30, 15] },
  oceania: { center: [150, -22], frame: [110, -50, 185, 0] },
}

export function continentProjection(id: ContinentId): GeoProjection {
  const [lon, lat] = CONTINENT_VIEWS[id].center
  return geoAzimuthalEqualArea().rotate([-lon, -lat]).clipAngle(90)
}

/** Islands smaller than this (≈ 4,000 km²) don't widen the frame; they are still drawn and tappable. */
const MIN_FRAMING_AREA_SR = 1e-4

const inBox = ([lon, lat]: [number, number], [west, south, east, north]: Box) => {
  const x = lon < west ? lon + 360 : lon
  return x <= east && lat >= south && lat <= north
}

/** The continent's own land inside its frame, used to fit the projection to the screen. */
export function framingLand(id: ContinentId, features: CountryFeature[]): MultiPolygon {
  const { frame, exclude = [] } = CONTINENT_VIEWS[id]
  const coordinates: Polygon['coordinates'][] = []
  for (const f of features) {
    if (f.properties.continent !== id) continue
    const polygons = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates]
    for (const rings of polygons) {
      const polygon: Polygon = { type: 'Polygon', coordinates: rings }
      if (geoArea(polygon) < MIN_FRAMING_AREA_SR) continue
      const centroid = geoCentroid(polygon)
      if (inBox(centroid, frame) && !exclude.some((box) => inBox(centroid, box))) coordinates.push(rings)
    }
  }
  return { type: 'MultiPolygon', coordinates }
}
