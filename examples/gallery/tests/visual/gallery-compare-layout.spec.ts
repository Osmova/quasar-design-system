import { expect, test } from '@playwright/test'
import { CANONICAL_VARIANTS, applyTheme, waitForThemePaint } from './helpers'

test.use({ deviceScaleFactor: 1 })

for (const variant of CANONICAL_VARIANTS) for (const mode of ['light', 'dark'] as const) {
  test(`gallery Compare tabs bounds and labels ${variant}/${mode}`, async ({ page }, info) => {
    await page.setViewportSize(info.project.name === 'mobile'
      ? { width: 393, height: 851 } : { width: 1440, height: 1000 })
    await page.goto('/#compare')
    await applyTheme(page, mode, variant)
    await expect(page.locator('.compare--ready')).toBeVisible()
    await waitForThemePaint(page)
    const row = page.locator('[data-compare="tabs"]')
    // Vertical-only positioning cannot silently scroll a clipped last tab into view.
    await row.evaluate(element => window.scrollBy(0, element.getBoundingClientRect().top - 100))
    const bounds = await row.evaluate(element => {
      const box = (node: Element) => {
        const r = node.getBoundingClientRect()
        return { left: r.left, right: r.right, width: r.width }
      }
      return [...element.querySelectorAll('.compare__cell')].map(cell => ({
        cell: box(cell),
        list: box(cell.querySelector('fluent-tablist, .compare__tab-scroll, .q-tabs')!),
        nativeList: box(cell.querySelector('fluent-tablist, .q-tabs')!),
        disabled: box(cell.querySelector('fluent-tab[disabled], .q-tab[aria-disabled="true"]')!),
      }))
    })
    await info.attach('initial-tab-bounds', { body: JSON.stringify(bounds, null, 2), contentType: 'application/json' })
    for (const { cell, list } of bounds) {
      expect(cell.left).toBeGreaterThanOrEqual(0)
      expect(cell.right).toBeLessThanOrEqual(page.viewportSize()!.width)
      expect(list.width).toBeGreaterThan(0)
      expect(list.left).toBeGreaterThanOrEqual(cell.left - 1)
      expect(list.right).toBeLessThanOrEqual(cell.right + 1)
      expect(list.right).toBeLessThanOrEqual(page.viewportSize()!.width)
    }
    await expect(row.locator('.compare__title')).toHaveText('Tabs')
    await expect(row.locator('.compare__cell')).toHaveCount(2)
    await expect(row.locator('fluent-tab')).toHaveCount(4)
    await expect(row.locator('.q-tab')).toHaveCount(4)

    const content = row.locator('.compare__tab-scroll')
    const labelFits = () => content.evaluate(element => {
      const clip = element.getBoundingClientRect()
      const label = element.querySelector('.q-tab[aria-disabled="true"] .q-tab__label')!
      const rect = label.getBoundingClientRect()
      return rect.left >= clip.left - 1 && rect.right <= clip.right + 1
    })
    if (!await labelFits()) {
      // Exercise keyboard scrolling of the authored, focusable native scroll region.
      expect(await content.evaluate(e => getComputedStyle(e).overflowX)).toBe('auto')
      await content.focus()
      for (let i = 0; i < 12; i++) await page.keyboard.press('ArrowRight')
      await expect.poll(labelFits).toBe(true)
    }
    expect(await labelFits(), 'native scrolling exposes the complete Disabled label').toBe(true)
    await info.attach('disabled-label-reachable', {
      body: JSON.stringify(await content.evaluate(element => {
        const clip = element.getBoundingClientRect()
        const label = element.querySelector('.q-tab[aria-disabled="true"] .q-tab__label')!.getBoundingClientRect()
        return { left: clip.left, right: clip.right, scrollLeft: element.scrollLeft,
          clientWidth: element.clientWidth, scrollWidth: element.scrollWidth,
          labelLeft: label.left, labelRight: label.right }
      }), null, 2), contentType: 'application/json',
    })
    const fluentLabels = await row.locator('fluent-tablist').evaluate(element => {
      const host = element.getBoundingClientRect()
      return [...element.querySelectorAll('fluent-tab')].map(tab => {
        const range = document.createRange()
        range.selectNodeContents(tab)
        const r = range.getBoundingClientRect()
        return { label: tab.textContent, left: r.left, right: r.right, hostLeft: host.left, hostRight: host.right }
      })
    })
    for (const label of fluentLabels) {
      expect(label.left, `${label.label} left`).toBeGreaterThanOrEqual(label.hostLeft - 1)
      expect(label.right, `${label.label} right`).toBeLessThanOrEqual(label.hostRight + 1)
    }
    await row.locator('fluent-tab#activity').click()
    await expect(row.locator('fluent-tab#activity')).toHaveAttribute('aria-selected', 'true')
    await row.locator('.q-tab').filter({ hasText: 'Activity' }).click()
    await expect(row.locator('.q-tab').filter({ hasText: 'Activity' })).toHaveAttribute('aria-selected', 'true')
    await expect(row.locator('fluent-tab[disabled]')).toHaveAttribute('aria-disabled', 'true')
    await expect(row.locator('.q-tab').filter({ hasText: 'Disabled' })).toHaveAttribute('aria-disabled', 'true')
    await waitForThemePaint(page)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(page.viewportSize()!.width)
    if (variant === 'term') {
      const path = info.outputPath('tabs-viewport.png')
      await page.screenshot({ path })
      await info.attach('tabs-viewport', { path, contentType: 'image/png' })
    }
    // The initial labels remain reachable too, without moving the page sideways.
    await content.focus()
    for (let i = 0; i < 12; i++) await page.keyboard.press('ArrowLeft')
    await expect.poll(() => content.evaluate(element => {
      const clip = element.getBoundingClientRect()
      const label = element.querySelector('.q-tab__label')!.getBoundingClientRect()
      return label.left >= clip.left - 1 && label.right <= clip.right + 1
    })).toBe(true)
    expect(await page.evaluate(() => window.scrollX)).toBe(0)
  })
}
