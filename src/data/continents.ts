import type { ContinentId } from '../domain/types'

/** Names are translated: see `continents` in src/i18n/locales/*.json. */
export interface Continent {
  id: ContinentId
}

export const CONTINENTS: readonly Continent[] = [{ id: 'africa' }, { id: 'asia' }, { id: 'europe' }, { id: 'north-america' }, { id: 'south-america' }, { id: 'oceania' }]

export const CONTINENT_BY_ID = Object.fromEntries(CONTINENTS.map((c) => [c.id, c])) as Record<ContinentId, Continent>
