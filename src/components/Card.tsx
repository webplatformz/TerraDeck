import { useTranslation } from 'react-i18next'
import type { Country } from '../data/countries'
import { useContent } from '../i18n/useContent'
import { Compass } from './Compass'
import { CountryShape } from './CountryShape'
import { Flag } from './Flag'
import { StampRow } from './Stamp'
import { RarityBadge } from './RarityBadge'
import { displayedStamps, MASTERY_STAMP_COUNT } from '../domain/mastery'

const pad = (n: number) => String(n).padStart(2, '0')

export function CardFront({ country, size = 'md' }: { country: Country; size?: 'sm' | 'md' | 'lg' }) {
  const { t } = useTranslation()
  const content = useContent()
  const name = content.countryName(country.id)
  return (
    <article className={`card card--front card--${size} rarity--${country.rarity}`} aria-label={t('card.label', { country: name })}>
      <div className="card-inner">
        <header className="card-top">
          <span className="card-number">{t('card.number', { number: pad(country.number) })}</span>
          <RarityBadge rarity={country.rarity} />
        </header>
        <div className="card-window">
          <Flag countryId={country.id} className="card-flag" />
          <CountryShape mapName={country.mapName} />
        </div>
        <h3 className={`card-name${name.length > 26 ? ' card-name--long' : ''}`}>{name}</h3>
        <p className="card-continent">{content.continentName(country.continent)}</p>
        {size !== 'sm' && (
          <>
            <dl className="card-facts">
              <div>
                <dt>{t('card.capital')}</dt>
                <dd>{content.capital(country.id)}</dd>
              </div>
              <div>
                <dt>{t('card.people')}</dt>
                <dd>{content.formatPopulation(country.population)}</dd>
              </div>
              <div>
                <dt>{t('card.area')}</dt>
                <dd>{content.formatArea(country.areaKm2)}</dd>
              </div>
            </dl>
            <p className="card-fact">{content.fact(country.id)}</p>
          </>
        )}
        <footer className="card-stamps">
          <StampRow stamps={MASTERY_STAMP_COUNT} code={country.id} size={size === 'lg' ? 40 : size === 'md' ? 32 : 22} />
        </footer>
      </div>
    </article>
  )
}

interface CardBackProps {
  country?: Country
  stamps?: number
  discovered?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function CardBack({ country, stamps = 0, discovered = false, size = 'md' }: CardBackProps) {
  const { t } = useTranslation()
  const { countryName } = useContent()
  const known = discovered && country ? countryName(country.id) : null
  return (
    <article className={`card card--back card--${size}${known && country ? ` rarity--${country.rarity}` : ''}`} aria-label={known ? t('card.backLabel', { country: known, stamps: displayedStamps(stamps), total: MASTERY_STAMP_COUNT }) : t('card.undiscoveredLabel')}>
      <div className="card-inner">
        {country && (known ? (
          <header className="card-top">
            <span className="card-number">{t('card.number', { number: pad(country.number) })}</span>
            <RarityBadge rarity={country.rarity} />
          </header>
        ) : <span className="card-number">{t('card.number', { number: pad(country.number) })}</span>)}
        {country && discovered && stamps > 0 ? (
          <Flag countryId={country.id} className="card-back-flag" />
        ) : (
          <Compass className="card-back-compass" />
        )}
        <p className="card-back-title">{known ?? t('card.undiscovered')}</p>
        {country && discovered && (
          <div className="card-back-stamps">
            <StampRow stamps={stamps} code={country.id} size={size === 'sm' ? 20 : 28} />
          </div>
        )}
        <p className="card-back-brand">TerraDeck</p>
      </div>
    </article>
  )
}
