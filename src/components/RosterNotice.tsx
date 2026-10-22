import { useTranslation } from 'react-i18next'
import type { Game } from '../game/useGame'
import { useContent } from '../i18n/useContent'

export function RosterNotice({ game }: { game: Game }) {
  const { t } = useTranslation()
  const { countryName } = useContent()
  const notice = game.state.rosterNotice
  if (!notice) return null
  return (
    <section className="roster-notice" aria-label={t('rosterUpdate.title')}>
      <div role="status">
        <h2>{t('rosterUpdate.title')}</h2>
        {notice.countryId && (
          <p>{t(notice.refunded ? 'rosterUpdate.unfinished' : 'rosterUpdate.finished', { country: countryName(notice.countryId) })}</p>
        )}
        {notice.debugCountryId && <p>{t('rosterUpdate.debug', { country: countryName(notice.debugCountryId) })}</p>}
      </div>
      <button type="button" className="btn btn--ghost" onClick={() => void game.dismissRosterNotice()}>{t('common.close')}</button>
    </section>
  )
}
