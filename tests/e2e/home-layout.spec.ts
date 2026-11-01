import { expect, test } from '@playwright/test'
import { continentTrainingCountryIds, CONTINENT_TRAINING_STORAGE_KEY } from '../../src/domain/continentTraining'

test('home tiles follow the compact and wide-screen priority order', async ({ page }) => {
  const placedIds = continentTrainingCountryIds('europe').slice(0, 12)
  await page.addInitScript(() => {
    localStorage.setItem('terradeck:project-notice', '1')
    localStorage.setItem('terradeck:lang', 'en')
  })
  await page.addInitScript(({ key, placedIds }) => {
    localStorage.setItem(key, JSON.stringify({
      version: 1,
      session: { continent: 'europe', placedIds, streak: placedIds.length },
    }))
  }, { key: CONTINENT_TRAINING_STORAGE_KEY, placedIds })
  await page.goto('/')

  for (const width of [393, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    const positions = await page.evaluate(() => {
      const bounds = (selector: string) => {
        const rect = document.querySelector(selector)!.getBoundingClientRect()
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
      }
      return {
        pack: bounds('.home-pack'),
        tour: bounds('.daily-panel'),
        progress: bounds('.home-progress'),
        training: bounds('.training-home'),
        achievements: bounds('.link-achievements'),
        about: bounds('.link-about'),
      }
    })

    expect(positions.tour.y).toBeGreaterThanOrEqual(positions.pack.y)
    await expect(page.locator('.training-home-heading h2')).toHaveText('Europe Training')
    await expect(page.locator('.training-home-count')).toHaveText('12 / 37 countries')
    await expect(page.locator('.training-home-count strong')).toHaveCSS('font-size', '22.4px')
    await expect(page.locator('.training-home-hint')).toHaveText('Continue your training')
    await expect(page.locator('.training-home [role="progressbar"]')).toHaveAttribute('aria-valuenow', '12')
    if (width < 768) {
      expect(positions.tour.y).toBeGreaterThan(positions.pack.y + positions.pack.height - 1)
      expect(Math.abs(positions.progress.x - positions.training.x)).toBeLessThan(2)
      expect(positions.training.y).toBeGreaterThan(positions.progress.y)
      expect(Math.abs(positions.achievements.y - positions.about.y)).toBeLessThan(2)
      expect(positions.achievements.y).toBeGreaterThan(positions.training.y)
      expect(positions.achievements.x).toBeLessThan(positions.about.x)
    } else {
      expect(Math.abs(positions.pack.y - positions.tour.y)).toBeLessThan(2)
      expect(Math.abs(positions.progress.y - positions.training.y)).toBeLessThan(2)
      expect(positions.progress.y).toBeGreaterThan(positions.tour.y)
      expect(positions.progress.x).toBeLessThan(positions.training.x)
      expect(Math.abs(positions.achievements.y - positions.about.y)).toBeLessThan(2)
      expect(positions.achievements.y).toBeGreaterThan(positions.progress.y)
      expect(positions.achievements.x).toBeLessThan(positions.about.x)
      expect(Math.abs(positions.progress.height - positions.training.height)).toBeLessThan(1)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
})

test('training tile invites a new session without showing empty progress', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 900 })
  await page.addInitScript(() => {
    localStorage.setItem('terradeck:project-notice', '1')
    localStorage.setItem('terradeck:lang', 'en')
  })
  await page.goto('/')

  const tile = page.locator('.training-home')
  await expect(tile.locator('.training-home-heading h2')).toHaveText('Continent Training')
  await expect(tile.locator('.training-home-teaser')).toHaveText('See a continent come together.')
  await expect(tile.locator('.training-home-hint')).toHaveText('Choose a continent to begin.')
  await expect(tile.getByRole('progressbar')).toHaveCount(0)
  const [trainingHeight, progressHeight] = await Promise.all([
    tile.evaluate(element => element.getBoundingClientRect().height),
    page.locator('.home-progress').evaluate(element => element.getBoundingClientRect().height),
  ])
  expect(Math.abs(trainingHeight - progressHeight)).toBeLessThan(2)
})
