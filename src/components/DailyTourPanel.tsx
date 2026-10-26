import { useTranslation } from 'react-i18next'
import { getDailyAssignment } from '../domain/dailyTour'
import type { Game } from '../game/useGame'
import { useContent } from '../i18n/useContent'

export function DailyTourPanel({ game }: { game: Game }) {
  const { t, i18n } = useTranslation()
  const { continentName } = useContent()
  const today = getDailyAssignment(game.now)
  const run = today && game.state.dailyTours?.records[today.dayKey]
  const assignment = run?.assignment ?? today
  const locale = i18n.resolvedLanguage === 'de' ? 'de' : 'en'
  const actionLabel = t(run?.status === 'completed' ? 'tour.result' : run?.status === 'active' ? 'tour.resume' : 'tour.start')
  const openTour = () => {
    if (!today) return
    game.goToDaily(run ? today.dayKey : '')
  }
  return (
    <section className="daily-panel" aria-label={t('tour.title')}>
      {game.state.dailyTours?.blocked && <p role="alert">{t('tour.newerData')}</p>}
      <button type="button" className="tour-ticket" disabled={!today} onClick={openTour} aria-label={`${t('tour.homeTitle')} · ${actionLabel}`}>
      <span className="tour-beta tour-beta--corner">{t('tour.beta')}</span>
      <div className={`pack tour-pack${run?.status === 'completed' ? ' tour-pack--completed' : ''}`}>
      <div className="pack-body">
      <div className="pack-foil" />
      <svg className="tour-ticket-art" viewBox="0 0 320 100" fill="none" aria-hidden="true">
        <ellipse cx="160" cy="50" rx="142" ry="44" />
        <ellipse cx="160" cy="50" rx="87" ry="44" />
        <ellipse cx="160" cy="50" rx="35" ry="44" />
        <path d="M20 50h280M38 27h244M38 73h244" />
        <path className="tour-ticket-route" d="M46 66Q68 18 103 37T163 62T223 29T277 48" />
        {[[46, 66], [103, 37], [163, 62], [223, 29], [277, 48]].map(([cx, cy], index) =>
          <g key={index}><circle className="tour-ticket-stop-halo" cx={cx} cy={cy} r="8" /><circle className="tour-ticket-stop" cx={cx} cy={cy} r="3.5" /></g>)}
      </svg>
      <span className="tour-pack-count">{t('tour.fiveCountries')}</span>
      {assignment && <strong className="tour-ticket-subtitle">{assignment.title[locale]} · {continentName(assignment.continent)} · <span className="mono">#{assignment.number}</span></strong>}
      <span className="tour-ticket-hint">{actionLabel} <span aria-hidden="true">→</span></span>
      </div>
      <div className="pack-strip"><span>{run?.status === 'completed' && <span aria-hidden="true">✓ </span>}{t(run?.status === 'completed' ? 'tour.completedToday' : 'tour.homeTitle')}</span></div>
      </div>
      </button>
      <p className="tour-ticket-intro">{t('tour.intro')}</p>
      {!today && <p>{t('tour.unavailable')}</p>}
      <button type="button" className="btn btn--primary" disabled={!today} onClick={openTour}>
        {actionLabel}
      </button>
      {game.debug && <div className="tour-actions">
        <button type="button" className="btn btn--ghost btn--small" disabled={!run || game.state.dailyTours?.blocked} onClick={() => void game.resetDailyTour()}>{t('tour.debugReset')}</button>
      </div>}
    </section>
  )
}
