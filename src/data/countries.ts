import type { ContinentId, CountryId, RosterEntry } from '../domain/types'
import { isRarity, type Rarity } from '../domain/rarity'
import catalog from './generated/rarity.json'
import additions from './generated/country-additions.json'
import { CONTINENTS } from './continents'

export interface Country extends RosterEntry {
  id: CountryId
  number: number
  /** Feature name in the world-atlas TopoJSON. */
  mapName: string
  continent: ContinentId
  /** Approximate population (recent UN / national estimates). */
  population: number
  areaKm2: number
  rarity: Rarity
}

/** Names, capitals and facts are translated: see `countries` in src/i18n/locales/*.json. */

const original: Omit<Country, 'number' | 'rarity'>[] = [
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
  { id: 'de', mapName: 'Germany', continent: 'europe', population: 83_491_249, areaKm2: 357_114 },
  { id: 'es', mapName: 'Spain', continent: 'europe', population: 49_315_949, areaKm2: 505_992 },
  { id: 'gb', mapName: 'United Kingdom', continent: 'europe', population: 69_281_437, areaKm2: 244_376 },
  { id: 'gr', mapName: 'Greece', continent: 'europe', population: 10_400_720, areaKm2: 131_990 },
  { id: 'cn', mapName: 'China', continent: 'asia', population: 1_408_280_000, areaKm2: 9_706_961 },
  { id: 'kr', mapName: 'South Korea', continent: 'asia', population: 51_159_889, areaKm2: 100_210 },
  { id: 'id', mapName: 'Indonesia', continent: 'asia', population: 284_438_782, areaKm2: 1_904_569 },
  { id: 'bt', mapName: 'Bhutan', continent: 'asia', population: 784_043, areaKm2: 38_394 },
  { id: 'dz', mapName: 'Algeria', continent: 'africa', population: 47_400_000, areaKm2: 2_381_741 },
  { id: 'gh', mapName: 'Ghana', continent: 'africa', population: 33_742_380, areaKm2: 238_533 },
  { id: 'na', mapName: 'Namibia', continent: 'africa', population: 3_022_401, areaKm2: 825_615 },
  { id: 'ls', mapName: 'Lesotho', continent: 'africa', population: 2_116_427, areaKm2: 30_355 },
  { id: 'us', mapName: 'United States of America', continent: 'north-america', population: 340_110_988, areaKm2: 9_525_067 },
  { id: 'cr', mapName: 'Costa Rica', continent: 'north-america', population: 5_309_625, areaKm2: 51_100 },
  { id: 'jm', mapName: 'Jamaica', continent: 'north-america', population: 2_825_544, areaKm2: 10_991 },
  { id: 'ar', mapName: 'Argentina', continent: 'south-america', population: 46_735_004, areaKm2: 2_780_400 },
  { id: 'bo', mapName: 'Bolivia', continent: 'south-america', population: 11_365_333, areaKm2: 1_098_581 },
  { id: 'uy', mapName: 'Uruguay', continent: 'south-america', population: 3_499_451, areaKm2: 181_034 },
  { id: 'fj', mapName: 'Fiji', continent: 'oceania', population: 900_869, areaKm2: 18_272 },
  { id: 'vu', mapName: 'Vanuatu', continent: 'oceania', population: 321_409, areaKm2: 12_189 },
]

const newCountries: Omit<Country, 'number' | 'rarity'>[] = additions.map(c => {
  const continent = CONTINENTS.find(continent => continent.id === c.continent)?.id
  if (!continent) throw new Error(`Invalid continent for ${c.id}`)
  return { ...c, continent }
})

export const COUNTRIES: readonly Country[] = [...original, ...newCountries].map((c, i) => {
  const entry = Object.entries(catalog).find(([id]) => id === c.id)?.[1]
  if (!entry || !isRarity(entry.grade)) throw new Error(`Missing or invalid rarity for ${c.id}`)
  return { ...c, number: i + 1, rarity: entry.grade }
})
export const COUNTRY_BY_ID = Object.fromEntries(COUNTRIES.map((c) => [c.id, c])) as Record<CountryId, Country>
export const COUNTRY_BY_MAP_NAME = Object.fromEntries(COUNTRIES.map((c) => [c.mapName, c])) as Record<string, Country>
