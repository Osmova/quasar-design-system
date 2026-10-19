import { expect, test, type Locator, type Page } from '@playwright/test'
import { applyTheme, coarsePointer, computed, customProperty, gotoGalleryPage, resolvedColor } from './helpers'

type Mode = 'light' | 'dark'

async function bounds(locator: Locator) {
  return locator.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return { top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left, width: rect.width, height: rect.height }
  })
}

function expectContained(inner: Awaited<ReturnType<typeof bounds>>, outer: Awaited<ReturnType<typeof bounds>>, message: string) {
  expect.soft(inner.top, `${message}: top`).toBeGreaterThanOrEqual(outer.top - 1)
  expect.soft(inner.bottom, `${message}: bottom`).toBeLessThanOrEqual(outer.bottom + 1)
  expect.soft(inner.left, `${message}: left`).toBeGreaterThanOrEqual(outer.left - 1)
  expect.soft(inner.right, `${message}: right`).toBeLessThanOrEqual(outer.right + 1)
}

async function expectFieldGeometry(page: Page, hook: string) {
  const fixture = page.locator(`[data-test="${hook}"]`)
  const field = fixture.locator(':scope > .q-field')
  const control = field.locator('.q-field__control')
  const label = field.locator('.q-field__label')
  const native = field.locator('.q-field__native')
  const controlBounds = await bounds(control)

  await expect(label).toBeVisible()
  await expect(native).toBeVisible()
  expectContained(await bounds(native), controlBounds, `${hook} value stays in its control`)

  // Default anatomy: the label sits above the control, start-aligned, 4px clear of its stroke.
  const labelBounds = await bounds(label)
  expect.soft(controlBounds.top - labelBounds.bottom, `${hook} label sits 4px above the control`).toBeCloseTo(4, 0)
  expect.soft(Math.abs(labelBounds.left - controlBounds.left), `${hook} label aligns with the control inline-start`).toBeLessThanOrEqual(1)
  expect.soft(await label.evaluate((el) => getComputedStyle(el).backgroundColor), `${hook} label outside the stroke needs no mask`).toBe('rgba(0, 0, 0, 0)')

  return { fixture, field, control, native, controlBounds }
}

async function expectMarginalSvgCentered(page: Page, hook: string, tolerancePx = 0.5) {
  const fixture = page.locator(`[data-test="${hook}"]`)
  const control = fixture.locator(':scope > .q-field .q-field__control')
  const svg = control.locator('.q-field__marginal svg').first()
  await expect(svg).toBeVisible()
  const controlBounds = await bounds(control)
  const svgBounds = await bounds(svg)
  const controlCenterY = controlBounds.top + controlBounds.height / 2
  const svgCenterY = svgBounds.top + svgBounds.height / 2
  expect.soft(
    Math.abs(controlCenterY - svgCenterY),
    `${hook} marginal SVG centres vertically within its control (<=${tolerancePx}px)`,
  ).toBeLessThanOrEqual(tolerancePx)
}

async function expectErrorBelowControl(page: Page, hook: string) {
  const fixture = page.locator(`[data-test="${hook}"]`)
  const control = fixture.locator(':scope > .q-field .q-field__control')
  const messages = fixture.locator(':scope > .q-field .q-field__messages')
  await expect(messages).toBeVisible()
  const controlBounds = await bounds(control)
  const messagesBounds = await bounds(messages)
  expect.soft(
    messagesBounds.top,
    `${hook} error messages start at or below the control bottom`,
  ).toBeGreaterThanOrEqual(controlBounds.bottom - 0.5)
}

test.describe('Fluent control geometry and Phosphor icon contract', () => {
  for (const mode of ['light', 'dark'] as const satisfies readonly Mode[]) {
    test(`${mode} keeps field values, labels, chips, and error affordances contained`, async ({ page }) => {
      await page.goto('/#components')
      await applyTheme(page, mode, 'fluent')

      const input = await expectFieldGeometry(page, 'qds-control-input')
      const filled = await expectFieldGeometry(page, 'qds-control-input-filled')
      const select = await expectFieldGeometry(page, 'qds-control-select')
      const dense = await expectFieldGeometry(page, 'qds-control-select-dense')
      const disabled = await expectFieldGeometry(page, 'qds-control-input-disabled')
      const error = await expectFieldGeometry(page, 'qds-control-input-error')

      const [md, sm] = await coarsePointer(page) ? [40, 32] : [32, 24]
      expect.soft(input.controlBounds.height, `default input uses the ${md}px md control height`).toBeCloseTo(md, 0)
      expect.soft(filled.controlBounds.height, `filled input uses the ${md}px md control height`).toBeCloseTo(md, 0)
      expect.soft(select.controlBounds.height, 'single select does not grow to chip height').toBeCloseTo(md, 0)
      expect.soft(dense.controlBounds.height, `dense select uses the ${sm}px sm control height`).toBeCloseTo(sm, 0)
      expect.soft(disabled.controlBounds.height, 'disabled input keeps the normal field height').toBeCloseTo(md, 0)
      await expect(error.field.locator('.q-field__messages')).toContainText('Required field')
      await expect(error.field.locator('.q-field__append .q-icon svg')).toBeVisible()

      // Error content sits below the control, not overlapping it.
      await expectErrorBelowControl(page, 'qds-control-input-error')

      // Marginal SVG icons (error, dropdown arrow) centre vertically within their control.
      await expectMarginalSvgCentered(page, 'qds-control-input-error')
      await expectMarginalSvgCentered(page, 'qds-control-select')

      const multiple = await expectFieldGeometry(page, 'qds-control-select-multiple')
      await expect(multiple.field.locator('.q-chip')).toHaveCount(2)
      expect.soft(multiple.controlBounds.height, 'multi-select grows only for its chip content').toBeGreaterThanOrEqual(select.controlBounds.height)
      expect.soft(await computed(page, '[data-test="qds-control-select-multiple"] .q-field__native', 'flex-wrap'), 'multi-select native container permits chip wrapping').toBe('wrap')

      await multiple.field.evaluate((element) => { (element as HTMLElement).style.width = '9rem' })
      const chipRows = await multiple.field.locator('.q-chip').evaluateAll((chips) => chips.map((chip) => Math.round(chip.getBoundingClientRect().top)))
      expect.soft(new Set(chipRows).size, 'constrained multi-select wraps chips onto rows').toBeGreaterThan(1)
      for (const chip of await multiple.field.locator('.q-chip').all()) {
        expectContained(await bounds(chip), await bounds(multiple.control), 'multi-select chip stays inside its control')
      }
    })
  }

  test('leads with label-above fields and keeps float, animated stacked, and aligned start-label opt-ins', async ({ page }) => {
    await page.goto('/#components')
    await page.setViewportSize({ width: 1280, height: 900 })
    await applyTheme(page, 'light', 'fluent')

    const defaultField = page.locator('[data-test="qds-control-input"] > .q-field')
    await expect(defaultField).not.toHaveClass(/qds-field--(float|stacked-animated|start)/)
    const defaultMetrics = await defaultField.evaluate((field) => {
      const control = field.querySelector('.q-field__control')!.getBoundingClientRect()
      const label = field.querySelector('.q-field__label')!.getBoundingClientRect()
      const native = field.querySelector('.q-field__native')!.getBoundingClientRect()
      return {
        labelBeforeValue: label.bottom <= native.top + 1,
        labelAboveControl: label.bottom <= control.top + 0.5,
        labelStartAligned: Math.abs(label.left - control.left),
        controlHeight: control.height,
      }
    })
    expect(defaultMetrics.labelBeforeValue, 'default label precedes the value').toBe(true)
    expect(defaultMetrics.labelAboveControl, 'default label sits above the control, outside its stroke').toBe(true)
    expect(defaultMetrics.labelStartAligned, 'default label aligns with the control inline-start').toBeLessThanOrEqual(1)
    expect(defaultMetrics.controlHeight, 'default control uses the md control height (40px on touch)').toBe(await coarsePointer(page) ? 40 : 32)

    const floatField = page.locator('[data-test="qds-field-float"] > .q-field')
    await expect(floatField).toHaveClass(/qds-field--float/)
    const floatMetrics = await floatField.evaluate((field) => {
      const control = field.querySelector('.q-field__control')!.getBoundingClientRect()
      const label = field.querySelector('.q-field__label')!.getBoundingClientRect()
      return { labelOffset: Math.abs((label.top + label.height / 2) - (control.top + control.height / 2)), controlHeight: control.height }
    })
    expect(floatMetrics.labelOffset, 'empty opt-in float label rests centred in the field').toBeLessThanOrEqual(1)
    expect(floatMetrics.controlHeight, 'opt-in float field keeps its 48px label band').toBe(48)

    const floatedField = page.locator('[data-test="qds-field-float-value"] > .q-field')
    await expect(floatedField).toHaveClass(/q-field--float/)
    const floatedMetrics = await floatedField.evaluate((field) => {
      const control = field.querySelector('.q-field__control')!.getBoundingClientRect()
      const label = field.querySelector('.q-field__label')!.getBoundingClientRect()
      const native = field.querySelector('.q-field__native')!
      const nativeBox = native.getBoundingClientRect()
      const nativeStyle = getComputedStyle(native)
      const paddingTop = Number.parseFloat(nativeStyle.paddingTop)
      const contentHeight = nativeBox.height - paddingTop - Number.parseFloat(nativeStyle.paddingBottom)
      const valueTop = nativeBox.top + paddingTop + (contentHeight - Number.parseFloat(nativeStyle.lineHeight)) / 2
      return {
        labelOnTopStroke: label.top < control.top && label.bottom > control.top,
        labelAboveValue: label.bottom <= valueTop + 0.5,
      }
    })
    expect(floatedMetrics.labelOnTopStroke, 'floated opt-in outlined label sits on the top stroke (masked by --qds-field-label-bg)').toBe(true)
    expect(floatedMetrics.labelAboveValue, 'floated opt-in label clears the value text').toBe(true)

    await expect(page.locator('[data-test="qds-field-stacked-animated"] > .q-field')).toHaveClass(/qds-field--stacked-animated/)

    const startFields = page.locator('[data-test="qds-field-start-form"] .qds-field--start')
    const startMetrics = await startFields.evaluateAll((fields) => fields.map((field) => {
      const label = field.querySelector('.q-field__label')!.getBoundingClientRect()
      const control = field.querySelector('.q-field__control')!.getBoundingClientRect()
      return { labelRight: label.right, controlLeft: control.left, labelTop: label.top }
    }))
    expect(startMetrics).toHaveLength(2)
    expect(Math.abs(startMetrics[0].labelRight - startMetrics[1].labelRight), 'start labels share one column').toBeLessThanOrEqual(1)
    expect(Math.abs(startMetrics[0].controlLeft - startMetrics[1].controlLeft), 'start controls share one column').toBeLessThanOrEqual(1)
  })

  test('keeps field variants responsive across supported widths', async ({ page }) => {
    for (const width of [320, 375, 390, 768, 1280, 1920]) {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 900 })
      await page.goto('/#components')
      await applyTheme(page, 'light', 'fluent')

      const layout = await page.evaluate(() => {
        const field = document.querySelector('[data-test="qds-field-start-form"] .qds-field--start')!
        const label = field.querySelector('.q-field__label')!.getBoundingClientRect()
        const control = field.querySelector('.q-field__control')!.getBoundingClientRect()
        return {
          viewport: window.innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          labelAboveControl: label.bottom <= control.top + 0.5 && Math.abs(label.left - control.left) <= 1,
          labelBesideControl: label.right <= control.left + 0.5 && label.bottom > control.top,
        }
      })

      expect(layout.documentWidth, `${width}px field gallery has no horizontal overflow`).toBeLessThanOrEqual(layout.viewport + 1)
      if (width < 720) {
        expect(layout.labelAboveControl, `${width}px start labels collapse to the default label-above anatomy`).toBe(true)
      } else {
        expect(layout.labelBesideControl, `${width}px start labels use the shared side column`).toBe(true)
      }
    }
  })

  for (const mode of ['light', 'dark'] as const satisfies readonly Mode[]) {
    test(`${mode} standalone outlined label sits above the stroke; floated opt-in labels mask with the public label-bg token`, async ({ page }) => {
      await page.goto('/#components')
      await applyTheme(page, mode, 'fluent')

      const fixture = page.locator('[data-test="qds-control-input-standalone"]')
      const label = fixture.locator('.q-field__label')
      await expect(label).toBeVisible()
      const standalone = await fixture.locator('.q-field').evaluate((field) => {
        const labelBox = field.querySelector('.q-field__label')!.getBoundingClientRect()
        const controlBox = field.querySelector('.q-field__control')!.getBoundingClientRect()
        return { gap: controlBox.top - labelBox.bottom, background: getComputedStyle(field.querySelector('.q-field__label')!).backgroundColor }
      })
      expect.soft(standalone.gap, `${mode} standalone label clears the outline instead of cutting it`).toBeGreaterThanOrEqual(0)
      expect.soft(standalone.background, `${mode} label outside the stroke needs no mask`).toBe('rgba(0, 0, 0, 0)')

      const tokenBg = await customProperty(page, '--qds-field-label-bg')
      expect.soft(tokenBg, `${mode} --qds-field-label-bg resolves to a non-empty value`).not.toBe('')

      const floated = page.locator('[data-test="qds-field-float-value"] > .q-field--outlined.qds-field--float.q-field--float')
      await expect(floated).toBeVisible()
      const expectedBg = await resolvedColor(page, '--qds-field-label-bg')
      await expect.poll(
        () => floated.locator('.q-field__label').evaluate((element) => getComputedStyle(element).backgroundColor),
        { message: `${mode} floated outlined label matches the resolved --qds-field-label-bg token`, timeout: 2000 },
      ).toBe(expectedBg)
    })
  }

  test('uses the shared chip scale, keeps filled buttons strokeless, and keeps outline explicit', async ({ page }) => {
    await page.goto('/#components')
    await applyTheme(page, 'light', 'fluent')

    const chip = page.locator('.q-tab-panel .q-chip').first()
    const badge = page.locator('.q-tab-panel .q-badge').first()
    const chipMinimum = Number.parseFloat(await computed(page, '.q-tab-panel .q-chip', 'min-height'))
    const badgeMinimum = Number.parseFloat(await computed(page, '.q-tab-panel .q-badge', 'min-height'))

    expect.soft((await bounds(chip)).height, 'QChip consumes the chip minimum height').toBeGreaterThanOrEqual(chipMinimum)
    expect.soft((await bounds(badge)).height, 'QBadge remains the compact status treatment').toBeLessThan((await bounds(chip)).height)
    expect.soft(chipMinimum, 'chip token is larger than the compact badge token').toBeGreaterThan(badgeMinimum)
    expect.soft(await customProperty(page, '--qds-chip-min-height')).toBe('1.75rem')
    expect.soft(await customProperty(page, '--qds-chip-dense-min-height')).toBe('1.5rem')
    expect.soft(await customProperty(page, '--qds-chip-dense-padding')).toBe('0 .5rem')
    expect.soft(await customProperty(page, '--qds-badge-min-height')).toBe('1.25rem')
    expect.soft(await computed(page, '.q-tab-panel .q-chip', 'padding-top'), 'QChip pill centres content without block padding').toBe('0px')
    expect.soft(await computed(page, '.q-tab-panel .q-chip', 'padding-left'), 'QChip consumes the 0.75rem inline token padding').toBe('12px')
    const denseChipMinimum = Number.parseFloat(await customProperty(page, '--qds-chip-dense-min-height'))
    expect.soft(denseChipMinimum * 16, 'dense chip token sits between normal chip and badge').toBeGreaterThan(badgeMinimum)
    expect.soft(denseChipMinimum * 16, 'dense chip token is smaller than normal chip').toBeLessThan(chipMinimum)
    expect.soft(await computed(page, '[data-test="qds-control-standard-button"]', 'border-top-color'), 'filled accent button carries the WinUI elevation top edge').toBe(await resolvedColor(page, '--qds-control-stroke-on-accent-top'))
    expect.soft(await computed(page, '[data-test="qds-control-standard-button"]', 'background-color'), 'standard color button is a solid primary fill').toBe(await resolvedColor(page, '--qds-color-primary'))
    expect.soft(await computed(page, '[data-test="qds-control-outline-button"]', 'border-top-width'), 'outline button keeps its explicit border').toBe('1px')
  })

  for (const mode of ['light', 'dark'] as const satisfies readonly Mode[]) {
    test(`${mode} QBtn :focus-visible draws the 2px focus stroke despite Quasar no-outline`, async ({ page }) => {
      await page.goto('/#components')
      await applyTheme(page, mode, 'fluent')

      const focusColor = await resolvedColor(page, '--qds-stroke-focus')
      const ringWidth = await page.locator('body').evaluate((element) => {
        const probe = document.createElement('span')
        probe.style.outline = 'var(--qds-focus-ring-width) solid'
        element.append(probe)
        const width = Number.parseFloat(getComputedStyle(probe).outlineWidth)
        probe.remove()
        return width
      })
      expect(ringWidth, 'focus ring token is the 2px Fluent stroke').toBe(2)

      const panel = page.locator('.q-tab-panel')
      const buttons = {
        neutral: panel.getByRole('button', { name: 'Default', exact: true }),
        solid: panel.getByRole('button', { name: 'Save', exact: true }),
        outline: page.locator('[data-test="qds-control-outline-button"]'),
        subtle: panel.getByRole('button', { name: 'Subtle', exact: true }),
        round: panel.getByRole('button', { name: 'Add', exact: true }),
      }
      for (const [name, button] of Object.entries(buttons)) {
        await expect(button).toHaveClass(/no-outline/)
        await button.focus()
        const ring = await button.evaluate((element) => {
          const style = getComputedStyle(element)
          const layers = [...style.boxShadow.matchAll(/(rgba?\([^)]*\)|color\([^)]*\))\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px\s+(-?[\d.]+)px/g)]
            .map((match) => ({ color: match[1], x: Number(match[2]), y: Number(match[3]), blur: Number(match[4]), spread: Number(match[5]) }))
          return {
            focusVisible: element.matches(':focus-visible'),
            outlineStyle: style.outlineStyle,
            outlineWidth: Number.parseFloat(style.outlineWidth),
            outlineColor: style.outlineColor,
            layers,
          }
        })
        expect(ring.focusVisible, `${mode} ${name} button matches :focus-visible after keyboard-style focus`).toBe(true)
        const outlineRing = ring.outlineStyle !== 'none' && ring.outlineWidth === ringWidth && ring.outlineColor === focusColor
        const shadowRing = ring.layers.some((layer) => layer.color === focusColor && layer.x === 0 && layer.y === 0 && layer.blur === 0 && layer.spread >= ringWidth)
        expect.soft(outlineRing || shadowRing, `${mode} ${name} button shows a ${ringWidth}px --qds-stroke-focus ring (outline ${ring.outlineStyle} ${ring.outlineWidth}px ${ring.outlineColor})`).toBe(true)
        await button.blur()
      }
    })
  }

  test('renders control arrows, remove affordances, ratings, and expansion chevrons as SVG icons on aligned baselines', async ({ page }) => {
    await page.goto('/#icons')
    await applyTheme(page, 'light', 'fluent')

    const iconControls = [
      page.locator('[data-test="qds-icon-dropdown"] .q-btn-dropdown__arrow'),
      page.locator('[data-test="qds-icon-removable-chip"] .q-chip__icon--remove'),
      page.locator('[data-test="qds-icon-select"] .q-field__append .q-icon'),
      page.locator('[data-test="qds-icon-rating"] .q-rating__icon').first(),
      page.locator('[data-test="qds-icon-expansion"] .q-expansion-item__toggle-icon'),
    ]
    for (const control of iconControls) {
      await expect(control).toBeVisible()
      await expect(control.locator('svg')).toBeVisible()
      expect.soft((await control.textContent())?.trim(), 'control icon has no Material ligature text').toBe('')
    }
    await expect(page.locator('[data-test="qds-icon-removable-chip"]')).toContainText('Remove tag')

    const dropdown = page.locator('[data-test="qds-icon-dropdown"] .q-btn-dropdown')
    const dropdownArrow = dropdown.locator('.q-btn-dropdown__arrow')
    const [dropdownBounds, dropdownArrowBounds] = await Promise.all([bounds(dropdown), bounds(dropdownArrow)])
    expect.soft(Math.abs((dropdownBounds.top + (dropdownBounds.height / 2)) - (dropdownArrowBounds.top + (dropdownArrowBounds.height / 2))), 'dropdown arrow centres on its button baseline').toBeLessThanOrEqual(1)

    const expansionRow = page.locator('[data-test="qds-icon-expansion"] .q-item').first()
    const expansionIcon = page.locator('[data-test="qds-icon-expansion"] .q-expansion-item__toggle-icon')
    const [expansionRowBounds, expansionIconBounds] = await Promise.all([bounds(expansionRow), bounds(expansionIcon)])
    expect.soft(Math.abs((expansionRowBounds.top + (expansionRowBounds.height / 2)) - (expansionIconBounds.top + (expansionIconBounds.height / 2))), 'expansion chevron centres on its row').toBeLessThanOrEqual(1)

    await gotoGalleryPage(page, 'Catalog')
    for (const hook of ['qds-rating-sm', 'qds-rating-md', 'qds-rating-lg']) {
      const rating = page.locator(`[data-test="${hook}"]`)
      const ratingIcon = rating.locator('.q-rating__icon-container').first()
      await expect(ratingIcon.locator('svg')).toBeVisible()
      const [ratingBounds, ratingIconBounds] = await Promise.all([bounds(rating), bounds(ratingIcon)])
      expect.soft(Math.abs((ratingBounds.top + (ratingBounds.height / 2)) - (ratingIconBounds.top + (ratingIconBounds.height / 2))), `${hook} icon centres in its rating control`).toBeLessThanOrEqual(1)
    }
  })

  test('retains control geometry in Ink, One, and Term smoke states', async ({ page }) => {
    await page.goto('/#components')
    const md = await coarsePointer(page) ? 40 : 32
    for (const variant of ['ink', 'one', 'term'] as const) {
      await applyTheme(page, 'dark', variant)
      const input = await expectFieldGeometry(page, 'qds-control-input')
      const multiple = await expectFieldGeometry(page, 'qds-control-select-multiple')
      await expect(multiple.field.locator('.q-chip').first()).toBeVisible()
      expect.soft(input.controlBounds.height, `${variant} standard input keeps its control height`).toBeCloseTo(variant === 'one' ? 44 : md, 0)
    }
  })
})
