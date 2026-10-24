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
  assert.match(en, /3\/5 correct/)
  assert.match(en, /Off target: 846 km\n/)
  const de = tourShareText(42, 'Tour title', correct, distances, 'de')
  assert.match(de, /3\/5 richtig/)
  assert.match(de, /Abweichung: 846 km\n/)
  assert.match(tourShareText(1, 'Perfect', [true, true, true, true, true], [0, 0, 0, 0, 0], 'en'), /Off target: 0 km\n/)
  assert.ok(en.endsWith(TOUR_PUBLIC_URL))
  assert.equal(new URL(TOUR_PUBLIC_URL).origin, 'https://webplatformz.github.io')
  assert.equal(new URL(TOUR_PUBLIC_URL).search, '')
  assert.deepEqual(routeFromHash('#daily'), { screen: 'daily', helpSection: null })
})
