import { expect, test } from '@playwright/test'
import { createInitialState } from '../../src/domain/challenge'
import { DEFAULT_CONFIG } from '../../src/domain/config'
import { emptyAchievements } from '../../src/domain/achievements'

test('Silver introductions and Explorer flips respect mastery and fit on phones', async ({ page }, testInfo) => {
  const de = testInfo.project.name === 'iphone-16'
  const initial = {
    ...createInitialState(DEFAULT_CONFIG),
    achievements: emptyAchievements(),
    progress: {
      fr: { stamps: 1, encounters: 1, unlockedAt: null },
      jp: { stamps: 2, encounters: 2, unlockedAt: 100 },
      mg: { stamps: 2, encounters: 2, unlockedAt: 100 },
      li: { stamps: 1, encounters: 1, unlockedAt: null },
    },
  }
  await page.addInitScript(({ initial, de }) => {
    localStorage.setItem('terradeck:project-notice', '1')
    localStorage.setItem('terradeck:lang', de ? 'de' : 'en')
    if (!localStorage.getItem('terradeck:save:v1')) localStorage.setItem('terradeck:save:v1', JSON.stringify(initial))
  }, { initial, de })
  await page.goto('/?debug#collection')
  await page.locator('.card-grid .card-button').nth(1).click()
  await expect(page.locator('.country-notes')).toHaveCount(0)
  await page.getByRole('button', { name: de ? 'Schließen' : 'Close', exact: true }).click()
  await page.locator('.card-grid .card-button').filter({ hasText: de ? 'Frankreich' : 'France' }).first().click()
  const visitor = page.locator('.card--visitor')
  await expect(visitor).toContainText('Paris')
  await expect(visitor.locator('.card-number')).toHaveText('FR')
  await expect(visitor.locator('.card-window .card-flag')).toBeVisible()
  await expect(visitor.locator('.country-shape')).toHaveCount(0)
  await expect(visitor.locator('.card-name')).toHaveText(de ? 'Frankreich' : 'France')
  await expect(visitor.locator('.card-continent')).toHaveText(de ? 'Europa' : 'Europe')
  await expect(visitor.locator('.card-facts > div')).toHaveCount(3)
  await expect(visitor.locator('.card-fact')).toContainText(de ? 'einmal' : 'once more')
  await expect(visitor.locator('.card-stamps .stamp-stage.is-earned')).toHaveCount(1)
  await expect(visitor.locator('.card-stamps .stamp--empty')).toHaveCount(1)
  expect(await visitor.evaluate(el => {
    const inner = el.querySelector('.card-inner')!
    const footer = el.querySelector('.card-stamps')!
    return inner.scrollHeight <= inner.clientHeight + 1
      && footer.getBoundingClientRect().bottom <= el.getBoundingClientRect().bottom
  })).toBe(true)
  await expect(page.locator('.country-notes-fact')).toHaveCount(0)
  await expect(page.getByRole('button', { name: de ? 'Entdecker-Notizen ↻' : 'Field notes ↻', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: de ? 'Schließen' : 'Close', exact: true }).click()
  await page.locator('.card-grid .card-button').filter({ hasText: 'Japan' }).first().click()
  const flip = page.getByRole('button', { name: de ? 'Entdecker-Notizen ↻' : 'Field notes ↻', exact: true })
  await expect(page.locator('.modal .card-fact')).toContainText('705')
  const frontSize = await page.locator('.modal .card').boundingBox()
  await flip.click()
  const backSize = await page.locator('.modal .card').boundingBox()
  expect(backSize!.width).toBeCloseTo(frontSize!.width, 1)
  expect(backSize!.height).toBeCloseTo(frontSize!.height, 1)
  await expect(page.locator('.country-notes')).toContainText('JPY')
  await expect(page.locator('.country-notes .card-stamps')).toHaveCount(0)
  await expect(page.locator('.country-notes-fact').first()).toBeVisible()
  await expect(page.locator('.country-notes-fact--fun')).toContainText('Ōkunoshima')
  await expect(page.locator('.country-notes-fact').first()).toContainText('Kyoto')
  await expect(page.locator('.modal .card-number')).toHaveText('JP')
  await expect(page.locator('.country-notes-grid')).not.toContainText(de ? 'Hauptstadt' : 'Capital')
  expect(await page.locator('.country-notes').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
  await page.getByRole('button', { name: de ? 'Kartenvorderseite ↻' : 'Card front ↻', exact: true }).click()
  await expect(page.locator('.modal .card--front')).toBeVisible()
  await page.getByRole('button', { name: de ? 'Schließen' : 'Close', exact: true }).click()

  await page.locator('.card-grid .card-button').filter({ hasText: de ? 'Madagaskar' : 'Madagascar' }).first().click()
  const madagascarFront = await page.locator('.modal .card').boundingBox()
  await flip.click()
  const madagascarBack = await page.locator('.modal .card').boundingBox()
  expect(madagascarBack!.width).toBeCloseTo(madagascarFront!.width, 1)
  expect(madagascarBack!.height).toBeCloseTo(madagascarFront!.height, 1)
  await expect(page.locator('.country-notes .card-number')).toHaveText('MG')
  await expect(page.locator('.country-notes-grid > div')).toHaveCount(2)
  await expect(page.locator('.country-notes-fact')).toHaveCount(2)
  await expect(page.locator('.country-notes-fact').first()).toContainText('Tsingy de Bemaraha')
  await expect(page.locator('.country-notes-fact--fun')).toContainText(de ? 'Mutter des Waldes' : 'mother of the forest')
  await expect(page.locator('.country-notes')).not.toContainText(de ? 'Geografie' : 'Geography')
  await expect(page.locator('.country-notes .card-stamps')).toHaveCount(0)
  await page.getByRole('button', { name: de ? 'Schließen' : 'Close', exact: true }).click()

  await page.goto('/?debug')
  await page.locator('.debug-pack-form input').fill('fr')
  await page.locator('.debug-pack-form button').click()
  await page.locator('.home-pack > .btn--primary').click()
  await page.locator('.expedition .btn--primary').click()
  await page.locator('.orders .btn--primary').click()
  await page.getByRole('button', { name: de ? 'Europa' : 'Europe', exact: true }).click()
  await page.locator('.sheet .btn--primary').click()
  await page.locator('.challenge-map path[data-name="France"]').click()
  await page.locator('.sheet .btn--primary').click()
  await page.locator('.sheet .btn--primary').click()
  await expect(page.locator('.unlock.is-flipped')).toBeVisible()
  await flip.click()
  await expect(page.locator('.unlock .country-notes-fact')).toHaveCount(2)
  await expect(page.locator('.unlock .country-notes')).toContainText('EUR')
  await page.getByRole('button', { name: de ? 'Weiter' : 'Continue', exact: true }).click()
  await expect(page.locator('.home-pack')).toBeVisible()
})
