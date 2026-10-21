import { useTranslation } from 'react-i18next'
import type { Game } from '../game/useGame'
import { COUNTRIES } from '../data/countries'

export function About({ game }: { game: Game }) {
  const { t } = useTranslation()
  const { cooldownMs } = game.config
  const cooldown = cooldownMs < 60000 ? t('about.seconds', { count: cooldownMs / 1000 }) : t('about.minutes', { count: Math.round(cooldownMs / 60000) })
  return (
    <div className="about">
      <header className="page-header">
        <p className="eyebrow">{t('about.eyebrow')}</p>
        <h1>{t('about.title')}</h1>
      </header>

      <ol className="guide">
        <li className="panel">
          <h2>{t('about.ripTitle')}</h2>
          <p>{t('about.ripText', { cooldown, max: game.config.maxPacks })}</p>
        </li>
        <li className="panel">
          <h2>{t('about.findTitle')}</h2>
          <p>{t('about.findText')}</p>
          <p>{t('about.findScope', { count: COUNTRIES.length })}</p>
        </li>
        <li className="panel">
          <h2>{t('about.stampsTitle')}</h2>
          <p>{t('about.stampsText')}</p>
        </li>
        <li className="panel">
          <h2>{t('about.rarityTitle')}</h2>
          <p>{t('about.rarityText')}</p>
        </li>
      </ol>

      <section className="panel credits">
        <h2>{t('about.sources')}</h2>
        <ul>
          <li>{t('about.sourceBorders')}</li>
          <li>{t('about.sourceFlags')}</li>
          <li>{t('about.sourceNumbers')}</li>
          <li>{t('about.sourceRarity')}</li>
          <li>{t('about.sourceStorage')}</li>
        </ul>
      </section>
    </div>
  )
}
