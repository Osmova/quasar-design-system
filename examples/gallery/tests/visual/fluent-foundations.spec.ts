import { expect, test } from '@playwright/test'
import { applyTheme, coarsePointer, computed, customProperty, resolvedColor } from './helpers'

type Rgb = readonly [number, number, number]

function contrast(first: Rgb, second: Rgb) {
  const luminance = ([red, green, blue]: Rgb) => {
    const channel = (value: number) => {
      const normalized = value / 255
      return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
    }

    return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue)
  }

  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a)
  return (lighter + 0.05) / (darker + 0.05)
}

function parseRgb(value: string): Rgb {
  const channels = value.match(/[\d.]+/g)?.slice(0, 3).map(Number)
  if (channels?.length !== 3) throw new Error(`Expected a resolved RGB color, received ${value}`)
  return channels as unknown as Rgb
}

async function tokenColor(page: Parameters<typeof customProperty>[0], token: string) {
  const color = await resolvedColor(page, token)
  return { color, rgb: parseRgb(color) }
}

test.describe('Fluent foundation contract', () => {
  test('uses the 24/32/40 control scale with a label band above the field and an opt-in 48px float field', async ({ page }) => {
    await page.goto('/#components')
    await applyTheme(page, 'light', 'win')

    const panel = '.q-tab-panel'
    const defaultField = '[data-test="qds-control-input"] .q-field'
    const floatField = '[data-test="qds-field-float"] .q-field--outlined.qds-field--float'
    // Coarse pointers step the scale up to 32/40/48px so dense, default and lg stay distinct.
    const coarse = await coarsePointer(page)
    expect(await customProperty(page, '--qds-control-size-sm')).toBe(coarse ? '2rem' : '1.5rem')
    expect(await customProperty(page, '--qds-control-size-md')).toBe(coarse ? '2.5rem' : '2rem')
    expect(await customProperty(page, '--qds-control-size-lg')).toBe(coarse ? '3rem' : '2.5rem')
    expect(await computed(page, `${panel} .q-btn.q-btn--unelevated:not(.q-btn--dense)`, 'min-height')).toBe(coarse ? '40px' : '32px')
    expect(await computed(page, `${defaultField} .q-field__control`, 'min-height'), 'default field control is 32px (40px touch)').toBe(coarse ? '40px' : '32px')
    expect(await computed(page, defaultField, 'padding-top'), 'default field reserves a 20px label line plus 4px gap above the control').toBe('24px')
    expect(await computed(page, `${floatField} .q-field__control`, 'min-height'), 'opt-in float field keeps a 48px label band').toBe('48px')
    expect(await customProperty(page, '--qds-button-dense-min-height')).toBe(coarse ? '2rem' : '1.5rem')
    expect(await customProperty(page, '--qds-field-min-height')).toBe('3rem')
    expect(await customProperty(page, '--qds-field-dense-min-height')).toBe('2.5rem')
    expect(await customProperty(page, '--qds-chip-min-height')).toBe('1.75rem')
    expect(await customProperty(page, '--qds-chip-padding')).toBe('0 .75rem')
    expect(await customProperty(page, '--qds-chip-dense-min-height')).toBe('1.5rem')
    expect(await customProperty(page, '--qds-chip-dense-padding')).toBe('0 .5rem')
    expect(await customProperty(page, '--qds-badge-min-height')).toBe('1.25rem')
    expect(await customProperty(page, '--qds-compact-action-size')).toBe(coarse ? '2.5rem' : '2rem')
    expect(await customProperty(page, '--qds-compact-action-icon-size')).toBe('1rem')

    await applyTheme(page, 'light', 'one')
    expect(await computed(page, `${panel} .q-btn.q-btn--unelevated:not(.q-btn--dense)`, 'min-height')).toBe('44px')
    expect(await computed(page, `${defaultField} .q-field__control`, 'min-height'), 'One default field control meets the 44px touch height').toBe('44px')
    expect(await computed(page, `${floatField} .q-field__control`, 'min-height')).toBe('48px')
    expect(await customProperty(page, '--qds-button-dense-min-height')).toBe('2.5rem')
    expect(await customProperty(page, '--qds-control-size-sm')).toBe('2.5rem')
  })

  test('solid role buttons lighten toward the layer on hover and press and keep their text contrast', async ({ page }) => {
    await page.goto('/#components')
    const parse = (value: string) => {
      const channels = value.match(/[\d.]+/g)!.map(Number)
      const scale = value.startsWith('color(srgb') ? 255 : 1
      return { rgb: [channels[0] * scale, channels[1] * scale, channels[2] * scale] as Rgb, alpha: channels[3] ?? 1 }
    }
    const luminance = (rgb: Rgb) => contrast(rgb, [0, 0, 0]) - 1
    const paint = async () => {
      const [background, color] = await page.locator('#qds-role-probe').evaluate((element) => [getComputedStyle(element).backgroundColor, getComputedStyle(element).color])
      const fill = parse(background)
      const text = parse(color)
      const shown = text.rgb.map((channel, index) => channel * text.alpha + fill.rgb[index] * (1 - text.alpha)) as unknown as Rgb
      return { fill: fill.rgb, ratio: contrast(fill.rgb, shown) }
    }

    const roles = ['primary', 'secondary', 'accent', 'positive', 'negative', 'warning', 'info']
    const states = async (role: string) => {
      await page.evaluate((role) => {
        document.getElementById('qds-role-probe')?.remove()
        const button = document.createElement('button')
        button.id = 'qds-role-probe'
        button.className = `q-btn q-btn-item q-btn--unelevated bg-${role} text-white`
        button.textContent = role
        button.style.cssText = 'position: fixed; inset-block-start: 8px; inset-inline-start: 8px; z-index: 9999; transition: none'
        document.body.append(button)
      }, role)
      await page.mouse.move(0, 0)
      const rest = await paint()
      await page.locator('#qds-role-probe').hover()
      const hover = await paint()
      await page.mouse.down()
      const pressed = await paint()
      await page.mouse.up()
      return { rest, hover, pressed }
    }

    for (const mode of ['light', 'dark'] as const) {
      await applyTheme(page, mode, 'win')
      for (const role of roles) {
        const { rest, hover, pressed } = await states(role)
        const lighter = mode === 'light' ? 1 : -1
        expect.soft(lighter * (luminance(hover.fill) - luminance(rest.fill)), `${mode} ${role} hover moves toward the layer`).toBeGreaterThan(0)
        expect.soft(lighter * (luminance(pressed.fill) - luminance(hover.fill)), `${mode} ${role} press moves further toward the layer`).toBeGreaterThan(0)
        expect.soft(rest.ratio, `${mode} ${role} rest text contrast`).toBeGreaterThanOrEqual(4.5)
        expect.soft(hover.ratio, `${mode} ${role} hover text contrast`).toBeGreaterThanOrEqual(4.5)
        expect.soft(pressed.ratio, `${mode} ${role} pressed secondary text contrast`).toBeGreaterThanOrEqual(3)
      }
    }

    for (const mode of ['light', 'dark'] as const) {
      await applyTheme(page, mode, 'term')
      for (const role of roles) {
        const { rest, hover, pressed } = await states(role)
        if (mode === 'light') {
          expect.soft(luminance(hover.fill), `term ${role} hover keeps darkening`).toBeLessThan(luminance(rest.fill))
          expect.soft(luminance(pressed.fill), `term ${role} press stays at or below hover`).toBeLessThanOrEqual(luminance(hover.fill))
        }
        expect.soft(rest.ratio, `${mode}/term ${role} rest text contrast`).toBeGreaterThanOrEqual(4.5)
        expect.soft(hover.ratio, `${mode}/term ${role} hover text contrast`).toBeGreaterThanOrEqual(4.5)
        expect.soft(pressed.ratio, `${mode}/term ${role} pressed text contrast`).toBeGreaterThanOrEqual(3)
      }
    }

    for (const mode of ['light', 'dark'] as const) {
      await applyTheme(page, mode, 'one')
      for (const role of roles) {
        const { rest, hover, pressed } = await states(role)
        expect.soft(luminance(hover.fill), `${mode}/one ${role} hover darkens under white text`).toBeLessThan(luminance(rest.fill))
        expect.soft(luminance(pressed.fill), `${mode}/one ${role} press stays at or below hover`).toBeLessThanOrEqual(luminance(hover.fill))
        expect.soft(rest.ratio, `${mode}/one ${role} rest text contrast`).toBeGreaterThanOrEqual(4.5)
        expect.soft(hover.ratio, `${mode}/one ${role} hover text contrast`).toBeGreaterThanOrEqual(4.5)
        expect.soft(pressed.ratio, `${mode}/one ${role} pressed text contrast`).toBeGreaterThanOrEqual(3)
      }
    }
  })

  test('uses independently tuned Fluent dark semantic fills, soft surfaces, and focus boundaries', async ({ page }) => {
    await page.goto('/#components')
    await applyTheme(page, 'dark', 'win')

    const roles = ['primary', 'secondary', 'accent', 'positive', 'negative', 'warning', 'info'] as const
    for (const role of roles) {
      const fill = await tokenColor(page, `--qds-color-${role}`)
      const foreground = await tokenColor(page, `--qds-text-on-${role}`)
      expect(contrast(fill.rgb, foreground.rgb), `${role} solid text contrast`).toBeGreaterThanOrEqual(4.5)
    }

    const surface = await tokenColor(page, '--qds-surface-0')
    for (const token of ['--qds-color-primary', '--qds-color-negative']) {
      const boundary = await tokenColor(page, token)
      expect(contrast(boundary.rgb, surface.rgb), `${token} boundary contrast`).toBeGreaterThanOrEqual(3)
    }

    const text = await tokenColor(page, '--qds-text')
    const softTokens = [
      '--qds-surface-brand-soft', '--qds-surface-accent-soft', '--qds-surface-positive-soft',
      '--qds-surface-warning-soft', '--qds-surface-negative-soft', '--qds-surface-info-soft',
      '--qds-surface-focus-block', '--qds-surface-transient',
    ]
    const softColors: string[] = []
    for (const token of softTokens) {
      const soft = await tokenColor(page, token)
      softColors.push(soft.color)
      expect(contrast(text.rgb, soft.rgb), `${token} text contrast`).toBeGreaterThanOrEqual(4.5)
    }
    expect(new Set(softColors).size, 'dark semantic soft surfaces are independently tuned').toBe(softColors.length)
  })
})
