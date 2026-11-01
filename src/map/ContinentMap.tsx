import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { MouseEvent, PointerEvent } from 'react'
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
  /** Optional training labels; only correctly marked countries can be named. */
  countryNames?: { mapName: string; name: string }[]
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
/** A stationary press must last this long before the magnifier appears. */
const HOLD_DURATION_MS = 450
/** Movement beyond this distance before the hold matures is a pan, not a selection. */
const HOLD_TOLERANCE_PX = 10
/** Countries this small can also be selected by tapping nearby. */
const CROWD_RADIUS_PX = 24
const OCEAN_SNAP_PX = 28
const LENS_RADIUS_PX = 96
const LENS_SCALE = 4
const LENS_OFFSET_PX = LENS_RADIUS_PX + 28

const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1])
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

interface Lens {
  /** Map point beneath the finger and the display centre, in screen px. */
  at: Pt
  center: Pt
  scale: number
  world: WorldData
  continent: ContinentId
  width: number
  height: number
}

interface MapGesture {
  pointerId: number
  pointerType: string
  start: Pt
  current: Pt
  timer: ReturnType<typeof setTimeout> | null
  held: boolean
  moved: boolean
  cancelled: boolean
}

/** One continent, drawn with its own projection. Neighbouring land is faded and cannot be tapped. */
export function ContinentMap({ world, continent, interactive, selected, marks = [], pulse, focus, label, countryNames, onSelect }: Props) {
  const frameRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const layerRef = useRef<SVGGElement>(null)
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const transformRef = useRef<ZoomTransform>(zoomIdentity)
  const gestureRef = useRef<MapGesture | null>(null)
  const pointersRef = useRef(new Set<number>())
  const suppressClickRef = useRef<{ at: Pt; until: number } | null>(null)
  const { w, h } = useSize(frameRef)
  const [t, setT] = useState<ZoomTransform>(zoomIdentity)
  const [lens, setLens] = useState<Lens | null>(null)
  const { t: tr } = useTranslation()
  const clipId = useId()

  const land = useMemo(() => framingLand(continent, world.features), [world, continent])

  const cancelGesture = () => {
    const gesture = gestureRef.current
    if (gesture) {
      if (gesture.timer) clearTimeout(gesture.timer)
      suppressClickRef.current = { at: gesture.current, until: Date.now() + 700 }
    }
    gestureRef.current = null
    pointersRef.current.clear()
    setLens(null)
  }

  useEffect(() => {
    const pointers = pointersRef.current
    return () => {
      const gesture = gestureRef.current
      if (gesture) {
        if (gesture.timer) clearTimeout(gesture.timer)
        suppressClickRef.current = { at: gesture.current, until: Date.now() + 700 }
      }
      gestureRef.current = null
      pointers.clear()
    }
  }, [world, continent, w, h, interactive])

  useEffect(() => {
    const cancelOnBlur = () => cancelGesture()
    const cancelWhenHidden = () => {
      if (document.visibilityState === 'hidden') cancelGesture()
    }
    const suppressZoomMove = (event: Event) => {
      if (!gestureRef.current?.held || gestureRef.current.cancelled) return
      event.stopImmediatePropagation()
      if (event.cancelable) event.preventDefault()
    }
    window.addEventListener('blur', cancelOnBlur)
    document.addEventListener('visibilitychange', cancelWhenHidden)
    window.addEventListener('mousemove', suppressZoomMove, true)
    window.addEventListener('touchmove', suppressZoomMove, { capture: true, passive: false })
    return () => {
      window.removeEventListener('blur', cancelOnBlur)
      document.removeEventListener('visibilitychange', cancelWhenHidden)
      window.removeEventListener('mousemove', suppressZoomMove, true)
      window.removeEventListener('touchmove', suppressZoomMove, true)
      cancelGesture()
    }
  }, [])

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

  const activeLens = lens && lens.world === world && lens.continent === continent && lens.width === w && lens.height === h && interactive
    ? lens
    : null
  const makeLens = (at: Pt, center: Pt): Lens => ({ at, center, scale: LENS_SCALE, world, continent, width: w, height: h })

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
    // Keep repeated country taps from unexpectedly changing the view.
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

  /** Resolves a map point to its country plus nearby small countries. */
  const probe = (event: { clientX: number; clientY: number }, tap: Pt, toScreen: (s: Shape) => Pt, scale: number) => {
    const members = geo?.members ?? []
    const underElement = document
      .elementsFromPoint(event.clientX, event.clientY)
      .find((el) => el.matches('path[data-map-land]'))
    const blocked = underElement?.getAttribute('data-excluded') === 'true'
    const under = underElement?.getAttribute('data-name')
    const direct = under ? members.find((s) => s.name === under) : undefined
    const isSmall = (s: Shape) => s.extent * scale < SMALL_PX
    const near = (radius: number) =>
      members
        .filter((s) => s !== direct && isSmall(s) && dist(toScreen(s), tap) <= radius)
        .sort((a, b) => dist(toScreen(a), tap) - dist(toScreen(b), tap))
    const nearest = (radius: number) => members.filter((s) => dist(toScreen(s), tap) <= radius).sort((a, b) => dist(toScreen(a), tap) - dist(toScreen(b), tap))[0]
    return { direct, near, nearest, blocked }
  }

  const selectAt = (event: { clientX: number; clientY: number }, magnified: boolean) => {
    if (!interactive || !onSelect || !geo || !svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const tap: Pt = [event.clientX - rect.left, event.clientY - rect.top]
    const tr = transformRef.current
    const toScreen = (s: Shape) => tr.apply(s.centroid) as Pt
    const { direct, near, nearest, blocked } = probe(event, tap, toScreen, tr.k)
    if (blocked) return
    if (magnified) {
      if (direct?.member) onSelect(direct.name)
      return
    }
    const crowd = near(CROWD_RADIUS_PX)

    // A normal tap never opens the magnifier; nearby small countries remain easy to pick.
    const pick = direct ?? crowd[0] ?? nearest(OCEAN_SNAP_PX)
    if (pick) onSelect(pick.name)
  }

  const handleMapClick = (event: MouseEvent<SVGSVGElement>) => {
    const suppressed = suppressClickRef.current
    if (suppressed && Date.now() <= suppressed.until && dist([event.clientX, event.clientY], suppressed.at) < 24) {
      suppressClickRef.current = null
      return
    }
    if (suppressed && Date.now() > suppressed.until) suppressClickRef.current = null
    selectAt(event, false)
  }

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (!interactive || !onSelect || event.button !== 0) return
    const point: Pt = [event.clientX, event.clientY]
    pointersRef.current.add(event.pointerId)
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Capture can fail when a browser has already cancelled the pointer.
    }
    const gesture = gestureRef.current
    if (gesture) {
      if (event.pointerType === 'touch' && gesture.pointerType === 'touch') {
        gesture.cancelled = true
        if (gesture.timer) clearTimeout(gesture.timer)
        gesture.timer = null
        setLens(null)
      }
      return
    }
    const next: MapGesture = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      start: point,
      current: point,
      timer: null,
      held: false,
      moved: false,
      cancelled: false,
    }
    gestureRef.current = next
    next.timer = setTimeout(() => {
      if (gestureRef.current !== next || next.moved || next.cancelled || pointersRef.current.size > 1) return
      next.held = true
      const rect = svgRef.current?.getBoundingClientRect()
      if (!rect) return
      const at: Pt = [next.current[0] - rect.left, next.current[1] - rect.top]
      const radius = Math.min(LENS_RADIUS_PX, w / 2, h / 2)
      const center: Pt = [
        clamp(at[0], radius, w - radius),
        clamp(at[1] - LENS_OFFSET_PX, radius, h - radius),
      ]
      setLens(makeLens(at, center))
    }, HOLD_DURATION_MS)
  }

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const gesture = gestureRef.current
    if (!gesture || gesture.pointerId !== event.pointerId || gesture.cancelled) return
    gesture.current = [event.clientX, event.clientY]
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    if (!gesture.held && dist(gesture.start, gesture.current) > HOLD_TOLERANCE_PX) {
      gesture.moved = true
      if (gesture.timer) clearTimeout(gesture.timer)
      gesture.timer = null
      return
    }
    if (gesture.held) {
      event.preventDefault()
      const at: Pt = [event.clientX - rect.left, event.clientY - rect.top]
      const radius = Math.min(LENS_RADIUS_PX, w / 2, h / 2)
      setLens(makeLens(at, [clamp(at[0], radius, w - radius), clamp(at[1] - LENS_OFFSET_PX, radius, h - radius)]))
    }
  }

  const finishPointer = (event: PointerEvent<SVGSVGElement>, cancelled: boolean) => {
    pointersRef.current.delete(event.pointerId)
    const gesture = gestureRef.current
    if (!gesture || gesture.pointerId !== event.pointerId) return
    if (gesture.timer) clearTimeout(gesture.timer)
    gesture.timer = null
    const shouldSelect = !cancelled && !gesture.cancelled && !gesture.moved
    const wasHeld = gesture.held
    const point: Pt = [event.clientX, event.clientY]
    gestureRef.current = null
    setLens(null)
    if (shouldSelect) selectAt(event, wasHeld)
    if (shouldSelect || cancelled || gesture.moved || gesture.cancelled) {
      suppressClickRef.current = { at: point, until: Date.now() + 700 }
    }
  }

  const handlePointerCancel = (event: PointerEvent<SVGSVGElement>) => finishPointer(event, true)

  const handleLostPointerCapture = (event: PointerEvent<SVGSVGElement>) => {
    if (gestureRef.current?.pointerId === event.pointerId) finishPointer(event, true)
  }

  const k = t.k
  const markByName = new Map(marks.map((m) => [m.mapName, m.tone]))
  const nameLabels = (() => {
    if (!countryNames || !geo || k < 2 || activeLens) return []
    const context = document.createElement('canvas').getContext('2d')
    if (context) context.font = `600 12px ${getComputedStyle(document.documentElement).fontFamily}`
    const boxes: { left: number; right: number; top: number; bottom: number }[] = []
    const candidates = countryNames.flatMap(entry => {
      const shape = geo.byName.get(entry.mapName)
      if (!shape?.member || markByName.get(entry.mapName) !== 'correct' || shape.extent * k < 40) return []
      const [x, y] = t.apply(shape.centroid)
      if (!Number.isFinite(x) || !Number.isFinite(y)) return []
      return [{ ...entry, x, y, extent: shape.extent }]
    }).sort((a, b) => b.extent - a.extent || a.mapName.localeCompare(b.mapName))
    return candidates.filter(entry => {
      const width = (context?.measureText(entry.name).width ?? entry.name.length * 12) + 12
      const box = { left: entry.x - width / 2, right: entry.x + width / 2, top: entry.y - 12, bottom: entry.y + 12 }
      // Leave space for the continent caption and zoom controls.
      if (box.left < 6 || box.right > w - 6 || box.top < 42 || box.bottom > h - 64) return false
      if (boxes.some(other => box.left < other.right + 5 && box.right + 5 > other.left && box.top < other.bottom + 5 && box.bottom + 5 > other.top)) return false
      boxes.push(box)
      return true
    })
  })()

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
  const lensTransform = activeLens ? `translate(${activeLens.center[0]},${activeLens.center[1]}) scale(${activeLens.scale}) translate(${-activeLens.at[0]},${-activeLens.at[1]}) ${t.toString()}` : ''

  return (
    <div ref={frameRef} className={`map-frame${interactive ? ' is-interactive' : ''}`}>
      {geo && (
        <svg
          ref={svgRef}
          className="map-svg"
          width={w}
          height={h}
          role="img"
          aria-label={countryNames ? tr('map.trainingNames') : label ? tr('map.unlabelledOf', { continent: label }) : tr('map.unlabelled')}
          onClick={handleMapClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={event => finishPointer(event, false)}
          onPointerCancel={handlePointerCancel}
          onLostPointerCapture={handleLostPointerCapture}
          onContextMenu={event => event.preventDefault()}
          onSelect={event => event.preventDefault()}
        >
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
          <g className="map-country-names">
            {nameLabels.map(entry => (
              <text key={entry.mapName} data-country-name={entry.mapName} x={entry.x} y={entry.y} textAnchor="middle" dominantBaseline="central">{entry.name}</text>
            ))}
          </g>
          {activeLens && (
            <g className="map-lens" pointerEvents="none">
              <clipPath id={clipId}>
                <circle cx={activeLens.center[0]} cy={activeLens.center[1]} r={LENS_RADIUS_PX} />
              </clipPath>
              <circle className="map-lens-shadow" cx={activeLens.center[0]} cy={activeLens.center[1]} r={LENS_RADIUS_PX + 2} />
              <g clipPath={`url(#${clipId})`}>
                <circle className="map-lens-ocean" cx={activeLens.center[0]} cy={activeLens.center[1]} r={LENS_RADIUS_PX} />
                <g transform={lensTransform}>{renderLand(k * activeLens.scale, 'lens-')}</g>
              </g>
              <circle className="map-lens-rim" cx={activeLens.center[0]} cy={activeLens.center[1]} r={LENS_RADIUS_PX} />
              <path className="map-lens-crosshair" d={`M${activeLens.center[0] - 8} ${activeLens.center[1]}h16m-8 -8v16`} />
            </g>
          )}
        </svg>
      )}
      {label && <div className="map-label">{label}</div>}
      {activeLens && <div className="map-hint">{tr('map.lensHint')}</div>}
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
