import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

for (const locale of ['en', 'de']) {
  test(`privacy and licence downloads are readable in ${locale}`, async ({ page, request }) => {
    await page.addInitScript(locale => {
      localStorage.setItem('terradeck:lang', locale)
      localStorage.setItem('terradeck:project-notice', '1')
    }, locale)
    const externalRequests: string[] = []
    page.on('request', request => {
      if (new URL(request.url()).origin !== 'http://127.0.0.1:5178') externalRequests.push(request.url())
    })
    await page.goto('/#about/privacy')
    await expect(page.locator('#help-privacy')).toHaveAttribute('open', '')
    await expect(page.locator('#help-privacy')).toContainText(locale === 'de' ? 'USA' : 'United States')
    await expect(page.locator('#help-privacy')).toContainText(locale === 'de' ? 'kein privater Kanal' : 'not a private channel')
    await page.goto('/#about/sources')
    const notices = page.locator('#help-sources a[href$="third-party-notices.txt"]')
    const sources = page.locator('#help-sources a[href$="third-party-sources.tar"]')
    await expect(notices).toBeVisible()
    await expect(sources).toBeVisible()
    const response = await request.get((await notices.getAttribute('href'))!)
    expect(response.ok()).toBe(true)
    expect(await response.text()).toContain('SIL OPEN FONT LICENSE')
    const archive = await request.get((await sources.getAttribute('href'))!)
    expect(archive.ok()).toBe(true)
    expect(await archive.body()).toEqual(readFileSync(new URL('../../public/third-party-sources.tar', import.meta.url)))
    await page.goto('/#about/impressum')
    await expect(page.locator('#help-impressum')).toContainText('Ben Millo')
    await expect(page.locator('#help-impressum .help-draft')).toHaveCount(0)
    await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(externalRequests).toEqual([])
  })
}
