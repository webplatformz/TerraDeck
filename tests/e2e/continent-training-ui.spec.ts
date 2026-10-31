import { expect, test } from '@playwright/test'
import { continentTrainingCountryIds, CONTINENT_TRAINING_STORAGE_KEY } from '../../src/domain/continentTraining'
import { COUNTRY_BY_ID } from '../../src/data/countries'

test.beforeEach(async ({ page }, testInfo) => {
  await page.addInitScript(de => {
    localStorage.setItem('terradeck:project-notice', '1')
    localStorage.setItem('terradeck:lang', de ? 'de' : 'en')
  }, testInfo.project.name === 'iphone-16')
})

test('home navigation tiles share hover behavior without circular arrows', async ({ page }, testInfo) => {
  await page.goto('/')
  const tiles = page.locator('.home .interactive-tile')
  await expect(tiles).toHaveCount(4)
  for (const tile of await tiles.all()) {
    await expect(tile.locator('.action-circle')).toHaveCount(0)
    if (!testInfo.project.use.hasTouch) {
      await tile.hover()
      await expect.poll(() => tile.evaluate(el => getComputedStyle(el).transform)).toBe('matrix(1, 0, 0, 1, 0, -2)')
      await expect(tile).toHaveCSS('border-top-color', 'rgba(224, 187, 100, 0.55)')
    }
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('country selection has an accessible circular cancel and responsive progress panels', async ({ page }, testInfo) => {
  const de = testInfo.project.name === 'iphone-16'
  await page.goto('/')
  await page.locator('.training-home').click()
  await page.getByRole('button', { name: de ? 'Europa' : 'Europe', exact: true }).click()
  await expect(page.locator('.training-summary-title .action-circle')).toHaveCount(0)
  await expect(page.locator('.training-map .map-svg')).toBeVisible()
  await page.locator('.training-country').filter({ hasText: de ? 'Frankreich' : 'France' }).click()
  const cancel = page.getByRole('button', { name: de ? 'Anderes Land auswählen' : 'Choose a different country', exact: true })
  await expect(cancel).toHaveText('')
  await expect(cancel.locator('.action-circle')).toBeVisible()
  const heading = await page.locator('.training-target-heading').boundingBox()
  const control = await cancel.boundingBox()
  expect(control!.x + control!.width).toBeCloseTo(heading!.x + heading!.width, 0)
  expect(control!.width).toBeGreaterThanOrEqual(44)
  await page.locator('.training-map path[data-name="France"]').click()
  await expect(page.locator('.training-target > .btn')).toBeEnabled()
  await cancel.click()
  await expect(page.locator('.training-country-picker')).toBeVisible()
  await expect(page.locator('.training-map .is-picked')).toHaveCount(0)
  await page.locator('.training-country').filter({ hasText: de ? 'Frankreich' : 'France' }).click()
  await expect(page.locator('.training-target > .btn')).toBeDisabled()
  await page.locator('.training-map path[data-name="France"]').click()
  await page.locator('.training-target > .btn').click()
  await expect(page.locator('.training-metric--knowledge')).toHaveClass(/is-active/)
  expect(Number(await page.locator('.training-streak').getAttribute('aria-valuenow')))
    .toBeCloseTo(100 / Math.ceil(continentTrainingCountryIds('europe').length / 2))

  const widths = testInfo.project.use.hasTouch ? [393] : [768, 1280]
  for (const width of widths) {
    await page.setViewportSize({ width, height: 852 })
    const metrics = await page.locator('.training-metric').evaluateAll(elements => elements.map(el => {
      const box = el.getBoundingClientRect()
      return { x: box.x, y: box.y, width: box.width }
    }))
    if (width >= 640) {
      expect(metrics[0].y).toBeCloseTo(metrics[1].y, 0)
      expect(metrics[1].x).toBeGreaterThan(metrics[0].x + metrics[0].width)
      expect(metrics[0].width).toBeLessThan(470)
    } else {
      expect(metrics[1].y).toBeGreaterThan(metrics[0].y)
    }
    await expect(page.locator('.training-sheet')).toBeInViewport()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
})

test('selected-country panel is compact and centered only on wider screens', async ({ page }, testInfo) => {
  const de = testInfo.project.name === 'iphone-16'
  await page.goto('/')
  await page.locator('.training-home').click()
  await page.getByRole('button', { name: de ? 'Europa' : 'Europe', exact: true }).click()
  await page.locator('.training-country').filter({ hasText: de ? 'Frankreich' : 'France' }).click()
  await page.locator('.training-hint-toggle').click()
  await expect(page.locator('.training-hint .geographic-clue')).toBeVisible()

  for (const width of de ? [393] : [768, 1280]) {
    await page.setViewportSize({ width, height: 852 })
    await expect.poll(() => page.locator('.training-sheet--selected').evaluate(el => {
      const sheet = el.getBoundingClientRect()
      const training = el.closest('.continent-training')!.getBoundingClientRect()
      return Math.abs(sheet.x + sheet.width / 2 - training.x - training.width / 2)
    })).toBeLessThan(0.5)
    const sheet = (await page.locator('.training-sheet--selected').boundingBox())!
    const training = (await page.locator('.continent-training').boundingBox())!
    const center = sheet.x + sheet.width / 2
    if (width >= 640) {
      expect(sheet.width).toBeLessThanOrEqual(520)
      expect(center).toBeCloseTo(training.x + training.width / 2, 0)
      for (const selector of ['.training-target-heading > strong', '.training-hint-toggle', '.training-target > .btn']) {
        const box = (await page.locator(selector).boundingBox())!
        expect(box.x + box.width / 2).toBeCloseTo(center, 0)
      }
    } else {
      expect(sheet.width).toBeGreaterThan(width - 30)
      await expect(page.locator('.training-hint-toggle')).toHaveCSS('justify-self', 'start')
    }
    await expect(page.locator('.training-country-cancel')).toBeInViewport()
    await expect(page.locator('.training-target > .btn')).toBeInViewport()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
})

test('a full streak pulses, respects reduced motion and stops after a wrong guess', async ({ page }) => {
  const ids = continentTrainingCountryIds('europe')
  const placedIds = ids.slice(0, Math.ceil(ids.length / 2))
  await page.addInitScript(({ key, placedIds }) => {
    localStorage.setItem(key, JSON.stringify({
      version: 1,
      session: { continent: 'europe', placedIds, streak: placedIds.length },
    }))
  }, { key: CONTINENT_TRAINING_STORAGE_KEY, placedIds })
  await page.goto('/')
  await page.locator('.training-home').click()
  const fill = page.locator('.training-streak-fill')
  await expect(page.locator('.training-metric--knowledge')).toHaveClass(/is-full/)
  await expect(fill).toHaveCSS('animation-name', 'training-energy-pulse')
  await expect(fill).toHaveCSS('animation-duration', '1.2s')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(fill).toHaveCSS('animation-name', 'none')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.locator('.training-country').first().click()
  await page.locator(`.training-map path[data-name="${COUNTRY_BY_ID[placedIds[0]]!.mapName}"]`).click()
  await page.locator('.training-target > .btn').click()
  await expect(page.locator('.training-streak')).toHaveAttribute('aria-valuenow', '0')
  await expect(page.locator('.training-metric--knowledge')).not.toHaveClass(/is-active|is-full/)
  await expect(fill).toHaveCSS('animation-name', 'none')
  await expect(page.locator('.training-progress')).toHaveAttribute('aria-valuenow', String(placedIds.length))
})

test('training names appear automatically when zoomed, are localized and never label unplaced countries', async ({ page }, testInfo) => {
  const de = testInfo.project.name === 'iphone-16'
  const placedIds = ['fr', 'de', 'it', 'ch', 'es', 'gb', 'be', 'nl', 'at']
  await page.addInitScript(({ key, placedIds }) => {
    localStorage.setItem(key, JSON.stringify({
      version: 1, session: { continent: 'europe', placedIds, streak: 0 },
    }))
  }, { key: CONTINENT_TRAINING_STORAGE_KEY, placedIds })
  await page.goto('/')
  await page.locator('.training-home').click()
  const names = page.locator('.map-country-names text')
  await expect(page.locator('.map-names-toggle')).toHaveCount(0)
  await expect(names).toHaveCount(0)
  await page.locator('.training-country').filter({ hasText: de ? 'Norwegen' : 'Norway' }).click()
  await page.locator('.training-map path[data-name="Germany"]').click()
  await expect.poll(() => page.locator('.training-map .map-svg').evaluate(el =>
    (el as SVGSVGElement & { __zoom: { k: number } }).__zoom.k)).toBeCloseTo(1.5)
  await page.getByRole('button', { name: de ? 'Hineinzoomen' : 'Zoom in', exact: true }).click()
  await expect.poll(() => page.locator('.training-map .map-svg').evaluate(el =>
    (el as SVGSVGElement & { __zoom: { k: number } }).__zoom.k)).toBe(3)
  await expect(page.locator('text[data-country-name="Germany"]')).toHaveText(de ? 'Deutschland' : 'Germany')
  const allowed = placedIds.map(id => COUNTRY_BY_ID[id]!.mapName)
  const boxes = await names.evaluateAll(elements => elements.map(el => {
    const box = el.getBoundingClientRect()
    return { name: el.getAttribute('data-country-name'), pointerEvents: getComputedStyle(el).pointerEvents, left: box.left, right: box.right, top: box.top, bottom: box.bottom }
  }))
  for (let i = 0; i < boxes.length; i++) {
    expect(allowed).toContain(boxes[i].name)
    expect(boxes[i].pointerEvents).toBe('none')
    for (const other of boxes.slice(i + 1)) {
      const box = boxes[i]
      expect(box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top).toBe(false)
    }
  }
  await page.getByRole('button', { name: de ? 'Ansicht zurücksetzen' : 'Reset view', exact: true }).click()
  await expect(names).toHaveCount(0)
})
