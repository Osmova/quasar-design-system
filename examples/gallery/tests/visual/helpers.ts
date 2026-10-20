import { expect, type Page } from '@playwright/test'

export type Mode = 'light' | 'dark'
export type Variant = 'fluent' | 'ink' | 'one' | 'term' | 'shadcn' | 'atrium'
export type LegacyVariant = Exclude<Variant, 'shadcn'>
export type BaseColor = 'neutral' | 'gray' | 'zinc' | 'stone' | 'slate'

export const CANONICAL_VARIANTS: Variant[] = ['fluent', 'ink', 'one', 'term', 'shadcn', 'atrium']
// Existing grammar tests deliberately keep their four-variant expectations.
export const LEGACY_VARIANTS: LegacyVariant[] = ['fluent', 'ink', 'one', 'term']
export const MATRIX_VARIANTS: Exclude<LegacyVariant, 'term'>[] = ['fluent', 'ink', 'one']
export const SHADCN_PALETTES: BaseColor[] = ['neutral', 'gray', 'zinc', 'stone', 'slate']

export async function waitForThemePaint(page: Page) {
  await page.evaluate(async () => {
    const frames = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    // Give Vue's queued DOM work and newly used font faces a rendering turn
    // before inspecting native transitions, then recheck after they finish.
    await frames()
    await document.fonts.ready
    await frames()
    for (let pass = 0; pass < 8; pass++) {
      const finite = document.getAnimations().filter(animation => animation.playState === 'running' && Number.isFinite(Number(animation.effect?.getComputedTiming().endTime)))
      if (finite.length) await Promise.all(finite.map(animation => animation.finished.catch(() => undefined)))
      await document.fonts.ready
      await frames()
      if (!document.getAnimations().some(animation => animation.playState === 'running' && Number.isFinite(Number(animation.effect?.getComputedTiming().endTime)))) return
    }
    throw new Error('Native finite animations/font commits did not settle after theme change')
  })
}

export async function applyShadcn(page: Page, mode: Mode, palette: BaseColor) {
  await applyTheme(page, mode, 'shadcn')
  await page.evaluate((color) => {
    const ds = (window as unknown as { __qdsGallery: { setShadcnBaseColor: (value: BaseColor) => void } }).__qdsGallery
    ds.setShadcnBaseColor(color)
  }, palette)
  await expect(page.locator('body')).toHaveAttribute('data-qds-shadcn-base-color', palette)
  await waitForThemePaint(page)
}

export async function applyTheme(page: Page, mode: Mode, variant: Variant) {
  await page.waitForFunction(() => Boolean((window as unknown as { __qdsGallery?: unknown }).__qdsGallery))
  await page.evaluate(
    ({ mode, variant }) => {
      const ds = (window as unknown as { __qdsGallery: { setMode: (value: Mode) => Mode; setVariant: (value: Variant) => Variant } }).__qdsGallery
      ds.setMode(mode)
      ds.setVariant(variant)
    },
    { mode, variant },
  )
  await expect(page.locator('body')).toHaveClass(new RegExp(`qds-variant-${variant}`))
  await expect(page.locator('body')).toHaveClass(new RegExp(mode === 'dark' ? 'qds-theme-dark' : 'qds-theme-light'))
  await waitForThemePaint(page)
}

export async function computed(page: Page, selector: string, property: string, pseudo?: string): Promise<string> {
  return page.locator(selector).first().evaluate(
    (element, args) => getComputedStyle(element, args.pseudo).getPropertyValue(args.property).trim(),
    { property, pseudo },
  )
}

export async function customProperty(page: Page, property: string): Promise<string> {
  return page.locator('body').evaluate((element, name) => getComputedStyle(element).getPropertyValue(name).trim(), property)
}

export async function resolvedColor(page: Page, property: string): Promise<string> {
  return page.locator('body').evaluate((element, name) => {
    const probe = document.createElement('span')
    probe.style.color = `var(${name})`
    element.append(probe)
    const color = getComputedStyle(probe).color
    probe.remove()
    return color
  }, property)
}

export async function resolvedShadow(page: Page, property: string): Promise<string> {
  return page.locator('body').evaluate((element, name) => {
    const probe = document.createElement('span')
    probe.style.boxShadow = `var(${name})`
    element.append(probe)
    const shadow = getComputedStyle(probe).boxShadow
    probe.remove()
    return shadow
  }, property)
}

// Touch projects (Pixel 5) match `(pointer: coarse)`, which raises QDS control and row tokens.
export async function coarsePointer(page: Page): Promise<boolean> {
  return page.evaluate(() => matchMedia('(pointer: coarse)').matches)
}

// Page navigation lives in a drawer that is collapsed on the touch project.
export async function gotoGalleryPage(page: Page, label: string) {
  const tab = page.getByRole('tab', { name: label, exact: true })
  if (await tab.isVisible()) {
    await tab.click()
    await expect(tab).toHaveAttribute('aria-selected', 'true')
    return
  }
  // Picking a page unmounts the clicked tab, so wait on the settled drawer.
  await page.locator('.gallery-burger').click()
  await expect(tab).toBeVisible()
  await tab.click()
  await expect(page.locator('.gallery-drawer')).toBeHidden()
}

// The drawer is unmounted while collapsed, so reading the active page needs it open.
export async function expectGalleryPage(page: Page, label: string) {
  const tab = page.getByRole('tab', { name: label, exact: true })
  if (await tab.count()) {
    await expect(tab).toHaveAttribute('aria-selected', 'true')
    return
  }
  await page.locator('.gallery-burger').click()
  await expect(tab).toHaveAttribute('aria-selected', 'true')
  // The open overlay drawer covers the burger, so dismiss it the way a user would.
  await page.keyboard.press('Escape')
  await expect(page.locator('.gallery-drawer')).toBeHidden()
}
