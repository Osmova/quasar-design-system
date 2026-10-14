import { expect, test, type Page, type TestInfo } from '@playwright/test'
import type {} from '../src/reference'

// The import above is type-only after TS erasure: never run a browser module in
// Node. This declaration gives page.evaluate the exact window hook contract.
type Reference = typeof import('../src/reference').reference
declare global { interface Window { __shadcnReference: Reference } }

const browserProblems = new WeakMap<Page, { consoleErrors: string[], networkFailures: string[] }>()
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const problems = { consoleErrors: [] as string[], networkFailures: [] as string[] }
  browserProblems.set(page, problems)
  page.on('pageerror', error => problems.consoleErrors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') problems.consoleErrors.push(message.text()) })
  page.on('requestfailed', request => problems.networkFailures.push(request.url()))
  page.on('response', response => { if (response.status() >= 400) problems.networkFailures.push(`${response.status()} ${response.url()}`) })
  await page.route('**/*', route => {
    const url = new URL(route.request().url())
    return url.origin === 'http://127.0.0.1:5181' ? route.continue() : route.abort('blockedbyclient')
  })
})

test.afterEach(async ({ page }) => {
  expect(browserProblems.get(page)?.consoleErrors).toEqual([])
  expect(browserProblems.get(page)?.networkFailures).toEqual([])
})

async function ready(page: Page) {
  await expect(page.locator('html')).toHaveAttribute('data-reference-ready', 'true')
  await page.waitForFunction(() => window.__shadcnReference?.ready === true)
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true)
}

async function captureRepeat(page: Page, testInfo: TestInfo, name: string, fullPage = false) {
  await page.evaluate(() => window.__shadcnReference.settle())
  const first = await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage, animations: 'disabled' })
  await page.evaluate(() => window.__shadcnReference.settle())
  const second = await page.screenshot({ fullPage, animations: 'disabled' })
  expect(second.equals(first), 'same-state captures must be byte-identical').toBe(true)
  await testInfo.attach(name, { body: first, contentType: 'image/png' })
}

async function unclippedPortal(page: Page, role: 'dialog' | 'menu' | 'listbox') {
  const portal = page.getByRole(role)
  await expect(portal).toBeVisible()
  const bounds = await portal.boundingBox()
  const viewport = page.viewportSize()!
  expect(bounds).not.toBeNull()
  expect(bounds!.x).toBeGreaterThanOrEqual(0)
  expect(bounds!.y).toBeGreaterThanOrEqual(0)
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width)
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height)
}

for (const palette of ['neutral', 'gray', 'zinc', 'stone', 'slate'] as const) {
  for (const mode of ['light', 'dark'] as const) {
    test(`${palette} ${mode}: source tokens, native geometry, offline repeatability`, async ({ page }, testInfo) => {
      await page.goto(`/?palette=${palette}&mode=${mode}&capture=1`)
      await ready(page)
      await expect(page.locator('[data-reference-root]')).toHaveAttribute('data-palette', palette)
      await expect(page.locator('html')).toHaveAttribute('data-reference-mode', mode)
      expect(await page.evaluate(() => {
        const values = window.__shadcnReference.getTokens()
        const probe = document.createElement('span')
        document.body.append(probe)
        const mismatches: string[] = []
        for (const [name, value] of Object.entries(values)) {
          if (name === 'radius') continue
          probe.style.color = value
          const expected = getComputedStyle(probe).color
          probe.style.color = `var(--${name})`
          if (getComputedStyle(probe).color !== expected) mismatches.push(name)
        }
        probe.remove()
        return mismatches
      })).toEqual([])
      const button = page.locator('[data-family="button"] [data-case="default"]')
      expect(await button.evaluate(element => {
        const styles = getComputedStyle(element)
        return { height: element.getBoundingClientRect().height, radius: styles.borderRadius, fontSize: styles.fontSize, font: styles.fontFamily }
      })).toMatchObject({ height: 36, radius: '8px', fontSize: '14px' })
      await expect(button).toHaveCSS('font-family', /Inter Variable/)
      await expect(page.locator('[data-family="input"] input[data-case="default"]')).toHaveCSS('height', '36px')
      await expect(page.locator('[data-slot="card"]')).toHaveCSS('border-radius', '14px')
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      expect(await page.evaluate(() => document.fonts.check('500 14px "Inter Variable"'))).toBe(true)
      await captureRepeat(page, testInfo, `${palette}-${mode}`, true)
    })
  }
}

test('mode/palette/family hooks and real portal focus lifecycle', async ({ page }, testInfo) => {
  await page.goto('/?capture=1')
  await ready(page)
  await page.evaluate(async () => {
    await window.__shadcnReference.setPalette('gray')
    await window.__shadcnReference.setMode('dark')
    await window.__shadcnReference.setPalette('zinc')
  })
  await expect(page.locator('html')).toHaveAttribute('data-reference-palette', 'zinc')
  expect(await page.evaluate(() => document.documentElement.style.getPropertyValue('--destructive-foreground'))).toBe('')
  await page.evaluate(() => window.__shadcnReference.setFamily('dialog'))
  const trigger = page.getByRole('button', { name: 'Edit profile', exact: true })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Edit profile' })
  await expect(dialog).toBeVisible()
  await page.evaluate(() => window.__shadcnReference.settle())
  expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true)
  await unclippedPortal(page, 'dialog')
  await captureRepeat(page, testInfo, 'dialog-open')
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
  await page.evaluate(() => window.__shadcnReference.setFamily('menu'))
  await page.getByRole('button', { name: 'Open menu', exact: true }).click()
  await expect(page.getByRole('menu')).toBeVisible()
  await page.evaluate(() => window.__shadcnReference.settle())
  await unclippedPortal(page, 'menu')
  await captureRepeat(page, testInfo, 'menu-open')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Open menu', exact: true })).toBeFocused()
  await page.evaluate(async () => {
    await window.__shadcnReference.setFamily('selection')
    await window.__shadcnReference.openOverlay('select')
  })
  await expect(page.getByRole('listbox')).toBeVisible()
  await unclippedPortal(page, 'listbox')
  await captureRepeat(page, testInfo, 'select-open')
  await page.evaluate(() => window.__shadcnReference.reset())
  await expect(page.getByRole('listbox')).toBeHidden()
  await ready(page)
})
