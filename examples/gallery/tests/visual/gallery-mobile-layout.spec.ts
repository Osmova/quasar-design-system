import { expect, test, type Locator } from '@playwright/test'
import { CANONICAL_VARIANTS, applyTheme, waitForThemePaint } from './helpers'

// Check nested boxes as well as scrollWidth: the gallery's ancestors can clip
// an oversized grid without widening the document.
async function boundedContents(root: Locator) {
  const measurements = await root.evaluate(element => {
    const host = element.getBoundingClientRect()
    const nodes = [element, ...element.querySelectorAll(
      '.variants-hero, .variants-hero h1, .variants-hero p, .variants-grid, .variant-card, .variant-card__controls, .variant-card__controls > *, .q-pagination__content, .q-pagination__middle, .q-pagination button',
    )]
    return nodes.map(node => {
      const box = node.getBoundingClientRect()
      const range = document.createRange()
      if (node.matches('h1, p, button')) range.selectNodeContents(node)
      const parent = (node.parentElement?.closest('.variant-card, .variants-hero') ?? element).getBoundingClientRect()
      return {
        label: node.getAttribute('data-test') ?? `${node.className} ${node.getAttribute('aria-label') ?? ''}`,
        width: box.width, left: box.left, right: box.right,
        hostLeft: host.left, hostRight: host.right,
        parentLeft: parent.left, parentRight: parent.right,
        overflow: node.scrollWidth - node.clientWidth,
        textRects: [...range.getClientRects()].map(rect => ({ left: rect.left, right: rect.right })),
      }
    })
  })
  for (const box of measurements) {
    expect(box.width, box.label).toBeGreaterThan(0)
    expect(box.left, box.label).toBeGreaterThanOrEqual(box.hostLeft - 1)
    expect(box.right, box.label).toBeLessThanOrEqual(box.hostRight + 1)
    expect(box.left, `${box.label} card/hero bounds`).toBeGreaterThanOrEqual(box.parentLeft - 1)
    expect(box.right, `${box.label} card/hero bounds`).toBeLessThanOrEqual(box.parentRight + 1)
    expect(box.overflow, box.label).toBeLessThanOrEqual(1)
    for (const rect of box.textRects) {
      expect(rect.left, `${box.label} text`).toBeGreaterThanOrEqual(box.left - 1)
      expect(rect.right, `${box.label} text`).toBeLessThanOrEqual(box.right + 1)
    }
  }
  const overlaps = await root.evaluate(element => [...element.querySelectorAll('.q-pagination')].flatMap(pagination => {
    const buttons = [...pagination.querySelectorAll('button')]
    return buttons.flatMap((button, i) => buttons.slice(i + 1).flatMap(other => {
      const a = button.getBoundingClientRect(), b = other.getBoundingClientRect()
      return Math.min(a.right, b.right) > Math.max(a.left, b.left)
        && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top)
        ? [`${button.getAttribute('aria-label')} overlaps ${other.getAttribute('aria-label')}`] : []
    }))
  }))
  expect(overlaps, 'native pagination controls must not overlap').toEqual([])
  return measurements
}

for (const variant of CANONICAL_VARIANTS) for (const mode of ['light', 'dark'] as const) {
  test(`gallery variants nested bounds ${variant}/${mode}`, async ({ page }, info) => {
    if (info.project.name === 'mobile') await page.setViewportSize({ width: 393, height: 851 })
    await page.goto('/#variants')
    await applyTheme(page, mode, variant)
    const section = page.locator('[data-test="qds-variants-section"]')
    await expect(section.locator('.variant-card')).toHaveCount(5)
    const initial = await boundedContents(section)
    const columns = await section.locator('.variants-grid').evaluate(e => getComputedStyle(e).gridTemplateColumns.split(' ').length)
    expect(columns).toBe(info.project.name === 'mobile' ? 1 : 2)
    for (const cardVariant of CANONICAL_VARIANTS) {
      const pagination = section.locator(`[data-test="qds-variant-card-${cardVariant}"] .q-pagination`)
      await expect(pagination.locator('[aria-current="page"]')).toHaveAttribute('aria-label', '3')
      await pagination.getByRole('button', { name: 'Next page', exact: true }).click()
      await expect(pagination.locator('[aria-current="page"]')).toHaveAttribute('aria-label', '4')
      await pagination.getByRole('button', { name: 'Last page', exact: true }).click()
      await expect(pagination.locator('[aria-current="page"]')).toHaveAttribute('aria-label', '128')
    }
    await waitForThemePaint(page)
    await boundedContents(section)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
    await info.attach('nested-bounds', { body: JSON.stringify(initial, null, 2), contentType: 'application/json' })
    if (variant === 'fluent' && mode === 'light') {
      await info.attach('variants-after', { body: await section.screenshot(), contentType: 'image/png' })
    }
  })

  test(`gallery font multiline geometry ${variant}/${mode}`, async ({ page }, info) => {
    if (info.project.name === 'mobile') await page.setViewportSize({ width: 393, height: 851 })
    await page.goto('/#fonts')
    await applyTheme(page, mode, variant)
    const samples = page.locator('.font-sample')
    await expect(samples).toHaveCount(3)
    const natural = await samples.evaluateAll(elements => elements.map(e => ({
      size: parseFloat(getComputedStyle(e).fontSize),
      line: parseFloat(getComputedStyle(e).lineHeight),
      height: e.getBoundingClientRect().height,
    })))
    for (const sample of natural) {
      expect(sample.size).toBe(24)
      expect(sample.line / sample.size).toBeCloseTo(1.4, 5)
      if (info.project.name === 'desktop') expect(sample.height).toBeCloseTo(sample.line, 1)
      else expect(sample.height).toBeGreaterThan(sample.line * 1.9)
    }
    if (variant === 'fluent' && mode === 'light') {
      await info.attach('fonts-after', { body: await page.locator('.q-tab-panel').screenshot(), contentType: 'image/png' })
    }
    // Exercise multiline faces even on desktop, without changing shipped markup.
    await samples.evaluateAll(elements => elements.forEach(e => { (e as HTMLElement).style.maxWidth = '260px' }))
    await waitForThemePaint(page)
    const multiline = await samples.evaluateAll(elements => elements.map(e => {
      const range = document.createRange()
      range.selectNodeContents(e)
      return {
        family: getComputedStyle(e).fontFamily,
        loaded: document.fonts.check(`24px ${getComputedStyle(e).fontFamily}`),
        height: e.getBoundingClientRect().height,
        line: parseFloat(getComputedStyle(e).lineHeight),
        rects: [...range.getClientRects()].map(r => ({ top: r.top, bottom: r.bottom })),
      }
    }))
    expect(multiline.map(s => s.family)).toEqual(['"Inter Variable", sans-serif', '"Open Sans Variable", sans-serif', 'Selawik, sans-serif'])
    for (const sample of multiline) {
      expect(sample.loaded, sample.family).toBe(true)
      expect(sample.rects.length, sample.family).toBeGreaterThan(1)
      expect(sample.height, sample.family).toBeCloseTo(sample.rects.length * sample.line, 1)
      for (let i = 1; i < sample.rects.length; i++) {
        expect(sample.rects[i].top, `${sample.family} no adjacent line overlap`).toBeGreaterThanOrEqual(sample.rects[i - 1].bottom)
        expect(sample.rects[i].top - sample.rects[i - 1].top).toBeCloseTo(sample.line, 1)
      }
    }
    await info.attach('font-geometry', { body: JSON.stringify({ natural, multiline }, null, 2), contentType: 'application/json' })
  })
}
