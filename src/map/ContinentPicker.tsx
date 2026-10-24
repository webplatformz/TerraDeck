import { useEffect, useMemo, useRef } from 'react'
import type { MouseEvent } from 'react'
import { geoEquirectangular, geoGraticule10, geoPath } from 'd3-geo'
import { select } from 'd3-selection'
import 'd3-transition'
import { zoom, zoomIdentity, zoomTransform, type ZoomBehavior } from 'd3-zoom'
import { useTranslation } from 'react-i18next'
import type { WorldData } from '../data/world'
import type { ContinentId } from '../domain/types'
import { useContent } from '../i18n/useContent'
import { prefersReducedMotion, useSize } from './useSize'
import { CONTINENT_VIEWS } from './projections'

const PAD = 8
const OVERVIEW_SCALE = 1.12
const MAX_ZOOM = 4
const SELECTION_ZOOM = 1.5

export interface ContinentVerdict {
  id: ContinentId
  correct: boolean
}

interface Props {
  world: WorldData
  onPick: (id: ContinentId) => void
  picked: ContinentId | null
  /** Once set, the map is locked and the answered continent shows green or red. */
  verdict?: ContinentVerdict | null
}

/** World map of the six continents, sharing pending selection with the continent buttons. */
export function ContinentPicker({ world, onPick, picked, verdict = null }: Props) {
  const frameRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const layerRef = useRef<SVGGElement>(null)
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const { w, h } = useSize(frameRef)
  const { t } = useTranslation()
  const { continentName } = useContent()
  const geo = useMemo(() => {
    if (!w || !h) return null
    const projection = geoEquirectangular().fitExtent(
      [
        [PAD, PAD],
        [w - PAD, h - PAD],
      ],
      { type: 'FeatureCollection', features: world.continents },
    )
    const bounds = geoPath(projection).bounds({ type: 'FeatureCollection', features: world.continents })
    const landHeight = bounds[1][1] - bounds[0][1]
    const enlargement = Math.min(OVERVIEW_SCALE, (h - 2 * PAD) / landHeight)
    const [x, y] = projection.translate()
    projection
      .scale(projection.scale() * enlargement)
      .translate([w / 2 + (x - w / 2) * enlargement, h / 2 + (y - h / 2) * enlargement])
      .clipExtent([[0, 0], [w, h]])
    const path = geoPath(projection)
    return {
      shapes: world.continents.map((f) => ({ id: f.properties.id, d: path(f) ?? '' })),
      graticule: path(geoGraticule10()) ?? '',
      sphere: path({ type: 'Sphere' }) ?? '',
      centers: new Map(world.continents.map(f => [
        f.properties.id,
        projection(CONTINENT_VIEWS[f.properties.id].center),
      ])),
    }
  }, [world, w, h])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg || !w || !h) return
    const behavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, MAX_ZOOM])
      .translateExtent([[0, 0], [w, h]])
      .extent([[0, 0], [w, h]])
      .clickDistance(8)
      .on('zoom', event => {
        layerRef.current?.setAttribute('transform', event.transform.toString())
      })
    select(svg).call(behavior).on('dblclick.zoom', null).call(behavior.transform, zoomIdentity)
    zoomRef.current = behavior
    return () => {
      select(svg).interrupt().on('.zoom', null)
      zoomRef.current = null
    }
  }, [w, h])

  useEffect(() => {
    const svg = svgRef.current
    const behavior = zoomRef.current
    if (!svg || !behavior || !geo || !picked || verdict) return
    const center = geo.centers.get(picked)
    if (!center) return
    const scale = Math.max(SELECTION_ZOOM, zoomTransform(svg).k)
    const desired = zoomIdentity
      .translate(w / 2 - center[0] * scale, h / 2 - center[1] * scale)
      .scale(scale)
    const target = behavior.constrain()(desired, [[0, 0], [w, h]], [[0, 0], [w, h]])
    select(svg).transition().duration(prefersReducedMotion() ? 0 : 400).call(behavior.transform, target)
  }, [picked, verdict, geo, w, h])

  const zoomBy = (factor: number) => {
    const svg = svgRef.current
    if (!svg || !zoomRef.current) return
    select(svg).transition().duration(prefersReducedMotion() ? 0 : 250).call(zoomRef.current.scaleBy, factor)
  }
  const resetView = () => {
    const svg = svgRef.current
    if (!svg || !zoomRef.current) return
    select(svg).transition().duration(prefersReducedMotion() ? 0 : 400).call(zoomRef.current.transform, zoomIdentity)
  }

  const handleClick = (event: MouseEvent<SVGGElement>) => {
    if (event.defaultPrevented) return
    const id = (event.target as Element).closest('[data-continent]')?.getAttribute('data-continent') as ContinentId | null
    if (!id || verdict) return
    onPick(id)
  }

  const shown = verdict?.id ?? picked
  const tone = verdict ? (verdict.correct ? ' is-correct' : ' is-wrong') : ''
  const shapeClass = (id: ContinentId) => (id !== shown ? '' : verdict ? tone : ' is-picked')

  return (
    <div ref={frameRef} className={`map-frame${verdict ? '' : ' is-interactive'}`}>
      {geo && (
        <svg ref={svgRef} className="map-svg" width={w} height={h} role="img" aria-label={t('map.worldLabel')}>
          <rect className="map-ocean-hit" width={w} height={h} />
          <g ref={layerRef} onClick={handleClick}>
            <path className="map-sphere" d={geo.sphere} />
            <path className="map-graticule" d={geo.graticule} />
            {geo.shapes.map((s) => (
              <path key={`hit-${s.id}`} data-continent={s.id} className="map-continent-hit" d={s.d} />
            ))}
            {geo.shapes.map((s) => (
              <path key={s.id} data-continent={s.id} className={`map-continent${shapeClass(s.id)}`} d={s.d} />
            ))}
          </g>
        </svg>
      )}
      <div className="map-controls">
        <button type="button" aria-label={t('map.zoomIn')} onClick={() => zoomBy(2)}>+</button>
        <button type="button" aria-label={t('map.zoomOut')} onClick={() => zoomBy(0.5)}>−</button>
        <button type="button" aria-label={t('map.resetView')} onClick={resetView}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
            <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {shown && (
        <div className={`map-label${tone}`} key={shown}>
          {verdict && <span aria-hidden="true">{verdict.correct ? '✓ ' : '✕ '}</span>}
          {continentName(shown)}
        </div>
      )}
      {!geo && <div className="map-loading">{t('common.loadingMap')}</div>}
    </div>
  )
}
