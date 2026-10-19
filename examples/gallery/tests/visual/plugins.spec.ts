import { test, expect, type Page } from '@playwright/test'
import { readFile, readdir } from 'node:fs/promises'
import { MATRIX_VARIANTS, customProperty, expectGalleryPage, resolvedColor, resolvedShadow } from './helpers'

type Mode = 'light' | 'dark'
type Variant = 'fluent' | 'ink' | 'one' | 'term'

const componentStylesDirectory = new URL('../../../../src/css/components/', import.meta.url)

async function applyTheme(page: Page, mode: Mode, variant: Variant) {
  await page.waitForFunction(() => '__qdsGallery' in window)
  await page.evaluate(
    ({ mode, variant }) => {
      const ds = (window as unknown as { __qdsGallery: any }).__qdsGallery
      ds.setMode(mode)
      ds.setVariant(variant)
    },
    { mode, variant },
  )
  await expect(page.locator('body')).toHaveClass(new RegExp(`qds-variant-${variant}`))
  await expect(page.locator('body')).toHaveClass(new RegExp(mode === 'dark' ? 'qds-theme-dark' : 'qds-theme-light'))
}

async function computed(page: Page, selector: string, prop: string): Promise<string> {
  return page.locator(selector).first().evaluate(
    (el, prop) => getComputedStyle(el as Element).getPropertyValue(prop as string),
    prop,
  )
}

async function pseudoBackground(page: Page, selector: string, pseudo: '::before' | '::after' = '::before'): Promise<string> {
  return page.locator(selector).first().evaluate(
    (el, pseudo) => getComputedStyle(el as Element, pseudo as string).backgroundColor,
    pseudo,
  )
}

async function tokenColor(page: Page, token: string): Promise<string> {
  return page.evaluate((token) => {
    const proof = document.createElement('div')
    proof.style.backgroundColor = `var(${token})`
    document.body.append(proof)
    const color = getComputedStyle(proof).backgroundColor
    proof.remove()
    return color
  }, token)
}

function durationMs(value: string): number {
  const duration = Number.parseFloat(value)
  return value.trim().endsWith('ms') ? duration : duration * 1000
}

async function expectNoMaterialLigatures(page: Page, selector: string) {
  const materialIconNodes = page.locator(`${selector} .material-icons, ${selector} .material-symbols-outlined, ${selector} .material-symbols-rounded`)
  await expect(materialIconNodes, 'Notify state must not render Material icon ligatures').toHaveCount(0)

  const textOnlyIcons = await page.locator(`${selector} .q-icon`).evaluateAll((icons) => icons
    .filter((icon) => !icon.querySelector('svg') && icon.textContent?.trim())
    .map((icon) => icon.textContent?.trim()))
  expect(textOnlyIcons, 'Notify state must not render text-only icon ligatures').toEqual([])
}

async function groupedNotificationGeometry(page: Page) {
  return page.locator('.q-notification.qds-notify-grouped').evaluate((notification) => {
    const badge = notification.querySelector('.q-notification__badge')
    const actions = notification.querySelector('.q-notification__actions')
    if (!badge || !actions) return null

    const notificationBox = notification.getBoundingClientRect()
    const badgeBox = badge.getBoundingClientRect()
    const actionBox = actions.getBoundingClientRect()
    const actionButtons = [...actions.querySelectorAll('button')].map((button) => button.getBoundingClientRect())

    return {
      overflow: getComputedStyle(notification).overflow,
      actionDirection: getComputedStyle(actions).direction,
      notification: { left: notificationBox.left, right: notificationBox.right, top: notificationBox.top, bottom: notificationBox.bottom },
      badge: { left: badgeBox.left, right: badgeBox.right, top: badgeBox.top, bottom: badgeBox.bottom },
      actions: { left: actionBox.left, right: actionBox.right, top: actionBox.top, bottom: actionBox.bottom },
      actionButtons: actionButtons.map((button) => ({ left: button.left, right: button.right, top: button.top, bottom: button.bottom })),
      viewport: { width: window.innerWidth, height: window.innerHeight },
    }
  })
}

async function notificationViewportGeometry(page: Page, selector: string) {
  return page.locator(selector).evaluate((notification) => {
    const box = notification.getBoundingClientRect()
    return {
      left: box.left,
      right: box.right,
      top: box.top,
      bottom: box.bottom,
      viewport: { width: window.innerWidth, height: window.innerHeight },
    }
  })
}

async function waitForNotifyTransition(page: Page, selector: string) {
  await expect.poll(
    () => page.locator(selector).evaluate((notification) => [...notification.classList].some((className) => className.includes('q-notification--') && /-(enter|leave)/.test(className))),
    { message: 'Notify transition settles before geometry is measured' },
  ).toBe(false)
}

function pluginStatus(page: Page) {
  return page.locator('[data-test="qds-plugin-status"]')
}

async function cleanupPluginSurfaces(page: Page) {
  await page.evaluate(() => {
    const hooks = (window as typeof window & { __qdsPluginsTest?: { cleanup: () => void } }).__qdsPluginsTest
    hooks?.cleanup()
  })
  await page.keyboard.press('Escape')
}

async function hideLoadingWithTestHook(page: Page) {
  await page.evaluate(() => {
    const hooks = (window as typeof window & { __qdsPluginsTest?: { hideLoading: () => void } }).__qdsPluginsTest
    hooks?.hideLoading()
  })
}

async function hideNewerLoadingGroupWithTestHook(page: Page) {
  await page.evaluate(() => {
    const hooks = (window as typeof window & { __qdsPluginsTest?: { hideNewerLoadingGroup: () => void } }).__qdsPluginsTest
    hooks?.hideNewerLoadingGroup()
  })
}

async function expectNoResidualGlobalSurfaces(page: Page) {
  await expect(page.locator('.q-dialog')).toHaveCount(0)
  await expect(page.locator('.q-bottom-sheet')).toHaveCount(0)
  await expect(page.locator('.q-loading')).toHaveCount(0)
  await expect(page.locator('.q-notification')).toHaveCount(0)

  // Quasar's LoadingBar plugin keeps one inert .q-loading-bar node mounted after install.
  // The no-residual invariant for this plugin is therefore "no active progressbar".
  await expect(page.locator('.q-loading-bar[role="progressbar"]')).toHaveCount(0)
}

test.describe('QDS plugin/global UI surfaces', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#plugins')
    await applyTheme(page, 'light', 'fluent')
    await expectGalleryPage(page, 'Plugins')
    await expectNoResidualGlobalSurfaces(page)
  })

  test.afterEach(async ({ page }) => {
    await cleanupPluginSurfaces(page)
    await expectNoResidualGlobalSurfaces(page)
  })

  test('BottomSheet plugin list and grid surfaces are tokenized and clean up', async ({ page }) => {
    await page.getByRole('button', { name: 'Open list BottomSheet' }).click()
    await expect(page.locator('.q-bottom-sheet.q-bottom-sheet--list')).toBeVisible()
    expect.soft(await computed(page, '.q-bottom-sheet', 'background-color'), 'BottomSheet list surface').not.toBe('rgba(0, 0, 0, 0)')
    expect.soft(await computed(page, '.q-bottom-sheet', 'background-color'), 'BottomSheet list uses the thick material').toBe(await resolvedColor(page, '--qds-material-thick-bg'))
    expect.soft(await computed(page, '.q-bottom-sheet', 'box-shadow'), 'BottomSheet list carries the material edge and dialog shadow').toContain(await resolvedShadow(page, '--qds-shadow-lg'))
    expect.soft(await computed(page, '.q-bottom-sheet', 'backdrop-filter'), 'BottomSheet list blurs its backdrop').toContain('blur')
    expect.soft(await computed(page, '.q-bottom-sheet', 'border-top-color'), 'BottomSheet list carries the dialog material stroke').toBe(await resolvedColor(page, '--qds-material-stroke'))
    await page.getByText('Pin surface').click()
    await expect(pluginStatus(page)).toContainText('BottomSheet list action: Pin surface')
    await expectNoResidualGlobalSurfaces(page)

    await page.getByRole('button', { name: 'Open grid BottomSheet' }).click()
    await expect(page.locator('.q-bottom-sheet.q-bottom-sheet--grid')).toBeVisible()
    expect.soft(await computed(page, '.q-bottom-sheet--grid .q-bottom-sheet__item', 'border-radius'), 'BottomSheet grid item radius').toBe(await customProperty(page, '--qds-radius-control'))
    expect.soft(await computed(page, '.q-bottom-sheet--grid .q-bottom-sheet__item', 'color'), 'BottomSheet grid item text').not.toBe('rgba(0, 0, 0, 0)')
    await page.locator('.q-bottom-sheet').getByText('Tokens').click()
    await expect(pluginStatus(page)).toContainText('BottomSheet grid action: Tokens')
    await expectNoResidualGlobalSurfaces(page)
  })

  test('Dialog and Notify plugin surfaces inherit existing QDS overlay styling and clean up', async ({ page }) => {
    await page.getByRole('button', { name: 'Open plugin dialog' }).click()
    await expect(page.locator('.q-dialog').first()).toBeVisible()
    expect.soft(await computed(page, '.q-dialog__backdrop', 'background-color'), 'Dialog plugin scrim').not.toBe('rgba(0, 0, 0, 0)')
    expect.soft(await computed(page, '.q-dialog .q-card', 'box-shadow'), 'Dialog plugin card shadow').not.toBe('none')
    await page.getByRole('button', { name: 'Confirm' }).click()
    await expect(pluginStatus(page)).toContainText('Dialog plugin confirmed')
    await expectNoResidualGlobalSurfaces(page)

    await page.getByRole('button', { name: 'Show plugin notify' }).click()
    await expect(page.locator('.q-notification').first()).toBeVisible()
    expect.soft(await computed(page, '.q-notification', 'background-color'), 'Notify plugin surface').not.toBe('rgba(0, 0, 0, 0)')
    expect.soft(await computed(page, '.q-notification', 'box-shadow'), 'Notify plugin shadow').not.toBe('none')
    await page.getByRole('button', { name: 'Dismiss' }).click()
    await expectNoResidualGlobalSurfaces(page)
  })

  test('Notify avatar and representative viewport positions render accessibly and clean up', async ({ page }) => {
    await page.locator('[data-test="qds-notify-avatar-trigger"]').click()
    const avatarNotification = page.locator('.q-notification.qds-notify-avatar')
    await expect(avatarNotification).toBeVisible()
    await expect(avatarNotification).toHaveAttribute('role', 'alert')
    await expect(avatarNotification).toContainText('Avatar notification')
    const avatar = avatarNotification.locator('img').first()
    await expect(avatar).toBeVisible()
    await expect(avatar).toHaveAttribute('src', /^data:image\/svg\+xml,/)
    await expect(avatar).toHaveAttribute('aria-hidden', 'true')
    const topGeometry = await notificationViewportGeometry(page, '.q-notification.qds-notify-position-top')
    expect(topGeometry.top, 'Top Notify renders in the viewport’s upper half').toBeLessThan(topGeometry.viewport.height / 2)
    expect(topGeometry.left, 'Top-left Notify renders in the viewport’s left half').toBeLessThan(topGeometry.viewport.width / 2)
    await page.getByRole('button', { name: 'Dismiss' }).click()
    await expectNoResidualGlobalSurfaces(page)

    await page.locator('[data-test="qds-notify-bottom-trigger"]').click()
    const bottomNotification = page.locator('.q-notification.qds-notify-position-bottom')
    await expect(bottomNotification).toBeVisible()
    const bottomGeometry = await notificationViewportGeometry(page, '.q-notification.qds-notify-position-bottom')
    expect(bottomGeometry.bottom, 'Bottom Notify renders in the viewport’s lower half').toBeGreaterThan(bottomGeometry.viewport.height / 2)
    expect(Math.abs((bottomGeometry.left + bottomGeometry.right) / 2 - bottomGeometry.viewport.width / 2), 'Bottom Notify is centered in the viewport').toBeLessThanOrEqual(2)
    await page.getByRole('button', { name: 'Dismiss' }).click()
    await expectNoResidualGlobalSurfaces(page)
  })

  test('Notify action, progress, grouped badge, and updatable spinner states use the official plugin API', async ({ page }) => {
    await page.locator('[data-test="qds-notify-progress-trigger"]').click()
    await expect(page.locator('.q-notification.qds-notify-progress')).toBeVisible()
    await expect(page.locator('.q-notification.qds-notify-progress .q-notification__spinner')).toBeVisible()
    await expect(page.locator('.q-notification.qds-notify-progress .q-notification__progress')).toBeVisible()
    expect.soft(await computed(page, '.q-notification.qds-notify-progress .q-notification__progress', 'height'), 'Notify progress height').toBe('3px')
    expect.soft(await computed(page, '.q-notification.qds-notify-progress .q-notification__progress', 'background-color'), 'Notify progress role fill').toBe(await tokenColor(page, '--qds-color-info'))
    await page.getByRole('button', { name: 'Keep open' }).click()
    await expect(pluginStatus(page)).toContainText('Notify progress kept open')
    await page.getByRole('button', { name: 'Dismiss' }).click()
    await expectNoResidualGlobalSurfaces(page)

    await page.locator('[data-test="qds-notify-grouped-trigger"]').click()
    await expect(page.locator('.q-notification.qds-notify-grouped')).toBeVisible()
    await expect(page.locator('.q-notification.qds-notify-grouped .q-notification__badge')).toHaveText('2')
    await waitForNotifyTransition(page, '.q-notification.qds-notify-grouped')
    expect.soft(await computed(page, '.q-notification.qds-notify-grouped .q-notification__badge', 'background-color'), 'Grouped Notify badge role fill').toBe(await tokenColor(page, '--qds-color-warning'))
    const groupedGeometry = await groupedNotificationGeometry(page)
    expect(groupedGeometry, 'Grouped Notify exposes a stable badge and action rail').not.toBeNull()
    expect(groupedGeometry!.overflow, 'Grouped Notify allows Quasar’s external badge geometry').toBe('visible')
    expect(groupedGeometry!.badge.left, 'Grouped badge stays within the viewport').toBeGreaterThanOrEqual(0)
    expect(groupedGeometry!.badge.top, 'Grouped badge stays within the viewport').toBeGreaterThanOrEqual(0)
    expect(groupedGeometry!.badge.right, 'Grouped badge stays within the viewport').toBeLessThanOrEqual(groupedGeometry!.viewport.width)
    expect(groupedGeometry!.badge.bottom, 'Grouped badge stays within the viewport').toBeLessThanOrEqual(groupedGeometry!.viewport.height)
    expect(groupedGeometry!.badge.left, 'Grouped badge visibly extends outside its notification corner').toBeLessThan(groupedGeometry!.notification.left)
    await page.getByRole('button', { name: 'Dismiss' }).click()
    await expectNoResidualGlobalSurfaces(page)

    await page.locator('[data-test="qds-notify-updatable-trigger"]').click()
    await expect(page.locator('.q-notification.qds-notify-updatable .q-notification__spinner')).toBeVisible()
    await page.getByRole('button', { name: 'Complete' }).click()
    await expect(page.locator('.q-notification.qds-notify-updatable')).toContainText('Visual proof complete')
    await expect(page.locator('.q-notification.qds-notify-updatable .q-notification__spinner')).toHaveCount(0)
    await expect(page.locator('.q-notification.qds-notify-updatable .q-notification__icon')).toBeVisible()
    await expectNoMaterialLigatures(page, '.q-notification.qds-notify-updatable')
    await page.getByRole('button', { name: 'Dismiss' }).click()
    await expectNoResidualGlobalSurfaces(page)
  })

  test('Notify semantic role surfaces resolve across canonical variants', async ({ page }) => {
    for (const variant of MATRIX_VARIANTS) {
      await applyTheme(page, 'light', variant)

      for (const type of ['positive', 'negative', 'warning', 'info'] as const) {
        await page.locator(`[data-test="qds-notify-${type}-trigger"]`).click()
        const notification = page.locator(`.q-notification.qds-notify-semantic--${type}`)
        await expect(notification).toBeVisible()
        await expect(notification).toHaveClass(new RegExp(`bg-${type}`))
        expect.soft(await pseudoBackground(page, `.q-notification.qds-notify-semantic--${type}`), `${variant}/${type} Notify accent rail`).toBe(await tokenColor(page, `--qds-color-${type}`))
        expect.soft(await computed(page, `.q-notification.qds-notify-semantic--${type}`, 'background-color'), `${variant}/${type} Notify surface`).not.toBe('rgba(0, 0, 0, 0)')
        await page.getByRole('button', { name: 'Dismiss' }).click({ force: true })
        await expectNoResidualGlobalSurfaces(page)
      }
    }

    for (const proof of [
      { mode: 'dark' as const, variant: 'fluent' as const, type: 'negative' as const },
      { mode: 'dark' as const, variant: 'term' as const, type: 'info' as const },
    ]) {
      await applyTheme(page, proof.mode, proof.variant)
      await page.locator(`[data-test="qds-notify-${proof.type}-trigger"]`).click()
      const notification = page.locator(`.q-notification.qds-notify-semantic--${proof.type}`)
      await expect(notification).toBeVisible()
      expect.soft(await pseudoBackground(page, `.q-notification.qds-notify-semantic--${proof.type}`), `${proof.mode}/${proof.variant}/${proof.type} Notify accent rail`).toBe(await tokenColor(page, `--qds-color-${proof.type}`))
      expect.soft(await computed(page, `.q-notification.qds-notify-semantic--${proof.type}`, 'background-color'), `${proof.mode}/${proof.variant}/${proof.type} Notify surface`).not.toBe('rgba(0, 0, 0, 0)')
      await expectNoMaterialLigatures(page, `.q-notification.qds-notify-semantic--${proof.type}`)
      await page.getByRole('button', { name: 'Dismiss' }).click({ force: true })
      await expectNoResidualGlobalSurfaces(page)
    }
  })

  test('Notify grouped badge and action geometry remain visible in RTL', async ({ page }) => {
    await page.evaluate(() => {
      document.documentElement.dir = 'rtl'
      document.body.dir = 'rtl'
      document.documentElement.style.direction = 'rtl'
      document.body.style.direction = 'rtl'
    })
    await page.locator('[data-test="qds-notify-grouped-trigger"]').click()
    await expect(page.locator('.q-notification.qds-notify-grouped .q-notification__badge')).toHaveText('2')
    await waitForNotifyTransition(page, '.q-notification.qds-notify-grouped')

    const geometry = await groupedNotificationGeometry(page)
    expect(geometry, 'RTL Grouped Notify exposes a stable badge and action rail').not.toBeNull()
    expect(geometry!.overflow, 'RTL grouped badge remains unclipped').toBe('visible')
    expect(geometry!.actionDirection, 'RTL Notify actions inherit document direction').toBe('rtl')
    expect(geometry!.badge.left, 'RTL grouped badge stays within the viewport').toBeGreaterThanOrEqual(0)
    expect(geometry!.badge.top, 'RTL grouped badge stays within the viewport').toBeGreaterThanOrEqual(0)
    expect(geometry!.badge.right, 'RTL grouped badge stays within the viewport').toBeLessThanOrEqual(geometry!.viewport.width)
    expect(geometry!.badge.left, 'RTL grouped badge visibly extends beyond the notification corner').toBeLessThan(geometry!.notification.left)
    expect(geometry!.actionButtons, 'RTL Notify actions are rendered').not.toHaveLength(0)
    for (const action of geometry!.actionButtons) {
      expect(action.left, 'RTL Notify action stays inside its action rail').toBeGreaterThanOrEqual(geometry!.actions.left)
      expect(action.right, 'RTL Notify action stays inside its action rail').toBeLessThanOrEqual(geometry!.actions.right)
    }

    await page.getByRole('button', { name: 'Dismiss' }).click({ force: true })
    await expectNoResidualGlobalSurfaces(page)
  })

  test('Notify progress, grouped badge, and transitions honor reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.locator('[data-test="qds-notify-progress-trigger"]').click()
    await expect(page.locator('.q-notification.qds-notify-progress .q-notification__progress')).toHaveCount(1)
    expect.soft(durationMs(await computed(page, '.q-notification.qds-notify-progress .q-notification__progress', 'animation-duration')), 'Reduced-motion Notify progress').toBeLessThanOrEqual(0.01)
    expect.soft(durationMs(await computed(page, '.q-notification.qds-notify-progress', 'transition-duration')), 'Reduced-motion Notify transition').toBeLessThanOrEqual(0.01)
    await page.getByRole('button', { name: 'Dismiss' }).click()
    await expectNoResidualGlobalSurfaces(page)

    await page.locator('[data-test="qds-notify-grouped-trigger"]').click()
    await expect(page.locator('.q-notification.qds-notify-grouped .q-notification__badge')).toHaveText('2')
    expect.soft(durationMs(await computed(page, '.q-notification.qds-notify-grouped .q-notification__badge', 'animation-duration')), 'Reduced-motion grouped badge').toBeLessThanOrEqual(0.01)
    await page.getByRole('button', { name: 'Dismiss' }).click()
    await expectNoResidualGlobalSurfaces(page)
  })

  test('BottomSheet and Notify plugin proofs cover non-Fluent variants and dark surfaces', async ({ page }) => {
    await applyTheme(page, 'dark', 'ink')
    await page.getByRole('button', { name: 'Open grid BottomSheet' }).click()
    await expect(page.locator('.q-bottom-sheet.q-bottom-sheet--grid')).toBeVisible()
    expect.soft(await computed(page, '.q-bottom-sheet', 'background-color'), 'Ink dark BottomSheet surface').not.toBe('rgba(0, 0, 0, 0)')
    expect.soft(await computed(page, '.q-bottom-sheet', 'backdrop-filter'), 'Ink dark BottomSheet remains unblurred').toBe('none')
    await page.locator('.q-bottom-sheet').getByText('Tokens').click()
    await expectNoResidualGlobalSurfaces(page)

    for (const proof of [
      { mode: 'light' as const, variant: 'ink' as const, shadow: 'none' },
      { mode: 'dark' as const, variant: 'term' as const, shadow: 'none' },
    ]) {
      await applyTheme(page, proof.mode, proof.variant)
      await page.getByRole('button', { name: 'Show plugin notify' }).click()
      await expect(page.locator('.q-notification').first()).toBeVisible()
      expect.soft(await computed(page, '.q-notification', 'background-color'), `${proof.variant} Notify surface`).not.toBe('rgba(0, 0, 0, 0)')
      expect.soft(await computed(page, '.q-notification', 'border-top-width'), `${proof.variant} Notify border`).toBe('1px')

      const shadow = await computed(page, '.q-notification', 'box-shadow')
      if (proof.shadow === 'none') {
        expect.soft(shadow, `${proof.variant} Notify shadow`).toBe('none')
      } else {
        expect.soft(shadow, `${proof.variant} Notify shadow`).not.toBe('none')
      }

      await page.getByRole('button', { name: 'Dismiss' }).click()
      await expectNoResidualGlobalSurfaces(page)
    }
  })

  test('Loading and LoadingBar plugin surfaces are visible only during their assertions', async ({ page }) => {
    await expect(page.locator('[data-test="qds-plugin-inner-loading"]')).toBeVisible()
    expect.soft(await computed(page, '.qds-plugin-inner-loading', 'background-color'), 'QInnerLoading plugin proof surface').not.toBe('rgba(0, 0, 0, 0)')
    expect.soft(await computed(page, '.qds-plugin-inner-loading', 'backdrop-filter'), 'QInnerLoading plugin proof blur').not.toBe('none')
    expect.soft(await computed(page, '.qds-plugin-inner-loading', 'border-radius'), 'QInnerLoading retains its component geometry').not.toBe('0px')

    await page.getByRole('button', { name: 'Show loading overlay' }).click()
    const loading = page.locator('.q-loading.qds-plugin-loading')
    await expect(loading).toBeVisible()
    await expect(loading).toHaveClass(/qds-plugin-loading/)
    await expect(loading.locator('.q-loading__box')).toHaveClass(/qds-plugin-loading-box/)
    await expect(loading.locator('.q-loading__spinner')).toHaveAttribute('viewBox', '0 0 100 100')
    await expect(loading.locator('.q-loading__message')).toHaveText('Rendering a custom Quasar spinner…')
    await expect(loading.locator('.q-loading__backdrop')).toHaveClass(/bg-positive/)
    await expect(loading.locator('.q-loading__message')).toHaveClass(/text-warning/)
    await expect(loading.locator('.q-loading__spinner')).toHaveClass(/text-accent/)
    expect.soft(await computed(page, '.q-loading__backdrop', 'background-color'), 'Loading backdrop surface').not.toBe('rgba(0, 0, 0, 0)')
    expect.soft(await computed(page, '.q-loading__backdrop', 'backdrop-filter'), 'Loading scrim stays unblurred').toBe('none')
    expect.soft(await computed(page, '.q-loading__box', 'background-color'), 'Loading box surface').not.toBe('rgba(0, 0, 0, 0)')
    expect.soft(await computed(page, '.q-loading__box', 'box-shadow'), 'Loading box shadow').not.toBe('none')
    expect.soft(await computed(page, '.q-loading__spinner', 'color'), 'Loading spinner stays visibly colored after QDS styling').not.toBe('rgba(0, 0, 0, 0)')
    expect.soft(await computed(page, '.q-loading__message', 'color'), 'Loading message uses muted text').not.toBe('rgba(0, 0, 0, 0)')
    await hideLoadingWithTestHook(page)
    await expect(page.locator('.q-loading')).toHaveCount(0)
    await expectNoResidualGlobalSurfaces(page)

    await page.locator('[data-test="qds-loading-grouped-trigger"]').click()
    await expect(page.locator('.q-loading.qds-plugin-loading-group--newer')).toBeVisible()
    await expect(page.locator('.q-loading')).toContainText('Loading newer group')
    await hideNewerLoadingGroupWithTestHook(page)
    await expect(page.locator('.q-loading.qds-plugin-loading-group--base')).toBeVisible()
    await expect(page.locator('.q-loading')).toContainText('Loading base group')
    await hideLoadingWithTestHook(page)
    await expectNoResidualGlobalSurfaces(page)

    await page.getByRole('button', { name: 'Start loading bar' }).click()
    await expect(page.locator('.q-loading-bar[role="progressbar"]').first()).toBeVisible()
    expect.soft(await computed(page, '.q-loading-bar[role="progressbar"]', 'background-color'), 'LoadingBar token color').toBe(await resolvedColor(page, '--qds-color-primary'))
    await page.getByRole('button', { name: 'Stop loading bar' }).click()
    await expect(page.locator('.q-loading-bar[role="progressbar"]')).toHaveCount(0, { timeout: 1500 })
    await expectNoResidualGlobalSurfaces(page)
  })

  test('Loading plugin selectors have one owner across all component partials', async () => {
    const partials = (await readdir(componentStylesDirectory, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.endsWith('.scss'))
    const stylesByPartial = await Promise.all(partials.map(async (entry) => [
      entry.name,
      await readFile(new URL(entry.name, componentStylesDirectory), 'utf8'),
    ] as const))
    const loadingSurfaceSelector = /\.q-loading(?:\.q-loading)?\s+\.q-loading__(?:backdrop|box|spinner|message)\b/g
    const pluginStyles = stylesByPartial.find(([name]) => name === '_plugins.scss')?.[1]

    expect(pluginStyles, 'the plugin partial owns Loading plugin selectors').toBeDefined()
    expect(pluginStyles!.match(loadingSurfaceSelector)?.length, 'plugin Loading backdrop, box, spinner, and message selectors').toBeGreaterThanOrEqual(4)
    for (const [name, styles] of stylesByPartial) {
      if (name !== '_plugins.scss') {
        expect(styles, `${name} must not restyle the Loading plugin`).not.toMatch(loadingSurfaceSelector)
      }
    }
    const loadingData = stylesByPartial.find(([name]) => name === '_loading-data.scss')?.[1]
    expect(loadingData, 'QInnerLoading remains a loading/data component surface').toMatch(/\.qds-ui \.q-inner-loading\s*\{/)
    expect(loadingData, 'QAjaxBar and LoadingBar remain loading/data global progress surfaces').toMatch(/\.qds-ui :is\([^)]*\.q-loading-bar[^)]*\)\s*\{/)
    for (const [name, styles] of stylesByPartial) {
      if (name !== '_loading-data.scss') {
        expect(styles, `${name} must not restyle QInnerLoading or LoadingBar`).not.toMatch(/\.q-(?:inner-loading|loading-bar)\b/)
      }
    }
  })

  test('plugin overlays prove Fluent, Ink, and One in both resolved modes', async ({ page }) => {
    for (const mode of ['light', 'dark'] as const) {
      for (const variant of MATRIX_VARIANTS) {
        await applyTheme(page, mode, variant)
        await page.getByRole('button', { name: 'Show plugin notify' }).click()
        await expect(page.locator('.q-notification').first()).toBeVisible()
        const boundary = {
          stroke: await computed(page, '.q-notification', 'border-top-color'),
          shadow: await computed(page, '.q-notification', 'box-shadow'),
        }
        expect.soft(boundary.stroke !== 'rgba(0, 0, 0, 0)' || boundary.shadow !== 'none', `${mode}/${variant} overlay has a visible boundary (stroke or shadow)`).toBe(true)
        expect.soft(await computed(page, '.q-notification', 'background-color'), `${mode}/${variant} overlay has a surfaced background`).not.toBe('rgba(0, 0, 0, 0)')
        if (variant === 'fluent') {
          expect.soft(boundary.shadow, `${mode}/Fluent transient overlay is lifted by the flyout shadow`).toBe(await resolvedShadow(page, '--qds-shadow-md'))
          expect.soft(boundary.stroke, `${mode}/Fluent toast relies on shadow, not a stroke`).toBe('rgba(0, 0, 0, 0)')
        }
        if (variant === 'ink') {
          expect.soft(boundary.shadow, `${mode}/Ink overlay remains flat`).toBe('none')
          expect.soft(boundary.stroke, `${mode}/flat Ink overlay keeps a stroke boundary`).not.toBe('rgba(0, 0, 0, 0)')
        }
        if (variant === 'one') {
          const largeRadius = await page.locator('body').evaluate((element) => {
            const probe = document.createElement('span')
            probe.style.borderTopLeftRadius = 'var(--qds-radius-lg)'
            element.append(probe)
            const radius = getComputedStyle(probe).borderTopLeftRadius
            probe.remove()
            return radius
          })
          expect.soft(boundary.shadow, `${mode}/One toast keeps the flyout shadow`).toBe(await resolvedShadow(page, '--qds-shadow-md'))
          expect.soft(await computed(page, '.q-notification', 'background-color'), `${mode}/One info toast sits on the info soft wash`).toBe(await resolvedColor(page, '--qds-surface-info-soft'))
          expect.soft(await computed(page, '.q-notification', 'border-top-left-radius'), `${mode}/One toast uses the large radius`).toBe(largeRadius)
        }
        await page.getByRole('button', { name: 'Dismiss' }).click()
        await expectNoResidualGlobalSurfaces(page)
      }
    }
  })
})
