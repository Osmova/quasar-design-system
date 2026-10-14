import { expect, type Locator, type Page } from '@playwright/test'

export const native = (id: string) => `[data-native="${id}"]`
export const byHook = (id: string) => `[data-test="${id}"]`

// Browser-composited sRGB, independent of the source generation implementation.
// Resolve modern CSS color formats with Canvas, then source-over every ancestor.
export async function paint(locator: Locator) {
  return locator.evaluate(element => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    function rgba(color: string) {
      ctx.clearRect(0, 0, 1, 1)
      ctx.fillStyle = color
      ctx.fillRect(0, 0, 1, 1)
      const data = ctx.getImageData(0, 0, 1, 1).data
      return [data[0], data[1], data[2], data[3] / 255]
    }
    function over(front: number[], back: number[]) {
      const alpha = front[3] + back[3] * (1 - front[3])
      return [0, 1, 2].map(i => alpha ? (front[i] * front[3] + back[i] * back[3] * (1 - front[3])) / alpha : 0).concat(alpha)
    }
    const chain: Element[] = []
    for (let node: Element | null = element; node; node = node.parentElement) chain.unshift(node)
    let bg = [255, 255, 255, 1]
    let surrounding = bg
    for (const node of chain) {
      if (node === element) surrounding = bg
      bg = over(rgba(getComputedStyle(node).backgroundColor), bg)
    }
    const style = getComputedStyle(element)
    const foreground = over(rgba(style.color), bg)
    const luminance = (color: number[]) => color.slice(0, 3).reduce((sum, channel, index) => {
      const n = channel / 255
      const linear = n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4
      return sum + linear * [0.2126, 0.7152, 0.0722][index]
    }, 0)
    const ratio = (first: number[], second: number[]) => {
      const a = luminance(first), b = luminance(second)
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
    }
    const focusSurface = parseFloat(style.outlineOffset) < 0 ? bg : surrounding
    const outline = over(rgba(style.outlineColor), focusSurface)
    const shadowColor = style.boxShadow.match(/^(rgba?\([^)]*\)|color\([^)]*\)|[a-z]+)/i)?.[1]
    const shadowLengths = style.boxShadow.match(/-?[\d.]+px/g)?.map(parseFloat) ?? []
    const outerBand = style.boxShadow !== 'none' && !style.boxShadow.includes('inset') && shadowLengths[3] > 0
    const outerColor = outerBand && shadowColor ? over(rgba(shadowColor), surrounding) : over(rgba(style.outlineColor), surrounding)
    const borders = [style, getComputedStyle(element, '::before'), getComputedStyle(element, '::after')]
      .flatMap(s => ['top', 'right', 'bottom', 'left'].map(side => ({
        width: parseFloat(s.getPropertyValue(`border-${side}-width`)),
        contrast: ratio(over(rgba(s.getPropertyValue(`border-${side}-color`)), bg), bg),
      }))).filter(border => border.width > 0)
    const box = element.getBoundingClientRect()
    return {
      background: bg.slice(0, 3).map(Math.round), color: foreground.slice(0, 3).map(Math.round),
      textContrast: ratio(foreground, bg), focusContrast: ratio(outline, focusSurface),
      focusInsideContrast: ratio(over(rgba(style.outlineColor), bg), bg),
      focusOutsideContrast: ratio(outerColor, surrounding), outerBand,
      borderContrast: Math.max(0, ...borders.map(border => border.contrast)),
      outlineStyle: style.outlineStyle, outlineWidth: parseFloat(style.outlineWidth),
      backgroundImage: style.backgroundImage, backdropFilter: style.backdropFilter,
      transform: style.textTransform, weight: style.fontWeight,
      width: box.width, height: box.height, overflow: element.scrollWidth - element.clientWidth,
    }
  })
}

export async function focusBoundaryContrast(locator: Locator) {
  const rendered = await paint(locator)
  return { inside: rendered.focusInsideContrast, outside: rendered.focusOutsideContrast, outerBand: rendered.outerBand, outlineWidth: rendered.outlineWidth, text: rendered.textContrast }
}

export async function assertParts(page: Page, parts: readonly string[], label: string) {
  for (const selector of parts) {
    const part = page.locator(selector).first()
    await expect(part, `${label}: native ${selector}`).toBeAttached()
    // Hidden native controls and disabled/inert nodes are intentionally present;
    // interactive visual subelements must also have a real layout box.
    if (await part.isVisible()) {
      const box = await part.boundingBox()
      expect(box!.width, `${label}: ${selector} width`).toBeGreaterThan(0)
      expect(box!.height, `${label}: ${selector} height`).toBeGreaterThan(0)
      const enabledText = await part.evaluate(element => {
        const text = element.matches('input, textarea') ? (element as HTMLInputElement).value : element.textContent?.trim()
        return Boolean(text && element.matches('.q-item__label, .q-field__label, .q-field__messages, .q-field__counter, .q-stepper__title, .q-stepper__caption, .q-message-text-content, .q-message-stamp, .q-timeline__title, .q-timeline__subtitle, .q-toolbar__title, th, td, input, textarea') && !element.closest('.disabled, [disabled], [aria-disabled="true"], .q-tree__node--disabled, .q-stepper__tab--disabled'))
      })
      if (enabledText) {
        const size = await part.evaluate(element => parseFloat(getComputedStyle(element).fontSize))
        expect((await paint(part)).textContrast, `${label}: ${selector} enabled text contrast`).toBeGreaterThanOrEqual(size >= 24 ? 3 : 4.5)
      }
    }
    await expect(part.locator('[class*="material-icons"], [class*="material-symbols"]'), `${label}: Phosphor only`).toHaveCount(0)
  }
}

export async function assertNoPageOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 'viewport has no horizontal overflow').toBeLessThanOrEqual(1)
}

export async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all(document.getAnimations().filter(animation => {
      const end = Number(animation.effect?.getComputedTiming().endTime)
      return Number.isFinite(end) && end <= 1000
    }).map(animation => animation.finished.catch(() => undefined)))
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  })
}

export async function mediaFixtures(page: Page) {
  // Same native QImg states as the existing media gate: stalled and failed fetches.
  await page.route('**/qds-media-loading.svg', () => new Promise<void>(resolve => { page.once('close', () => resolve()) }))
  await page.route('**/qds-media-error.svg', route => route.abort('failed'))
}
