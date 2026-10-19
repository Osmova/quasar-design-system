import { expect, test, type Page } from '@playwright/test'
import { MATRIX_VARIANTS, expectGalleryPage, gotoGalleryPage } from './helpers'

type Mode = 'light' | 'dark'
type Variant = 'fluent' | 'ink' | 'one' | 'term'

async function applyTheme(page: Page, mode: Mode, variant: Variant) {
  await page.evaluate(
    ({ mode, variant }) => {
      const ds = (window as unknown as { __qdsGallery: any }).__qdsGallery
      ds.setMode(mode)
      ds.setVariant(variant)
    },
    { mode, variant },
  )
  await expect(page.locator('body')).toHaveClass(new RegExp(`qds-variant-${variant}`))
  await expect(page.locator('body')).toHaveClass(
    new RegExp(mode === 'dark' ? 'qds-theme-dark' : 'qds-theme-light'),
  )
  // Class flips are instant but token-driven color transitions need ~150ms to settle.
  await page.waitForTimeout(150)
}

async function computed(page: Page, selector: string, prop: string): Promise<string> {
  return page.locator(selector).first().evaluate(
    (el, prop) => getComputedStyle(el as Element).getPropertyValue(prop),
    prop,
  )
}

async function computedPseudo(page: Page, selector: string, pseudo: string, prop: string): Promise<string> {
  return page.locator(selector).first().evaluate(
    (el, { pseudo, prop }) => getComputedStyle(el as Element, pseudo).getPropertyValue(prop),
    { pseudo, prop },
  )
}

async function resolvedColor(page: Page, name: string): Promise<string> {
  return page.locator('body').evaluate(
    (el, name) => {
      const root = el as Element
      const probe = document.createElement('span')
      probe.style.color = `var(${name})`
      root.append(probe)
      const color = getComputedStyle(probe).color
      probe.remove()
      return color
    },
    name,
  )
}

test.describe('QDS catalog form picker gate', () => {
  test('skins form controls, fields, file, slider, and range sub-elements with QDS tokens', async ({ page }) => {
    await page.goto('/')
    await gotoGalleryPage(page, 'Catalog')
    await applyTheme(page, 'light', 'fluent')

    const primary = await resolvedColor(page, '--qds-color-primary')
    const negative = await resolvedColor(page, '--qds-color-negative')

    await expect(page.locator('[data-test="qds-catalog-input-readonly"] .q-field')).toHaveClass(/q-field--readonly/)
    await expect(page.locator('[data-test="qds-catalog-input-error"] .q-field')).toHaveClass(/q-field--error/)
    await expect(page.locator('[data-test="qds-catalog-input-disabled"] .q-field')).toHaveClass(/q-field--disabled/)
    await expect(page.locator('[data-test="qds-catalog-input-error"] .q-field__messages')).toContainText('Visible validation message')
    expect.soft(
      await computedPseudo(page, '[data-test="qds-catalog-input-readonly"] .q-field__control', '::before', 'border-top-style'),
      'QInput readonly outline is visibly distinct',
    ).toBe('dashed')
    expect.soft(
      await computedPseudo(page, '[data-test="qds-catalog-input-error"] .q-field__control', '::before', 'border-top-color'),
      'QInput error stroke uses negative token on every side',
    ).toBe(negative)
    expect.soft(
      await computedPseudo(page, '[data-test="qds-catalog-input-error"] .q-field__control', '::after', 'border-bottom-color'),
      'QInput error keeps a persistent negative bottom bar',
    ).toBe(negative)
    expect.soft(
      await computedPseudo(page, '[data-test="qds-catalog-input-error"] .q-field__control', '::after', 'transform'),
      'QInput error bar is shown at rest at full width, not only on focus',
    ).toBe('matrix(1, 0, 0, 1, 0, 0)')
    expect.soft(
      await computed(page, '[data-test="qds-catalog-input-disabled"] .q-field__control', 'background-color'),
      'QInput disabled control keeps a visible disabled surface',
    ).not.toBe('rgba(0, 0, 0, 0)')

    await expect(page.locator('[data-test="qds-catalog-select-readonly"] .q-field')).toHaveClass(/q-field--readonly/)
    await expect(page.locator('[data-test="qds-catalog-select-error"] .q-field')).toHaveClass(/q-field--error/)
    await expect(page.locator('[data-test="qds-catalog-select-disabled"] .q-field')).toHaveClass(/q-field--disabled/)
    await expect(page.locator('[data-test="qds-catalog-select-error"] .q-field__messages')).toContainText('Visible selection message')
    expect.soft(
      await computedPseudo(page, '[data-test="qds-catalog-select-readonly"] .q-field__control', '::before', 'border-top-style'),
      'QSelect readonly outline is visibly distinct',
    ).toBe('dashed')
    expect.soft(
      await computedPseudo(page, '[data-test="qds-catalog-select-error"] .q-field__control', '::before', 'border-top-color'),
      'QSelect error stroke uses negative token on every side',
    ).toBe(negative)
    expect.soft(
      await computedPseudo(page, '[data-test="qds-catalog-select-error"] .q-field__control', '::after', 'border-bottom-color'),
      'QSelect error keeps a persistent negative bottom bar',
    ).toBe(negative)
    await expect(page.locator('[data-test="qds-catalog-select-multiple"] .q-chip').first(), 'QSelect multiple chip rendered').toBeVisible()
    expect.soft(await computed(page, '[data-test="qds-catalog-select-multiple"] .q-chip', 'border-radius'), 'QSelect chips use chip radius').not.toBe('0px')
    expect.soft(await computed(page, '[data-test="qds-catalog-select-multiple"] .q-chip', 'background-color'), 'QSelect chips are token surfaced').not.toBe('rgba(0, 0, 0, 0)')
    await page.locator('[data-test="qds-catalog-select-multiple"] .q-field').click()
    await expect(page.locator('.q-menu').last(), 'QSelect menu opens deterministically').toBeVisible()
    await expect(page.locator('.q-menu .q-item[aria-selected="true"]').first(), 'QSelect selected option is exposed in menu').toBeVisible()
    expect.soft(await computed(page, '.q-menu .q-item[aria-selected="true"]', 'background-color'), 'QSelect selected menu item has a visible state layer').not.toBe('rgba(0, 0, 0, 0)')
    await page.keyboard.press('Escape')

    await expect(page.locator('[data-test="qds-catalog-checkbox"] .q-checkbox__bg')).toBeVisible()
    await expect(page.locator('[data-test="qds-catalog-radio"] .q-radio__bg')).toBeVisible()
    await expect(page.locator('[data-test="qds-catalog-toggle"] .q-toggle__track')).toBeVisible()
    expect.soft(await computed(page, '[data-test="qds-catalog-checkbox"] .q-checkbox__bg', 'border-top-color'), 'QCheckbox truthy frame uses primary').toBe(primary)
    expect.soft(await computed(page, '[data-test="qds-catalog-radio"] .q-radio__bg', 'border-top-color'), 'QRadio truthy frame uses primary').toBe(primary)
    expect.soft(await computed(page, '[data-test="qds-catalog-radio"] .q-radio__check', 'fill'), 'QRadio check uses primary').toBe(primary)
    expect.soft(await computed(page, '[data-test="qds-catalog-toggle"] .q-toggle__track', 'border-radius'), 'QToggle track is rounded').not.toBe('0px')
    expect.soft(await computed(page, '[data-test="qds-catalog-toggle"] .q-toggle__track', 'background-color'), 'QToggle track fills with primary when on').toBe(primary)
    expect.soft(await computedPseudo(page, '[data-test="qds-catalog-toggle"] .q-toggle__thumb', '::after', 'background-color'), 'QToggle thumb uses on-primary on the brand track').toBe(await resolvedColor(page, '--qds-text-on-primary'))
    const toggleGeo = await page.locator('[data-test="qds-catalog-toggle"]').evaluate((el) => {
      const track = el.querySelector('.q-toggle__track')!.getBoundingClientRect()
      const thumb = el.querySelector('.q-toggle__thumb')!.getBoundingClientRect()
      const inner = el.querySelector('.q-toggle__inner')!.getBoundingClientRect()
      return {
        insetRight: Math.round((track.right - thumb.right) * 100) / 100,
        vertDelta: Math.abs((thumb.top + thumb.height / 2) - (track.top + track.height / 2)),
        thumbCenterPos: (thumb.left + thumb.width / 2 - track.left) / track.width,
      }
    })
    expect.soft(toggleGeo.insetRight, 'QToggle truthy thumb keeps breathing room inside track').toBeGreaterThanOrEqual(2)
    expect.soft(toggleGeo.vertDelta, 'QToggle thumb is vertically centered in track').toBeLessThanOrEqual(1)
    expect.soft(toggleGeo.thumbCenterPos, 'QToggle on-state thumb-center sits near the far end of the track (Fluent travel)').toBeGreaterThanOrEqual(0.68)

    await expect(page.locator('[data-test="qds-catalog-option-radio"]')).toBeVisible()
    await expect(page.locator('[data-test="qds-catalog-option-checkbox"]')).toBeVisible()
    expect.soft(await computed(page, '[data-test="qds-catalog-option-radio"]', 'display'), 'QOptionGroup is layout-controlled').toBe('flex')
    expect.soft(await computed(page, '[data-test="qds-catalog-option-checkbox"] .q-checkbox', 'border-radius'), 'QOptionGroup options are softened').not.toBe('0px')

    const emptyFile = page.locator('[data-test="qds-catalog-file-empty"] .q-file')
    const selectedFile = page.locator('[data-test="qds-catalog-file-selected"] .q-file')
    const multipleFiles = page.locator('[data-test="qds-catalog-file-multiple"] .q-file')
    await expect(emptyFile, 'QFile empty state rendered').toBeVisible()
    await expect(emptyFile.locator('.q-chip'), 'QFile empty state has no selected chips').toHaveCount(0)
    await expect(selectedFile).toContainText('brand-guidelines.pdf')
    await expect(multipleFiles.locator('.q-chip'), 'QFile multiple state renders deterministic chips').toHaveCount(2)
    await expect(multipleFiles.locator('.q-chip__icon--remove').first(), 'QFile chips expose the public remove control').toBeVisible()
    await expect(multipleFiles.locator('.q-chip__icon--remove').first(), 'QFile chip remove has an accessible name').toHaveAttribute('aria-label', /remove/i)
    await expect(selectedFile.locator('.q-field__focusable-action'), 'QFile selected state exposes its clear control').toBeVisible()
    await expect(selectedFile.locator('.q-field__focusable-action'), 'QFile clear has an accessible name').toHaveAttribute('aria-label', /clear/i)
    await expect(multipleFiles.locator('.q-field__bottom'), 'QFile multiple state renders its counter').toContainText('2')
    const progressFiles = page.locator('[data-test="qds-catalog-file-progress"] .q-file')
    await expect(progressFiles.locator('.q-chip'), 'QFile file slot renders progress chips').toHaveCount(2)
    await expect(progressFiles.locator('.q-linear-progress'), 'QFile file slot renders deterministic progress').toHaveCount(2)
    await expect(progressFiles.locator('.q-chip__icon--remove').first(), 'QFile file-slot remove has a descriptive name').toHaveAttribute('aria-label', /remove token-audit\.json/i)
    await expect(progressFiles.locator('.q-field__bottom'), 'QFile file slot renders its counter').toContainText('2')
    const progressBox = await progressFiles.locator('.q-linear-progress').first().boundingBox()
    if (progressBox) {
      expect.soft(progressBox.width, 'QFile file-slot progress has a visible width').toBeGreaterThan(0)
      expect.soft(progressBox.height, 'QFile file-slot progress has a visible height').toBeGreaterThan(0)
    }
    expect.soft(await computed(page, '[data-test="qds-catalog-file-selected"] .q-field__control', 'border-radius'), 'QFile control inherits field radius').not.toBe('0px')
    expect.soft(await computed(page, '[data-test="qds-catalog-file-selected"] .q-field__native', 'color'), 'QFile native text is tokenized').not.toBe('rgba(0, 0, 0, 0.87)')
    await selectedFile.locator('.q-field__native').focus()
    await expect(selectedFile, 'QFile focus inherits QField focus state').toHaveClass(/q-field--focused/)
    await expect.poll(
      () => computedPseudo(page, '[data-test="qds-catalog-file-selected"] .q-field__control', '::after', 'border-top-color'),
      { message: 'QFile focused outline uses primary after its transition settles' },
    ).toBe(primary)
    await multipleFiles.locator('.q-chip__icon--remove').first().click()
    await expect(multipleFiles.locator('.q-chip'), 'QFile chip remove updates the local fixture').toHaveCount(1)
    await progressFiles.locator('.q-chip__icon--remove').first().click()
    await expect(progressFiles.locator('.q-chip'), 'QFile file-slot remove updates the local fixture').toHaveCount(1)
    await selectedFile.locator('.q-field__focusable-action').click()
    await expect(selectedFile.locator('.q-field__focusable-action'), 'QFile clear removes its clear affordance').toHaveCount(0)
    await expect(page.locator('[data-test="qds-catalog-file-readonly"] .q-file')).toHaveClass(/q-field--readonly/)
    await expect(page.locator('[data-test="qds-catalog-file-disabled"] .q-file')).toHaveClass(/q-field--disabled/)
    expect.soft(await computedPseudo(page, '[data-test="qds-catalog-file-readonly"] .q-field__control', '::before', 'border-top-style'), 'QFile readonly state inherits the distinct outline').toBe('dashed')
    expect.soft(await computed(page, '[data-test="qds-catalog-file-disabled"] .q-field__control', 'background-color'), 'QFile disabled state inherits a visible disabled surface').not.toBe('rgba(0, 0, 0, 0)')
    const readonlyFile = page.locator('[data-test="qds-catalog-file-readonly"] .q-file')
    const disabledFile = page.locator('[data-test="qds-catalog-file-disabled"] .q-file')
    await expect(readonlyFile.locator('input[type="file"]'), 'QFile readonly native input is disabled').toBeDisabled()
    await expect(disabledFile.locator('input[type="file"]'), 'QFile disabled native input is disabled').toBeDisabled()
    let nativeFileChooserCount = 0
    const countNativeFileChooser = () => { nativeFileChooserCount += 1 }
    page.on('filechooser', countNativeFileChooser)
    for (const protectedFile of [readonlyFile, disabledFile]) {
      // Centre the field and prove it is the hit target so the forced click cannot land on the sticky header.
      await protectedFile.evaluate((element) => element.scrollIntoView({ block: 'center', behavior: 'instant' }))
      await expect.poll(() => protectedFile.evaluate((element) => {
        const rect = element.getBoundingClientRect()
        const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
        return Boolean(hit && element.contains(hit))
      }), { message: 'protected QFile is the pointer hit target' }).toBe(true)
      await protectedFile.click({ force: true })
    }
    // Keyboard checks run after every pointer check: Space scrolls the page and would move later click targets.
    for (const protectedFile of [readonlyFile, disabledFile]) {
      await protectedFile.locator('.q-field__native').focus()
      await protectedFile.locator('.q-field__native').press('Enter')
      await protectedFile.locator('.q-field__native').press('Space')
    }
    await page.waitForTimeout(100)
    page.off('filechooser', countNativeFileChooser)
    await expect(page.locator('body'), 'protected QFile clicks do not reach the header switchers').toHaveClass(/qds-variant-fluent/)
    expect.soft(nativeFileChooserCount, 'Readonly and disabled QFile fields do not activate the native chooser by pointer or keyboard').toBe(0)
    await expect(page.locator('[data-test="qds-catalog-file-affordances"] .q-field__prepend svg')).toBeVisible()
    await expect(page.locator('[data-test="qds-catalog-file-affordances"] .q-field__append svg')).toBeVisible()
    // Quasar 2.25+ drives the QFile drop overlay through useDropZone, which arms on `dragenter`
    // (not the legacy `dragover`); a bare dragenter toggles q-file--dnd and renders .q-file__dnd.
    await emptyFile.locator('.q-field__native').dispatchEvent('dragenter')
    await expect(emptyFile, 'QFile drag-over state has the native dnd class').toHaveClass(/q-file--dnd/)
    await expect(emptyFile.locator('.q-file__dnd'), 'QFile drag-over surface is visible without a file chooser').toBeVisible()
    expect.soft(await computed(page, '[data-test="qds-catalog-file-empty"] .q-file__dnd', 'outline-style'), 'QFile drag-over surface uses a dashed visual affordance').toBe('dashed')
    expect.soft(await computed(page, '[data-test="qds-catalog-file-empty"] .q-file__dnd', 'background-color'), 'QFile drag-over surface is token surfaced').not.toBe('rgba(0, 0, 0, 0)')
    await emptyFile.locator('.q-field__native').dispatchEvent('dragleave')
    await expect(emptyFile.locator('.q-file__dnd'), 'QFile drag-over surface clears without dropping files').toHaveCount(0)

    await expect(page.locator('[data-test="qds-catalog-slider"] .q-slider__selection')).toBeVisible()
    await expect(page.locator('[data-test="qds-catalog-range"] .q-slider__selection').first()).toBeVisible()
    expect.soft(await computed(page, '[data-test="qds-catalog-slider"] .q-slider__track', 'border-radius'), 'QSlider track is rounded').not.toBe('0px')
    expect.soft(await computed(page, '[data-test="qds-catalog-slider"] .q-slider__selection', 'background-color'), 'QSlider selection uses primary').toBe(primary)
    expect.soft(await computed(page, '[data-test="qds-catalog-slider"] .q-slider__thumb', 'box-shadow'), 'QSlider thumb follows Fluent solid/no-small-shadow treatment').toBe('none')
    expect.soft(await computed(page, '[data-test="qds-catalog-range"] .q-slider__track', 'border-radius'), 'QRange track is rounded').not.toBe('0px')
    expect.soft(await computed(page, '[data-test="qds-catalog-range"] .q-slider__selection', 'background-color'), 'QRange selection uses primary').toBe(primary)
    expect.soft(await computed(page, '[data-test="qds-catalog-range"] .q-slider__thumb', 'box-shadow'), 'QRange thumbs follow Fluent solid/no-small-shadow treatment').toBe('none')
  })

  test('skins QColor, QDate, and QTime picker internals with QDS tokens', async ({ page }) => {
    await page.goto('/')
    await gotoGalleryPage(page, 'Catalog')
    await applyTheme(page, 'light', 'fluent')

    const primary = await resolvedColor(page, '--qds-color-primary')
    const onSolid = await resolvedColor(page, '--qds-text-on-solid')

    await expect(page.locator('[data-test="qds-catalog-color"] .q-color-picker__header-tabs')).toBeVisible()
    await expect(page.locator('[data-test="qds-catalog-color"] .q-color-picker__footer')).toBeVisible()
    await expect(page.locator('[data-test="qds-catalog-color"] .q-color-picker__cube').first()).toBeVisible()
    await expect(page.locator('[data-test="qds-catalog-color-spectrum"] .q-color-picker__spectrum')).toBeVisible()
    await expect(page.locator('[data-test="qds-catalog-color-spectrum"] .q-color-picker__alpha')).toBeVisible()
    await expect(page.locator('[data-test="qds-catalog-color-tune"] .q-color-picker__tune-tab input').first()).toBeVisible()

    expect.soft(await computed(page, '[data-test="qds-catalog-color"] .q-color-picker__header-bg', 'background-image'), 'QColor checker uses tokenized gradients').not.toContain('data:image')
    expect.soft(await computed(page, '[data-test="qds-catalog-color"] .q-tab.q-tab--active', 'border-radius'), 'QColor tabs are softened').not.toBe('0px')
    expect.soft(await computed(page, '[data-test="qds-catalog-color"] .q-tab.q-tab--active', 'transition-property'), 'QColor tabs animate state changes').toContain('box-shadow')
    expect.soft(await computed(page, '[data-test="qds-catalog-color-spectrum"] .q-color-picker__spectrum', 'border-radius'), 'QColor spectrum is framed').not.toBe('0px')
    expect.soft(await computed(page, '[data-test="qds-catalog-color-spectrum"] .q-color-picker__alpha .q-slider__track-container', 'background-image'), 'QColor alpha track container paints no stray checker band').toBe('none')
    expect.soft(await page.locator('[data-test="qds-catalog-color-spectrum"] .q-color-picker__alpha .q-slider__track').first().evaluate((el) => getComputedStyle(el, '::before').backgroundImage), 'QColor alpha track keeps a transparency checker').toContain('conic-gradient')
    expect.soft(await computed(page, '[data-test="qds-catalog-color-tune"] .q-color-picker__tune-tab > .row', 'background-color'), 'QColor tune rows are surfaced').not.toBe('rgba(0, 0, 0, 0)')
    await page.locator('[data-test="qds-catalog-color-tune"] .q-color-picker__tune-tab input').first().focus()
    expect.soft(await computed(page, '[data-test="qds-catalog-color-tune"] .q-color-picker__tune-tab input', 'outline-style'), 'QColor tune input focus ring is visible').toBe('solid')
    expect.soft(await computed(page, '[data-test="qds-catalog-color"] .q-color-picker__cube', 'border-radius'), 'QColor swatches are softened').not.toBe('0px')
    expect.soft(await computed(page, '[data-test="qds-catalog-color"] .q-color-picker__cube', 'aspect-ratio'), 'QColor swatches stay square').toBe('1 / 1')
    const swatchDelta = await page.locator('[data-test="qds-catalog-color"] .q-color-picker__cube').first().evaluate((el) => {
      const rect = el.getBoundingClientRect()
      return Math.abs(rect.width - rect.height)
    })
    expect.soft(swatchDelta, 'QColor swatch rendered box stays near-square').toBeLessThanOrEqual(1)
    expect.soft(await computed(page, '[data-test="qds-catalog-color"] .q-color-picker__footer', 'background-color'), 'QColor footer is surfaced').not.toBe('rgba(0, 0, 0, 0)')
    expect.soft(await computed(page, '[data-test="qds-catalog-date"]', 'border-top-color'), 'QDate bordered frame is softened').not.toBe('rgb(200, 200, 200)')
    expect.soft(await computed(page, '[data-test="qds-catalog-time"]', 'border-top-color'), 'QTime bordered frame is softened').not.toBe('rgb(200, 200, 200)')

    const selectedDate = page.locator('[data-test="qds-catalog-date"]').getByRole('button', { name: '17 August 2029', exact: true })
    await expect(selectedDate).toBeVisible()
    expect.soft(await selectedDate.evaluate((el) => getComputedStyle(el as Element).backgroundColor), 'QDate selected day uses primary').toBe(primary)
    expect.soft(await selectedDate.evaluate((el) => getComputedStyle(el as Element).color), 'QDate selected day uses on-solid text').toBe(onSolid)
    expect.soft(await computed(page, '[data-test="qds-catalog-date"] .q-date__header', 'background-color'), 'QDate header is not transparent').not.toBe('rgba(0, 0, 0, 0)')
    await expect(page.locator('[data-test="qds-catalog-date"] .q-date__calendar-item--out').first(), 'QDate disabled/out day rendered').toBeVisible()
    expect.soft(await computed(page, '[data-test="qds-catalog-date"] .q-date__calendar-item--out', 'opacity'), 'QDate out days recede by opacity').toBe('0.4')
    expect.soft(await computed(page, '[data-test="qds-catalog-date"] .q-date__calendar-item--out > div', 'background-color'), 'QDate out days carry no fill').toBe('rgba(0, 0, 0, 0)')
    await expect(page.locator('[data-test="qds-catalog-date-months"] .q-date__months')).toBeVisible()
    await expect(page.locator('[data-test="qds-catalog-date-years"] .q-date__years')).toBeVisible()
    expect.soft(await computed(page, '[data-test="qds-catalog-date-months"] .q-date__months', 'gap'), 'QDate month grid has native picker rhythm').not.toBe('0px')
    expect.soft(await computed(page, '[data-test="qds-catalog-date-years"] .q-date__years-content', 'gap'), 'QDate year grid has native picker rhythm').not.toBe('0px')

    await expect(page.locator('[data-test="qds-catalog-date-range"] .q-date__range').first(), 'QDate range middle rendered').toBeVisible()
    await expect(page.locator('[data-test="qds-catalog-date-range"] .q-date__range-from').first(), 'QDate range start rendered').toBeVisible()
    await expect(page.locator('[data-test="qds-catalog-date-range"] .q-date__range-to').first(), 'QDate range end rendered').toBeVisible()
    expect.soft(await computedPseudo(page, '[data-test="qds-catalog-date-range"] .q-date__range', '::before', 'background-color'), 'QDate range fill is tokenized').not.toBe('rgba(0, 0, 0, 0)')
    expect.soft(await computedPseudo(page, '[data-test="qds-catalog-date-range"] .q-date__range-from', '::before', 'border-top-left-radius'), 'QDate range band starts with a pill cap').toBe('9999px')
    expect.soft(await computedPseudo(page, '[data-test="qds-catalog-date-range"] .q-date__range-to', '::before', 'border-top-right-radius'), 'QDate range band ends with a pill cap').toBe('9999px')

    const activeTime = page.locator('[data-test="qds-catalog-time"] .q-time__clock-position--active').first()
    await expect(activeTime).toBeVisible()
    expect.soft(await activeTime.evaluate((el) => getComputedStyle(el as Element).backgroundColor), 'QTime active tick uses primary').toBe(primary)
    expect.soft(await activeTime.evaluate((el) => getComputedStyle(el as Element).color), 'QTime active tick uses on-solid text').toBe(onSolid)
    expect.soft(await computed(page, '[data-test="qds-catalog-time"] .q-time__container-child', 'background-color'), 'QTime clock face is token surfaced').not.toBe('rgba(0, 0, 0, 0.12)')
    await expect(page.locator('[data-test="qds-catalog-time"] .q-time__header-ampm')).toBeVisible()
    // Viewport-aware landscape: landscape on >=640px, portrait on narrow
    const viewportWidth = page.viewportSize()?.width ?? 1280
    if (viewportWidth > 640) {
      await expect(page.locator('[data-test="qds-catalog-time"].q-time--landscape')).toBeVisible()
    } else {
      await expect(page.locator('[data-test="qds-catalog-time"]')).not.toHaveClass(/q-time--landscape/)
    }
    await expect(page.locator('[data-test="qds-catalog-time"] .q-time__clock-position--disable').first(), 'QTime disabled clock positions rendered').toBeVisible()
    expect.soft(await computed(page, '[data-test="qds-catalog-time"] .q-time__header-ampm', 'border-radius'), 'QTime AM/PM group is a segmented control').not.toBe('0px')
    expect.soft(await computed(page, '[data-test="qds-catalog-time"] .q-time__clock-position--disable', 'cursor'), 'QTime disabled positions communicate unavailable state').toBe('not-allowed')

    await page.locator('[data-test="qds-catalog-popup-edit-target"]').click()
    await expect(page.locator('.q-popup-edit').last(), 'QPopupEdit popup opens deterministically').toBeVisible()
    expect.soft(await computed(page, '.q-popup-edit', 'border-radius'), 'QPopupEdit popup uses menu radius').not.toBe('0px')
    expect.soft(await computed(page, '.q-popup-edit', 'background-color'), 'QPopupEdit popup uses surfaced background').not.toBe('rgba(0, 0, 0, 0)')
  })

  test('QSelect supports dialog, cover-menu, empty, and max-value modes without visual regressions', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/#catalog')
    await applyTheme(page, 'light', 'fluent')

    const dialogSelect = page.locator('[data-test="qds-catalog-select-dialog"] .q-select')
    await dialogSelect.locator('.q-field__native').click()
    const selectDialog = page.locator('.q-dialog .q-select__dialog')
    await expect(selectDialog, 'QSelect dialog behavior opens at the mobile viewport').toBeVisible()
    await expect(selectDialog.getByRole('listbox').getByText('Comfortable', { exact: true })).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('qselect-dialog-mobile.png'), fullPage: true })
    await page.keyboard.press('Escape')
    await expect(selectDialog).toBeHidden()

    await page.setViewportSize({ width: 1280, height: 800 })
    const coverSelect = page.locator('[data-test="qds-catalog-select-cover"] .q-select')
    const coverControl = coverSelect.locator('.q-field__control')
    const coverControlBox = await coverControl.boundingBox()
    await coverSelect.locator('.q-field__native').click()
    const coverMenu = page.locator('.q-menu').last()
    await expect(coverMenu, 'QSelect cover menu opens deterministically').toBeVisible()
    await expect.poll(async () => Math.abs(((await coverMenu.boundingBox())?.width ?? 0) - (coverControlBox?.width ?? 0)), { timeout: 2000 }).toBeLessThanOrEqual(1)
    const coverMenuBox = await coverMenu.boundingBox()
    if (coverControlBox && coverMenuBox) {
      expect.soft(Math.abs(coverMenuBox.x - coverControlBox.x), 'QSelect cover menu aligns with its control').toBeLessThanOrEqual(1)
      expect.soft(Math.abs(coverMenuBox.width - coverControlBox.width), 'QSelect cover menu matches its control width').toBeLessThanOrEqual(1)
    }
    await page.keyboard.press('Escape')

    const noOptionsSelect = page.locator('[data-test="qds-catalog-select-no-options"] .q-select')
    await noOptionsSelect.locator('.q-field__native').click()
    await expect(page.locator('.q-menu').last().getByText('No options available', { exact: true }), 'QSelect public no-option slot renders an intentional empty state').toBeVisible()
    await page.keyboard.press('Escape')

    const limitedSelect = page.locator('[data-test="qds-catalog-select-limited"] .q-select')
    await expect(limitedSelect.locator('.q-chip'), 'QSelect max-values fixture begins with one chip').toHaveCount(1)
    await expect(limitedSelect.locator('.q-field__bottom'), 'QSelect counter exposes the maximum').toContainText('1 / 2')
    await limitedSelect.locator('.q-field__native').click()
    const limitedMenu = page.locator('.q-menu').last()
    await limitedMenu.getByText('Comfortable', { exact: true }).click()
    await expect(limitedSelect.locator('.q-chip'), 'QSelect adds values up to max-values').toHaveCount(2)
    await expect(limitedSelect.locator('.q-field__bottom')).toContainText('2 / 2')
    await limitedMenu.getByText('Touch', { exact: true }).click()
    await expect(limitedSelect.locator('.q-chip'), 'QSelect blocks values beyond max-values').toHaveCount(2)
  })

  test('forms and pickers render Fluent, Ink, and One in both resolved modes', async ({ page }) => {
    await page.goto('/#catalog')
    for (const mode of ['light', 'dark'] as const) {
      for (const variant of MATRIX_VARIANTS) {
        await applyTheme(page, mode, variant)
        const primary = await resolvedColor(page, '--qds-color-primary')
        await expect(page.locator('[data-test="qds-catalog-input-error"] .q-field')).toBeVisible()
        await expect(page.locator('[data-test="qds-catalog-file-readonly"] .q-file')).toHaveClass(/q-field--readonly/)
        await expect(page.locator('[data-test="qds-catalog-file-disabled"] .q-file')).toHaveClass(/q-field--disabled/)
        await expect(page.locator('[data-test="qds-catalog-date"] .q-date__header')).toBeVisible()
        await expect(page.locator('[data-test="qds-catalog-time"] .q-time__container-child')).toBeVisible()
        expect.soft(await computed(page, '[data-test="qds-catalog-input-error"] .q-field__control', 'border-radius'), `${mode}/${variant} field radius`).not.toBe('0px')
        expect.soft(await computedPseudo(page, '[data-test="qds-catalog-input-error"] .q-field__control', '::after', 'border-bottom-color'), `${mode}/${variant} error bar is semantic`).toBe(await resolvedColor(page, '--qds-stroke-error'))
        expect.soft(await computedPseudo(page, '[data-test="qds-catalog-file-readonly"] .q-field__control', '::before', 'border-top-style'), `${mode}/${variant} QFile readonly outline is distinct`).toBe('dashed')
        expect.soft(await computed(page, '[data-test="qds-catalog-file-disabled"] .q-field__control', 'background-color'), `${mode}/${variant} QFile disabled surface remains visible`).not.toBe('rgba(0, 0, 0, 0)')
        expect.soft(await page.locator('[data-test="qds-catalog-date"]').getByRole('button', { name: '17 August 2029', exact: true }).evaluate((el) => getComputedStyle(el).backgroundColor), `${mode}/${variant} selected date uses the active primary`).toBe(primary)
        expect.soft(await computed(page, '[data-test="qds-catalog-time"] .q-time__clock-position--active', 'background-color'), `${mode}/${variant} active time uses the active primary`).toBe(primary)
        if (variant === 'ink') {
          expect.soft(await page.locator('body').evaluate((el) => getComputedStyle(el).getPropertyValue('--qds-surface-positive-soft').trim()), `${mode}/ink has a pastel semantic role surface`).toBe(mode === 'light' ? '#e2ecdf' : '#2f3f35')
        }
        if (variant === 'one') {
          expect.soft(await computed(page, '[data-test="qds-catalog-input-error"] .q-field__control', 'min-height'), `${mode}/One label-above fields use the 44px One UI control height`).toBe('44px')
        }
      }
    }
  })

  test('QTime renders portrait on narrow viewports to prevent clipping', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/#catalog')
    await applyTheme(page, 'light', 'fluent')

    await expectGalleryPage(page, 'Catalog')
    expect.soft(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      'the collapsed page drawer leaves a deep-linked narrow page free of horizontal scroll',
    ).toBe(true)

    const timePicker = page.locator('[data-test="qds-catalog-time"]')
    await expect(timePicker).toBeVisible()
    await expect(timePicker).not.toHaveClass(/q-time--landscape/)
    const timeBox = await timePicker.boundingBox()
    const demoCard = await timePicker.locator('xpath=ancestor::*[contains(@class, "catalog-demo")][1]').boundingBox()
    if (timeBox && demoCard) {
      expect.soft(timeBox.width, 'QTime narrow width fits within card').toBeLessThanOrEqual(demoCard.width + 1)
      expect.soft(timeBox.x, 'QTime does not overflow card left edge').toBeGreaterThanOrEqual(demoCard.x - 1)
      expect.soft(timeBox.x + timeBox.width, 'QTime does not overflow card right edge').toBeLessThanOrEqual(demoCard.x + demoCard.width + 1)
    }
    await expect(timePicker.locator('.q-time__header-ampm')).toBeVisible()
    await expect(timePicker.locator('.q-time__clock-position--disable').first()).toBeVisible()
  })

  test('forms retain logical RTL affordances and reduce motion when requested', async ({ page }) => {
    await page.goto('/#catalog')
    await applyTheme(page, 'light', 'fluent')
    await page.evaluate(() => { document.documentElement.dir = 'rtl' })

    const affordances = page.locator('[data-test="qds-catalog-file-affordances"] .q-file')
    const prependBox = await affordances.locator('.q-field__prepend').boundingBox()
    const appendBox = await affordances.locator('.q-field__append').boundingBox()
    const affordanceControlBox = await affordances.locator('.q-field__control').boundingBox()
    if (prependBox && appendBox && affordanceControlBox) {
      expect.soft(prependBox.x, 'RTL QFile prepend stays within the logical field frame').toBeGreaterThanOrEqual(affordanceControlBox.x)
      expect.soft(appendBox.x + appendBox.width, 'RTL QFile append stays within the logical field frame').toBeLessThanOrEqual(affordanceControlBox.x + affordanceControlBox.width)
    }

    await page.emulateMedia({ reducedMotion: 'reduce' })
    expect.soft(
      Number.parseFloat(await computed(page, '[data-test="qds-catalog-file-multiple"] .q-chip__icon--remove', 'transition-duration')),
      'QFile chip controls respect reduced motion',
    ).toBeLessThanOrEqual(0.01)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.evaluate(() => { document.documentElement.removeAttribute('dir') })
  })

  test('Term and Ink dark selected date/time use semantic on-primary text, not white', async ({ page }) => {
    await page.goto('/#catalog')

    // Term light: primary is yellow (#fcc40d), on-primary should be dark (#0d0d0c)
    await applyTheme(page, 'light', 'term')
    const termLightOnPrimary = await resolvedColor(page, '--qds-text-on-primary')
    const termLightSelectedDate = page.locator('[data-test="qds-catalog-date"]').getByRole('button', { name: '17 August 2029', exact: true })
    await expect(termLightSelectedDate).toBeVisible()
    await expect.poll(() => termLightSelectedDate.evaluate((el) => getComputedStyle(el as Element).color), { message: 'Term light selected date uses dark on-primary text, not white', timeout: 2000 }).toBe(termLightOnPrimary)
    expect.soft(
      await termLightSelectedDate.evaluate((el) => getComputedStyle(el as Element).color),
      'Term light selected date text is not white',
    ).not.toBe('rgb(255, 255, 255)')

    const termLightActiveTime = page.locator('[data-test="qds-catalog-time"] .q-time__clock-position--active').first()
    await expect(termLightActiveTime).toBeVisible()
    await expect.poll(() => termLightActiveTime.evaluate((el) => getComputedStyle(el as Element).color), { message: 'Term light active time uses dark on-primary text, not white', timeout: 2000 }).toBe(termLightOnPrimary)
    expect.soft(
      await termLightActiveTime.evaluate((el) => getComputedStyle(el as Element).color),
      'Term light active time text is not white',
    ).not.toBe('rgb(255, 255, 255)')

    // Term dark: primary is still yellow, on-primary should be dark (#0e0d0b)
    await applyTheme(page, 'dark', 'term')
    const termDarkOnPrimary = await resolvedColor(page, '--qds-text-on-primary')
    const termDarkSelectedDate = page.locator('[data-test="qds-catalog-date"]').getByRole('button', { name: '17 August 2029', exact: true })
    await expect(termDarkSelectedDate).toBeVisible()
    await expect.poll(() => termDarkSelectedDate.evaluate((el) => getComputedStyle(el as Element).color), { message: 'Term dark selected date uses dark on-primary text, not white', timeout: 2000 }).toBe(termDarkOnPrimary)
    expect.soft(
      await termDarkSelectedDate.evaluate((el) => getComputedStyle(el as Element).color),
      'Term dark selected date text is not white',
    ).not.toBe('rgb(255, 255, 255)')

    const termDarkActiveTime = page.locator('[data-test="qds-catalog-time"] .q-time__clock-position--active').first()
    await expect(termDarkActiveTime).toBeVisible()
    await expect.poll(() => termDarkActiveTime.evaluate((el) => getComputedStyle(el as Element).color), { message: 'Term dark active time uses dark on-primary text, not white', timeout: 2000 }).toBe(termDarkOnPrimary)
    expect.soft(
      await termDarkActiveTime.evaluate((el) => getComputedStyle(el as Element).color),
      'Term dark active time text is not white',
    ).not.toBe('rgb(255, 255, 255)')

    // Ink dark: primary is light cream (#f0e9db), on-primary should be dark (#25231f)
    await applyTheme(page, 'dark', 'ink')
    const inkDarkOnPrimary = await resolvedColor(page, '--qds-text-on-primary')
    const inkDarkSelectedDate = page.locator('[data-test="qds-catalog-date"]').getByRole('button', { name: '17 August 2029', exact: true })
    await expect(inkDarkSelectedDate).toBeVisible()
    await expect.poll(() => inkDarkSelectedDate.evaluate((el) => getComputedStyle(el as Element).color), { message: 'Ink dark selected date uses dark on-primary text, not white', timeout: 2000 }).toBe(inkDarkOnPrimary)
    expect.soft(
      await inkDarkSelectedDate.evaluate((el) => getComputedStyle(el as Element).color),
      'Ink dark selected date text is not white',
    ).not.toBe('rgb(255, 255, 255)')

    const inkDarkActiveTime = page.locator('[data-test="qds-catalog-time"] .q-time__clock-position--active').first()
    await expect(inkDarkActiveTime).toBeVisible()
    await expect.poll(() => inkDarkActiveTime.evaluate((el) => getComputedStyle(el as Element).color), { message: 'Ink dark active time uses dark on-primary text, not white', timeout: 2000 }).toBe(inkDarkOnPrimary)
    expect.soft(
      await inkDarkActiveTime.evaluate((el) => getComputedStyle(el as Element).color),
      'Ink dark active time text is not white',
    ).not.toBe('rgb(255, 255, 255)')
  })
})
