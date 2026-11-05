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

    const glass = page.locator('[data-test="qds-variant-card-glass"]')
    expect.soft(await glass.evaluate((el) => getComputedStyle(el).getPropertyValue('--qds-font-family').trim()), 'Glass uses the native system stack').toContain('-apple-system')
    const glassRow = await glass.locator('.q-list .q-item').first().evaluate((el) => getComputedStyle(el).minHeight)
    expect.soft(parseFloat(glassRow), 'Glass grouped rows stay roomy').toBeGreaterThanOrEqual(44)
    expect.soft(await computed(page, '[data-test="qds-variant-card-glass"] .q-item.q-item--active', 'background-color'), 'Glass active row takes the brand wash').toBe('rgb(228, 238, 252)')
    expect.soft(await computed(page, '[data-test="qds-variant-card-glass"] .variant-card__nested', 'box-shadow'), 'Glass content nests without a second drop').toBe('none')
    expect.soft(await glass.evaluate((el) => getComputedStyle(el).getPropertyValue('--_qds-glass-knob').trim()), 'Glass keeps a light switch knob').toBe('#ffffff')

    expect.soft(await resolvedColor(page, '--qds-color-primary'), 'Fluent primary remains calibrated from source tokens').toBe('rgb(15, 108, 189)')
  })

  // Body-level grammar only shows once the whole page is glass.
  test('glass nests concentric shapes, keeps capsules and floats bars on glass', async ({ page }) => {
    await page.goto('/#variants')
    await applyTheme(page, 'dark', 'glass')

    expect.soft(await customProperty(page, '--_qds-glass-knob'), 'the knob stays light against a dark track').toBe('#ffffff')
    expect.soft(await computed(page, '[data-test="qds-variant-card-glass"]', 'border-radius'), 'blocks use the large radius').toBe('26px')
    expect.soft(await computed(page, '[data-test="qds-variant-card-glass"] .variant-card__nested', 'border-radius'), 'a nested block is its card radius minus the padding').toBe('10px')
    expect.soft(await computed(page, '[data-test="qds-variant-card-glass"] .q-btn:not(.q-btn--dense)', 'border-radius'), 'prominent buttons are capsules').toBe('9999px')
    expect.soft(await computed(page, '.q-header', 'background-color'), 'the bar carries no fill of its own').toBe('rgba(0, 0, 0, 0)')
    expect.soft(await computed(page, '.q-header', 'backdrop-filter', '::before'), 'a soft scroll edge blurs content under the bar').not.toBe('none')
    expect.soft(await computed(page, '.q-header', 'mask-image', '::before'), 'the scroll edge fades instead of ruling a line').toContain('linear-gradient')
  })

  // A bare-class fallback (0,1,0) never beats the dark scope (0,3,1).
  for (const mode of ['light', 'dark'] as const) {
    test(`glass drops translucency under forced colors in ${mode}`, async ({ page }) => {
      await page.goto('/#components?variant=glass')
      await applyTheme(page, mode, 'glass')
      await page.emulateMedia({ forcedColors: 'active' })

      expect.soft(await customProperty(page, '--qds-material-thin-filter'), 'the acrylic filter is dropped').toBe('none')
      expect.soft(await customProperty(page, '--qds-control-fill-default'), 'control fills become opaque').not.toContain('color-mix')
      expect.soft(await customProperty(page, '--_qds-glass-fade'), 'the scroll edge becomes a plain opaque bar').toBe('none')
    })

    test(`glass resolves increased contrast to opaque glass and a deeper accent in ${mode}`, async ({ page }) => {
      await page.goto('/#components?variant=glass')
      await applyTheme(page, mode, 'glass')
      await page.emulateMedia({ contrast: 'more' })

      expect.soft(await customProperty(page, '--qds-material-regular-filter'), 'no blur behind controls').toBe('none')
      expect.soft(await resolvedColor(page, '--qds-color-primary'), 'the accent moves to its increased-contrast value').toBe(mode === 'light' ? 'rgb(0, 64, 221)' : 'rgb(140, 195, 255)')
      expect.soft(await resolvedColor(page, '--qds-stroke-strong'), 'control edges take the muted text colour').toBe(await resolvedColor(page, '--qds-text-muted'))
    })
  }

  // A dark block on a light glass page must re-point glass's own tokens, not keep the light root's.
  test('glass keeps nested blocks, switches and segments readable inside a dark card on a light page', async ({ page }) => {
    await page.goto('/#components?variant=glass')
    await applyTheme(page, 'light', 'glass')
    await expect(page.locator('[data-test="qds-toggle-color"]')).toBeVisible()

    const ratios = await page.evaluate(() => {
      const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
      const paint = (color: string, base = '#808080') => {
        context.fillStyle = base
        context.fillRect(0, 0, 1, 1)
        context.fillStyle = color
        context.fillRect(0, 0, 1, 1)
        return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3)
      }
      const luminance = (rgb: number[]) => {
        const [r, g, b] = rgb.map((v) => (v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
        return 0.2126 * r + 0.7152 * g + 0.0722 * b
      }
      const ratio = (a: number[], b: number[]) => {
        const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x)
        return (high + 0.05) / (low + 0.05)
      }
      const card = document.createElement('div')
      card.className = 'q-card q-card--dark'
      card.innerHTML = '<div class="q-card__section q-card__section--vert"><div class="q-card" data-nested><div class="q-card__section q-card__section--vert">Nested block</div></div></div>'
      const toggle = document.querySelector('input[name="components-toggle"]')!.closest('.q-toggle')!.cloneNode(true) as HTMLElement
      const inner = toggle.querySelector('.q-toggle__inner')!
      inner.classList.remove('q-toggle__inner--truthy')
      inner.classList.add('q-toggle__inner--falsy')
      const segments = document.querySelector('[data-test="qds-toggle-color"]')!.cloneNode(true) as HTMLElement
      card.firstElementChild!.append(toggle, segments)
      document.querySelector('.q-page')!.prepend(card)

      const cardBg = paint(getComputedStyle(card).backgroundColor)
      const nested = card.querySelector<HTMLElement>('[data-nested]')!
      const nestedBg = paint(getComputedStyle(nested).backgroundColor, `rgb(${cardBg})`)
      const track = paint(getComputedStyle(toggle.querySelector('.q-toggle__track')!).backgroundColor, `rgb(${cardBg})`)
      const knob = paint(getComputedStyle(toggle.querySelector('.q-toggle__thumb')!, '::after').backgroundColor, `rgb(${track})`)
      const segmentTrack = paint(getComputedStyle(segments).backgroundColor, `rgb(${cardBg})`)
      const active = segments.querySelector<HTMLElement>('.q-btn[aria-pressed="true"]')!
      const idle = segments.querySelector<HTMLElement>('.q-btn:not([aria-pressed="true"]):not(.disabled)')!
      const thumb = paint(getComputedStyle(active).backgroundColor, `rgb(${segmentTrack})`)
      const result = {
        nestedText: ratio(paint(getComputedStyle(nested).color, `rgb(${nestedBg})`), nestedBg),
        nestedLift: ratio(nestedBg, cardBg),
        knobOnOffTrack: ratio(knob, track),
        offTrackOnCard: ratio(track, cardBg),
        segmentIdleText: ratio(paint(getComputedStyle(idle).color, `rgb(${segmentTrack})`), segmentTrack),
        segmentActiveText: ratio(paint(getComputedStyle(active).color, `rgb(${thumb})`), thumb),
      }
      card.remove()
      return result
    })

    expect.soft(ratios.nestedText, 'nested block text').toBeGreaterThanOrEqual(4.5)
    expect.soft(ratios.nestedLift, 'the nested block is a darker-on-dark step, not a light slab').toBeLessThan(2)
    expect.soft(ratios.knobOnOffTrack, 'switch knob against its off track').toBeGreaterThanOrEqual(3)
    expect.soft(ratios.offTrackOnCard, 'switch off track against the dark card').toBeGreaterThanOrEqual(3)
    expect.soft(ratios.segmentIdleText, 'idle segment label on the segmented track').toBeGreaterThanOrEqual(4.5)
    expect.soft(ratios.segmentActiveText, 'selected segment label on its thumb').toBeGreaterThanOrEqual(4.5)
  })

  test('glass edges: boxed fields only, hairline labelled buttons, plain content toolbars', async ({ page }) => {
    await page.goto('/#forms?variant=glass')
    await applyTheme(page, 'light', 'glass')
    const control = (name: string) => `[data-test="qds-forms-variant-${name}-default"] .q-field__control`
    await expect(page.locator(control('outlined'))).toBeVisible()
    expect.soft(await computed(page, control('outlined'), 'border-top-width'), 'boxed fields keep their edge').toBe('1px')
    for (const name of ['borderless', 'ghost']) {
      expect.soft(await computed(page, control(name), 'border-top-style'), `${name} fields carry no glass box`).toBe('none')
    }

    await page.goto('/#components?variant=glass')
    await applyTheme(page, 'light', 'glass')
    const button = (label: string) => page.locator('.qds-button-row').first().locator('.q-btn', { hasText: label })
    const style = (label: string) => button(label).evaluate((el) => {
      const s = getComputedStyle(el)
      return { border: s.borderTopColor, background: s.backgroundColor }
    })
    const [standard, outline, disabled] = [await style('Default'), await style('Outline'), await style('Disabled')]
    expect.soft(standard.border, 'Default and Outline differ in edge').not.toBe(outline.border)
    expect.soft(standard.background, 'Default and Outline differ in fill').not.toBe(outline.background)
    expect.soft(outline.border, 'the outline keeps its 3:1 stroke').toBe(await resolvedColor(page, '--qds-stroke-strong'))
    expect.soft(disabled.border, 'a disabled button drops to the plain border').toBe(await resolvedColor(page, '--qds-border'))
    expect.soft(await computed(page, '.q-toolbar.qds-card .q-btn--flat', 'backdrop-filter'), 'toolbars inside content stay plain').toBe('none')
    expect.soft(await computed(page, '.gallery-header .gallery-switcher', 'backdrop-filter'), 'bar buttons float on glass').not.toBe('none')
    expect.soft(await computed(page, '.gallery-header .gallery-switcher', 'border-radius'), 'the shell follows glass capsules').toBe('9999px')
  })

  test('glass marks the selected tab and segment with a system outline under forced colors', async ({ page }) => {
    await page.goto('/#components?variant=glass')
    await applyTheme(page, 'light', 'glass')
    await page.emulateMedia({ forcedColors: 'active' })
    expect.soft(await computed(page, '[data-test="qds-tabs-horizontal"] .q-tab--active', 'outline-style'), 'selected tab').toBe('solid')
    expect.soft(await computed(page, '[data-test="qds-toggle-color"] > .q-btn[aria-pressed="true"]', 'border-top-style', '::after'), 'selected segment').toBe('solid')
  })

  // Both of these were silently dead once; this is their regression gate.
  test('glass switch keeps its capsule geometry and an on-state fill', async ({ page }) => {
    await page.goto('/#catalog?variant=glass')
    await applyTheme(page, 'light', 'glass')

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
    expect.soft(on, 'the on track resolves to glass primary').toBe('rgb(8, 96, 204)')
  })
})
