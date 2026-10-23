import { readFileSync, writeFileSync } from 'node:fs'

const source = 'https://raw.githubusercontent.com/restcountries/restcountries/master/src/main/resources/countriesV3.1.json'
const response = await fetch(source)
if (!response.ok) throw new Error(`Country details source: HTTP ${response.status}`)
const countries = await response.json()
const ids = JSON.parse(readFileSync(new URL('./rarity/roster.json', import.meta.url), 'utf8'))
const special = {
  smi: ['Sami languages', 'Samische Sprachen'],
  ber: ['Berber languages', 'Berbersprachen'],
  nzs: ['New Zealand Sign Language', 'Neuseeländische Gebärdensprache'],
  glc: ['Galician', 'Galicisch'],
  hgm: ['Khoekhoe', 'Khoekhoegowab'],
  kwn: ['Kwangali', 'Kwangali'],
  bjz: ['Belizean Creole', 'Belize-Kreolisch'],
  pov: ['Upper Guinea Creole', 'Guineabissauisches Kreol'],
  zdj: ['Comorian', 'Komorisch'],
  bwg: ['Chibarwe', 'Chibarwe'],
  kck: ['Kalanga', 'Kalanga'],
  khi: ['Khoisan languages', 'Khoisansprachen'],
  ndc: ['Ndau', 'Ndau'],
  toi: ['Tonga', 'Tonga'],
  zib: ['Zimbabwean Sign Language', 'Simbabwische Gebärdensprache'],
}
const specialCurrencies = {
  KID: ['Kiribati dollar', 'Kiribati-Dollar'],
  SLE: ['Sierra Leonean leone', 'Sierra-leonischer Leone'],
}
const entries = Object.fromEntries(ids.map(id => {
  const country = countries.find(c => c.cca2.toLowerCase() === id)
  if (!country) throw new Error(`Missing country: ${id}`)
  const languageCodes = Object.keys(country.languages ?? {})
  const currencyCodes = Object.keys(country.currencies ?? {})
  if (!languageCodes.length || !currencyCodes.length) throw new Error(`Incomplete details: ${id}`)
  const localized = Object.fromEntries(['en', 'de'].map((locale, index) => {
    const languages = new Intl.DisplayNames(locale, { type: 'language', fallback: 'none' })
    const currencies = new Intl.DisplayNames(locale, { type: 'currency', fallback: 'none' })
    const translate = (code, display, overrides) => {
      const value = overrides?.[code]?.[index] ?? display.of(code)
      if (!value) throw new Error(`Missing ${locale} translation: ${code}`)
      return value
    }
    return [locale, {
      languages: languageCodes.map(code => translate(code, languages, special)).join(' · '),
      currencies: currencyCodes.map(code => `${translate(code, currencies, specialCurrencies)} (${code})`).join(' · '),
    }]
  }))
  return [id, { landlocked: country.landlocked, languageCodes, currencyCodes, ...localized }]
}))
writeFileSync(new URL('../src/data/generated/country-details.json', import.meta.url),
  `${JSON.stringify({ source, retrievedAt: new Date().toISOString(), countries: entries }, null, 2)}\n`)
