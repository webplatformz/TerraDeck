import { useTranslation } from 'react-i18next'
import { Compass } from './Compass'

interface PackArtProps {
  torn?: boolean
  stripOffset?: number
  /** Shows the swipe arrow and perforation on a pack that can be torn open. */
  tearable?: boolean
  className?: string
}

/** The sealed expedition pack. The tear strip runs across the top. */
export function PackArt({ torn = false, stripOffset = 0, tearable = false, className = '' }: PackArtProps) {
  const { t } = useTranslation()
  return (
    <div className={`pack ${torn ? 'is-torn' : ''} ${tearable ? 'is-tearable' : ''} ${stripOffset > 0 ? 'is-dragging' : ''} ${className}`}>
      <div className="pack-body">
        <div className="pack-foil" />
        <Compass className="pack-compass" />
        <p className="pack-kicker">{t('pack.kicker')}</p>
        <p className="pack-title">{t('pack.title')}</p>
        <p className="pack-sub">{t('pack.sub')}</p>
      </div>
      {tearable && <div className="pack-perforation" aria-hidden="true" />}
      <div className="pack-strip" style={{ transform: torn ? undefined : `translateX(${stripOffset}px) rotate(${stripOffset / 40}deg)` }}>
        <span>{t('pack.tearHere')}</span>
        {tearable && (
          <svg className="pack-strip-arrow" viewBox="0 0 32 16" aria-hidden="true">
            <path d="M2 8h24M20 2l7 6-7 6" />
          </svg>
        )}
      </div>
    </div>
  )
}
