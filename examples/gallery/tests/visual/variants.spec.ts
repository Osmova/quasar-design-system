import { expect, test } from '@playwright/test'
import { applyTheme, CANONICAL_VARIANTS, computed, customProperty, resolvedColor } from './helpers'

test.describe('QDS variant distinctiveness lab', () => {
  test('mounts five canonical comparison cards with deliberate visual systems', async ({ page }) => {
    await page.goto('/#variants')
    await applyTheme(page, 'light', 'fluent')

    await expect(page.getByRole('tab', { name: 'Variants' })).toHaveAttribute('aria-selected', 'true')
    for (const variant of CANONICAL_VARIANTS) {
      await expect(page.locator(`[data-test="qds-variant-card-${variant}"]`), `${variant} card`).toBeVisible()
      await expect(page.locator(`[data-test="qds-variant-roles-${variant}"]`), `${variant} role fixtures`).toBeVisible()
      await expect(page.locator(`[data-test="qds-variant-progress-${variant}"] .q-linear-progress`), `${variant} progress fixtures`).toHaveCount(2)
    }
    await expect(page.locator('[data-test="qds-variant-card-air"], [data-test="qds-variant-card-feather"]')).toHaveCount(0)

    const fluent = page.locator('[data-test="qds-variant-card-fluent"]')
    expect.soft(await computed(page, '[data-test="qds-variant-card-fluent"] .variant-card__nested', 'backdrop-filter'), 'Fluent content has no blur').toBe('none')
    expect.soft(await computed(page, '[data-test="qds-variant-card-fluent"] .variant-card__nested', 'box-shadow'), 'Fluent content has no resting small shadow').toBe('none')
    expect.soft(await computed(page, '[data-test="qds-variant-card-fluent"] .q-card', 'border-radius'), 'Fluent compact card radius').toBe(await customProperty(page, '--qds-card-radius'))
    expect.soft(await fluent.evaluate((el) => getComputedStyle(el).getPropertyValue('--qds-card-border-mix').trim()), 'Fluent uses low-border content').toBe('22%')

    const ink = page.locator('[data-test="qds-variant-card-ink"]')
    const inkTitleFont = await computed(page, '[data-test="qds-variant-card-ink"] .variant-card__title', 'font-family')
    expect.soft(inkTitleFont, 'Ink display uses serif editorial family').toMatch(/Iowan Old Style|Palatino|Georgia/)
    expect.soft(await ink.evaluate((el) => getComputedStyle(el).getPropertyValue('--qds-surface-positive-soft').trim()), 'Ink exposes pastel positive role token').toBe('#e2ecdf')
    expect.soft(await ink.locator('.variant-role--positive').evaluate((el) => getComputedStyle(el).backgroundColor), 'Ink role fixture is painted').not.toBe('rgba(0, 0, 0, 0)')
    expect.soft(await computed(page, '[data-test="qds-variant-card-ink"] .variant-card__nested', 'backdrop-filter'), 'Ink is flat, not blurred').toBe('none')
    expect.soft(await computed(page, '[data-test="qds-variant-card-ink"] .variant-card__nested', 'box-shadow'), 'Ink content is matte').toBe('none')

    const one = page.locator('[data-test="qds-variant-card-one"]')
    const fluentRow = await fluent.locator('.q-list .q-item').first().evaluate((el) => getComputedStyle(el).minHeight)
    const oneRow = await one.locator('.q-list .q-item').first().evaluate((el) => getComputedStyle(el).minHeight)
    expect.soft(parseFloat(oneRow), 'One list rows are touch-forward').toBeGreaterThanOrEqual(44)
    expect.soft(parseFloat(oneRow), 'One rows exceed Fluent density').toBeGreaterThan(parseFloat(fluentRow))
    expect.soft(await one.evaluate((el) => getComputedStyle(el).getPropertyValue('--qds-surface-focus-block').trim()), 'One focus-block token is available').toBe('#efefef')

    const term = page.locator('[data-test="qds-variant-card-term"]')
    expect.soft(await term.evaluate((el) => getComputedStyle(el).getPropertyValue('--qds-font-family').trim()), 'Term body font token is monospace').toContain('ui-monospace')
    expect.soft(await term.evaluate((el) => getComputedStyle(el).getPropertyValue('--qds-control-text-transform').trim()), 'Term controls request uppercase').toBe('uppercase')
    expect.soft(await computed(page, '[data-test="qds-variant-card-term"] .q-btn', 'text-transform'), 'Term button renders uppercase').toBe('uppercase')
    expect.soft(await resolvedColor(page, '--qds-color-primary'), 'Fluent primary remains calibrated from source tokens').toBe('rgb(15, 108, 189)')
  })
})
