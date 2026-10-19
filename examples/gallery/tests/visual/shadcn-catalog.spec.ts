import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { FAMILIES, type Section } from './atlas-families'
import { CANONICAL_VARIANTS, SHADCN_PALETTES, applyTheme, applyShadcn } from './helpers'
import { NATIVE_ROWS } from './shadcn-coverage'
import { assertParts, assertNoPageOverflow, byHook, mediaFixtures, settle } from './shadcn-browser'

const routes = [...new Set(NATIVE_ROWS.filter(row => row.parts.length).map(row => row.route))]
const hideHeader = fileURLToPath(new URL('./atlas-element.css', import.meta.url))

// Shared invariants only: no Fluent fill/bar/acrylic assumptions enter this matrix.
for (const variant of CANONICAL_VARIANTS) {
  test(`shared switcher/native DOM invariants ${variant}`, async ({ page }) => {
    await page.goto('/#components')
    await applyTheme(page, 'light', variant)
    await expect(page.getByRole('group', { name: 'Variant', exact: true }).locator('.q-btn')).toHaveCount(CANONICAL_VARIANTS.length)
    await expect(page.locator('[data-test="qds-control-standard-button"] .q-btn__content')).toHaveText('Standard')
    await expect(page.locator('[data-test="qds-control-standard-button"]')).toHaveAttribute('type', 'button')
    // The palette picker lives in the theme menu so the header keeps one footprint.
    await expect(page.locator('[data-test="qds-shadcn-palette"]')).toHaveCount(0)
    await page.locator('.gallery-theme').click()
    await expect(page.locator('[data-test="qds-shadcn-palette"]')).toHaveCount(variant === 'shadcn' ? 1 : 0)
    await page.keyboard.press('Escape')
    await assertNoPageOverflow(page)
  })
}

for (const palette of SHADCN_PALETTES) for (const mode of ['light', 'dark'] as const) {
  for (const route of routes) {
    test(`shadcn native subelements ${palette}/${mode} ${route}`, async ({ page }) => {
      test.setTimeout(180_000)
      await mediaFixtures(page)
      await page.clock.install({ time: new Date('2029-08-17T10:30:00Z') })
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      await applyShadcn(page, mode, palette)
      await settle(page)
      for (const row of NATIVE_ROWS.filter(row => row.route === route && row.parts.length)) {
        await test.step(`T170:${row.row} ${row.family}`, () => assertParts(page, row.parts, `${palette}/${mode} ${row.family}`))
      }
      if (route === '/conformance.html') {
        await expect(page.locator('[data-native="rich"] .q-uploader__file')).toHaveCount(5)
        await expect(page.locator('[data-native="state-infinite"] .q-spinner')).toBeAttached()
        const dark = page.locator('[data-scheme="dark"]')
        await expect(dark.locator('.q-stepper__tab--disabled')).toHaveCount(2)
        for (const fixture of ['stepper', 'stepper-error']) {
          const stepper = dark.locator(`[data-native="${fixture}"]`)
          const disabled = stepper.locator('.q-stepper__tab--disabled')
          await expect(disabled).toHaveCount(1)
          await expect(disabled).toBeAttached()
          await expect(disabled).toBeVisible()
          await expect(disabled).not.toHaveClass(/q-stepper__tab--navigation/)
          await expect(disabled).not.toHaveAttribute('aria-current', 'step')
          await expect(disabled.locator('.q-stepper__dot')).toBeVisible()
        }
        const horizontal = dark.locator('[data-native="stepper"]')
        await expect(horizontal).toHaveClass(/q-stepper--horizontal/)
        const horizontalHeader = horizontal.locator('.q-stepper__header')
        if (test.info().project.name === 'mobile') await expect(horizontalHeader).toHaveClass(/q-stepper__header--contracted/)
        else await expect(horizontalHeader).not.toHaveClass(/q-stepper__header--contracted/)
        const verticalError = dark.locator('[data-native="stepper-error"] .q-stepper__tab--active.q-stepper__tab--error')
        await expect(verticalError).toBeVisible()
        await expect(verticalError.locator('.q-stepper__caption')).toHaveText('Resolve validation before continuing')
        await expect(verticalError.locator('.q-stepper__caption')).toBeVisible()
        await assertParts(page, ['[data-native="layout"] .q-header', '[data-native="layout"] .q-footer', '[data-native="layout"] .q-drawer', '[data-native="layout"] .q-page-sticky', '[data-native="field-states"] .q-field--outlined', '[data-native="field-states"] .q-field--filled', '[data-native="field-states"] .q-field--standout', '[data-native="field-states"] .q-field--borderless', '[data-native="slider-states"] .q-slider--v', '[data-native="empty-table"] .q-table__bottom--nodata', '[data-native="loading-table"] .q-table__progress'], 'native states')
        await page.getByRole('button', { name: 'Drawer mini', exact: true }).click()
        await expect(page.locator('[data-native="layout"] .q-drawer')).toHaveClass(/q-drawer--mini/)
        await page.getByRole('button', { name: 'Table grid', exact: true }).click()
        await expect(page.locator('[data-native="state-table"] .q-table__grid-content')).toBeVisible()
        await page.getByRole('button', { name: 'Table grid', exact: true }).click()
        await page.getByRole('button', { name: 'Table fullscreen', exact: true }).click()
        await expect(page.locator('[data-native="state-table"]')).toHaveClass(/fullscreen/)
        // Fullscreen's real native top control restores the external trigger.
        await page.locator('[data-native="state-table"] .q-table__top .q-btn').last().click()
        await expect(page.locator('[data-native="state-table"]')).not.toHaveClass(/fullscreen/)
      }
      await assertNoPageOverflow(page)
    })
  }
}

const mobileHooks: Partial<Record<Section, string[]>> = {
  components: ['qds-control-standard-button', 'qds-control-input', 'qds-table-official-modes', 'qds-pagination', 'qds-tabs-horizontal'],
  forms: ['qds-forms-horizontal', 'qds-forms-field-group', 'qds-forms-pin', 'qds-forms-settings'],
  apps: ['qds-apps-subpage', 'qds-apps-tiles', 'qds-apps-list-detail'],
  catalog: ['qds-catalog-date', 'qds-catalog-time', 'qds-catalog-color', 'qds-tree-primary', 'qds-stepper-horizontal', 'qds-carousel', 'qds-editor', 'qds-uploader'],
  plugins: ['qds-plugin-bottomsheet-card', 'qds-plugin-dialog-notify-card'],
}
for (const mode of ['light', 'dark'] as const) {
  for (const section of Object.keys(FAMILIES) as Section[]) {
    test(`@screens shadcn neutral full atlas ${section}/${mode}`, async ({ page }, info) => {
      test.setTimeout(240_000)
      await mediaFixtures(page)
      await page.goto(`/#${section}`, { waitUntil: 'domcontentloaded' })
      await applyShadcn(page, mode, 'neutral')
      const hooks = info.project.name === 'mobile' ? mobileHooks[section]! : Object.values(FAMILIES[section]).flat()
      for (const hook of hooks) {
        const selector = hook === 'qds-editor' ? `.q-editor:has(${byHook(hook)})` : byHook(hook)
        const target = page.locator(selector)
        await expect(target).toHaveCount(1)
        await target.scrollIntoViewIfNeeded()
        await settle(page)
        await expect(target).toHaveScreenshot(`shadcn-${hook}-${mode}.png`, { stylePath: hideHeader })
      }
    })
  }
  test(`@screens shadcn consolidated five palettes and native scheme/window ${mode}`, async ({ page }) => {
    await page.goto('/#variants')
    await applyShadcn(page, mode, 'neutral')
    await expect(page.locator('[data-test^="qds-shadcn-panel-"]')).toHaveCount(5)
    await expect(page.locator(byHook('qds-shadcn-panels'))).toHaveScreenshot(`shadcn-five-palettes-${mode}.png`, { stylePath: hideHeader })
    await page.goto('/conformance.html')
    await applyShadcn(page, mode, 'neutral')
    for (const selector of ['[data-native="rich"]', '.qds-window', '[data-scheme="dark"]', '[data-scheme="light"]']) {
      await expect(page.locator(selector)).toHaveScreenshot(`shadcn-native-${selector.replace(/[^a-z]/g, '')}-${mode}.png`)
    }
  })
}
