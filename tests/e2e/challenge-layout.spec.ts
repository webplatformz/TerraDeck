import { expect, test, type Page } from '@playwright/test'

async function expectUsableMap(page: Page, step: 'continent' | 'country') {
  const viewport = page.viewportSize()!
  const challengeWidth = Math.min(viewport.width, 1400)
  const svg = page.locator('.challenge-map .map-svg')
  await expect(svg).toBeVisible()
  await expect.poll(async () => svg.evaluate(el => {
    const frame = el.parentElement!
    const challenge = frame.closest('.challenge')!
    const frameWidth = innerWidth >= 900 ? challenge.clientWidth - 380 - 20 : challenge.clientWidth - 24
    const bounds = el.getBoundingClientRect()
    return {
      fillsWidth: Math.abs(frame.getBoundingClientRect().width - frameWidth) <= 1,
      svgFillsWidth: Math.abs(bounds.width - (frameWidth - 2)) <= 1,
      fillsHeight: Math.abs(bounds.height - frame.clientHeight) <= 1,
      usableHeight: bounds.height >= 100,
    }
  })).toEqual({
    fillsWidth: true,
    svgFillsWidth: true,
    fillsHeight: true,
    usableHeight: true,
  })
  await expect.poll(() => page.locator('.challenge').evaluate(el => el.getBoundingClientRect().width))
    .toBe(challengeWidth)
  const shapes = svg.locator(step === 'continent' ? '.map-continent' : 'path[data-name="France"]')
  await expect(shapes.first()).toBeVisible()
  await expect.poll(() => shapes.first().evaluate(el => {
    const bounds = (el as SVGGraphicsElement).getBBox()
    return bounds.width > 20 && bounds.height > 20
  })).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
}

async function openChallenge(page: Page) {
  await page.goto('/?debug')
  await page.locator('.debug-pack-form input').fill('fr')
  await page.locator('.debug-pack-form button').click()
  await expect(page.locator('.debug-pack-controls [role="status"]')).toContainText('Fran')
  await page.locator('.home-pack > .btn--primary').click()
  await page.locator('.expedition .btn--primary').click()
  await page.locator('.orders .btn--primary').click()
}

async function resumeChallenge(page: Page) {
  await page.reload()
  await page.locator('.home-pack > .btn--primary').click()
}

test('pack, continent, country and result work without resizing, including reload and resume', async ({ page }, testInfo) => {
  const language = testInfo.project.name === 'iphone-16' ? 'de' : 'en'
  await page.addInitScript(language => {
    localStorage.setItem('terradeck:project-notice', '1')
    localStorage.setItem('terradeck:lang', language)
  }, language)

  await openChallenge(page)
  await expectUsableMap(page, 'continent')
  await resumeChallenge(page)
  await page.locator('.orders .btn--primary').click()
  await expectUsableMap(page, 'continent')
  await page.getByRole('button', { name: language === 'en' ? 'Europe' : 'Europa', exact: true }).click()
  await expect(page.locator('.challenge-map path[data-name="France"]')).toBeAttached()
  await expectUsableMap(page, 'country')

  await resumeChallenge(page)
  await expectUsableMap(page, 'country')
  const france = page.locator('.challenge-map path[data-name="France"]')
  if (testInfo.project.use.hasTouch) await france.tap()
  else await france.click()
  await expect(page.locator('.sheet .btn--primary')).toBeEnabled()
  await page.locator('.sheet .btn--primary').click()
  await expect(page.locator('.result-title--good')).toBeVisible()
  await expect(page.locator('.answer-comparison')).toHaveCount(0)
  await expectUsableMap(page, 'country')

  await page.locator('.sheet .btn--primary').click()
  await expect(page.locator('.home-pack')).toBeVisible()
  await openChallenge(page)
  await page.getByRole('button', { name: language === 'en' ? 'Europe' : 'Europa', exact: true }).click()
  const germany = page.locator('.challenge-map path[data-name="Germany"]')
  await expect(germany).toBeVisible()
  if (testInfo.project.use.hasTouch) await germany.tap()
  else await germany.click()
  await expect(page.locator('.answer-comparison')).toHaveCount(0)
  await page.locator('.sheet .btn--primary').click()
  await expect(page.locator('.answer-place--wrong')).toContainText(language === 'en' ? 'Germany' : 'Deutschland')
  await expect(page.locator('.answer-place--correct')).toContainText(language === 'en' ? 'France' : 'Frankreich')
  await expect(page.locator('.map-land.is-wrong[data-name="Germany"]')).toBeAttached()
  await expect(page.locator('.map-land.is-target[data-name="France"]')).toBeAttached()
  await expectUsableMap(page, 'country')
  await resumeChallenge(page)
  await expect(page.locator('.answer-comparison')).toBeVisible()
  for (const flag of await page.locator('.answer-comparison img').all()) {
    await expect.poll(() => flag.evaluate(el => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0)).toBe(true)
  }
})
