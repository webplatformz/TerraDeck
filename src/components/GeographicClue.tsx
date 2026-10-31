import { useTranslation } from 'react-i18next'
import type { Country } from '../data/countries'
import type { WorldData } from '../data/world'
import { geographicHint } from '../domain/geographicHint'
import { useContent } from '../i18n/useContent'

export function GeographicClue({ country, world }: { country: Country; world: WorldData }) {
  const { t } = useTranslation()
  const { countryName } = useContent()
  const { clue } = geographicHint(country.id, world)
  return (
    <p className="geographic-clue">
      {clue.kind === 'direction' && t(`training.direction.${clue.value}`)}
      {clue.kind === 'size' && t(`training.size.${clue.value}`)}
      {clue.kind === 'border' && t('training.borderHint', { neighbors: countryName(clue.neighborId) })}
      {clue.kind === 'island' && t('training.noLandBorders')}
      {clue.kind === 'general' && t('training.generalHint')}
    </p>
  )
}
