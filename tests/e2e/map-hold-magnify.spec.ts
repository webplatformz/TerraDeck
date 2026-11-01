import { expect, test, type Page } from '@playwright/test'

async function openFranceChallenge(page: Page, de: boolean) {
  await page.addInitScript(de => {
    localStorage.setItem('terradeck:project-notice', '1')
    localStorage.setItem('terradeck:lang', de ? 'de' : 'en')
  }, de)
  await page.goto('/?debug')
  await page.locator('.debug-pack-form input').fill('fr')
  await page.locator('.debug-pack-form button').evaluate(button => (button as HTMLButtonElement).click())
  await page.locator('.home-pack > .btn--primary').click()
  await page.locator('.expedition .btn--primary').click()
  await page.getByRole('button', { name: de ? "Los geht's" : 'Begin', exact: true }).click()
  await page.getByRole('button', { name: de ? 'Europa' : 'Europe', exact: true }).click()
  await page.locator('.sheet .btn--primary').click()
  await expect(page.locator('.challenge-map path[data-name="France"]')).toBeAttached({ timeout: 5000 })
}

async function visiblePoint(page: Page, selector: string) {
  return page.locator(selector).evaluateAll((elements, selector) => {
    for (const el of elements) {
      const bounds = (el as SVGGraphicsElement).getBoundingClientRect()
      const step = Math.min(bounds.width, bounds.height) < 20 ? 1 : 4
      for (let y = Math.ceil(Math.max(0, bounds.top)); y < Math.min(innerHeight, bounds.bottom); y += step) {
        for (let x = Math.ceil(Math.max(0, bounds.left)); x < Math.min(innerWidth, bounds.right); x += step) {
          if (document.elementFromPoint(x, y) === el && document.elementFromPoint(x + 0.5, y + 0.5) === el) return { x, y }
        }
      }
    }
    throw new Error(`No visible point in ${selector}`)
  }, selector)
}

async function excludedPoint(page: Page) {
  return page.locator('.challenge-map path[data-excluded="true"]').evaluateAll(elements => {
    for (const el of elements) {
      const bounds = (el as SVGGraphicsElement).getBoundingClientRect()
      for (let y = Math.ceil(Math.max(0, bounds.top)); y < Math.min(innerHeight, bounds.bottom); y += 1) {
        for (let x = Math.ceil(Math.max(0, bounds.left)); x < Math.min(innerWidth, bounds.right); x += 1) {
          if (document.elementFromPoint(x, y) === el) return { x, y }
        }
      }
    }
    throw new Error('No visible excluded-country point found')
  })
}

async function oceanPoint(page: Page) {
  return page.locator('.challenge-map .map-svg').evaluate(svg => {
    const bounds = svg.getBoundingClientRect()
    for (let y = bounds.top + 8; y < bounds.bottom - 8; y += 14) {
      for (let x = bounds.left + 8; x < bounds.right - 8; x += 14) {
        if (!document.elementsFromPoint(x, y).some(el => el.matches('path[data-map-land]'))) return { x, y }
      }
    }
    throw new Error('No visible ocean point found')
  })
}

async function holdAt(page: Page, point: { x: number; y: number }) {
  await page.mouse.move(point.x, point.y)
  await page.mouse.down()
  await expect(page.locator('.map-lens')).toBeVisible({ timeout: 1500 })
}

test('a normal tap selects without opening the magnifier; ocean and excluded holds preserve selection', async ({ page }, info) => {
  const de = info.project.name === 'iphone-16'
  await openFranceChallenge(page, de)
  const menuScope = await page.locator('.challenge-map .map-svg').evaluate(svg => {
    const mapEvent = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    const outsideEvent = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    svg.dispatchEvent(mapEvent)
    document.querySelector('.screen-bar')!.dispatchEvent(outsideEvent)
    return {
      mapPrevented: mapEvent.defaultPrevented,
      outsidePrevented: outsideEvent.defaultPrevented,
      mapUserSelect: getComputedStyle(svg).userSelect,
      bodyUserSelect: getComputedStyle(document.body).userSelect,
    }
  })
  expect(menuScope).toEqual({ mapPrevented: true, outsidePrevented: false, mapUserSelect: 'none', bodyUserSelect: 'auto' })
  const france = await visiblePoint(page, '.challenge-map path[data-name="France"]')
  await page.mouse.click(france.x, france.y)
  await expect(page.locator('.map-lens')).toHaveCount(0)
  await expect(page.locator('.challenge-map .map-land.is-selected')).toHaveAttribute('data-name', 'France')
  await expect(page.locator('.sheet .btn--primary')).toBeEnabled()

  const ocean = await oceanPoint(page)
  await holdAt(page, ocean)
  await page.mouse.up()
  await expect(page.locator('.challenge-map .map-land.is-selected')).toHaveAttribute('data-name', 'France')

  const excluded = await excludedPoint(page)
  await holdAt(page, excluded)
  await page.mouse.up()
  await expect(page.locator('.challenge-map .map-land.is-selected')).toHaveAttribute('data-name', 'France')
})

test('a hold magnifies above the finger, slides the crosshair target, then selects on release', async ({ page }, info) => {
  await openFranceChallenge(page, info.project.name === 'iphone-16')
  const frozenTime = new Date(Date.now() + 60_000)
  await page.clock.install({ time: frozenTime })
  await page.clock.pauseAt(frozenTime)
  const germany = await visiblePoint(page, '.challenge-map path[data-name="Germany"]')
  const france = await visiblePoint(page, '.challenge-map path[data-name="France"]')
  const svg = page.locator('.challenge-map .map-svg')
  const before = await svg.evaluate(el => (el as SVGSVGElement & { __zoom: { x: number; y: number; k: number } }).__zoom)
  await page.mouse.move(germany.x, germany.y)
  await page.mouse.down()
  await page.clock.runFor(449)
  await expect(page.locator('.map-lens')).toHaveCount(0)
  await page.clock.runFor(1)
  await expect(page.locator('.map-lens')).toBeVisible({ timeout: 1500 })
  const lensCenter = await page.locator('.map-lens-rim').evaluate(el => ({
    x: Number(el.getAttribute('cx')),
    y: Number(el.getAttribute('cy')),
  }))
  const svgBox = (await page.locator('.challenge-map .map-svg').boundingBox())!
  expect(svgBox.y + lensCenter.y).toBeLessThan(germany.y)
  await page.mouse.move(france.x, france.y, { steps: 4 })
  await expect(page.locator('.map-lens')).toBeVisible()
  await expect(svg.evaluate(el => (el as SVGSVGElement & { __zoom: { x: number; y: number; k: number } }).__zoom)).resolves.toEqual(before)
  await page.mouse.up()
  await expect(page.locator('.map-lens')).toHaveCount(0)
  await expect(page.locator('.challenge-map .map-land.is-selected')).toHaveAttribute('data-name', 'France')
  await expect(page.locator('.map-country-names text')).toHaveCount(0)
  await expect(page.locator('.sheet .btn--primary')).toBeEnabled()
})

test('pointer cancellation, lost capture, hidden page and map unmount clean up the hold', async ({ page }, info) => {
  await openFranceChallenge(page, info.project.name === 'iphone-16')
  const svg = page.locator('.challenge-map .map-svg')
  const startHold = async () => {
    const point = await visiblePoint(page, '.challenge-map path[data-name="France"]')
    await page.evaluate(() => {
      document.addEventListener('pointerdown', event => {
        ;(window as Window & { mapTestPointer?: number }).mapTestPointer = event.pointerId
      }, { once: true })
    })
    await page.mouse.move(point.x, point.y)
    await page.mouse.down()
    await expect(page.locator('.map-lens')).toBeVisible({ timeout: 1500 })
    return point
  }
  const dispatchPointer = async (type: 'pointercancel' | 'lostpointercapture', point: { x: number; y: number }) => {
    await page.evaluate(({ type, point }) => {
      const pointerId = (window as Window & { mapTestPointer?: number }).mapTestPointer ?? 1
      document.querySelector('.challenge-map .map-svg')!.dispatchEvent(new PointerEvent(type, {
        bubbles: true,
        pointerId,
        clientX: point.x,
        clientY: point.y,
      }))
    }, { type, point })
    await expect(page.locator('.map-lens')).toHaveCount(0)
    await page.mouse.up()
    await expect(page.locator('.challenge-map .map-land.is-selected')).toHaveCount(0)
  }

  await dispatchPointer('pointercancel', await startHold())
  await dispatchPointer('lostpointercapture', await startHold())

  await startHold()
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(page.locator('.map-lens')).toHaveCount(0)
  await page.mouse.up()
  await expect(page.locator('.challenge-map .map-land.is-selected')).toHaveCount(0)

  await page.evaluate(() => {
    Reflect.deleteProperty(document, 'visibilityState')
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await startHold()
  await page.setViewportSize({ width: 1100, height: 760 })
  await expect(page.locator('.map-lens')).toHaveCount(0)
  await page.mouse.up()
  await expect(page.locator('.challenge-map .map-land.is-selected')).toHaveCount(0)

  await startHold()
  await page.locator('.screen-bar .atlas-back').dispatchEvent('click')
  await page.mouse.up()
  await expect(svg).toHaveCount(0)
  await page.waitForTimeout(500)
})

test('pre-hold motion pans without selecting; blur cancels an active hold', async ({ page }, info) => {
  test.skip(info.project.use.hasTouch, 'Mouse drag and blur case')
  await openFranceChallenge(page, info.project.name === 'iphone-16')
  const svg = page.locator('.challenge-map .map-svg')
  await page.getByRole('button', { name: info.project.name === 'iphone-16' ? 'Hineinzoomen' : 'Zoom in', exact: true }).click()
  const before = await svg.evaluate(el => (el as SVGSVGElement & { __zoom: { x: number; y: number; k: number } }).__zoom)
  const france = await visiblePoint(page, '.challenge-map path[data-name="France"]')
  await page.mouse.move(france.x, france.y)
  await page.mouse.down()
  await page.mouse.move(france.x + 50, france.y + 35, { steps: 6 })
  await page.mouse.up()
  await expect.poll(() => svg.evaluate(el => (el as SVGSVGElement & { __zoom: { x: number; y: number; k: number } }).__zoom))
    .not.toEqual(before)
  await expect(page.locator('.challenge-map .map-land.is-selected')).toHaveCount(0)
  await expect(page.locator('.sheet .btn--primary')).toBeDisabled()

  const target = await visiblePoint(page, '.challenge-map path[data-name="France"]')
  await page.mouse.move(target.x, target.y)
  await page.mouse.down()
  await expect(page.locator('.map-lens')).toBeVisible({ timeout: 1500 })
  await page.evaluate(() => window.dispatchEvent(new Event('blur')))
  await expect(page.locator('.map-lens')).toHaveCount(0)
  await page.mouse.up()
  await expect(page.locator('.challenge-map .map-land.is-selected')).toHaveCount(0)
})

test('a second touch cancels the hold and leaves pinch zoom available', async ({ page }, info) => {
  test.skip(!info.project.use.hasTouch, 'Touch gesture case')
  await openFranceChallenge(page, true)
  const svg = page.locator('.challenge-map .map-svg')
  const point = await visiblePoint(page, '.challenge-map path[data-name="France"]')
  const session = await page.context().newCDPSession(page)
  const scale = () => svg.evaluate(el => (el as SVGSVGElement & { __zoom: { k: number } }).__zoom.k)
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: point.x, y: point.y, id: 0 }] })
  await expect(page.locator('.map-lens')).toBeVisible({ timeout: 1500 })
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: point.x - 20, y: point.y, id: 0 }, { x: point.x + 20, y: point.y, id: 1 }],
  })
  await expect(page.locator('.map-lens')).toHaveCount(0)
  for (const gap of [30, 42, 55]) {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: point.x - gap, y: point.y, id: 0 }, { x: point.x + gap, y: point.y, id: 1 }],
    })
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect.poll(scale).toBeGreaterThan(1)
  await expect(page.locator('.challenge-map .map-land.is-selected')).toHaveCount(0)
  await session.detach()
})
