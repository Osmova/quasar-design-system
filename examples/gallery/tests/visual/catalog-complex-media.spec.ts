import { expect, test, type Page } from '@playwright/test'
import { customProperty, gotoGalleryPage, resolvedColor } from './helpers'

type Mode = 'light' | 'dark'
type Variant = 'fluent' | 'ink' | 'one' | 'term'
type ComplexMediaTestHook = {
  getRtl: () => boolean
  setRtl: (rtl: boolean) => boolean
}

declare global {
  interface Window {
    __qdsComplexMedia?: ComplexMediaTestHook
  }
}

const EXPECTED_MEDIA_RADIUS: Record<Extract<Variant, 'fluent' | 'one' | 'term'>, string> = {
  fluent: '8px',
  one: '24px',
  term: '10px',
}

async function applyTheme(page: Page, mode: Mode, variant: Variant) {
  await page.waitForFunction(() => Boolean((window as unknown as { __qdsGallery?: unknown }).__qdsGallery))
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
}

async function computed(page: Page, selector: string, prop: string, pseudo: string | null = null): Promise<string> {
  return page.locator(selector).first().evaluate(
    (el, { prop, pseudo }) => getComputedStyle(el as Element, pseudo ?? undefined).getPropertyValue(prop),
    { prop, pseudo },
  )
}

async function tokenColor(page: Page, selector: string, token: string): Promise<string> {
  return page.locator(selector).first().evaluate((el, token) => {
    const probe = document.createElement('span')
    probe.style.color = `var(${token})`
    el.append(probe)
    const color = getComputedStyle(probe).color
    probe.remove()
    return color
  }, token)
}

function parseCssColor(color: string): [number, number, number] {
  const components = color.match(/^rgba?\((.+)\)$/)?.[1].split(/[\s,/]+/).filter(Boolean)
    ?? color.match(/^color\(srgb\s+(.+)\)$/)?.[1].split(/[\s/]+/).filter(Boolean)

  const oklabComponents = color.match(/^oklab\((.+)\)$/)?.[1].split(/[\s/]+/).filter(Boolean)
  if (oklabComponents !== undefined && oklabComponents.length >= 3) {
    const [lightness, a, b] = oklabComponents.slice(0, 3).map(Number.parseFloat)
    const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
    const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
    const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3
    const toSrgb = (linear: number) => 255 * (linear <= 0.0031308 ? 12.92 * linear : 1.055 * linear ** (1 / 2.4) - 0.055)
    return [
      toSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
      toSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
      toSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
    ]
  }

  if (components === undefined || components.length < 3) {
    throw new Error(`Unsupported computed color: ${color}`)
  }

  return components.slice(0, 3).map(component => {
    const value = Number.parseFloat(component)
    return component.endsWith('%') ? value * 2.55 : value <= 1 ? value * 255 : value
  }) as [number, number, number]
}

function wcagContrast(foreground: string, background: string): number {
  const luminance = (color: [number, number, number]) => {
    const [red, green, blue] = color.map(channel => {
      const normalized = channel / 255
      return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue
  }
  const [first, second] = [luminance(parseCssColor(foreground)), luminance(parseCssColor(background))]
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
}

async function getComplexMediaRtl(page: Page): Promise<boolean> {
  await page.waitForFunction(() => Boolean(window.__qdsComplexMedia))
  return page.evaluate(() => window.__qdsComplexMedia!.getRtl())
}

async function setComplexMediaRtl(page: Page, rtl: boolean): Promise<boolean> {
  return page.evaluate(rtl => window.__qdsComplexMedia!.setRtl(rtl), rtl)
}

async function expectStepperErrorHalo(page: Page, label: string) {
  const tab = '[data-test="qds-stepper"] .q-stepper__tab--error'
  expect.soft(await computed(page, tab, 'background-color'), `${label} stepper error tab keeps no rectangle wash`).toBe('rgba(0, 0, 0, 0)')
  expect.soft(await computed(page, `${tab} .q-stepper__dot`, 'background-color'), `${label} stepper error dot is the negative fill`).toBe(await resolvedColor(page, '--qds-color-negative'))
  expect.soft(await computed(page, `${tab} .q-stepper__dot`, 'box-shadow'), `${label} stepper error dot carries the 4px negative-soft halo`).toBe(`${await resolvedColor(page, '--qds-surface-negative-soft')} 0px 0px 0px 4px`)
}

test.describe('QDS catalog complex media gate', () => {
  test('skins chat, local media, video, scroll area, and splitter without raw seams', async ({ page }) => {
    await page.goto('/')
    await gotoGalleryPage(page, 'Catalog')
    await applyTheme(page, 'light', 'fluent')

    const sentBubble = '[data-test="qds-chat-sent"] .q-message-text'
    const sentContent = '[data-test="qds-chat-sent"] .q-message-text-content'
    const sentStamp = '[data-test="qds-chat-sent"] .q-message-stamp'
    const receivedBubble = '[data-test="qds-chat-received"] .q-message-text'
    const receivedContent = '[data-test="qds-chat-received"] .q-message-text-content'
    const receivedStamp = '[data-test="qds-chat-received"] .q-message-stamp'
    const sentSurface = await tokenColor(page, sentBubble, '--qds-color-primary')
    const sentText = await tokenColor(page, sentBubble, '--qds-text-on-primary')
    const receivedSurface = await tokenColor(page, receivedBubble, '--qds-surface-1')
    const sentBg = await computed(page, sentBubble, 'background-color')
    const sentFg = await computed(page, sentContent, 'color')

    await expect(page.locator('[data-test="qds-chat-sent"] .q-message-avatar')).toHaveAttribute('src', /^data:image\/svg\+xml/)
    await expect(page.locator('[data-test="qds-chat-received"] .q-message-avatar')).toHaveAttribute('src', /^data:image\/svg\+xml/)
    expect.soft(sentBg, 'sent chat bubble uses the primary surface').toBe(sentSurface)
    expect.soft(await computed(page, sentBubble, 'color'), 'sent chat bubble owns the on-solid foreground').toBe(sentText)
    expect.soft(sentFg, 'sent chat content uses the on-solid foreground').toBe(sentText)
    expect.soft(await computed(page, receivedBubble, 'background-color'), 'received chat bubble uses the neutral surface').toBe(receivedSurface)
    expect.soft(await computed(page, receivedContent, 'color'), 'received chat content uses its bubble foreground').toBe(await computed(page, receivedBubble, 'color'))
    expect.soft(await computed(page, sentBubble, 'display', '::before'), 'sent chat bubble draws no tail').toBe('none')
    expect.soft(await computed(page, receivedBubble, 'display', '::before'), 'received chat bubble draws no tail').toBe('none')
    expect.soft(await computed(page, sentStamp, 'color'), 'sent chat stamp uses the primary on-fill foreground').toBe(sentText)
    expect.soft(await computed(page, receivedStamp, 'color'), 'received chat stamp uses the muted text token').toBe(await tokenColor(page, receivedBubble, '--qds-text-muted'))
    expect.soft(await computed(page, receivedBubble, 'border-top-width'), 'received chat bubble keeps QDS border').toBe('1px')
    for (const [bubble, tail, label] of [[sentBubble, 'border-end-end-radius', 'sent'], [receivedBubble, 'border-end-start-radius', 'received']] as const) {
      const tailRadius = parseFloat(await computed(page, bubble, tail))
      const otherCorners = ['border-start-start-radius', 'border-start-end-radius', 'border-end-start-radius', 'border-end-end-radius'].filter((corner) => corner !== tail)
      for (const corner of otherCorners) {
        expect.soft(tailRadius, `${label} chat bubble ${tail} is tighter than ${corner}`).toBeLessThan(parseFloat(await computed(page, bubble, corner)))
      }
    }

    const stepper = page.locator('[data-test="qds-stepper"]')
    await expect(stepper).toHaveClass(/q-stepper--vertical/)
    await expect(stepper.locator('.q-stepper__tab--done')).toHaveCount(2)
    await expect(stepper.locator('.q-stepper__tab--active')).toContainText('Components')
    await expect(stepper.locator('.q-stepper__tab--error')).toContainText('Native parity')
    await expect(page.locator('[data-test="qds-stepper-nav"]')).toBeVisible()
    const activeVerticalDot = stepper.locator('.q-stepper__tab--active .q-stepper__dot')
    await expect(activeVerticalDot).toBeVisible()
    expect.soft(await computed(page, '[data-test="qds-stepper"] .q-stepper__tab--active .q-stepper__dot', 'content', '::after'), 'active vertical connector is emitted by Quasar').toBe('""')
    expect.soft(await computed(page, '[data-test="qds-stepper"] .q-stepper__tab--active .q-stepper__dot', 'display', '::after'), 'active vertical connector is displayed').not.toBe('none')
    expect.soft(parseFloat(await computed(page, '[data-test="qds-stepper"] .q-stepper__tab--active .q-stepper__dot', 'width', '::after')), 'active vertical connector has native width').toBeGreaterThan(0)
    expect.soft(parseFloat(await computed(page, '[data-test="qds-stepper"] .q-stepper__tab--active .q-stepper__dot', 'height', '::after')), 'active vertical connector has native height').toBeGreaterThan(0)
    expect.soft(await computed(page, '[data-test="qds-stepper"] .q-stepper__tab--active .q-stepper__dot', 'background-color', '::after'), 'outgoing connector of the active step stays neutral').toBe(await tokenColor(page, '[data-test="qds-stepper"]', '--qds-stepper-rail'))
    const firstDoneDot = stepper.locator('.q-stepper__tab--done .q-stepper__dot').first()
    await expect(firstDoneDot).toBeVisible()
    expect.soft(await computed(page, '[data-test="qds-stepper"] .q-stepper__tab--done .q-stepper__dot', 'content', '::after'), 'done vertical connector is emitted by Quasar').toBe('""')
    expect.soft(await computed(page, '[data-test="qds-stepper"] .q-stepper__tab--done .q-stepper__dot', 'display', '::after'), 'done vertical connector is displayed').not.toBe('none')
    expect.soft(parseFloat(await computed(page, '[data-test="qds-stepper"] .q-stepper__tab--done .q-stepper__dot', 'width', '::after')), 'done vertical connector has native width').toBeGreaterThan(0)
    expect.soft(parseFloat(await computed(page, '[data-test="qds-stepper"] .q-stepper__tab--done .q-stepper__dot', 'height', '::after')), 'done vertical connector has native height').toBeGreaterThan(0)
    expect.soft(await computed(page, '[data-test="qds-stepper"] .q-stepper__tab--done .q-stepper__dot', 'background-color', '::after'), 'done vertical connector uses the positive rail color').toBe(await tokenColor(page, '[data-test="qds-stepper"]', '--qds-color-positive'))
    expect.soft(await computed(page, '[data-test="qds-stepper"] .q-stepper__tab--active .q-stepper__dot > span', 'color'), 'active marker glyph uses the primary on-fill foreground').toBe(await tokenColor(page, '[data-test="qds-stepper"]', '--qds-text-on-primary'))
    expect.soft(await computed(page, '[data-test="qds-stepper"] .q-stepper__tab--done .q-stepper__dot > span', 'color'), 'done marker glyph uses the positive on-fill foreground').toBe(await tokenColor(page, '[data-test="qds-stepper"]', '--qds-text-on-positive'))
    expect.soft(await computed(page, '[data-test="qds-stepper"] .q-stepper__tab--error .q-stepper__dot > span', 'color'), 'error marker glyph uses the negative on-fill foreground').toBe(await tokenColor(page, '[data-test="qds-stepper"]', '--qds-text-on-negative'))
    expect.soft(await computed(page, '[data-test="qds-stepper"] .q-stepper__tab--error .q-stepper__dot', 'background-color'), 'error marker uses the negative fill').toBe(await tokenColor(page, '[data-test="qds-stepper"]', '--qds-color-negative'))

    const horizontalStepper = page.locator('[data-test="qds-stepper-horizontal"]')
    await expect(horizontalStepper).toBeVisible()
    await expect(horizontalStepper).not.toHaveClass(/q-stepper--vertical/)
    await expect(horizontalStepper.locator('.q-stepper__tab--active')).toContainText('Review')
    await expect(horizontalStepper.locator('.q-stepper__tab--done')).toContainText('Published')
    await expect(horizontalStepper.locator('.q-stepper__tab--error')).toContainText('Resolve')
    await expect(horizontalStepper).toContainText('Queued')
    await expect(horizontalStepper.locator('.q-stepper__tab').filter({ hasText: 'Queued' })).not.toHaveClass(/q-stepper__tab--(?:active|done|error)/)
    await expect(page.locator('[data-test="qds-stepper-horizontal-nav"]')).toBeVisible()
    expect.soft(await computed(page, '[data-test="qds-stepper-horizontal"] .q-stepper__tab:not(.q-stepper__tab--active):not(.q-stepper__tab--done):not(.q-stepper__tab--error) .q-stepper__dot > span', 'color'), 'horizontal inactive marker glyph uses the muted foreground').toBe(await tokenColor(page, '[data-test="qds-stepper-horizontal"]', '--qds-text-muted'))
    expect.soft(await computed(page, '[data-test="qds-stepper-horizontal"] .q-stepper__tab--active .q-stepper__dot > span', 'color'), 'horizontal active marker glyph uses the primary on-fill foreground').toBe(await tokenColor(page, '[data-test="qds-stepper-horizontal"]', '--qds-text-on-primary'))
    expect.soft(await computed(page, '[data-test="qds-stepper-horizontal"] .q-stepper__tab--done .q-stepper__dot > span', 'color'), 'horizontal done marker glyph uses the positive on-fill foreground').toBe(await tokenColor(page, '[data-test="qds-stepper-horizontal"]', '--qds-text-on-positive'))
    expect.soft(await computed(page, '[data-test="qds-stepper-horizontal"] .q-stepper__tab--error .q-stepper__dot > span', 'color'), 'horizontal error marker glyph uses the negative on-fill foreground').toBe(await tokenColor(page, '[data-test="qds-stepper-horizontal"]', '--qds-text-on-negative'))
    const horizontalConnector = horizontalStepper.locator('.q-stepper__tab--active .q-stepper__label.q-stepper__line')
    await expect(horizontalConnector).toBeVisible()
    expect.soft(await computed(page, '[data-test="qds-stepper-horizontal"] .q-stepper__tab--active .q-stepper__label.q-stepper__line', 'display'), 'horizontal connector owner is rendered').not.toBe('none')
    expect.soft((await horizontalConnector.boundingBox())?.width ?? 0, 'horizontal connector owner has rendered width').toBeGreaterThan(0)
    expect.soft(await computed(page, '[data-test="qds-stepper-horizontal"] .q-stepper__tab--active .q-stepper__label.q-stepper__line', 'display', '::after'), 'horizontal connector is visible').not.toBe('none')
    expect.soft(parseFloat(await computed(page, '[data-test="qds-stepper-horizontal"] .q-stepper__tab--active .q-stepper__label.q-stepper__line', 'width', '::after')), 'horizontal connector has rendered length').toBeGreaterThan(0)
    expect.soft(await computed(page, '[data-test="qds-stepper-horizontal"] .q-stepper__tab--active .q-stepper__label.q-stepper__line', 'background-color', '::after'), 'horizontal outgoing connector of the active step stays neutral').toBe(await tokenColor(page, '[data-test="qds-stepper-horizontal"]', '--qds-stepper-rail'))
    expect.soft(await computed(page, '[data-test="qds-stepper-horizontal"] .q-stepper__tab--done .q-stepper__label.q-stepper__line', 'background-color', '::after'), 'horizontal done connector uses the positive rail color').toBe(await tokenColor(page, '[data-test="qds-stepper-horizontal"]', '--qds-color-positive'))
    const compactStepper = page.locator('[data-test="qds-stepper-compact"]')
    await expect(compactStepper).toHaveClass(/q-stepper--dark/)
    await expect(compactStepper.locator('.q-stepper__header')).toHaveClass(/q-stepper__header--contracted/)
    await expect(compactStepper.locator('.q-stepper__tab--active .q-stepper__dot')).toContainText('1')
    await expect(compactStepper.locator('.q-stepper__tab--done .q-stepper__dot')).toContainText('2')

    const timeline = page.locator('[data-test="qds-timeline"]')
    const denseTimeline = page.locator('[data-test="qds-timeline-dense"]')
    await expect(timeline).toHaveClass(/q-timeline--comfortable/)
    await expect(denseTimeline).toHaveClass(/q-timeline--dense/)
    await expect(timeline.locator('.q-timeline__entry')).toHaveCount(2)
    await expect(timeline.locator('.q-timeline__entry').first()).toHaveClass(/q-timeline__entry--left/)
    await expect(timeline.locator('.q-timeline__entry').last()).toHaveClass(/q-timeline__entry--right/)
    expect.soft(await computed(page, '[data-test="qds-timeline"] .q-timeline__title', 'color'), 'comfortable timeline title uses the strong foreground').toBe(await tokenColor(page, '[data-test="qds-timeline"]', '--qds-text-strong'))
    expect.soft(await computed(page, '[data-test="qds-timeline"] .q-timeline__subtitle', 'color'), 'comfortable timeline subtitle uses the muted foreground').toBe(await tokenColor(page, '[data-test="qds-timeline"]', '--qds-text-muted'))
    expect.soft(await computed(page, '[data-test="qds-timeline"] .q-timeline__entry--right .q-timeline__dot', 'background-color', '::before'), 'positive timeline dot keeps its hollow surface').toBe(await tokenColor(page, '[data-test="qds-timeline"]', '--qds-surface-0'))
    const primaryMarkerBackground = await computed(page, '[data-test="qds-timeline"] .q-timeline__dot', 'background-color', '::before')
    const primaryMarkerBorder = await computed(page, '[data-test="qds-timeline"] .q-timeline__dot', 'border-top-color', '::before')
    const primaryMarkerIcon = await computed(page, '[data-test="qds-timeline"] .q-timeline__dot > .q-icon', 'color')
    const positiveMarkerBackground = await computed(page, '[data-test="qds-timeline"] .q-timeline__entry--right .q-timeline__dot', 'background-color', '::before')
    const positiveMarkerBorder = await computed(page, '[data-test="qds-timeline"] .q-timeline__entry--right .q-timeline__dot', 'border-top-color', '::before')
    const positiveMarkerIcon = await computed(page, '[data-test="qds-timeline"] .q-timeline__entry--right .q-timeline__dot > .q-icon', 'color')
    expect.soft(wcagContrast(primaryMarkerBorder, primaryMarkerBackground), 'primary timeline marker border has at least 3:1 contrast').toBeGreaterThanOrEqual(3)
    expect.soft(wcagContrast(primaryMarkerIcon, primaryMarkerBackground), 'primary timeline marker icon has at least 3:1 contrast').toBeGreaterThanOrEqual(3)
    expect.soft(wcagContrast(positiveMarkerBorder, positiveMarkerBackground), 'positive timeline marker border has at least 3:1 contrast').toBeGreaterThanOrEqual(3)
    expect.soft(wcagContrast(positiveMarkerIcon, positiveMarkerBackground), 'positive timeline marker icon has at least 3:1 contrast').toBeGreaterThanOrEqual(3)
    expect.soft(await computed(page, '[data-test="qds-timeline"] .q-timeline__dot', 'background-color', '::after'), 'timeline rail uses the separator color').toBe(await tokenColor(page, '[data-test="qds-timeline"]', '--qds-timeline-rail'))
    expect.soft(await computed(page, '[data-test="qds-timeline-dense"] .q-timeline__content', 'color'), 'dense timeline content uses the base foreground').toBe(await tokenColor(page, '[data-test="qds-timeline-dense"]', '--qds-text'))

    const carousel = page.locator('[data-test="qds-carousel"]')
    await expect(carousel).toBeVisible()
    await expect(carousel.locator('.q-carousel__slide:not(.q-carousel__slide--hidden) .catalog-carousel-image')).toBeVisible()
    await expect(carousel.locator('.q-carousel__slide:not(.q-carousel__slide--hidden)')).toHaveCount(1)
    await expect(page.locator('.catalog-image').first().locator('img').first()).toHaveAttribute('alt', 'QDS gallery static media surface')
    await expect(
      carousel.locator('.q-carousel__slide:not(.q-carousel__slide--hidden) .catalog-carousel-image img').first(),
      'carousel image uses owned SVG data',
    ).toHaveAttribute('src', /^data:image\/svg\+xml/)
    await expect(carousel.locator('.q-carousel__slide:not(.q-carousel__slide--hidden) .catalog-carousel-image img').first()).toHaveAttribute('alt', 'Editorial surface: Paper-neutral surface with pastel role washes and charcoal type.')
    expect.soft(await computed(page, '[data-test="qds-carousel"]', 'border-radius'), 'carousel QDS radius').toBe(await customProperty(page, '--qds-card-radius'))
    await expect(page.locator('[data-test="qds-carousel-controls"]')).toBeVisible()
    await expect(page.getByLabel('Previous carousel slide')).toBeVisible()
    await expect(page.getByLabel('Next carousel slide')).toBeVisible()
    await expect(page.getByLabel('Show Editorial surface')).toHaveAttribute('aria-current', 'true')
    await expect(page.getByLabel('Show One radius')).toHaveAttribute('aria-pressed', 'false')
    expect.soft(await computed(page, '[data-test="qds-carousel-controls"] .q-btn', 'border-top-width'), 'custom carousel controls keep their QDS frame').toBe('1px')
    await page.getByLabel('Show One radius').click()
    await expect(carousel.getByText('One radius')).toBeVisible()
    await expect(carousel.getByText('Editorial surface')).not.toBeVisible()
    await expect(page.getByLabel('Show One radius')).toHaveAttribute('aria-current', 'true')
    await page.locator('[data-test="qds-carousel-fullscreen"]').click()
    await expect(carousel).toHaveClass(/fullscreen/)
    expect.soft(await computed(page, '[data-test="qds-carousel"]', 'background-color'), 'fullscreen carousel keeps its tokenized surface').toBe(await tokenColor(page, '[data-test="qds-carousel"]', '--qds-surface-1'))
    await page.locator('[data-test="qds-carousel-fullscreen"]').click()
    await expect(carousel).not.toHaveClass(/fullscreen/)
    const verticalCarousel = page.locator('[data-test="qds-carousel-vertical"]')
    await expect(verticalCarousel).toHaveClass(/q-carousel--with-padding/)
    await expect(verticalCarousel).toContainText('Vertical first panel')
    await page.getByLabel('Show second vertical panel').click()
    await expect(verticalCarousel).toContainText('Vertical second panel')
    await expect(page.getByLabel('Show second vertical panel')).toHaveAttribute('aria-current', 'true')

    await expect(page.locator('[data-test="qds-video"] iframe')).toHaveAttribute('src', /^data:text\/html/)
    expect.soft(await computed(page, '[data-test="qds-video"]', 'border-top-width'), 'QVideo is unframed unless qds-media--framed is set').toBe('0px')
    expect.soft(await computed(page, '[data-test="qds-video"]', 'border-top-left-radius'), 'QVideo clips to the card radius').toBe(await customProperty(page, '--qds-card-radius'))
    expect.soft(await computed(page, '[data-test="qds-video"]', 'overflow'), 'QVideo clips the embed to its radius').toBe('hidden')


    expect.soft(await computed(page, '[data-test="qds-scroll-area"]', 'overflow'), 'QScrollArea frame clips scrollbar overlap').toBe('hidden')
    expect.soft(await computed(page, '[data-test="qds-splitter"]', 'overflow'), 'QSplitter frame clips separator hitbox').toBe('hidden')
    expect.soft(await computed(page, '[data-test="qds-splitter"] > .q-splitter__separator', 'width'), 'QSplitter separator is the native 1px divider').toBe('1px')
    expect.soft(await computed(page, '[data-test="qds-splitter"] > .q-splitter__separator', 'background-color'), 'QSplitter separator uses the divider stroke').toBe(await resolvedColor(page, '--qds-stroke-divider'))
    expect.soft(await computed(page, '[data-test="qds-splitter"] > .q-splitter__separator', 'opacity', '::before'), 'QSplitter handle stays hidden at rest').toBe('0')

    // No Material Icons ligature text in custom controls (carousel, uploader, Fab)
    await expect(page.locator('[data-test="qds-carousel-controls"] .material-icons')).toHaveCount(0)
    await expect(page.locator('.catalog-uploader-header .material-icons')).toHaveCount(0)
    await expect(page.locator('.catalog-fab-stage .material-icons')).toHaveCount(0)
    await expect(page.locator('.qds-editor-proof .material-icons')).toHaveCount(0)

    for (const variant of ['fluent', 'ink', 'one', 'term'] as const) {
      await applyTheme(page, 'dark', variant)
      const sentContentFg = await computed(page, '[data-test="qds-chat-sent"] .q-message-text-content', 'color')
      const receivedContentFg = await computed(page, '[data-test="qds-chat-received"] .q-message-text-content', 'color')
      expect.soft(sentContentFg, `${variant} dark sent chat content inherits bubble foreground`).toBe(
        await computed(page, '[data-test="qds-chat-sent"] .q-message-text', 'color'),
      )
      expect.soft(receivedContentFg, `${variant} dark received chat content inherits bubble foreground`).toBe(
        await computed(page, '[data-test="qds-chat-received"] .q-message-text', 'color'),
      )
    }
  })

  test('complex media surfaces keep variant and dark proof coverage', async ({ page }) => {
    await page.goto('/')
    await gotoGalleryPage(page, 'Catalog')

    for (const variant of ['one', 'term'] as const) {
      await applyTheme(page, 'dark', variant)

      await expect(page.locator('[data-test="qds-timeline"]')).toBeVisible()
      await expect(page.locator('[data-test="qds-carousel"]')).toBeVisible()
      await expect(page.locator('[data-test="qds-scroll-area"]')).toBeVisible()
      await expect(page.locator('[data-test="qds-splitter"]')).toBeVisible()
      await expect(page.locator('[data-test="qds-editor"]')).toBeVisible()
      await expect(page.locator('[data-test="qds-uploader"]')).toBeVisible()
      await expect(page.locator('[data-test="qds-uploader-disabled"]')).toBeVisible()

      expect.soft(await computed(page, '[data-test="qds-carousel"]', 'border-radius'), `${variant} carousel radius`).toBe(EXPECTED_MEDIA_RADIUS[variant])
      await expectStepperErrorHalo(page, variant)
      expect.soft(await computed(page, '.qds-editor-proof', 'border-top-width'), `${variant} editor keeps framed chrome`).toBe('1px')
      expect.soft(await computed(page, '[data-test="qds-uploader"]', 'border-top-width'), `${variant} uploader keeps framed chrome`).toBe('1px')
      expect.soft(await computed(page, '[data-test="qds-uploader-disabled"]', 'opacity'), `${variant} disabled uploader state is softened`).toBe('0.6')
      expect.soft(await computed(page, '[data-test="qds-scroll-area"] .q-scrollarea__thumb', 'background-color'), `${variant} scroll thumb is themed`).not.toBe('rgba(0, 0, 0, 0)')
      expect.soft(await computed(page, '[data-test="qds-splitter"] > .q-splitter__separator', 'background-color', '::before'), `${variant} splitter handle is themed`).not.toBe('rgba(0, 0, 0, 0)')

      const carouselControls = page.locator('[data-test="qds-carousel-controls"]')
      const uploaderHeader = page.locator('.catalog-uploader-header')
      await expect(carouselControls.locator('.material-icons')).toHaveCount(0)
      await expect(uploaderHeader.locator('.material-icons')).toHaveCount(0)

      if (variant === 'term') {
        expect.soft(await computed(page, '.qds-editor-proof', 'font-family'), 'term editor uses monospace family').toContain('ui-monospace')
      }
    }
  })

  test('QImg loading and error slots retain tokenized, accessible state transitions', async ({ page }) => {
    let releaseLoading: (() => void) | undefined
    const loadingRoute = new Promise<void>(resolve => { releaseLoading = resolve })
    await page.route('**/qds-media-loading.svg', async route => {
      await loadingRoute
      await route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="9"/>' })
    })
    await page.route('**/qds-media-error.svg', route => route.abort())
    await page.goto('/')
    await gotoGalleryPage(page, 'Catalog')
    await applyTheme(page, 'light', 'fluent')
    await expect(page.locator('[data-test="qds-img-loading"]')).toHaveAttribute('aria-label', 'Loading media preview')
    await expect(page.locator('[data-test="qds-img-error"]')).toHaveAttribute('aria-label', 'Unavailable media preview')
    await expect(page.locator('[data-test="qds-img-loading-state"]')).toBeVisible()
    await expect(page.locator('[data-test="qds-img-error-state"]')).toBeVisible()
    expect.soft(await computed(page, '[data-test="qds-img-loading"] .q-img__loading', 'background-color'), 'QImg loading slot uses the surface').toBe(await tokenColor(page, '[data-test="qds-img-loading"]', '--qds-surface-1'))
    releaseLoading?.()
    expect.soft(await computed(page, '[data-test="qds-img-error"] .q-img__content', 'color'), 'QImg error slot uses the muted foreground').toBe(await tokenColor(page, '[data-test="qds-img-error"]', '--qds-text-muted'))
    await expect(page.locator('[data-test="qds-img-loading-state"]')).toHaveCount(0)
  })

  test('complex media respects RTL direction and reduced-motion preferences', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await gotoGalleryPage(page, 'Catalog')
    const originalRtl = await getComplexMediaRtl(page)

    try {
      expect(await setComplexMediaRtl(page, true), 'Quasar language runtime accepts RTL').toBe(true)
      await expect.poll(() => getComplexMediaRtl(page)).toBe(true)
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
      await expect(page.locator('[data-test="qds-stepper"]')).toHaveClass(/q-stepper--vertical/)
      await expect(page.locator('[data-test="qds-carousel-vertical"]')).toBeVisible()
      await expect(page.locator('[data-test="qds-timeline"]')).toBeVisible()
      await expect(page.locator('[data-test="qds-editor"]')).toBeVisible()
      await expect(page.locator('[data-test="qds-img-loading"]')).toBeVisible()
      const rtlVerticalConnector = page.locator('[data-test="qds-stepper"] .q-stepper__tab--active .q-stepper__dot')
      await expect(rtlVerticalConnector).toBeVisible()
      expect.soft(await computed(page, '[data-test="qds-stepper"] .q-stepper__tab--active .q-stepper__dot', 'display', '::after'), 'Quasar RTL runtime keeps the native vertical connector visible').not.toBe('none')
      expect.soft(parseFloat(await computed(page, '[data-test="qds-stepper"] .q-stepper__tab--active .q-stepper__dot', 'height', '::after')), 'RTL vertical connector keeps native geometry').toBeGreaterThan(0)
      expect.soft(parseFloat(await computed(page, '[data-test="qds-carousel"] .q-carousel__slide', 'transition-duration')), 'reduced motion reduces carousel transition duration').toBeLessThanOrEqual(0.001)
    } finally {
      await setComplexMediaRtl(page, originalRtl)
      await expect.poll(() => getComplexMediaRtl(page)).toBe(originalRtl)
    }
  })

  test('QUploader exposes deterministic queued, progress, error, and uploaded states', async ({ page }) => {
    await page.goto('/')
    await gotoGalleryPage(page, 'Catalog')
    await applyTheme(page, 'light', 'fluent')

    const uploader = page.locator('[data-test="qds-uploader"]')
    await expect(uploader.locator('.q-uploader__file')).toHaveCount(4)

    const queued = uploader.locator('.q-uploader__file').filter({ hasText: 'media-queued.txt' })
    const progress = uploader.locator('.q-uploader__file').filter({ hasText: 'media-progress.bin' })
    const failed = uploader.locator('.q-uploader__file').filter({ hasText: 'media-error.txt' })
    const uploaded = uploader.locator('.q-uploader__file').filter({ hasText: 'media-uploaded.txt' })

    await expect(queued).toContainText('0.00%')
    await expect(progress.locator('.q-circular-progress')).toBeVisible()
    await expect(progress).toContainText(/58\.0\d%/)
    await expect(failed).toHaveClass(/q-uploader__file--failed/)
    await expect(failed.locator('.q-uploader__file-status')).toBeVisible()
    await expect(uploaded).toHaveClass(/q-uploader__file--uploaded/)
    await expect(uploaded).toContainText('100.00%')

    await expect(uploader.locator('[data-test="qds-uploader-add"]')).toBeVisible()
    await expect(uploader.locator('[data-test="qds-uploader-upload"]')).toBeEnabled()
    await expect(uploader.locator('[data-test="qds-uploader-clear"]')).toBeEnabled()
    await expect(queued.locator('.q-btn').first(), 'queued file exposes remove affordance').toBeVisible()
    await expect(page.locator('[data-test="qds-uploader-disabled"]')).toHaveClass(/disabled/)
  })

  test('QEditor exposes focused and dropdown toolbar states', async ({ page }) => {
    await page.goto('/')
    await gotoGalleryPage(page, 'Catalog')
    await applyTheme(page, 'light', 'fluent')

    const editor = page.locator('.qds-editor-proof')
    await page.focus('.qds-editor-proof .q-editor__content')
    expect.soft(await computed(page, '.qds-editor-proof', 'border-top-color'), 'focused editor receives QDS focus border').toBe(await resolvedColor(page, '--qds-color-primary'))
    await expect(editor.locator('.q-btn-dropdown')).toHaveCount(2)

    await editor.locator('.q-btn-dropdown').first().click()
    await expect(page.locator('.q-menu').first()).toBeVisible()
    await page.keyboard.press('Escape')

    const readonlyEditor = page.locator('.qds-editor-proof-readonly')
    await expect(readonlyEditor).toBeVisible()
    await expect(readonlyEditor.locator('.q-editor__content')).toHaveAttribute('contenteditable', 'false')
    expect.soft(await computed(page, '.qds-editor-proof-readonly', 'background-color'), 'read-only editor keeps the tokenized surface').toBe(await tokenColor(page, '.qds-editor-proof-readonly', '--qds-surface-0'))

    await editor.locator('.q-editor__toolbar .q-btn').last().click()
    await expect(editor).toHaveClass(/fullscreen/)
    expect.soft(await computed(page, '.qds-editor-proof', 'background-color'), 'fullscreen editor keeps the tokenized surface').toBe(await tokenColor(page, '.qds-editor-proof', '--qds-surface-0'))
    await editor.locator('.q-editor__toolbar .q-btn').last().click()
    await expect(editor).not.toHaveClass(/fullscreen/)
  })

  test('complex and media fixtures preserve canonical variant proof in light and dark', async ({ page }) => {
    test.setTimeout(60_000)
    await page.goto('/#catalog')
    for (const mode of ['light', 'dark'] as const) {
      for (const variant of ['fluent', 'ink', 'one', 'term'] as const) {
        await applyTheme(page, mode, variant)
        await expect(page.locator('[data-test="qds-stepper"]')).toBeVisible()
        await expect(page.locator('[data-test="qds-timeline"]')).toBeVisible()
        await expect(page.locator('[data-test="qds-timeline-dense"]')).toBeVisible()
        await expect(page.locator('[data-test="qds-carousel"]')).toBeVisible()
        await expect(page.locator('[data-test="qds-editor"]')).toBeVisible()
        await expect(page.locator('[data-test="qds-uploader"]')).toBeVisible()
        expect.soft(await computed(page, '[data-test="qds-carousel"]', 'border-radius'), `${mode}/${variant} carousel geometry`).toBe(variant === 'one' ? '24px' : variant === 'ink' ? '16px' : variant === 'term' ? '10px' : await customProperty(page, '--qds-card-radius'))
        expect.soft(await computed(page, '[data-test="qds-timeline"] .q-timeline__subtitle', 'color'), `${mode}/${variant} timeline subtitle foreground`).toBe(await tokenColor(page, '[data-test="qds-timeline"]', '--qds-text-muted'))
        expect.soft(await computed(page, '[data-test="qds-timeline-dense"] .q-timeline__dot', 'background-color', '::after'), `${mode}/${variant} dense timeline rail`).toBe(await tokenColor(page, '[data-test="qds-timeline-dense"]', '--qds-timeline-rail'))
        const primaryMarker = '[data-test="qds-timeline"] .q-timeline__entry--left .q-timeline__dot'
        const positiveMarker = '[data-test="qds-timeline"] .q-timeline__entry--right .q-timeline__dot'
        const surface = await tokenColor(page, '[data-test="qds-timeline"]', '--qds-surface-0')
        await expect
          .poll(async () => {
            const [primaryTimelineBg, positiveTimelineBg] = await Promise.all([
              computed(page, primaryMarker, 'background-color', '::before'),
              computed(page, positiveMarker, 'background-color', '::before'),
            ])
            return [primaryTimelineBg, positiveTimelineBg]
          }, { timeout: 3000 })
          .toEqual([surface, surface])
        const primaryBackground = await computed(page, primaryMarker, 'background-color', '::before')
        const primaryBorder = await computed(page, primaryMarker, 'border-top-color', '::before')
        const primaryIcon = await computed(page, `${primaryMarker} > .q-icon`, 'color')
        const positiveBackground = await computed(page, positiveMarker, 'background-color', '::before')
        const positiveBorder = await computed(page, positiveMarker, 'border-top-color', '::before')
        const positiveIcon = await computed(page, `${positiveMarker} > .q-icon`, 'color')
        expect.soft(primaryBackground, `${mode}/${variant} primary marker stays hollow`).toBe(surface)
        expect.soft(positiveBackground, `${mode}/${variant} positive marker stays hollow`).toBe(surface)
        expect.soft(wcagContrast(primaryBorder, primaryBackground), `${mode}/${variant} primary marker border contrast`).toBeGreaterThanOrEqual(3)
        expect.soft(wcagContrast(primaryIcon, primaryBackground), `${mode}/${variant} primary marker icon contrast`).toBeGreaterThanOrEqual(3)
        expect.soft(wcagContrast(positiveBorder, positiveBackground), `${mode}/${variant} positive marker border contrast`).toBeGreaterThanOrEqual(3)
        expect.soft(wcagContrast(positiveIcon, positiveBackground), `${mode}/${variant} positive marker icon contrast`).toBeGreaterThanOrEqual(3)
        expect.soft(await computed(page, '[data-test="qds-uploader"]', 'border-top-color'), `${mode}/${variant} uploader surface boundary`).not.toBe('rgba(0, 0, 0, 0)')
        await expectStepperErrorHalo(page, `${mode}/${variant}`)
        if (variant === 'ink') {
          expect.soft(await computed(page, '.qds-editor-proof', 'box-shadow'), `${mode}/Ink editor is matte`).toBe('none')
        }
        if (variant === 'one') {
          expect.soft(await computed(page, '.qds-editor-proof', 'background-color'), `${mode}/One editor is grouped on a visible surface`).not.toBe('rgba(0, 0, 0, 0)')
        }
      }
    }
  })
})
