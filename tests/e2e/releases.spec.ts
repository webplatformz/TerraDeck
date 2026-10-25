import { test, expect } from '@playwright/test'
import { createInitialState, openPack } from '../../src/domain/challenge'
import { DEFAULT_CONFIG } from '../../src/domain/config'

for (const locale of ['en', 'de']) {
test(`release notes fit the ${locale} atlas and preserve active progress across navigation`, async ({ page }, info) => {
  const de = locale === 'de'
  const now = Date.UTC(2026, 9, 25, 12)
  await page.clock.install({ time: now })
  const state = openPack(createInitialState(DEFAULT_CONFIG, now), [{ id: 'fr', continent: 'europe', rarity: 'common' }], now, () => 0, DEFAULT_CONFIG)
  state.progress.fr = { ...state.progress.fr, stamps: 1, encounters: 1 }
  await page.addInitScript(({ state, de }) => {
    localStorage.setItem('terradeck:project-notice', '1')
    localStorage.setItem('terradeck:lang', de ? 'de' : 'en')
    if (!localStorage.getItem('terradeck:save:v1')) localStorage.setItem('terradeck:save:v1', JSON.stringify(state))
  }, { state, de })
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  const link = page.getByRole('link', { name: de ? 'v1.20261025 · Neuerungen' : 'v1.20261025 · Notes', exact: true })
  await expect(link).toBeVisible()
  expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  const saved = () => page.evaluate(() => localStorage.getItem('terradeck:save:v1'))
  const before = await saved()
  await link.click()
  await expect(page.getByRole('heading', { name: de ? "Was gibt's Neues?" : "What's new", exact: true })).toBeVisible()
  await expect(page.locator('.release-entry h2')).toHaveText(de ? 'TerraDeck geht an den Start' : 'TerraDeck goes live')
  await expect(page.locator('.release-version')).toHaveText('v1.20261025')
  await expect(page.locator('.release-entry li')).toHaveCount(5)
  await expect(page.locator('.release-entry li strong')).toHaveCount(5)
  for (const item of await page.locator('.release-entry li').all()) {
    expect(await item.textContent()).toMatch(/^[^:]+: \S/)
  }
  await expect(page.locator('.release-entry time')).toHaveAttribute('datetime', '2026-10-25')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(await saved()).toBe(before)
  await page.screenshot({ path: info.outputPath('release-notes.png'), fullPage: true })
  await page.locator('.release-notes .lang-select-input').selectOption(de ? 'en' : 'de')
  await expect(page.getByRole('heading', { name: de ? "What's new" : "Was gibt's Neues?", exact: true })).toBeVisible()
  await page.locator('.release-notes .lang-select-input').selectOption(locale)
  await page.reload()
  await expect(page.locator('.release-entry')).toBeVisible()
  expect(await saved()).toBe(before)
  await page.locator('.release-notes-bar .atlas-back').click()
  await expect(page.locator('.home')).toBeVisible()
  expect(await saved()).toBe(before)
  await page.goBack()
  await expect(page.locator('.release-entry')).toBeVisible()
  await page.locator('.release-notes > .btn').click()
  await expect(page.locator('.expedition')).toBeVisible()
  await expect(page.locator('.info-footer')).toHaveCount(0)
  expect(await saved()).toBe(before)
  await page.goto('/#daily')
  await expect(page.locator('.daily-challenge')).toBeVisible()
  await expect(page.locator('.info-footer')).toHaveCount(0)
  expect(errors).toEqual([])
})
}
