import { expect, test, type Locator, type Page } from '@playwright/test'
import { SHADCN_PALETTES, applyShadcn } from './helpers'
import { paint, settle } from './shadcn-browser'

type NativeFixture = {
  fullscreenAccepted: boolean | null
  fullscreenError: string
  fullscreenState: boolean
  floatingWindow: { getPosition: () => unknown } | null
}
async function windowEvidence(page: Page) {
  return page.evaluate(() => {
    const fixture = (window as unknown as { __qdsNativeTest: NativeFixture }).__qdsNativeTest
    const element = document.querySelector('.q-window[aria-label="Floating native window"]')
    const rect = element?.getBoundingClientRect()
    return {
      accepted: fixture.fullscreenAccepted, error: fixture.fullscreenError,
      nativeState: fixture.fullscreenState,
      actual: element !== null && document.fullscreenElement === element,
      nativeClass: element?.classList.contains('q-window__fullscreen') ?? false,
      rect: rect && { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      viewport: { width: innerWidth, height: innerHeight },
      position: fixture.floatingWindow?.getPosition(),
    }
  })
}

test('T177/T180 genuine floating fullscreen and embedded rejection', async ({ page }, info) => {
  const errors: string[] = [], requests: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('requestfailed', request => requests.push(request.url()))
  await page.goto('/conformance.html')
  const activate = async (locator: Locator) => info.project.use.hasTouch ? locator.tap() : locator.click()
  await activate(page.locator('[data-native="window-reject-fullscreen"]'))
  await expect(page.locator('[data-native="window-request-result"]')).toHaveText('Request rejected')
  expect(await page.evaluate(() => document.fullscreenElement)).toBeNull()
  await expect(page.locator('.q-window')).not.toHaveClass(/q-window__fullscreen/)
  await activate(page.locator('[data-native="window-open-floating"]'))
  const floating = page.locator('.q-window[aria-label="Floating native window"]')
  await expect(floating).toBeVisible()
  const before = await windowEvidence(page)
  expect(before.rect!.width).toBeGreaterThanOrEqual(320)
  expect(before.rect!.x + before.rect!.width).toBeLessThanOrEqual(before.viewport.width)
  await activate(floating.locator('[data-native="window-enter-fullscreen"]'))
  await expect.poll(async () => {
    const evidence = await windowEvidence(page)
    return evidence.error || (evidence.actual && evidence.nativeState && evidence.nativeClass ? 'fulfilled' : 'waiting')
  }, { message: 'native AppFullscreen request must fulfill, not merely accept the requested prop' }).toBe('fulfilled')
  const active = await windowEvidence(page)
  expect(active.accepted).toBe(true)
  expect(active.rect!.x).toBeCloseTo(0, 0)
  expect(active.rect!.y).toBeCloseTo(0, 0)
  expect(active.rect!.width).toBeCloseTo(active.viewport.width, 0)
  expect(active.rect!.height).toBeCloseTo(active.viewport.height, 0)
  await info.attach('authentic-native-window-fullscreen-viewport', { body: await page.screenshot({ fullPage: false, animations: 'allow' }), contentType: 'image/png' })
  await activate(floating.locator('[data-native="window-exit-fullscreen"]'))
  await expect.poll(async () => (await windowEvidence(page)).nativeState).toBe(false)
  expect(await page.evaluate(() => document.fullscreenElement)).toBeNull()
  await expect(floating).not.toHaveClass(/q-window__fullscreen/)
  const restored = await windowEvidence(page)
  expect(restored.rect).toEqual(before.rect)
  await floating.locator('[data-native="window-enter-fullscreen"]').focus()
  await expect(floating.locator('[data-native="window-enter-fullscreen"]')).toBeFocused()
  await info.attach('authentic-native-window-restored-viewport', { body: await page.screenshot({ fullPage: false, animations: 'allow' }), contentType: 'image/png' })
  await activate(floating.locator('[data-native="window-close-floating"]'))
  await expect(floating).toHaveCount(0)
  await info.attach('native-fullscreen-service-evidence', { body: JSON.stringify({ before, active, restored }), contentType: 'application/json' })
  expect(errors).toEqual([])
  expect(requests).toEqual([])
})

test('T177/T180 authentic refresh gesture, deep tree and responsive state bounds', async ({ page }, info) => {
  test.setTimeout(120_000)
  const errors: string[] = [], requests: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('requestfailed', request => requests.push(request.url()))
  await page.goto('/conformance.html')
  for (const mode of ['light', 'dark'] as const) {
    const scheme = page.locator(`[data-scheme="${mode}"]`)
    // Every mounted family is brought into view, never accepted just because
    // an offscreen DOM node exists. Native controls retain their native sizes.
    for (const control of await scheme.locator('[data-native]').all()) {
      await control.scrollIntoViewIfNeeded()
      await expect(control).toBeVisible()
      const bounds = await control.evaluate(element => {
        const owner = element.closest('.q-field') ?? element
        const rect = owner.getBoundingClientRect()
        const host = owner.closest('[data-scheme]')!.getBoundingClientRect()
        return { left: rect.left, right: rect.right, width: rect.width, hostLeft: host.left, hostRight: host.right }
      })
      expect(bounds.width).toBeGreaterThan(0)
      expect(bounds.left).toBeGreaterThanOrEqual(bounds.hostLeft)
      expect(bounds.right).toBeLessThanOrEqual(bounds.hostRight)
    }
    const tree = scheme.locator('[data-native="tree"]')
    await tree.scrollIntoViewIfNeeded()
    const root = tree.getByRole('treeitem', { name: 'Root', exact: true })
    const branch = tree.getByRole('treeitem', { name: 'Branch', exact: true })
    const leaf = tree.getByRole('treeitem', { name: 'Checked leaf', exact: true })
    const disabled = tree.getByRole('treeitem', { name: 'Disabled leaf', exact: true })
    await expect(root).toHaveAttribute('aria-checked', 'mixed')
    await expect(branch).toHaveAttribute('aria-checked', 'mixed')
    expect(await leaf.evaluate(element => {
      let depth = 1
      for (let parent = element.parentElement; parent && parent.getAttribute('role') !== 'tree'; parent = parent.parentElement) if (parent.getAttribute('role') === 'group') depth++
      return depth
    }), 'native nested groups expose three semantic levels').toBe(3)
    await expect(leaf).toHaveAttribute('aria-checked', 'true')
    await expect(disabled).toHaveAttribute('aria-disabled', 'true')
    await page.keyboard.press('Tab')
    await root.focus()
    await expect(root).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(branch).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(leaf).toBeFocused()
    await page.keyboard.press('Space')
    await expect(root).toHaveAttribute('aria-checked', 'false')
    await page.keyboard.press('Space')
    await expect(root).toHaveAttribute('aria-checked', 'mixed')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    await expect(disabled).toBeFocused()
    const disabledChecked = await disabled.getAttribute('aria-checked')
    await page.keyboard.press('Space')
    expect(await disabled.getAttribute('aria-checked')).toBe(disabledChecked)
    await expect(root).toHaveAttribute('aria-checked', 'mixed')
    await leaf.focus()
    await info.attach(`authentic-${mode}-deep-mixed-tree-viewport`, { body: await page.screenshot({ fullPage: false, animations: 'allow' }), contentType: 'image/png' })
    const stepper = scheme.locator('[data-native="stepper"]')
    await stepper.scrollIntoViewIfNeeded()
    const header = stepper.locator('.q-stepper__header')
    if (info.project.name === 'mobile') await expect(header).toHaveClass(/q-stepper__header--contracted/)
    else await expect(header).not.toHaveClass(/q-stepper__header--contracted/)
    await expect(stepper.locator('.q-stepper__tab--error')).toBeVisible()
    await expect(stepper.locator('.q-stepper__tab--disabled')).toBeVisible()
    const headerBounds = await header.evaluate(element => {
      const host = element.getBoundingClientRect()
      return [...element.querySelectorAll('.q-stepper__tab')].map(tab => {
        const rect = tab.getBoundingClientRect()
        return { left: rect.left, right: rect.right, hostLeft: host.left, hostRight: host.right, width: rect.width }
      })
    })
    for (const tab of headerBounds) {
      expect(tab.width).toBeGreaterThan(0)
      expect(tab.left).toBeGreaterThanOrEqual(tab.hostLeft)
      expect(tab.right).toBeLessThanOrEqual(tab.hostRight)
    }
    await info.attach(`authentic-${mode}-responsive-header-viewport`, { body: await page.screenshot({ fullPage: false, animations: 'allow' }), contentType: 'image/png' })
    const vertical = scheme.locator('[data-native="stepper-error"]')
    await vertical.scrollIntoViewIfNeeded()
    const caption = vertical.locator('.q-stepper__tab--error .q-stepper__caption')
    await expect(caption).toHaveText('Resolve validation before continuing')
    await expect(caption).toBeVisible()
    expect(await caption.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
    await info.attach(`authentic-${mode}-error-disabled-stepper-viewport`, { body: await page.screenshot({ fullPage: false, animations: 'allow' }), contentType: 'image/png' })
  }
  const scroller = page.locator('[data-native="refresh-scroll"]')
  await scroller.scrollIntoViewIfNeeded()
  expect(await scroller.evaluate(element => element.scrollTop)).toBe(0)
  await settle(page)
  const rect = (await scroller.boundingBox())!
  const x = rect.x + rect.width / 2, y = rect.y + 12
  if (info.project.use.hasTouch) {
    expect(await page.evaluate(() => navigator.maxTouchPoints)).toBeGreaterThan(0)
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    for (let delta = 10; delta <= 120; delta += 10) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + delta }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await cdp.detach()
  } else {
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x, y + 120, { steps: 12 })
    await page.mouse.up()
  }
  await expect(page.locator('[data-native="refresh-status"]')).toHaveText('Refresh pending')
  const puller = page.locator('[data-native="state-pull"] .q-pull-to-refresh__puller')
  await expect(puller).toHaveCSS('opacity', '1')
  await expect(puller.locator('.q-spinner')).toBeVisible()
  const pullBounds = (await puller.boundingBox())!
  expect(pullBounds.y).toBeGreaterThanOrEqual(rect.y)
  expect(pullBounds.y + pullBounds.height).toBeLessThanOrEqual(rect.y + rect.height)
  await info.attach('authentic-native-refresh-pending-viewport', { body: await page.screenshot({ fullPage: false, animations: 'allow' }), contentType: 'image/png' })
  await page.locator('[data-native="refresh-complete"]').click()
  await expect(page.locator('[data-native="refresh-status"]')).toHaveText('Refresh idle')
  await expect(puller).toHaveCSS('opacity', '0')
  await expect(puller.locator('.q-spinner')).toHaveCount(0)
  expect(errors).toEqual([])
  expect(requests).toEqual([])
})

async function matGeometry(circle: Locator) {
  return circle.evaluate(element => {
    const style = getComputedStyle(element)
    const box = element.getBoundingClientRect()
    const animations = element.closest('svg')!.getAnimations({ subtree: true }).map(animation => ({ name: animation instanceof CSSAnimation ? animation.animationName : animation.id, time: typeof animation.currentTime === 'number' ? animation.currentTime : null, state: animation.playState }))
    return { dash: style.strokeDasharray, offset: style.strokeDashoffset, width: box.width, height: box.height, length: (element as SVGGeometryElement).getTotalLength(), animations }
  })
}

test('T180 filled secondary roles and landscape clock retain native bounds', async ({ page }, info) => {
  test.setTimeout(120_000)
  await page.goto('/conformance.html?oracle=button')
  for (const palette of SHADCN_PALETTES) for (const mode of ['light', 'dark'] as const) {
    await applyShadcn(page, mode, palette)
    for (const role of ['secondary', 'accent']) {
      const button = page.locator(`[data-native="roles"] [data-role="${role}"]`)
      await expect(button).toHaveCSS('border-top-color', 'rgba(0, 0, 0, 0)')
      expect((await paint(button)).textContrast, `${palette}/${mode}/${role} solid pairing`).toBeGreaterThanOrEqual(4.5)
    }
    const outline = page.locator('[data-oracle="button"]').getByRole('button', { name: 'Outline', exact: true })
    expect((await paint(outline)).borderContrast).toBeGreaterThanOrEqual(3)
  }
  await info.attach('filled-secondary-normal-motion', { body: await page.locator('[data-oracle="button"]').screenshot({ animations: 'allow' }), contentType: 'image/png' })
  await page.goto('/#catalog')
  const clocks = []
  for (const palette of SHADCN_PALETTES) for (const mode of ['light', 'dark'] as const) {
    await applyShadcn(page, mode, palette)
    const picker = page.locator('[data-test="qds-catalog-time"]')
    await picker.scrollIntoViewIfNeeded()
    await expect(picker).toBeVisible()
    await settle(page)
    const bounds = await picker.evaluate(element => {
      const host = element.closest('.catalog-demo')!.getBoundingClientRect()
      const widget = element.getBoundingClientRect()
      const clock = element.querySelector('.q-time__clock')!.getBoundingClientRect()
      return { host: { left: host.left, right: host.right }, widget: { left: widget.left, right: widget.right }, clock: { left: clock.left, right: clock.right, width: clock.width }, landscape: element.classList.contains('q-time--landscape') }
    })
    expect(bounds.landscape).toBe(info.project.name === 'desktop')
    expect(bounds.widget.left).toBeGreaterThanOrEqual(bounds.host.left)
    expect(bounds.widget.right).toBeLessThanOrEqual(bounds.host.right)
    expect(bounds.clock.left).toBeGreaterThanOrEqual(bounds.widget.left)
    expect(bounds.clock.right).toBeLessThanOrEqual(bounds.widget.right)
    // Native landscape minimum is 420px: its header/content split leaves a
    // 230px clock. Portrait's 290px widget leaves the larger clock unchanged.
    expect(bounds.clock.width, 'native clock geometry is not shrunk to fit').toBeGreaterThanOrEqual(bounds.landscape ? 230 : 250)
    clocks.push({ palette, mode, ...bounds })
  }
  await info.attach('native-clock-bounds-five-palettes-both-modes', { body: JSON.stringify(clocks), contentType: 'application/json' })
  await info.attach('native-picker-normal-motion', { body: await page.locator('[data-test="qds-catalog-time"]').screenshot({ animations: 'allow' }), contentType: 'image/png' })
})

for (const mode of ['light', 'dark'] as const) {
  test(`T180 native material circle has visible normal and reduced geometry ${mode}`, async ({ page }, info) => {
    test.setTimeout(120_000)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(false)
    await page.goto('/conformance.html')
    await applyShadcn(page, mode, 'neutral')
    const fixtures = ['t180-spinner-button', 't180-spinner-field', 't180-spinner-inner']
    const normal = []
    for (const fixture of fixtures) {
      const circle = page.locator(`[data-test="${fixture}"] .q-spinner-mat > .path`)
      // Chromium can throttle SVG dash updates below the viewport; this gate
      // observes the actual visible control, not an offscreen computed frame.
      await page.locator(`[data-test="${fixture}"]`).scrollIntoViewIfNeeded()
      await expect(circle).toBeVisible()
      await expect.poll(async () => parseFloat((await matGeometry(circle)).dash), { message: `${fixture} normal material arc advances visibly` }).toBeGreaterThan(20)
      const before = await matGeometry(circle)
      expect(before.animations.some(animation => animation.name.includes('mat-dash') && animation.state === 'running' && animation.time !== null)).toBe(true)
      await expect.poll(async () => {
        const current = await matGeometry(circle)
        return (current.dash !== before.dash || current.offset !== before.offset) && current.animations.some(animation => {
          const previous = before.animations.find(candidate => candidate.name === animation.name)
          return previous?.time !== null && previous?.time !== undefined && animation.time !== null && animation.time > previous.time
        })
      }, { message: `${fixture} actual native animation time and dash/offset advance` }).toBe(true)
      expect((await paint(circle)).textContrast, `${fixture} normal meaningful stroke contrast`).toBeGreaterThanOrEqual(3)
      normal.push({ fixture, before, after: await matGeometry(circle) })
      // Choose a reproducible native-animation phase only after proving live
      // advancement. Never inject SVG CSS or disable all screenshot animations.
      await circle.evaluate(element => {
        for (const animation of element.closest('svg')!.getAnimations({ subtree: true })) { animation.pause(); animation.currentTime = 750 }
      })
      try {
        await info.attach(`${fixture}-${mode}-normal-midarc`, { body: await page.locator(`[data-test="${fixture}"]`).screenshot({ animations: 'allow' }), contentType: 'image/png' })
      } finally {
        await circle.evaluate(element => { for (const animation of element.closest('svg')!.getAnimations({ subtree: true })) animation.play() })
      }
    }
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const reduced = []
    for (const fixture of fixtures) {
      const svg = page.locator(`[data-test="${fixture}"] .q-spinner-mat`)
      const circle = svg.locator(':scope > .path')
      await page.locator(`[data-test="${fixture}"]`).scrollIntoViewIfNeeded()
      await expect(circle).toHaveCSS('stroke-dasharray', '89px, 200px')
      await expect(circle).toHaveCSS('stroke-dashoffset', '0px')
      const geometry = await matGeometry(circle)
      expect(geometry.width).toBeGreaterThan(0)
      expect(geometry.height).toBeGreaterThan(0)
      expect(89 / geometry.length, 'static material arc is substantial, not the native 1px initial dash').toBeGreaterThan(0.5)
      expect((await paint(circle)).textContrast, `${fixture} meaningful stroke contrast`).toBeGreaterThanOrEqual(3)
      reduced.push({ fixture, ...geometry })
      await info.attach(`${fixture}-${mode}-static`, { body: await page.locator(`[data-test="${fixture}"]`).screenshot({ animations: 'allow' }), contentType: 'image/png' })
    }
    await page.goto('/#plugins')
    await applyShadcn(page, mode, 'neutral')
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.getByRole('button', { name: 'Show grouped Loading precedence', exact: true }).click()
    const globalCircle = page.locator('.q-loading__spinner.q-spinner-mat > .path')
    try {
      await expect(globalCircle).toBeVisible()
      await expect.poll(async () => parseFloat((await matGeometry(globalCircle)).dash)).toBeGreaterThan(20)
      const globalBefore = await matGeometry(globalCircle)
      await expect.poll(async () => {
        const current = await matGeometry(globalCircle)
        return (current.dash !== globalBefore.dash || current.offset !== globalBefore.offset) && current.animations.some(animation => {
          const previous = globalBefore.animations.find(candidate => candidate.name === animation.name)
          return previous?.time !== null && previous?.time !== undefined && animation.time !== null && animation.time > previous.time
        })
      }).toBe(true)
      expect((await paint(globalCircle)).textContrast, 'global normal material stroke contrast').toBeGreaterThanOrEqual(3)
      normal.push({ fixture: 'global-loading', before: globalBefore, after: await matGeometry(globalCircle) })
      await info.attach(`global-loading-${mode}-normal`, { body: await page.locator('.q-loading__box').screenshot({ animations: 'allow' }), contentType: 'image/png' })
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await expect(globalCircle).toHaveCSS('stroke-dasharray', '89px, 200px')
      await expect(globalCircle).toHaveCSS('stroke-dashoffset', '0px')
      expect((await paint(globalCircle)).textContrast, 'global material stroke contrast').toBeGreaterThanOrEqual(3)
      reduced.push({ fixture: 'global-loading', ...await matGeometry(globalCircle) })
      await info.attach(`global-loading-${mode}-static`, { body: await page.locator('.q-loading__box').screenshot({ animations: 'allow' }), contentType: 'image/png' })
    } finally {
      await page.evaluate(() => (window as unknown as { __qdsPluginsTest: { cleanup: () => void } }).__qdsPluginsTest.cleanup())
    }
    await info.attach(`material-geometry-${mode}`, { body: JSON.stringify({ normal, reduced }), contentType: 'application/json' })
  })
}

test('T180 Notify progress is visible normally and intentionally hidden when reduced', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/#plugins')
  await applyShadcn(page, 'light', 'neutral')
  await page.locator('[data-test="qds-notify-progress-trigger"]').click()
  const notification = page.locator('.qds-notify-progress')
  const rail = notification.locator('.q-notification__progress')
  try {
    await expect(rail).toBeVisible()
    await expect.poll(() => rail.evaluate(element => element.getAnimations().some(animation => animation.playState === 'running' && typeof animation.currentTime === 'number' && animation.currentTime > 0))).toBe(true)
    await info.attach('notify-normal-live-progress', { body: await notification.screenshot({ animations: 'allow' }), contentType: 'image/png' })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(rail).toHaveCount(1)
    await expect(rail).toHaveCSS('display', 'none')
    await expect(notification).toBeVisible()
    await info.attach('notify-reduced-intentionally-hidden-progress', { body: await notification.screenshot({ animations: 'allow' }), contentType: 'image/png' })
  } finally {
    await page.evaluate(() => (window as unknown as { __qdsPluginsTest: { cleanup: () => void } }).__qdsPluginsTest.cleanup())
  }
})

test('T180 native oracle title/sidebar and popup wrapper use native grammar', async ({ page }, info) => {
  await page.goto('/conformance.html?oracle=dialog')
  await applyShadcn(page, 'light', 'neutral')
  await page.locator('[data-oracle="dialog"]').getByRole('button', { name: 'Edit profile', exact: true }).click()
  const dialog = page.locator('[data-oracle-popup="dialog"]')
  const title = dialog.getByRole('heading', { name: 'Edit profile', exact: true })
  await expect(title).toHaveClass(/q-dialog__title/)
  expect(await title.evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeLessThanOrEqual(18)
  await expect(dialog.getByRole('button', { name: 'Close profile', exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Close profile', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await page.goto('/conformance.html?oracle=sidebar')
  await applyShadcn(page, 'light', 'neutral')
  const sidebar = page.locator('[data-oracle="sidebar"] .q-drawer')
  await expect(sidebar).toBeVisible()
  await expect(sidebar.locator('.q-item__section--avatar svg')).toHaveCount(3)
  await expect(sidebar).toContainText('Acme workspace')
  await expect(sidebar).toContainText('Alex Morgan')
  await expect(sidebar).toContainText('12')
  expect((await sidebar.boundingBox())!.width).toBe(256)
  await info.attach('native-sidebar-normal-motion', { body: await sidebar.screenshot({ animations: 'allow' }), contentType: 'image/png' })
  await page.getByRole('button', { name: 'Edit value', exact: true }).click()
  const wrapper = page.locator('[data-native="popup-proxy-content"]')
  await expect(wrapper).toHaveClass(/q-card--flat/)
  if (info.project.name === 'desktop') {
    await expect(wrapper).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    await expect(wrapper).toHaveCSS('border-top-width', '0px')
    await expect(wrapper).toHaveCSS('box-shadow', 'none')
  } else {
    expect((await paint(wrapper)).background).toEqual([255, 255, 255])
    expect(await wrapper.evaluate(element => parseFloat(getComputedStyle(element).borderTopWidth))).toBeGreaterThan(0)
  }
  await page.getByRole('button', { name: 'Close popup', exact: true }).click()
  await expect(wrapper).toHaveCount(0)
})

async function selectionPaint(content: Locator) {
  return content.evaluate(element => {
    const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d')!
    canvas.width = canvas.height = 1
    const rgba = (color: string) => {
      ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1)
      return [...ctx.getImageData(0, 0, 1, 1).data]
    }
    const s = getComputedStyle(element), selection = window.getSelection()!
    const samples = [element, ...element.querySelectorAll('p, a, strong')].map(node => {
      const selected = getComputedStyle(node, '::selection')
      return { tag: node.tagName, foreground: rgba(selected.color), background: rgba(selected.backgroundColor) }
    })
    const foreground = rgba(s.getPropertyValue('--qds-text-on-primary'))
    const background = rgba(s.getPropertyValue('--qds-color-primary'))
    const luminance = (rgb: number[]) => rgb.slice(0, 3).reduce((sum, channel, i) => {
      const n = channel / 255
      return sum + (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4) * [0.2126, 0.7152, 0.0722][i]
    }, 0)
    const a = luminance(foreground), b = luminance(background)
    return { samples, foreground, background, contrast: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), text: selection.toString(), focused: document.activeElement === element, inside: !!selection.anchorNode && element.contains(selection.anchorNode) }
  })
}

  test('T178 fresh editor selection and link GUI viewport light and dark', async ({ page }, info) => {
    test.setTimeout(120_000)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto('/conformance.html')
    const content = page.locator('[data-native="rich"] [data-native="editor"]') // Native $attrs hook is on content, not frame.
    const editor = page.locator('[data-native="rich"] .q-editor')
    const evidence = []
    for (const mode of ['light', 'dark'] as const) for (const palette of SHADCN_PALETTES) {
      await applyShadcn(page, mode, palette)
      await content.scrollIntoViewIfNeeded()
      await content.focus()
      await page.keyboard.press('ControlOrMeta+A')
      const selected = await selectionPaint(content)
      expect(selected.focused && selected.inside).toBe(true)
      expect(selected.text).toBe('Native link and bold text')
      expect(selected.contrast).toBeGreaterThanOrEqual(4.5)
      for (const sample of selected.samples) {
        expect(sample.foreground).toEqual(selected.foreground)
        expect(sample.background).toEqual(selected.background)
      }
      // Capture native selected text while the editor still owns focus; no injected CSS or hidden caret flags.
       await info.attach(`editor-selected-${palette}-${mode}`, { body: await editor.screenshot({ animations: 'allow' }), contentType: 'image/png' })
       if (palette === 'neutral') await info.attach(`editor-selected-${mode}-configured-viewport`, { body: await page.screenshot({ fullPage: false, animations: 'allow' }), contentType: 'image/png' })
      await content.locator('a').click()
      await editor.getByRole('button', { name: 'Hyperlink', exact: true }).click()
      const remove = editor.getByRole('button', { name: 'Remove', exact: true })
      const update = editor.getByRole('button', { name: 'Update', exact: true })
      await expect(remove).toBeVisible()
      await expect(update).toBeVisible()
      const bounds = await editor.evaluate(element => {
        const section = element.closest('section')!, box = element.getBoundingClientRect(), host = section.getBoundingClientRect()
        return { editor: { left: box.left, right: box.right, width: box.width }, section: { left: host.left, right: host.right }, visualWidth: visualViewport!.width, documentWidth: document.documentElement.scrollWidth, bodyOverflow: getComputedStyle(document.body).overflowX }
      })
      const configuredWidth = page.viewportSize()!.width
      expect(bounds.visualWidth).toBeCloseTo(configuredWidth, 0)
      expect(bounds.documentWidth).toBeLessThanOrEqual(configuredWidth + 1)
      expect(bounds.bodyOverflow).not.toBe('hidden')
      for (const part of [editor, remove, update]) {
        const box = (await part.boundingBox())!
        expect(box.x).toBeGreaterThanOrEqual(0)
        expect(box.x + box.width).toBeLessThanOrEqual(configuredWidth)
      }
      expect(bounds.editor.right).toBeLessThanOrEqual(bounds.section.right)
      await info.attach(`editor-link-gui-${palette}-${mode}`, { body: await editor.screenshot({ animations: 'allow' }), contentType: 'image/png' })
      evidence.push({ palette, mode, selected, bounds })
       await update.click()
       await expect(editor.locator('.q-editor__link-input')).toHaveCount(0)
       if (palette === 'neutral') {
         await content.locator('a').click()
         await editor.getByRole('button', { name: 'Hyperlink', exact: true }).click()
         await editor.getByRole('button', { name: 'Remove', exact: true }).click()
         await expect(content.locator('a')).toHaveCount(0)
         await content.focus()
         await page.keyboard.press('ControlOrMeta+Z')
         await expect(content.locator('a')).toHaveCount(1)
       }
    }
    await info.attach('editor-selection-and-configured-viewport', { body: JSON.stringify(evidence), contentType: 'application/json' })
  })

test('T178 selected tabs remain distinct without focus in normal and forced colors', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/conformance.html?oracle=tabs')
  const tabs = page.locator('[data-oracle="tabs"] .q-tabs')
  const evidence = []
  for (const mode of ['light', 'dark'] as const) {
    await applyShadcn(page, mode, 'neutral')
    for (const forcedColors of ['none', 'active'] as const) {
      await page.emulateMedia({ forcedColors })
      for (const label of ['Password', 'Account']) {
        const active = tabs.getByRole('tab', { name: label, exact: true })
        const inactive = tabs.getByRole('tab', { name: label === 'Account' ? 'Password' : 'Account', exact: true })
        await active.click()
        await active.evaluate(element => (element as HTMLElement).blur())
        await expect(active).toHaveAttribute('aria-selected', 'true')
        expect(await active.evaluate(element => element.matches(':focus-visible'))).toBe(false)
        await expect(active.locator('.q-tab__indicator')).toHaveCSS('display', 'none')
        if (forcedColors === 'active') {
          await expect(active).toHaveCSS('outline-width', '2px')
          await expect(active).toHaveCSS('outline-style', 'solid')
          await expect(active).toHaveCSS('outline-offset', '-2px')
          expect(await inactive.evaluate(element => getComputedStyle(element).outlineStyle)).toBe('none')
        } else {
          await settle(page)
          expect(await active.evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe(await inactive.evaluate(element => getComputedStyle(element).backgroundColor))
        }
        await info.attach(`tabs-${mode}-${forcedColors}-${label}-unfocused`, { body: await tabs.screenshot({ animations: 'allow' }), contentType: 'image/png' })
        if (forcedColors === 'active') {
          await page.keyboard.press('Tab')
          await active.focus()
         const rings = await active.evaluate(element => ({ selected: getComputedStyle(element).outlineColor, focus: getComputedStyle(element, '::after').outlineColor, visible: element.matches(':focus-visible') }))
          expect(rings.visible).toBe(true)
         expect(rings.selected).toBe(rings.focus) // Separate focus pseudo-ring already uses the system Highlight.
         await page.keyboard.press(label === 'Account' ? 'ArrowRight' : 'ArrowLeft')
         await expect(inactive).toBeFocused()
         await page.keyboard.press('Space')
         await expect(inactive).toHaveAttribute('aria-selected', 'true')
         await expect(active).toHaveAttribute('aria-selected', 'false')
         await inactive.evaluate(element => (element as HTMLElement).blur())
         await expect(inactive).toHaveCSS('outline-width', '2px')
         await expect(active).toHaveCSS('outline-style', 'none')
         await expect(page.locator('body')).toHaveAttribute('data-qds-resolved', mode)
         evidence.push({ mode, label, rings, selectedAfterKeyboard: await inactive.getAttribute('aria-selected'), rootMode: await page.locator('body').getAttribute('data-qds-resolved') })
         await tabs.scrollIntoViewIfNeeded()
         await info.attach(`tabs-${mode}-forced-keyboard-selected-from-${label}`, { body: await tabs.screenshot({ animations: 'allow' }), contentType: 'image/png' })
         await info.attach(`tabs-${mode}-forced-keyboard-from-${label}`, { body: await page.screenshot({ fullPage: false, animations: 'allow' }), contentType: 'image/png' })
        }
      }
   }
 }
 await info.attach('system-selected-tab-native-keyboard-evidence', { body: JSON.stringify(evidence), contentType: 'application/json' })
})

test('T178 authored parallax caption has a complete contrast-safe scrim', async ({ page }, info) => {
  test.setTimeout(120_000)
  await page.goto('/#catalog')
  const caption = page.locator('[data-test="qds-parallax-caption"]')
  const parallax = page.locator('.q-parallax').filter({ has: caption })
  const image = parallax.locator('img')
  await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  const evidence = []
  for (const palette of SHADCN_PALETTES) for (const mode of ['light', 'dark'] as const) {
    await applyShadcn(page, mode, palette)
    await caption.scrollIntoViewIfNeeded()
    const rendered = await paint(caption)
    expect(rendered.textContrast).toBeGreaterThanOrEqual(4.5)
    const coverage = await caption.evaluate(element => {
      const s = getComputedStyle(element), rect = element.getBoundingClientRect(), range = document.createRange()
      range.selectNodeContents(element)
      const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d')!
      canvas.width = canvas.height = 1; ctx.fillStyle = s.backgroundColor; ctx.fillRect(0, 0, 1, 1)
      const rgba = ctx.getImageData(0, 0, 1, 1).data, alpha = rgba[3] / 255
      const luminance = [...rgba].slice(0, 3).reduce((sum, channel, i) => {
        const n = (channel * alpha + 255 * (1 - alpha)) / 255
        return sum + (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4) * [0.2126, 0.7152, 0.0722][i]
      }, 0)
      return { background: s.backgroundColor, color: s.color, worstWhiteContrast: 1.05 / (luminance + 0.05), box: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }, text: [...range.getClientRects()].map(r => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom })) }
    })
    expect(coverage.color).toBe('rgb(255, 255, 255)')
    expect(coverage.background).not.toBe('rgba(0, 0, 0, 0)')
    expect(coverage.worstWhiteContrast).toBeGreaterThanOrEqual(4.5)
    for (const text of coverage.text) {
      expect(text.left).toBeGreaterThanOrEqual(coverage.box.left)
      expect(text.right).toBeLessThanOrEqual(coverage.box.right)
      expect(text.top).toBeGreaterThanOrEqual(coverage.box.top)
      expect(text.bottom).toBeLessThanOrEqual(coverage.box.bottom)
    }
    evidence.push({ palette, mode, rendered, coverage })
    await info.attach(`parallax-caption-${palette}-${mode}-loaded`, { body: await parallax.screenshot({ animations: 'allow' }), contentType: 'image/png' })
  }
  const src = await image.getAttribute('src')
  expect(src).toBeTruthy()
  // The loaded image is an inline SVG; request interception cannot fail a data URI.
  // Exercise a real native image error, without injecting or overriding any styles.
  await page.route('**/qds-parallax-unavailable.svg', route => route.abort('failed'))
  await applyShadcn(page, 'light', 'neutral')
  await image.evaluate(element => { (element as HTMLImageElement).src = '/qds-parallax-unavailable.svg' })
  await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBe(0)
  expect((await paint(caption)).textContrast).toBeGreaterThanOrEqual(4.5)
  await info.attach('parallax-caption-native-image-fallback', { body: await parallax.screenshot({ animations: 'allow' }), contentType: 'image/png' })
  await image.evaluate((element, original) => { (element as HTMLImageElement).src = original! }, src)
  await info.attach('parallax-caption-paint-and-coverage', { body: JSON.stringify(evidence), contentType: 'application/json' })
})
