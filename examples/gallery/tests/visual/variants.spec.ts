import { expect, test } from '@playwright/test'
import { CANONICAL_VARIANTS, applyTheme, computed, customProperty, expectGalleryPage, resolvedColor } from './helpers'

test.describe('QDS variant distinctiveness lab', () => {
  test('mounts five canonical comparison cards with deliberate visual systems', async ({ page }) => {
    await page.goto('/#variants')
    await applyTheme(page, 'light', 'fluent')

    await expectGalleryPage(page, 'Variants')
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
    const atrium = page.locator('[data-test="qds-variant-card-atrium"]')
    expect.soft(await atrium.evaluate((el) => getComputedStyle(el).getPropertyValue('--qds-font-family').trim()), 'Atrium uses the native system stack').toContain('-apple-system')
    const atriumRow = await atrium.locator('.q-list .q-item').first().evaluate((el) => getComputedStyle(el).minHeight)
    expect.soft(parseFloat(atriumRow), 'Atrium grouped rows stay roomy').toBeGreaterThanOrEqual(44)
    expect.soft(await computed(page, '[data-test="qds-variant-card-atrium"] .q-item.q-item--active', 'background-color'), 'Atrium active row takes the brand wash').toBe('rgb(228, 238, 252)')
    expect.soft(await computed(page, '[data-test="qds-variant-card-atrium"] .variant-card__nested', 'box-shadow'), 'Atrium nests without a second drop').toBe('none')
    expect.soft(await computed(page, '[data-test="qds-variant-card-atrium"] .variant-card__nested', 'border-top-color'), 'Atrium nested panels keep the hairline edge').toBe('rgb(229, 229, 234)')
    expect.soft(await atrium.evaluate((el) => getComputedStyle(el).getPropertyValue('--_qds-atrium-knob').trim()), 'Atrium keeps a light switch knob in both schemes').toBe('#ffffff')

    expect.soft(await resolvedColor(page, '--qds-color-primary'), 'Fluent primary remains calibrated from source tokens').toBe('rgb(15, 108, 189)')
  })

  // The variant cards carry the variant class themselves, so the body-level
  // grammar a real app gets is only observable once the whole page is atrium.
  test('atrium nests panels and keeps a light knob when the page itself is atrium', async ({ page }) => {
    await page.goto('/#variants')
    await applyTheme(page, 'dark', 'atrium')

    expect.soft(await customProperty(page, '--_qds-atrium-knob'), 'the knob stays light against a dark track').toBe('#ffffff')
    expect.soft(await computed(page, '[data-test="qds-variant-card-atrium"] .variant-card__nested', 'border-radius'), 'nested panels step down to the control radius').toBe('10px')
    expect.soft(await computed(page, '.q-header', 'backdrop-filter'), 'chrome is a translucent sheet').not.toBe('none')
  })

  // The dark scope selector list reaches (0,3,1) while a bare-class fallback is
  // (0,1,0), so a fallback that is not nested in the dark block never applies.
  for (const mode of ['light', 'dark'] as const) {
    test(`atrium drops translucency under forced colors in ${mode}`, async ({ page }) => {
      await page.goto('/#components?variant=atrium')
      await applyTheme(page, mode, 'atrium')
      await page.emulateMedia({ forcedColors: 'active' })

      expect.soft(await customProperty(page, '--qds-material-thin-filter'), 'the acrylic filter is dropped').toBe('none')
      expect.soft(await customProperty(page, '--qds-control-fill-default'), 'control fills become opaque').not.toContain('rgba')
      expect.soft(await customProperty(page, '--qds-card-stroke'), 'the card stroke becomes opaque').not.toContain('rgba')
    })
  }

  // The capsule geometry and the switch "on" fill were both silently lost once:
  // the generic size ramp re-emits the toggle tokens, and the base truthy track
  // rule ties with the atrium off-state rule on specificity.
  test('atrium switch keeps its capsule geometry and an on-state fill', async ({ page }) => {
    await page.goto('/#catalog?variant=atrium')
    await applyTheme(page, 'light', 'atrium')

    expect.soft(await customProperty(page, '--qds-toggle-track-width'), 'the capsule survives the generic size ramp').toBe('3.1875rem')
    const toggle = page.locator('[data-test="qds-catalog-toggle"]')
    await expect(toggle).toBeVisible()
    const track = toggle.locator('.q-toggle__track')
    const inner = toggle.locator('.q-toggle__inner')
    const startedOn = await inner.evaluate((el) => el.classList.contains('q-toggle__inner--truthy'))
    const before = await track.evaluate((el) => getComputedStyle(el).backgroundColor)
    await inner.click()
    await expect(inner).toHaveClass(startedOn ? /q-toggle__inner--falsy/ : /q-toggle__inner--truthy/)
    const after = await track.evaluate((el) => getComputedStyle(el).backgroundColor)
    const [on, off] = startedOn ? [before, after] : [after, before]
    expect.soft(on, 'the on track carries the role colour, not the off fill').not.toBe(off)
    expect.soft(on, 'the on track resolves to atrium primary').toBe('rgb(11, 97, 214)')
  })
})
