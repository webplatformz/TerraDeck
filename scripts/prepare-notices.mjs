import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const lock = JSON.parse(read('package-lock.json'))
const sections = [
  'TerraDeck — third-party notices',
  'This inventory includes installed production dependencies, including supporting tools and platform packages. Not every listed file is sent to your browser. Original licence and copyright texts follow with line endings normalized to LF.',
  'Natural Earth geographic data is public domain. Terms: https://www.naturalearthdata.com/about/terms-of-use/\nWikidata structured data is CC0. Terms: https://www.wikidata.org/wiki/Wikidata:Licensing',
  'REST Countries — MPL-2.0\nSource: https://github.com/restcountries/restcountries\nTerraDeck selects and transforms country records, localizes names and details, rounds numeric values and derives rarity values. The REST Countries-derived material remains available under MPL-2.0. Download third-party-sources.tar alongside this file for the corresponding editable snapshots, derived files and transformation scripts. Original app code and independent editorial text are not relicensed by this notice.',
  read('scripts/licenses/rest-countries-MPL-2.0.txt'),
]

for (const path of Object.keys(lock.packages).sort()) {
  const entry = lock.packages[path]
  if (!path || entry.dev) continue
  const manifest = JSON.parse(read(`${path}/package.json`))
  const licences = readdirSync(new URL(`../${path}/`, import.meta.url))
    .filter(name => /^(licen[sc]e|copying|notice|ofl|copyright|thirdpartynotice)/i.test(name))
    .sort()
  if (!manifest.license || !licences.length) throw new Error(`Missing licence metadata or text: ${path}`)
  sections.push(`${manifest.name} ${manifest.version} — ${manifest.license}`)
  for (const name of licences) sections.push(`${name}\n\n${read(`${path}/${name}`)}`)
}

const sources = [
  'scripts/licenses/rest-countries-MPL-2.0.txt',
  'scripts/atlas',
  'scripts/rarity',
  'scripts/collect-atlas.mjs',
  'scripts/collect-rarity.mjs',
  'scripts/collect-country-details.mjs',
  'scripts/build-atlas.mjs',
  'scripts/build-rarity.mjs',
  'src/data/countries.ts',
  'src/data/generated/country-additions.json',
  'src/data/generated/country-details.json',
  'src/data/generated/playable-country-ids.json',
  'src/data/generated/rarity.json',
  'src/i18n/locales/en.json',
  'src/i18n/locales/de.json',
]

mkdirSync(new URL('../public/', import.meta.url), { recursive: true })
writeFileSync(new URL('../public/third-party-notices.txt', import.meta.url), `${sections.join('\n\n' + '='.repeat(72) + '\n\n')}\n`)
execFileSync('tar', ['--exclude=._*', '--exclude=.DS_Store', '-cf', 'public/third-party-sources.tar', ...sources], {
  cwd: root,
  env: { ...process.env, COPYFILE_DISABLE: '1' },
  stdio: 'pipe',
})
console.log('Prepared third-party licence texts and corresponding country-data sources.')
