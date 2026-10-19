import { expect, test, type Page } from '@playwright/test'
import { CANONICAL_VARIANTS, gotoGalleryPage, type Variant } from './helpers'

async function expectState(page: Page, tab: string, variant: Variant) {
  await expect(page.locator('body')).toHaveAttribute('data-qds-variant', variant)
  await expect(page.locator('body')).toHaveClass(new RegExp(`qds-variant-${variant}`))
  await expect(page.locator(`.gallery-tabs .q-tab--active`)).toHaveText(new RegExp(`^${tab}$`, 'i'))
  // Quasar consumes the panel's name prop rather than rendering a name attribute.
  const panel = page.locator('.gallery-panels > .q-panel:visible > .q-tab-panel')
  await expect(panel).toHaveCount(1) // Wait for the outgoing animated panel to leave.
  await expect(panel).toBeVisible()
}

async function navigateHash(page: Page, hash: string) {
  await page.evaluate(value => { window.location.hash = value }, hash)
}

async function setVariant(page: Page, variant: Variant) {
  await page.evaluate(value => {
    (window as unknown as { __qdsGallery: { setVariant(value: Variant): void } }).__qdsGallery.setVariant(value)
  }, variant)
}

for (const variant of CANONICAL_VARIANTS) {
  test(`shared ${variant} URL configures before mount, reloads and opens independently`, async ({ page, browser, baseURL }) => {
    await page.addInitScript(() => {
      let controller: unknown
      Object.defineProperty(window, '__qdsGallery', {
        get: () => controller,
        set: value => {
          controller = value
          ;(window as unknown as { bootstrapEvidence: unknown }).bootstrapEvidence = {
            variant: document.body.getAttribute('data-qds-variant'),
            mounted: Boolean(document.querySelector('#app')?.children.length),
          }
        },
      })
    })
    await page.goto(`/#compare?variant=${variant}`)
    await expectState(page, 'compare', variant)
    expect(await page.evaluate(() => (window as unknown as { bootstrapEvidence: unknown }).bootstrapEvidence))
      .toEqual({ variant, mounted: false })
    // Initialization intentionally leaves even explicit Fluent and legacy hashes alone.
    expect(new URL(page.url()).hash).toBe(`#compare?variant=${variant}`)
    await page.reload()
    await expectState(page, 'compare', variant)
    const context = await browser.newContext({ baseURL })
    try {
      const shared = await context.newPage()
      await shared.goto(page.url())
      await expectState(shared, 'compare', variant)
    } finally {
      await context.close()
    }
  })
}

test('UI, page and controller changes replace URL while preserving outer URL, state and unknown params', async ({ page }) => {
  await page.goto('/?campaign=outer#compare?keep=a%26b&keep=two')
  await expectState(page, 'compare', 'fluent')
  const length = await page.evaluate(() => {
    history.replaceState({ owner: 'gallery-host' }, '', location.href)
    return history.length
  })
  await page.getByRole('group', { name: 'Variant', exact: true }).getByRole('button', { name: 'Ink', exact: true }).click()
  await expectState(page, 'compare', 'ink')
  await expect(page).toHaveURL(/#compare\?keep=a%26b&keep=two&variant=ink$/)
  await gotoGalleryPage(page, 'Tokens')
  await expectState(page, 'tokens', 'ink')
  await expect(page).toHaveURL(/#tokens\?keep=a%26b&keep=two&variant=ink$/)
  await setVariant(page, 'term')
  await expect(page).toHaveURL(/variant=term$/)
  await setVariant(page, 'fluent')
  await expect(page).toHaveURL(/#tokens\?keep=a%26b&keep=two$/)
  expect(new URL(page.url()).pathname).toBe('/')
  expect(new URL(page.url()).search).toBe('?campaign=outer')
  expect(await page.evaluate(() => ({ state: history.state, length: history.length })))
    .toEqual({ state: { owner: 'gallery-host' }, length })
})

test('same-page hash navigation and back/forward apply variant without feedback writes or mode/palette resets', async ({ page }) => {
  await page.goto('/#compare?variant=ink')
  await expectState(page, 'compare', 'ink')
  await page.evaluate(() => {
    const ds = (window as unknown as { __qdsGallery: { setMode(value: string): void; setShadcnBaseColor(value: string): void } }).__qdsGallery
    ds.setMode('dark')
    ds.setShadcnBaseColor('slate')
    const original = history.replaceState.bind(history)
    ;(window as unknown as { urlWrites: number }).urlWrites = 0
    history.replaceState = (...args) => {
      ;(window as unknown as { urlWrites: number }).urlWrites++
      original(...args)
    }
  })
  const length = await page.evaluate(() => history.length)
  await navigateHash(page, '#compare?variant=shadcn')
  await expectState(page, 'compare', 'shadcn')
  await expect(page.locator('body')).toHaveAttribute('data-qds-shadcn-base-color', 'slate')
  await expect(page.locator('body')).toHaveAttribute('data-qds-mode', 'dark')
  await navigateHash(page, '#forms?variant=one')
  await expectState(page, 'forms', 'one')
  await page.goBack()
  await expectState(page, 'compare', 'shadcn')
  await page.goBack()
  await expectState(page, 'compare', 'ink')
  await page.goForward()
  await expectState(page, 'compare', 'shadcn')
  await expect(page.locator('body')).toHaveAttribute('data-qds-shadcn-base-color', 'slate')
  await expect(page.locator('body')).toHaveAttribute('data-qds-mode', 'dark')
  expect(await page.evaluate(() => ({ writes: (window as unknown as { urlWrites: number }).urlWrites, length: history.length })))
    .toEqual({ writes: 0, length: length + 2 })
})

for (const hash of ['', '#compare', '#/compare', '#compare?variant=invalid', '#compare?variant=air', '#compare?variant=%E0%A4%A', '#%3Cscript%3E?variant=%3Csvg%20onload%3Dalert(1)%3E', '#%']) {
  test(`safe initial fallback and unchanged legacy hash: ${hash || '(empty)'}`, async ({ page }) => {
    await page.goto(`/${hash}`)
    await expectState(page, hash.includes('compare') ? 'compare' : 'tokens', 'fluent')
    expect(new URL(page.url()).hash).toBe(hash)
  })
}

test('in-session missing/invalid variants retain selection and unknown pages canonicalize safely', async ({ page }) => {
  await page.goto('/#compare?variant=ink')
  await expectState(page, 'compare', 'ink')
  for (const hash of ['#forms', '#/compare', '#compare?variant=%E0%A4%A']) {
    await navigateHash(page, hash)
    const tab = hash.includes('forms') ? 'forms' : 'compare'
    await expectState(page, tab, 'ink')
    await expect(page).toHaveURL(new RegExp(`#${tab}\\?variant=ink$`))
  }
  await navigateHash(page, '#%3Csvg%20onload%3Dalert(1)%3E?variant=one&extra=ok')
  await expectState(page, 'tokens', 'one')
  await expect(page).toHaveURL(/#tokens\?extra=ok&variant=one$/)
  await setVariant(page, 'fluent')
  await expect(page).toHaveURL(/#tokens\?extra=ok$/)
})

test('unknown initial page keeps a valid variant and subsequent writes preserve a nested pathname', async ({ page }) => {
  await page.goto('/?campaign=nested#unknown?variant=one&extra=ok')
  await expectState(page, 'tokens', 'one')
  expect(new URL(page.url()).hash).toBe('#unknown?variant=one&extra=ok')
  // Simulate a hosting prefix without asking this root-built preview to serve nested assets.
  await page.evaluate(() => history.replaceState(history.state, '', `/gallery/${location.search}${location.hash}`))
  await setVariant(page, 'ink')
  await expect(page).toHaveURL(/\/gallery\/\?campaign=nested#tokens\?extra=ok&variant=ink$/)
})
