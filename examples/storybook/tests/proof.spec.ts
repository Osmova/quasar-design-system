import { test, expect, type Page, type Frame } from '@playwright/test'

type Host = 'histoire' | 'storybook'
const cases = ['button', 'field', 'tabs', 'menu'] as const
const origins = { histoire: 'http://127.0.0.1:6196', storybook: 'http://127.0.0.1:6197' }
const errors = new WeakMap<Page, string[]>()

test.beforeEach(({ page }) => {
  const failures: string[] = []
  errors.set(page, failures)
  page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`))
  page.on('console', (message) => { if (message.type() === 'error') failures.push(`console: ${message.text()}`) })
  page.on('requestfailed', (request) => failures.push(`request: ${request.url()} ${request.failure()?.errorText}`))
  page.on('response', (response) => { if (response.status() >= 400) failures.push(`HTTP ${response.status()}: ${response.url()}`) })
})
test.afterEach(({ page }) => {
  expect(errors.get(page), 'no browser console, network or page errors').toEqual([])
})

async function canvas(page: Page, host: Host): Promise<Frame> {
  const marker = host === 'histoire' ? '__sandbox.html' : 'iframe.html'
  await expect.poll(() => page.frames().filter((frame) => frame.url().includes(marker)).length).toBe(1)
  const frame = page.frames().find((item) => item.url().includes(marker))!
  await expect(frame.locator('.qds-catalog-proof')).toBeVisible()
  return frame
}

async function open(page: Page, host: Host, index: number) {
  const route = host === 'histoire'
    ? `/#/story/stories-catalog-proof-story-vue?variantId=stories-catalog-proof-story-vue-${index}`
    : `/?path=/story/qds-shared-catalog-proof--${cases[index]}-proof`
  await page.goto(origins[host] + route)
  return canvas(page, host)
}

async function toggle(page: Page, host: Host, key: string) {
  if (host === 'storybook') await page.locator(`label[for="control-${key}"]`).click()
  else await page.getByRole('checkbox', { name: key, exact: true }).click()
}

async function selectArg(page: Page, host: Host, key: string, value: string) {
  if (host === 'storybook') await page.locator(`#control-${key}`).selectOption(value)
  else {
    const label = page.locator('span').filter({ hasText: new RegExp(`^${key}$`) })
    await page.locator('.histoire-wrapper').filter({ has: label }).first().click()
    await page.getByText(value, { exact: true }).last().click()
  }
}

async function theme(page: Page, frame: Frame, host: Host, axis: 'mode' | 'variant' | 'shadcn palette', value: string) {
  if (host === 'histoire') await frame.getByLabel(axis, { exact: true }).selectOption(value)
  else {
    const prefix = axis === 'mode' ? 'Design-system color mode' : axis === 'variant' ? 'Design-system variant' : 'Shadcn palette axis'
    await page.getByRole('button', { name: new RegExp(`^${prefix}`) }).click()
    const title = axis === 'mode' ? value[0].toUpperCase() + value.slice(1) : value
    await page.getByText(title, { exact: true }).last().click()
  }
}

async function assertTheme(frame: Frame, mode: string, resolved: string, variant: string) {
  const body = frame.locator('body')
  await expect(body).toHaveAttribute('data-qds-mode', mode)
  await expect(body).toHaveAttribute('data-qds-resolved', resolved)
  await expect(body).toHaveAttribute('data-qds-variant', variant)
  await expect(body).toHaveClass(new RegExp(`qds-theme-${resolved}`))
  await expect(body).toHaveClass(new RegExp(`qds-variant-${variant}`))
  const readout = frame.locator('.qds-catalog-proof__readout')
  await expect(readout).toContainText(`mode: ${mode} (${resolved})`)
  await expect(readout).toContainText(`variant: ${variant}`)
  await expect(readout).toContainText(`data-qds-mode=${mode}`)
  await expect(readout).toContainText(`data-qds-resolved=${resolved}`)
  await expect(readout).toContainText(`data-qds-variant=${variant}`)
}

for (const host of ['histoire', 'storybook'] as const) {
  test(`${host}: shared button defaults, native SVG and plain/split loading`, async ({ page }) => {
    const frame = await open(page, host, 0)
    await expect(frame.locator('.q-btn')).toHaveText('Neutral')
    await expect(frame.locator('.q-spinner')).toHaveCount(0)
    await toggle(page, host, 'loading')
    await expect(frame.locator('.q-spinner')).toHaveCount(1)
    await toggle(page, host, 'split')
    await expect(frame.locator('.q-btn-dropdown .q-spinner')).toHaveCount(1)
    await toggle(page, host, 'loading')
    await expect(frame.locator('.q-spinner')).toHaveCount(0)
    await expect(frame.locator('.q-btn-dropdown__arrow svg path')).not.toHaveCount(0)
    await expect(frame.locator('.material-icons')).toHaveCount(0)
    if (host === 'storybook') {
      await page.getByRole('button', { name: 'Reset controls', exact: true }).click()
      await expect(frame.locator('.q-btn-dropdown')).toHaveCount(0)
      await expect(frame.locator('.q-spinner')).toHaveCount(0)
    }
  })

  test(`${host}: field edits, counter, marginals, error, readonly and disabled`, async ({ page }) => {
    const frame = await open(page, host, 1)
    const input = frame.locator('.q-field__input')
    await expect(input).toHaveValue('Draft value')
    await input.fill('Typed proof')
    for (const key of ['counter', 'hint', 'marginals']) await toggle(page, host, key)
    await expect(frame.locator('.q-field')).toContainText('11 / 24')
    await expect(frame.locator('.q-field')).toContainText('Helper text under the control')
    await expect(frame.locator('.q-field')).toContainText('EUR')
    await expect(frame.locator('.q-field svg')).toHaveCount(2)
    await toggle(page, host, 'error')
    await expect(frame.locator('.q-field')).toContainText('Check the value and try again')
    await toggle(page, host, 'readonly')
    await expect(input).toHaveAttribute('readonly', '')
    await input.press('End'); await input.press('X')
    await expect(input).toHaveValue('Typed proof')
    await toggle(page, host, 'readonly')
    await toggle(page, host, 'disable')
    await expect(input).toBeDisabled()
  })

  test(`${host}: twelve tabs, disabled state and held native arrow`, async ({ page }) => {
    const frame = await open(page, host, 2)
    await selectArg(page, host, 'tabCount', '12')
    await selectArg(page, host, 'disabledTab', 'second')
    await expect(frame.locator('.q-tab')).toHaveCount(12)
    await expect(frame.locator('.q-tab').nth(1)).toHaveAttribute('aria-disabled', 'true')
    await expect(frame.locator('.q-tab--active .q-tab__indicator')).toHaveCount(1)
    const content = frame.locator('.q-tabs__content')
    const before = await content.evaluate((element) => element.scrollLeft)
    const arrow = frame.locator('.q-tabs__arrow').last()
    await expect(arrow.locator('svg path')).not.toHaveCount(0)
    await arrow.hover()
    await page.mouse.down()
    try { await expect.poll(() => content.evaluate((element) => element.scrollLeft)).toBeGreaterThan(before) }
    finally { await page.mouse.up() }
  })

  test(`${host}: body menu portal, Escape/focus, reset and case-switch cleanup`, async ({ page }) => {
    const frame = await open(page, host, 3)
    const anchor = frame.locator('.qds-catalog-demo-menu__anchor')
    await anchor.click()
    const menu = frame.locator('.q-menu')
    await expect(menu).toBeVisible()
    expect(await menu.evaluate((element) => element.parentElement?.parentElement === document.body && !element.closest('.qds-catalog-proof'))).toBe(true)
    await page.keyboard.press('Escape')
    await expect(menu).toHaveCount(0)
    await expect(anchor).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(menu).toBeVisible()
    await toggle(page, host, 'checkable')
    await expect(menu).toHaveCount(0)
    await anchor.click()
    await expect(menu).toBeVisible()
    if (host === 'storybook') await page.locator('#qds-shared-catalog-proof--button-proof').click()
    else await page.locator('a[href$="variantId=stories-catalog-proof-story-vue-0"]').click()
    const next = await canvas(page, host)
    await expect(next.locator('.qds-catalog-demo-button')).toBeVisible()
    for (const item of page.frames()) await expect(item.locator('.q-menu')).toHaveCount(0)
  })

  test(`${host}: sole theme authority, live body readout and palette cleanup`, async ({ page }) => {
    const frame = await open(page, host, 0)
    await expect(frame.locator('.qds-catalog-proof select')).toHaveCount(host === 'histoire' ? 2 : 0)
    await assertTheme(frame, host === 'histoire' ? 'system' : 'light', 'light', 'fluent')
    await theme(page, frame, host, 'mode', 'dark')
    await assertTheme(frame, 'dark', 'dark', 'fluent')
    await theme(page, frame, host, 'mode', 'system')
    await page.emulateMedia({ colorScheme: 'dark' })
    await assertTheme(frame, 'system', 'dark', 'fluent')
    await page.emulateMedia({ colorScheme: 'light' })
    await assertTheme(frame, 'system', 'light', 'fluent')
    await theme(page, frame, host, 'mode', 'light')
    await theme(page, frame, host, 'variant', 'ink')
    await assertTheme(frame, 'light', 'light', 'ink')
    await theme(page, frame, host, 'variant', 'shadcn')
    await theme(page, frame, host, 'shadcn palette', 'slate')
    await assertTheme(frame, 'light', 'light', 'shadcn')
    await expect(frame.locator('body')).toHaveAttribute('data-qds-shadcn-base-color', 'slate')
    await expect(frame.locator('.qds-catalog-proof__readout')).toContainText('palette: slate')
    await theme(page, frame, host, 'variant', 'fluent')
    await expect(frame.locator('body')).not.toHaveAttribute('data-qds-shadcn-base-color')
    await expect(frame.locator('.qds-catalog-proof select')).toHaveCount(host === 'histoire' ? 2 : 0)
  })

  test(`${host}: direct 393px tabs fit the document without hiding overflow`, async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 850 })
    const url = host === 'histoire'
      ? '/__sandbox.html?storyId=stories-catalog-proof-story-vue&variantId=stories-catalog-proof-story-vue-2'
      : '/iframe.html?id=qds-shared-catalog-proof--tabs-proof&viewMode=story&args=tabCount:12'
    await page.goto(origins[host] + url)
    await expect(page.locator('.qds-catalog-demo-tabs')).toBeVisible()
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(393)
    const geometry = await page.locator('.qds-catalog-proof').evaluate((element) => {
      const rect = element.getBoundingClientRect()
      return { left: rect.left, right: rect.right, overflow: getComputedStyle(element).overflowX }
    })
    expect(geometry.left).toBeGreaterThanOrEqual(0)
    expect(geometry.right).toBeLessThanOrEqual(393)
    expect(geometry.overflow).not.toBe('hidden')
    const content = page.locator('.q-tabs__content')
    await expect.poll(() => content.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true)
  })
}

test('Storybook Docs exposes four unique isolated cases and actual shared source', async ({ page }) => {
  await page.goto(origins.storybook + '/?path=/docs/qds-shared-catalog-proof--docs')
  await expect.poll(() => page.frames().filter((frame) => frame.url().includes('viewMode=story')).length).toBe(5)
  const frames = page.frames().filter((frame) => frame.url().includes('viewMode=story'))
  const ids = new Set<string>()
  for (const frame of frames) {
    const proof = frame.locator('.qds-catalog-proof')
    await expect(proof).toBeVisible()
    ids.add((await proof.getAttribute('data-case-id'))!)
    await expect(proof.locator('select')).toHaveCount(0)
  }
  expect([...ids].sort()).toEqual(['actions/button', 'forms/field', 'navigation/tabs', 'overlays/menu'])
  const docs = page.frames().find((frame) => frame.url().includes('viewMode=docs'))!
  await docs.getByRole('switch', { name: 'Show code', exact: true }).first().click()
  const source = docs.locator('pre').filter({ hasText: 'QBtnDropdown' }).first()
  await expect(source).toBeVisible()
  await expect(source).toContainText('<script setup lang="ts">')
})
