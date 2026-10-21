import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Flag } from '../components/Flag'
import { PackArt } from '../components/PackArt'
import { StampRow } from '../components/Stamp'
import { RarityBadge } from '../components/RarityBadge'
import { COUNTRY_BY_ID } from '../data/countries'
import type { Game } from '../game/useGame'
import { useContent } from '../i18n/useContent'
import { useWorld } from '../map/useWorld'
import { PACK_RIP_MS } from '../theme'
import { Challenge } from './Challenge'

type Phase = 'sealed' | 'tearing' | 'orders' | 'challenge'
const TEAR_THRESHOLD = 0.45
/** Pointer movement below this counts as a tap, which also opens the pack. */
const TAP_SLOP_PX = 8

export function Expedition({ game }: { game: Game }) {
  const world = useWorld()
  const { t } = useTranslation()
  const { countryName } = useContent()
  const { state } = game
  const challenge = state.activeChallenge
  const [phase, setPhase] = useState<Phase>(challenge && challenge.step !== 'continent' ? 'challenge' : challenge ? 'orders' : 'sealed')
  const [drag, setDrag] = useState(0)
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const moved = useRef(0)
  const packRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (phase !== 'tearing') return
    const t = window.setTimeout(() => setPhase('orders'), PACK_RIP_MS)
    return () => window.clearTimeout(t)
  }, [phase])

  const rip = () => {
    if (phase !== 'sealed') return
    game.ripPack()
    setPhase('tearing')
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    dragStart.current = { x: e.clientX, y: e.clientY }
    moved.current = 0
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragStart.current === null) return
    const dx = e.clientX - dragStart.current.x
    moved.current = Math.max(moved.current, Math.hypot(dx, e.clientY - dragStart.current.y))
    setDrag(Math.max(0, dx))
  }
  const onPointerUp = () => {
    if (dragStart.current === null) return
    const width = packRef.current?.clientWidth ?? 240
    if (drag > width * TEAR_THRESHOLD || moved.current < TAP_SLOP_PX) rip()
    dragStart.current = null
    setDrag(0)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    rip()
  }

  const close = () => game.navigate('home')

  if (phase === 'challenge' && challenge && world) {
    return <Challenge game={game} world={world} />
  }

  const country = challenge ? COUNTRY_BY_ID[challenge.countryId] : undefined
  const noPack = phase === 'sealed' && state.packs < 1

  return (
    <div className="expedition">
      <header className="screen-bar">
        <button type="button" className="icon-btn" onClick={close} aria-label={t('common.backToAtlas')}>
          ×
        </button>
        <span className="screen-bar-title">{phase === 'orders' ? t('expedition.ordersTitle') : t('expedition.packTitle')}</span>
        <span className="icon-btn-spacer" />
      </header>

      <div className="expedition-stage">
        {(phase === 'sealed' || phase === 'tearing') && (
          <>
            <div
              ref={packRef}
              className={`pack-tear-zone${phase === 'tearing' ? ' is-ripping' : ''}`}
              onPointerDown={noPack ? undefined : onPointerDown}
              onPointerMove={noPack ? undefined : onPointerMove}
              onPointerUp={noPack ? undefined : onPointerUp}
              onPointerCancel={() => {
                dragStart.current = null
                setDrag(0)
              }}
              role={noPack ? undefined : 'button'}
              tabIndex={noPack ? undefined : 0}
              aria-label={noPack ? undefined : t('home.rip')}
              onKeyDown={noPack ? undefined : onKeyDown}
            >
              <PackArt torn={phase === 'tearing'} stripOffset={drag} tearable={!noPack} className="pack--large" />
            </div>
            <p className="hint">{noPack ? t('expedition.noPackLeft') : t('expedition.swipeHint')}</p>
            {!noPack && (
              <button type="button" className="btn btn--primary" onClick={rip} disabled={phase !== 'sealed'}>
                {t('expedition.tearOpen')}
              </button>
            )}
          </>
        )}

        {phase === 'orders' && country && (
          <div className="orders">
            <div className={`orders-card rarity--${country.rarity}`}>
              <header className="orders-top">
                <p className="eyebrow">{t('expedition.destination')}</p>
                <RarityBadge rarity={country.rarity} />
              </header>
              <p className="orders-find">{t('expedition.find')}</p>
              <Flag countryId={country.id} className="orders-flag" />
              <h1 className="orders-name">{countryName(country.id)}</h1>
              <div className="orders-stamps">
                <StampRow stamps={state.progress[country.id]?.stamps ?? 0} code={country.id} size={40} />
              </div>
              <p className="orders-sub">{t('expedition.ordersSub')}</p>
            </div>
            <button type="button" className="btn btn--primary btn--wide" onClick={() => setPhase('challenge')} disabled={!world}>
              {world ? t('expedition.begin') : t('common.loadingMap')}
            </button>
          </div>
        )}

        {phase === 'orders' && !country && (
          <div className="orders">
            <p className="hint">{t('expedition.allCollected')}</p>
            <button type="button" className="btn btn--primary" onClick={close}>
              {t('common.backToAtlas')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
