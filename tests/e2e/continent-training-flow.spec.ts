import { expect, test, type Page } from '@playwright/test'
import { continentTrainingCountryIds, CONTINENT_TRAINING_STORAGE_KEY } from '../../src/domain/continentTraining'
import { createInitialState, openPack } from '../../src/domain/challenge'
import { DEFAULT_CONFIG } from '../../src/domain/config'
import { COUNTRY_BY_ID } from '../../src/data/countries'
import { startDailyTour } from '../../src/domain/dailyTour'

test.beforeEach(async ({ page }, testInfo) => {
  const now = Date.UTC(2026, 9, 31, 12)
  await page.clock.setFixedTime(now)
  const main = openPack(createInitialState(DEFAULT_CONFIG, now), [{ id: 'fr', continent: 'europe', rarity: 'common' }], now, () => 0, DEFAULT_CONFIG)
  delete main.achievements
  delete main.dailyTours
  await page.addInitScript(({ main, de }) => {
    localStorage.setItem('terradeck:project-notice', '1')
    localStorage.setItem('terradeck:lang', de ? 'de' : 'en')
    if (!localStorage.getItem('terradeck:save:v1')) localStorage.setItem('terradeck:save:v1', JSON.stringify(main))
  }, { main, de: testInfo.project.name === 'iphone-16' })
})

const mainSave = (page: Page) => page.evaluate(() => localStorage.getItem('terradeck:save:v1'))
const trainingSave = (page: Page) => page.evaluate(key => localStorage.getItem(key), CONTINENT_TRAINING_STORAGE_KEY)
function normalizedMainSave(raw: string | null) {
  if (!raw) return raw
  const state = JSON.parse(raw)
  state.achievements ??= createInitialState(DEFAULT_CONFIG, 0).achievements
  return state
}

async function place(page: Page, mapName: string) {
  await page.locator('.training-map .map-controls button').nth(2).click()
  await expect.poll(() => page.locator('.training-map .map-svg').evaluate(el =>
    (el as SVGSVGElement & { __zoom: { k: number } }).__zoom.k)).toBe(1)
  await page.locator(`.training-map path[data-name="${mapName}"]`).click()
  await page.locator('.training-target > .btn').click()
}

test('training resumes after leaving/reloading; wrong guesses, hints and cancel stay isolated', async ({ page }, testInfo) => {
  const de = testInfo.project.name === 'iphone-16'
  await page.goto('/')
  const before = await mainSave(page)
  await page.locator('.training-home').click()
  await page.getByRole('button', { name: de ? 'Europa' : 'Europe', exact: true }).click()
  await page.locator('.training-country').filter({ hasText: de ? 'Frankreich' : 'France' }).click()
  await page.locator('.training-hint-toggle').click()
  await expect(page.locator('.training-hint .geographic-clue')).toHaveCount(1)
  await place(page, 'France')
  await expect(page.locator('.training-country').filter({ hasText: de ? 'Frankreich' : 'France' })).toHaveCount(0)
  await expect(page.locator('.training-map path[data-name="France"]')).toHaveClass(/is-correct/)
  const saved = await trainingSave(page)
  await page.locator('.screen-bar .atlas-back').click()
  await expect(page.locator('.training-home-count')).toContainText('1 /')
  await page.reload()
  await page.locator('.training-home').click()
  await expect(page.locator('.training-continent-grid')).toHaveCount(0)
  expect(await trainingSave(page)).toBe(saved)
  await page.locator('.training-country').filter({ hasText: de ? 'Deutschland' : 'Germany' }).click()
  await expect(page.locator('.training-hint')).toHaveCount(0)
  await place(page, 'Italy')
  await expect(page.locator('.training-feedback--wrong')).toBeVisible()
  await expect(page.locator('.training-streak')).toHaveAttribute('aria-valuenow', '0')
  await expect(page.locator('.training-progress')).toHaveAttribute('aria-valuenow', '1')
  await expect(page.locator('.training-country').filter({ hasText: de ? 'Deutschland' : 'Germany' })).toBeVisible()
  await page.locator('.training-country').filter({ hasText: de ? 'Deutschland' : 'Germany' }).click()
  await place(page, 'Germany')
  await expect(page.locator('.training-progress')).toHaveAttribute('aria-valuenow', '2')
  await page.locator('.training-summary-title .btn').click()
  await expect(page.getByRole('alertdialog')).toBeVisible()
  const beforeCancel = await trainingSave(page)
  await page.locator('.training-modal .btn--ghost').click()
  expect(await trainingSave(page)).toBe(beforeCancel)
  await page.locator('.training-summary-title .btn').click()
  await page.locator('.training-modal .btn--primary').click()
  await expect(page.locator('.home')).toBeVisible()
  expect(await trainingSave(page)).toBeNull()
  expect(normalizedMainSave(await mainSave(page))).toEqual(normalizedMainSave(before))
})

for (const perfect of [true, false]) {
  test(`${perfect ? 'perfect' : 'recovered'} completion survives reload, replay starts fresh and confirmed close clears only training`, async ({ page }, testInfo) => {
    const de = testInfo.project.name === 'iphone-16'
    const ids = continentTrainingCountryIds('europe')
    const placedIds = ids.filter(id => id !== 'fr')
    await page.addInitScript(({ key, placedIds, perfect }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({
        version: 1, session: { continent: 'europe', placedIds, streak: perfect ? placedIds.length : 0 },
      }))
    }, { key: CONTINENT_TRAINING_STORAGE_KEY, placedIds, perfect })
    await page.goto('/')
    const before = await mainSave(page)
    await page.locator('.training-home').click()
    await page.locator('.training-country').click()
    await place(page, 'France')
    await expect(page.locator('.training-complete')).toBeVisible()
    await expect(page.locator('.training-ultra')).toHaveCount(perfect ? 1 : 0)
    const completed = await trainingSave(page)
    await page.locator('.training-complete-actions .btn--ghost').click()
    await page.locator('.training-modal .btn--ghost').click()
    expect(await trainingSave(page)).toBe(completed)
    await page.reload()
    await expect(page.locator('.training-complete')).toBeVisible()
    await expect(page.locator('.training-ultra')).toHaveCount(perfect ? 1 : 0)
    await page.locator('.training-complete-actions .btn--primary').click()
    await expect(page.locator('.training-progress')).toHaveAttribute('aria-valuenow', '0')
    await expect(page.locator('.training-streak')).toHaveAttribute('aria-valuenow', '0')
    const replay = JSON.parse((await trainingSave(page))!)
    expect(replay.session).toEqual({ continent: 'europe', placedIds: [], streak: 0 })

    // Complete the replay via a storage event to exercise external-tab updates too.
    await page.evaluate(({ key, ids }) => {
      const newValue = JSON.stringify({ version: 1, session: { continent: 'europe', placedIds: ids, streak: 0 } })
      localStorage.setItem(key, newValue)
      dispatchEvent(new StorageEvent('storage', { key, newValue }))
    }, { key: CONTINENT_TRAINING_STORAGE_KEY, ids })
    await expect(page.locator('.training-complete')).toBeVisible()
    await page.getByRole('button', { name: de ? 'Training schließen' : 'Close training', exact: true }).click()
    await page.locator('.training-modal .btn--primary').click()
    await expect(page.locator('.home')).toBeVisible()
    expect(await trainingSave(page)).toBeNull()
    expect(await mainSave(page)).toBe(before)
  })
}

for (const raw of ['{broken', JSON.stringify({ version: 2, session: { continent: 'europe' } })]) {
  test(`unreadable training stays preserved without blocking the existing challenge: ${raw}`, async ({ page }) => {
    await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), { key: CONTINENT_TRAINING_STORAGE_KEY, raw })
    await page.goto('/#training')
    const before = await mainSave(page)
    await expect(page.locator('.training-error')).toBeVisible()
    await expect(page.locator('.training-continent-grid, .training-summary, .training-complete')).toHaveCount(0)
    expect(await trainingSave(page)).toBe(raw)
    await page.locator('.screen-bar .atlas-back').click()
    await page.locator('.home-pack > .btn--primary').click()
    await expect(page.locator('.expedition')).toBeVisible()
    expect(await mainSave(page)).toBe(before)
    expect(await trainingSave(page)).toBe(raw)
  })
}

test('save and clear failures are shown, preserve progress and allow retry', async ({ page }) => {
  await page.addInitScript(key => {
    const setItem = Storage.prototype.setItem
    const removeItem = Storage.prototype.removeItem
    Storage.prototype.setItem = function (name, value) {
      if (name === key && sessionStorage.getItem('training-test-fail') === 'save') throw new DOMException('Storage full', 'QuotaExceededError')
      setItem.call(this, name, value)
    }
    Storage.prototype.removeItem = function (name) {
      if (name === key && sessionStorage.getItem('training-test-fail') === 'clear') throw new DOMException('Storage blocked', 'SecurityError')
      removeItem.call(this, name)
    }
  }, CONTINENT_TRAINING_STORAGE_KEY)
  await page.goto('/')
  const before = await mainSave(page)
  await page.locator('.training-home').click()
  await page.locator('.training-continent').filter({ hasText: /Europe|Europa/ }).click()
  const saved = await trainingSave(page)
  await page.locator('.training-country').filter({ hasText: /France|Frankreich/ }).click()
  await page.evaluate(() => sessionStorage.setItem('training-test-fail', 'save'))
  await place(page, COUNTRY_BY_ID.fr.mapName)
  await expect(page.locator('.training-error')).toBeVisible()
  await expect(page.locator('.training-target')).toBeVisible()
  expect(await trainingSave(page)).toBe(saved)
  await page.evaluate(() => sessionStorage.removeItem('training-test-fail'))
  await page.locator('.training-target > .btn').click()
  await expect(page.locator('.training-progress')).toHaveAttribute('aria-valuenow', '1')
  const placed = await trainingSave(page)
  await page.evaluate(() => sessionStorage.setItem('training-test-fail', 'clear'))
  await page.locator('.training-summary-title .btn').click()
  await page.locator('.training-modal .btn--primary').click()
  await expect(page.locator('.training-error')).toBeVisible()
  await expect(page.getByRole('alertdialog')).toBeVisible()
  expect(await trainingSave(page)).toBe(placed)
  await page.evaluate(() => sessionStorage.removeItem('training-test-fail'))
  await page.locator('.training-modal .btn--primary').click()
  await expect(page.locator('.home')).toBeVisible()
  expect(await trainingSave(page)).toBeNull()
  expect(await mainSave(page)).toBe(before)
})

test('training FAQ is directly linked and localized without changing saves', async ({ page }, testInfo) => {
  const de = testInfo.project.name === 'iphone-16'
  await page.goto('/#about/training')
  const before = await mainSave(page)
  await expect(page.locator('#help-training')).toHaveAttribute('open', '')
  await expect(page.locator('#help-training summary')).toContainText(de ? 'Wie funktioniert Kontinenttraining?' : 'How does Continent Training work?')
  await expect(page.locator('#help-training .help-answer p')).toHaveCount(3)
  await expect(page.locator('#help-training')).toContainText(de ? 'separaten lokalen Speicher' : 'separate local storage')
  expect(await mainSave(page)).toBe(before)
  expect(await trainingSave(page)).toBeNull()
})

test('training leaves an in-progress Daily Tour and its rewards untouched', async ({ page }) => {
  const now = Date.UTC(2026, 9, 31, 12)
  const state = startDailyTour(createInitialState(DEFAULT_CONFIG, now), now)
  await page.addInitScript(state => localStorage.setItem('terradeck:save:v1', JSON.stringify(state)), state)
  await page.goto('/')
  const before = await mainSave(page)
  await page.locator('.training-home').click()
  await page.locator('.training-continent').filter({ hasText: /Europe|Europa/ }).click()
  await page.locator('.training-country').filter({ hasText: /France|Frankreich/ }).click()
  await place(page, 'France')
  await page.locator('.screen-bar .atlas-back').click()
  expect(await mainSave(page)).toBe(before)
  await page.locator('.daily-panel > .btn--primary').click()
  await expect(page.locator('.daily-challenge')).toBeVisible()
  expect(await mainSave(page)).toBe(before)
  expect(JSON.parse((await trainingSave(page))!).session.placedIds).toEqual(['fr'])
})
