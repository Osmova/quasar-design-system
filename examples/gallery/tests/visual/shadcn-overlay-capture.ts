import { expect, type Locator, type Page, type TestInfo } from '@playwright/test'

export const croppedOverlays = new Set(['popup-proxy', 'popup-edit', 'dialog-bottom'])

// Native actionability scrolls only when necessary, so earlier focus restoration
// can leave different anchor positions/backgrounds visible through rounded corners.
export async function positionOverlayOpener(opener: Locator, block: ScrollLogicalPosition = 'center') {
  await opener.evaluate((element, block) => element.scrollIntoView({ block, inline: 'nearest', behavior: 'instant' }), block)
  await opener.page().evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
}

export async function restingOverlayClip(page: Page, selector: string) {
  // Moving the pointer does not blur the native autofocus input. Tooltip captures
  // intentionally retain their hover/focus and never call this helper.
  await page.mouse.move(0, 0)
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  const box = await page.locator(selector).boundingBox()
  expect(box, 'settled overlay has a native layout box').not.toBeNull()
  const viewport = page.viewportSize()!
  const x = Math.floor(box!.x), y = Math.floor(box!.y)
  const right = Math.ceil(box!.x + box!.width), bottom = Math.ceil(box!.y + box!.height)
  expect(x).toBeGreaterThanOrEqual(0)
  expect(y).toBeGreaterThanOrEqual(0)
  expect(right).toBeLessThanOrEqual(viewport.width)
  expect(bottom).toBeLessThanOrEqual(viewport.height)
  // Enclose every edge, never mask or trim it. Page clips avoid the locator's
  // document-coordinate rounding and automatic screenshot-time scrolling.
  return { x, y, width: right - x, height: bottom - y }
}

export async function recordOverlayBounds(page: Page, selector: string, name: string, info: TestInfo) {
  const bounds = await page.locator(selector).evaluate(element => ({
    rect: element.getBoundingClientRect().toJSON(),
    scroll: { x: scrollX, y: scrollY },
    card: element.querySelector('.q-card')?.getBoundingClientRect().toJSON(),
    focused: document.activeElement?.outerHTML,
    hovered: [...element.querySelectorAll(':hover')].map(node => node.className),
    animations: document.getAnimations().map(animation => {
      const owner = animation.effect instanceof KeyframeEffect ? animation.effect.target : null
      return owner instanceof Element ? { owner: owner.outerHTML.slice(0, 300), rect: owner.getBoundingClientRect().toJSON(), state: animation.playState } : null
    }),
    dpr: devicePixelRatio,
    cornerStack: document.elementsFromPoint(element.getBoundingClientRect().x + 1, element.getBoundingClientRect().bottom - 4).map(node => ({
      tag: node.tagName, classes: node.className, text: node.textContent?.trim().slice(0, 80), rect: node.getBoundingClientRect().toJSON(),
    })),
  }))
  await info.attach(`${name}-bounds`, { body: JSON.stringify(bounds, null, 2), contentType: 'application/json' })
}
