import type { ContinentId, CountryId, RosterEntry } from '../domain/types'

export interface Country extends RosterEntry {
  id: CountryId
  number: number
  /** Feature name in the world-atlas TopoJSON. */
  mapName: string
  continent: ContinentId
  /** Approximate population (recent UN / national estimates). */
  population: number
  areaKm2: number
}

/** Names, capitals and facts are translated: see `countries` in src/i18n/locales/*.json. */

const raw: Omit<Country, 'number'>[] = [
  { id: 'fr', mapName: 'France', continent: 'europe', population: 68_400_000, areaKm2: 551_695 },
  { id: 'it', mapName: 'Italy', continent: 'europe', population: 59_000_000, areaKm2: 302_068 },
  { id: 'no', mapName: 'Norway', continent: 'europe', population: 5_550_000, areaKm2: 385_207 },
  { id: 'ch', mapName: 'Switzerland', continent: 'europe', population: 8_900_000, areaKm2: 41_285 },
  { id: 'jp', mapName: 'Japan', continent: 'asia', population: 124_000_000, areaKm2: 377_975 },
  { id: 'in', mapName: 'India', continent: 'asia', population: 1_430_000_000, areaKm2: 3_287_263 },
  { id: 'vn', mapName: 'Vietnam', continent: 'asia', population: 100_000_000, areaKm2: 331_212 },
  { id: 'np', mapName: 'Nepal', continent: 'asia', population: 29_700_000, areaKm2: 147_181 },
  { id: 'eg', mapName: 'Egypt', continent: 'africa', population: 112_000_000, areaKm2: 1_002_450 },
  { id: 'ke', mapName: 'Kenya', continent: 'africa', population: 55_000_000, areaKm2: 580_367 },
  { id: 'ma', mapName: 'Morocco', continent: 'africa', population: 37_000_000, areaKm2: 446_550 },
  { id: 'mg', mapName: 'Madagascar', continent: 'africa', population: 30_300_000, areaKm2: 587_041 },
  { id: 'ca', mapName: 'Canada', continent: 'north-america', population: 40_000_000, areaKm2: 9_984_670 },
  { id: 'mx', mapName: 'Mexico', continent: 'north-america', population: 129_000_000, areaKm2: 1_964_375 },
  { id: 'cu', mapName: 'Cuba', continent: 'north-america', population: 10_000_000, areaKm2: 109_884 },
  { id: 'br', mapName: 'Brazil', continent: 'south-america', population: 203_000_000, areaKm2: 8_515_767 },
  { id: 'pe', mapName: 'Peru', continent: 'south-america', population: 34_000_000, areaKm2: 1_285_216 },
  { id: 'cl', mapName: 'Chile', continent: 'south-america', population: 19_600_000, areaKm2: 756_102 },
  { id: 'au', mapName: 'Australia', continent: 'oceania', population: 26_600_000, areaKm2: 7_692_024 },
  { id: 'nz', mapName: 'New Zealand', continent: 'oceania', population: 5_200_000, areaKm2: 268_021 },
]

export const COUNTRIES: readonly Country[] = raw.map((c, i) => ({ ...c, number: i + 1 }))
export const COUNTRY_BY_ID = Object.fromEntries(COUNTRIES.map((c) => [c.id, c])) as Record<CountryId, Country>
export const COUNTRY_BY_MAP_NAME = Object.fromEntries(COUNTRIES.map((c) => [c.mapName, c])) as Record<string, Country>

