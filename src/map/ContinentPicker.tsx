import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { geoEqualEarth, geoGraticule10, geoPath } from 'd3-geo'
import { useTranslation } from 'react-i18next'
import type { WorldData } from '../data/world'
import type { ContinentId } from '../domain/types'
import { useContent } from '../i18n/useContent'
import { useSize } from './useSize'

/** How long a tapped continent stays highlighted before it counts as the answer. */
export const PICK_DELAY_MS = 300
const PAD = 8

export interface ContinentVerdict {
  id: ContinentId
  correct: boolean
}

interface Props {
  world: WorldData
  onPick: (id: ContinentId) => void
  /** Once set, the map is locked and the answered continent shows green or red. */
  verdict?: ContinentVerdict | null
}

/** World map of the six continents only. A tap highlights, then answers after PICK_DELAY_MS. */
export function ContinentPicker({ world, onPick, verdict = null }: Props) {
  const frameRef = useRef<HTMLDivElement>(null)
  const { w, h } = useSize(frameRef)
  const [picked, setPicked] = useState<ContinentId | null>(null)
  const { t } = useTranslation()
  const { continentName } = useContent()
  const timer = useRef<number>()
  const onPickRef = useRef(onPick)
  useLayoutEffect(() => { onPickRef.current = onPick }, [onPick])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const geo = useMemo(() => {
    if (!w || !h) return null
    const projection = geoEqualEarth().fitExtent(
      [
        [PAD, PAD],
        [w - PAD, h - PAD],
      ],
      { type: 'FeatureCollection', features: world.continents },
    )
    const path = geoPath(projection)
    return {
      shapes: world.continents.map((f) => ({ id: f.properties.id, d: path(f) ?? '' })),
      graticule: path(geoGraticule10()) ?? '',
      sphere: path({ type: 'Sphere' }) ?? '',
    }
  }, [world, w, h])

  const handleClick = (event: MouseEvent<SVGGElement>) => {
    const id = (event.target as Element).closest('[data-continent]')?.getAttribute('data-continent') as ContinentId | null
    if (!id || verdict) return
    setPicked(id)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => onPickRef.current(id), PICK_DELAY_MS)
  }

  const shown = verdict?.id ?? picked
  const tone = verdict ? (verdict.correct ? ' is-correct' : ' is-wrong') : ''
  const shapeClass = (id: ContinentId) => (id !== shown ? '' : verdict ? tone : ' is-picked')

  return (
    <div ref={frameRef} className={`map-frame${verdict ? '' : ' is-interactive'}`}>
      {geo && (
        <svg className="map-svg" width={w} height={h} role="img" aria-label={t('map.worldLabel')}>
          <path className="map-sphere" d={geo.sphere} />
          <path className="map-graticule" d={geo.graticule} />
          <g onClick={handleClick}>
            {geo.shapes.map((s) => (
              <path key={`hit-${s.id}`} data-continent={s.id} className="map-continent-hit" d={s.d} />
            ))}
            {geo.shapes.map((s) => (
              <path key={s.id} data-continent={s.id} className={`map-continent${shapeClass(s.id)}`} d={s.d} />
            ))}
          </g>
        </svg>
      )}
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
