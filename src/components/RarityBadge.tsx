import { useTranslation } from 'react-i18next'
import { RARITIES, type Rarity } from '../domain/rarity'

export function RarityBadge({ rarity }: { rarity: Rarity }) {
  const { t } = useTranslation()
  const grade = t(`rarity.${rarity}`)
  return (
    <span className={`rarity-badge rarity--${rarity}`} aria-label={t('rarity.label', { grade })}>
      <span className="rarity-pips" aria-hidden="true">{'◆'.repeat(RARITIES.indexOf(rarity) + 1)}</span>
      <span className="rarity-grade">{grade}</span>
    </span>
  )
}
