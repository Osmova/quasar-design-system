import { expect, test, type Page } from '@playwright/test'
import { applyTheme, computed, gotoGalleryPage, resolvedColor } from './helpers'

async function openComponents(page: Page) {
  await page.goto('/#components')
  await gotoGalleryPage(page, 'Components')
}

async function openCatalog(page: Page) {
  await page.goto('/#catalog')
  await gotoGalleryPage(page, 'Catalog')
}

async function resolvedRadius(page: Page, token: string): Promise<string> {
  return page.locator('body').evaluate((element, name) => {
    const probe = document.createElement('span')
    probe.style.borderTopLeftRadius = `var(${name})`
    element.append(probe)
    const radius = getComputedStyle(probe).borderTopLeftRadius
    probe.remove()
    return radius
  }, token)
}

function srgbChannels(color: string): [number, number, number] {
  const srgb = color.match(/color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)/)
  if (srgb) return [Number(srgb[1]) * 255, Number(srgb[2]) * 255, Number(srgb[3]) * 255]
  const rgb = color.match(/rgba?\(([\d.]+), ([\d.]+), ([\d.]+)/)
  if (!rgb) throw new Error(`Unparseable color: ${color}`)
  return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
}

function contrastRatio(a: string, b: string): number {
  const luminance = (color: string) => {
    const [r, g, b] = srgbChannels(color).map((channel) => {
      const value = channel / 255
      return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

function durationInMs(value: string): number {
  const trimmed = value.trim()
  if (trimmed.endsWith('ms')) return Number.parseFloat(trimmed)
  if (trimmed.endsWith('s')) return Number.parseFloat(trimmed) * 1000
  return Number.parseFloat(trimmed)
}

test.describe('QDS official stable data and layout modes', () => {
  test('QTable exposes dark, custom controls, visible columns, fullscreen, and chrome-free modes', async ({ page }) => {
    await openComponents(page)
    await applyTheme(page, 'light', 'fluent')

    const table = page.locator('[data-test="qds-table-official-modes"]')
    await expect(table).toHaveClass(/q-table--dark/)
    await expect(table).toHaveCSS('background-color', await resolvedColor(page, '--qds-text-strong'))
    await expect(table.getByLabel('Visible table columns')).toBeVisible()
    await expect(table.getByRole('button', { name: 'View table fullscreen' })).toBeVisible()
    await expect(table.locator('.q-table__top')).toContainText('Explicit dark mode')
    await expect(table.locator('.q-table__bottom')).toContainText('Showing 3 audited surfaces')
    await expect(table.locator('th')).toHaveCount(2)

    await table.getByLabel('Visible table columns').click()
    await page.getByRole('option', { name: 'State' }).click()
    await page.keyboard.press('Escape')
    await expect(table.locator('th')).toHaveCount(3)

    await table.getByRole('button', { name: 'View table fullscreen' }).click()
    await expect(table).toHaveClass(/fullscreen/)
    expect(await computed(page, '[data-test="qds-table-official-modes"]', 'border-top-left-radius')).toBe('0px')
    await table.getByRole('button', { name: 'Exit table fullscreen' }).click()
    await expect(table).not.toHaveClass(/fullscreen/)

    const noChrome = page.locator('[data-test="qds-table-no-chrome"]')
    await expect(noChrome.locator('thead')).toHaveCount(0)
    await expect(noChrome.locator('.q-table__bottom')).toHaveCount(0)
  })

  test('QTree represents dark and connector-free public modes', async ({ page }) => {
    await openCatalog(page)
    await applyTheme(page, 'dark', 'fluent')

    const tree = page.locator('[data-test="qds-tree-dark-no-connectors"]')
    await expect(tree).toHaveClass(/q-tree--dark/)
    await expect(tree).toHaveClass(/q-tree--no-connectors/)
    await expect(tree.locator('.q-tree__node-header.q-tree__node--selected')).toContainText('Contrast checks')
    expect(await computed(page, '[data-test="qds-tree-dark-no-connectors"] .q-tree__node-header', 'display', '::before')).toBe('none')
  })

  for (const variant of ['ink', 'one', 'term'] as const) {
    test(`keeps explicit QTable and QTree dark in light/${variant}`, async ({ page }) => {
      await openComponents(page)
      await applyTheme(page, 'light', variant)

      const table = page.locator('[data-test="qds-table-official-modes"]')
      await expect(table).toHaveClass(/q-table--dark/)
      await expect(table).toHaveCSS('background-color', await resolvedColor(page, '--qds-text-strong'))
      const darkHeaderBackground = await table.evaluate((element) => {
        const sample = document.createElement('div')
        sample.style.backgroundColor = getComputedStyle(element).getPropertyValue('--qds-table-header-bg')
        element.append(sample)
        const color = getComputedStyle(sample).backgroundColor
        sample.remove()
        return color
      })
      await expect(table.locator('thead tr')).toHaveCSS('background-color', darkHeaderBackground)
      const darkHeaderText = await table.evaluate((element) => {
        const sample = document.createElement('div')
        sample.style.color = getComputedStyle(element).getPropertyValue('--qds-table-header-text')
        element.append(sample)
        const color = getComputedStyle(sample).color
        sample.remove()
        return color
      })
      await expect(table.locator('th').first()).toHaveCSS('color', darkHeaderText)
      expect(
        contrastRatio(await computed(page, '[data-test="qds-table-official-modes"] th', 'color'), darkHeaderBackground),
        `light/${variant} explicit-dark muted header keeps AA text contrast`,
      ).toBeGreaterThanOrEqual(4.5)
      await expect(table.locator('th').first()).toHaveCSS(
        'border-bottom-color',
        await table.locator('td').first().evaluate((element) => getComputedStyle(element).borderBottomColor),
      )
      await expect(table.locator('td').first()).toHaveCSS('color', await resolvedColor(page, '--qds-surface-0'))

      if (variant === 'term') {
        // Local dark inverts Term's light-page tokens; it is not the global Term dark palette.
        await expect(table).toHaveCSS('background-color', 'rgb(14, 13, 11)')
        await expect(table.locator('td').first()).toHaveCSS('color', 'rgb(248, 246, 240)')
        await expect(table.locator('th').first()).toHaveCSS('text-transform', 'uppercase')
        await expect(table).toHaveCSS('box-shadow', 'none')
        await expect(table).toHaveCSS('border-top-width', '1px')
        await expect(table.locator('thead tr')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
        expect(
          contrastRatio(darkHeaderText, await table.evaluate((element) => getComputedStyle(element).backgroundColor)),
          'Term transparent explicit-dark header keeps AA contrast against the inverted table surface',
        ).toBeGreaterThanOrEqual(4.5)
      }

      await openCatalog(page)
      const tree = page.locator('[data-test="qds-tree-dark-no-connectors"]')
      await expect(tree).toHaveClass(/q-tree--dark/)
      await expect(tree).toHaveCSS('background-color', await resolvedColor(page, '--qds-text-strong'))
      await expect(tree.locator('.q-tree__node-header').first()).toHaveCSS('color', await resolvedColor(page, '--qds-surface-0'))
      if (variant === 'term') {
        await expect(tree).toHaveCSS('background-color', 'rgb(14, 13, 11)')
        await expect(tree.locator('.q-tree__node-header').first()).toHaveCSS('color', 'rgb(248, 246, 240)')
        await expect(tree).toHaveClass(/q-tree--no-connectors/)
        expect(await computed(page, '[data-test="qds-tree-dark-no-connectors"] .q-tree__node-header', 'display', '::before')).toBe('none')
      }
    })
  }

  test('QPagination input mode changes page and keeps QDS geometry in One', async ({ page }) => {
    await openComponents(page)
    await applyTheme(page, 'light', 'one')

    const pagination = page.locator('[data-test="qds-pagination-input"]')
    await expect(page.getByRole('group', { name: 'Input mode pagination' })).toBeVisible()
    const input = pagination.locator('input[type="number"]')
    await expect(input).toBeVisible()
    await input.fill('5')
    await input.press('Enter')
    await expect(page.locator('[data-test="qds-pagination-input-current-page"]')).toHaveText('Current page: 5')
    await expect(input).toHaveAttribute('placeholder', '5 / 7')
    await expect(pagination, 'QPagination has no track; buttons carry the geometry').toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    await expect(pagination.locator('.q-btn').first(), 'One pagination buttons keep the 44px touch height').toHaveCSS('height', '44px')
    await expect(pagination.locator('.q-btn').first(), 'One input-mode buttons use the button radius').toHaveCSS('border-top-left-radius', await resolvedRadius(page, '--qds-button-radius'))
    await expect(input).toHaveCSS('color', await resolvedColor(page, '--qds-text'))

    await applyTheme(page, 'light', 'fluent')
    for (const button of await pagination.locator('.q-btn').all()) {
      await expect(button, 'Fluent input-mode buttons use the 6px control radius').toHaveCSS('border-top-left-radius', await resolvedRadius(page, '--qds-radius-control'))
    }
    await expect(page.locator('[data-test="qds-pagination"] .q-btn[aria-current="page"]'), 'Fluent selected page keeps the control radius').toHaveCSS('border-top-left-radius', await resolvedRadius(page, '--qds-radius-control'))
  })

  test('drawer containers preserve seamless and mini-to-overlay states without behavior automation', async ({ page }) => {
    await openComponents(page)
    await applyTheme(page, 'light', 'ink')

    const seamless = page.locator('[data-test="qds-drawer-seamless"]')
    await expect(seamless).toBeVisible()
    expect(await computed(page, '[data-test="qds-drawer-seamless"]', 'border-inline-end-width')).toBe('0px')

    const miniOverlay = page.locator('[data-test="qds-drawer-mini-overlay"]').locator('..')
    await expect(miniOverlay).toHaveClass(/q-drawer--mini/)
    await expect(miniOverlay).toHaveClass(/q-drawer--on-top/)
    await page.getByRole('button', { name: 'Expand mini drawer' }).click()
    await expect(miniOverlay).toHaveClass(/q-drawer--standard/)
    await expect(miniOverlay).toHaveClass(/q-drawer--on-top/)
    await expect(page.getByRole('button', { name: 'Collapse mini drawer' })).toBeVisible()
  })

  for (const [mode, variant] of [
    ['dark', 'fluent'],
    ['light', 'ink'],
    ['light', 'one'],
    ['dark', 'term'],
  ] as const) {
    test(`renders stable data/layout modes for ${mode}/${variant}`, async ({ page }) => {
      await openComponents(page)
      await applyTheme(page, mode, variant)
      await expect(page.locator('[data-test="qds-table-official-modes"]')).toBeVisible()
      await expect(page.locator('[data-test="qds-drawer-seamless"]')).toBeVisible()
      await expect(page.locator('[data-test="qds-drawer-mini-overlay"]')).toBeVisible()

      await openCatalog(page)
      await expect(page.locator('[data-test="qds-tree-dark-no-connectors"]')).toBeVisible()
    })
  }

  test('keeps the stable fixtures legible in RTL and reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openComponents(page)
    await applyTheme(page, 'light', 'one')
    await page.evaluate(() => {
      document.documentElement.dir = 'rtl'
      document.body.dir = 'rtl'
    })

    const drawer = page.locator('[data-test="qds-drawer-mini-overlay"]').locator('..')
    await expect(drawer).toHaveClass(/q-drawer--mini/)
    expect(durationInMs(await computed(page, '[data-test="qds-table-official-modes"]', 'transition-duration'))).toBeLessThanOrEqual(1)
  })
})
