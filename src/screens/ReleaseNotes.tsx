import { useTranslation } from 'react-i18next'
import { AtlasBack } from '../components/AtlasBack'
import { LanguageSelect } from '../components/LanguageSelect'
import { RELEASES, releaseVersion } from '../data/releases'
import type { Game } from '../game/useGame'

export function ReleaseNotes({ game }: { game: Game }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage === 'de' ? 'de' : 'en'
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' })
  const releases = [...RELEASES].sort((a, b) => b.date.localeCompare(a.date) || b.major - a.major)
  return (
    <div className="release-notes">
      <div className="release-notes-bar">
        <AtlasBack onClick={() => game.navigate('home')} />
        <LanguageSelect />
      </div>
      <header className="page-header">
        <p className="eyebrow">TerraDeck</p>
        <h1>{t('releases.title')}</h1>
        <p>{t('releases.intro')}</p>
      </header>
      {game.state.activeChallenge && (
        <button type="button" className="btn btn--ghost" onClick={game.goToExpedition}>
          {t('home.resumeExpedition')}
        </button>
      )}
      {releases.map(release => (
        <section className="release-entry panel" key={releaseVersion(release)} aria-labelledby={`release-${releaseVersion(release)}`}>
          <header>
            <div>
              <p className="release-version">{releaseVersion(release)}</p>
              <h2 id={`release-${releaseVersion(release)}`}>{release.title[locale]}</h2>
            </div>
            <time dateTime={release.date}>{dateFormat.format(new Date(`${release.date}T00:00:00Z`))}</time>
          </header>
          <ul>{release.notes[locale].map(note => (
            <li key={note.label}><strong>{note.label}</strong>: {note.description}</li>
          ))}</ul>
        </section>
      ))}
    </div>
  )
}
