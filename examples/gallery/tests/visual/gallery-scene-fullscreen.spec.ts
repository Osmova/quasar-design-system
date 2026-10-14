import { expect, test } from '@playwright/test'
import { CANONICAL_VARIANTS, applyTheme, waitForThemePaint } from './helpers'

test.beforeEach(async ({ page }, info) => {
  await page.setViewportSize(info.project.name === 'mobile'
    ? { width: 393, height: 851 }
    : { width: 1440, height: 1000 })
})

for (const variant of CANONICAL_VARIANTS) for (const mode of ['light', 'dark'] as const) {
  test(`gallery table fullscreen covers viewport ${variant}/${mode}`, async ({ page }, info) => {
    await page.goto('/#components')
    await applyTheme(page, mode, variant)
    const table = page.locator('[data-test="qds-table-official-modes"]')
    await expect(table).toHaveCSS('margin-bottom', '16px')
    const parent = await table.evaluate(e => e.parentElement?.outerHTML.split('>')[0])
    await table.getByRole('button', { name: 'View table fullscreen', exact: true }).click()
    await expect(table).toHaveClass(/fullscreen/)
    await waitForThemePaint(page)
    const fullscreen = await table.evaluate(e => {
      const rect = e.getBoundingClientRect()
      return {
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        viewport: { x: 0, y: 0, width: innerWidth, height: innerHeight },
        marginBottom: getComputedStyle(e).marginBottom,
        position: getComputedStyle(e).position,
        bottomHits: [0.25, 0.5, 0.75].map(x => e.contains(document.elementFromPoint(innerWidth * x, innerHeight - 2))),
      }
    })
    await info.attach('fullscreen-measurements', { body: JSON.stringify(fullscreen, null, 2), contentType: 'application/json' })
    expect(fullscreen.rect).toEqual(fullscreen.viewport)
    expect(fullscreen.marginBottom).toBe('0px')
    expect(fullscreen.position).toBe('fixed')
    expect(fullscreen.bottomHits).toEqual([true, true, true])
    await expect(page.locator('body')).toHaveClass(/q-body--fullscreen-mixin/)
    await table.getByRole('button', { name: 'Exit table fullscreen', exact: true }).click()
    await expect(table).not.toHaveClass(/fullscreen/)
    await expect(table).toHaveCSS('margin-bottom', '16px')
    await expect(page.locator('body')).not.toHaveClass(/q-body--fullscreen-mixin/)
    expect(await table.evaluate(e => e.parentElement?.outerHTML.split('>')[0])).toBe(parent)
    await expect(page.locator('[data-test="qds-table-no-chrome"]')).toBeVisible()
  })
}

test('Fluent dark scenic reading surface is opaque with AA text contrast', async ({ page }, info) => {
  await page.goto('/#scenes')
  await applyTheme(page, 'dark', 'fluent')
  const frame = page.locator('[data-test="qds-scene-fluent"]')
  const paint = await frame.locator('.scene-panel').evaluate(card => {
    // Canvas normalizes browser CSS colors (including color-mix's color(srgb))
    // to sRGB channels and retains alpha instead of discarding the wallpaper.
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    const context = canvas.getContext('2d')!
    const channels = (color: string) => {
      context.clearRect(0, 0, 1, 1)
      context.fillStyle = color
      context.fillRect(0, 0, 1, 1)
      return [...context.getImageData(0, 0, 1, 1).data]
    }
    const luminance = (rgba: number[]) => {
      const linear = rgba.slice(0, 3).map(c => {
        const s = c / 255
        return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
      })
      return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722
    }
    const style = getComputedStyle(card)
    const background = channels(style.backgroundColor)
    const texts = [...card.querySelectorAll('.scene-panel__title, .scene-panel__copy, .scene-panel__eyebrow, .scene-metrics, .scene-metrics strong')].map(element => {
      const textStyle = getComputedStyle(element)
      const foreground = channels(textStyle.color)
      // Composite foreground alpha onto the proven opaque card, not an assumed
      // black/white backdrop. The alpha assertion below gates all ratios.
      const composited = foreground.slice(0, 3).map((c, i) => c * foreground[3] / 255 + background[i] * (1 - foreground[3] / 255))
      const a = luminance(composited), b = luminance(background)
      const ancestors = []
      for (let node: Element | null = element; node; node = node.parentElement) {
        const s = getComputedStyle(node)
        ancestors.push({ opacity: s.opacity, filter: s.filter, mixBlendMode: s.mixBlendMode })
        if (node === card) break
      }
      return {
        selector: element.className, color: textStyle.color,
        ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
        backgrounds: [element, element.parentElement!].filter(e => e !== card).map(e => ({ alpha: channels(getComputedStyle(e).backgroundColor)[3], image: getComputedStyle(e).backgroundImage })),
        ancestors,
      }
    })
    return { background: style.backgroundColor, alpha: background[3], image: style.backgroundImage, texts }
  })
  await info.attach('scene-paint', { body: JSON.stringify(paint, null, 2), contentType: 'application/json' })
  // A translucent surface cannot be certified without sampling the SVG,
  // gradients and backdrop at each glyph. Require the local opaque solution.
  expect(paint.alpha, 'wallpaper must not participate in card text contrast').toBe(255)
  expect(paint.image).toBe('none')
  expect(paint.texts).toHaveLength(6)
  for (const text of paint.texts) {
    for (const layer of text.backgrounds) expect(layer).toEqual({ alpha: 0, image: 'none' })
    for (const ancestor of text.ancestors) expect(ancestor).toEqual({ opacity: '1', filter: 'none', mixBlendMode: 'normal' })
    expect(text.ratio, text.selector).toBeGreaterThanOrEqual(4.5)
  }
  await info.attach('scene-after', { body: await frame.screenshot(), contentType: 'image/png' })
})
