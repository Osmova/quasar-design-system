import { expect, test } from '@playwright/test'
import { applyTheme, LEGACY_VARIANTS as CANONICAL_VARIANTS, resolvedColor, type Mode } from './helpers'

const MODES: Mode[] = ['light', 'dark']

test.describe('control composition', () => {
  test('floating badge inside a button group keeps its counter width and top-end anchor', async ({ page }) => {
    await page.goto('./#components')
    await applyTheme(page, 'light', 'fluent')
    const geometry = await page.locator('[data-test="qds-badge-floating-group"] .q-badge--floating').evaluate((badge) => {
      const host = badge.closest('.q-btn')!.getBoundingClientRect()
      const box = badge.getBoundingClientRect()
      return { overflow: badge.scrollWidth - badge.clientWidth, width: box.width, startInset: host.right - box.left }
    })
    expect(geometry.overflow, 'counter text fits the badge').toBeLessThanOrEqual(0)
    expect(geometry.width, '"99+" is wider than the 20px minimum').toBeGreaterThan(24)
    expect(geometry.startInset, 'badge starts just inside the host end edge').toBeLessThanOrEqual(12)
    const onTop = await page.locator('[data-test="qds-badge-floating-group"] .q-badge--floating').evaluate((badge) => {
      badge.scrollIntoView({ block: 'center' })
      const box = badge.getBoundingClientRect()
      const hit = document.elementFromPoint(box.right - 2, box.top + box.height / 2)
      return Boolean(hit && badge.contains(hit))
    })
    expect(onTop, 'the next group button does not paint over the badge').toBe(true)
  })

  for (const mode of MODES) {
    for (const variant of CANONICAL_VARIANTS) {
      test(`coloured toggle keeps inactive segments unfilled (${mode} / ${variant})`, async ({ page }) => {
        await page.goto('./#components')
        await applyTheme(page, mode, variant)
        const inactive = page.locator('[data-test="qds-toggle-color"] > .q-btn:not([aria-pressed="true"])').first()
        const muted = await resolvedColor(page, '--qds-fg-muted')
        await expect.poll(() => inactive.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe('rgba(0, 0, 0, 0)')
        await expect.poll(() => inactive.evaluate((element) => getComputedStyle(element).color)).toBe(muted)
        const disabled = page.locator('[data-test="qds-toggle-color"] > .q-btn.disabled')
        const disabledText = await resolvedColor(page, '--qds-fg-disabled')
        await expect.poll(() => disabled.evaluate((element) => getComputedStyle(element).color)).toBe(disabledText)
        await expect.poll(() => disabled.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe('rgba(0, 0, 0, 0)')
      })
    }
  }
})
