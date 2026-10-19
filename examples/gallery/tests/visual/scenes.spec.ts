import { expect, test } from '@playwright/test'
import { applyTheme, computed, customProperty, expectGalleryPage } from './helpers'

test.describe('QDS scene gallery', () => {
  test('mounts the four owned canonical scenes and their readable cards', async ({ page }) => {
    await page.goto('/#scenes')
    await applyTheme(page, 'light', 'fluent')
    await expectGalleryPage(page, 'Scenes')

    for (const variant of ['fluent', 'ink', 'one', 'term'] as const) {
      const scene = page.locator(`[data-test="qds-scene-${variant}"]`)
      await expect(scene).toBeVisible()
      await expect(scene.locator(`[data-test="qds-scene-card-${variant}"]`)).toHaveClass(/qds-card--readable/)
      expect.soft(await scene.evaluate((el) => getComputedStyle(el).backgroundImage), `${variant} uses its owned wallpaper`).toContain(`/scenes/qds-wallpaper-${variant}.svg`)
    }
    await expect(page.locator('[data-test="qds-scene-air"], [data-test="qds-scene-feather"]')).toHaveCount(0)
  })

  test('Ink scene stays paper-first with pastel roles while transient surfaces retain depth', async ({ page }) => {
    await page.goto('/#scenes')
    await applyTheme(page, 'light', 'ink')
    const ink = '[data-test="qds-scene-ink"]'
    expect.soft(await customProperty(page, '--qds-surface-0'), 'Ink paper surface comes from current token source').toBe('#fbf9f5')
    expect.soft(await customProperty(page, '--qds-surface-info-soft'), 'Ink coordinated pastel info surface').toBe('#dee7ef')
    expect.soft(await computed(page, `${ink} .scene-panel`, 'backdrop-filter'), 'Ink scene card has no blur').toBe('none')
    expect.soft(await computed(page, `${ink} .scene-panel`, 'box-shadow'), 'Ink scene content is flat').toBe('none')

    await applyTheme(page, 'light', 'fluent')
    await page.goto('/#components')
    await expect(page.getByRole('button', { name: 'Info', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Info', exact: true }).click()
    await expect(page.locator('.q-notification').first()).toBeVisible()
    expect.soft(await computed(page, '.q-notification', 'box-shadow'), 'Fluent transient notification retains selective depth').not.toBe('none')
  })
})
