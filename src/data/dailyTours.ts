import type { ContinentId } from '../domain/types'

export interface TourDefinition {
  id: string
  continent: ContinentId
  countryIds: readonly string[]
  title: { en: string; de: string }
}

/** Published versions and reference points are immutable; add forward-effective schedules. */
export const DAILY_SCHEDULES = [{
  version: 1 as const,
  effectiveAt: Date.UTC(2026, 9, 23),
  tours: [
    { id: 'europe-01', continent: 'europe', countryIds: ['no', 'de', 'fr', 'it', 'gr'],
      title: { en: 'Fjords to the Aegean', de: 'Vom Fjord zur Ägäis' } },
    { id: 'africa-01', continent: 'africa', countryIds: ['ma', 'gh', 'ke', 'mg', 'na'],
      title: { en: 'An African zigzag', de: 'Afrika im Zickzack' } },
    { id: 'asia-01', continent: 'asia', countryIds: ['jp', 'vn', 'np', 'in', 'id'],
      title: { en: 'Islands and high peaks', de: 'Inseln und hohe Gipfel' } },
  ] satisfies TourDefinition[],
}] as const
