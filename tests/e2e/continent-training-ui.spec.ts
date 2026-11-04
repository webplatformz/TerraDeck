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
  await expect(page.locator('.screen-bar h1')).toHaveText(de ? 'Europa' : 'Europe')
  await expect(page.locator('.training-summary .eyebrow')).toHaveCount(0)
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
    expect(metrics[0].y).toBeCloseTo(metrics[1].y, 0)
    expect(metrics[1].x).toBeGreaterThan(metrics[0].x + metrics[0].width)
    expect(metrics[0].width).toBeLessThan(470)
    await expect(page.locator('.training-sheet')).toBeInViewport()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
})

for (const language of ['en', 'de']) {
  test(`compact ${language} header gives its reclaimed height only to the map`, async ({ page }, testInfo) => {
    await page.addInitScript(language => localStorage.setItem('terradeck:lang', language), language)
    await page.goto('/')
    await page.locator('.training-home').click()
    await expect(page.locator('.screen-bar-title')).toHaveText(language === 'de' ? 'Kontinenttraining' : 'Continent Training')
    await page.getByRole('button', { name: language === 'de' ? 'Europa' : 'Europe', exact: true }).click()
    await expect(page.locator('.training-map .map-svg')).toBeVisible()

    // Recorded before compacting the header: viewport, header, map and visible sheet heights.
    const baselines = testInfo.project.use.hasTouch
      ? [
          { width: 320, height: 568, header: 209, map: 169, sheet: 168 },
          { width: 393, height: 667, header: 209, map: 234.86, sheet: 201.14 },
          { width: 393, height: 852, header: 209, map: 329.73, sheet: 291.27 },
        ]
      : [
          { width: 768, height: 852, header: 215.02, map: 326.66, sheet: 288.33 },
          { width: 1280, height: 800, header: 215, map: 300, sheet: 263 },
        ]
    for (const baseline of baselines) {
      await page.setViewportSize({ width: baseline.width, height: baseline.height })
      const map = (await page.locator('.training-map').boundingBox())!
      const sheet = (await page.locator('.training-sheet').boundingBox())!
      const reclaimed = baseline.header - map.y
      expect(reclaimed).toBeGreaterThan(100)
      expect(Math.abs(map.height - baseline.map - reclaimed)).toBeLessThan(1)
      expect(Math.abs(sheet.height - baseline.sheet)).toBeLessThan(1)
      for (const selector of ['.screen-bar .atlas-back', '.training-cancel']) {
        const box = (await page.locator(selector).boundingBox())!
        expect(box.width).toBeGreaterThanOrEqual(44)
        expect(box.height).toBeGreaterThanOrEqual(44)
      }
      const metrics = await page.locator('.training-metric').evaluateAll(elements => elements.map(el => {
        const box = el.getBoundingClientRect()
        return { y: box.y, clipped: el.scrollWidth > el.clientWidth }
      }))
      expect(metrics[0].y).toEqual(metrics[1].y)
      expect(metrics.every(metric => !metric.clipped)).toBe(true)
      await expect(page.getByRole('progressbar', { name: language === 'de' ? 'Kontinentfortschritt' : 'Continent progress' })).toHaveAttribute('aria-valuenow', '0')
      await expect(page.getByRole('progressbar', { name: language === 'de' ? 'Entdeckerwissen' : 'Explorer knowledge' })).toHaveAttribute('aria-valuetext', language === 'de' ? '0 am Stück' : '0 in a row')
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    }

    await page.locator('.training-country').filter({ hasText: language === 'de' ? 'Frankreich' : 'France' }).click()
    await page.locator('.training-hint-toggle').click()
    await expect(page.locator('.training-hint .geographic-clue')).toBeVisible()
    await page.setViewportSize({ width: 320, height: 568 })
    await page.locator('.training-target > .btn').scrollIntoViewIfNeeded()
    await expect(page.locator('.training-target > .btn')).toBeInViewport()
    expect(Math.abs((await page.locator('.training-sheet').boundingBox())!.height - 168)).toBeLessThan(1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

test('direct training cancellation supports confirmation, keyboard dismissal and preserved back navigation', async ({ page }, testInfo) => {
  const de = testInfo.project.name === 'iphone-16'
  await page.goto('/')
  await page.locator('.training-home').click()
  await page.getByRole('button', { name: de ? 'Südamerika' : 'South America', exact: true }).click()
  await page.setViewportSize({ width: 320, height: 568 })
  await expect(page.locator('.screen-bar h1')).toHaveText(de ? 'Südamerika' : 'South America')
  await expect(page.locator('.training-options')).toHaveCount(0)
  const cancel = page.getByRole('button', { name: de ? 'Training abbrechen' : 'Cancel training', exact: true })
  const saved = await page.evaluate(key => localStorage.getItem(key), CONTINENT_TRAINING_STORAGE_KEY)
  await expect(cancel).toBeVisible()
  await cancel.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('alertdialog')).toBeVisible()
  await expect(page.locator('.training-modal .btn--ghost')).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(page.locator('.training-modal .btn--primary')).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.locator('.training-modal .btn--ghost')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  await expect(cancel).toBeFocused()
  expect(await page.evaluate(key => localStorage.getItem(key), CONTINENT_TRAINING_STORAGE_KEY)).toBe(saved)
  await cancel.click()
  await page.locator('.training-modal .btn--ghost').click()
  await expect(cancel).toBeFocused()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.locator('.screen-bar .atlas-back').click()
  await page.locator('.training-home').click()
  await expect(page.locator('.screen-bar h1')).toHaveText(de ? 'Südamerika' : 'South America')
  expect(await page.evaluate(key => localStorage.getItem(key), CONTINENT_TRAINING_STORAGE_KEY)).toBe(saved)
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

for (const correct of [true, false]) {
  test(`${correct ? 'correct' : 'wrong'} placement feedback never shifts the country picker`, async ({ page }, testInfo) => {
    const de = testInfo.project.name === 'iphone-16'
    await page.goto('/')
    await page.locator('.training-home').click()
    await page.getByRole('button', { name: de ? 'Europa' : 'Europe', exact: true }).click()
    await page.locator('.training-country').filter({ hasText: de ? 'Frankreich' : 'France' }).click()
    const mapName = correct ? 'France' : 'Germany'
    await page.locator(`.training-map path[data-name="${mapName}"]`).click()
    await page.clock.install()
    await page.locator('.training-target > .btn').click()

    const feedback = page.getByRole('status')
    await expect(feedback).toHaveClass(new RegExp(`training-feedback--${correct ? 'correct' : 'wrong'}`))
    await expect(feedback.locator('[aria-hidden="true"]')).toHaveText(correct ? '✓' : '↙')
    if (!correct) await expect(feedback).toContainText(de ? 'weiter südwestlich' : 'farther southwest')
    await expect(feedback).toHaveCSS('position', 'absolute')
    await expect(feedback.locator('.training-feedback-copy')).toHaveCSS('clip-path', 'inset(50%)')
    await expect(page.locator('.training-sheet .training-feedback')).toHaveCount(0)
    await expect(page.locator(`.training-map path[data-name="${mapName}"]`)).toHaveClass(new RegExp(`is-${correct ? 'correct' : 'wrong'}`))
    const picker = page.locator('.training-country-picker')
    const before = await picker.boundingBox()
    const mapBefore = await page.locator('.training-map').boundingBox()
    await page.clock.runFor(correct ? 1100 : 1800)
    await expect(feedback).toBeEmpty()
    expect(await picker.boundingBox()).toEqual(before)
    expect(await page.locator('.training-map').boundingBox()).toEqual(mapBefore)
  })
}

test('wrong feedback fades back to the previous country color without changing its lifetime', async ({ page }) => {
  await page.addInitScript(key => localStorage.setItem(key, JSON.stringify({
    version: 1, session: { continent: 'europe', placedIds: ['de'], streak: 1 },
  })), CONTINENT_TRAINING_STORAGE_KEY)
  await page.goto('/')
  await page.locator('.training-home').click()
  await page.locator('.training-country').filter({ hasText: /France|Frankreich/ }).click()
  await page.locator('.training-map path[data-name="Germany"]').click()
  await page.clock.install()
  await page.locator('.training-target > .btn').click()
  const badge = page.locator('.training-feedback--wrong')
  const country = page.locator('.training-map path[data-name="Germany"]')
  await expect(badge).toHaveCSS('animation-duration', '1.8s')
  await expect(country).toHaveClass(/was-correct/)
  await expect(country).toHaveCSS('animation-duration', '1.8s')
  const red = await country.evaluate(el => getComputedStyle(el).fill)
  for (const locator of [badge, country]) {
    await locator.evaluate(el => {
      for (const animation of el.getAnimations()) {
        animation.pause()
        animation.currentTime = 1500
      }
    })
  }
  const opacity = Number(await badge.evaluate(el => getComputedStyle(el).opacity))
  expect(opacity).toBeGreaterThan(0)
  expect(opacity).toBeLessThan(1)
  expect(await country.evaluate(el => getComputedStyle(el).fill)).not.toBe(red)
  await country.evaluate(el => {
    for (const animation of el.getAnimations()) animation.currentTime = 1800
  })
  await expect(country).toHaveCSS('fill', 'rgb(79, 165, 143)')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(badge).toHaveCSS('animation-name', 'none')
  await expect(country).toHaveCSS('animation-name', 'none')
  await page.clock.runFor(1800)
  await expect(page.locator('.training-feedback')).toBeEmpty()
  await expect(country).toHaveClass(/is-correct/)
  await expect(country).not.toHaveClass(/is-wrong/)
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
  const reset = page.getByRole('button', { name: de ? 'Ganzen Kontinent anzeigen' : 'Show whole continent', exact: true })
  await expect(reset).toHaveAttribute('title', de ? 'Ganzen Kontinent anzeigen' : 'Show whole continent')
  await expect(reset).toHaveCSS('width', '44px')
  await expect(reset).toHaveCSS('height', '44px')
  await expect(reset).toHaveCSS('border-radius', '50%')
  await reset.click()
  await expect.poll(() => page.locator('.training-map .map-svg').evaluate(el =>
    (el as SVGSVGElement & { __zoom: { k: number; x: number; y: number } }).__zoom)).toEqual({ k: 1, x: 0, y: 0 })
  await expect(names).toHaveCount(0)
})
