import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Country } from '../data/countries'
import { useContent } from '../i18n/useContent'
import { UNLOCK_FLIP_MS } from '../theme'
import { CardBack, CardFront } from './Card'
import { Portal } from './Portal'
import { MASTERY_STAMP_COUNT } from '../domain/mastery'

interface Props {
  country: Country
  onCollection: () => void
  onContinue: () => void
}

export function UnlockSequence({ country, onCollection, onContinue }: Props) {
  const [flipped, setFlipped] = useState(false)
  const { t } = useTranslation()
  const name = useContent().countryName(country.id)

  useEffect(() => {
    const t = window.setTimeout(() => setFlipped(true), 650)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <Portal>
    <div className={`unlock${flipped ? ' is-flipped' : ''}`} role="dialog" aria-modal="true" aria-label={t('unlock.label', { country: name })}>
      <div className="unlock-rays" aria-hidden />
      <p className="unlock-kicker">{t('unlock.kicker')}</p>
      <div className="unlock-stage" style={{ ['--flip-ms' as string]: `${UNLOCK_FLIP_MS}ms` }}>
        <div className="unlock-card">
          <div className="unlock-face unlock-face--back">
            <CardBack country={country} stamps={MASTERY_STAMP_COUNT} discovered size="lg" />
          </div>
          <div className="unlock-face unlock-face--front">
            <CardFront country={country} size="lg" />
            <div className="unlock-shine" aria-hidden />
          </div>
        </div>
      </div>
      <h2 className="unlock-title">{t('unlock.title', { country: name })}</h2>
      <div className="unlock-actions">
        <button type="button" className="btn btn--ghost" onClick={onCollection}>
          {t('unlock.viewCollection')}
        </button>
        <button type="button" className="btn btn--primary" onClick={onContinue}>
          {t('common.continue')}
        </button>
      </div>
    </div>
    </Portal>
  )
}
