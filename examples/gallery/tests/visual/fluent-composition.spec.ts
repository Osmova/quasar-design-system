import { expect, test, type Page } from '@playwright/test'
import { applyTheme } from './helpers'

async function gotoSection(page: Page, section: 'variants' | 'scenes') {
  await page.goto(`/#${section}`)
  await applyTheme(page, 'light', 'win')
}

test.describe('Fluent composition', () => {
  test('keeps default and nested comparison cards borderless without stacked separators', async ({ page }) => {
    await gotoSection(page, 'variants')

    const composition = await page.locator('[data-test="qds-variant-card-win"]').evaluate((root) => {
      const card = root as HTMLElement
      const nested = card.querySelector('[data-test="qds-variant-nested-win"]') as HTMLElement
      const styles = getComputedStyle(card)
      const nestedStyles = getComputedStyle(nested)
      return {
        cardBorders: [styles.borderTopWidth, styles.borderRightWidth, styles.borderBottomWidth, styles.borderLeftWidth],
        cardShadow: styles.boxShadow,
        nestedShadow: nestedStyles.boxShadow,
        nestedBorders: [nestedStyles.borderTopWidth, nestedStyles.borderRightWidth, nestedStyles.borderBottomWidth, nestedStyles.borderLeftWidth],
        directSeparators: card.querySelectorAll(':scope > .q-separator').length,
        nestedSeparators: nested.querySelectorAll('.q-separator').length,
      }
    })

    expect(composition.cardBorders, 'Fluent comparison cards are Win11 layers with a hairline stroke').toEqual(['1px', '1px', '1px', '1px'])
    expect(composition.cardShadow, 'Fluent comparison cards are flat, no resting shadow').toBe('none')
    expect(composition.nestedShadow, 'Nested Fluent cards are flat fills, not stacked shadows').toBe('none')
    expect(composition.nestedBorders, 'Nested Fluent cards do not create a second wireframe').toEqual(['0px', '0px', '0px', '0px'])
    expect(composition.directSeparators, 'Comparison cards do not add a redundant header separator').toBe(0)
    expect(composition.nestedSeparators, 'Nested Fluent cards do not stack separators').toBe(0)
  })

  test('keeps readable scene panels as one intentional frame and comparison fixtures contained', async ({ page }) => {
    await gotoSection(page, 'scenes')

    const desktop = await page.locator('.scene-frame[data-test^="qds-scene-"]').evaluateAll((frames) => frames.map((frame) => {
      const host = frame as HTMLElement
      const panel = host.querySelector('[data-test^="qds-scene-card-"]') as HTMLElement
      const dock = host.querySelector('.scene-dock') as HTMLElement
      const hostRect = host.getBoundingClientRect()
      const panelRect = panel.getBoundingClientRect()
      const dockRect = dock.getBoundingClientRect()
      const panelStyles = getComputedStyle(panel)
      return {
        panelBorders: [panelStyles.borderTopWidth, panelStyles.borderRightWidth, panelStyles.borderBottomWidth, panelStyles.borderLeftWidth],
        panelBorderStyle: panelStyles.borderStyle,
        directSeparators: panel.querySelectorAll(':scope > .q-separator').length,
        contained: [panelRect, dockRect].every((rect) => rect.left >= hostRect.left - 1 && rect.right <= hostRect.right + 1 && rect.top >= hostRect.top - 1 && rect.bottom <= hostRect.bottom + 1),
        scrollsHorizontally: host.scrollWidth > host.clientWidth,
      }
    }))

    for (const scene of desktop) {
      expect(scene.panelBorders, 'Readable scene panels retain one intentional outer frame').toEqual(['1px', '1px', '1px', '1px'])
      expect(scene.panelBorderStyle, 'Readable scene panel frame remains deliberate').toBe('solid')
      expect(scene.directSeparators, 'Scene headers do not create an additional separator frame').toBe(0)
      expect(scene.contained, 'Desktop scene composition stays within its wallpaper fixture').toBe(true)
      expect(scene.scrollsHorizontally, 'Desktop scene fixture does not manufacture horizontal overflow').toBe(false)
    }

    await page.setViewportSize({ width: 390, height: 844 })
    const mobile = await page.locator('.scene-frame[data-test^="qds-scene-"]').evaluateAll((frames) => frames.map((frame) => {
      const host = frame as HTMLElement
      const panel = host.querySelector('[data-test^="qds-scene-card-"]') as HTMLElement
      const dock = host.querySelector('.scene-dock') as HTMLElement
      const hostRect = host.getBoundingClientRect()
      const panelRect = panel.getBoundingClientRect()
      const dockRect = dock.getBoundingClientRect()
      return {
        contained: [panelRect, dockRect].every((rect) => rect.left >= hostRect.left - 1 && rect.right <= hostRect.right + 1 && rect.top >= hostRect.top - 1 && rect.bottom <= hostRect.bottom + 1),
        scrollsHorizontally: host.scrollWidth > host.clientWidth,
      }
    }))

    for (const scene of mobile) {
      expect(scene.contained, '390px scene composition avoids clipping One and Term fixtures').toBe(true)
      expect(scene.scrollsHorizontally, '390px scene fixture does not rely on horizontal overflow').toBe(false)
    }
  })
})
