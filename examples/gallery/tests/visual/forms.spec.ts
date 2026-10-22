import { expect, test, type Page } from '@playwright/test'
import { LEGACY_VARIANTS as CANONICAL_VARIANTS, applyTheme, coarsePointer, expectGalleryPage, resolvedColor, type Mode, type Variant } from './helpers'

const MODES: Mode[] = ['light', 'dark']
const byHook = (hook: string) => `[data-test="${hook}"]`
const field = (hook: string) => `${byHook(hook)} .q-field`

type Rgba = [number, number, number, number]

function parseColor(value: string): Rgba {
  const alpha = (raw: string | undefined, percent: string | undefined) => (raw === undefined ? 1 : Number(raw) / (percent ? 100 : 1))
  const srgb = value.match(/^color\(srgb\s+([-\d.e]+)\s+([-\d.e]+)\s+([-\d.e]+)(?:\s*\/\s*([\d.]+)(%?))?\s*\)$/)
  if (srgb) return [Number(srgb[1]) * 255, Number(srgb[2]) * 255, Number(srgb[3]) * 255, alpha(srgb[4], srgb[5])]
  const rgb = value.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+)(%?))?\s*\)$/)
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), alpha(rgb[4], rgb[5])]
  throw new Error(`Unsupported colour serialisation: ${value}`)
}

function distance(a: string, b: string): number {
  const [x, y] = [parseColor(a), parseColor(b)]
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2])
}

const isTransparent = (value: string) => parseColor(value)[3] === 0

async function settle(page: Page) {
  await page.evaluate(async () => {
    await Promise.all(
      document
        .getAnimations()
        .filter((animation) => Number.isFinite(Number(animation.effect?.getComputedTiming().endTime)))
        .map((animation) => animation.finished.catch(() => undefined)),
    )
  })
}

async function openForms(page: Page, mode: Mode, variant: Variant = 'fluent') {
  await page.goto('./#forms')
  await applyTheme(page, mode, variant)
  await expectGalleryPage(page, 'Forms')
  await settle(page)
}

type FieldPaint = {
  stroke: string
  bar: string
  barShown: boolean
  bottom: string
  icon: string
  background: string
  halo: string[]
  haloToken: string
  borderWidths: number[]
  height: number
}

async function paint(page: Page, selector: string): Promise<FieldPaint> {
  return page.locator(selector).first().evaluate((root) => {
    const control = root.querySelector('.q-field__control') as HTMLElement
    const style = getComputedStyle(control)
    const before = getComputedStyle(control, '::before')
    const after = getComputedStyle(control, '::after')
    const bottom = root.querySelector('.q-field__bottom')
    const icon = root.querySelector('.q-field__append svg, .q-field__append .q-icon')
    return {
      stroke: before.borderTopColor,
      bar: after.borderBottomColor,
      barShown: Number.parseFloat(after.borderBottomWidth) > 0 && after.transform === 'matrix(1, 0, 0, 1, 0, 0)',
      bottom: bottom ? getComputedStyle(bottom).color : '',
      icon: icon ? getComputedStyle(icon).color : '',
      background: style.backgroundColor,
      halo: [style.boxShadow, before.boxShadow].filter((shadow) => shadow !== 'none'),
      haloToken: getComputedStyle(root).getPropertyValue('--qds-field-focus-halo').trim(),
      borderWidths: ['Top', 'Right', 'Bottom', 'Left'].map((side) => Number.parseFloat(before.getPropertyValue(`border-${side.toLowerCase()}-width`))),
      height: control.getBoundingClientRect().height,
    }
  })
}

async function pseudoContent(page: Page, selector: string, pseudo = '::after'): Promise<string> {
  return page.locator(selector).first().evaluate((element, pseudo) => getComputedStyle(element, pseudo).content, pseudo)
}

async function tokenLength(page: Page, name: string): Promise<number> {
  return page.locator('body').evaluate((body, name) => {
    const probe = document.createElement('span')
    probe.style.cssText = `display:block;position:absolute;width:var(${name})`
    body.append(probe)
    const width = probe.getBoundingClientRect().width
    probe.remove()
    return width
  }, name)
}

async function rect(page: Page, selector: string) {
  const box = await page.locator(selector).first().boundingBox()
  expect(box, `${selector} has a layout box`).not.toBeNull()
  return { left: box!.x, right: box!.x + box!.width, top: box!.y, bottom: box!.y + box!.height, width: box!.width, height: box!.height }
}

test.describe('forms', () => {
  for (const mode of MODES) {
    for (const variant of CANONICAL_VARIANTS) {
      test(`focus switches to the input-active fill and shows the bar (${mode} / ${variant})`, async ({ page }) => {
        await openForms(page, mode, variant)
        const target = field('qds-forms-state-focus')
        const active = await resolvedColor(page, '--qds-control-fill-input-active')
        const rest = await paint(page, target)
        expect.soft(rest.barShown, 'bar is hidden at rest').toBe(false)
        expect.soft(rest.haloToken, 'fields carry no halo by default').toBe('none')

        await page.locator(byHook('qds-forms-focus-trigger')).click()
        await expect(page.locator(target)).toHaveClass(/q-field--highlighted/)
        await settle(page)
        if (variant === 'ink') {
          await expect.poll(async () => (await paint(page, target)).barShown, 'ink carries focus on the bar').toBe(true)
        } else {
          await expect
            .poll(async () => distance((await paint(page, target)).background, active), 'focused fill settles on the input-active layer')
            .toBeLessThanOrEqual(1.5)
        }
        const focused = await paint(page, target)
        if (variant === 'ink') expect.soft(parseColor(focused.background)[3], 'ink focused fill stays opaque').toBe(1)
        if (variant === 'one') expect.soft(focused.barShown, 'One focus draws the perimeter instead of the bar').toBe(false)
        else expect.soft(focused.barShown, 'focus shows the bottom bar').toBe(true)
        expect.soft(focused.haloToken, 'focused fields keep the halo token at none').toBe('none')
      })
    }

    test(`error keeps its stroke and bar on focus (${mode})`, async ({ page }) => {
      await openForms(page, mode)
      const target = field('qds-forms-state-error')
      const error = await resolvedColor(page, '--qds-stroke-error')

      await page.locator(`${target} input`).focus()
      await expect(page.locator(target)).toHaveClass(/q-field--highlighted/)
      await settle(page)
      const focused = await paint(page, target)
      expect.soft(focused.stroke, 'focused error stroke stays the error colour').toBe(error)
      expect.soft(focused.bar, 'focused error bar stays the error colour').toBe(error)
      expect.soft(focused.barShown, 'error bar is visible').toBe(true)
    })

    test(`validation tints stroke, bar, message and icon (${mode})`, async ({ page }) => {
      await openForms(page, mode)
      const neutral = await paint(page, field('qds-forms-state-rest'))
      const muted = await resolvedColor(page, '--qds-fg-muted')

      for (const role of ['positive', 'warning'] as const) {
        const tint = await resolvedColor(page, `--qds-color-${role}`)
        const tinted = await paint(page, field(`qds-forms-state-${role}`))
        await expect(page.locator(field(`qds-forms-state-${role}`))).toHaveClass(new RegExp(`qds-field--${role}`))
        expect.soft(distance(tinted.stroke, tint), `${role} stroke ${tinted.stroke} leans to ${tint}`).toBeLessThan(distance(neutral.stroke, tint))
        expect.soft(distance(tinted.bar, tint), `${role} bar ${tinted.bar} leans to ${tint}`).toBeLessThan(distance(neutral.bar, tint))
        expect.soft(distance(tinted.bottom, tint), `${role} message ${tinted.bottom} leans to ${tint}`).toBeLessThan(distance(muted, tint))
        expect.soft(distance(tinted.icon, tint), `${role} append icon ${tinted.icon} leans to ${tint}`).toBeLessThan(distance(muted, tint))
      }
    })

    test(`option cards mark the selected tile (${mode})`, async ({ page }) => {
      await openForms(page, mode)
      const focus = await resolvedColor(page, '--qds-stroke-focus')

      for (const [hook, control] of [['qds-forms-option-cards-radio', '.q-radio'], ['qds-forms-option-cards-checkbox', '.q-checkbox']] as const) {
        const tiles = page.locator(`${byHook(hook)} .qds-option-group--card ${control}`)
        const selected = tiles.and(page.locator('[aria-checked="true"]')).first()
        const unselected = tiles.and(page.locator('[aria-checked="false"]:not([aria-disabled="true"])')).first()
        // The tile stroke may live on the element or its ::before.
        const read = (tile: typeof selected) =>
          tile.evaluate((element) => {
            const style = getComputedStyle(element)
            const before = getComputedStyle(element, '::before')
            const stroke = Number.parseFloat(style.borderTopWidth) > 0 ? style : before
            return { border: stroke.borderTopColor, width: Number.parseFloat(stroke.borderTopWidth), background: style.backgroundColor }
          })
        const on = await read(selected)
        const off = await read(unselected)
        expect.soft(off.width, `${hook} tiles are bordered`).toBeGreaterThan(0)
        expect.soft(distance(on.border, focus), `${hook} selected stroke ${on.border} leans to the focus stroke`).toBeLessThan(distance(off.border, focus))
        expect.soft(on.background, `${hook} selected tile carries a soft tint`).not.toBe(off.background)
      }
    })

    test(`settings cards use card tokens and right-align their action (${mode})`, async ({ page }) => {
      await openForms(page, mode)
      const fill = await resolvedColor(page, '--qds-card-fill')
      const stroke = await resolvedColor(page, '--qds-card-stroke')
      const cards = page.locator(`${byHook('qds-forms-settings-group')} > .qds-settings-card`)
      await expect(cards).toHaveCount(4)

      for (const card of await cards.all()) {
        const paint = await card.evaluate((element) => {
          // An expander paints its card on the header row.
          const surface = getComputedStyle(element).backgroundColor === 'rgba(0, 0, 0, 0)' ? element.querySelector('.q-expansion-item__container > .q-item') ?? element : element
          const style = getComputedStyle(surface)
          const before = getComputedStyle(surface, '::before')
          const border = Number.parseFloat(style.borderTopWidth) > 0 ? style : before
          const box = (selector: string) => element.querySelector(selector)?.getBoundingClientRect() ?? null
          return {
            name: element.getAttribute('data-test'),
            background: style.backgroundColor,
            border: border.borderTopColor,
            borderWidth: Number.parseFloat(border.borderTopWidth),
            contentEnd: element.getBoundingClientRect().right - Number.parseFloat(getComputedStyle(element).borderInlineEndWidth) - Number.parseFloat(getComputedStyle(element).paddingInlineEnd),
            icon: box('.qds-settings-card__icon'),
            header: box('.qds-settings-card__header'),
            description: box('.qds-settings-card__description'),
            action: box('.qds-settings-card__action'),
          }
        })
        expect.soft(paint.background, `${paint.name} uses the card fill`).toBe(fill)
        expect.soft(paint.borderWidth, `${paint.name} draws a card stroke`).toBeGreaterThan(0)
        expect.soft(paint.border, `${paint.name} uses the card stroke`).toBe(stroke)
        expect(paint.icon && paint.header && paint.action, `${paint.name} renders icon, header and action`).toBeTruthy()
        expect.soft(paint.icon!.right, `${paint.name} icon leads the header`).toBeLessThanOrEqual(paint.header!.left + 0.5)
        if (paint.name === 'qds-forms-settings-accent') continue
        // Narrow cards may wrap the action onto its own row below the description.
        const wrapped = paint.action!.top >= paint.description!.bottom - 0.5
        if (!wrapped) expect.soft(Math.abs(paint.contentEnd - paint.action!.right), `${paint.name} action sits at the inline end`).toBeLessThanOrEqual(1)
      }

      const expander = page.locator(byHook('qds-forms-settings-accent'))
      await expect(expander.locator('.q-expansion-item__container > .q-item .qds-settings-card__header'), 'expander header uses the card anatomy').toHaveText('Accent color')
      expect.soft(await expander.locator('.q-expansion-item__content').evaluate((content) => getComputedStyle(content).backgroundColor), 'expander content sits on the card fill').toBe(fill)
      const swatches = expander.locator('.q-expansion-item__content [role="radio"]')
      await expect(swatches, 'expander content is attached and open').toHaveCount(7)
      await expect(swatches.first()).toBeVisible()
      await expander.locator('.q-expansion-item__container > .q-item').click()
      await expect(swatches.first(), 'expander collapses').toBeHidden()
      await expander.locator('.q-expansion-item__container > .q-item').click()
      await expect(swatches.first(), 'expander reopens').toBeVisible()
      await swatches.nth(3).click()
      await expect(swatches.nth(3)).toHaveAttribute('aria-checked', 'true')
      await expect(expander.locator('.qds-settings-card__action')).toHaveText('Green')
    })
  }

  test('category pills glow on hover and selection', async ({ page }, testInfo) => {
    await openForms(page, 'light')
    const pills = page.locator(`${byHook('qds-forms-pills')} .q-chip`)
    await expect(pills).toHaveCount(6)
    const shadow = (index: number) => pills.nth(index).evaluate((chip) => getComputedStyle(chip).boxShadow)

    const selected = page.locator(`${byHook('qds-forms-pills')} .q-chip--selected`)
    await expect(selected).toHaveCount(1)
    expect.soft(await shadow(0), 'unselected pill has no glow at rest').toBe('none')
    expect.soft(await selected.evaluate((chip) => getComputedStyle(chip).boxShadow), 'selected pill glows').not.toBe('none')

    const icons = await pills.evaluateAll((chips) =>
      chips.map((chip) => ({ chip: getComputedStyle(chip).color, icon: getComputedStyle(chip.querySelector('.q-chip__content svg') ?? chip).color })),
    )
    for (const [index, { chip, icon }] of icons.entries()) expect.soft(icon, `pill ${index} icon is coloured`).not.toBe(chip)

    const rest = await shadow(0)
    if (testInfo.project.name === 'desktop') {
      await pills.nth(0).hover()
      await expect.poll(() => shadow(0), 'hovered pill glows').not.toBe(rest)
      expect.soft(await shadow(0), 'hover glow is a shadow').not.toBe('none')
      await page.mouse.move(0, 0)
    }
    await pills.nth(0).click()
    await expect(pills.nth(0)).toHaveClass(/q-chip--selected/)
    await expect.poll(() => shadow(0), 'newly selected pill glows').not.toBe('none')
  })

  for (const variant of ['ink', 'term'] as const) {
    test(`category pills stay flat in ${variant}`, async ({ page }, testInfo) => {
      await openForms(page, 'light', variant)
      const pills = page.locator(`${byHook('qds-forms-pills')} .q-chip`)
      const selected = page.locator(`${byHook('qds-forms-pills')} .q-chip--selected`)
      await expect(selected).toHaveCount(1)
      expect.soft(await selected.evaluate((chip) => getComputedStyle(chip).boxShadow), `${variant} selected pill has no glow`).toBe('none')
      if (testInfo.project.name === 'desktop') {
        await pills.nth(0).hover()
        await settle(page)
        expect.soft(await pills.nth(0).evaluate((chip) => getComputedStyle(chip).boxShadow), `${variant} hovered pill has no glow`).toBe('none')
      }
    })
  }

  test('accent swatches follow the radiogroup arrow-key pattern', async ({ page }) => {
    await openForms(page, 'light')
    const group = page.locator(byHook('qds-forms-settings-swatches'))
    const checked = group.locator('[aria-checked="true"]')
    const before = await checked.getAttribute('aria-label')
    await checked.focus()
    await page.keyboard.press('ArrowRight')
    await expect(checked).not.toHaveAttribute('aria-label', before ?? '')
    await expect(checked).toBeFocused()
    await expect(group.locator('[tabindex="0"]')).toHaveCount(1)
  })

  test('required fields show a mark', async ({ page }) => {
    await openForms(page, 'light')
    for (const hook of ['qds-forms-required', 'qds-forms-required-aria', 'qds-forms-required-class']) {
      expect.soft(await pseudoContent(page, `${byHook(hook)} .q-field__label`), `${hook} label shows a required mark`).toContain('*')
    }
    expect.soft(await pseudoContent(page, `${byHook('qds-forms-anatomy-field')} .qds-form-field__label`), 'required form field label shows a mark').toContain('*')
    expect.soft(await pseudoContent(page, `${byHook('qds-forms-state-rest')} .q-field__label`), 'optional field has no mark').not.toContain('*')
    expect.soft(await pseudoContent(page, `${byHook('qds-forms-anatomy-error')} .qds-form-field__label`), 'optional form field has no mark').not.toContain('*')
  })

  test('sizes follow the 24 / 32 / 40 ramp', async ({ page }) => {
    await openForms(page, 'light')
    const tokens = {
      dense: await tokenLength(page, '--qds-field-size-sm'),
      default: await tokenLength(page, '--qds-field-size-md'),
      lg: await tokenLength(page, '--qds-field-size-lg'),
    }
    if (!(await coarsePointer(page))) expect(tokens, 'fine-pointer Fluent ramp').toEqual({ dense: 24, default: 32, lg: 40 })
    for (const variant of ['outlined', 'filled', 'standout', 'ghost', 'borderless']) {
      for (const size of ['dense', 'default', 'lg'] as const) {
        const { height } = await paint(page, field(`qds-forms-variant-${variant}-${size}`))
        expect.soft(height, `${variant} ${size} control height`).toBeCloseTo(tokens[size], 0)
      }
    }
  })

  test('ghost fields are borderless and fill on hover and focus', async ({ page }, testInfo) => {
    await openForms(page, 'light')
    const target = field('qds-forms-variant-ghost-default')
    const rest = await paint(page, target)
    expect(isTransparent(rest.background), `ghost rest background ${rest.background} is clear`).toBe(true)
    expect(rest.borderWidths, 'ghost draws no stroke').toEqual([0, 0, 0, 0])

    if (testInfo.project.name === 'desktop') {
      await page.locator(`${target} .q-field__control`).hover()
      await expect.poll(async () => isTransparent((await paint(page, target)).background), 'ghost fills on hover').toBe(false)
      await page.mouse.move(0, 0)
    }
    await page.locator(`${target} input`).focus()
    await expect.poll(async () => isTransparent((await paint(page, target)).background), 'ghost fills on focus').toBe(false)
  })

  for (const hook of ['qds-forms-field-group-pair', 'qds-forms-field-group-button-first']) {
    test(`two-child field group stays on one row (${hook})`, async ({ page }) => {
      await openForms(page, 'light')
      const group = page.locator(byHook(hook))
      for (const width of [page.viewportSize()!.width, 393]) {
        await page.setViewportSize({ width, height: page.viewportSize()!.height })
        // QLayout swaps the persistent drawer for an overlay on a debounced resize, so the row
        // keeps the previous content width until that lands. Wait for the measured group itself
        // to hold the same geometry across consecutive frames before reading the seam.
        await page.evaluate(() => { delete (window as unknown as Record<string, unknown>).__qdsSeamPrev })
        await page.waitForFunction((selector) => {
          const element = document.querySelector(selector)
          if (!element) return false
          const box = element.getBoundingClientRect()
          const current = `${Math.round(box.left)}:${Math.round(box.width)}`
          const store = window as unknown as Record<string, unknown>
          const previous = store.__qdsSeamPrev
          store.__qdsSeamPrev = current
          return previous === current
        }, byHook(hook))
        const [first, last] = await group.evaluate((element) =>
          [...element.children].map((child) => {
            const box = (child.classList.contains('q-btn') ? child : child.querySelector('.q-field__control')) as HTMLElement
            const style = getComputedStyle(box)
            const r = box.getBoundingClientRect()
            const radius = (value: string) => Number.parseFloat(value) || 0
            return {
              left: r.left, right: r.right, top: r.top, height: r.height,
              startStart: radius(style.borderStartStartRadius), startEnd: radius(style.borderStartEndRadius),
              endStart: radius(style.borderEndStartRadius), endEnd: radius(style.borderEndEndRadius),
            }
          }),
        )
        expect.soft(Math.abs(last.top - first.top), `${width}px children share a row`).toBeLessThanOrEqual(1)
        expect.soft(Math.abs(last.height - first.height), `${width}px children share a height`).toBeLessThanOrEqual(1)
        expect.soft(Math.min(first.height, last.height), `${width}px button keeps a usable target`).toBeGreaterThanOrEqual(24)
        expect.soft(last.left - first.right, `${width}px seam leaves no gap`).toBeLessThanOrEqual(0.5)
        expect.soft(last.left - first.right, `${width}px seam overlaps at most a hairline`).toBeGreaterThanOrEqual(-2)
        expect.soft(first.startStart > 0 && first.endStart > 0 && first.startEnd + first.endEnd === 0, `${width}px first child rounds only its outer corners`).toBe(true)
        expect.soft(last.startEnd > 0 && last.endEnd > 0 && last.startStart + last.endStart === 0, `${width}px last child rounds only its outer corners`).toBe(true)
      }
    })
  }

  for (const variant of CANONICAL_VARIANTS) {
    test(`field group joins its children (${variant})`, async ({ page }) => {
      await openForms(page, 'light', variant)
      const group = page.locator(byHook('qds-forms-field-group'))
      await expect(group).toHaveClass(/qds-field-group/)
      const measure = () =>
        group.evaluate((element) =>
          [...element.children].map((child) => {
            const box = (child.classList.contains('q-btn') ? child : child.querySelector('.q-field__control')) as HTMLElement
            const style = getComputedStyle(box)
            const stroke = getComputedStyle(box, '::before')
            const r = box.getBoundingClientRect()
            const radius = (value: string) => Number.parseFloat(value) || 0
            const z = getComputedStyle(child).zIndex
            return {
              left: r.left,
              right: r.right,
              top: r.top,
              height: r.height,
              z: z === 'auto' ? 0 : Number(z),
              startStart: radius(style.borderStartStartRadius),
              startEnd: radius(style.borderStartEndRadius),
              endStart: radius(style.borderEndStartRadius),
              endEnd: radius(style.borderEndEndRadius),
              strokeStart: Number.parseFloat(stroke.borderInlineStartWidth) || 0,
              strokeEnd: Number.parseFloat(stroke.borderInlineEndWidth) || 0,
            }
          }),
        )

      const parts = await measure()
      const fill = await group.locator('.q-btn').evaluate((button) => getComputedStyle(button).backgroundColor)
      expect.soft(isTransparent(fill), `group button keeps its colour fill (${fill})`).toBe(false)
      expect(parts.length, 'input, select and button').toBe(3)
      const [first, middle, last] = parts
      const wrapped = await page.evaluate(() => matchMedia('(max-width: 30rem)').matches)
      if (wrapped) {
        expect.soft(first.startStart > 0 && first.startEnd > 0, 'wrapped first row keeps its top radii').toBe(true)
        expect.soft(first.endStart + first.endEnd, 'wrapped first row squares its bottom corners').toBe(0)
        expect.soft(middle.endStart > 0 && middle.startStart + middle.startEnd + middle.endEnd === 0, 'second row starts with the bottom-start radius only').toBe(true)
        expect.soft(last.endEnd > 0 && last.startStart + last.startEnd + last.endStart === 0, 'second row ends with the bottom-end radius only').toBe(true)
        expect.soft(Math.abs(middle.left - first.left), 'second row aligns with the first').toBeLessThanOrEqual(1)
        const seam = middle.top - (first.top + first.height)
        expect.soft(seam, 'rows meet without a gap').toBeLessThanOrEqual(0.5)
        expect.soft(seam, 'rows overlap at most a hairline').toBeGreaterThanOrEqual(-2)
      } else {
        expect.soft(first.startStart > 0 && first.endStart > 0, 'first child keeps its outer radii').toBe(true)
        expect.soft(first.startEnd + first.endEnd, 'first child squares its inner corners').toBe(0)
        expect.soft(middle.startStart + middle.startEnd + middle.endStart + middle.endEnd, 'middle child is square').toBe(0)
        expect.soft(last.startEnd > 0 && last.endEnd > 0, 'last child keeps its outer radii').toBe(true)
        expect.soft(last.startStart + last.endStart, 'last child squares its inner corners').toBe(0)
      }

      for (const [index, [prev, next]] of (wrapped ? [[middle, last]] : [[first, middle], [middle, last]]).entries()) {
        const gap = next.left - prev.right
        expect.soft(gap, `seam ${index} leaves no gap`).toBeLessThanOrEqual(0.5)
        expect.soft(gap, `seam ${index} overlaps at most a hairline`).toBeGreaterThanOrEqual(-2)
        if (gap > -0.5) expect.soft(Math.min(prev.strokeEnd, next.strokeStart), `seam ${index} draws a single stroke`).toBe(0)
        expect.soft(Math.abs(next.top - prev.top), `seam ${index} children share a row`).toBeLessThanOrEqual(1)
        expect.soft(Math.abs(next.height - prev.height), `seam ${index} children share a height`).toBeLessThanOrEqual(1)
      }

      await page.locator(`${byHook('qds-forms-field-group')} .q-input input`).focus()
      await page.keyboard.press('Tab')
      if (!(await coarsePointer(page))) await page.locator(`${byHook('qds-forms-field-group')} .q-btn`).hover()
      await expect(page.locator(`${byHook('qds-forms-field-group')} .q-select`)).toHaveClass(/q-field--highlighted/)
      await expect
        .poll(async () => {
          const [input, select, button] = await measure()
          return select.z - Math.max(input.z, button.z)
        }, 'focused child sits above its siblings once the blurred field settles')
        .toBeGreaterThan(0)
    })
  }

  test('kbd hints render as keycaps', async ({ page }) => {
    await openForms(page, 'light')
    const caps = await page.locator(`${byHook('qds-forms-kbd')} kbd`).evaluateAll((elements) =>
      elements.map((element) => {
        const style = getComputedStyle(element)
        return {
          className: element.className,
          border: Number.parseFloat(style.borderBottomWidth),
          radius: Number.parseFloat(style.borderTopLeftRadius),
          padding: Number.parseFloat(style.paddingInlineStart),
        }
      }),
    )
    expect(caps.some((cap) => cap.className.includes('qds-kbd')), 'demo has .qds-kbd caps').toBe(true)
    expect(caps.some((cap) => !cap.className.includes('qds-kbd')), 'demo has a bare kbd').toBe(true)
    for (const cap of caps) {
      expect.soft(cap.border, `${cap.className || 'kbd'} has a keycap border`).toBeGreaterThan(0)
      expect.soft(cap.radius, `${cap.className || 'kbd'} is rounded`).toBeGreaterThan(0)
      expect.soft(cap.padding, `${cap.className || 'kbd'} has inline padding`).toBeGreaterThan(0)
    }
  })

  test('anatomy places hint, description, help and error', async ({ page }, testInfo) => {
    await openForms(page, 'light')
    const anatomy = byHook('qds-forms-anatomy-field')
    const header = await rect(page, `${anatomy} .qds-form-field__header`)
    const label = await rect(page, `${anatomy} .qds-form-field__label`)
    const hint = await rect(page, `${anatomy} .qds-form-field__hint`)
    const description = await rect(page, `${anatomy} .qds-form-field__description`)
    const control = await rect(page, `${anatomy} .q-field__control`)
    const help = await rect(page, `${anatomy} .qds-form-field__help`)
    expect.soft(Math.abs(hint.right - header.right), 'hint sits at the header end').toBeLessThanOrEqual(1)
    expect.soft(Math.abs((hint.top + hint.bottom) / 2 - (label.top + label.bottom) / 2), 'hint shares the label row').toBeLessThanOrEqual(label.height / 2)
    expect.soft(description.top, 'description follows the label').toBeGreaterThanOrEqual(label.bottom - 0.5)
    expect.soft(control.top, 'control follows the description').toBeGreaterThanOrEqual(description.bottom - 0.5)
    expect.soft(help.top, 'help follows the control').toBeGreaterThanOrEqual(control.bottom - 0.5)

    const errorBlock = byHook('qds-forms-anatomy-error')
    await expect(page.locator(`${errorBlock} .qds-form-field__help`), 'error replaces help').toBeHidden()
    await expect(page.locator(`${errorBlock} .qds-form-field__error`)).toBeVisible()
    const negative = await resolvedColor(page, '--qds-color-negative')
    const text = await resolvedColor(page, '--qds-fg-default')
    const errorColor = await page.locator(`${errorBlock} .qds-form-field__error`).evaluate((element) => getComputedStyle(element).color)
    expect.soft(distance(errorColor, negative), `error text ${errorColor} is negative-toned`).toBeLessThan(distance(errorColor, text))

    const slot = byHook('qds-forms-label-hint')
    const slotHint = await rect(page, `${slot} .qds-field__hint`)
    const slotControl = await rect(page, `${slot} .q-field__control`)
    expect.soft(Math.abs(slotHint.right - slotControl.right), 'label-slot hint aligns to the field end').toBeLessThanOrEqual(2)
    expect.soft(slotHint.bottom, 'label-slot hint stays above the control').toBeLessThanOrEqual(slotControl.top + 1)

    const horizontal = byHook('qds-forms-horizontal')
    const hLabel = await rect(page, `${horizontal} .qds-form-field__label`)
    const hControl = await rect(page, `${horizontal} .q-field__control`)
    if (testInfo.project.name === 'desktop') {
      expect.soft(hLabel.right, 'horizontal label column precedes the control').toBeLessThanOrEqual(hControl.left)
    } else {
      expect.soft(hLabel.bottom, 'horizontal field stacks on narrow viewports').toBeLessThanOrEqual(hControl.top)
    }
  })

  test('compositions size their parts to the field', async ({ page }) => {
    await openForms(page, 'light')
    for (const hook of ['qds-forms-stepper', 'qds-forms-password', 'qds-forms-copy']) {
      const control = await rect(page, `${byHook(hook)} .q-field__control`)
      const buttons = page.locator(`${byHook(hook)} .q-field__append .q-btn`)
      await expect(buttons.first(), `${hook} renders an append action`).toBeVisible()
      for (const button of await buttons.all()) {
        const box = (await button.boundingBox())!
        expect.soft(box.height, `${hook} append action fits inside the field`).toBeLessThanOrEqual(control.height)
      }
    }

    await page.locator(`${byHook('qds-forms-clearable')} input`).focus()
    await expect(page.locator(`${byHook('qds-forms-clearable')} .q-field__focusable-action`), 'clearable renders its action').toBeVisible()

    const seats = page.locator(`${byHook('qds-forms-stepper')} input`)
    await expect(seats).toHaveAttribute('type', 'number')
    await expect(seats).toHaveValue('12')
    await page.getByRole('button', { name: 'Add a seat' }).click()
    await expect(seats).toHaveValue('13')

    await expect(page.locator(`${byHook('qds-forms-tags')} .q-chip`)).toHaveCount(2)
    await expect(page.locator(`${byHook('qds-forms-counter')} .q-field__counter`)).toContainText('/ 160')

    const dashed = await page.locator(`${byHook('qds-forms-dropzone')} .q-field__control`).evaluate((control) =>
      [getComputedStyle(control), getComputedStyle(control, '::before')].some((style) => style.borderTopStyle === 'dashed'),
    )
    expect.soft(dashed, 'dropzone draws a dashed tile').toBe(true)

    const pins = await page.locator(`${byHook('qds-forms-pin')} .q-field__control`).evaluateAll((controls) =>
      controls.map((control) => control.getBoundingClientRect()).map(({ width, height }) => ({ width, height })),
    )
    expect(pins.length, 'six code digits').toBe(6)
    for (const pin of pins) expect.soft(Math.abs(pin.width - pin.height), 'PIN cell is square').toBeLessThanOrEqual(1)

    await page.locator(`${byHook('qds-forms-pin')} input`).nth(3).fill('7')
    await expect(page.locator(`${byHook('qds-forms-pin')} input`).nth(4), 'PIN entry advances focus').toBeFocused()
  })
})
