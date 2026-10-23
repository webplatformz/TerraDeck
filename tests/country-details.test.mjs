import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ALL_COUNTRIES, COUNTRIES } from '../src/data/countries.ts'
import { COUNTRY_STORIES } from '../src/data/countryStories.ts'

const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))
const details = read('../src/data/generated/country-details.json')

test('country story source matches the playable roster and editorial contract', () => {
  const entries = read('../scripts/content/country-stories.json')
  assert.deepEqual(entries.map(entry => entry.id), COUNTRIES.map(country => country.id))
  const limits = { front: 120, detail: 200, fun: 170 }
  for (const entry of entries) {
    assert.ok(Object.keys(entry).every(key => ['id', ...Object.keys(limits)].includes(key)))
    assert.deepEqual(COUNTRY_STORIES[entry.id], Object.fromEntries(Object.entries(entry).filter(([key]) => key !== 'id')))
    for (const [key, limit] of Object.entries(limits)) {
      const story = entry[key]
      if (story === undefined) continue
      assert.deepEqual(Object.keys(story).sort(), ['de', 'en', 'source'])
      assert.equal(new URL(story.source).protocol, 'https:')
      for (const locale of ['en', 'de']) {
        assert.equal(typeof story[locale], 'string')
        assert.ok(story[locale].trim())
        assert.equal(story[locale], story[locale].trim())
        assert.ok(Array.from(story[locale]).length <= limit, `${entry.id}.${key}.${locale} exceeds ${limit} characters`)
      }
    }
  }
  assert.match(COUNTRY_STORIES.ba.front.en, /bridge keepers/)
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

test('curated back stories have distinct bilingual facts and sources', () => {
  const ids = new Set(ALL_COUNTRIES.map(country => country.id))
  for (const [id, stories] of Object.entries(COUNTRY_STORIES)) {
    assert.ok(ids.has(id))
    for (const story of [stories.detail, stories.fun]) {
      if (!story) continue
      assert.equal(new URL(story.source).protocol, 'https:')
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
