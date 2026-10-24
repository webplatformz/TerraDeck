import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { geoGraticule10, geoPath } from 'd3-geo'
import { select } from 'd3-selection'
import 'd3-transition'
import { zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom'
import type { WorldData } from '../data/world'
import type { ContinentId } from '../domain/types'
import { continentProjection, framingLand } from './projections'
import { prefersReducedMotion, useSize } from './useSize'

export type MarkTone = 'correct' | 'wrong' | 'target'

interface Props {
  world: WorldData
  continent: ContinentId
  interactive: boolean
  selected?: string | null
  marks?: { mapName: string; tone: MarkTone }[]
  pulse?: string | null
  /** Shapes to frame when the map opens (e.g. the answer and the wrong tap). */
  focus?: string[]
  label?: string
  onSelect?: (mapName: string) => void
}

type Pt = [number, number]

interface Shape {
  name: string
  d: string
  member: boolean
  excluded: boolean
  centroid: Pt
  /** Largest side of the mainland bounding box at zoom 1, in px. */
  extent: number
  bounds: [Pt, Pt]
}

const PAD = 12
const MAX_ZOOM = 8
const SELECTION_ZOOM = 1.5
/** Countries smaller than this on screen can also be picked by tapping near them. */
const SMALL_PX = 30
/** Two or more small countries within this radius of a tap open the magnifier. */
const CROWD_RADIUS_PX = 24
const OCEAN_SNAP_PX = 28
const LENS_RADIUS_PX = 96
const LENS_HIT_PX = 20
/** Aim for this gap between the closest pair of crowded countries inside the lens. */
const LENS_TARGET_GAP_PX = 36

const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1])
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

interface Lens {
  /** Tap point and lens centre, in screen px. */
  at: Pt
  center: Pt
  scale: number
}

/** One continent, drawn with its own projection. Neighbouring land is faded and cannot be tapped. */
export function ContinentMap({ world, continent, interactive, selected, marks = [], pulse, focus, label, onSelect }: Props) {
  const frameRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const layerRef = useRef<SVGGElement>(null)
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const transformRef = useRef<ZoomTransform>(zoomIdentity)
  const { w, h } = useSize(frameRef)
  const [t, setT] = useState<ZoomTransform>(zoomIdentity)
  const [lens, setLens] = useState<Lens | null>(null)
  const { t: tr } = useTranslation()
  const clipId = useId()

  const land = useMemo(() => framingLand(continent, world.features), [world, continent])

  const geo = useMemo(() => {
    if (!w || !h) return null
    const projection = continentProjection(continent)
      .fitExtent(
        [
          [PAD, PAD],
          [w - PAD, h - PAD],
        ],
        land,
      )
      .clipExtent([
        [-40, -40],
        [w + 40, h + 40],
      ])
    const path = geoPath(projection)
    const shapes: Shape[] = []
    for (const f of world.features) {
      const d = path(f)
      if (!d) continue
      const name = f.properties.name
      const main = world.mainland.get(name) ?? f
      const bounds = path.bounds(main) as [Pt, Pt]
      const [[x0, y0], [x1, y1]] = bounds
      shapes.push({
        name,
        d,
        member: f.properties.continent === continent && !f.properties.excluded,
        excluded: f.properties.excluded,
        centroid: path.centroid(main) as Pt,
        extent: Math.max(x1 - x0, y1 - y0),
        bounds,
      })
    }
    const members = shapes.filter((s) => s.member && Number.isFinite(s.centroid[0]) && s.centroid[0] >= 0 && s.centroid[0] <= w && s.centroid[1] >= 0 && s.centroid[1] <= h)
    return {
      shapes,
      members,
      byName: new Map(shapes.map((s) => [s.name, s])),
      graticule: path(geoGraticule10()) ?? '',
    }
  }, [world, continent, land, w, h])

  // Zoom: 1–8×, panning kept inside the continent frame.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg || !w || !h) return
    let frame = 0
    const behavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, MAX_ZOOM])
      .translateExtent([
        [0, 0],
        [w, h],
      ])
      .extent([
        [0, 0],
        [w, h],
      ])
      .clickDistance(8)
      .on('zoom', (event) => {
        const next: ZoomTransform = event.transform
        const prev = transformRef.current
        transformRef.current = next
        layerRef.current?.setAttribute('transform', next.toString())
        if (next.k !== prev.k || next.x !== prev.x || next.y !== prev.y) setLens(null)
        cancelAnimationFrame(frame)
        frame = requestAnimationFrame(() => setT(next))
      })
    // No double-tap zoom: two quick taps (open magnifier, then pick inside it) must not zoom and close the lens.
    select(svg).call(behavior).on('dblclick.zoom', null)
    zoomRef.current = behavior
    return () => {
      cancelAnimationFrame(frame)
      select(svg).on('.zoom', null)
    }
  }, [w, h])

  const focusKey = focus?.join('|') ?? ''
  const home = useMemo(() => {
    if (!geo || !focusKey) return zoomIdentity
    const boxes = focusKey.split('|').map((n) => geo.byName.get(n)?.bounds).filter((b): b is [Pt, Pt] => !!b)
    if (!boxes.length) return zoomIdentity
    const x0 = Math.min(...boxes.map((b) => b[0][0]))
    const y0 = Math.min(...boxes.map((b) => b[0][1]))
    const x1 = Math.max(...boxes.map((b) => b[1][0]))
    const y1 = Math.max(...boxes.map((b) => b[1][1]))
    const k = clamp(0.5 / Math.max((x1 - x0) / w, (y1 - y0) / h), 1, 4)
    return zoomIdentity.translate(w / 2 - (k * (x0 + x1)) / 2, h / 2 - (k * (y0 + y1)) / 2).scale(k)
  }, [geo, focusKey, w, h])

  useEffect(() => {
    const svg = svgRef.current
    const behavior = zoomRef.current
    if (!svg || !behavior || !geo) return
    const duration = home === zoomIdentity || prefersReducedMotion() ? 0 : 700
    select(svg).transition().duration(duration).call(behavior.transform, home)
  }, [home, geo])

  useEffect(() => {
    const svg = svgRef.current
    const behavior = zoomRef.current
    if (!svg || !behavior || !geo || !selected || !interactive || focusKey) return
    const shape = geo.byName.get(selected)
    if (!shape?.member || !shape.centroid.every(Number.isFinite)) return
    const scale = Math.max(SELECTION_ZOOM, transformRef.current.k)
    const desired = zoomIdentity
      .translate(w / 2 - shape.centroid[0] * scale, h / 2 - shape.centroid[1] * scale)
      .scale(scale)
    const target = behavior.constrain()(desired, [[0, 0], [w, h]], [[0, 0], [w, h]])
    select(svg).transition().duration(prefersReducedMotion() ? 0 : 400).call(behavior.transform, target)
  }, [selected, interactive, focusKey, geo, w, h])

  const zoomBy = (factor: number) => {
    const svg = svgRef.current
    if (!svg || !zoomRef.current) return
    select(svg).transition().duration(prefersReducedMotion() ? 0 : 250).call(zoomRef.current.scaleBy, factor)
  }
  const resetView = () => {
    const svg = svgRef.current
    if (!svg || !zoomRef.current) return
    setLens(null)
    select(svg).transition().duration(prefersReducedMotion() ? 0 : 400).call(zoomRef.current.transform, home)
  }

  /** Resolves a tap to the country under it plus nearby small countries, in a given screen mapping. */
  const probe = (event: MouseEvent, tap: Pt, toScreen: (s: Shape) => Pt, scale: number, inLens: boolean) => {
    const members = geo?.members ?? []
    const underElement = document
      .elementsFromPoint(event.clientX, event.clientY)
      .find((el) => el.matches('path[data-map-land]') && !!el.closest('.map-lens') === inLens)
    const blocked = underElement?.getAttribute('data-excluded') === 'true'
    const under = underElement?.getAttribute('data-name')
    const direct = under ? members.find((s) => s.name === under) : undefined
    const isSmall = (s: Shape) => s.extent * scale < SMALL_PX
    const near = (radius: number) =>
      members
        .filter((s) => s !== direct && isSmall(s) && dist(toScreen(s), tap) <= radius)
        .sort((a, b) => dist(toScreen(a), tap) - dist(toScreen(b), tap))
    const nearest = (radius: number) => members.filter((s) => dist(toScreen(s), tap) <= radius).sort((a, b) => dist(toScreen(a), tap) - dist(toScreen(b), tap))[0]
    return { direct, isSmall, near, nearest, blocked }
  }

  const handleMapClick = (event: MouseEvent<SVGSVGElement>) => {
    if (!interactive || !onSelect || !geo || !svgRef.current) return
    if (lens) return setLens(null)
    const rect = svgRef.current.getBoundingClientRect()
    const tap: Pt = [event.clientX - rect.left, event.clientY - rect.top]
    const tr = transformRef.current
    const toScreen = (s: Shape) => tr.apply(s.centroid) as Pt
    const { direct, isSmall, near, nearest, blocked } = probe(event, tap, toScreen, tr.k, false)
    if (blocked) return
    const crowd = near(CROWD_RADIUS_PX)

    // Ambiguous: two or more small countries in reach, or a small one right next to the country under the finger.
    const ambiguous = direct ? (isSmall(direct) ? crowd.length >= 1 : near(CROWD_RADIUS_PX / 2).length >= 1) : crowd.length >= 2
    if (ambiguous) {
      const points = [...(direct ? [direct] : []), ...crowd].map(toScreen)
      let gap = Infinity
      points.forEach((a, i) => points.slice(i + 1).forEach((b) => (gap = Math.min(gap, dist(a, b)))))
      const scale = clamp(LENS_TARGET_GAP_PX / Math.max(gap, 1), 3, 6)
      const r = LENS_RADIUS_PX + 4
      return setLens({ at: tap, center: [clamp(tap[0], r, w - r), clamp(tap[1], r, h - r)], scale })
    }
    const pick = direct ?? crowd[0] ?? nearest(OCEAN_SNAP_PX)
    if (pick) onSelect(pick.name)
  }

  const handleLensClick = (event: MouseEvent<SVGGElement>) => {
    event.stopPropagation()
    if (!lens || !geo || !onSelect || !svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const tap: Pt = [event.clientX - rect.left, event.clientY - rect.top]
    if (dist(tap, lens.center) > LENS_RADIUS_PX) return setLens(null)
    const tr = transformRef.current
    const toScreen = (s: Shape): Pt => {
      const [sx, sy] = tr.apply(s.centroid)
      return [lens.center[0] + (sx - lens.at[0]) * lens.scale, lens.center[1] + (sy - lens.at[1]) * lens.scale]
    }
    const { direct, near, nearest, blocked } = probe(event, tap, toScreen, tr.k * lens.scale, true)
    if (blocked) return
    const pick = direct ?? near(LENS_HIT_PX)[0] ?? nearest(OCEAN_SNAP_PX)
    if (pick) {
      setLens(null)
      onSelect(pick.name)
    }
  }

  const k = t.k
  const markByName = new Map(marks.map((m) => [m.mapName, m.tone]))

  const renderLand = (scale: number, keyPrefix: string) =>
    geo && (
      <>
        <path className="map-graticule" d={geo.graticule} />
        {geo.shapes.map((s) => {
          const tone = s.excluded ? undefined : markByName.get(s.name)
          const cls = ['map-land', !s.member && 'is-faded', s.excluded && 'is-excluded', !s.excluded && s.name === selected && 'is-selected', tone && `is-${tone}`].filter(Boolean).join(' ')
          return <path key={keyPrefix + s.name} data-map-land="" data-excluded={s.excluded} data-name={s.member ? s.name : undefined} className={cls} d={s.d} />
        })}
        {[...markByName.entries(), ...(selected ? [[selected, 'selected'] as const] : [])].map(([name, tone]) => {
          const s = geo.byName.get(name)
          if (!s || s.excluded || s.extent * scale >= SMALL_PX) return null
          return <circle key={`${keyPrefix}ring-${name}`} className={`map-ring map-ring--${tone}`} cx={s.centroid[0]} cy={s.centroid[1]} r={11 / scale} />
        })}
      </>
    )

  const pulseShape = pulse && geo ? geo.byName.get(pulse) : undefined
  const lensTransform = lens ? `translate(${lens.center[0]},${lens.center[1]}) scale(${lens.scale}) translate(${-lens.at[0]},${-lens.at[1]}) ${t.toString()}` : ''

  return (
    <div ref={frameRef} className={`map-frame${interactive ? ' is-interactive' : ''}`}>
      {geo && (
        <svg ref={svgRef} className="map-svg" width={w} height={h} role="img" aria-label={label ? tr('map.unlabelledOf', { continent: label }) : tr('map.unlabelled')} onClick={handleMapClick}>
          <rect className="map-ocean-hit" width={w} height={h} />
          <g ref={layerRef}>
            {renderLand(k, '')}
            {pulseShape && !pulseShape.excluded && (
              <g transform={`translate(${pulseShape.centroid[0]},${pulseShape.centroid[1]}) scale(${1 / k})`}>
                <circle className="map-pulse" r={16} />
                <circle className="map-pulse map-pulse--late" r={16} />
              </g>
            )}
          </g>
          {lens && (
            <g className="map-lens" onClick={handleLensClick}>
              <clipPath id={clipId}>
                <circle cx={lens.center[0]} cy={lens.center[1]} r={LENS_RADIUS_PX} />
              </clipPath>
              <circle className="map-lens-shadow" cx={lens.center[0]} cy={lens.center[1]} r={LENS_RADIUS_PX + 2} />
              <g clipPath={`url(#${clipId})`}>
                <circle className="map-lens-ocean" cx={lens.center[0]} cy={lens.center[1]} r={LENS_RADIUS_PX} />
                <g transform={lensTransform}>{renderLand(k * lens.scale, 'lens-')}</g>
              </g>
              <circle className="map-lens-rim" cx={lens.center[0]} cy={lens.center[1]} r={LENS_RADIUS_PX} />
            </g>
          )}
        </svg>
      )}
      {label && <div className="map-label">{label}</div>}
      {lens && <div className="map-hint">{tr('map.lensHint')}</div>}
      <div className="map-controls">
        <button type="button" aria-label={tr('map.zoomIn')} onClick={() => zoomBy(2)}>
          +
        </button>
        <button type="button" aria-label={tr('map.zoomOut')} onClick={() => zoomBy(0.5)}>
          −
        </button>
        <button type="button" aria-label={tr('map.resetView')} onClick={resetView}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
            <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {!geo && <div className="map-loading">{tr('common.loadingMap')}</div>}
    </div>
  )
}
