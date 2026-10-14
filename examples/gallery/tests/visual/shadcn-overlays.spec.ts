import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { SHADCN_PALETTES, applyShadcn } from './helpers'
import { assertParts, assertNoPageOverflow, byHook, native, paint, settle } from './shadcn-browser'
import { croppedOverlays, positionOverlayOpener, recordOverlayBounds, restingOverlayClip } from './shadcn-overlay-capture'

async function settlePortal(page: Page, selector: string) {
  const target = page.locator(selector)
  await expect(target).toBeVisible()
  await target.evaluate(async element => {
    const portal = element.closest('.q-dialog') ?? element
    let previous = '', stable = 0
    for (let frame = 0; frame < 300; frame++) {
      await new Promise(requestAnimationFrame)
      const transitioning = [portal, ...portal.querySelectorAll('[class]')].some(node =>
        [...node.classList].some(name => /(?:enter|leave)-(?:active|from|to)$/.test(name)),
      )
      const animated = document.getAnimations().some(animation => {
        const owner = animation.effect instanceof KeyframeEffect ? animation.effect.target : null
        return animation instanceof CSSTransition && animation.playState === 'running' && owner instanceof Element && (portal.contains(owner) || owner.contains(element))
      })
      const rect = element.getBoundingClientRect()
      const current = [rect.x, rect.y, rect.width, rect.height].join(',')
      stable = !transitioning && !animated && current === previous ? stable + 1 : 0
      previous = current
      if (stable >= 3) return
    }
    throw new Error('Native portal transition/geometry did not settle across three frames')
  })
}

async function nativePortals(page: Page, capture?: (selector: string, name: string) => Promise<void>) {
  const trigger = page.locator(native('menu-trigger'))
  await trigger.click()
  await assertParts(page, [native('menu'), `${native('menu')} .q-item__section--avatar`, `${native('menu')} .q-item__section--main + .q-item__section`, `${native('menu')} .q-separator`, `${native('menu')} .q-item.disabled`], 'menu')
  expect((await paint(page.locator(native('menu')))).backdropFilter).toBe('none')
  await capture?.(native('menu'), 'menu')
  await page.locator(native('menu')).getByText('Copy link').click()
  await expect(page.locator(native('menu'))).toHaveCount(0)
  await expect(trigger).toBeFocused()

  await page.locator(native('tooltip-trigger')).focus()
  await page.locator(native('tooltip-trigger')).hover()
  await expect(page.locator(native('tooltip'))).toBeVisible()
  expect((await paint(page.locator(native('tooltip')))).textContrast).toBeGreaterThanOrEqual(4.5)
  await capture?.(native('tooltip'), 'tooltip')
  await page.mouse.move(0, 0)
  // QBtn preserves existing focus on mouse activation. Establish the keyboard
  // opener explicitly, then verify Quasar restores it without a manual refocus.
  await page.locator(native('dialog-trigger')).focus()
  await page.locator(native('dialog-trigger')).click()
  await assertParts(page, ['.q-dialog__backdrop', '.q-dialog__inner', `${native('dialog')} .q-card__section`, `${native('dialog')} .q-card__actions`, `${native('dialog')} .q-field__native`], 'dialog')
  await expect(page.locator('.q-dialog')).toHaveAttribute('role', 'dialog')
  await capture?.(native('dialog'), 'dialog')
  await page.locator(native('dialog')).getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.locator(native('dialog'))).toHaveCount(0)
  await expect(page.locator(native('dialog-trigger'))).toBeFocused()

  await page.locator(native('dialog-select')).click()
  await assertParts(page, ['.q-dialog .q-select__dialog', '.q-dialog [role="listbox"]', '.q-dialog [role="option"]'], 'select dialog')
  await capture?.('.q-select__dialog', 'select-dialog')
  await page.locator('.q-dialog [role="option"]').filter({ hasText: 'password' }).click()
  await expect(page.locator('.q-select__dialog')).toHaveCount(0)

  const proxyOpener = page.getByRole('button', { name: 'Edit value', exact: true })
  // On mobile, center alignment puts a fractional background QBtn corner at
  // (17, 502), under the card's transparent lower-left corner. End alignment
  // keeps that unrelated control edge away from the native panel crop.
  await positionOverlayOpener(proxyOpener, page.viewportSize()!.width < 450 ? 'end' : 'center')
  await settle(page)
  await proxyOpener.click()
  const proxySelector = '.q-menu[data-native="popup-proxy"], .q-dialog[data-native="popup-proxy"]'
  const proxy = page.locator(proxySelector)
  await expect(proxy).toHaveCount(1)
  await expect(proxy.locator('.q-field')).toBeVisible()
  await expect(proxy.getByRole('textbox', { name: 'Popup value', exact: true })).toHaveValue('Alex Morgan')
  await expect(proxy).toHaveClass(page.viewportSize()!.width < 450 ? /q-dialog/ : /q-menu/)
  await settlePortal(page, proxySelector)
  const proxyBox = await proxy.boundingBox()
  expect(proxyBox!.x).toBeGreaterThanOrEqual(0)
  expect(proxyBox!.x + proxyBox!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1)
  if (page.viewportSize()!.width < 450) {
    const backdrop = proxy.locator('.q-dialog__backdrop')
    await expect(backdrop).toBeVisible()
    expect(await backdrop.boundingBox(), 'native proxy backdrop covers the viewport').toEqual({ x: 0, y: 0, ...page.viewportSize()! })
    await expect(backdrop).toHaveCSS('opacity', '1')
    await expect(backdrop).toHaveCSS('background-color', 'rgba(0, 0, 0, 0.5)')
  }
  await capture?.(page.viewportSize()!.width < 450 ? native('popup-proxy-content') : proxySelector, 'popup-proxy')
  await proxy.getByRole('button', { name: 'Close popup', exact: true }).click()
  await expect(proxy).toHaveCount(0)
  const editOpener = page.locator(native('popup-edit'))
  await positionOverlayOpener(editOpener)
  await settle(page)
  await editOpener.click()
  await assertParts(page, ['.q-popup-edit .q-field', '.q-popup-edit__buttons .q-btn'], 'popup edit')
  await expect(page.locator('.q-popup-edit input')).toBeFocused()
  await capture?.('.q-popup-edit', 'popup-edit')
  await page.locator('.q-popup-edit').getByRole('button', { name: 'Cancel', exact: true }).click()

  const editor = page.locator('[data-native="rich"] .q-editor')
  await editor.getByRole('button', { name: 'Expand "Format"', exact: true }).click()
  await assertParts(page, ['.q-editor__dropdown .q-item', '.q-editor__dropdown .q-item__section'], 'editor format')
  await capture?.('.q-editor__dropdown', 'editor-format')
  await page.locator('.q-editor__dropdown .q-item').first().click()
  // Select actual editable text, not a fabricated selection or fake dialog DOM.
  await editor.locator('.q-editor__content').focus()
  await page.keyboard.press('Control+Home')
  await page.keyboard.press('Control+Shift+ArrowRight')
  await editor.getByRole('button', { name: 'Hyperlink', exact: true }).click()
  await expect(editor.locator('.q-editor__link-input')).toBeVisible()
  await capture?.('[data-native="rich"] .q-editor', 'editor-link')
  await page.keyboard.press('Escape')
  await editor.getByRole('button', { name: 'Toggle Fullscreen', exact: true }).click()
  await expect(page.locator('.q-editor.fullscreen')).toBeVisible()
  await capture?.('.q-editor.fullscreen', 'editor-fullscreen')
  await page.locator('.q-editor.fullscreen').getByRole('button', { name: 'Toggle Fullscreen', exact: true }).click()
  await assertNoPageOverflow(page)
}

async function pluginStates(page: Page, capture?: (selector: string, name: string) => Promise<void>) {
  await page.getByRole('button', { name: 'Open list BottomSheet', exact: true }).click()
  await settlePortal(page, '.q-bottom-sheet')
  await assertParts(page, ['.q-bottom-sheet--list .q-bottom-sheet__item', '.q-bottom-sheet .q-card__section'], 'list BottomSheet')
  await capture?.('.q-bottom-sheet', 'bottomsheet-list')
  await page.locator('.q-bottom-sheet').getByText('Cancel', { exact: true }).click()
  await page.getByRole('button', { name: 'Open grid BottomSheet', exact: true }).click()
  await settlePortal(page, '.q-bottom-sheet')
  await assertParts(page, ['.q-bottom-sheet--grid .q-bottom-sheet__item'], 'grid BottomSheet')
  await capture?.('.q-bottom-sheet', 'bottomsheet-grid')
  await page.locator('.q-bottom-sheet').getByText('Tokens', { exact: true }).click()
  for (const [trigger, selector, parts] of [
    ['qds-notify-avatar-trigger', '.qds-notify-avatar', ['.q-notification__avatar', '.q-notification__caption', '.q-notification__actions']],
    ['qds-notify-bottom-trigger', '.qds-notify-position-bottom', ['.q-notification__message', '.q-notification__caption', '.q-notification__actions']],
    ['qds-notify-progress-trigger', '.qds-notify-progress', ['.q-notification__spinner', '.q-notification__progress', '.q-notification__actions']],
    ['qds-notify-grouped-trigger', '.qds-notify-grouped', ['.q-notification__badge', '.q-notification__actions']],
    ['qds-notify-updatable-trigger', '.qds-notify-updatable', ['.q-notification__spinner', '.q-notification__caption', '.q-notification__actions']],
  ] as const) {
    await page.locator(byHook(trigger)).click()
    await settlePortal(page, selector)
    await assertParts(page, parts.map(part => `${selector} ${part}`), trigger)
    const box = await page.locator(selector).boundingBox()
    expect(box!.x, 'notification stays inside viewport start').toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width, 'notification stays inside viewport end').toBeLessThanOrEqual(page.viewportSize()!.width)
    if (selector.includes('grouped')) await expect(page.locator(`${selector} .q-notification__badge`)).toHaveText('2')
    if (selector.includes('progress')) {
      await page.locator(selector).getByRole('button', { name: 'Keep open', exact: true }).click()
      await expect(page.locator(selector)).toBeVisible()
    }
    await capture?.(selector, trigger)
    if (selector.includes('updatable')) {
      await page.locator(selector).getByRole('button', { name: 'Complete', exact: true }).click()
      await expect(page.locator(selector)).toContainText('Visual proof complete')
      await expect(page.locator(`${selector} .q-notification__spinner`)).toHaveCount(0)
      await expect(page.locator(`${selector} .q-notification__icon`)).toBeVisible()
      await capture?.(selector, 'notify-updated')
    }
    await page.locator(selector).getByRole('button', { name: 'Dismiss', exact: true }).click()
    await expect(page.locator(selector)).toHaveCount(0)
  }
  for (const role of ['positive', 'negative', 'warning', 'info']) {
    await page.locator(byHook(`qds-notify-${role}-trigger`)).click()
    const message = page.locator(`.qds-notify-semantic--${role} .q-notification__message`)
    expect((await paint(message)).textContrast, `${role} notification contrast`).toBeGreaterThanOrEqual(4.5)
    await capture?.(`.qds-notify-semantic--${role}`, `notify-${role}`)
    await page.locator(`.qds-notify-semantic--${role}`).getByRole('button', { name: 'Dismiss', exact: true }).click()
  }
  await page.locator(byHook('qds-loading-grouped-trigger')).click()
  await assertParts(page, ['.q-loading__backdrop', '.q-loading__box', '.q-loading__spinner', '.q-loading__message'], 'Loading')
  await expect(page.locator('.q-loading__message')).toHaveText('Loading newer group')
  await capture?.('.q-loading__box', 'loading-newer')
  await page.evaluate(() => (window as unknown as { __qdsPluginsTest: { hideNewerLoadingGroup: () => void } }).__qdsPluginsTest.hideNewerLoadingGroup())
  await expect(page.locator('.q-loading__message')).toHaveText('Loading base group')
  await capture?.('.q-loading__box', 'loading-base')
  await page.evaluate(() => (window as unknown as { __qdsPluginsTest: { hideLoading: () => void } }).__qdsPluginsTest.hideLoading())
  await expect(page.locator('.q-loading')).toHaveCount(0)
  await page.getByRole('button', { name: 'Show loading overlay', exact: true }).click()
  await assertParts(page, ['.qds-plugin-loading .q-loading__backdrop.bg-positive', '.qds-plugin-loading .q-loading__box', '.qds-plugin-loading .q-loading__spinner.text-accent', '.qds-plugin-loading .q-loading__message.text-warning'], 'native custom Loading options')
  expect((await paint(page.locator('.q-loading__message'))).textContrast, 'custom native Loading message contrast').toBeGreaterThanOrEqual(4.5)
  await capture?.('.q-loading__box', 'loading-custom')
  await page.evaluate(() => (window as unknown as { __qdsPluginsTest: { hideLoading: () => void } }).__qdsPluginsTest.hideLoading())
  await expect(page.locator('.q-loading')).toHaveCount(0)
  await page.getByRole('button', { name: 'Start loading bar', exact: true }).click()
  await expect(page.locator('.q-loading-bar[role="progressbar"]')).toBeVisible()
  await capture?.('.q-loading-bar[role="progressbar"]', 'loadingbar')
  await page.getByRole('button', { name: 'Stop loading bar', exact: true }).click()
  await expect(page.locator('.q-loading-bar[role="progressbar"]')).toHaveCount(0)
}

async function catalogSelects(page: Page, capture?: (selector: string, name: string) => Promise<void>) {
  for (const name of ['multiple', 'cover', 'no-options', 'limited']) {
    const control = page.locator(byHook(`qds-catalog-select-${name}`))
    const chips = control.locator('.q-chip__content')
    const before = (await chips.allTextContents()).map(text => text.trim())
    if (name === 'multiple') expect(before).toEqual(['Compact', 'Touch'])
    await control.locator('.q-select__dropdown-icon').click()
    const popup = page.locator('.q-menu').last()
    await expect(popup).toBeVisible()
    await settlePortal(page, '.q-menu')
    await expect(chips, `${name} opening preserves the selected chip models`).toHaveText(before)
    if (name === 'no-options') await expect(popup).toContainText('No options available')
    else {
      await expect(popup.locator('[role="option"]').first()).toBeVisible()
      await expect(popup.locator('[aria-selected="true"]').first()).toBeVisible()
      if (name === 'limited') {
        await popup.locator('[role="option"]').filter({ hasText: 'Touch' }).click()
        await expect(page.locator(`${byHook('qds-catalog-select-limited')} .q-chip`)).toHaveCount(2)
      }
    }
    await capture?.('.q-menu', `select-${name}`)
    // Use the platform's native outside interaction, not a model reset.
    if (await page.evaluate(() => navigator.maxTouchPoints > 0)) await page.touchscreen.tap(0, 0)
    else await page.mouse.click(0, 0)
    await expect(popup).toHaveCount(0)
  }
}

async function componentOverlayStates(page: Page, capture?: (selector: string, name: string) => Promise<void>) {
  for (const name of ['dense', 'sections', 'context']) {
    if (name === 'context') await page.locator(byHook('qds-menu-context-target')).click({ button: 'right' })
    else await page.locator(byHook(`qds-menu-${name}-trigger`)).click()
    const selector = byHook(`qds-menu-${name}`)
    await expect(page.locator(selector)).toBeVisible()
    await settlePortal(page, selector)
    await assertParts(page, [`${selector} .q-item`, `${selector} .q-item__section`], `native ${name} menu`)
    await capture?.(selector, `menu-${name}`)
    await page.locator(`${selector} .q-item--clickable:not(.disabled)`).first().click()
    await expect(page.locator(selector)).toHaveCount(0)
  }
  for (const [name, close] of [['persistent', 'Keep editing'], ['maximized', 'Close maximized dialog'], ['bottom', 'Share link'], ['prompt', 'Cancel']] as const) {
    const trigger = page.locator(byHook(`qds-dialog-${name}-trigger`))
    if (name === 'bottom') {
      await positionOverlayOpener(trigger)
      await settle(page)
    }
    await trigger.focus()
    await trigger.click()
    const selector = byHook(`qds-dialog-${name}`)
    await expect(page.locator(selector)).toBeVisible()
    await expect(page.locator('.q-dialog__inner').last()).toBeVisible()
    await settlePortal(page, selector)
    if (name === 'persistent') {
      await page.keyboard.press('Escape')
      await expect(page.locator(selector)).toBeVisible()
    }
    if (name === 'maximized') {
      await expect.poll(async () => {
        const box = await page.locator(selector).boundingBox()
        return box && { width: box.width, height: box.height }
      }, { message: 'native maximized bounds settle to the viewport' }).toEqual(page.viewportSize())
      const box = await page.locator(selector).boundingBox()
      expect(box!.width).toBe(page.viewportSize()!.width)
      expect(box!.height).toBe(page.viewportSize()!.height)
    }
    if (name === 'prompt') await expect(page.locator(`${selector} input`)).toBeFocused()
    await capture?.(selector, `dialog-${name}`)
    if (name === 'bottom') await page.locator(selector).getByText(close, { exact: true }).click()
    else await page.locator(selector).getByRole('button', { name: close, exact: true }).click()
    await expect(page.locator(selector)).toHaveCount(0)
    await expect(trigger).toBeFocused()
  }
}

for (const palette of SHADCN_PALETTES) for (const mode of ['light', 'dark'] as const) {
  test(`shadcn actual native portals ${palette}/${mode}`, async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto('/conformance.html')
    await applyShadcn(page, mode, palette)
    await nativePortals(page)
    for (const name of ['Options dialog', 'Prompt dialog']) {
      await page.getByRole('button', { name, exact: true }).click()
      const plugin = page.locator('.q-dialog-plugin')
      await expect(plugin).toBeVisible()
      if (name === 'Options dialog') {
        await expect(plugin.getByRole('radio')).toHaveCount(2)
        await expect(plugin.getByRole('radio', { name: 'Account', exact: true })).toBeVisible()
        await expect(plugin.getByRole('radio', { name: 'Account', exact: true })).toBeChecked()
        await expect(plugin.getByRole('radio', { name: 'Password', exact: true })).toBeVisible()
        await expect(plugin.getByRole('radio', { name: 'Password', exact: true })).not.toBeChecked()
      } else await expect(plugin.getByRole('textbox')).toBeVisible()
      await plugin.getByRole('button', { name: 'Cancel', exact: true }).click()
      await expect(plugin).toHaveCount(0)
    }
    await page.getByRole('button', { name: 'Start AjaxBar', exact: true }).click()
    const ajaxBar = page.locator('[data-native="ajax-bar"][role="progressbar"]')
    await expect(ajaxBar).toBeVisible()
    await expect(ajaxBar).toHaveClass(/q-loading-bar/)
    await expect(ajaxBar).toHaveAttribute('aria-valuenow', '34')
    await page.goto('/#catalog')
    await applyShadcn(page, mode, palette)
    await catalogSelects(page)
    await page.goto('/#components')
    await applyShadcn(page, mode, palette)
    await componentOverlayStates(page)
  })
  test(`shadcn global plugin lifecycle ${palette}/${mode}`, async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto('/#plugins')
    await applyShadcn(page, mode, palette)
    await pluginStates(page)
    await expect(page.locator(byHook('qds-plugin-status'))).toContainText('LoadingBar plugin stopped')
    await assertNoPageOverflow(page)
  })
}

function screenshot(page: Page, info: TestInfo, prefix: string) {
  return async (selector: string, name: string) => {
    await settle(page)
    await settlePortal(page, selector)
    const filename = `${prefix}-${name}-${info.project.name}.png`
    if (croppedOverlays.has(name)) {
      const clip = await restingOverlayClip(page, selector)
      await settle(page)
      await settlePortal(page, selector)
      await expect(page).toHaveScreenshot(filename, { clip })
    } else await expect(page.locator(selector)).toHaveScreenshot(filename)
  }
}
for (const palette of SHADCN_PALETTES) for (const mode of ['light', 'dark'] as const) {
  test(`@screens shadcn actual open overlays ${palette}/${mode}`, async ({ page }, info) => {
    test.setTimeout(240_000)
    await page.goto('/conformance.html')
    await applyShadcn(page, mode, palette)
    await nativePortals(page, screenshot(page, info, `shadcn-${palette}-${mode}`))
    await page.goto('/#catalog')
    await applyShadcn(page, mode, palette)
    await catalogSelects(page, screenshot(page, info, `shadcn-${palette}-${mode}`))
    await page.goto('/#components')
    await applyShadcn(page, mode, palette)
    await componentOverlayStates(page, screenshot(page, info, `shadcn-${palette}-${mode}`))
    await page.goto('/#plugins')
    await applyShadcn(page, mode, palette)
    await pluginStates(page, screenshot(page, info, `shadcn-${palette}-${mode}`))
  })
}

// Opt-in raw proof: --repeat-each uses independent Playwright page/context fixtures.
// These captures never consult or update a golden, nor use assertion retry capture.
if (process.env.QDS_OVERLAY_STABILITY) for (const palette of SHADCN_PALETTES) for (const mode of ['light', 'dark'] as const) {
  test(`@screens shadcn overlay raw stability ${palette}/${mode}`, async ({ page }, info) => {
    test.setTimeout(120_000)
    const capture = async (selector: string, name: string) => {
      if (!croppedOverlays.has(name)) return
      await settle(page)
      await settlePortal(page, selector)
      const clip = await restingOverlayClip(page, selector)
      await settle(page)
      await settlePortal(page, selector)
      await recordOverlayBounds(page, selector, name, info)
      await page.screenshot({ path: info.outputPath(`${name}-raw.png`), clip, animations: 'disabled', caret: 'hide', scale: 'css' })
    }
    await page.goto('/conformance.html')
    await applyShadcn(page, mode, palette)
    await nativePortals(page, capture)
    await page.goto('/#components')
    await applyShadcn(page, mode, palette)
    await componentOverlayStates(page, capture)
  })
}
