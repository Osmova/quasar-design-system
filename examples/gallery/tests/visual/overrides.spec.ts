import { expect, test } from '@playwright/test'
import { QDS_TOKENS } from '../../../../src/tokens'
import { applyTheme, waitForThemePaint, LEGACY_VARIANTS as CANONICAL_VARIANTS, coarsePointer, computed, customProperty, MATRIX_VARIANTS, resolvedColor, resolvedShadow, type Mode, type LegacyVariant as Variant } from './helpers'

type Rgba = readonly [number, number, number, number]

function contrast(first: Rgba, second: Rgba) {
  const luminance = ([red, green, blue]: Rgba) => {
    const channel = (value: number) => {
      const normalized = value / 255
      return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue)
  }
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a)
  return (lighter + 0.05) / (darker + 0.05)
}

function parseColor(value: string): Rgba {
  const channels = value.match(/[\d.]+/g)?.map(Number)
  if (!channels || channels.length < 3) throw new Error(`Expected an RGB color, received ${value}`)
  const scale = value.startsWith('color(srgb') ? 255 : 1
  return [channels[0] * scale, channels[1] * scale, channels[2] * scale, channels[3] ?? 1]
}

function composite(foreground: Rgba, backdrop: Rgba): Rgba {
  const alpha = foreground[3] + backdrop[3] * (1 - foreground[3])
  return [
    (foreground[0] * foreground[3] + backdrop[0] * backdrop[3] * (1 - foreground[3])) / alpha,
    (foreground[1] * foreground[3] + backdrop[1] * backdrop[3] * (1 - foreground[3])) / alpha,
    (foreground[2] * foreground[3] + backdrop[2] * backdrop[3] * (1 - foreground[3])) / alpha,
    alpha,
  ]
}

async function renderedContrast(page: Parameters<typeof computed>[0], selector: string, backdropSelector: string) {
  let previous: string | undefined
  let connectedPaint: { foreground: string; background: string; backdrop: string } | undefined
  await expect.poll(async () => {
    const snapshot = await page.evaluate(({ selector, backdropSelector }) => {
      const element = document.querySelector(selector)
      const backdrop = element?.closest(backdropSelector) ?? document.querySelector(backdropSelector)
      if (!element?.isConnected || !backdrop?.isConnected) return null
      const style = getComputedStyle(element)
      const paint = { foreground: style.color, background: style.backgroundColor, backdrop: getComputedStyle(backdrop).backgroundColor }
      return element.isConnected && backdrop.isConnected && Object.values(paint).every(Boolean) ? paint : null
    }, { selector, backdropSelector })
    if (!snapshot) { previous = undefined; connectedPaint = undefined; return false }
    const key = JSON.stringify(snapshot)
    const stable = key === previous
    previous = key
    if (stable) connectedPaint = snapshot
    return stable
  }, { message: `${selector} has connected, atomically sampled settled paint` }).toBe(true)
  const { foreground, background, backdrop } = connectedPaint!
  return contrast(parseColor(foreground), composite(parseColor(background), parseColor(backdrop)))
}

async function renderedBoundaryContrast(page: Parameters<typeof computed>[0], selector: string, backdropSelector: string) {
  const [border, backdrop] = await Promise.all([
    computed(page, selector, 'border-top-color'),
    computed(page, backdropSelector, 'background-color'),
  ])
  const parsedBackdrop = parseColor(backdrop)
  return contrast(composite(parseColor(border), parsedBackdrop), parsedBackdrop)
}

const EXPECTED: Record<Mode, Record<Variant, { surface: string; primary: string; controlRadius: string; cardRadius: string }>> = {
  light: {
    fluent: { surface: '#ffffff', primary: 'rgb(15, 108, 189)', controlRadius: '4px', cardRadius: '8px' },
    ink: { surface: '#fbf9f5', primary: 'rgb(46, 44, 40)', controlRadius: '10px', cardRadius: '16px' },
    one: { surface: '#ffffff', primary: 'rgb(27, 95, 207)', controlRadius: '14px', cardRadius: '24px' },
    term: { surface: '#f8f6f0', primary: 'rgb(252, 196, 13)', controlRadius: '6px', cardRadius: '10px' },
  },
  dark: {
    fluent: { surface: '#292929', primary: 'rgb(25, 118, 202)', controlRadius: '4px', cardRadius: '8px' },
    ink: { surface: '#282622', primary: 'rgb(236, 229, 216)', controlRadius: '10px', cardRadius: '16px' },
    one: { surface: '#1a1a1a', primary: 'rgb(47, 111, 220)', controlRadius: '14px', cardRadius: '24px' },
    term: { surface: '#141412', primary: 'rgb(252, 196, 13)', controlRadius: '6px', cardRadius: '10px' },
  },
}

test.describe('QDS override gate', () => {
  for (const mode of ['light', 'dark'] as const) {
    for (const variant of MATRIX_VARIANTS) {
      test(`${mode} / ${variant} renders the catalog family with its resolved system`, async ({ page }) => {
        await page.goto('/#components')
        await applyTheme(page, mode, variant)
        const expected = EXPECTED[mode][variant]
        const panel = '.q-tab-panel'

        expect.soft(await customProperty(page, '--qds-surface-0'), 'surface token tracks the requested mode and variant').toBe(expected.surface)
        expect.soft(await resolvedColor(page, '--qds-color-primary'), 'primary color resolves from source tokens').toBe(expected.primary)
        expect.soft(await customProperty(page, '--qds-radius-control'), 'control radius token tracks the variant').toBe(expected.controlRadius)
        expect.soft(await computed(page, `${panel} .q-card`, 'border-radius'), 'QCard consumes the resolved card radius').toBe(expected.cardRadius)
        expect.soft(await computed(page, `${panel} .q-field--outlined .q-field__control`, 'border-radius'), 'QField consumes the resolved control geometry').toBe(variant === 'one' ? '18px' : expected.controlRadius)
        expect.soft(await computed(page, `${panel} .q-card`, 'background-color'), 'QCard has a rendered surface').not.toBe('rgba(0, 0, 0, 0)')
        const cardBorderStyle = await computed(page, `${panel} .q-card`, 'border-top-style')
        expect.soft(cardBorderStyle, `${variant} card renders a solid boundary`).toBe('solid')
        expect.soft(await computed(page, `${panel} .q-card`, 'border-top-width'), `${variant} card boundary is 1px`).toBe('1px')
        const cardBorderColor = await computed(page, `${panel} .q-card`, 'border-top-color')
        if (variant === 'one') expect.soft(cardBorderColor, 'One blocks separate by tone and roundness, not a stroke').toBe('rgba(0, 0, 0, 0)')
        else expect.soft(cardBorderColor, `${variant} card boundary has a non-transparent color`).not.toBe('rgba(0, 0, 0, 0)')

        if (variant === 'fluent') {
          expect.soft(await computed(page, `${panel} .q-card`, 'backdrop-filter'), 'Fluent content has no blur').toBe('none')
          expect.soft(await computed(page, `${panel} .q-card`, 'box-shadow'), 'Fluent card is a flat Win11 layer').toBe('none')
          expect.soft(await computed(page, `${panel} .q-card`, 'border-top-color'), 'Fluent card stroke is the card stroke token').toBe(await resolvedColor(page, '--qds-card-stroke'))
        }
        if (variant === 'ink') {
          expect.soft(await customProperty(page, '--qds-surface-negative-soft'), 'Ink negative pastel wash token').toBe(mode === 'light' ? '#f4dfe1' : '#4a3239')
          expect.soft(await computed(page, `${panel} .q-card`, 'backdrop-filter'), 'Ink content has no blur').toBe('none')
          expect.soft(await computed(page, `${panel} .q-card`, 'box-shadow'), 'Ink content stays flat').toBe('none')
          expect.soft(await computed(page, `${panel} .q-card`, 'background-color'), 'Ink card is a paper sheet').toBe(await resolvedColor(page, '--qds-surface-0'))
          expect.soft(await computed(page, `${panel} .q-card`, 'border-top-color'), 'Ink card hairline is the card stroke token').toBe(await resolvedColor(page, '--qds-card-stroke'))
          expect.soft(await computed(page, `${panel} .qds-display`, 'font-family'), 'Ink display type is editorial serif').toMatch(/Iowan Old Style|Palatino|Georgia/)
        }
        if (variant === 'one') {
          expect.soft(await customProperty(page, '--qds-surface-focus-block'), 'One focus-block token differs by mode').toBe(mode === 'light' ? '#efefef' : '#242424')
          expect.soft(await customProperty(page, '--qds-button-padding-inline'), 'One button padding token is emitted').toBe('1rem')
          expect.soft(await customProperty(page, '--qds-button-dense-min-height'), 'One dense button size token is emitted').toBe('2.5rem')
          expect.soft(await customProperty(page, '--qds-button-dense-padding-inline'), 'One dense button padding token is emitted').toBe('.875rem')
          expect.soft(await customProperty(page, '--qds-button-round-size'), 'One round button size token is emitted').toBe('2.75rem')
          expect.soft(await customProperty(page, '--qds-field-label-size'), 'One field label token is emitted').toBe('.8125rem')
          expect.soft(await computed(page, `${panel} .q-btn--unelevated:not(.q-btn--dense)`, 'min-height'), 'One controls meet 44px touch target').toBe('44px')
          expect.soft(await computed(page, `${panel} .q-card`, 'background-color'), 'One groups content on an opaque block surface').toBe(await resolvedColor(page, '--qds-surface-0'))
        }
      })
    }
  }

  test('Term focused regression preserves compact uppercase monospace contrast', async ({ page }) => {
    await page.goto('/#components')
    await applyTheme(page, 'dark', 'term')
    const panel = '.q-tab-panel'
    expect.soft(await customProperty(page, '--qds-font-family'), 'Term font token').toContain('ui-monospace')
    expect.soft(await computed(page, `${panel} .q-btn--unelevated:not(.q-btn--dense, .q-btn--no-uppercase)`, 'text-transform'), 'Term controls uppercase').toBe('uppercase')
    expect.soft(await computed(page, `${panel} .q-btn--unelevated:not(.q-btn--dense)`, 'min-height'), 'Term controls remain compact').toBe('32px')
    expect.soft(await computed(page, `${panel} .q-card`, 'background-color'), 'Term card has visible contrast surface').not.toBe(await resolvedColor(page, '--qds-text-strong'))
  })

  test('semantic solid foregrounds resolve for every scheme and role', async ({ page }) => {
    await page.goto('/#components')
    const roles = ['primary', 'secondary', 'accent', 'positive', 'negative', 'warning', 'info'] as const

    for (const mode of ['light', 'dark'] as const) {
      for (const variant of ['fluent', 'ink', 'one', 'term'] as const) {
        await applyTheme(page, mode, variant)
        const roleStyles = await page.evaluate((roles) => {
          const resolve = (property: string, declaration: 'backgroundColor' | 'color') => {
            const probe = document.createElement('span')
            probe.style[declaration] = `var(${property})`
            document.body.append(probe)
            const value = getComputedStyle(probe)[declaration]
            probe.remove()
            return value
          }
          const contrast = (fill: string, foreground: string) => {
            const luminance = (color: string) => {
              const channels = color.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? []
              const [red, green, blue] = channels.map((channel) => {
                const value = channel / 255
                return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
              })
              return 0.2126 * red + 0.7152 * green + 0.0722 * blue
            }
            const [lighter, darker] = [luminance(fill), luminance(foreground)].sort((a, b) => b - a)
            return (lighter + 0.05) / (darker + 0.05)
          }

          return roles.map((role) => {
            const action = document.createElement('button')
            action.className = `q-btn qds-solid bg-${role}`
            document.body.append(action)
            const actionStyles = getComputedStyle(action)
            const result = {
              role,
              fillToken: resolve(`--qds-color-${role}`, 'backgroundColor'),
              foregroundToken: resolve(`--qds-text-on-${role}`, 'color'),
              actionFill: actionStyles.backgroundColor,
              actionForeground: actionStyles.color,
            }
            action.remove()
            return { ...result, contrast: contrast(result.fillToken, result.foregroundToken) }
          })
        }, roles)

        for (const role of roleStyles) {
          expect.soft(role.fillToken, `${mode} ${variant} ${role.role} fill token resolves`).not.toBe('rgba(0, 0, 0, 0)')
          expect.soft(role.foregroundToken, `${mode} ${variant} ${role.role} foreground token resolves`).not.toBe('rgba(0, 0, 0, 0)')
          expect.soft(role.actionFill, `${mode} ${variant} ${role.role} solid action uses its fill`).toBe(role.fillToken)
          expect.soft(role.actionForeground, `${mode} ${variant} ${role.role} solid action uses its foreground`).toBe(role.foregroundToken)
          expect.soft(role.contrast, `${mode} ${variant} ${role.role} fill and foreground meet text contrast`).toBeGreaterThanOrEqual(4.5)
        }
      }
    }
  })

  test('semantic foreground utilities match their on-fill tokens in term and ink modes', async ({ page }) => {
    await page.goto('/#tokens')
    const roles = ['solid', 'primary', 'secondary', 'accent', 'positive', 'negative', 'warning', 'info'] as const

    for (const mode of ['light', 'dark'] as const) {
      for (const variant of ['term', 'ink'] as const) {
        await applyTheme(page, mode, variant)
        await expect(page.locator('[data-test="qds-semantic-foreground-utilities"]')).toBeVisible()

        for (const role of roles) {
          const fixture = page.locator(`[data-test="qds-semantic-foreground-${role}"]`)
          await expect(fixture, `${mode}/${variant} ${role} utility fixture is visible`).toBeVisible()
          await expect(fixture, `${mode}/${variant} ${role} utility class is public`).toHaveClass(new RegExp(`qds-text-on-${role}`))
          expect.soft(
            await computed(page, `[data-test="qds-semantic-foreground-${role}"]`, 'color'),
            `${mode}/${variant} ${role} utility uses its semantic foreground`,
          ).toBe(await resolvedColor(page, `--qds-text-on-${role}`))
        }
      }
    }
  })

  test('semantic text, muted text, tonal badges, active items, and primary button variants retain AA contrast across the mode and variant matrix', async ({ page }) => {
    await page.goto('/#tokens')
    const roles = ['primary', 'secondary', 'accent', 'positive', 'negative', 'warning', 'info'] as const
    const buttonVariants = ['outline', 'flat', 'standard', 'tonal', 'solid'] as const
    const neutralBadgeVariants = ['tonal', 'outline'] as const

    for (const mode of ['light', 'dark'] as const) {
      for (const variant of ['fluent', 'ink', 'one', 'term'] as const) {
        await applyTheme(page, mode, variant)
        await page.waitForTimeout(250)
        await expect(page.locator('[data-test="qds-semantic-contrast-fixtures"]')).toBeVisible()

        for (const role of roles) {
          expect.soft(
            await renderedContrast(page, `[data-test="qds-semantic-text-${role}"]`, `[data-test="qds-semantic-text-surface-${role}"]`),
            `${mode}/${variant} ${role} semantic text reaches AA contrast`,
          ).toBeGreaterThanOrEqual(4.5)
          expect.soft(
            await renderedContrast(page, `[data-test="qds-tonal-badge-${role}"]`, '[data-test="qds-tonal-badge-surface"]'),
            `${mode}/${variant} ${role} tonal badge reaches AA contrast`,
          ).toBeGreaterThanOrEqual(4.5)
        }

        for (const badge of neutralBadgeVariants) {
          expect.soft(
            await renderedContrast(page, `[data-test="qds-neutral-badge-${badge}"]`, '[data-test="qds-neutral-badge-surface"]'),
            `${mode}/${variant} neutral ${badge} badge reaches AA contrast`,
          ).toBeGreaterThanOrEqual(4.5)
          if (badge === 'outline') {
            expect.soft(
              await renderedBoundaryContrast(page, `[data-test="qds-neutral-badge-${badge}"]`, '[data-test="qds-neutral-badge-surface"]'),
              `${mode}/${variant} neutral outline badge boundary reaches contrast guidance`,
            ).toBeGreaterThanOrEqual(3)
          } else {
            // Fluent tint appearance: the neutral pill keeps a 1px default stroke so its shape reads on any surface.
            expect.soft(
              await computed(page, `[data-test="qds-neutral-badge-${badge}"]`, 'border-top-width'),
              `${mode}/${variant} neutral tint badge draws a 1px stroke`,
            ).toBe('1px')
            expect.soft(
              await computed(page, `[data-test="qds-neutral-badge-${badge}"]`, 'border-top-color'),
              `${mode}/${variant} neutral tint badge stroke uses --qds-stroke-default`,
            ).toBe(await resolvedColor(page, '--qds-stroke-default'))
          }
        }

        for (const surface of [0, 1, 2, 3] as const) {
          expect.soft(
            await renderedContrast(page, `[data-test="qds-muted-text-${surface}"]`, `[data-test="qds-muted-text-surface-${surface}"]`),
            `${mode}/${variant} muted text on surface ${surface} reaches AA contrast`,
          ).toBeGreaterThanOrEqual(4.5)
        }

        for (const button of buttonVariants) {
          expect.soft(
            await renderedContrast(page, `[data-test="qds-button-${button}-primary"]`, '[data-test="qds-button-contrast-surface"]'),
            `${mode}/${variant} primary ${button} button reaches AA contrast`,
          ).toBeGreaterThanOrEqual(4.5)
        }
        expect.soft(
          await computed(page, '[data-test="qds-button-solid-primary"]', 'color'),
          `${mode}/${variant} primary solid button retains its on-fill foreground`,
        ).toBe(await resolvedColor(page, '--qds-text-on-primary'))

        expect.soft(
          await renderedContrast(page, '[data-test="qds-active-item"]', '[data-test="qds-active-item-surface"]'),
          `${mode}/${variant} active item reaches AA contrast`,
        ).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  test('public token inventory is exactly the set of fallback/default layer emissions', async ({ page }) => {
    await page.goto('/')
    const emittedTokens = await page.evaluate(() => {
      const tokens = new Set<string>()
      const visit = (rules: CSSRuleList, withinTokenLayer = false) => {
        for (const rule of rules) {
          const groupingRule = rule as CSSRule & { cssRules?: CSSRuleList; name?: string }
          const inTokenLayer = withinTokenLayer || groupingRule.name === 'qds.tokens'
          if (inTokenLayer && rule instanceof CSSStyleRule) {
            for (const property of rule.style) {
              if (property.startsWith('--qds-')) tokens.add(property)
            }
          }
          if (groupingRule.cssRules) visit(groupingRule.cssRules, inTokenLayer)
        }
      }
      for (const stylesheet of document.styleSheets) {
        try {
          visit(stylesheet.cssRules)
        } catch {
          // Ignore inaccessible third-party stylesheets; package styles are same-origin.
        }
      }
      return [...tokens].sort()
    })

    expect(new Set(QDS_TOKENS).size, 'QDS_TOKENS has no duplicate public names').toBe(QDS_TOKENS.length)

    const sortedInventory = [...QDS_TOKENS].sort()
    expect(sortedInventory, 'QDS_TOKENS matches fallback/default layer emission exactly').toEqual(emittedTokens)
  })

  test('horizontal card header round action retains its tokenized end inset', async ({ page }) => {
    await page.goto('/#components')
    const header = page.locator('[data-test="qds-card-header-action"] .qds-card__header')
    const action = header.locator('.q-btn--round')

    for (const mode of ['light', 'dark'] as const) {
      for (const variant of ['fluent', 'ink', 'one', 'term'] as const) {
        await applyTheme(page, mode, variant)
        const [headerBox, actionBox, paddingEnd] = await Promise.all([
          header.boundingBox(),
          action.boundingBox(),
          header.evaluate((element) => getComputedStyle(element).paddingInlineEnd),
        ])

        expect(headerBox, `${mode}/${variant} card header fixture is rendered`).not.toBeNull()
        expect(actionBox, `${mode}/${variant} round action fixture is rendered`).not.toBeNull()
        expect(headerBox!.x + headerBox!.width - (actionBox!.x + actionBox!.width), `${mode}/${variant} round action stays inset from the header edge`).toBeGreaterThanOrEqual(parseFloat(paddingEnd) - 0.1)
      }
    }
  })

  test('legacy aliases normalize to canonical state, classes, and four switcher entries', async ({ page }) => {
    await page.goto('/')
    const aliases = [
      ['studio', 'fluent'], ['air', 'fluent'], ['glass', 'fluent'], ['feather', 'ink'], ['mobile', 'one'], ['terminal', 'term'],
    ] as const
    for (const [input, canonical] of aliases) {
      const state = await page.evaluate(({ input, canonical }) => {
        const ds = (window as unknown as { __qdsGallery: { setVariant: (value: string) => string; variant: { value: string } } }).__qdsGallery
        const returned = ds.setVariant(input)
        return {
          returned,
          value: ds.variant.value,
          canonicalClass: document.body.classList.contains(`qds-variant-${canonical}`),
          oldClass: document.body.classList.contains(`qds-variant-${input}`),
          dataVariant: document.body.dataset.qdsVariant,
          labels: Array.from(document.querySelectorAll('[aria-label="Variant"] .gallery-switcher__button'))
            .map((el) => el.getAttribute('aria-label')),
        }
      }, { input, canonical })
      expect.soft(state.returned, `${input} returns canonical value`).toBe(canonical)
      expect.soft(state.value, `${input} stores canonical value`).toBe(canonical)
      expect.soft(state.canonicalClass, `${input} writes canonical class`).toBe(true)
      expect.soft(state.oldClass, `${input} old class is absent`).toBe(false)
      expect.soft(state.dataVariant, `${input} writes the canonical data-qds-variant`).toBe(canonical)
      expect.soft(state.labels, `${input} exposes only canonical switcher entries`).toEqual(['Fluent', 'Ink', 'One', 'Term', 'Shadcn'])
    }
  })

  test('ink paper stays matte with one control hairline, crisp overlay rules and touch rows', async ({ page }) => {
    for (const mode of ['light', 'dark'] as const) {
      await page.goto('/#catalog')
      await applyTheme(page, mode, 'ink')
      expect.soft(await resolvedShadow(page, '--qds-elevation-card'), `${mode}/ink card elevation is matte`).toBe('none')
      await page.locator('[data-test="qds-catalog-color"]').scrollIntoViewIfNeeded()
      expect.soft(await computed(page, '[data-test="qds-catalog-color"]', 'box-shadow'), `${mode}/ink QColor has no shadow`).toBe('none')
      expect.soft(await resolvedColor(page, '--qds-control-stroke-top'), `${mode}/ink control edge is one hairline`).toBe(await resolvedColor(page, '--qds-control-stroke-bottom'))
      const rowHeight = await page.locator('body').evaluate((body) => {
        const probe = document.createElement('div')
        probe.className = 'q-item'
        body.append(probe)
        const height = getComputedStyle(probe).minHeight
        probe.remove()
        return height
      })
      expect.soft(rowHeight, `${mode}/ink list rows follow the pointer`).toBe((await coarsePointer(page)) ? '44px' : '40px')

      await page.goto('/#components')
      const trigger = page.getByRole('button', { name: 'Open menu', exact: true })
      await trigger.scrollIntoViewIfNeeded()
      await trigger.click()
      const menu = page.locator('.q-menu').first()
      await expect(menu).toBeVisible()
      expect.soft(await menu.evaluate((el) => getComputedStyle(el).borderTopColor), `${mode}/ink menu takes the crisp overlay rule`).toBe(await resolvedColor(page, '--qds-stroke-strong'))
      await page.keyboard.press('Escape')
    }
  })

  test('term stays crisp and opaque with ruled amber keys, readable text and touch rows', async ({ page }) => {
    const ratio = async (first: string, second: string) => contrast(parseColor(await resolvedColor(page, first)), parseColor(await resolvedColor(page, second)))
    for (const mode of ['light', 'dark'] as const) {
      await page.goto('/#catalog')
      await applyTheme(page, mode, 'term')
      expect.soft(await resolvedShadow(page, '--qds-elevation-card'), `${mode}/term cards are flat`).toBe('none')
      expect.soft(await resolvedShadow(page, '--qds-shadow-8'), `${mode}/term has no glow or drop shadow`).toBe('none')
      expect.soft(await resolvedColor(page, '--qds-control-stroke-top'), `${mode}/term control edge is one hairline`).toBe(await resolvedColor(page, '--qds-control-stroke-bottom'))
      expect.soft(await resolvedColor(page, '--qds-control-stroke-default'), `${mode}/term control stroke is the border hairline`).toBe(await resolvedColor(page, '--qds-border'))
      expect.soft(await computed(page, '.q-card', 'background-image'), `${mode}/term card has no amber wash`).toBe('none')
      expect.soft(await computed(page, '.q-card', 'background-color'), `${mode}/term card is an opaque pane`).toBe(await resolvedColor(page, '--qds-surface-0'))
      for (const surface of ['--qds-surface-0', '--qds-surface-1', '--qds-surface-2']) {
        expect.soft(await ratio('--qds-text-muted', surface), `${mode}/term muted text on ${surface}`).toBeGreaterThanOrEqual(4.5)
        expect.soft(await ratio('--qds-border', surface), `${mode}/term control stroke on ${surface}`).toBeGreaterThanOrEqual(3)
      }
      for (const surface of ['--qds-surface-0', '--qds-surface-1']) {
        expect.soft(await ratio('--qds-stroke-focus', surface), `${mode}/term focus ring on ${surface}`).toBeGreaterThanOrEqual(3)
        expect.soft(await ratio('--qds-fg-brand', surface), `${mode}/term brand text on ${surface}`).toBeGreaterThanOrEqual(4.5)
      }

      const toggle = '[data-test="qds-btn-toggle"]'
      expect.soft(await renderedContrast(page, `${toggle} .q-btn[aria-pressed="false"]`, toggle), `${mode}/term inactive segment text`).toBeGreaterThanOrEqual(4.5)
      const checkbox = '[data-test="qds-catalog-checkbox"] .q-checkbox__bg'
      expect.soft(await computed(page, checkbox, 'border-top-color'), `${mode}/term checked box is ruled in its on-fill ink`).toBe(await resolvedColor(page, '--qds-text-on-primary'))
      if (mode === 'light') expect.soft(await renderedBoundaryContrast(page, checkbox, '.q-card'), 'light/term checked box boundary on cream').toBeGreaterThanOrEqual(3)

      const rowHeight = await page.locator('body').evaluate((body) => {
        const probe = document.createElement('div')
        probe.className = 'q-item'
        body.append(probe)
        const height = getComputedStyle(probe).minHeight
        probe.remove()
        return height
      })
      expect.soft(rowHeight, `${mode}/term list rows follow the pointer`).toBe((await coarsePointer(page)) ? '44px' : '38px')

      await page.goto('/#components')
      const trigger = page.getByRole('button', { name: 'Open menu', exact: true })
      await trigger.scrollIntoViewIfNeeded()
      await trigger.click()
      const menu = page.locator('.q-menu').first()
      await expect(menu).toBeVisible()
      expect.soft(await menu.evaluate((el) => getComputedStyle(el).backdropFilter), `${mode}/term menu keeps its acrylic`).toContain('blur')
      expect.soft(await menu.evaluate((el) => getComputedStyle(el).borderTopColor), `${mode}/term menu takes the crisp hairline`).toBe(await resolvedColor(page, '--qds-border'))
      await page.keyboard.press('Escape')

      const cdp = await page.context().newCDPSession(page)
      await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] })
      await page.goto('/#components')
      await applyTheme(page, mode, 'term')
      await trigger.scrollIntoViewIfNeeded()
      await trigger.click()
      await expect(menu).toBeVisible()
      expect.soft(await menu.evaluate((el) => getComputedStyle(el).backdropFilter), `${mode}/term menu turns solid under reduced transparency`).toBe('none')
      expect.soft(await menu.evaluate((el) => getComputedStyle(el).backgroundColor), `${mode}/term solid menu is the pane surface`).toBe(await resolvedColor(page, '--qds-surface-0'))
      await page.keyboard.press('Escape')
      await cdp.send('Emulation.setEmulatedMedia', { features: [] })

      await page.goto('/#forms')
      await applyTheme(page, mode, 'term')
      for (const state of ['positive', 'warning', 'error']) {
        const stroke = parseColor(await computed(page, `[data-test="qds-forms-state-${state}"] .q-field__control`, 'border-top-color', '::before'))
        for (const surface of ['--qds-surface-0', '--qds-surface-1', '--qds-surface-2']) {
          expect.soft(contrast(stroke, parseColor(await resolvedColor(page, surface))), `${mode}/term ${state} field stroke on ${surface}`).toBeGreaterThanOrEqual(3)
        }
      }

      await page.goto('/#scenes')
      const eyebrow = '[data-test="qds-scene-term"] .scene-panel__eyebrow'
      await page.locator(eyebrow).scrollIntoViewIfNeeded()
      expect.soft(await renderedContrast(page, eyebrow, '[data-test="qds-scene-card-term"]'), `${mode}/term scene eyebrow is never amber text on cream`).toBeGreaterThanOrEqual(4.5)

      await applyTheme(page, mode, 'one')
      const frameCard = parseColor(await computed(page, '[data-test="qds-scene-card-term"]', 'background-color'))
      expect.soft(frameCard[3], `${mode}/term scene card stays an opaque pane on a One page`).toBe(1)
      expect.soft(await renderedContrast(page, '[data-test="qds-scene-card-term"] .scene-panel__copy', '[data-test="qds-scene-card-term"]'), `${mode}/term scene copy is readable on a One page`).toBeGreaterThanOrEqual(4.5)
    }
  })

  test('one stays neutral with toned blocks, a calm blue accent, readable text and touch rows', async ({ page }, info) => {
    const ratio = async (first: string, second: string) => contrast(parseColor(await resolvedColor(page, first)), parseColor(await resolvedColor(page, second)))
    for (const mode of ['light', 'dark'] as const) {
      await page.goto('/#catalog')
      await applyTheme(page, mode, 'one')
      expect.soft(await customProperty(page, '--qds-surface-1'), `${mode}/one page is neutral grey or true black`).toBe(mode === 'light' ? '#f2f2f2' : '#000000')
      expect.soft(await computed(page, 'body', 'background-image', '::before'), `${mode}/one page has no tinted backdrop`).toBe('none')
      for (const token of ['--qds-surface-0', '--qds-surface-focus-block', '--qds-surface-transient']) {
        const [red, green, blue] = parseColor(await resolvedColor(page, token))
        expect.soft(Math.max(red, green, blue) - Math.min(red, green, blue), `${mode}/one ${token} has no lavender cast`).toBe(0)
      }
      const [red, green, blue] = parseColor(await resolvedColor(page, '--qds-color-primary'))
      expect.soft(blue > green && green > red, `${mode}/one primary is a calm blue, not purple`).toBe(true)
      expect.soft(await computed(page, '.q-card', 'background-image'), `${mode}/one card has no tonal wash`).toBe('none')
      expect.soft(await computed(page, '.q-card', 'background-color'), `${mode}/one card is an opaque block`).toBe(await resolvedColor(page, '--qds-surface-0'))
      for (const surface of ['--qds-surface-0', '--qds-surface-1', '--qds-surface-2', '--qds-surface-focus-block', '--qds-surface-brand-soft']) {
        expect.soft(await ratio('--qds-text-muted', surface), `${mode}/one muted text on ${surface}`).toBeGreaterThanOrEqual(4.5)
        expect.soft(await ratio('--qds-fg-brand', surface), `${mode}/one brand text on ${surface}`).toBeGreaterThanOrEqual(4.5)
      }
      expect.soft(await ratio('--qds-text-muted', '--qds-control-fill-hover'), `${mode}/one placeholder on a hovered field`).toBeGreaterThanOrEqual(4.5)
      for (const surface of ['--qds-surface-0', '--qds-surface-1']) {
        expect.soft(await ratio('--qds-stroke-focus', surface), `${mode}/one focus ring on ${surface}`).toBeGreaterThanOrEqual(3)
      }
      expect.soft(await computed(page, '[data-test="qds-btn-toggle"] .q-btn', 'border-top-left-radius'), `${mode}/one segments are pills`).toBe('9999px')
      const toggle = '[data-test="qds-btn-toggle"]'
      expect.soft(await renderedContrast(page, `${toggle} .q-btn[aria-pressed="false"]`, toggle), `${mode}/one inactive segment text`).toBeGreaterThanOrEqual(4.5)

      const rowHeight = await page.locator('body').evaluate((body) => {
        const probe = document.createElement('div')
        probe.className = 'q-item'
        body.append(probe)
        const height = getComputedStyle(probe).minHeight
        probe.remove()
        return height
      })
      expect.soft(rowHeight, `${mode}/one list rows follow the pointer`).toBe((await coarsePointer(page)) ? '56px' : '48px')

      await page.goto('/#forms')
      await applyTheme(page, mode, 'one')
      for (const state of ['positive', 'warning', 'error']) {
        const stroke = parseColor(await computed(page, `[data-test="qds-forms-state-${state}"] .q-field__control`, 'border-top-color', '::before'))
        for (const surface of ['--qds-surface-0', '--qds-surface-focus-block']) {
          expect.soft(contrast(stroke, parseColor(await resolvedColor(page, surface))), `${mode}/one ${state} field stroke on ${surface}`).toBeGreaterThanOrEqual(3)
        }
      }

      const restStroke = parseColor(await computed(page, '[data-test="qds-forms-state-rest"] .q-field__control', 'border-top-color', '::before'))
      for (const surface of ['--qds-surface-0', '--qds-surface-focus-block']) {
        expect.soft(contrast(restStroke, parseColor(await resolvedColor(page, surface))), `${mode}/one rest field boundary on ${surface}`).toBeGreaterThanOrEqual(3)
      }
      await page.locator('[data-test="qds-forms-focus-trigger"]').click()
      const focused = '[data-test="qds-forms-state-focus"] .q-field__control'
      await expect(page.locator('[data-test="qds-forms-state-focus"] .q-field')).toHaveClass(/q-field--highlighted/)
      expect.soft(await computed(page, focused, 'border-top-width', '::before'), `${mode}/one focus draws a 2px perimeter`).toBe('2px')
      const focusStroke = await resolvedColor(page, '--qds-stroke-focus')
      await expect.soft.poll(async () => computed(page, focused, 'border-top-color', '::before'), `${mode}/one focus perimeter is the brand stroke`).toBe(focusStroke)
      expect.soft(await computed(page, focused, 'display', '::after'), `${mode}/one focus has no underline bar`).toBe('none')

      await page.goto('/#components')
      await applyTheme(page, mode, 'one')
      await page.locator('[data-test="qds-dialog-prompt-trigger"]').click()
      const dialog = page.locator('[data-test="qds-dialog-prompt"]')
      await expect(dialog).toBeVisible()
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
      await expect(dialog.locator('.q-field').first()).not.toHaveClass(/q-field--focused/)
      const dialogFill = parseColor(await dialog.evaluate((el) => getComputedStyle(el).backgroundColor))
      await expect.soft.poll(async () => contrast(parseColor(await dialog.locator('.q-field__control').first().evaluate((el) => getComputedStyle(el).backgroundColor)), dialogFill), `${mode}/one field in a dialog is a visible step from the dialog fill`).toBeGreaterThanOrEqual(1.15)
      await page.keyboard.press('Escape')

      await page.goto('/#catalog')
      await applyTheme(page, mode, 'one')
      const date = page.locator('[data-test="qds-catalog-date"]')
      await date.scrollIntoViewIfNeeded()
      const fit = await date.evaluate((el) => {
        const root = el.matches('.q-date') ? el : (el.querySelector('.q-date') as HTMLElement)
        const overflow = (selector: string) => {
          const node = root.querySelector(selector) as HTMLElement
          return node.scrollWidth - node.clientWidth
        }
        return { days: overflow('.q-date__calendar-days'), navigation: overflow('.q-date__navigation'), content: (root.querySelector('.q-date__content') as HTMLElement).getBoundingClientRect().width - root.getBoundingClientRect().width }
      })
      expect.soft(fit.days, `${mode}/one calendar days fit their container`).toBeLessThanOrEqual(0)
      expect.soft(fit.navigation, `${mode}/one calendar navigation fits`).toBeLessThanOrEqual(0)
      expect.soft(fit.content, `${mode}/one calendar content fits the picker`).toBeLessThanOrEqual(0)

      await page.goto('/#apps')
      const navCard = page.locator('[data-test="qds-apps-nav-card"]')
      const settledBox = async () => {
        await waitForThemePaint(page)
        await expect.poll(async () => (await navCard.boundingBox())?.x ?? -1).toBeGreaterThanOrEqual(0)
        await navCard.evaluate(async element => {
          let previous = '', stable = 0
          for (let frame = 0; frame < 180; frame++) {
            await new Promise(requestAnimationFrame)
            const rect = element.getBoundingClientRect()
            const key = [rect.x, rect.y, rect.width, rect.height].join(',')
            let entering = false
            for (let node: Element | null = element; node; node = node.parentElement) {
              if ([...node.classList].some(name => /(?:enter|leave)-(?:active|from|to)$/.test(name))) entering = true
            }
            stable = !entering && document.fonts.status === 'loaded' && key === previous ? stable + 1 : 0
            previous = key
            if (stable >= 3) return
          }
          throw new Error('Navigation card did not reach stable native panel/font geometry')
        })
        return (await navCard.boundingBox())!
      }
      await applyTheme(page, mode, 'fluent')
      const fluentCard = await settledBox()
      await applyTheme(page, mode, 'one')
      const oneCard = await settledBox()
      expect.soft(Math.abs(oneCard.x - fluentCard.x), `${mode}/one page gutter stays within One's wider space step of Fluent`).toBeLessThanOrEqual(4)
      expect.soft(Math.abs(oneCard.width - fluentCard.width), `${mode}/one cards keep the Fluent width within the gutter step`).toBeLessThanOrEqual(8)
      const active = '[data-test="qds-apps-nav-drawer"] .q-item--active'
      await waitForThemePaint(page)
      const endpoint = await page.locator(active).evaluate(element => {
        const style = getComputedStyle(element)
        return { foreground: style.color, background: style.backgroundColor, block: getComputedStyle(element.closest('.q-list')!).backgroundColor, fonts: document.fonts.status }
      })
      const block = parseColor(endpoint.block)
      const activeFill = parseColor(endpoint.background)
      expect.soft(activeFill.slice(0, 3), `${mode}/one active nav item stands out from its block`).not.toEqual(block.slice(0, 3))
      const endpointContrast = contrast(parseColor(endpoint.foreground), activeFill)
      expect.soft(endpointContrast, `${mode}/one active nav label contrast`).toBeGreaterThanOrEqual(4.5)
      await info.attach(`one-${mode}-settled-native-endpoint`, { body: JSON.stringify({ mode, fluentCard, oneCard, gutterDelta: Math.abs(oneCard.x - fluentCard.x), widthDelta: Math.abs(oneCard.width - fluentCard.width), ...endpoint, contrast: endpointContrast }), contentType: 'application/json' })
      expect.soft(await computed(page, '[data-test="qds-apps-subpage-panels"] .qds-settings-card', 'background-color'), `${mode}/one nested settings card takes the nested block tone`).toBe(await resolvedColor(page, '--qds-surface-focus-block'))

      await page.goto('/#scenes')
      await applyTheme(page, mode, 'term')
      const frameCard = '[data-test="qds-scene-card-one"]'
      await page.locator(frameCard).scrollIntoViewIfNeeded()
      expect.soft(parseColor(await computed(page, frameCard, 'background-color'))[3], `${mode}/one scene card stays an opaque block on a Term page`).toBe(1)
      expect.soft(await renderedContrast(page, `${frameCard} .scene-panel__copy`, frameCard), `${mode}/one scene copy is readable on a Term page`).toBeGreaterThanOrEqual(4.5)
    }
  })

  test('quasar utilities, prose links, grey chips and custom focus survive every variant', async ({ page }) => {
    const height = (selector: string) => page.locator(selector).first().evaluate((el) => el.getBoundingClientRect().height)
    const ring = (selector: string) => page.locator(selector).first().evaluate((el) => {
      (el as HTMLElement).focus()
      const s = getComputedStyle(el)
      return { visible: el.matches(':focus-visible'), style: s.outlineStyle, width: s.outlineWidth, color: s.outlineColor, offset: s.outlineOffset, ink: s.color }
    })
    for (const mode of ['light', 'dark'] as const) {
      for (const variant of CANONICAL_VARIANTS) {
        const cell = `${mode}/${variant}`
        await page.goto('/#components')
        await applyTheme(page, mode, variant)
        expect.soft(await computed(page, '[data-test="qds-btn-variant-case"]', 'text-transform'), `${cell} button takes the variant case`).toBe(variant === 'term' ? 'uppercase' : 'none')
        expect.soft(await computed(page, '[data-test="qds-btn-no-caps"]', 'text-transform'), `${cell} no-caps keeps the authored case`).toBe('none')
        const row = '[data-test="qds-dense-row"]'
        const field = await height(`${row} .q-field__control`)
        for (const button of await page.locator(`${row} .q-btn`).all()) {
          expect.soft(await button.evaluate((el) => el.getBoundingClientRect().height), `${cell} dense button matches the dense field`).toBe(field)
        }
        if (variant === 'term') expect.soft(field, `${cell} dense controls follow the pointer`).toBe((await coarsePointer(page)) ? 32 : 24)
        const chip = '[data-test="qds-chip-grey"]'
        expect.soft(await renderedContrast(page, chip, '.q-card'), `${cell} grey chip text contrasts with its fill`).toBeGreaterThanOrEqual(4.5)
        expect.soft(await computed(page, chip, 'background-color'), `${cell} grey chip is the neutral layer`).toBe(await resolvedColor(page, '--qds-bg-layer'))

        await page.goto('/#typography')
        await applyTheme(page, mode, variant)
        expect.soft(await computed(page, '[data-test="qds-type-subtitle-bold"]', 'font-weight'), `${cell} text-weight-bold beats the type scale`).toBe('700')
        expect.soft(await computed(page, '[data-test="qds-type-subtitle"]', 'font-weight'), `${cell} subtitle keeps its scale weight`).toBe(await customProperty(page, '--qds-font-weight-subtitle1'))
        expect.soft(await computed(page, '[data-test="qds-type-overline-capitalize"]', 'text-transform'), `${cell} text-capitalize beats the overline case`).toBe('capitalize')
        const link = '[data-test="qds-type-link"]'
        expect.soft(await computed(page, link, 'color'), `${cell} prose link takes the brand ink`).toBe(await resolvedColor(page, '--qds-fg-brand'))
        expect.soft(await computed(page, link, 'text-decoration-line'), `${cell} prose link keeps an underline`).toBe('underline')
        expect.soft(contrast(parseColor(await computed(page, link, 'color')), parseColor(await resolvedColor(page, '--qds-surface-0'))), `${cell} prose link contrast`).toBeGreaterThanOrEqual(4.5)
        for (const anchor of await page.locator('[data-test="qds-type-anchors"] a').all()) {
          expect.soft(await anchor.evaluate((el) => getComputedStyle(el).textDecorationLine), `${cell} Quasar anchor components keep no underline`).toBe('none')
          expect.soft(await anchor.evaluate((el) => getComputedStyle(el).color), `${cell} Quasar anchor components keep their own ink`).not.toBe(await resolvedColor(page, '--qds-fg-brand'))
        }
        const focusStroke = await resolvedColor(page, '--qds-stroke-focus')
        for (const target of [link, '[data-test="qds-type-role-button"]']) {
          const focus = await ring(target)
          expect.soft(focus.visible, `${cell} ${target} shows focus-visible`).toBe(true)
          expect.soft([focus.style, focus.width, focus.color], `${cell} ${target} takes the QDS ring`).toEqual(['solid', '2px', focusStroke])
          const offset = Number.parseFloat(focus.offset)
          if (target === link) expect.soft(offset, `${cell} prose link ring sits outside the text`).toBeGreaterThan(0)
          else expect.soft(offset, `${cell} custom control ring is inset so full-width rows keep all four sides`).toBeLessThan(0)
        }

        await page.goto('/#apps')
        await applyTheme(page, mode, variant)
        for (const segment of ['.q-btn-dropdown--current', '.q-btn-dropdown__arrow-container']) {
          const focus = await ring(`[data-test="qds-apps-split"] ${segment}`)
          expect.soft(Number.parseFloat(focus.offset), `${cell} joined ${segment} rings inside its edge`).toBeLessThan(0)
          expect.soft(focus.color, `${cell} joined ${segment} ring takes the on-fill ink`).toBe(focus.ink)
        }
      }
    }
  })

  test('system mode follows emulated light and dark preference', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/')
    const setSystem = () => page.evaluate(() => {
      const ds = (window as unknown as { __qdsGallery: { setMode: (value: 'system') => string; resolvedMode: { value: string } } }).__qdsGallery
      return { returned: ds.setMode('system'), resolved: ds.resolvedMode.value, body: document.body.dataset.qdsResolved }
    })
    expect(await setSystem()).toMatchObject({ returned: 'system', resolved: 'light', body: 'light' })
    await page.emulateMedia({ colorScheme: 'dark' })
    await expect.poll(setSystem).toMatchObject({ returned: 'system', resolved: 'dark', body: 'dark' })
  })
})
