import { expect, test } from '@playwright/test'
import { loadWorld } from '../../src/data/world'
import { continentProjection, framingLand } from '../../src/map/projections'
import { createInitialState } from '../../src/domain/challenge'
import { DEFAULT_CONFIG } from '../../src/domain/config'
import { DAILY_EPOCH, UTC_DAY_MS, getDailyAssignment, startDailyTour } from '../../src/domain/dailyTour'

for (const mode of ['training', 'challenge', 'daily']) {
  test(`tapping inside Crimea selects Ukraine in ${mode}`, async ({ page }, testInfo) => {
    const de = testInfo.project.name === 'iphone-16'
    await page.addInitScript(de => {
      localStorage.setItem('terradeck:project-notice', '1')
      localStorage.setItem('terradeck:lang', de ? 'de' : 'en')
    }, de)
    if (mode === 'training') {
      await page.goto('/')
      await page.locator('.training-home').click()
      await page.getByRole('button', { name: de ? 'Europa' : 'Europe', exact: true }).click()
      await page.locator('.training-country').filter({ hasText: 'Ukraine' }).click()
    } else if (mode === 'daily') {
      const now = Array.from({ length: 60 }, (_, day) => DAILY_EPOCH + day * UTC_DAY_MS + UTC_DAY_MS / 2)
        .find(now => getDailyAssignment(now)?.countryIds[0] === 'ua')
      if (now === undefined) throw new Error('No scheduled Ukraine-first daily tour found')
      await page.clock.setFixedTime(now)
      const state = startDailyTour(createInitialState(DEFAULT_CONFIG, now), now)
      await page.addInitScript(state => localStorage.setItem('terradeck:save:v1', JSON.stringify(state)), state)
      await page.goto('/')
      await page.locator('.tour-ticket').click()
    } else {
      await page.goto('/?debug')
      await page.locator('.debug-pack-form input').fill('ua')
      await page.locator('.debug-pack-form button').evaluate(button => (button as HTMLButtonElement).click())
      await page.locator('.home-pack > .btn--primary').click()
      await page.locator('.expedition .btn--primary').click()
      await page.getByRole('button', { name: de ? "Los geht's" : 'Begin', exact: true }).click()
      await page.getByRole('button', { name: de ? 'Europa' : 'Europe', exact: true }).click()
      await page.locator('.sheet .btn--primary').click()
    }

    const svg = page.locator(`.${mode === 'training' ? 'training' : 'challenge'}-map .map-svg`)
    await expect(svg.locator('path[data-name="Ukraine"]')).toBeAttached()
    await expect(svg).toBeVisible()
    const box = (await svg.boundingBox())!
    const world = await loadWorld()
    const projection = continentProjection('europe').fitExtent(
      [[12, 12], [box.width - 12, box.height - 12]],
      framingLand('europe', world.features),
    )
    const [x, y] = projection([34.1, 44.95])!
    const point = { x: box.x + x, y: box.y + y }
    expect(await page.evaluate(({ x, y }) =>
      document.elementsFromPoint(x, y).find(el => el.matches('path[data-map-land]'))?.getAttribute('data-name'), point)).toBe('Ukraine')
    if (testInfo.project.use.hasTouch) await page.touchscreen.tap(point.x, point.y)
    else await page.mouse.click(point.x, point.y)
    await expect(page.locator('.map-land.is-selected[data-name="Ukraine"]')).toBeAttached()
    await expect(page.locator('.map-land.is-selected[data-name="Russia"]')).toHaveCount(0)
    await page.locator(mode === 'training' ? '.training-target > .btn' : '.sheet .btn--primary').click()
    await expect(page.locator('.map-land[data-name="Ukraine"]')).toHaveClass(/is-correct/)
  })
}
