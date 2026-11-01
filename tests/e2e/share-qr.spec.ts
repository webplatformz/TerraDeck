import { expect, test } from '@playwright/test'
import jsQR from 'jsqr'

for (const language of ['en', 'de']) {
  test(`Info QR with center logo decodes the exact public URL in ${language}`, async ({ page }) => {
    await page.addInitScript(language => {
      localStorage.setItem('terradeck:lang', language)
      localStorage.setItem('terradeck:project-notice', '1')
    }, language)
    const externalRequests: string[] = []
    page.on('request', request => {
      if (new URL(request.url()).origin !== 'http://127.0.0.1:5178') externalRequests.push(request.url())
    })
    await page.goto('/#about')
    const card = page.locator('.help-share')
    await expect(card).toBeVisible()
    await expect(card.locator('a')).toHaveAttribute('href', 'https://webplatformz.github.io/TerraDeck')
    await expect(page.locator('.help-title-row h1')).toHaveText(language === 'de' ? 'Spielanleitung & FAQ' : 'How to play & FAQ')
    await expect(card.locator('svg image')).toHaveAttribute('href', '/favicon.svg')
    const raster = await card.locator('svg').evaluate(async svg => {
      // Inline the actual bundled logo so the serialized SVG renders identically.
      const clone = svg.cloneNode(true) as SVGSVGElement
      const logo = clone.querySelector('image')!
      const response = await fetch(logo.getAttribute('href')!)
      if (!response.ok) throw new Error('Could not load QR logo')
      const blob = await response.blob()
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(blob)
      })
      logo.setAttribute('href', dataUrl)
      const rasterSize = 768
      clone.setAttribute('width', String(rasterSize))
      clone.setAttribute('height', String(rasterSize))
      const image = new Image()
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = rasterSize
      const context = canvas.getContext('2d')!
      context.drawImage(image, 0, 0, rasterSize, rasterSize)
      return Array.from(context.getImageData(0, 0, rasterSize, rasterSize).data)
    })
    expect(jsQR(new Uint8ClampedArray(raster), 768, 768)?.data).toBe('https://webplatformz.github.io/TerraDeck')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(externalRequests).toEqual([])
  })
}
