import { test } from 'node:test'
import assert from 'node:assert/strict'
import { tourShareText, TOUR_PUBLIC_URL } from '../src/game/tourSharing.ts'
import { routeFromHash } from '../src/game/navigation.ts'

test('daily result sharing is localized, numbered and spoiler-free with a canonical public link', () => {
  const correct = [true, true, false, true, false]
  const distances = [0, 0, 800, 0, 46]
  const en = tourShareText(42, 'Tour title', correct, distances, 'en')
  assert.match(en, /World Tour #42/)
  assert.match(en, /🟩🟩🟥🟩🟥/)
  assert.match(en, /3\/5 correct · 846 km/)
  assert.match(tourShareText(42, 'Tour title', correct, distances, 'de'), /3\/5 richtig/)
  assert.ok(en.endsWith(TOUR_PUBLIC_URL))
  assert.equal(new URL(TOUR_PUBLIC_URL).origin, 'https://webplatformz.github.io')
  assert.equal(new URL(TOUR_PUBLIC_URL).search, '')
  assert.deepEqual(routeFromHash('#daily'), { screen: 'daily', helpSection: null })
})
