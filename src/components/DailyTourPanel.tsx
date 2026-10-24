import { useTranslation } from 'react-i18next'
import { getDailyAssignment } from '../domain/dailyTour'
import type { Game } from '../game/useGame'
import { useContent } from '../i18n/useContent'

export function DailyTourPanel({ game }: { game: Game }) {
  const { t, i18n } = useTranslation()
  const { continentName } = useContent()
  const today = getDailyAssignment(game.now)
  const run = today && game.state.dailyTours?.records[today.dayKey]
  const locale = i18n.resolvedLanguage === 'de' ? 'de' : 'en'
  return (
    <section className="daily-panel panel" aria-label={t('tour.title')}>
      <div className="daily-panel-heading">
        <p className="eyebrow">{t('tour.title')}</p>
        <span className="tour-beta">{t('tour.beta')}</span>
      </div>
      <h2>{today ? t('tour.number', { number: today.number }) : t('tour.title')}</h2>
      {today && <strong>{today.title[locale]} · {continentName(today.continent)}</strong>}
      <p>{t('tour.intro')}</p>
      {!today && <p>{t('tour.unavailable')}</p>}
      <button type="button" className="btn btn--primary" disabled={!today} onClick={() => {
        if (!today) return
        if (run) game.goToDaily(today.dayKey)
        else void game.beginDailyTour().then(saved => {
          if (saved?.dailyTours?.records[today.dayKey]) game.goToDaily(today.dayKey)
        })
      }}>
        {t(run?.status === 'completed' ? 'tour.result' : run?.status === 'active' ? 'tour.resume' : 'tour.start')}
      </button>
      {game.debug && <div className="tour-actions">
        <button type="button" className="btn btn--ghost btn--small" onClick={() => void game.beginPracticeTour().then(saved => { if (saved) game.goToDaily('practice') })}>{t('tour.random')}</button>
        {game.state.dailyTours?.practice && <button type="button" className="btn btn--ghost btn--small" onClick={() => game.goToDaily('practice')}>{t('tour.resumePractice')}</button>}
      </div>}
    </section>
  )
}
