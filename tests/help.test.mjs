import { mock, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { HELP_SECTIONS, mainHash, routeFromHash } from '../src/game/navigation.ts'
import { noticeStore, NOTICE_STORAGE_KEY, NOTICE_VERSION } from '../src/persistence/noticeStore.ts'
import { LocalStorageRepository, STORAGE_KEY } from '../src/persistence/LocalStorageRepository.ts'
import { languageStore, LANGUAGE_STORAGE_KEY } from '../src/persistence/languageStore.ts'
import { createInitialState } from '../src/domain/challenge.ts'
import { DEFAULT_CONFIG } from '../src/domain/config.ts'
import { SOURCE_LINKS, PROJECT } from '../src/data/project.ts'
import { EXCLUDED_COUNTRIES } from '../src/data/excludedCountries.ts'
import { DEFERRED } from '../scripts/atlas/policy.mjs'

function memoryStorage() {
  const values = new Map()
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value) },
    removeItem: key => { values.delete(key) },
    clear: () => values.clear(),
  }
}

test('help hashes round-trip every subsection while retaining legacy navigation and safe fallbacks', () => {
  for (const section of HELP_SECTIONS)
    assert.deepEqual(routeFromHash(mainHash('about', section)), { screen: 'about', helpSection: section })
  assert.deepEqual(routeFromHash('#about'), { screen: 'about', helpSection: null })
  assert.deepEqual(routeFromHash('#about/unknown'), { screen: 'about', helpSection: null })
  assert.deepEqual(routeFromHash('#about/stamps'), { screen: 'about', helpSection: 'play' })
  assert.deepEqual(routeFromHash('#about/deferred'), { screen: 'about', helpSection: 'roster' })
  assert.equal(HELP_SECTIONS.length, 14)
  for (const hash of ['', '#unknown', '#expedition']) assert.equal(routeFromHash(hash).screen, 'home')
  assert.equal(mainHash('home', 'privacy'), '#home')
  assert.equal(routeFromHash('#collection').screen, 'collection')
})

test('only explicit current-version acknowledgement persists, independently of progress and language', async () => {
  const storage = memoryStorage()
  assert.equal(noticeStore.acknowledged(storage), false)
  storage.setItem(NOTICE_STORAGE_KEY, 'obsolete-version')
  assert.equal(noticeStore.acknowledged(storage), false)
  storage.setItem(NOTICE_STORAGE_KEY, 'malformed')
  assert.equal(noticeStore.acknowledged(storage), false)
  assert.equal(noticeStore.acknowledge(storage), true)
  assert.equal(storage.getItem(NOTICE_STORAGE_KEY), NOTICE_VERSION)
  assert.equal(noticeStore.acknowledged(storage), true)
  const state = createInitialState(DEFAULT_CONFIG)
  state.progress.fr = { stamps: 1, encounters: 1, unlockedAt: null }
  const repository = new LocalStorageRepository(storage)
  await repository.save(state)
  languageStore.save('de', storage)
  assert.deepEqual(await repository.load(), state)
  await repository.clear()
  assert.equal(storage.getItem(STORAGE_KEY), null)
  assert.equal(noticeStore.acknowledged(storage), true)
  assert.equal(storage.getItem(LANGUAGE_STORAGE_KEY), 'de')
  const demo = new LocalStorageRepository(storage, `${STORAGE_KEY}:demo`)
  await demo.save(state)
  await demo.clear()
  assert.equal(noticeStore.acknowledged(storage), true)
  storage.clear()
  assert.equal(noticeStore.acknowledged(storage), false)
})

test('unavailable browser storage reports failure without blocking notice, language or game load', async () => {
  const warnings = mock.method(console, 'warn', () => {})
  try {
    const storage = {
      getItem() { throw new Error('storage blocked') },
      setItem() { throw new Error('storage blocked') },
      removeItem() { throw new Error('storage blocked') },
    }
    assert.equal(noticeStore.acknowledged(storage), false)
    assert.equal(noticeStore.acknowledge(storage), false)
    assert.equal(languageStore.load(storage), null)
    languageStore.save('de', storage)
    const repository = new LocalStorageRepository(storage)
    assert.equal(await repository.load(), null)
    await repository.save(createInitialState(DEFAULT_CONFIG))
    await repository.clear()
    assert.equal(warnings.mock.callCount(), 5)
  } finally {
    warnings.mock.restore()
  }
})

test('bilingual help content covers every entry, the approved roster policy and source credits', () => {
  const en = JSON.parse(readFileSync(new URL('../src/i18n/locales/en.json', import.meta.url)))
  const de = JSON.parse(readFileSync(new URL('../src/i18n/locales/de.json', import.meta.url)))
  for (const content of [en, de]) {
    for (const section of HELP_SECTIONS) assert.ok(content.help[section].title, section)
    for (const source of SOURCE_LINKS) {
      assert.ok(content.help.sources[source.id])
      assert.equal(new URL(source.url).protocol, 'https:')
    }
    assert.match(content.help.roster.excluded, /27/)
    assert.match(content.help.territories.body, /Kosovo.*Taiwan/)
    assert.match(content.help.project.inspiration, /Camp|camp/)
    assert.match(content.help.project.inspiration, /Bundeshaus Pack/)
  }
  assert.deepEqual(Object.keys(en.notice).sort(), Object.keys(de.notice).sort())
  assert.deepEqual(EXCLUDED_COUNTRIES.map(c => c.id).sort(), Object.keys(DEFERRED).sort())
  for (const c of EXCLUDED_COUNTRIES) {
    for (const language of ['en', 'de']) {
      assert.ok(c[language].name)
      assert.equal(new URL(c[language].wikipediaUrl).hostname, `${language}.wikipedia.org`)
    }
  }
  assert.equal(new URL(PROJECT.issuesUrl).pathname, '/webplatformz/TerraDeck/issues')
})
