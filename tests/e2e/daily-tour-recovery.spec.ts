import { test, expect } from '@playwright/test'

const epoch = Date.UTC(2026, 9, 26, 12)
const key = 'terradeck:save:v1'
const base = {
  schemaVersion: 1, packs: 10, refillAt: null, recentIds: ['jp'],
  progress: { jp: { stamps: 1, encounters: 2, unlockedAt: null, discoveredAt: epoch - 100 } },
  activeChallenge: {
    countryId: 'jp', startedAt: epoch - 100, step: 'country',
    continentAnswer: 'asia', countryAnswer: null, outcome: null, unlocked: false,
  },
  achievements: {
    version: 1, encounters: 2, perfect: 1, visitors: 1, discovered: ['jp'],
    collected: [], stampedContinents: ['asia'], misses: {}, recovered: false,
    scenic: false, wrongContinent: false,
    earned: { 'first-visitor': { at: epoch - 100, target: 1, acknowledged: true } },
  },
}

test('a quarantined older-client assignment and its original title resume without losing rewards', async ({ page }, info) => {
  const de = info.project.name === 'iphone-16'
  const run = {
    id: 'daily:2026-10-26:v1:europe-01', practice: false, startedAt: epoch,
    index: 0, phase: 'answer', status: 'active', answers: [], correctCount: 0, totalKm: 0,
    rewards: { applied: false, stampedIds: [], unlockedIds: [] }, pendingUnlockIds: [],
    assignment: {
      version: 1, definitionId: 'europe-01', dayKey: '2026-10-26', number: 4,
      expiresAt: Date.UTC(2026, 9, 27), continent: 'europe',
      countryIds: ['no', 'de', 'fr', 'it', 'gr'],
      title: { en: 'Original route title', de: 'Ursprünglicher Tourtitel' },
    },
  }
  await page.clock.install({ time: epoch })
  await page.addInitScript(({ base, key, de, run }) => {
    localStorage.setItem('terradeck:project-notice', '1')
    localStorage.setItem('terradeck:lang', de ? 'de' : 'en')
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({
      ...base, dailyTours: { version: 1, records: {}, blocked: true,
        quarantined: { version: 1, records: { '2026-10-26': run } } },
    }))
  }, { base, key, de, run })
  await page.goto('/')
  await expect(page.locator('.tour-ticket-subtitle')).toContainText(de ? run.assignment.title.de : run.assignment.title.en)
  await expect(page.locator('[role="status"]').filter({ hasText: de ? 'wiederhergestellt' : 'was recovered' })).toBeVisible()
  await page.getByRole('button', { name: de ? 'Verstanden' : 'Understood', exact: true }).click()
  await page.locator('.daily-panel > .btn--primary').click()
  await expect(page.locator('.daily-challenge')).toBeVisible()
  await expect(page.locator('.sheet [role="status"]')).toHaveCount(0)
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key)
  expect(saved.dailyTours.records['2026-10-26']).toEqual(run)
  expect(saved.dailyTours.rewardBlockedThrough).toBeUndefined()
})

test('tour recovery is acknowledged once, keeps regular progress and survives UTC rollover', async ({ page }, info) => {
  const de = info.project.name === 'iphone-16'
  await page.clock.install({ time: epoch })
  await page.addInitScript(({ base, key, de }) => {
    localStorage.setItem('terradeck:project-notice', '1')
    localStorage.setItem('terradeck:lang', de ? 'de' : 'en')
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({
      ...base, dailyTours: { version: 1, records: {}, blocked: true,
        quarantined: { version: 1, records: { '2026-10-24': { corrupt: true } } } },
    }))
  }, { base, key, de })
  await page.goto('/')
  const notice = page.locator('[role="status"]').filter({ hasText: de ? 'Tourdaten wurden entfernt' : 'tour history was removed' })
  await expect(notice).toBeVisible()
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key)
  expect(saved.progress).toEqual(base.progress)
  expect(saved.activeChallenge).toEqual(base.activeChallenge)
  expect(saved.achievements.earned).toEqual(base.achievements.earned)
  expect(saved.dailyTours.rewardBlockedThrough).toBe('2026-10-26')
  await page.getByRole('button', { name: de ? 'Verstanden' : 'Understood', exact: true }).click()
  await expect(notice).toHaveCount(0)
  await page.reload()
  await expect(notice).toHaveCount(0)
  await page.locator('.tour-ticket').click()
  await expect(page.locator('.daily-challenge')).toBeVisible()
  await expect(page.locator('.sheet [role="status"]')).toContainText(de ? 'keine Stempel' : 'stamps are disabled')
  await page.clock.setSystemTime(Date.UTC(2026, 9, 27, 12))
  await page.clock.runFor(1100)
  await page.locator('.tour-summary > .btn--primary').click()
  await expect(page.locator('.daily-challenge')).toBeVisible()
  await expect(page.locator('.sheet [role="status"]')).toHaveCount(0)
  const after = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key)
  expect(after.activeChallenge).toEqual(base.activeChallenge)
  expect(after.packs).toBe(base.packs)
  expect(after.dailyTours.rewardBlockedThrough).toBe('2026-10-26')
})

test('newer data gives localized update feedback from both Home entry points and direct link', async ({ page }, info) => {
  const de = info.project.name === 'iphone-16'
  const future = { version: 99, records: { opaque: { futureRewards: true } } }
  await page.clock.install({ time: epoch })
  await page.addInitScript(({ base, key, de, future }) => {
    localStorage.setItem('terradeck:project-notice', '1')
    localStorage.setItem('terradeck:lang', de ? 'de' : 'en')
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ ...base, dailyTours: future }))
  }, { base, key, de, future })
  await page.goto('/')
  await expect(page.locator('.daily-panel [role="alert"]')).toContainText(de ? 'aktualisiere' : 'update')
  for (const selector of ['.tour-ticket', '.daily-panel > .btn--primary']) {
    await page.locator(selector).click()
    await expect(page.locator('.tour-summary [role="alert"]')).toContainText(de ? 'aktualisiere' : 'update')
    await page.locator('.tour-summary .atlas-back').click()
  }
  await page.goto('/#daily')
  await expect(page.locator('.tour-summary [role="alert"]')).toContainText(de ? 'erhalten' : 'kept')
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key)
  expect(saved.dailyTours.quarantined).toEqual(future)
  expect(saved.progress).toEqual(base.progress)
  expect(saved.activeChallenge).toEqual(base.activeChallenge)
  await page.reload()
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).dailyTours, key)).toEqual(saved.dailyTours)
})

test('a refused start after clock rollback explains the problem instead of silently doing nothing', async ({ page }, info) => {
  const de = info.project.name === 'iphone-16'
  await page.clock.install({ time: epoch })
  await page.addInitScript(({ base, key, de }) => {
    localStorage.setItem('terradeck:project-notice', '1')
    localStorage.setItem('terradeck:lang', de ? 'de' : 'en')
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(base))
  }, { base, key, de })
  await page.goto('/#daily')
  await expect(page.locator('.daily-challenge')).toBeVisible()
  await page.locator('.daily-challenge .atlas-back').click()
  await page.clock.setSystemTime(epoch - 86_400_000)
  await page.clock.runFor(1100)
  await page.locator('.daily-panel > .btn--primary').click()
  await expect(page.locator('.tour-summary [role="alert"]')).toContainText(de ? 'Gerätedatum' : 'device date')
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key)
  expect(Object.keys(saved.dailyTours.records)).toEqual(['2026-10-26'])
  expect(saved.activeChallenge).toEqual(base.activeChallenge)
})
