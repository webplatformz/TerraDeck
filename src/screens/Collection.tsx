import { useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Portal } from '../components/Portal'
import { CardBack, CardFront } from '../components/Card'
import { CONTINENTS } from '../data/continents'
import { COUNTRIES, type Country } from '../data/countries'
import type { ContinentId } from '../domain/types'
import { isDiscovered } from '../domain/discovery'
import type { Game } from '../game/useGame'
import { useContent } from '../i18n/useContent'

export function Collection({ game }: { game: Game }) {
  const { state, config } = game
  const { t } = useTranslation()
  const { countryName, continentName } = useContent()
  const [filter, setFilter] = useState<ContinentId | 'all'>('all')
  const [open, setOpen] = useState<Country | null>(null)
  const stampsOf = (c: Country) => state.progress[c.id]?.stamps ?? 0
  const isCollected = (c: Country) => stampsOf(c) >= config.stampsToUnlock
  const collected = COUNTRIES.filter(isCollected).length
  const shown = COUNTRIES.filter((c) => filter === 'all' || c.continent === filter)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="collection">
      <header className="page-header">
        <p className="eyebrow">{t('collection.eyebrow')}</p>
        <h1>
          <Trans i18nKey="collection.cardsCount" values={{ collected, total: COUNTRIES.length }} components={{ muted: <span className="muted" /> }} />
        </h1>
      </header>

      <div className="chips" role="tablist" aria-label={t('collection.filter')}>
        {[{ id: 'all' as const, name: t('collection.all') }, ...CONTINENTS.map((c) => ({ id: c.id, name: continentName(c.id) }))].map((c) => (
          <button key={c.id} type="button" role="tab" aria-selected={filter === c.id} className={`chip${filter === c.id ? ' is-active' : ''}`} onClick={() => setFilter(c.id)}>
            {c.name}
          </button>
        ))}
      </div>

      <ul className="card-grid">
        {shown.map((c) => (
          <li key={c.id}>
            <button type="button" className="card-button" onClick={() => setOpen(c)}>
              {isCollected(c) ? <CardFront country={c} size="sm" /> : <CardBack country={c} stamps={stampsOf(c)} discovered={isDiscovered(state, c.id)} size="sm" />}
            </button>
          </li>
        ))}
      </ul>

      {open && (
        <Portal>
        <div className="modal" role="dialog" aria-modal="true" aria-label={countryName(open.id)} onClick={() => setOpen(null)}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()}>
            {isCollected(open) ? (
              <CardFront country={open} size="lg" />
            ) : (
              <>
                <CardBack country={open} stamps={stampsOf(open)} discovered={isDiscovered(state, open.id)} size="lg" />
                <p className="modal-note">
                  {isDiscovered(state, open.id)
                    ? t('collection.moreStamps', { count: config.stampsToUnlock - stampsOf(open) })
                    : t('collection.notDiscovered')}
                </p>
              </>
            )}
            <button type="button" className="btn btn--ghost" onClick={() => setOpen(null)}>
              {t('common.close')}
            </button>
          </div>
        </div>
        </Portal>
      )}
    </div>
  )
}
