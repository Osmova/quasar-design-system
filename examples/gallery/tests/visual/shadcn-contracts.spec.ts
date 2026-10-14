import { expect, test, type Page } from '@playwright/test'
import { expectations, expectationSlots, stateExpectations, stateExpectationSlots } from '../../../../tests/runtime/shadcn-expectations.mjs'
import { SHADCN_PALETTES, CANONICAL_VARIANTS, applyShadcn, applyTheme, computed, resolvedColor } from './helpers'
import { assertNoPageOverflow, focusBoundaryContrast, native, paint, settle } from './shadcn-browser'

const roles = ['primary', 'secondary', 'accent', 'positive', 'negative', 'warning', 'info']
const rgb = (hex: string) => hex.match(/../g)!.map(value => parseInt(value, 16))
const cell = (table: string[][], key: string, slots: string[], slot: string) => rgb(table.find(row => row[0] === key)![slots.indexOf(slot) + 1])

async function keyboardFocus(page: Page, selector: string) {
  await page.keyboard.press('Tab')
  await page.locator(selector).first().focus()
  await expect(page.locator(selector).first()).toBeFocused()
  expect(await page.locator(selector).first().evaluate(element => element.matches(':focus-visible'))).toBe(true)
  await settle(page)
}

for (const entry of ['/conformance.html', '/conformance-layered.html']) {
  for (const palette of SHADCN_PALETTES) for (const mode of ['light', 'dark'] as const) {
    test(`shadcn source-calibrated role states and standalone ${entry} ${palette}/${mode}`, async ({ page }) => {
      test.setTimeout(120_000)
      const consoleErrors: string[] = []
      const failedRequests: string[] = []
      page.on('pageerror', error => consoleErrors.push(error.message))
      page.on('requestfailed', request => failedRequests.push(request.url()))
      await page.goto(entry)
      await applyShadcn(page, mode, palette)
      await settle(page)
      const key = `${palette}-${mode}`
      expect(await page.evaluate(() => [...document.styleSheets].some(sheet => sheet.href?.includes('gallery'))), 'no gallery helper stylesheet').toBe(false)
      expect(await page.locator('[data-conformance]').evaluate(element => getComputedStyle(element).fontFamily)).toContain('Inter')
      expect((await paint(page.locator(native('default-button')))).background).toEqual(cell(expectations, key, expectationSlots, 'color-primary'))

      for (const role of roles) {
        const selector = `[data-role="${role}"]`
        const button = page.locator(selector)
        const rest = await paint(button)
        expect(rest.textContrast, `${role} rest foreground`).toBeGreaterThanOrEqual(4.5)
        await button.hover()
        await settle(page)
        const hover = await paint(button)
        expect(hover.background, `${role} hover matches calibrated source`).toEqual(cell(stateExpectations, key, stateExpectationSlots, `color-${role}-hover`))
        expect(hover.color, `${role} hover keeps on-fill`).toEqual(rest.color)
        expect(hover.textContrast, `${role} hover contrast`).toBeGreaterThanOrEqual(4.5)
        await page.mouse.down()
        try {
          await settle(page)
          const pressed = await paint(button)
          expect(pressed.background, `${role} pressed matches calibrated source`).toEqual(cell(stateExpectations, key, stateExpectationSlots, `color-${role}-pressed`))
          expect(pressed.color, `${role} pressed keeps on-fill`).toEqual(rest.color)
          expect(pressed.textContrast, `${role} pressed contrast`).toBeGreaterThanOrEqual(4.5)
        } finally { await page.mouse.up() }
        await page.mouse.move(0, 0)
      }
      expect(await computed(page, native('default-button'), 'text-transform')).toBe('none')
      expect(await computed(page, native('weight'), 'font-weight')).toBe('700')
      expect(await computed(page, native('literal'), 'background-color')).toBe('rgb(229, 57, 53)')
      expect(await computed(page, native('literal'), 'color')).toBe('rgb(255, 255, 255)')
      expect(await computed(page, native('author-inline'), 'color')).toBe(await resolvedColor(page, '--qds-text-on-primary'))
      expect(await computed(page, native('author-important'), 'color')).toBe('rgb(255, 0, 255)')
      // Direct literal and disabled fixtures are author intent/WCAG exemptions;
      // they are not silently used to lower the semantic contrast requirement.
      await keyboardFocus(page, native('default-button'))
      const focused = await paint(page.locator(native('default-button')))
      expect(focused.outlineStyle).not.toBe('none')
      expect(focused.outlineWidth).toBeGreaterThanOrEqual(2)
      expect(focused.focusContrast, 'meaningful focus boundary').toBeGreaterThanOrEqual(3)
      await keyboardFocus(page, '[data-native="anatomy"] input')
      const field = page.locator('[data-native="anatomy"] .q-field').first()
      await expect(field).toHaveClass(/q-field--focused/)
      const focusFrame = await field.locator('.q-field__control').evaluate(element => {
        const style = getComputedStyle(element, '::after')
        const sides = [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth].map(parseFloat)
        return style.display === 'none' || style.content === 'none' || sides[2] === 0 || sides.every(width => width === sides[2])
      })
      expect(focusFrame, 'focus may use a native perimeter, never a Fluent-only bottom bar').toBe(true)
      await page.locator(native('default-button')).focus()
      const boundary = await paint(page.locator('[data-native="anatomy"] .q-field__control').first())
      expect(boundary.borderContrast, 'enabled input boundary against actual surface').toBeGreaterThanOrEqual(3)

      for (const localMode of ['dark', 'light'] as const) {
        const group = page.locator(`[data-scheme="${localMode}"]`)
        for (const family of ['card', 'input', 'select', 'file', 'checkbox', 'radio', 'toggle', 'slider', 'range', 'color', 'date', 'time', 'list', 'panels', 'table', 'markup', 'pagination', 'progress', 'skeleton', 'tree', 'stepper', 'timeline', 'chat', 'carousel', 'uploader']) {
          const component = group.locator(`[data-native="${family}"]`).first()
          await expect(component).toBeAttached()
          const localPrimary = await component.evaluate(element => {
            // QInput forwards attributes to a void input node. Resolve at its
            // native QField scheme boundary, never in a non-rendered child.
            const owner = element.closest('.q-field') ?? element
            const probe = document.createElement('span')
            probe.style.color = 'var(--q-primary)'
            owner.append(probe)
            const color = getComputedStyle(probe).color
            probe.remove()
            return color
          })
          const source = cell(expectations, `${palette}-${localMode}`, expectationSlots, 'color-primary')
          expect(localPrimary, `${family} native ${localMode} complete palette bridge`).toBe(`rgb(${source.join(', ')})`)
        }
      }
      await assertNoPageOverflow(page)
      expect(consoleErrors).toEqual([])
      expect(failedRequests).toEqual([])
    })
  }
}

for (const palette of SHADCN_PALETTES) for (const mode of ['light', 'dark'] as const) {
  test(`shadcn controller persistence/system/native switching ${palette}/${mode}`, async ({ page }) => {
    await page.goto('/conformance.html?persist=1')
    await applyShadcn(page, mode, palette)
    const painted = await computed(page, native('default-button'), 'background-color')
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('qds.shadcn.conformance')!))
    expect(stored).toEqual({ mode, variant: 'shadcn', shadcnBaseColor: palette })
    await page.reload()
    await expect(page.locator('body')).toHaveAttribute('data-qds-shadcn-base-color', palette)
    expect(await computed(page, native('default-button'), 'background-color')).toBe(painted)
    for (const variant of CANONICAL_VARIANTS) {
      await applyTheme(page, mode, variant)
      if (variant !== 'shadcn') await expect(page.locator('body')).not.toHaveAttribute('data-qds-shadcn-base-color')
    }
    await applyShadcn(page, mode, palette)
    expect(await computed(page, native('default-button'), 'background-color')).toBe(painted)
    await page.evaluate(() => (window as unknown as { __qdsGallery: { setMode: (value: string) => void } }).__qdsGallery.setMode('system'))
    await page.emulateMedia({ colorScheme: 'dark' })
    await expect(page.locator('body')).toHaveAttribute('data-qds-resolved', 'dark')
    await page.emulateMedia({ colorScheme: 'light' })
    const body = page.locator('body')
    await expect(body).toHaveAttribute('data-qds-resolved', 'light')
    await expect(body).toHaveClass(/qds-theme-light/)
    await expect(body).not.toHaveClass(/body--dark/)
    const neutralLight = cell(expectations, 'neutral-light', expectationSlots, 'color-primary')
    const physicalBackground = async () => (await paint(page.locator(native('default-button')))).background
    // CSS-only adoption: genuine mounted native controls, no generated specimen.
    await page.evaluate(() => { document.body.removeAttribute('data-qds-shadcn-base-color') })
    await expect.poll(physicalBackground, { message: 'omitted CSS palette reaches frozen Neutral/light paint' }).toEqual(neutralLight)
    await page.evaluate(() => { document.body.setAttribute('data-qds-shadcn-base-color', 'invalid') })
    await expect.poll(physicalBackground, { message: 'invalid CSS palette reaches frozen Neutral/light paint' }).toEqual(neutralLight)
    await page.evaluate(() => (window as unknown as { __qdsGallery: { setShadcnBaseColor: (value: string) => void } }).__qdsGallery.setShadcnBaseColor('invalid'))
    await expect(body).toHaveAttribute('data-qds-shadcn-base-color', 'neutral')
    await expect.poll(physicalBackground, { message: 'invalid JS palette reaches frozen Neutral/light paint' }).toEqual(neutralLight)
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('qds.shadcn.conformance')!))).toEqual({ mode: 'system', variant: 'shadcn', shadcnBaseColor: 'neutral' })
  })
}

test('shadcn controlled native RTL/forced colors/reduced motion/transparency/contrast', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active', contrast: 'more' })
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setEmulatedMedia', { features: [
    { name: 'prefers-reduced-motion', value: 'reduce' }, { name: 'forced-colors', value: 'active' },
    { name: 'prefers-reduced-transparency', value: 'reduce' }, { name: 'prefers-contrast', value: 'more' },
  ] })
  await page.goto('/conformance.html')
  await applyShadcn(page, 'dark', 'slate')
  expect(await page.evaluate(() => ['(prefers-reduced-motion: reduce)', '(forced-colors: active)', '(prefers-reduced-transparency: reduce)', '(prefers-contrast: more)'].every(query => matchMedia(query).matches))).toBe(true)
  await page.getByRole('button', { name: 'Native RTL', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await keyboardFocus(page, native('default-button'))
  const focus = await paint(page.locator(native('default-button')))
  expect(focus.outlineWidth).toBeGreaterThanOrEqual(2)
  expect(focus.focusContrast).toBeGreaterThanOrEqual(3)
  await expect(page.locator('[data-scheme="dark"] [data-native="slider"]')).toHaveAttribute('aria-orientation', 'horizontal')
  for (const pseudo of [undefined, '::before', '::after']) {
    const duration = await computed(page, '[data-scheme="dark"] [data-native="skeleton"]', 'animation-duration', pseudo)
    expect(parseFloat(duration) * (duration.endsWith('ms') ? 1 : 1000), `native skeleton ${pseudo ?? 'root'} motion`).toBeLessThanOrEqual(0.01)
  }
  expect(await computed(page, '.qds-window', 'backdrop-filter')).toBe('none')
  await assertNoPageOverflow(page)
})

test('native QWindow normal focus / five palettes / author paint / state props', async ({ page }, info) => {
  test.setTimeout(120_000)
  await page.goto('/conformance.html')
  for (const variant of CANONICAL_VARIANTS.filter(variant => variant !== 'shadcn')) for (const mode of ['light', 'dark'] as const) {
    await applyTheme(page, mode, variant)
    await settle(page)
    const window = page.locator('.qds-window')
    await keyboardFocus(page, '.qds-window__action--close')
    const focus = await paint(window.locator('.qds-window__action--close'))
    expect(focus.outlineWidth, `${variant}/${mode} window focus`).toBeGreaterThanOrEqual(2)
    expect.soft(focus.focusContrast, `${variant}/${mode} library-controlled normal window focus`).toBeGreaterThanOrEqual(3)
  }
  const boundaries = []
  for (const palette of SHADCN_PALETTES) for (const mode of ['light', 'dark'] as const) {
    await applyShadcn(page, mode, palette)
    await keyboardFocus(page, '.qds-window__action--close')
    const boundary = await focusBoundaryContrast(page.locator('.qds-window__action--close'))
    boundaries.push({ palette, mode, ...boundary })
    expect.soft(boundary.inside, `${palette}/${mode} focus band against destructive fill`).toBeGreaterThanOrEqual(3)
    expect.soft(boundary.outside, `${palette}/${mode} focus band against native titlebar`).toBeGreaterThanOrEqual(3)
    expect.soft(boundary.text, `${palette}/${mode} close on-fill contrast`).toBeGreaterThanOrEqual(4.5)
    expect(boundary.outerBand).toBe(true)
  }
  await info.attach('qwindow-five-palette-focus-boundaries', { body: JSON.stringify(boundaries), contentType: 'application/json' })
  await test.step('author paint preserves native props/focus; arbitrary author contrast is not a palette guarantee', async () => {
    await page.getByRole('button', { name: 'Toggle author titlebar paint', exact: true }).click()
    for (const variant of CANONICAL_VARIANTS) {
      await applyTheme(page, 'light', variant)
      await keyboardFocus(page, '.qds-window__action--close')
      expect(await computed(page, '.qds-window__titlebar', 'background-color')).toBe('rgb(37, 99, 235)')
      expect((await paint(page.locator('.qds-window__action--close'))).outlineWidth).toBeGreaterThanOrEqual(2)
    }
    await page.getByRole('button', { name: 'Toggle author titlebar paint', exact: true }).click()
  })
  await applyShadcn(page, 'dark', 'neutral')
  // These assert requested wrapper states only; browser fullscreen has its own
  // floating-window user-activation test, and is forbidden while embedded.
  for (const [label, modifier] of [['Window maximize', 'maximized'], ['Window minimize', 'minimized'], ['Window fullscreen requested prop', 'fullscreen'], ['Window headless', 'headless'], ['Window disable', 'disabled']] as const) {
    await page.getByRole('button', { name: label, exact: true }).click()
    await expect(page.locator('.qds-window')).toHaveClass(new RegExp(`qds-window--${modifier}`))
    if (modifier === 'fullscreen' || modifier === 'maximized') await page.locator('.qds-window').getByRole('button', { name: 'Restore window', exact: true }).click()
    else await page.getByRole('button', { name: label, exact: true }).click()
    await expect(page.locator('.qds-window')).not.toHaveClass(new RegExp(`qds-window--${modifier}`))
  }
})

test('layered and unlayered native consumer paint equivalence with author override', async ({ page, context }) => {
  await page.goto('/conformance.html')
  await applyShadcn(page, 'dark', 'stone')
  const other = await context.newPage()
  await other.goto('/conformance-layered.html')
  await applyShadcn(other, 'dark', 'stone')
  await settle(page)
  await settle(other)
  for (const selector of [native('default-button'), '[data-scheme="dark"] .q-card', '[data-scheme="dark"] .q-field__control', '.qds-window__titlebar']) {
    expect(await paint(other.locator(selector).first())).toEqual(await paint(page.locator(selector).first()))
  }
  // Unlayered consumer variables after either bundle must still win. This is a
  // legitimate consumer token override, not a hand-authored component specimen.
  for (const consumer of [page, other]) {
    await consumer.addStyleTag({ content: '.qds-ui { --qds-card-radius: 20px; }' })
    expect(await computed(consumer, '[data-scheme="dark"]', 'border-top-left-radius')).toBe('20px')
  }
  await other.close()
})
