import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ALL_COUNTRIES, COUNTRIES } from '../src/data/countries.ts'
import { COUNTRY_STORIES } from '../src/data/countryStories.ts'

const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))
const details = read('../src/data/generated/country-details.json')

test('country stories match the playable roster and editable bilingual content contract', () => {
  const entries = read('../scripts/content/country-stories.json')
  assert.deepEqual(entries.map(entry => entry.id), COUNTRIES.map(country => country.id))
  const limits = { front: 120, detail: 200, fun: 170 }
  for (const entry of entries) {
    assert.ok(Object.keys(entry).every(key => ['id', ...Object.keys(limits)].includes(key)))
    assert.deepEqual(COUNTRY_STORIES[entry.id], Object.fromEntries(Object.entries(entry).filter(([key]) => key !== 'id')))
    for (const [key, limit] of Object.entries(limits)) {
      const story = entry[key]
      if (story === undefined) continue
      assert.deepEqual(Object.keys(story).sort(), ['de', 'en'])
      for (const locale of ['en', 'de']) {
        assert.equal(typeof story[locale], 'string')
        assert.ok(story[locale].trim())
        assert.equal(story[locale], story[locale].trim())
        assert.ok(Array.from(story[locale]).length <= limit, `${entry.id}.${key}.${locale} exceeds ${limit} characters`)
      }
    }
  }
})

test('offline field notes cover the full playable and archival catalog in both languages', () => {
  assert.deepEqual(Object.keys(details.countries).sort(), ALL_COUNTRIES.map(c => c.id).sort())
  assert.match(details.source, /^https:\/\/raw\.githubusercontent\.com\/restcountries\//)
  assert.ok(Number.isFinite(Date.parse(details.retrievedAt)))
  for (const locale of ['en', 'de']) {
    const strings = read(`../src/i18n/locales/${locale}.json`)
    for (const country of ALL_COUNTRIES) {
      const entry = details.countries[country.id]
      assert.equal(typeof entry.landlocked, 'boolean')
      assert.ok(entry.languageCodes.length)
      assert.ok(entry.currencyCodes.length)
      assert.ok(entry[locale].languages.trim())
      assert.ok(entry[locale].currencies.trim())
      assert.ok(strings.countries[country.id].fact.trim())
    }
  }
  assert.match(details.countries.jp.en.currencies, /JPY/)
  assert.match(details.countries.jp.de.languages, /Japanisch/)
})

test('curated back stories have distinct bilingual facts', () => {
  const ids = new Set(ALL_COUNTRIES.map(country => country.id))
  for (const [id, stories] of Object.entries(COUNTRY_STORIES)) {
    assert.ok(ids.has(id))
    for (const story of [stories.detail, stories.fun]) {
      if (!story) continue
      for (const locale of ['en', 'de']) {
        const front = stories.front?.[locale] ?? read(`../src/i18n/locales/${locale}.json`).countries[id].fact
        assert.ok(story[locale].trim())
        assert.notEqual(story[locale], front)
      }
    }
    if (stories.detail && stories.fun) {
      for (const locale of ['en', 'de']) {
        assert.notEqual(stories.detail[locale], stories.fun[locale])
      }
    }
  }
})

test('playful first batch supplies ten bilingual front and fun facts with careful wording', () => {
  for (const id of ['au', 'ca', 'dk', 'fi', 'np', 'nz', 'za', 'se', 'ch', 'gb']) {
    for (const locale of ['en', 'de']) {
      assert.ok(COUNTRY_STORIES[id].front[locale])
      assert.ok(COUNTRY_STORIES[id].fun[locale])
    }
  }
  assert.match(COUNTRY_STORIES.au.fun.en, /cubes/)
  assert.match(COUNTRY_STORIES.ca.fun.en, /strategic reserve/)
  assert.match(COUNTRY_STORIES.fi.fun.en, /in 2025/)
  assert.match(COUNTRY_STORIES.ch.fun.en, /Helvetic Republic \(1798–1803\)/)
  assert.match(COUNTRY_STORIES.gb.front.en, /Scotland/)
  assert.match(COUNTRY_STORIES.dk.detail.en, /Hamlet/)
})

test('second playful batch supplies bilingual pairs and preserves the wording refinements', () => {
  for (const id of ['bt', 'bo', 'cr', 'eg', 'fr', 'is', 'it', 'jp', 'mn', 'pt']) {
    for (const locale of ['en', 'de']) {
      assert.ok(COUNTRY_STORIES[id].front[locale])
      assert.ok(COUNTRY_STORIES[id].fun[locale])
    }
  }
  assert.match(COUNTRY_STORIES.eg.front.en, /human-made structure/)
  assert.match(COUNTRY_STORIES.it.front.en, /traditionally dated to 1088/)
  assert.match(COUNTRY_STORIES.jp.front.en, /traces its history to 705/)
  assert.match(COUNTRY_STORIES.mn.front.en, /sovereign country/)
  assert.match(COUNTRY_STORIES.is.fun.en, /Althing/)
  assert.match(COUNTRY_STORIES.pt.fun.en, /bats/)
})

test('third playful batch supplies bilingual pairs with clear record definitions and locations', () => {
  for (const id of ['kh', 'ec', 'ee', 'id', 'mg', 'mx', 'no', 'pe', 'th', 'tr']) {
    for (const locale of ['en', 'de']) {
      assert.ok(COUNTRY_STORIES[id].front[locale])
      assert.ok(COUNTRY_STORIES[id].fun[locale])
    }
  }
  assert.match(COUNTRY_STORIES.ec.front.en, /Earth's centre/)
  assert.match(COUNTRY_STORIES.mx.front.en, /by volume/)
  assert.match(COUNTRY_STORIES.no.fun.en, /Edinburgh Zoo/)
  assert.match(COUNTRY_STORIES.th.fun.en, /one standard transliteration/)
  assert.match(COUNTRY_STORIES.id.fun.en, /individual flower/)
})

test('fourth playful batch updates nineteen playable countries and leaves Malta excluded', () => {
  for (const id of ['ar', 'am', 'at', 'be', 'bw', 'cl', 'hr', 'cz', 'et', 'ge', 'de', 'gr', 'hu', 'ie', 'ls', 'na', 'nl', 'ro', 'es']) {
    for (const locale of ['en', 'de']) {
      assert.ok(COUNTRY_STORIES[id].front[locale])
      assert.ok(COUNTRY_STORIES[id].fun[locale])
    }
  }
  assert.equal(COUNTRY_STORIES.mt, undefined)
  assert.match(COUNTRY_STORIES.am.front.en, /traditionally considered/)
  assert.match(COUNTRY_STORIES.cl.front.en, /non-polar/)
  assert.match(COUNTRY_STORIES.na.front.en, /considered/)
  assert.match(COUNTRY_STORIES.es.front.en, /Guinness/)
})

test('spreadsheet batch supplies translated stories without importing workbook metadata', () => {
  for (const id of ['af', 'ba', 'cn', 'in', 'mz', 'ws', 'vn', 'zw']) {
    for (const locale of ['en', 'de']) {
      assert.ok(COUNTRY_STORIES[id].front[locale])
      assert.ok(COUNTRY_STORIES[id].fun[locale])
    }
  }
  assert.match(COUNTRY_STORIES.ba.front.en, /rebuilt/)
  assert.match(COUNTRY_STORIES.cn.fun.en, /wrist bone/)
  assert.match(COUNTRY_STORIES.ws.front.en, /30 December 2011/)
  assert.match(COUNTRY_STORIES.vn.front.en, /by volume/)
  assert.doesNotMatch(COUNTRY_STORIES.mz.front.en, /AK-47/)
  assert.equal(COUNTRY_STORIES.sg, undefined)
  assert.equal(COUNTRY_STORIES.va, undefined)
})
