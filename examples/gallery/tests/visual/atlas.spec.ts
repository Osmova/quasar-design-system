import { fileURLToPath } from 'node:url'
import { expect, test, type Page } from '@playwright/test'
import { FAMILIES, type Section } from './atlas-families'
import { applyTheme, type Mode } from './helpers'

type Overlay = {
  name: string
  open: (page: Page) => Promise<void>
  target: string
  close: (page: Page) => Promise<void>
  mobile?: boolean
}

const MODES: Mode[] = ['light', 'dark']
const VARIANT_HOOKS: Partial<Record<Section, readonly string[]>> = {
  forms: ['qds-forms-anatomy-field', 'qds-forms-option-cards-radio'],
  apps: ['qds-apps-subpage', 'qds-apps-tiles'],
}

// Overlays are captured on the solid material fallback so baselines never depend on blurred page content.
async function forceSolidMaterials(page: Page) {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] })
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-transparency: reduce)').matches), 'reduced transparency is emulated').toBe(true)
}

function alpha(color: string): number {
  const slash = color.match(/\/\s*([\d.]+)(%?)\s*\)$/)
  if (slash) return Number.parseFloat(slash[1]) / (slash[2] ? 100 : 1)
  const rgba = color.match(/^rgba\((?:[^,]+,){3}\s*([\d.]+)\)$/)
  return rgba ? Number.parseFloat(rgba[1]) : 1
}

// Rounded overlay corners otherwise reveal whatever page content sits beneath them.
const HIDE_PAGE_BEHIND_OVERLAYS = fileURLToPath(new URL('./atlas-overlay.css', import.meta.url))
// The sticky gallery header would otherwise cover the top of targets taller than the viewport.
const HIDE_GALLERY_HEADER = fileURLToPath(new URL('./atlas-element.css', import.meta.url))

// Floor the overlay rect inward so sub-pixel positions never bleed the trigger beneath into the crop.
async function tightClip(page: Page, selector: string) {
  // Enter transitions scale and slide the overlay, so wait until its rect holds still for three frames.
  await page.locator(selector).evaluate(async (element) => {
    const frame = () => new Promise(requestAnimationFrame)
    let last = ''
    for (let stable = 0, tries = 0; stable < 3 && tries < 240; tries++) {
      await frame()
      await Promise.all(
        document
          .getAnimations()
          .filter((animation) => Number.isFinite(Number(animation.effect?.getComputedTiming().endTime)))
          .map((animation) => animation.finished.catch(() => undefined)),
      )
      const rect = element.getBoundingClientRect()
      const key = [rect.x, rect.y, rect.width, rect.height].join()
      stable = key === last ? stable + 1 : 0
      last = key
    }
  })
  const box = await page.locator(selector).boundingBox()
  expect(box, `${selector} has a layout box`).not.toBeNull()
  const x = Math.ceil(box!.x)
  const y = Math.ceil(box!.y)
  // Size from the box alone so sub-pixel placement never changes the crop dimensions.
  return { x, y, width: Math.floor(box!.width) - 1, height: Math.floor(box!.height) - 1 }
}

const byHook = (hook: string) => `[data-test="${hook}"]`
// QEditor passes data-test to its content node, so the shot targets the editor root.
const captureTarget = (hook: string) => (hook === 'qds-editor' ? `.q-editor:has(${byHook(hook)})` : byHook(hook))

const escape = async (page: Page) => {
  await page.keyboard.press('Escape')
}

// Quasar only binds Escape on desktop platforms, so mobile-captured overlays close through an action.
const clickButton = (target: string, name: string) => async (page: Page) => {
  await page.locator(target).getByRole('button', { name }).click()
}

const clickItem = (target: string, text: string) => async (page: Page) => {
  await page.locator(target).locator('.q-item', { hasText: text }).click()
}

const MOBILE_HOOKS: Record<Section, readonly string[]> = {
  components: ['qds-control-standard-button', 'qds-chip-avatar', 'qds-control-input', 'qds-pagination', 'qds-tabs-horizontal', 'qds-tabs-scroll'],
  forms: ['qds-forms-anatomy-field', 'qds-forms-horizontal', 'qds-forms-field-group', 'qds-forms-pin', 'qds-forms-option-cards-radio', 'qds-forms-pills', 'qds-forms-settings-group'],
  apps: ['qds-apps-split', 'qds-apps-nav', 'qds-apps-subpage', 'qds-apps-tiles', 'qds-apps-list-detail'],
  catalog: [
    'qds-btn-toggle',
    'qds-banner-actions',
    'qds-breadcrumbs-overflow',
    'qds-catalog-date',
    'qds-tree-primary',
    'qds-stepper-vertical',
    'qds-stepper-horizontal',
    'qds-uploader',
  ],
  plugins: ['qds-plugin-dialog-notify-card'],
}

const clickHook = (hook: string) => async (page: Page) => {
  await page.locator(byHook(hook)).click()
}

const OVERLAYS: Record<Section, readonly Overlay[]> = {
  components: [
    { name: 'qds-menu-dense', open: clickHook('qds-menu-dense-trigger'), target: byHook('qds-menu-dense'), close: escape },
    { name: 'qds-menu-sections', open: clickHook('qds-menu-sections-trigger'), target: byHook('qds-menu-sections'), close: clickItem(byHook('qds-menu-sections'), 'Copy link'), mobile: true },
    {
      name: 'qds-menu-context',
      open: async (page) => page.locator(byHook('qds-menu-context-target')).click({ button: 'right' }),
      target: byHook('qds-menu-context'),
      close: escape,
    },
    {
      name: 'qds-select-popup',
      open: async (page) => page.locator(`${byHook('qds-control-select')} .q-field__control`).click(),
      target: '.q-menu:has([role="listbox"])',
      close: escape,
    },
    {
      name: 'qds-tooltip-top',
      open: async (page) => page.locator(byHook('qds-tooltip-top-trigger')).hover(),
      target: byHook('qds-tooltip-top'),
      close: async (page) => page.mouse.move(0, 0),
    },
    {
      name: 'qds-dialog-persistent',
      open: clickHook('qds-dialog-persistent-trigger'),
      target: byHook('qds-dialog-persistent'),
      close: clickButton(byHook('qds-dialog-persistent'), 'Keep editing'),
    },
    { name: 'qds-dialog-maximized', open: clickHook('qds-dialog-maximized-trigger'), target: byHook('qds-dialog-maximized'), close: escape },
    { name: 'qds-dialog-bottom', open: clickHook('qds-dialog-bottom-trigger'), target: byHook('qds-dialog-bottom'), close: escape },
    { name: 'qds-dialog-prompt', open: clickHook('qds-dialog-prompt-trigger'), target: byHook('qds-dialog-prompt'), close: clickButton(byHook('qds-dialog-prompt'), 'Cancel'), mobile: true },
  ],
  forms: [],
  apps: [
    {
      name: 'qds-apps-split-menu',
      open: async (page) => page.locator(`${byHook('qds-apps-split')} .q-btn-dropdown__arrow-container`).click(),
      target: `.q-menu:has(${byHook('qds-apps-split-menu')})`,
      close: escape,
    },
    {
      name: 'qds-apps-dialog',
      open: clickHook('qds-apps-dialog-trigger'),
      target: byHook('qds-apps-dialog'),
      close: clickButton(byHook('qds-apps-dialog'), 'Cancel'),
      mobile: true,
    },
  ],
  catalog: [],
  plugins: [
    {
      name: 'qds-bottom-sheet-list',
      open: async (page) => page.getByRole('button', { name: 'Open list BottomSheet' }).click(),
      target: '.q-bottom-sheet',
      close: clickItem('.q-bottom-sheet', 'Cancel'),
      mobile: true,
    },
  ],
}

test.describe('@screens atlas', () => {
  for (const section of Object.keys(FAMILIES) as Section[]) {
    for (const mode of MODES) {
      test(`${section} fluent ${mode}`, async ({ page }, testInfo) => {
        test.setTimeout(240_000)
        const mobile = testInfo.project.name === 'mobile'

        await page.goto(`./#${section}`)
        await applyTheme(page, mode, 'fluent')
        await page.evaluate(async () => {
          await document.fonts.ready
        })

        const hooks = Object.values(FAMILIES[section]).flat()
        for (const hook of mobile ? MOBILE_HOOKS[section] : hooks) {
          const target = page.locator(captureTarget(hook))
          await expect(target, `${hook} is rendered exactly once`).toHaveCount(1)
          // Centre the target so the sticky gallery header never overlaps the crop.
          await target.evaluate((element) => element.scrollIntoView({ block: 'center' }))
          await expect(target, `${hook} is visible on ${testInfo.project.name}`).toBeVisible()
          await expect.soft(target).toHaveScreenshot(`atlas-${hook}-${mode}.png`, { stylePath: HIDE_GALLERY_HEADER })
        }

        const overlays = OVERLAYS[section].filter((overlay) => !mobile || overlay.mobile)
        if (overlays.length) await forceSolidMaterials(page)
        for (const overlay of overlays) {
          await overlay.open(page)
          const target = page.locator(overlay.target)
          await expect(target, `${overlay.name} overlay opens once`).toHaveCount(1)
          await expect(target, `${overlay.name} overlay is visible`).toBeVisible()
          const background = await target.evaluate((element) => getComputedStyle(element).backgroundColor)
          expect.soft(alpha(background), `${overlay.name} renders on the solid material fallback (${background})`).toBe(1)
          await expect.soft(page).toHaveScreenshot(`atlas-${overlay.name}-${mode}.png`, {
            clip: await tightClip(page, overlay.target),
            stylePath: HIDE_PAGE_BEHIND_OVERLAYS,
          })
          await overlay.close(page)
          await expect(target, `${overlay.name} overlay closes`).toHaveCount(0)
        }
      })
    }
  }

  for (const mode of MODES) {
    test(`scenes materials fluent ${mode}`, async ({ page }) => {
      await page.goto('./#scenes')
      await applyTheme(page, mode, 'fluent')
      await page.evaluate(async () => {
        await document.fonts.ready
      })
      const target = page.locator(byHook('qds-scene-materials'))
      await expect(target, 'qds-scene-materials is rendered exactly once').toHaveCount(1)
      await target.evaluate((element) => element.scrollIntoView({ block: 'center' }))
      await expect(target).toBeVisible()
      await expect.soft(target).toHaveScreenshot(`atlas-qds-scene-materials-${mode}.png`)
    })
  }

  for (const variant of ['ink', 'one', 'term', 'zen'] as const) {
    for (const mode of MODES) {
      test(`${variant} ${mode}`, async ({ page }) => {
        for (const [section, hooks] of Object.entries(VARIANT_HOOKS)) {
          await page.goto(`./#${section}`)
          await applyTheme(page, mode, variant)
          await page.evaluate(async () => {
            await document.fonts.ready
          })
          for (const hook of hooks) {
            const target = page.locator(byHook(hook))
            await expect(target, `${hook} is rendered exactly once`).toHaveCount(1)
            await target.evaluate((element) => element.scrollIntoView({ block: 'center' }))
            await expect(target).toBeVisible()
            await expect.soft(target).toHaveScreenshot(`atlas-${variant}-${hook}-${mode}.png`, { stylePath: HIDE_GALLERY_HEADER })
          }
        }
      })
    }
  }
})
