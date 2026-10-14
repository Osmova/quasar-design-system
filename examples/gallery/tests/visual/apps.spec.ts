import { expect, test, type Locator, type Page } from '@playwright/test'
import { applyTheme, LEGACY_VARIANTS as CANONICAL_VARIANTS, coarsePointer, resolvedColor, type Mode, type Variant } from './helpers'

const MODES: Mode[] = ['light', 'dark']
const byHook = (hook: string) => `[data-test="${hook}"]`

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

function contrast(foreground: string, background: string): number {
  const luminance = (color: string) => {
    const [r, g, b] = parseColor(color).slice(0, 3).map((channel) => {
      const value = channel / 255
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const [light, dark] = [luminance(foreground), luminance(background)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

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

async function openApps(page: Page, mode: Mode = 'light', variant: Variant = 'fluent') {
  await page.goto('./#apps')
  await applyTheme(page, mode, variant)
  await expect(page.getByRole('tab', { name: 'Apps' })).toHaveAttribute('aria-selected', 'true')
  await settle(page)
}

const box = async (locator: Locator) => {
  const rect = await locator.boundingBox()
  expect(rect, 'element has a layout box').not.toBeNull()
  return rect!
}

const style = (locator: Locator, property: string, pseudo?: string) =>
  locator.evaluate((element, args) => getComputedStyle(element, args.pseudo).getPropertyValue(args.property).trim(), { property, pseudo })

const focusedText = (page: Page) =>
  page.evaluate(() => {
    const element = document.activeElement as HTMLElement | null
    return element?.innerText.trim().split('\n')[0] || element?.getAttribute('aria-label') || ''
  })

// Narrow screens open the navigation as the compact rail.
async function expandNav(page: Page) {
  const toggle = page.locator(byHook('qds-apps-nav-toggle'))
  if ((await toggle.getAttribute('aria-expanded')) === 'false') await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
}

// Quasar binds Escape to popups on desktop platforms only.
const escapeCloses = (projectName: string) => projectName === 'desktop'

test.describe('apps', () => {
  for (const variant of CANONICAL_VARIANTS) {
    test(`split button joins its segments behind one divider (${variant})`, async ({ page }) => {
      await openApps(page, 'light', variant)
      const split = page.locator(`${byHook('qds-apps-split')} .q-btn-dropdown--split`)
      const current = split.locator('.q-btn-dropdown--current')
      const arrow = split.locator('.q-btn-dropdown__arrow-container')
      const [main, chevron] = [await box(current), await box(arrow)]
      expect.soft(Math.abs(main.y - chevron.y), 'segments share a row').toBeLessThanOrEqual(1)
      expect.soft(Math.abs(main.height - chevron.height), 'segments share a height').toBeLessThanOrEqual(1)
      expect.soft(chevron.x - (main.x + main.width), 'segments meet without a gap').toBeLessThanOrEqual(0.5)
      expect.soft(chevron.x - (main.x + main.width), 'segments overlap at most a hairline').toBeGreaterThanOrEqual(-2)
      expect.soft(chevron.width, 'chevron segment stays narrower than the action').toBeLessThan(main.width)

      const radii = (locator: Locator) =>
        locator.evaluate((element) => {
          const s = getComputedStyle(element)
          return [s.borderStartStartRadius, s.borderStartEndRadius, s.borderEndStartRadius, s.borderEndEndRadius].map((value) => Number.parseFloat(value) || 0)
        })
      const [ms, me, mes, mee] = await radii(current)
      const [cs, ce, ces, cee] = await radii(arrow)
      expect.soft(me + mee, 'action segment squares its inner corners').toBe(0)
      expect.soft(cs + ces, 'chevron segment squares its inner corners').toBe(0)
      expect.soft(ms > 0 && mes > 0 && ce > 0 && cee > 0, 'outer corners stay rounded').toBe(true)

      const divider = Number.parseFloat(await style(arrow, 'border-inline-start-width'))
      expect.soft(divider, 'a single hairline divider separates the chevron').toBeGreaterThan(0)
      expect.soft(divider, 'divider stays a hairline').toBeLessThanOrEqual(1)
      const actionEdge = Number.parseFloat(await style(current, 'border-inline-end-width')) || 0
      expect.soft(main.x + main.width - chevron.x, 'the chevron divider covers the action edge so one hairline shows').toBeGreaterThanOrEqual(actionEdge - 0.5)
      expect.soft(await style(arrow, 'border-bottom-color'), 'segments share the elevation border').toBe(await style(current, 'border-bottom-color'))
    })
  }

  test('split button follows the menu keyboard model', async ({ page }, testInfo) => {
    await openApps(page)
    const block = page.locator(byHook('qds-apps-split'))
    const current = block.locator('.q-btn-dropdown--current')
    const arrow = block.locator('.q-btn-dropdown__arrow-container')
    const status = page.locator(byHook('qds-apps-split-status'))
    const menu = page.locator(`[role="menu"]${byHook('qds-apps-split-menu')}`)

    await current.focus()
    await page.keyboard.press('Enter')
    await expect(status, 'Enter runs the primary action').toHaveText('Deploy to production started.')
    await expect(menu, 'primary action does not open the menu').toHaveCount(0)

    await expect(arrow).toHaveAttribute('aria-haspopup', 'menu')
    await expect(arrow).toHaveAccessibleName('More deploy actions')
    await arrow.focus()
    await page.keyboard.press('Space')
    await expect(menu, 'Space opens the menu').toBeVisible()
    await expect(arrow).toHaveAttribute('aria-expanded', 'true')

    const items = menu.locator('[role="menuitemradio"], [role="menuitem"]')
    await expect(items).toHaveCount(5)
    await expect(menu.getByRole('menuitemradio'), 'deploy targets are a radio set').toHaveCount(4)
    await expect(menu.getByRole('menuitemradio', { checked: true }), 'the current target is checked').toHaveText(/Deploy to production/)
    await expect(items.nth(0), 'opening focuses the first row').toBeFocused()

    await page.keyboard.press('ArrowDown')
    await expect(items.nth(1), 'ArrowDown moves to the next row').toBeFocused()
    await page.keyboard.press('ArrowUp')
    await expect(items.nth(0), 'ArrowUp moves back').toBeFocused()
    await page.keyboard.press('ArrowUp')
    await expect(items.nth(4), 'ArrowUp wraps to the last row').toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(items.nth(0), 'ArrowDown wraps to the first row').toBeFocused()
    await page.keyboard.press('End')
    await expect(items.nth(4), 'End jumps to the last row').toBeFocused()
    await page.keyboard.press('Home')
    await expect(items.nth(0), 'Home jumps to the first row').toBeFocused()
    await page.keyboard.press('Tab')
    await expect(items.nth(1), 'Tab stays a secondary path to the next row').toBeFocused()
    await page.keyboard.press('Enter')
    await expect(menu, 'Enter activates and closes').toHaveCount(0)
    await expect(current, 'the chosen action becomes primary').toHaveText('Deploy to staging')
    await expect(status).toHaveText('Deploy to staging started.')

    await arrow.focus()
    await page.keyboard.press('Enter')
    await expect(menu, 'Enter opens the menu').toBeVisible()
    await expect(menu.getByRole('menuitemradio', { checked: true }), 'the checked row follows the choice').toHaveText(/Deploy to staging/)
    await expect(items.nth(0), 'reopening focuses the first row').toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(items.nth(1), 'arrow keys work on a reopened menu').toBeFocused()
    if (escapeCloses(testInfo.project.name)) {
      await page.keyboard.press('Escape')
      await expect(menu, 'Escape closes').toHaveCount(0)
      await expect(arrow, 'focus returns to the chevron').toBeFocused()
    } else {
      await items.nth(1).click()
      await expect(menu).toHaveCount(0)
    }
    await expect(arrow).toHaveAttribute('aria-expanded', 'false')
  })

  for (const mode of MODES) {
    test(`menu rows lay out icon, title, caption and description (${mode})`, async ({ page }) => {
      await openApps(page, mode)
      await page.locator(`${byHook('qds-apps-split')} .q-btn-dropdown__arrow-container`).click()
      const rows = page.locator(`${byHook('qds-apps-split-menu')} .qds-menu-row`)
      await expect(rows).toHaveCount(5)
      const muted = await resolvedColor(page, '--qds-fg-muted')

      for (const row of (await rows.all()).slice(0, 4)) {
        const parts = await row.evaluate((element) => {
          const read = (selector: string) => {
            const node = element.querySelector(selector) as HTMLElement
            const r = node.getBoundingClientRect()
            const s = getComputedStyle(node)
            return {
              left: r.left, right: r.right, top: r.top, bottom: r.bottom, height: r.height,
              clipped: node.scrollWidth > node.clientWidth + 1 && s.textOverflow !== 'clip' && s.whiteSpace === 'nowrap',
              color: s.color,
              size: Number.parseFloat(s.fontSize),
              wraps: s.whiteSpace !== 'nowrap',
            }
          }
          return {
            row: element.getBoundingClientRect().height,
            icon: read('.qds-menu-row__icon'),
            title: read('.qds-menu-row__title'),
            caption: read('.qds-menu-row__caption'),
            description: read('.qds-menu-row__description'),
          }
        })
        const name = await row.locator('.qds-menu-row__title').innerText()
        expect.soft(parts.icon.right, `${name}: icon leads the text`).toBeLessThanOrEqual(parts.title.left + 0.5)
        expect.soft(parts.caption.top, `${name}: caption follows the title`).toBeGreaterThanOrEqual(parts.title.bottom - 1)
        expect.soft(parts.description.top, `${name}: description follows the caption`).toBeGreaterThanOrEqual(parts.caption.bottom - 1)
        for (const part of ['title', 'caption', 'description'] as const) {
          expect.soft(parts[part].clipped, `${name}: ${part} is not truncated`).toBe(false)
          expect.soft(parts[part].height, `${name}: ${part} renders`).toBeGreaterThan(0)
        }
        expect.soft(parts.row, `${name}: rich row grows past the 32px single-line row`).toBeGreaterThan(parts.title.height + parts.caption.height + parts.description.height)
        expect.soft(parts.caption.size, `${name}: caption is secondary type`).toBeLessThan(parts.title.size)
        expect.soft(distance(parts.caption.color, muted), `${name}: caption ${parts.caption.color} uses the muted foreground`).toBeLessThanOrEqual(2)
        expect.soft(distance(parts.description.color, muted), `${name}: description ${parts.description.color} uses the muted foreground`).toBeLessThanOrEqual(2)
        expect.soft(parts.description.wraps, `${name}: description wraps instead of clipping`).toBe(true)
        expect.soft(parts.icon.top, `${name}: multi-line row aligns the icon to the title line`).toBeLessThanOrEqual(parts.title.bottom)
      }
    })
  }

  test('navigation view keeps nested destinations keyboard reachable', async ({ page }) => {
    await openApps(page)
    await expect(page.locator(byHook('qds-apps-nav-toggle')), 'wide screens start expanded, narrow ones on the rail').toHaveAttribute('aria-expanded', page.viewportSize()!.width > 720 ? 'true' : 'false')
    await expandNav(page)
    const nav = page.getByRole('navigation', { name: 'Operations console' })
    await expect(nav).toBeVisible()
    await expect(nav.locator('[aria-current="page"]'), 'one current page').toHaveCount(1)
    await expect(nav.locator('[aria-current="page"]')).toContainText('Metrics')

    const toggle = page.locator(byHook('qds-apps-nav-toggle'))
    await expect(toggle).toHaveAccessibleName('Collapse navigation')
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await toggle.focus()
    const order: string[] = []
    for (let step = 0; step < 8; step++) {
      await page.keyboard.press('Tab')
      order.push(await focusedText(page))
    }
    expect(order, 'Tab walks the tree in reading order').toEqual(['Home', 'Deployments', 'Monitoring', 'Metrics', 'Logs', 'Alerts', 'Members', 'Settings'])

    const group = page.locator(`${byHook('qds-apps-nav-group')} .q-expansion-item__container > .q-item`)
    await expect(group).toHaveAttribute('aria-expanded', 'true')
    await nav.locator('[data-nav="logs"]').focus()
    await page.keyboard.press('Enter')
    await expect(nav.locator('[aria-current="page"]'), 'Enter moves the current page').toHaveAttribute('data-nav', 'logs')
    await expect(page.locator(byHook('qds-apps-nav-title'))).toHaveText('Logs')

    await group.focus()
    await page.keyboard.press('Enter')
    await expect(group, 'Enter collapses the nested group').toHaveAttribute('aria-expanded', 'false')
    await expect(nav.locator('[data-nav="logs"]')).toBeHidden()
    await page.keyboard.press('Space')
    await expect(group, 'Space reopens the nested group').toHaveAttribute('aria-expanded', 'true')
  })

  for (const mode of MODES) {
    test(`mini navigation keeps icons centred, named and tooltipped (${mode})`, async ({ page }, testInfo) => {
      await openApps(page, mode)
      const drawer = page.locator(`${byHook('qds-apps-nav-drawer')}`)
      const toggle = page.locator(byHook('qds-apps-nav-toggle'))
      await expandNav(page)
      await toggle.focus()
      await page.keyboard.press('Enter')
      await expect(page.locator('.q-drawer--mini'), 'Enter collapses to the mini rail').toHaveCount(1)
      await expect(toggle).toHaveAccessibleName('Expand navigation')
      await expect(toggle).toHaveAttribute('aria-expanded', 'false')
      await settle(page)
      expect.soft((await box(page.locator('.q-drawer--mini'))).width, 'mini rail is 48px wide').toBeCloseTo(48, 0)

      const items = page.locator('.q-drawer--mini [data-nav]')
      await expect(items).toHaveCount(7)
      const expected = ['Home', 'Deployments', 'Metrics', 'Logs', 'Alerts', 'Members', 'Settings']
      const coarse = await coarsePointer(page)
      for (const [index, item] of (await items.all()).entries()) {
        await expect(item, `${expected[index]} keeps an accessible name`).toHaveAccessibleName(expected[index])
        const geometry = await item.evaluate((element) => {
          const r = element.getBoundingClientRect()
          const icon = element.querySelector('svg')!.getBoundingClientRect()
          const rail = element.closest('.q-drawer')!.getBoundingClientRect()
          return { height: r.height, iconCentre: icon.left + icon.width / 2, railCentre: rail.left + rail.width / 2, width: r.width, railWidth: rail.width }
        })
        if (coarse) expect.soft(geometry.height, `${expected[index]} keeps a touch target`).toBeGreaterThanOrEqual(36)
        else expect.soft(geometry.height, `${expected[index]} is a 36px mini item`).toBeCloseTo(36, 0)
        expect.soft(Math.abs(geometry.iconCentre - geometry.railCentre), `${expected[index]} icon is centred in the rail`).toBeLessThanOrEqual(1)
        expect.soft(geometry.width, `${expected[index]} fits inside the rail`).toBeLessThanOrEqual(geometry.railWidth)
      }

      await expect(page.getByRole('group', { name: 'Monitoring' }).locator('[data-nav]'), 'nested children keep their group').toHaveCount(3)
      const tops = await items.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().top))
      const pitches = tops.slice(1).map((top, index) => top - tops[index])
      expect.soft(Math.max(...pitches) - Math.min(...pitches), `mini items keep an even rhythm (${pitches.map((pitch) => pitch.toFixed(1)).join(', ')})`).toBeLessThanOrEqual(1)
      const itemWidth = (await box(items.first())).width
      expect.soft(itemWidth, 'mini item fills the 48px rail less 4px padding a side (and the drawer border)').toBeGreaterThanOrEqual(38.5)
      expect.soft(itemWidth, 'mini item leaves the rail padding').toBeLessThanOrEqual(40.5)

      const active = drawer.locator('[aria-current="page"]')
      await expect(active).toHaveAttribute('data-nav', 'metrics')
      const rail = await active.evaluate((element) => {
        const before = getComputedStyle(element, '::before')
        return { content: before.content, width: Number.parseFloat(before.width), height: Number.parseFloat(before.height), color: before.backgroundColor }
      })
      expect.soft(rail.content, 'active mini item draws an indicator').not.toBe('none')
      expect.soft(rail.width, 'indicator is a 3px rail').toBeCloseTo(3, 0)
      expect.soft(rail.height, 'indicator is 16px tall').toBeCloseTo(16, 0)
      expect.soft(distance(rail.color, await resolvedColor(page, '--qds-tab-active-rail')), `indicator ${rail.color} uses the accent rail`).toBeLessThanOrEqual(2)

      const tooltip = page.getByRole('tooltip')
      await toggle.focus()
      for (const label of expected) {
        await page.keyboard.press('Tab')
        expect(await focusedText(page), 'Tab reaches every mini destination').toBe(label)
        await expect(tooltip.filter({ hasText: label }), `${label} shows its tooltip on focus`).toBeVisible()
      }

      if (testInfo.project.name === 'desktop') {
        await page.keyboard.press('Shift+Tab')
        await page.mouse.move(0, 0)
        await items.nth(0).hover()
        await expect(tooltip.filter({ hasText: 'Home' }), 'hover shows the tooltip').toBeVisible()
      }
      await items.nth(3).focus()
      await page.keyboard.press('Enter')
      await expect(drawer.locator('[aria-current="page"]'), 'Enter selects in mini mode').toHaveAttribute('data-nav', 'logs')
    })
  }

  test('mini navigation retains the focused tooltip after a stale native focusout', async ({ page }) => {
    await openApps(page)
    await expandNav(page)
    await page.locator(byHook('qds-apps-nav-toggle')).click()
    await expect(page.locator('.q-drawer--mini')).toHaveCount(1)
    await settle(page)

    const members = page.locator('.q-drawer--mini [data-nav="members"]')
    const settings = page.locator('.q-drawer--mini [data-nav="settings"]')
    const tooltip = page.getByRole('tooltip').filter({ hasText: /^Settings$/ })
    await members.focus()
    await expect(page.getByRole('tooltip').filter({ hasText: /^Members$/ })).toHaveCSS('opacity', '1')
    await settle(page)
    await settings.focus()
    await expect(settings).toBeFocused()
    await expect(tooltip).toHaveCSS('opacity', '1')
    await settle(page)
    await expect(page.getByRole('tooltip').filter({ hasText: /^Members$/ })).toHaveCount(0)

    // Only focusout reaches QTooltip's delayed native hide; it must not exercise Vue's @blur.
    const retained = await tooltip.evaluate(async (tip) => {
      const owner = document.activeElement
      const previous = document.querySelector('.q-drawer--mini [data-nav="members"]')!
      const duration = Number.parseFloat(getComputedStyle(tip).getPropertyValue('--q-transition-duration'))
      previous.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: owner }))
      await new Promise<void>((resolve) => setTimeout(resolve, 0))
      for (let frame = 0; frame < 2; frame++) await new Promise(requestAnimationFrame)

      // Observe every frame across the native close transition, not just its initially visible tail.
      let frames = 0
      let intact = true
      const start = performance.now()
      do {
        const css = getComputedStyle(tip)
        intact &&= document.activeElement === owner && tip.isConnected &&
          css.opacity === '1' && css.visibility === 'visible' && tip.getBoundingClientRect().height > 0
        frames++
        await new Promise(requestAnimationFrame)
      } while (performance.now() - start <= duration)
      return { intact, frames, duration }
    })
    expect(retained.duration, 'observe the native 300ms close window').toBe(300)
    expect(retained.frames).toBeGreaterThan(1)
    expect(retained.intact, 'Settings stays focused and fully opaque throughout the stale hide').toBe(true)
    await expect(settings).toBeFocused()
    await expect(tooltip).toBeVisible()
    await expect(tooltip).toHaveCSS('opacity', '1')

    // A late blur from the previous owner must likewise leave Settings alone.
    await members.evaluate(async (previous) => {
      previous.dispatchEvent(new FocusEvent('blur', { relatedTarget: document.activeElement }))
      await new Promise<void>((resolve) => setTimeout(resolve, 0))
      for (let frame = 0; frame < 2; frame++) await new Promise(requestAnimationFrame)
    })
    await settle(page)
    await expect(settings).toBeFocused()
    await expect(tooltip).toBeVisible()
    await expect(tooltip).toHaveCSS('opacity', '1')
  })

  for (const variant of CANONICAL_VARIANTS) {
    test(`navigation demo shows every destination without an inner scroll (${variant})`, async ({ page }) => {
      await openApps(page, 'light', variant)
      await expandNav(page)
      const toggle = page.locator(byHook('qds-apps-nav-toggle'))
      for (const state of ['expanded', 'mini'] as const) {
        if (state === 'mini') {
          await toggle.click()
          await expect(page.locator('.q-drawer--mini')).toHaveCount(1)
        }
        await settle(page)
        await expect
          .poll(
            () =>
              page.locator(byHook('qds-apps-nav-drawer')).evaluate((content) => {
                const frame = content.getBoundingClientRect()
                const hidden = [...content.querySelectorAll<HTMLElement>('[data-nav], .q-expansion-item__container > .q-item')]
                  .filter((item) => item.offsetParent !== null)
                  .filter((item) => {
                    const r = item.getBoundingClientRect()
                    return r.top < frame.top - 0.5 || r.bottom > frame.bottom + 0.5
                  })
                return { overflow: content.scrollHeight - content.clientHeight, hidden: hidden.length }
              }),
            `${state} rail fits its frame`,
          )
          .toEqual({ overflow: 0, hidden: 0 })
        await expect(page.locator(`${byHook('qds-apps-nav-drawer')} [data-nav]`), `${state} rail renders every destination`).toHaveCount(7)
      }
    })
  }

  test('a collapsed nav group carries the indicator for its active child, other expanders do not', async ({ page }) => {
    await openApps(page)
    await expandNav(page)
    const rail = (locator: Locator) =>
      locator.evaluate((element) => {
        const before = getComputedStyle(element, '::before')
        return { content: before.content, width: Number.parseFloat(before.width) || 0 }
      })
    const group = page.locator(`${byHook('qds-apps-nav-group')} .q-expansion-item__container > .q-item`)
    const nav = page.getByRole('navigation', { name: 'Operations console' })
    await expect(nav.locator('[aria-current="page"]')).toHaveAttribute('data-nav', 'metrics')

    expect.soft((await rail(group)).content, 'an open group leaves the indicator on the child').toBe('none')
    await group.click()
    await expect(group).toHaveAttribute('aria-expanded', 'false')
    const collapsed = await rail(group)
    expect.soft(collapsed.content, 'a collapsed group shows the indicator for its hidden active child').not.toBe('none')
    expect.soft(collapsed.width, 'the group indicator is the 3px rail').toBeCloseTo(3, 0)

    const incident = page.locator(byHook('qds-apps-expansion-item')).first()
    const header = incident.locator('.q-expansion-item__container > .q-item')
    await expect(header).toHaveAttribute('aria-expanded', 'false')
    await incident.locator('.q-expansion-item__content').evaluate((content) => {
      const active = document.createElement('div')
      active.className = 'q-item q-item--active'
      content.append(active)
    })
    expect.soft((await rail(header)).content, 'a collapsed expander outside navigation draws no indicator').toBe('none')
  })

  for (const mode of MODES) {
    test(`settings subpage tabs are a compact underline tablist (${mode})`, async ({ page }) => {
      await openApps(page, mode)
      const tablist = page.locator(byHook('qds-apps-subpage-tabs'))
      await expect(tablist).toHaveAttribute('role', 'tablist')
      await expect(tablist).toHaveClass(/qds-subpage-tabs/)
      expect.soft(await style(tablist.locator('.q-tabs__content'), 'justify-content'), 'tabs start at the inline start').toBe('flex-start')
      const divider = await style(tablist, 'box-shadow')
      expect.soft(divider, 'the strip draws an inset hairline divider').toMatch(/inset/)
      expect.soft(distance(divider.match(/color\(srgb[^)]*\)|rgba?\([^)]*\)/)?.[0] ?? 'rgba(0, 0, 0, 0)', await resolvedColor(page, '--qds-stroke-divider')), 'the divider uses the divider stroke').toBeLessThanOrEqual(2)
      const panel = page.locator(`${byHook('qds-apps-subpage-panels')} .q-tab-panel`)
      const spaceLg = await page.locator('body').evaluate((body) => {
        const probe = document.createElement('span')
        probe.style.cssText = 'display:block;position:absolute;width:var(--qds-space-lg)'
        body.append(probe)
        const width = probe.getBoundingClientRect().width
        probe.remove()
        return width
      })
      expect.soft(Number.parseFloat(await style(panel, 'padding-top')), 'panels sit one large space below the tabs').toBeCloseTo(spaceLg, 0)
      expect.soft(Number.parseFloat(await style(panel, 'padding-inline-start')), 'panels align with the tab strip').toBe(0)
      const tabs = tablist.getByRole('tab')
      await expect(tabs).toHaveCount(4)

      const coarse = await coarsePointer(page)
      for (const tab of await tabs.all()) {
        const { height } = await box(tab)
        if (coarse) expect.soft(height, 'coarse tabs keep a touch target').toBeGreaterThanOrEqual(36)
        else expect.soft(height, 'tab row is 36px').toBeCloseTo(36, 0)
        const clipped = await tab.locator('.q-tab__label').evaluate((label) => label.scrollWidth > label.clientWidth + 1)
        expect.soft(clipped, `${await tab.innerText()} label is not clipped`).toBe(false)
      }

      const indicator = async (tab: Locator) =>
        tab.locator('.q-tab__indicator').evaluate((element) => {
          const s = getComputedStyle(element)
          return { opacity: Number(s.opacity), height: element.getBoundingClientRect().height, color: s.backgroundColor === 'rgba(0, 0, 0, 0)' ? s.color : s.backgroundColor, bottom: element.getBoundingClientRect().bottom }
        })
      const active = await indicator(tabs.nth(0))
      const idle = await indicator(tabs.nth(1))
      const tabBottom = (await box(tabs.nth(0))).y + (await box(tabs.nth(0))).height
      expect.soft(active.opacity, 'active underline is visible').toBe(1)
      expect.soft(active.height, 'underline is a thin bar').toBeGreaterThan(0)
      expect.soft(active.height, 'underline stays thin').toBeLessThanOrEqual(4)
      expect.soft(Math.abs(active.bottom - tabBottom), 'underline sits on the tab baseline').toBeLessThanOrEqual(2)
      expect.soft(idle.opacity, 'inactive tabs hide the underline').toBe(0)
      expect.soft(distance(active.color, await resolvedColor(page, '--qds-tab-active-rail')), `underline ${active.color} uses the accent rail`).toBeLessThanOrEqual(2)
      expect.soft(Number(await style(tabs.nth(0), 'font-weight')), 'active label weight').toBeGreaterThanOrEqual(Number(await style(tabs.nth(1), 'font-weight')))
    })
  }

  test('settings subpage scroll arrows never cover a tab label at 393px', async ({ page }) => {
    await openApps(page)
    await page.setViewportSize({ width: 393, height: page.viewportSize()!.height })
    const tablist = page.locator(byHook('qds-apps-subpage-tabs'))
    const tabs = tablist.getByRole('tab')
    // Only the part of each label inside the scroll strip can be covered.
    const measure = () =>
      tablist.evaluate((root) => {
        const content = root.querySelector('.q-tabs__content')!.getBoundingClientRect()
        const arrows = [...root.querySelectorAll('.q-tabs__arrow')]
          .filter((arrow) => {
            const style = getComputedStyle(arrow)
            return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0
          })
          .map((arrow) => arrow.getBoundingClientRect())
        const labels = [...root.querySelectorAll('.q-tab__label')].map((label) => {
          const r = label.getBoundingClientRect()
          return { text: label.textContent, left: Math.max(r.left, content.left), right: Math.min(r.right, content.right), top: r.top, bottom: r.bottom }
        })
        const covered = labels
          .filter((label) => label.right > label.left)
          .filter((label) => arrows.some((arrow) => arrow.left < label.right - 0.5 && arrow.right > label.left + 0.5 && arrow.top < label.bottom && arrow.bottom > label.top))
          .map((label) => label.text)
        const last = labels[labels.length - 1]
        const lastRect = root.querySelector('.q-tab:last-of-type .q-tab__label')!.getBoundingClientRect()
        return { covered, arrows: arrows.length, lastVisible: lastRect.left >= content.left - 0.5 && lastRect.right <= content.right + 0.5 && last.right > last.left }
      })

    await expect.poll(async () => (await measure()).arrows, 'the strip overflows at 393px and shows a scroll arrow').toBeGreaterThan(0)
    expect.soft((await measure()).covered, 'no arrow covers a visible tab label at rest').toEqual([])

    await tabs.first().focus()
    await page.keyboard.press('End')
    await expect(tabs.last()).toBeFocused()
    await expect.poll(async () => (await measure()).lastVisible, 'the last tab label scrolls fully into the strip').toBe(true)
    expect.soft((await measure()).covered, 'no arrow covers a label once scrolled to the end').toEqual([])
  })

  test('settings subpage tabs follow the tablist keyboard pattern', async ({ page }) => {
    await openApps(page)
    const tablist = page.locator(byHook('qds-apps-subpage-tabs'))
    await expect(tablist).toHaveAccessibleName('Workspace settings')
    const tabs = tablist.getByRole('tab')
    const panel = page.locator(`${byHook('qds-apps-subpage-panels')} .q-tab-panel`)

    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true')
    await expect(tablist.locator('[tabindex="0"]'), 'only the selected tab is in the tab order').toHaveCount(1)
    await expect(tabs.nth(0)).toHaveAttribute('aria-controls', 'apps-subpage-panel-general')
    await expect(panel).toHaveAttribute('aria-labelledby', 'apps-subpage-tab-general')
    await expect(panel).toHaveAccessibleName('General')

    await tabs.nth(0).focus()
    await page.keyboard.press('ArrowRight')
    await expect(tabs.nth(1), 'ArrowRight moves focus').toBeFocused()
    await page.keyboard.press('Enter')
    await expect(tabs.nth(1), 'Enter selects').toHaveAttribute('aria-selected', 'true')
    await expect(panel, 'panel follows the selection').toHaveAttribute('id', 'apps-subpage-panel-notifications')
    await expect(panel).toHaveAccessibleName('Notifications')
    await expect(panel.getByRole('switch', { name: 'Daily digest' })).toBeVisible()

    await page.keyboard.press('ArrowLeft')
    await expect(tabs.nth(0), 'ArrowLeft moves focus back').toBeFocused()
    await expect(tabs.nth(1), 'focus alone does not change the selection').toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('End')
    await expect(tabs.nth(3), 'End jumps to the last tab').toBeFocused()
    await page.keyboard.press('Space')
    await expect(tabs.nth(3), 'Space selects').toHaveAttribute('aria-selected', 'true')
    await expect(panel).toHaveAttribute('aria-labelledby', 'apps-subpage-tab-advanced')
    await page.keyboard.press('Home')
    await expect(tabs.nth(0), 'Home jumps to the first tab').toBeFocused()

    if (!(await coarsePointer(page))) {
      await tabs.nth(3).focus()
      const ring = await tabs.nth(3).evaluate((tab) => getComputedStyle(tab).outlineStyle)
      expect.soft(ring, 'focused tab shows a ring').not.toBe('none')
    }
  })

  for (const mode of MODES) {
    test(`dense table keeps 32px rows with segmented controls (${mode})`, async ({ page }) => {
      await openApps(page, mode)
      const table = page.locator(byHook('qds-apps-table'))
      const rows = table.locator('tbody tr')
      await expect(rows).toHaveCount(5)
      const coarse = await coarsePointer(page)
      for (const row of await rows.all()) {
        const { height } = await box(row)
        if (coarse) expect.soft(height, 'coarse rows grow for touch').toBeGreaterThanOrEqual(32)
        else expect.soft(height, 'dense row stays 32px with a segmented control inside').toBeCloseTo(32, 0)
      }

      const segmented = table.locator(`tbody ${byHook('qds-apps-table-traffic')}`).first()
      await expect(segmented).toHaveClass(/qds-table-segmented/)
      await expect(segmented).toHaveAccessibleName('Traffic for checkout-api')
      const cell = await box(segmented.locator('xpath=ancestor::td[1]'))
      const control = await box(segmented)
      expect.soft(control.y, 'segmented control sits inside the row').toBeGreaterThanOrEqual(cell.y - 0.5)
      expect.soft(control.y + control.height, 'segmented control fits the row').toBeLessThanOrEqual(cell.y + cell.height + 0.5)
      if (!coarse) expect.soft(control.height, 'segmented control uses the 24px dense size').toBeLessThanOrEqual(24.5)

      const segments = segmented.locator('.q-btn')
      const pressed = segments.and(page.locator('[aria-pressed="true"]'))
      const idle = segments.and(page.locator('[aria-pressed="false"]')).first()
      await expect(pressed).toHaveCount(1)
      const [on, off] = [await style(pressed, 'background-color'), await style(idle, 'background-color')]
      const [onText, offText] = [await style(pressed, 'color'), await style(idle, 'color')]
      expect.soft(distance(on, off) + distance(onText, offText), `selected segment (${on}/${onText}) stands apart from idle (${off}/${offText})`).toBeGreaterThan(40)

      const positions = await segments.evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect()).map(({ left, right, top }) => ({ left, right, top })))
      for (let index = 1; index < positions.length; index++) {
        expect.soft(Math.abs(positions[index].top - positions[0].top), 'segments share a row').toBeLessThanOrEqual(1)
        expect.soft(positions[index].left - positions[index - 1].right, 'segments are joined').toBeLessThanOrEqual(2)
      }
    })
  }

  test('dense table segmented controls operate from the keyboard', async ({ page }) => {
    await openApps(page)
    const filter = page.locator(byHook('qds-apps-table-filter'))
    await expect(filter).toHaveAccessibleName('Filter services')
    const rows = page.locator(`${byHook('qds-apps-table')} tbody tr`)
    await filter.getByRole('button', { name: 'Needs attention' }).focus()
    await page.keyboard.press('Enter')
    await expect(filter.getByRole('button', { name: 'Needs attention' })).toHaveAttribute('aria-pressed', 'true')
    await expect(rows, 'filter narrows the rows').toHaveCount(2)
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Space')
    await expect(filter.getByRole('button', { name: 'Healthy' }), 'Space selects the previous segment').toHaveAttribute('aria-pressed', 'true')
    await expect(rows).toHaveCount(3)

    const traffic = page.locator(`tbody ${byHook('qds-apps-table-traffic')}`).first()
    await traffic.getByRole('button', { name: 'Green' }).focus()
    await page.keyboard.press('Enter')
    await expect(traffic.getByRole('button', { name: 'Green' })).toHaveAttribute('aria-pressed', 'true')
    await expect(traffic.getByRole('button', { name: 'Blue' })).toHaveAttribute('aria-pressed', 'false')
    if (!(await coarsePointer(page))) {
      expect.soft(await traffic.getByRole('button', { name: 'Green' }).evaluate((button) => getComputedStyle(button).outlineStyle), 'focused segment shows a ring').not.toBe('none')
    }
  })

  for (const mode of MODES) {
    test(`expansion headers fill subtly on hover and when expanded (${mode})`, async ({ page }, testInfo) => {
      await openApps(page, mode)
      const header = page.locator(`${byHook('qds-apps-expansion-item')} .q-expansion-item__container > .q-item`).first()
      const hoverLayer = await resolvedColor(page, '--qds-state-hover')
      const fill = () => style(header, 'background-color')
      const rest = await fill()
      expect.soft(isTransparent(rest), `rest header ${rest} is clear`).toBe(true)

      if (testInfo.project.name === 'desktop') {
        await header.hover()
        await expect.poll(async () => isTransparent(await fill()), 'hover fills the header').toBe(false)
        await expect.poll(fill, 'hover settles on the subtle state layer').toBe(hoverLayer)
        expect.soft(parseColor(hoverLayer)[3], `hover layer ${hoverLayer} stays translucent`).toBeLessThan(0.25)
        await page.mouse.move(0, 0)
      }

      await header.focus()
      await page.keyboard.press('Enter')
      await expect(header, 'Enter expands').toHaveAttribute('aria-expanded', 'true')
      await expect(page.locator(byHook('qds-apps-expansion-item')).first().locator('.q-expansion-item__content')).toBeVisible()
      await page.mouse.move(0, 0)
      await settle(page)
      await expect.poll(fill, 'expanded header rests on the state layer').toBe(hoverLayer)
      if (testInfo.project.name === 'desktop') {
        await header.hover()
        await expect.poll(() => style(header, 'background-image'), 'hovering an expanded header stacks a second layer').not.toBe('none')
        await page.mouse.move(0, 0)
        await header.focus()
      }
      await page.keyboard.press('Space')
      await expect(header, 'Space collapses').toHaveAttribute('aria-expanded', 'false')
    })
  }

  for (const mode of MODES) {
    for (const variant of CANONICAL_VARIANTS) {
      test(`dashboard tiles carry value, label, state and sparkline (${mode} / ${variant})`, async ({ page }) => {
        await openApps(page, mode, variant)
        const tiles = page.locator(`${byHook('qds-apps-tiles')} .qds-tile`)
        await expect(tiles).toHaveCount(6)
        const roles = { alert: 'negative', warning: 'warning', positive: 'positive' } as const
        const sparkHeight = await page.locator('body').evaluate((body) => {
          const probe = document.createElement('span')
          probe.style.cssText = 'display:block;position:absolute;height:var(--qds-tile-spark-height)'
          body.append(probe)
          const height = probe.getBoundingClientRect().height
          probe.remove()
          return height
        })
        expect(sparkHeight, 'spark height token resolves').toBeGreaterThan(0)

        for (const tile of await tiles.all()) {
          const parts = await tile.evaluate((element) => {
            const read = (selector: string) => {
              const node = element.querySelector(selector) as HTMLElement
              const s = getComputedStyle(node)
              const r = node.getBoundingClientRect()
              return { size: Number.parseFloat(s.fontSize), weight: Number(s.fontWeight), color: s.color, width: r.width, height: r.height, left: r.left, right: r.right }
            }
            const spark = element.querySelector('.qds-tile__spark svg')!.getBoundingClientRect()
            const text = element.querySelector('.qds-tile__spark .qds-sr-only') as HTMLElement
            const tile = element.getBoundingClientRect()
            const surface = getComputedStyle(element)
            return {
              value: read('.qds-tile__value'),
              label: read('.qds-tile__label'),
              meta: read('.qds-tile__meta'),
              icon: read('.qds-tile__icon'),
              spark: { width: spark.width, height: spark.height, left: spark.left, right: spark.right },
              srText: { width: text.getBoundingClientRect().width, height: text.getBoundingClientRect().height, text: text.textContent ?? '' },
              tile: { left: tile.left, right: tile.right },
              background: surface.backgroundColor,
              radius: Number.parseFloat(surface.borderTopLeftRadius),
            }
          })
          const label = await tile.locator('.qds-tile__label').innerText()
          expect.soft(parts.value.size, `${label}: value leads the hierarchy`).toBeGreaterThan(parts.label.size)
          expect.soft(parts.value.weight, `${label}: value is emphasised`).toBeGreaterThanOrEqual(600)
          expect.soft(parts.meta.size, `${label}: meta is secondary`).toBeLessThanOrEqual(parts.label.size)
          expect.soft(parseColor(parts.background)[3], `${label}: tile paints an opaque surface`).toBe(1)
          for (const part of ['value', 'label', 'meta'] as const) {
            expect.soft(contrast(parts[part].color, parts.background), `${label}: ${part} text meets 4.5:1 on the tile`).toBeGreaterThanOrEqual(4.5)
          }
          expect.soft(parts.radius, `${label}: tile is rounded`).toBeGreaterThan(0)
          expect.soft(parts.spark.height, `${label}: sparkline uses the spark height token`).toBeCloseTo(sparkHeight, 0)
          expect.soft(parts.spark.left >= parts.tile.left - 0.5 && parts.spark.right <= parts.tile.right + 0.5, `${label}: sparkline stays inside the tile`).toBe(true)
          expect.soft(parts.srText.text, `${label}: sparkline has a text equivalent`).toMatch(/^Trend: /)
          expect.soft(parts.srText.width * parts.srText.height, `${label}: text equivalent is visually hidden`).toBeLessThanOrEqual(1)
          await expect(tile.locator('.qds-tile__spark svg'), `${label}: sparkline is hidden from AT`).toHaveAttribute('aria-hidden', 'true')
        }

        expect.soft(await style(tiles.nth(3), 'outline-style'), 'a neutral tile draws no tone ring').toBe('none')
        for (const [index, tone] of [[0, 'alert'], [1, 'warning'], [2, 'positive']] as const) {
          const tile = tiles.nth(index)
          await expect(tile).toHaveClass(new RegExp(`qds-tile--${tone}`))
          const [fg, soft] = [await resolvedColor(page, `--qds-fg-${roles[tone]}`), await resolvedColor(page, `--qds-surface-${roles[tone]}-soft`)]
          const icon = tile.locator('.qds-tile__icon')
          expect.soft(distance(await style(icon, 'color'), fg), `${tone} icon uses --qds-fg-${roles[tone]}`).toBeLessThanOrEqual(2)
          expect.soft(distance(await style(icon, 'background-color'), soft), `${tone} icon sits on --qds-surface-${roles[tone]}-soft`).toBeLessThanOrEqual(2)
          expect.soft(distance(await style(tile.locator('.qds-tile__meta'), 'color'), fg), `${tone} meta text carries the role colour`).toBeLessThanOrEqual(2)
          const role = await resolvedColor(page, `--qds-color-${roles[tone]}`)
          const ring = await tile.evaluate((element) => {
            const s = getComputedStyle(element)
            return { style: s.outlineStyle, width: Number.parseFloat(s.outlineWidth), offset: s.outlineOffset, color: s.outlineColor }
          })
          expect.soft(ring.style, `${tone} tile draws a tone ring`).toBe('solid')
          expect.soft(ring.width, `${tone} ring is at least a hairline`).toBeGreaterThanOrEqual(1)
          expect.soft(ring.offset, `${tone} ring sits on the tile edge`).toBe('-1px')
          expect.soft(distance(ring.color, role), `${tone} ring ${ring.color} uses --qds-color-${roles[tone]}`).toBeLessThanOrEqual(3)
          await expect(tile.locator('.qds-tile__meta'), `${tone} meaning is spelled out in text`).toHaveText(/^(Critical|Warning|On track):/)
        }
      })
    }
  }

  test('dashboard tile grid reflows without horizontal overflow', async ({ page }) => {
    await openApps(page)
    const grid = page.locator(byHook('qds-apps-tiles'))
    const columns = async () =>
      grid.locator('.qds-tile').evaluateAll((tiles) => new Set(tiles.map((tile) => Math.round(tile.getBoundingClientRect().top))).size)
    const initial = page.viewportSize()!
    if (initial.width >= 1024) expect.soft(6 / (await columns()), 'desktop fits at least three tiles per row').toBeGreaterThanOrEqual(3)

    for (const width of [initial.width, 768, 393]) {
      await page.setViewportSize({ width, height: initial.height })
      await settle(page)
      const overflow = await grid.evaluate((element) => ({
        grid: element.scrollWidth - element.clientWidth,
        page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        tiles: [...element.children].map((tile) => tile.scrollWidth - tile.clientWidth),
      }))
      expect.soft(overflow.grid, `${width}px grid does not scroll horizontally`).toBeLessThanOrEqual(0)
      expect.soft(overflow.page, `${width}px page does not scroll horizontally`).toBeLessThanOrEqual(0)
      for (const [index, tile] of overflow.tiles.entries()) expect.soft(tile, `${width}px tile ${index} does not overflow`).toBeLessThanOrEqual(0)
      const rows = await grid.locator('.qds-tile').evaluateAll((tiles) => {
        const byRow = new Map<number, number[]>()
        for (const tile of tiles) {
          const top = Math.round(tile.getBoundingClientRect().top)
          byRow.set(top, [...(byRow.get(top) ?? []), tile.querySelector('.qds-tile__value')!.getBoundingClientRect().top])
        }
        return [...byRow.values()]
      })
      for (const values of rows) expect.soft(Math.max(...values) - Math.min(...values), `${width}px values in a row share a top`).toBeLessThanOrEqual(1)
    }
    expect.soft(await grid.evaluate((element) => getComputedStyle(element).display), 'tile grid is a CSS grid').toBe('grid')
  })

  test('list-detail collapses to one pane and restores focus on narrow screens', async ({ page }) => {
    await openApps(page)
    const screen = page.locator(byHook('qds-apps-list-detail'))
    const master = page.locator(byHook('qds-apps-list-detail-master'))
    const pane = page.locator(byHook('qds-apps-list-detail-pane'))
    const items = master.locator('.q-item')
    await expect(items).toHaveCount(5)
    await expect(page.getByRole('group', { name: 'Services', exact: true }).getByRole('button'), 'master rows are interactive').toHaveCount(5)

    if (page.viewportSize()!.width > 720) {
      await expect(pane).toHaveAccessibleName('checkout-api')
      await expect(master).toBeVisible()
      await expect(pane).toBeVisible()
      const [m, d] = [await box(master), await box(pane)]
      expect.soft(d.x, 'detail sits beside the list').toBeGreaterThanOrEqual(m.x + m.width - 1)
      await items.nth(1).focus()
      await page.keyboard.press('Enter')
      await expect(items.nth(1)).toHaveAttribute('aria-current', 'true')
      await expect(pane).toHaveAccessibleName('search-indexer')
      await expect(page.locator(byHook('qds-apps-list-detail-back'))).toBeHidden()
      await page.setViewportSize({ width: 393, height: page.viewportSize()!.height })
      await expect(pane, 'an open selection keeps the detail pane on narrow screens').toBeVisible()
      await expect(master).toBeHidden()
      await page.locator(byHook('qds-apps-list-detail-back')).click()
    }

    await expect(master, 'narrow screens start on the list').toBeVisible()
    await expect(pane).toBeHidden()
    await items.nth(3).focus()
    await page.keyboard.press('Enter')
    await expect(master).toBeHidden()
    await expect(pane).toBeVisible()
    await expect(pane.getByRole('heading', { name: 'media-proxy' }), 'focus moves to the detail heading').toBeFocused()
    await expect(pane.getByText('Down')).toBeVisible()

    await page.locator(byHook('qds-apps-list-detail-back')).click()
    await expect(master).toBeVisible()
    await expect(items.nth(3), 'focus returns to the opened item').toBeFocused()
    await expect(items.nth(3)).toHaveAttribute('aria-current', 'true')
    expect.soft(await screen.evaluate((element) => element.scrollWidth - element.clientWidth), 'screen does not overflow').toBeLessThanOrEqual(0)
  })

  test('dialog stepper header fits a 393px screen', async ({ page }) => {
    await openApps(page)
    await page.setViewportSize({ width: 393, height: page.viewportSize()!.height })
    await page.locator(byHook('qds-apps-dialog-trigger')).click()
    const header = page.locator(`${byHook('qds-apps-dialog-stepper')} .q-stepper__header`)
    await expect(header).toBeVisible()
    await settle(page)
    const fit = await header.evaluate((element) => {
      const frame = element.getBoundingClientRect()
      const tabs = [...element.querySelectorAll('.q-stepper__tab')].map((tab) => tab.getBoundingClientRect())
      return { overflow: element.scrollWidth - element.clientWidth, outside: tabs.filter((tab) => tab.left < frame.left - 0.5 || tab.right > frame.right + 0.5).length, tabs: tabs.length }
    })
    expect(fit.tabs, 'three steps').toBe(3)
    expect.soft(fit.overflow, 'stepper header does not scroll horizontally').toBeLessThanOrEqual(0)
    expect.soft(fit.outside, 'every step stays inside the header').toBe(0)
    await expect(header, 'narrow screens contract the step labels').toHaveClass(/q-stepper__header--contracted/)
    const caption = page.locator(byHook('qds-apps-dialog-step-caption'))
    await expect(caption, 'contracted steps keep a named step caption').toHaveText('Step 1 of 3 · Source')
    await expect(caption).toHaveAttribute('aria-live', 'polite')
    await page.locator(`${byHook('qds-apps-dialog')} .q-card__actions .q-btn`).last().click()
    await expect(caption, 'the caption follows the step').toHaveText('Step 2 of 3 · Configure')
  })

  test('dialog flow steps through and restores focus', async ({ page }, testInfo) => {
    await openApps(page)
    const trigger = page.locator(byHook('qds-apps-dialog-trigger'))
    await trigger.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Add service' })
    await expect(dialog).toBeVisible()
    await expect(dialog).toHaveAttribute('aria-modal', 'true')
    await expect(dialog.getByLabel('Service name'), 'first field takes focus').toBeFocused()
    await page.keyboard.type('ledger-api')

    const stepper = dialog.locator(byHook('qds-apps-dialog-stepper'))
    const active = stepper.locator('.q-stepper__tab--active')
    const primary = dialog.locator('.q-card__actions .q-btn').last()
    const back = dialog.getByRole('button', { name: 'Back' })
    const focusInDialog = () => dialog.evaluate((element) => element.contains(document.activeElement) && document.activeElement !== element)
    await expect(active).toContainText('Source')
    await expect(back, 'Back stays rendered but disabled on the first step').toBeDisabled()

    await primary.focus()
    await page.keyboard.press('Enter')
    await expect(active).toContainText('Configure')
    await expect(stepper.locator('.q-stepper__tab--done')).toContainText('Source')
    await expect(primary, 'focus stays on the primary action').toBeFocused()
    await expect(primary).toHaveText('Continue')
    await page.keyboard.press('Enter')
    await expect(active).toContainText('Review')
    await expect(primary, 'the primary action becomes Create in place').toHaveText('Create')
    await expect(primary).toBeFocused()
    await expect(dialog.getByText('ledger-api in eu-west, autoscale on.')).toBeVisible()

    await page.keyboard.press('Shift+Tab')
    await expect(back).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(active, 'Back returns a step').toContainText('Configure')
    await expect(back, 'focus stays on Back').toBeFocused()
    await page.keyboard.press('Enter')
    await expect(active).toContainText('Source')
    await expect(back).toBeDisabled()
    await expect(primary, 'Back disables on the first step and hands focus to the primary action').toBeFocused()
    expect(await focusInDialog(), 'focus never leaves the dialog').toBe(true)

    await page.keyboard.press('Enter')
    await page.keyboard.press('Enter')
    await expect(primary).toHaveText('Create')
    if (escapeCloses(testInfo.project.name)) {
      await page.keyboard.press('Escape')
      await expect(dialog, 'Escape dismisses').toBeHidden()
      await expect(trigger, 'focus returns to the trigger').toBeFocused()
      await trigger.press('Enter')
      await expect(dialog).toBeVisible()
      await primary.focus()
      for (let step = 0; step < 2; step++) await page.keyboard.press('Enter')
      await expect(primary).toHaveText('Create')
    }
    await page.keyboard.press('Enter')
    await expect(dialog).toBeHidden()
    await expect(trigger, 'focus returns after completing').toBeFocused()
    await expect(page.locator(byHook('qds-apps-dialog-result'))).toHaveText(/created in eu-west\.$/)
  })
})
