import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

const playable: string[] = JSON.parse(readFileSync('src/data/generated/playable-country-ids.json', 'utf8'))
const COUNTRIES: { id: string; mapName: string; continent: string }[] =
  JSON.parse(readFileSync('scripts/atlas/roster.json', 'utf8')).filter((country: { id: string }) => playable.includes(country.id))
const COUNTRY_BY_ID = Object.fromEntries(COUNTRIES.map(country => [country.id, country]))

const epoch = Date.UTC(2026, 9, 23, 12)

async function prepare(page: Page, de: boolean) {
  await page.clock.install({ time: epoch })
  await page.addInitScript(de => {
    localStorage.setItem('terradeck:project-notice', '1')
    localStorage.setItem('terradeck:lang', de ? 'de' : 'en')
  }, de)
  await page.goto('/?debug')
}

const dailyState = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('terradeck:save:v1')!))

async function playStop(page: Page, id: string) {
  const name = COUNTRY_BY_ID[id].mapName
  await expect(page.locator('.map-frame.is-interactive')).toBeVisible()
  const clickLand = async (lens: boolean) => {
    const shape = page.locator(`${lens ? '.map-lens' : '.map-svg > g:first-of-type'} path[data-name="${name}"]`).first()
    await expect(shape).toBeAttached()
    const point = await shape.evaluate(el => {
      const rect = el.getBoundingClientRect()
      const points: { x: number; y: number }[] = []
      const step = rect.width < 20 || rect.height < 20 ? 1 : 4
      for (let y = Math.ceil(Math.max(0, rect.top)); y < Math.min(innerHeight, rect.bottom); y += step) {
        for (let x = Math.ceil(Math.max(0, rect.left)); x < Math.min(innerWidth, rect.right); x += step) {
          if (document.elementFromPoint(x, y) === el && document.elementFromPoint(x + 0.5, y + 0.5) === el) points.push({ x, y })
        }
      }
      if (!points.length) throw new Error('No visible map point for ' + el.getAttribute('data-name'))
      return points[Math.floor(points.length / 2)]
    })
    await page.mouse.click(point.x, point.y)
  }
  await clickLand(false)
  await expect.poll(async () => await page.locator('.map-lens, .map-land.is-selected').count()).toBeGreaterThan(0)
  if (await page.locator('.map-lens').count()) await clickLand(true)
  await expect(page.locator('.map-land.is-selected').first()).toHaveAttribute('data-name', name)
  await expect(page.locator('.sheet .btn--primary')).toBeEnabled()
  await page.locator('.sheet .btn--primary').click()
  await expect(page.locator('.tour-feedback')).toBeVisible()
  await page.locator('.sheet .btn--primary').click()
  await expect(page.locator('.tour-feedback')).toHaveCount(0)
}

test('daily tour resumes, rewards once and shares a numbered spoiler-free result', async ({ page }, info) => {
  test.setTimeout(45000)
  const de = info.project.name === 'iphone-16'
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: async () => { throw new DOMException('Cancelled', 'AbortError') } })
  })
  await prepare(page, de)
  await expect(page.locator('.daily-panel .tour-beta')).toHaveText('Beta')
  await expect(page.locator('.daily-panel')).not.toContainText(/UTC|remaining|noch|Previous results|Frühere Ergebnisse/)
  await page.locator('.daily-panel > .btn--primary').click()
  await expect(page.locator('.daily-challenge')).toBeVisible()
  await expect(page.locator('.daily-challenge')).not.toContainText('UTC')
  await expect.poll(() => page.locator('.challenge-title .prompt-flag').evaluate(el => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  const before = await dailyState(page)
  const run = Object.values(before.dailyTours.records)[0] as { id: string; assignment: { countryIds: string[] } }
  const targets = run.assignment.countryIds
  await playStop(page, targets[0])
  await page.reload()
  await expect(page.locator('.daily-challenge')).toBeVisible()
  expect((Object.values((await dailyState(page)).dailyTours.records)[0] as { index: number }).index).toBe(1)
  for (const id of targets.slice(1)) await playStop(page, id)
  await expect(page.locator('.tour-summary')).toContainText(de ? '5/5 richtig' : '5/5 correct')
  const completed = await dailyState(page)
  for (const id of targets) expect(completed.progress[id].stamps).toBe(1)
  expect(completed.packs).toBe(before.packs)
  expect(completed.activeChallenge).toBeNull()
  expect(completed.achievements.encounters).toBe(0)
  const share = page.locator('.tour-share textarea')
  await expect(share).toHaveValue(/World Tour #1/)
  await expect(share).toHaveValue(/5\/5.*0 km/)
  const text = await share.inputValue()
  for (const id of targets) expect(text).not.toContain(COUNTRY_BY_ID[id].mapName)
  expect(text).toContain('https://webplatformz.github.io/TerraDeck/#daily')
  await page.getByRole('button', { name: de ? 'Ergebnis teilen' : 'Share result', exact: true }).click()
  await expect(page.locator('.tour-share [role="status"]')).toHaveCount(0)
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('clipboard denied') } } })
  })
  await page.getByRole('button', { name: de ? 'Ergebnis kopieren' : 'Copy result', exact: true }).click()
  await expect(page.locator('.tour-share [role="status"]')).toContainText(de ? 'Markiere' : 'Select')
  await page.reload()
  const reloaded = await dailyState(page)
  for (const id of targets) expect(reloaded.progress[id].stamps).toBe(1)
  await expect(page.locator('.tour-summary')).toContainText(de ? '5/5 richtig' : '5/5 correct')
  await page.setViewportSize({ width: de ? 393 : 1280, height: 568 })
  const topBack = page.locator('.tour-summary > .atlas-back')
  await expect(topBack).toBeInViewport()
  const bottomBack = page.locator('.tour-summary > .btn--ghost')
  await bottomBack.scrollIntoViewIfNeeded()
  await expect(bottomBack).toBeInViewport()
  expect(await page.locator('.tour-summary').evaluate(el => el.scrollTop)).toBeGreaterThan(0)
  await bottomBack.click()
  await expect(page.locator('.daily-panel')).toBeVisible()
  await expect(page.locator('.daily-panel')).not.toContainText(/Previous results|Frühere Ergebnisse/)
  await page.locator('.daily-panel > .btn--primary').click()
  await expect(topBack).toBeInViewport()
  await topBack.click()
  await expect(page.locator('.daily-panel')).toBeVisible()
})

test('random debug practice scores misses without changing collection or daily attempts', async ({ page }, info) => {
  test.setTimeout(45000)
  const de = info.project.name === 'iphone-16'
  await page.addInitScript(() => { Math.random = () => 0.42 })
  await prepare(page, de)
  const before = await dailyState(page)
  await page.getByRole('button', { name: de ? 'Neue zufällige Übungstour' : 'New random practice tour', exact: true }).click()
  await expect(page.locator('.daily-challenge')).toBeVisible()
  const practice = (await dailyState(page)).dailyTours.practice
  expect(new Set(practice.assignment.countryIds).size).toBe(5)
  const wrong = COUNTRIES.find(c => c.continent === practice.assignment.continent && c.id !== practice.assignment.countryIds[0])!
  await playStop(page, wrong.id)
  for (const id of practice.assignment.countryIds.slice(1)) await playStop(page, id)
  await expect(page.locator('.tour-summary')).toContainText(de ? '4/5 richtig' : '4/5 correct')
  await expect(page.locator('.tour-share')).toHaveCount(0)
  const after = await dailyState(page)
  expect(after.progress).toEqual(before.progress)
  expect(after.packs).toBe(before.packs)
  expect(after.achievements).toEqual(before.achievements)
  expect(Object.keys(after.dailyTours.records)).toHaveLength(0)
  expect(after.dailyTours.practice.totalKm).toBeGreaterThan(0)
})

test('unfinished daily tour expires at UTC midnight and a fresh numbered tour is available', async ({ page }, info) => {
  await prepare(page, info.project.name === 'iphone-16')
  await page.locator('.daily-panel > .btn--primary').click()
  await expect(page.locator('.daily-challenge')).toBeVisible()
  await page.clock.setSystemTime(Date.UTC(2026, 9, 24))
  await page.clock.runFor(1100)
  await expect(page.locator('.tour-summary')).toContainText(info.project.name === 'iphone-16' ? 'ist beendet' : 'has ended')
  const saved = await dailyState(page)
  expect((Object.values(saved.dailyTours.records)[0] as { status: string }).status).toBe('expired')
  await page.locator('.tour-summary > .btn--primary').click()
  await expect(page.locator('.daily-challenge')).toBeVisible()
  await expect(page.locator('.daily-challenge .eyebrow').first()).toContainText('#2')
})

test('perfect tours reveal newly collected cards once and retain rewards across reload', async ({ page }, info) => {
  test.setTimeout(45000)
  const de = info.project.name === 'iphone-16'
  await prepare(page, de)
  await page.evaluate(ids => {
    const key = 'terradeck:save:v1'
    const state = JSON.parse(localStorage.getItem(key)!)
    for (const id of ids) state.progress[id] = { stamps: 1, encounters: 1, unlockedAt: null }
    localStorage.setItem(key, JSON.stringify(state))
  }, playable)
  await page.reload()
  await page.locator('.daily-panel > .btn--primary').click()
  await expect(page.locator('.daily-challenge')).toBeVisible()
  const run = Object.values((await dailyState(page)).dailyTours.records)[0] as { assignment: { countryIds: string[] } }
  for (const id of run.assignment.countryIds) await playStop(page, id)
  for (let i = 0; i < 5; i++) {
    await expect(page.locator('.unlock')).toBeVisible()
    await page.locator('.unlock-actions .btn--primary').click()
    await expect.poll(async () => {
      const current = Object.values((await dailyState(page)).dailyTours.records)[0] as { pendingUnlockIds: string[] }
      return current.pendingUnlockIds.length
    }).toBe(4 - i)
  }
  await expect(page.locator('.unlock')).toHaveCount(0)
  await page.reload()
  await expect(page.locator('.unlock')).toHaveCount(0)
  const saved = await dailyState(page)
  for (const id of run.assignment.countryIds) expect(saved.progress[id].stamps).toBe(2)
})

test('shared daily link starts immediately and the header returns to the atlas', async ({ page }, info) => {
  await prepare(page, info.project.name === 'iphone-16')
  await expect(page.locator('.daily-panel .tour-beta')).toHaveText('Beta')
  await page.goto('/#daily')
  await expect(page.locator('.daily-challenge')).toBeVisible()
  await expect(page.locator('.tour-summary')).toHaveCount(0)
  await expect(page.locator('.challenge-title .prompt-flag')).toBeVisible()
  await page.locator('.screen-bar .atlas-back').click()
  await expect(page.locator('.daily-panel')).toBeVisible()
  await page.locator('.daily-panel > .btn--primary').click()
  await expect(page.locator('.daily-challenge')).toBeVisible()
  expect(Object.keys((await dailyState(page)).dailyTours.records)).toHaveLength(1)
})
