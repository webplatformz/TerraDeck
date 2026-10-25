import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const root = new URL('../', import.meta.url)
const read = path => readFileSync(new URL(path, root), 'utf8')

test('bundled notices retain complete production dependency and country-data licences', () => {
  const notices = read('public/third-party-notices.txt')
  const lock = JSON.parse(read('package-lock.json'))
  for (const [path, entry] of Object.entries(lock.packages)) {
    if (!path || entry.dev) continue
    const manifest = JSON.parse(read(`${path}/package.json`))
    assert.ok(notices.includes(`${manifest.name} ${manifest.version} — ${manifest.license}`), path)
    const files = readdirSync(new URL(`${path}/`, root))
      .filter(name => /^(licen[sc]e|copying|notice|ofl|copyright|thirdpartynotice)/i.test(name))
    assert.ok(files.length, path)
    for (const file of files) assert.ok(notices.includes(read(`${path}/${file}`)), `${path}/${file}`)
  }
  assert.ok(notices.includes(read('scripts/licenses/rest-countries-MPL-2.0.txt')))
})

test('country-data source download contains current editable data and transformations', () => {
  const files = execFileSync('tar', ['-tf', 'public/third-party-sources.tar'], { cwd: root, encoding: 'utf8' }).trim().split('\n')
  for (const file of files.filter(path => !path.endsWith('/'))) {
    assert.ok(/^(src\/(data|i18n)\/|scripts\/)/.test(file), file)
    assert.equal(execFileSync('tar', ['-xOf', 'public/third-party-sources.tar', file], { cwd: root, encoding: 'utf8' }), read(file), file)
  }
  for (const file of ['scripts/licenses/rest-countries-MPL-2.0.txt', 'scripts/atlas/snapshot.json', 'scripts/rarity/snapshot.json', 'scripts/build-atlas.mjs', 'scripts/collect-country-details.mjs', 'src/data/generated/country-details.json', 'src/i18n/locales/en.json', 'src/i18n/locales/de.json']) {
    assert.ok(files.includes(file), file)
  }
})
