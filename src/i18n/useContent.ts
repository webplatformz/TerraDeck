import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { ContinentId, CountryId } from '../domain/types'
import type en from './locales/en.json'
import { COUNTRY_STORIES } from '../data/countryStories'

type CountryKey = keyof typeof en.countries

/** Localised names and texts for game content (countries, continents) plus number formatting. */
export function useContent() {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? i18n.language
  const locale = language.startsWith('de') ? 'de' : 'en'
  return useMemo(() => {
    const compact = new Intl.NumberFormat(language, { notation: 'compact', maximumFractionDigits: 1 })
    const grouped = new Intl.NumberFormat(language)
    return {
      countryName: (id: CountryId) => t(`countries.${id as CountryKey}.name`),
      capital: (id: CountryId) => t(`countries.${id as CountryKey}.capital`),
      fact: (id: CountryId) => COUNTRY_STORIES[id]?.front?.[locale] ?? t(`countries.${id as CountryKey}.fact`),
      continentName: (id: ContinentId) => t(`continents.${id}`),
      formatPopulation: (n: number) => compact.format(n),
      formatArea: (n: number) => `${grouped.format(n)}\u00a0km²`,
    }
  }, [t, language, locale])
}
