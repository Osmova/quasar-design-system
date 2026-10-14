import { expect, test, type Locator } from '@playwright/test'
import { SHADCN_PALETTES, applyShadcn } from './helpers'
import { paint, settle } from './shadcn-browser'
import { assertRadiusGeometryContracts, usedCornerRadii } from './shadcn-reference-radius'
assertRadiusGeometryContracts()
const referenceUrl = process.env.QDS_SHADCN_REFERENCE_URL ?? 'http://127.0.0.1:4320/'
const families = ['button', 'input', 'selection', 'tabs', 'badge', 'card', 'table', 'menu', 'dialog', 'sidebar']
const counterparts: Record<string, { native: string; upstream: string; heightBound?: number; radiusBound: number }> = {
  button: { native: '[data-oracle="button"] [data-case="default"]', upstream: '[data-family="button"] [data-case="default"]', heightBound: 8, radiusBound: 2 },
  input: { native: '[data-oracle="input"] .q-field__control', upstream: '[data-family="input"] [data-case="default"]', heightBound: 8, radiusBound: 2 },
  selection: { native: '[data-oracle="selection"] .q-checkbox__bg', upstream: '[data-family="selection"] [data-case="checked"]', heightBound: 8, radiusBound: 4 },
  tabs: { native: '[data-oracle="tabs"] .q-tab--active', upstream: '[data-family="tabs"] [role="tab"][data-state="active"]', heightBound: 12, radiusBound: 8 },
  badge: { native: '[data-oracle="badge"] [data-case="default"]', upstream: '[data-family="badge"] [data-case="default"]', heightBound: 8, radiusBound: 6 },
  card: { native: '[data-oracle="card"] .q-card', upstream: '[data-family="card"] [data-case="default"]', radiusBound: 2 },
  table: { native: '[data-oracle="table"] thead th', upstream: '[data-family="table"] thead th', heightBound: 12, radiusBound: 0 },
  menu: { native: '[data-oracle-popup="menu"]', upstream: '[data-family="menu"][data-case="popup"]', radiusBound: 2 },
  dialog: { native: '[data-oracle-popup="dialog"]', upstream: '[data-family="dialog"][data-case="popup"]', radiusBound: 6 },
  sidebar: { native: '[data-oracle="sidebar"] .q-list', upstream: '[data-family="sidebar"] [data-case="default"]', radiusBound: 8 },
}
async function metrics(locator: Locator) {
  const sample = await locator.evaluate(element => {
    const s = getComputedStyle(element), box = element.getBoundingClientRect()
    return { width: box.width, height: box.height, rawComputedRadius: s.borderTopLeftRadius, rawComputedCorners: [s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomRightRadius, s.borderBottomLeftRadius] as [string, string, string, string], font: s.fontFamily, fontSize: parseFloat(s.fontSize), weight: Number(s.fontWeight), border: parseFloat(s.borderTopWidth), text: element.textContent?.trim() }
  })
  const used = usedCornerRadii(sample.rawComputedCorners, sample.width, sample.height)
  return { ...sample, radius: used.corners[0].x, radiusY: used.corners[0].y, usedCorners: used.corners, radiusOverlapScale: used.scale }
}

for (const palette of SHADCN_PALETTES) for (const mode of ['light', 'dark'] as const) {
  test(`independent pinned reference/native metrics ${palette}/${mode}`, async ({ page, browser }, info) => {
    test.setTimeout(120_000)
    const referenceContext = await browser.newContext({ viewport: page.viewportSize()!, locale: 'en-US', deviceScaleFactor: 1 })
    try {
      const ref = await referenceContext.newPage()
      await ref.goto(`${referenceUrl}?palette=${palette}&mode=${mode}&capture=1&family=button`)
      await expect(ref.locator('html')).toHaveAttribute('data-reference-ready', 'true')
      expect(await ref.evaluate(() => (window as unknown as { __shadcnReference: { commit: string } }).__shadcnReference.commit)).toBe('b251d9fd92aa496495e127137a7734704fb34a29')
      await expect(ref.locator('.qds-ui')).toHaveCount(0)
      await page.goto('/conformance.html?oracle=button')
      await applyShadcn(page, mode, palette)
      await settle(page)
      const native = page.locator('[data-oracle="button"] [data-case="default"]')
      const upstream = ref.locator('[data-family="button"] [data-case="default"]')
      const [n, u] = [await metrics(native), await metrics(upstream)]
      expect(n.text).toBe(u.text)
      expect(n.font).toContain('Inter')
      expect(u.font).toContain('Inter')
      expect(Math.abs(n.height - u.height), 'coarse pointer/native sizing may differ within 8px').toBeLessThanOrEqual(8)
      expect(Math.abs(n.radius - u.radius)).toBeLessThanOrEqual(2)
      expect(Math.abs(n.radiusY - u.radiusY)).toBeLessThanOrEqual(2)
      expect(Math.abs(n.fontSize - u.fontSize)).toBeLessThanOrEqual(1)
      expect(Math.abs(n.weight - u.weight)).toBeLessThanOrEqual(100)
      const [nativePaint, upstreamPaint] = [await paint(native), await paint(upstream)]
      expect(nativePaint.textContrast).toBeGreaterThanOrEqual(4.5)
      expect(upstreamPaint.textContrast).toBeGreaterThanOrEqual(4.5)
      expect(Math.max(...nativePaint.background.map((channel, i) => Math.abs(channel - upstreamPaint.background[i])))).toBeLessThanOrEqual(12)
      await info.attach('independent-reference-metrics', { body: JSON.stringify({ palette, mode, viewport: page.viewportSize(), native: n, upstream: u, nativePaint, upstreamPaint }), contentType: 'application/json' })
      for (const family of families.filter(family => family !== 'button')) {
        await ref.goto(`${referenceUrl}?palette=${palette}&mode=${mode}&capture=1&family=${family}`)
        await expect(ref.locator('html')).toHaveAttribute('data-reference-ready', 'true')
        await page.goto(`/conformance.html?oracle=${family}`)
        await applyShadcn(page, mode, palette)
        if (family === 'menu' || family === 'dialog') {
          await page.locator(`[data-oracle="${family}"]`).getByRole('button', { name: family === 'menu' ? 'Open menu' : 'Edit profile', exact: true }).click()
          await ref.evaluate(async overlay => { await (window as unknown as { __shadcnReference: { openOverlay: (value: string) => Promise<void> } }).__shadcnReference.openOverlay(overlay) }, family)
        }
        const mapping = counterparts[family]
        const nativePart = page.locator(mapping.native).first()
        const upstreamPart = ref.locator(mapping.upstream).first()
        await expect(nativePart, `${family}: actual native counterpart`).toBeVisible()
        await expect(upstreamPart, `${family}: actual pinned widget`).toBeVisible()
        await settle(page)
        const [nativeMetrics, upstreamMetrics] = [await metrics(nativePart), await metrics(upstreamPart)]
        await info.attach(`independent-${family}-metrics`, { body: JSON.stringify({ palette, mode, viewport: page.viewportSize(), native: nativeMetrics, upstream: upstreamMetrics, bounds: mapping }), contentType: 'application/json' })
        expect(nativeMetrics.font, `${family} local font`).toContain('Inter')
        expect(upstreamMetrics.font, `${family} oracle local font`).toContain('Inter')
        for (let corner = 0; corner < 4; corner++) for (const axis of ['x', 'y'] as const) {
          expect(Math.abs(nativeMetrics.usedCorners[corner][axis] - upstreamMetrics.usedCorners[corner][axis]), `${family} used corner ${corner}/${axis} geometry bound`).toBeLessThanOrEqual(mapping.radiusBound)
        }
        if (mapping.heightBound !== undefined) expect(Math.abs(nativeMetrics.height - upstreamMetrics.height), `${family} native target-size bound`).toBeLessThanOrEqual(mapping.heightBound)
      }
    } finally { await referenceContext.close() }
  })
}

for (const mode of ['light', 'dark'] as const) {
  test(`@screens independent reference pairs all ten families ${mode}`, async ({ page, browser }, info) => {
    test.setTimeout(240_000)
    // Desktop common measure is 1280x800, not the oracle's legacy 1280x960.
    const viewport = info.project.name === 'mobile' ? { width: 390, height: 844 } : { width: 1280, height: 800 }
    await page.setViewportSize(viewport)
    const referenceContext = await browser.newContext({ viewport, locale: 'en-US', deviceScaleFactor: 1 })
    try {
      const ref = await referenceContext.newPage()
      for (const family of families) {
        await ref.goto(`${referenceUrl}?palette=neutral&mode=${mode}&capture=1&family=${family}`)
        await expect(ref.locator('html')).toHaveAttribute('data-reference-ready', 'true')
        await page.goto(`/conformance.html?oracle=${family}`)
        await applyShadcn(page, mode, 'neutral')
        let native = page.locator(`[data-oracle="${family}"]`)
        let upstream = ref.locator(`section[data-family="${family}"]`)
        if (family === 'menu' || family === 'dialog') {
          await native.getByRole('button', { name: family === 'menu' ? 'Open menu' : 'Edit profile', exact: true }).click()
          await ref.evaluate(async overlay => { await (window as unknown as { __shadcnReference: { openOverlay: (value: string) => Promise<void> } }).__shadcnReference.openOverlay(overlay) }, family)
          native = page.locator(`[data-oracle-popup="${family}"]`)
          upstream = ref.locator(`[data-family="${family}"][data-case="popup"]`)
        }
        await expect(native).toBeVisible()
        await expect(upstream).toBeVisible()
        await settle(page)
        // Independent side-by-side visual evidence, never an upstream pixel-match assertion.
        await expect(native).toHaveScreenshot(`shadcn-pair-native-${family}-${mode}.png`)
        await expect(upstream).toHaveScreenshot(`shadcn-pair-reference-${family}-${mode}.png`)
      }
    } finally { await referenceContext.close() }
  })
}
