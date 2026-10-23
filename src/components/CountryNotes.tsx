import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Country } from '../data/countries'
import details from '../data/generated/country-details.json'
import { useContent } from '../i18n/useContent'
import { CardFront } from './Card'
import { Flag } from './Flag'
import { RarityBadge } from './RarityBadge'
import { COUNTRY_STORIES } from '../data/countryStories'

function CardFact({ text, fun = false }: { text: string; fun?: boolean }) {
  const { t } = useTranslation()
  return (
    <section className={`country-notes-fact${fun ? ' country-notes-fact--fun' : ''}`}>
      {fun && <h4>{t('notes.funFact')}</h4>}
      {text.length > 120 ? (
        <details className="card-fact-expand">
          <summary><span className="card-fact-preview">{text}</span><span className="card-fact-more">{t('notes.seeMore')}</span><span className="card-fact-less">{t('notes.seeLess')}</span></summary>
          <p className="card-fact">{text}</p>
        </details>
      ) : <p className="card-fact">{text}</p>}
    </section>
  )
}

export function CountryNotes({ country, explorer = false }: { country: Country; explorer?: boolean }) {
  const { t, i18n } = useTranslation()
  const content = useContent()
  const entry = details.countries[country.id as keyof typeof details.countries]
  const locale = i18n.resolvedLanguage === 'de' ? 'de' : 'en'
  const stories = COUNTRY_STORIES[country.id]
  if (!explorer) return <CardFront country={country} size="lg" visitor />

  return (
    <article className={`card card--front card--lg country-notes rarity--${country.rarity}`} aria-label={t('notes.explorer')}>
      <div className="card-inner">
      <div className="card-top">
        <span className="card-number">{country.id.toUpperCase()}</span>
        <RarityBadge rarity={country.rarity} />
      </div>
      <div className="country-notes-scroll" tabIndex={0}>
      <header className="country-notes-heading">
        <Flag countryId={country.id} />
        <div>
          <h3>{content.countryName(country.id)}</h3>
          <p>{content.continentName(country.continent)}</p>
        </div>
      </header>
      <dl className="country-notes-grid">
          <div><dt>{t('notes.selectedLanguages')}</dt><dd>{entry[locale].languages.split(' · ').slice(0, 2).join(' · ')}</dd></div>
          <div><dt>{t('notes.currency')}</dt><dd>{entry[locale].currencies}</dd></div>
      </dl>
      {stories?.detail && <CardFact text={stories.detail[locale]} />}
      {stories?.fun && <CardFact text={stories.fun[locale]} fun />}
      </div>
      </div>
    </article>
  )
}

export function ExplorerCard({ country }: { country: Country }) {
  const [showNotes, setShowNotes] = useState(false)
  const { t } = useTranslation()
  return (
    <div className="explorer-card" role="button" tabIndex={0}
      aria-label={t(showNotes ? 'notes.showFront' : 'notes.flip')}
      aria-pressed={showNotes}
      onClick={event => {
        if (!(event.target as Element).closest('details')) setShowNotes(value => !value)
      }}
      onKeyDown={event => {
        if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault()
          setShowNotes(value => !value)
        }
      }}>
      {showNotes ? <CountryNotes country={country} explorer /> : <CardFront country={country} size="lg" />}
      <span className="card-turn-hint" aria-hidden="true">{t('notes.tapToTurn')}</span>
    </div>
  )
}
