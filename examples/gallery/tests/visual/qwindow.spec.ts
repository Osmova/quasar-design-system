import { expect, test, type Page } from '@playwright/test'
import { expectGalleryPage, resolvedColor } from './helpers'

async function forceTheme(page: Page, mode: 'light' | 'dark' = 'light', variant: 'fluent' | 'ink' | 'one' | 'term' = 'fluent') {
  await page.waitForFunction(() => Boolean((window as unknown as { __qdsGallery?: unknown }).__qdsGallery))
  await page.evaluate(({ mode, variant }) => {
    const ds = (window as unknown as { __qdsGallery: { setMode: (mode: 'light' | 'dark') => void; setVariant: (variant: 'fluent' | 'ink' | 'one' | 'term') => void } }).__qdsGallery
    ds.setMode(mode)
    ds.setVariant(variant)
  }, { mode, variant })
  await expect(page.locator('body')).toHaveClass(new RegExp(`qds-variant-${variant}`))
  await expect(page.locator('body')).toHaveClass(new RegExp(mode === 'dark' ? 'qds-theme-dark' : 'qds-theme-light'))
}

async function resolvedBackground(page: Page, value: string) {
  return page.locator('body').evaluate((body, background) => {
    const probe = document.createElement('span')
    probe.style.background = background
    body.append(probe)
    const resolved = getComputedStyle(probe).backgroundColor
    probe.remove()
    return resolved
  }, value)
}

async function resolvedLength(page: Page, value: string) {
  return page.locator('body').evaluate((body, width) => {
    const probe = document.createElement('span')
    probe.style.width = width
    probe.style.position = 'absolute'
    body.append(probe)
    const resolved = parseFloat(getComputedStyle(probe).width)
    probe.remove()
    return resolved
  }, value)
}

test.describe('QDS optional QWindow extension', () => {
  test('mounts centered, token-sized QWindow chrome with a neutral close action at rest', async ({ page }) => {
    await page.goto('/#window')
    await forceTheme(page)

    await expectGalleryPage(page, 'Window')

    const windowShell = page.locator('.qds-window').filter({ hasText: 'QDS window shell' })
    await expect(windowShell).toBeVisible()
    await expect(windowShell).toHaveClass(/qds-window/)
    await expect(windowShell).toHaveClass(/qds-window--embedded/)

    await expect(windowShell.locator('.qds-window__titlebar')).toBeVisible()
    await expect(windowShell.locator('.qds-window__title')).toContainText('QDS window shell')
    await expect(windowShell.locator('.qds-window__actions')).toBeVisible()
    await expect(windowShell.locator('.qds-window__action--close')).toBeVisible()

    const styles = await windowShell.evaluate((el) => {
      const shell = getComputedStyle(el as Element)
      const windowElement = el as HTMLElement
      const titlebar = getComputedStyle(windowElement.querySelector('.qds-window__titlebar') as Element)
      const title = getComputedStyle(windowElement.querySelector('.qds-window__title') as Element)
      const actionElement = windowElement.querySelector('.qds-window__action') as HTMLElement
      const actionContent = actionElement.querySelector('.q-btn__content') as HTMLElement
      const action = getComputedStyle(actionElement)
      const actionContentStyles = getComputedStyle(actionContent)
      const titlebarElement = windowElement.querySelector('.qds-window__titlebar') as HTMLElement
      const titlebarRect = titlebarElement.getBoundingClientRect()
      const actionRect = actionElement.getBoundingClientRect()
      const actionContentRect = actionContent.getBoundingClientRect()
      const chrome = getComputedStyle(windowElement.querySelector('.qds-window__chrome') as Element)
      const actionSvg = actionElement.querySelector('svg')
      const actionSvgRect = actionSvg?.getBoundingClientRect()
      titlebarElement.style.height = '3rem'
      const consumerTitlebarHeight = getComputedStyle(titlebarElement).height
      titlebarElement.style.height = ''
      windowElement.classList.add('qds-window--disabled')
      const disabledOpacity = getComputedStyle(windowElement).opacity
      windowElement.classList.remove('qds-window--disabled')
      return {
        background: shell.backgroundColor,
        borderRadius: shell.borderRadius,
        titlebarBackground: titlebar.backgroundColor,
        titlebarMinHeight: titlebar.minHeight,
        titlebarHeight: titlebarRect.height,
        actionHeight: actionRect.height,
        actionWidth: actionRect.width,
        actionCenterOffset: Math.abs((actionRect.top + actionRect.height / 2) - (titlebarRect.top + titlebarRect.height / 2)),
        actionContentCenterOffset: Math.abs((actionContentRect.top + actionContentRect.height / 2) - (actionRect.top + actionRect.height / 2)),
        chromePaddingLeft: chrome.paddingLeft,
        chromePaddingRight: chrome.paddingRight,
        consumerTitlebarHeight,
        titleFontSize: title.fontSize,
        titleFontWeight: title.fontWeight,
        actionFontSize: actionContentStyles.fontSize,
        actionHasSvg: Boolean(actionSvg),
        actionSvgWidth: actionSvgRect?.width ?? 0,
        actionSvgHeight: actionSvgRect?.height ?? 0,
        actionTextContent: actionElement.textContent?.trim() ?? '',
        actionMinWidth: action.minWidth,
        actionMinHeight: action.minHeight,
        actionBackground: action.backgroundColor,
        actionColor: action.color,
        compactActionSize: getComputedStyle(document.body).getPropertyValue('--qds-compact-action-size').trim(),
        compactActionIconSize: getComputedStyle(document.body).getPropertyValue('--qds-compact-action-icon-size').trim(),
        disabledOpacity,
      }
    })

    const compactActionSize = await resolvedLength(page, 'var(--qds-compact-action-size)')
    const compactActionIconSize = await resolvedLength(page, 'var(--qds-compact-action-icon-size)')
    const neutralBackground = await resolvedBackground(page, 'transparent')
    const neutralColor = await resolvedColor(page, '--qds-text-muted')

    expect.soft(styles.background, 'QDS QWindow shell receives tokenized surface').not.toBe('rgba(0, 0, 0, 0)')
    expect.soft(parseFloat(styles.borderRadius), 'QDS QWindow shell receives tokenized radius').toBeGreaterThan(0)
    expect.soft(styles.titlebarBackground, 'QDS QWindow titlebar receives tokenized toolbar surface').not.toBe('rgba(0, 0, 0, 0)')
    expect.soft(parseFloat(styles.titlebarMinHeight), 'QDS QWindow titlebar has rendered geometry').toBeGreaterThan(0)
    expect.soft(styles.titlebarHeight, 'QDS titlebar provides symmetric vertical breathing room around compact actions').toBeGreaterThan(styles.actionHeight)
    expect.soft(styles.actionWidth, 'QDS QWindow actions consume the compact action-size token').toBe(compactActionSize)
    expect.soft(styles.actionHeight, 'QDS QWindow actions consume the compact action-size token').toBe(compactActionSize)
    expect.soft(styles.actionCenterOffset, 'QDS QWindow actions are vertically centered in the titlebar').toBeLessThanOrEqual(0.5)
    expect.soft(styles.actionContentCenterOffset, 'QDS QWindow action glyphs are centered in their hit target').toBeLessThanOrEqual(0.5)
    expect.soft(styles.chromePaddingLeft, 'QDS QWindow chrome uses symmetric horizontal titlebar gaps').toBe(styles.chromePaddingRight)
    expect.soft(styles.consumerTitlebarHeight, 'QDS QWindow preserves consumer titlebarStyle geometry').toBe('48px')
    // Display aliases body by default, so a distinct probe stack proves the title reads the display token.
    const probedTitleFamily = await windowShell.locator('.qds-window__title').evaluate((title) => {
      document.body.style.setProperty('--qds-font-family-display', "'QDS Display Probe', serif")
      const family = getComputedStyle(title).fontFamily
      document.body.style.removeProperty('--qds-font-family-display')
      return family
    })
    expect.soft(probedTitleFamily, 'QDS QWindow title uses the display font token').toBe('"QDS Display Probe", serif')
    expect.soft(styles.titleFontSize, 'QDS QWindow title uses compact control typography').toBe('14px')
    expect.soft(styles.titleFontWeight, 'QDS QWindow title keeps semibold emphasis').toBe('600')
    expect.soft(parseFloat(styles.actionFontSize), 'QDS QWindow action glyphs use the compact icon-size token').toBe(compactActionIconSize)
    expect.soft(styles.actionHasSvg, 'QDS QWindow close action renders a Phosphor SVG icon').toBe(true)
    expect.soft(styles.actionTextContent, 'QDS QWindow close action does not render a Unicode text glyph').toBe('')
    expect.soft(styles.actionSvgWidth, 'QDS QWindow close SVG icon has rendered geometry').toBeGreaterThan(0)
    expect.soft(styles.actionSvgHeight, 'QDS QWindow close SVG icon has rendered geometry').toBeGreaterThan(0)
    expect.soft(parseFloat(styles.actionMinWidth), 'QDS QWindow actions use the compact action-size token').toBe(compactActionSize)
    expect.soft(parseFloat(styles.actionMinHeight), 'QDS QWindow actions use the compact action-size token').toBe(compactActionSize)
    expect.soft(styles.actionBackground, 'QDS QWindow close action remains neutral at rest').toBe(neutralBackground)
    expect.soft(styles.actionColor, 'QDS QWindow close action remains neutral at rest').toBe(neutralColor)
    expect.soft(styles.disabledOpacity, 'QDS QWindow disabled state uses the public opacity token').toBe('0.5')

    const activeStyles = await windowShell.evaluate((el) => {
      const shell = el as HTMLElement
      const closeAction = shell.querySelector('.qds-window__action--close') as HTMLElement
      shell.classList.add('qds-window--active', 'qds-window--floating')
      const shellStyles = getComputedStyle(shell)
      const closeStyles = getComputedStyle(closeAction)
      const shellBoxShadow = shellStyles.boxShadow
      const closeBackground = closeStyles.backgroundColor
      const closeColor = closeStyles.color
      shell.classList.remove('qds-window--active', 'qds-window--floating')
      return { shellBoxShadow, closeBackground, closeColor }
    })
    expect.soft(activeStyles.shellBoxShadow, 'Active floating QWindow emphasis uses shell elevation, not destructive color').not.toBe('none')
    expect.soft(activeStyles.closeBackground, 'Active floating QWindow keeps close neutral at rest').toBe(neutralBackground)
    expect.soft(activeStyles.closeColor, 'Active floating QWindow keeps close neutral at rest').toBe(neutralColor)

  })

  test('Ink windows keep the focus-block surface and One windows sit on the transient surface', async ({ page }) => {
    await page.goto('/#window')
    const windowShell = page.locator('.qds-window').filter({ hasText: 'QDS window shell' })
    for (const mode of ['light', 'dark'] as const) {
      for (const [variant, token] of [['ink', '--qds-surface-focus-block'], ['one', '--qds-surface-transient']] as const) {
        await forceTheme(page, mode, variant)
        expect.soft(await windowShell.evaluate((el) => getComputedStyle(el).backgroundColor), `${mode}/${variant} window background`).toBe(await resolvedColor(page, token))
      }
      await forceTheme(page, mode, 'ink')
      expect.soft(await windowShell.locator('.qds-window__titlebar').evaluate((el) => getComputedStyle(el).backgroundColor), `${mode}/ink window titlebar background`).toBe(await resolvedColor(page, '--qds-surface-focus-block'))
    }
  })

  test('close hover and focus use restrained destructive feedback in Fluent light/dark and Term', async ({ page }) => {
    await page.goto('/#window')
    await page.emulateMedia({ reducedMotion: 'reduce' })

    const windowShell = page.locator('.qds-window').filter({ hasText: 'QDS window shell' })
    const closeAction = windowShell.locator('.qds-window__action--close')
    await expect(closeAction).toHaveClass(/(?:^|\s)q-btn(?:\s|$)/)

    for (const [mode, variant] of [['light', 'fluent'], ['dark', 'fluent'], ['dark', 'term']] as const) {
      await forceTheme(page, mode, variant)
      await closeAction.hover()

      const hoverStyles = await closeAction.evaluate((el) => {
        const styles = getComputedStyle(el)
        return { hovered: el.matches(':hover'), color: styles.color, background: styles.backgroundColor }
      })
      const negativeSoft = await page.locator('body').evaluate((body) => {
        return getComputedStyle(body).getPropertyValue('--qds-surface-negative-soft').trim()
      })
      const negative = await resolvedColor(page, '--qds-color-negative')
      const negativeSoftBackground = await resolvedBackground(page, negativeSoft)
      await expect.poll(async () => closeAction.evaluate((el) => getComputedStyle(el).color)).toBe(negative)
      await expect.poll(async () => closeAction.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(negativeSoftBackground)
      expect.soft(hoverStyles.hovered, `${variant} close action receives hover state`).toBe(true)
      expect.soft(negativeSoftBackground, `${variant} close action is not a negative tile on hover`).not.toBe(negative)

      await page.mouse.move(0, 0)
      await closeAction.focus()
      await page.keyboard.press('Tab')
      await page.keyboard.press('Shift+Tab')
      await expect(closeAction).toBeFocused()
      await expect.poll(async () => closeAction.evaluate((el) => getComputedStyle(el).color)).toBe(negative)
      await expect.poll(async () => closeAction.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(negativeSoftBackground)
      await expect.poll(async () => closeAction.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('solid')
      const focusStyles = await closeAction.evaluate((el) => {
        const styles = getComputedStyle(el)
        return { focused: document.activeElement === el, color: styles.color, background: styles.backgroundColor, outlineStyle: styles.outlineStyle }
      })
      expect.soft(focusStyles.focused, `${variant} close action accepts keyboard focus`).toBe(true)
      expect.soft(focusStyles.color, `${variant} close action retains destructive foreground on focus`).toBe(negative)
      expect.soft(focusStyles.background, `${variant} close action retains negative soft surface on focus`).toBe(negativeSoftBackground)
      expect.soft(focusStyles.outlineStyle, `${variant} close action keeps a visible focus outline`).toBe('solid')
    }
  })
})
