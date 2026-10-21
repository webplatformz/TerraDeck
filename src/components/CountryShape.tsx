import { useMemo } from 'react'
import { geoAzimuthalEqualArea, geoCentroid, geoPath } from 'd3-geo'
import { useWorld } from '../map/useWorld'

export function CountryShape({ mapName, className = '' }: { mapName: string; className?: string }) {
  const world = useWorld()
  const d = useMemo(() => {
    const f = world?.mainland.get(mapName)
    if (!f) return null
    const [lon, lat] = geoCentroid(f)
    const projection = geoAzimuthalEqualArea()
      .rotate([-lon, -lat])
      .fitExtent(
        [
          [8, 8],
          [92, 92],
        ],
        f,
      )
    return geoPath(projection)(f)
  }, [world, mapName])

  return (
    <svg className={`country-shape ${className}`} viewBox="0 0 100 100" aria-hidden>
      {d && <path d={d} />}
    </svg>
  )
}
