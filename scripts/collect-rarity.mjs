/**
 * Explicit, networked refresh of the source snapshot. Never runs in a build.
 * Country articles are resolved through Wikidata; language-edition coverage is
 * a deliberately imperfect familiarity proxy, not a recognition survey.
 */
import { mkdir, writeFile } from 'node:fs/promises'

const COUNTRY_SOURCE = 'https://raw.githubusercontent.com/restcountries/restcountries/master/src/main/resources/countriesV3.1.json'
const TITLES = {
  BO: 'Bolivia', BN: 'Brunei', BS: 'The Bahamas', CD: 'Democratic Republic of the Congo',
  CG: 'Republic of the Congo', CI: 'Ivory Coast', CV: 'Cape Verde',
  CZ: 'Czech Republic', FM: 'Federated States of Micronesia', GB: 'United Kingdom',
  GE: 'Georgia (country)', GM: 'The Gambia', IE: 'Republic of Ireland', KR: 'South Korea', KP: 'North Korea',
  MM: 'Myanmar', PS: 'State of Palestine', ST: 'São Tomé and Príncipe',
  TL: 'Timor-Leste', TR: 'Turkey', US: 'United States', VA: 'Vatican City',
}
const headers = { 'User-Agent': 'TerraDeck-rarity-generator/1.0 (offline game content research)' }
async function json(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(45_000) })
    if (response.ok) return response.json()
    if (![429, 502, 503, 504].includes(response.status) || attempt === 3) {
      throw new Error(`${response.status} fetching ${url}: ${await response.text()}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)))
  }
}
const all = await json(COUNTRY_SOURCE)
const matrix = await json('https://www.wikidata.org/w/api.php?action=sitematrix&format=json')
const wikipediaSites = new Set(Object.values(matrix.sitematrix)
  .filter((entry) => entry && typeof entry === 'object' && Array.isArray(entry.site))
  .flatMap((entry) => entry.site)
  .filter((site) => site.code === 'wiki' && !('closed' in site) && !('private' in site))
  .map((site) => site.dbname))
if (wikipediaSites.size < 250) throw new Error('Incomplete Wikipedia edition list')
// The source incorrectly marks Guinea-Bissau as not a UN member.
const reference = all.filter((c) => c.unMember || c.cca2 === 'GW').sort((a, b) => a.cca2.localeCompare(b.cca2))
if (reference.length !== 193) throw new Error(`Expected 193 reference entries, got ${reference.length}`)
const sources = []
for (let offset = 0; offset < reference.length; offset += 20) {
  const batch = reference.slice(offset, offset + 20)
  const titles = batch.map((c) => TITLES[c.cca2] ?? c.name.common)
  const params = new URLSearchParams({
    action: 'wbgetentities', sites: 'enwiki', titles: titles.join('|'),
    props: 'sitelinks|claims', format: 'json', redirects: 'yes',
  })
  const result = await json(`https://www.wikidata.org/w/api.php?${params}`)
  for (let i = 0; i < batch.length; i++) {
    const c = batch[i]
    const entity = Object.values(result.entities).find((e) => e.claims?.P297?.some((claim) => claim.mainsnak.datavalue?.value === c.cca2))
    if (!entity || !entity.claims?.P297?.some((claim) => claim.mainsnak.datavalue?.value === c.cca2)) {
      throw new Error(`Country article/ISO mismatch: ${c.cca2} (${titles[i]})`)
    }
    const editions = Object.keys(entity.sitelinks).filter((site) => wikipediaSites.has(site)).sort()
    sources.push({
      id: c.cca2.toLowerCase(), name: c.name.common, wikidata: entity.id,
      areaKm2: c.area, population: c.population, capital: c.capital?.[0] ?? '',
      germanName: c.translations.deu.common, article: entity.sitelinks.enwiki?.title,
      editions, coverage: editions.length,
    })
  }
  await new Promise((resolve) => setTimeout(resolve, 1500))
}
const snapshot = {
  methodology: 'Wikipedia language-edition coverage of country articles via Wikidata sitelinks. Not a recognition survey. Fewer editions means rarer.',
  reference: '193 UN member states; Guinea-Bissau corrected from the source dataset membership flag.',
  retrievedAt: new Date().toISOString(),
  countrySource: COUNTRY_SOURCE,
  articleSource: 'https://www.wikidata.org/w/api.php (sitelinks, ISO P297 verified)',
  editionSource: 'https://www.wikidata.org/w/api.php?action=sitematrix&format=json (active Wikipedia sites only)',
  wikipediaSites: [...wikipediaSites].sort(),
  countries: sources,
}
await mkdir(new URL('./rarity/', import.meta.url), { recursive: true })
await writeFile(new URL('./rarity/snapshot.json', import.meta.url), `${JSON.stringify(snapshot, null, 2)}\n`)
console.log(`Frozen language-edition coverage for ${sources.length} reference countries`)
