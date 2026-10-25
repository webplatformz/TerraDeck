import { test } from 'node:test'
import assert from 'node:assert/strict'
import { APP_VERSION, CURRENT_RELEASE, RELEASES, releaseVersion } from '../src/data/releases.ts'
import { mainHash, routeFromHash } from '../src/game/navigation.ts'

test('release versions derive from fixed dated bilingual entries, not the build clock', () => {
  assert.equal(APP_VERSION, 'v1.20261025')
  assert.equal(APP_VERSION, releaseVersion(CURRENT_RELEASE))
  assert.equal(new Set(RELEASES.map(releaseVersion)).size, RELEASES.length)
  for (const [index, release] of RELEASES.entries()) {
    assert.ok(Number.isSafeInteger(release.major) && release.major > 0)
    assert.match(release.date, /^\d{4}-\d{2}-\d{2}$/)
    assert.equal(new Date(`${release.date}T00:00:00Z`).toISOString().slice(0, 10), release.date)
    if (index > 0) assert.ok(RELEASES[index - 1].date >= release.date)
    for (const locale of ['en', 'de']) {
      assert.ok(release.title[locale].trim())
      assert.ok(release.notes[locale].length > 0)
      assert.equal(new Set(release.notes[locale].map(note => note.label)).size, release.notes[locale].length)
      for (const note of release.notes[locale]) {
        assert.ok(note.label.trim())
        assert.ok(note.label.trim().split(/\s+/).length <= 3)
        assert.ok(note.description.trim())
      }
    }
  }
})

test('release page round-trips hash navigation without becoming a gameplay route', () => {
  assert.equal(mainHash('releases'), '#releases')
  assert.deepEqual(routeFromHash('#releases'), { screen: 'releases', helpSection: null })
  assert.equal(routeFromHash('#home').screen, 'home')
  assert.equal(routeFromHash('#daily').screen, 'daily')
})
