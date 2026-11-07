import { expect, test } from '@playwright/test'
import { applyTheme, type Mode } from './helpers'

const ROWS = ['button', 'field', 'selection', 'tabs', 'badge', 'progress', 'surface', 'overlay'] as const
const MODES: Mode[] = ['light', 'dark']

test.describe('@screens compare oracle', () => {
  for (const mode of MODES) {
    test(`fluent ${mode}`, async ({ page }, testInfo) => {
      await page.goto('./#compare')
      await applyTheme(page, mode, 'win')
      await expect(page.locator('.compare--ready')).toBeVisible()
      await page.evaluate(() => document.fonts.ready)

      if (testInfo.project.name === 'mobile') {
        await expect(page).toHaveScreenshot(`compare-${mode}.png`, { fullPage: true })
        return
      }

      for (const row of ROWS) {
        await expect(page.locator(`[data-compare="${row}"]`)).toHaveScreenshot(`compare-${row}-${mode}.png`)
      }
    })
  }
})
