import { readFile, writeFile, mkdir } from 'node:fs/promises'

const countrySource = 'https://raw.githubusercontent.com/restcountries/restcountries/master/src/main/resources/countriesV3.1.json'
const articleSource = 'https://www.wikidata.org/wiki/Special:EntityData/Q219060.json'
async function json(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) })
  if (!response.ok) throw new Error(`${response.status} fetching ${url}`)
  return response.json()
}
const reference = JSON.parse(await readFile(new URL('./rarity/snapshot.json', import.meta.url)))
const [all, entityData] = await Promise.all([json(countrySource), json(articleSource)])
const entity = entityData.entities.Q219060
if (!entity.claims.P297?.some(c => c.mainsnak.datavalue?.value === 'PS')) throw new Error('Palestine ISO identity mismatch')
const candidateIds = [...reference.countries.map(c => c.id), 'ps', 'va']
const countries = candidateIds.map(id => {
  const c = all.find(c => c.cca2.toLowerCase() === id)
  if (!c || !c.translations.deu?.common || !c.capital?.length || !Number.isFinite(c.area) || !Number.isFinite(c.population))
    throw new Error(`Incomplete atlas source: ${id}`)
  return {
    id, name: c.name.common, germanName: c.translations.deu.common,
    capital: c.capital, areaKm2: c.area, population: c.population,
    landlocked: c.landlocked, borders: c.borders ?? [], cca3: c.cca3,
  }
})
const editions = Object.keys(entity.sitelinks).filter(site => reference.wikipediaSites.includes(site)).sort()
const snapshot = {
  retrievedAt: new Date().toISOString(), countrySource, articleSource,
  countries,
  observerRarity: [{
    id: 'ps', name: 'Palestine', wikidata: entity.id, article: entity.sitelinks.enwiki.title,
    areaKm2: countries.find(c => c.id === 'ps').areaKm2, editions, coverage: editions.length,
  }],
}
await mkdir(new URL('./atlas/', import.meta.url), { recursive: true })
await writeFile(new URL('./atlas/snapshot.json', import.meta.url), `${JSON.stringify(snapshot, null, 2)}\n`)
console.log(`Collected ${countries.length} candidate records and verified Palestine rarity source`)
