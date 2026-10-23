import { useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Portal } from '../components/Portal'
import { CardBack, CardFront } from '../components/Card'
import { CONTINENTS } from '../data/continents'
import { ARCHIVED_COUNTRIES, COUNTRIES, type Country } from '../data/countries'
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
  const [resetting, setResetting] = useState(false)
  const [resetMessage, setResetMessage] = useState('')
  const reset = async (scope: ContinentId | 'all') => {
    const label = scope === 'all' ? t('collection.resetAll') : t('collection.resetContinent', { continent: continentName(scope) })
    if (!window.confirm(t('collection.resetConfirm', { scope: label }))) return
    setResetting(true)
    setResetMessage('')
    try {
      const saved = await game.resetCollection(scope)
      if (saved) setResetMessage(t('collection.resetDone', { scope: label }))
    } finally { setResetting(false) }
  }
  const stampsOf = (c: Country) => state.progress[c.id]?.stamps ?? 0
  const isCollected = (c: Country) => stampsOf(c) >= config.stampsToUnlock
  const collected = COUNTRIES.filter(isCollected).length
  const shown = COUNTRIES.filter((c) => filter === 'all' || c.continent === filter)
  const archived = ARCHIVED_COUNTRIES.filter(c => isDiscovered(state, c.id))
  const isArchived = (c: Country) => ARCHIVED_COUNTRIES.some(entry => entry.id === c.id)

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

      <details className="collection-reset panel">
        <summary>{t('collection.learnAgain')}</summary>
        <p>{t('collection.resetDescription')}</p>
        <div className="collection-reset-actions">
          <button type="button" className="btn btn--ghost btn--small" disabled={resetting} onClick={() => void reset('all')}>
            {t('collection.resetAll')}
          </button>
          {filter !== 'all' && (
            <button type="button" className="btn btn--ghost btn--small" disabled={resetting} onClick={() => void reset(filter)}>
              {t('collection.resetContinent', { continent: continentName(filter) })}
            </button>
          )}
        </div>
        {filter === 'all' && <p>{t('collection.resetFilterHint')}</p>}
      </details>
      {resetMessage && <p className="collection-reset-status" role="status">{resetMessage}</p>}

      <ul className="card-grid">
        {shown.map((c) => (
          <li key={c.id}>
            <button type="button" className="card-button" onClick={() => setOpen(c)}>
              {isCollected(c) ? <CardFront country={c} size="sm" /> : <CardBack country={c} stamps={stampsOf(c)} discovered={isDiscovered(state, c.id)} size="sm" />}
            </button>
          </li>
        ))}
      </ul>

      {archived.length > 0 && (
        <section className="collection-archive" aria-labelledby="archive-title">
          <h2 id="archive-title">{t('collection.archiveTitle')}</h2>
          <p>{t('collection.archiveDescription')}</p>
          <ul className="card-grid">
            {archived.map(c => (
              <li key={c.id}>
                <button type="button" className="card-button" onClick={() => setOpen(c)}>
                  {isCollected(c) ? <CardFront country={c} size="sm" /> : <CardBack country={c} stamps={stampsOf(c)} discovered size="sm" />}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {open && (
        <Portal>
        <div className="modal" role="dialog" aria-modal="true" aria-label={countryName(open.id)} onClick={() => setOpen(null)}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()}>
            {isArchived(open) && <p className="modal-note">{t('collection.archivedCard')}</p>}
            {isCollected(open) ? (
              <CardFront country={open} size="lg" />
            ) : (
              <>
                <CardBack country={open} stamps={stampsOf(open)} discovered={isDiscovered(state, open.id)} size="lg" />
                <p className="modal-note">
                  {isArchived(open)
                    ? t('collection.archivedProgress')
                    : isDiscovered(state, open.id)
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
