import { expect, test, type Page } from '@playwright/test'
import { applyTheme, CANONICAL_VARIANTS, waitForThemePaint } from './helpers'

const labels = ['Fluent', 'Ink', 'One', 'Term', 'Shadcn', 'Atrium']

async function expectThemeMenuClosed(page: Page) {
  // Count the DOM node, including hidden leave-transition content, before reopening.
  await expect(page.locator('#gallery-theme-menu')).toHaveCount(0)
  await expect(page.locator('.gallery-theme')).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('.gallery-theme')).toBeFocused()
}

test('native Theme menu supports keyboard selection, dismissal and isolated state', async ({ page }) => {
  await page.goto('/#tokens?variant=shadcn&keep=header')
  const url = page.url()
  const theme = page.getByRole('button', { name: 'Theme: System', exact: true })
  await expect(theme).toHaveAttribute('aria-haspopup', 'menu')
  expect(await theme.evaluate(el => el.tagName)).toBe('BUTTON')
  await theme.focus()
  await page.keyboard.press('Enter')
  const menu = page.getByRole('menu', { name: 'Theme', exact: true })
  const light = menu.getByRole('menuitemradio', { name: 'Light', exact: true })
  const dark = menu.getByRole('menuitemradio', { name: 'Dark', exact: true })
  const system = menu.getByRole('menuitemradio', { name: 'System', exact: true })
  await expect(theme).toHaveAttribute('aria-expanded', 'true')
  await expect(system).toHaveAttribute('aria-checked', 'true')
  await expect(light).toHaveAttribute('aria-checked', 'false')
  await expect(dark).toHaveAttribute('aria-checked', 'false')
  await expect(system).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(light).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(dark).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(menu).toBeHidden()
  await expectThemeMenuClosed(page)
  await expect(page.getByRole('button', { name: 'Theme: Dark', exact: true })).toBeFocused()
  await expect(page.locator('body')).toHaveAttribute('data-qds-mode', 'dark')
  await expect(page.locator('body')).toHaveAttribute('data-qds-variant', 'shadcn')
  expect(page.url()).toBe(url)

  for (const mode of ['Light', 'System']) {
    await page.locator('.gallery-theme').click()
    await menu.getByRole('menuitemradio', { name: mode, exact: true }).click()
    await expect(page.locator('.gallery-theme')).toHaveAttribute('aria-label', `Theme: ${mode}`)
    await expectThemeMenuClosed(page)
    expect(page.url()).toBe(url)
  }
  await page.locator('.gallery-theme').focus()
  await page.keyboard.press('Enter')
  await expect(system).toBeFocused()
  await page.keyboard.press('ArrowUp')
  await expect(dark).toBeFocused()
  await page.keyboard.press('Home')
  await expect(light).toBeFocused()
  await page.keyboard.press('End')
  await expect(system).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
  await expectThemeMenuClosed(page)
  await expect(page.locator('.gallery-theme')).toBeFocused()
  await expect(page.locator('.gallery-theme')).toHaveAttribute('aria-expanded', 'false')

  await page.locator('.gallery-theme').click()
  await page.getByRole('combobox', { name: 'Shadcn base palette', exact: true }).click()
  await page.getByRole('option', { name: 'Slate', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(page.locator('body')).toHaveAttribute('data-qds-shadcn-base-color', 'slate')
  expect(page.url()).toBe(url)
})

test('wordmark renders in the loaded Inter face with weight contrast, not a separate display font', async ({ page }) => {
  const fontRequests: string[] = []
  page.on('request', request => { if (request.resourceType() === 'font') fontRequests.push(request.url()) })
  await page.goto('/')
  await waitForThemePaint(page)
  const evidence = await page.evaluate(() => {
    const title = document.querySelector('.gallery-title')!
    const mark = document.querySelector('.gallery-title__mark')!
    const sub = document.querySelector('.gallery-title__sub')!
    const button = document.querySelector('.gallery-theme')!
    const style = getComputedStyle(title)
    return {
      family: style.fontFamily,
      size: parseFloat(style.fontSize),
      markWeight: parseInt(getComputedStyle(mark).fontWeight, 10),
      subWeight: parseInt(getComputedStyle(sub).fontWeight, 10),
      loaded: document.fonts.check('600 18px "Inter Variable"', 'Quasar Design System'),
      body: getComputedStyle(document.body).fontFamily,
      button: getComputedStyle(button).fontFamily,
    }
  })
  expect(evidence.family).toContain('Inter')
  expect(evidence.size).toBeGreaterThanOrEqual(16)
  expect(evidence.size).toBeLessThanOrEqual(20)
  expect(evidence.markWeight).toBeGreaterThan(evidence.subWeight)
  expect(evidence.loaded).toBe(true)
  expect(evidence.body).toContain('Inter')
  expect(evidence.button).toContain('Inter')
  expect(evidence.family + evidence.body + evidence.button).not.toContain('Playwrite')
  for (const url of fontRequests) expect(new URL(url).origin).toBe(new URL(page.url()).origin)
})

test('shell chrome keeps identical geometry and type across every variant and mode', async ({ page }) => {
  await page.goto('/')
  await waitForThemePaint(page)
  const measure = async () => page.evaluate(() => {
    const rect = (selector: string) => {
      const r = document.querySelector(selector)!.getBoundingClientRect()
      return { x: Math.round(r.x), width: Math.round(r.width), height: Math.round(r.height) }
    }
    const tab = document.querySelector('.gallery-nav .q-tab')!
    const track = document.querySelector('.gallery-nav .q-tabs__content')!
    return {
      switcher: rect('.gallery-switcher'), links: rect('.gallery-links'),
      theme: rect('.gallery-theme'), toolbar: rect('.q-toolbar'), nav: rect('.gallery-nav'),
      navTab: { ...rect('.gallery-nav .q-tab'), font: getComputedStyle(tab).fontFamily, size: getComputedStyle(tab).fontSize },
      navTrack: { radius: getComputedStyle(track).borderRadius, background: getComputedStyle(track).backgroundColor },
    }
  })
  let baseline: Awaited<ReturnType<typeof measure>> | null = null
  for (const mode of ['light', 'dark'] as const) {
    for (const variant of CANONICAL_VARIANTS) {
      await applyTheme(page, mode, variant)
      const geometry = await measure()
      if (!baseline) baseline = geometry
      else expect(geometry, `${mode}/${variant} must not restyle the gallery shell`).toEqual(baseline)
    }
  }
})

test('header links reach both deployed catalogs', async ({ page }) => {
  await page.goto('/')
  for (const [name, label] of [['histoire', 'Histoire'], ['storybook', 'Storybook']] as const) {
    const link = page.locator(`[data-test="qds-link-${name}"]`)
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', `${name}/`)
    expect(await link.evaluate(el => el.tagName)).toBe('A')
    await expect(link).toContainText(label)
  }
})

for (const variant of CANONICAL_VARIANTS) {
  for (const mode of ['light', 'dark', 'system'] as const) {
    test(`${variant} ${mode}: header bounds and reachable variant controls`, async ({ page, isMobile }) => {
      await page.goto('/')
      await applyTheme(page, mode === 'system' ? 'light' : mode, variant)
      if (mode === 'system') {
        await page.evaluate(() => {
          (window as unknown as { __qdsGallery: { setMode(value: 'system'): void } }).__qdsGallery.setMode('system')
        })
        await waitForThemePaint(page)
      }
      const group = page.getByRole('group', { name: 'Variant', exact: true })
      await expect(group.getByRole('button')).toHaveCount(labels.length)
      const geometry = await page.evaluate(() => {
        const rect = (selector: string) => {
          const r = document.querySelector(selector)!.getBoundingClientRect()
          return { x: r.x, right: r.right, y: r.y, bottom: r.bottom, width: r.width }
        }
        return { title: rect('.gallery-title'), controls: rect('.gallery-controls'), theme: rect('.gallery-theme'),
          viewport: innerWidth, scroll: document.documentElement.scrollWidth, palette: document.querySelector('.gallery-palette') ? rect('.gallery-palette') : null }
      })
      expect(geometry.scroll).toBeLessThanOrEqual(geometry.viewport)
      for (const r of [geometry.title, geometry.controls, geometry.theme]) {
        expect(r.x).toBeGreaterThanOrEqual(0)
        expect(r.right).toBeLessThanOrEqual(geometry.viewport)
      }
      expect(geometry.viewport - geometry.theme.right).toBeLessThanOrEqual(16)
      expect(geometry.title.right).toBeLessThanOrEqual(geometry.theme.x)
      if (isMobile) expect(geometry.controls.y).toBeGreaterThanOrEqual(geometry.title.bottom)
      else expect(geometry.controls.right).toBeLessThanOrEqual(geometry.theme.x)
      if (geometry.palette) {
        expect(geometry.palette.right).toBeLessThanOrEqual(geometry.controls.right)
        expect(geometry.palette.width).toBeGreaterThanOrEqual(128)
      }
      // Focus scrolls native buttons into view; no clipped offscreen controls are unreachable.
      for (const label of labels) {
        const button = group.getByRole('button', { name: label, exact: true })
        await button.focus()
        await expect(button).toBeFocused()
        await expect.poll(async () => {
          const bounds = await button.boundingBox()
          const container = await group.boundingBox()
          return bounds!.x >= container!.x - 1 && bounds!.x + bounds!.width <= container!.x + container!.width + 1
        }).toBe(true)
      }
      await page.locator('.gallery-theme').click()
      await expect(page.getByRole('menuitemradio', { name: mode[0].toUpperCase() + mode.slice(1), exact: true })).toHaveAttribute('aria-checked', 'true')
      await page.keyboard.press('Escape')
      await expectThemeMenuClosed(page)
    })
  }
}
