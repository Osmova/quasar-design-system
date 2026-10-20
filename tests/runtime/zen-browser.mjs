// Computed-paint proof for the Zen pilot: real Quasar controls, the real
// compiled QDS bundle, and measured contrast. Nothing here is judged by eye and
// nothing here claims anything about physical e-paper hardware.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { compile } from 'sass'
import { contrast } from './shadcn-fixtures.mjs'

const root = new URL('../../', import.meta.url)
const require = createRequire(import.meta.url)
const galleryRequire = createRequire(new URL('examples/gallery/package.json', root))
let chromium
try { ({ chromium } = galleryRequire('@playwright/test')) }
catch (cause) {
  throw new Error('The Zen browser proof requires the full pnpm workspace install (including examples/gallery). Run pnpm install --frozen-lockfile, then pnpm -C examples/gallery exec playwright install chromium.', { cause })
}

const assets = {
  vue: readFileSync(require.resolve('vue/dist/vue.global.prod.js'), 'utf8'),
  quasar: readFileSync(require.resolve('quasar/dist/quasar.umd.prod.js'), 'utf8'),
  quasarCss: readFileSync(require.resolve('quasar/dist/quasar.prod.css'), 'utf8'),
  // Sass emits a BOM and @charset, which are valid in a served stylesheet but
  // invalidate the first at-rule when the same bytes are injected into <style>;
  // without stripping them the whole :root token block is silently dropped.
  qds: compile(new URL('src/css/index.scss', root).pathname, {
    style: 'compressed', loadPaths: [new URL('node_modules/', root).pathname], silenceDeprecations: ['if-function'],
  }).css.replace(/^\uFEFF/, '').replace(/^@charset "[^"]*";/, ''),
}

const fixture = `body { margin: 24px; } #app { width: 560px; display: grid; gap: 24px; }
  *, *::before, *::after { transition: none !important; animation: none !important; }`

// Chrome serializes a resolved color-mix() as `color(srgb r g b / a)` with 0..1
// components, and everything else as rgb()/rgba() bytes. Both must land on the
// same 0..255 scale before any contrast number means anything.
const rgb = (value) => {
  const numbers = value.match(/[\d.]+/g)?.map(Number)
  assert.ok(numbers && numbers.length >= 3, `expected a resolved paint, got ${value}`)
  const scale = value.startsWith('color(') ? 255 : 1
  return [numbers[0] * scale, numbers[1] * scale, numbers[2] * scale, numbers[3] ?? 1]
}
const opaque = (value, context) => {
  const paint = rgb(value)
  assert.equal(paint[3], 1, `${context} must paint an opaque fill, got ${value}`)
  return paint
}

async function mount(browser, bodyClass) {
  const page = await browser.newPage({ viewport: { width: 900, height: 900 }, reducedMotion: 'reduce' })
  await page.setContent(`<style>${assets.quasarCss}</style><style>${assets.qds}</style><style>${fixture}</style>`
    + `<body class="${bodyClass}"><div id="app"></div></body>`)
  await page.addScriptTag({ content: assets.vue })
  await page.addScriptTag({ content: assets.quasar })
  await page.evaluate(() => {
    const { createApp, h, reactive, nextTick } = Vue
    const { QBtn, QInput, QTabs, QTab, QMenu, QList, QItem, QItemSection, QSeparator } = Quasar
    const state = reactive({ value: 'Zen', tab: 'a', menu: false, error: false })
    const app = createApp({ setup: () => () => [
      h('div', { style: 'display:flex;gap:16px;flex-wrap:wrap' }, [
        h(QBtn, { id: 'button', label: 'Action' }),
        h(QBtn, { id: 'disabled', label: 'Disabled', disable: true }),
        ...['primary', 'secondary', 'accent', 'positive', 'negative', 'warning', 'info']
          .map((role) => h(QBtn, { id: `fill-${role}`, class: 'role-fill', label: role, color: role })),
      ]),
      h(QInput, { id: 'field', modelValue: state.value, 'onUpdate:modelValue': (v) => { state.value = v },
        label: 'Reading label', outlined: true, hint: 'Zen help', error: state.error, errorMessage: 'Zen error' }),
      h(QTabs, { id: 'tabs', modelValue: state.tab, 'onUpdate:modelValue': (v) => { state.tab = v } },
        () => ['a', 'b', 'c'].map((name) => h(QTab, { name, label: `Tab ${name}` }))),
      h(QBtn, { id: 'anchor', label: 'Menu', onClick: () => { state.menu = true } }, () => h(QMenu, {
        id: 'menu', noParentEvent: true, modelValue: state.menu, 'onUpdate:modelValue': (v) => { state.menu = v }, transitionDuration: 0,
      }, () => h(QList, {}, () => [
        h(QItem, { id: 'item', clickable: true, active: true }, () => h(QItemSection, {}, () => 'Zen item')),
        h(QSeparator, { id: 'separator' }),
      ]))),
    ] })
    app.use(Quasar)
    app.mount('#app')
    window.zen = { state, async set(values) { Object.assign(state, values); await nextTick() }, dispose() { app.unmount() } }
  })
  return page
}

const read = (page, selector, properties) => page.evaluate(([target, names]) => {
  const element = document.querySelector(target)
  if (!element) return null
  const computed = getComputedStyle(element)
  return Object.fromEntries(names.map((name) => [name, computed.getPropertyValue(name)]))
}, [selector, properties])

const PAINT = ['color', 'background-color', 'border-top-width', 'border-top-color', 'border-top-style', 'box-shadow', 'outline-width', 'outline-color', 'font-weight']

async function observe(page) {
  await page.evaluate(() => window.zen.set({ menu: true }))
  await page.waitForSelector('.q-menu', { state: 'visible' })
  const samples = {}
  for (const [name, selector] of [
    ['button', '#button'], ['filled', '#fill-primary'], ['disabled', '#disabled'],
    ['field', '.q-field__control'], ['tabsTrack', '.q-tabs'],
    ['tabActive', '.q-tab--active'], ['tabIdle', '.q-tab:not(.q-tab--active)'],
    ['menu', '.q-menu'], ['menuItem', '.q-menu .q-item--active'],
  ]) samples[name] = await read(page, selector, PAINT)
  samples.activeLabel = await read(page, '.q-tab--active .q-tab__label', ['font-weight'])
  samples.idleLabel = await read(page, '.q-tab:not(.q-tab--active) .q-tab__label', ['font-weight'])
  samples.indicator = await read(page, '.q-tab--active .q-tab__indicator', ['display'])
  samples.fieldAfter = await page.evaluate(() => getComputedStyle(document.querySelector('.q-field__control'), '::after').content)
  samples.page = await read(page, 'body', ['background-color', 'color'])
  await page.evaluate(() => window.zen.set({ menu: false }))
  return samples
}

const results = []
const record = (scheme, label, ratio, minimum) => {
  results.push({ scheme, label, contrast: Number(ratio.toFixed(3)), minimum })
  assert.ok(ratio >= minimum, `${scheme} ${label}: computed contrast ${ratio.toFixed(3)} < ${minimum}`)
}

const browser = await chromium.launch()
try {
  for (const [scheme, bodyClass] of [['light', 'qds-ui qds-variant-zen'], ['dark', 'qds-ui qds-variant-zen qds-theme-dark']]) {
    const page = await mount(browser, bodyClass)
    try {
      const paint = await observe(page)

      // Text legibility on the real painted control fills.
      for (const [label, sample, backdrop] of [
        ['button label', paint.button, paint.button],
        ['field text', paint.field, paint.field],
        ['active tab label', paint.tabActive, paint.tabActive],
        ['idle tab label', paint.tabIdle, paint.tabsTrack],
        ['menu item', paint.menuItem, paint.menuItem],
      ]) {
        const fill = opaque(backdrop['background-color'], `${scheme} ${label}`)
        record(scheme, label, contrast(rgb(sample.color), fill), 4.5)
      }

      // Every role fill, in every interactive state the profile can reach, is
      // measured against the on-fill text actually painted on it. Pressed is
      // held with a real pointer because Chromium cannot be asked for :active.
      for (const role of ['primary', 'secondary', 'accent', 'positive', 'negative', 'warning', 'info']) {
        const selector = `#fill-${role}`
        const rest = await read(page, selector, PAINT)
        record(scheme, `${role} fill rest`, contrast(rgb(rest.color), opaque(rest['background-color'], `${scheme} ${role} rest`)), 4.5)
        record(scheme, `${role} fill vs page`, contrast(opaque(rest['background-color'], `${scheme} ${role}`), opaque(paint.page['background-color'], `${scheme} page`)), 3)

        await page.hover(selector)
        const hover = await read(page, selector, PAINT)
        record(scheme, `${role} fill hover`, contrast(rgb(hover.color), opaque(hover['background-color'], `${scheme} ${role} hover`)), 4.5)

        const box = await page.locator(selector).boundingBox()
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
        await page.mouse.down()
        const pressed = await read(page, selector, PAINT)
        await page.mouse.up()
        assert.notEqual(pressed['background-color'], rest['background-color'], `${scheme} ${role} must repaint when pressed`)
        record(scheme, `${role} fill pressed`, contrast(rgb(pressed.color), opaque(pressed['background-color'], `${scheme} ${role} pressed`)), 4.5)
      }
      await page.mouse.move(0, 0)

      // Selected states carry text contrast too, not just a tint.
      record(scheme, 'selected tab label', contrast(rgb(paint.tabActive.color), opaque(paint.tabActive['background-color'], `${scheme} selected tab`)), 4.5)
      record(scheme, 'selected menu item', contrast(rgb(paint.menuItem.color), opaque(paint.menuItem['background-color'], `${scheme} selected item`)), 4.5)

      // Disabled text is exempt from WCAG 1.4.3, so it is measured and reported
      // at the 3:1 non-text floor rather than silently skipped.
      record(scheme, 'disabled button label', contrast(rgb(paint.disabled.color), opaque(paint.page['background-color'], `${scheme} disabled`)), 3)

      // Essential boundaries: a real, visible stroke on every pilot control,
      // measured against the surface behind it, never shadow or colour alone.
      for (const [label, sample, behind] of [
        ['button boundary', paint.button, paint.page],
        ['field boundary', paint.field, paint.page],
        ['tabs track boundary', paint.tabsTrack, paint.page],
        ['active tab boundary', paint.tabActive, paint.tabsTrack],
        ['menu boundary', paint.menu, paint.page],
        ['active menu item boundary', paint.menuItem, paint.menu],
      ]) {
        assert.ok(parseFloat(sample['border-top-width']) >= 1, `${scheme} ${label}: no boundary, width ${sample['border-top-width']}`)
        assert.notEqual(sample['border-top-style'], 'none', `${scheme} ${label} boundary style`)
        record(scheme, label, contrast(rgb(sample['border-top-color']), opaque(behind['background-color'], `${scheme} ${label}`)), 3)
      }

      // Gentle raised/recessed depth is present, and the active tab is enclosed
      // and heavier so it never depends on the shadow to read.
      assert.notEqual(paint.button['box-shadow'], 'none', `${scheme} button keeps gentle raised depth`)
      assert.match(paint.field['box-shadow'], /inset/, `${scheme} field keeps a recessed well`)
      assert.match(paint.tabsTrack['box-shadow'], /inset/, `${scheme} tabs track keeps a recessed well`)
      assert.equal(paint.indicator.display, 'none', `${scheme} Zen uses no tab rail`)
      assert.equal(paint.fieldAfter, 'none', `${scheme} Zen paints no field focus bar`)
      assert.ok(Number(paint.activeLabel['font-weight']) > Number(paint.idleLabel['font-weight']), `${scheme} active tab carries a non-colour weight cue (${paint.activeLabel['font-weight']} vs ${paint.idleLabel['font-weight']})`)

      // Focus rings the whole control instead of underlining it.
      await page.focus('.q-field input')
      const focused = await read(page, '.q-field--focused .q-field__control', ['outline-width', 'outline-color', 'border-top-color'])
      assert.ok(parseFloat(focused['outline-width']) >= 1, `${scheme} field focus ring width ${focused['outline-width']}`)
      record(scheme, 'field focus ring', contrast(rgb(focused['outline-color']), opaque(paint.field['background-color'], `${scheme} focus`)), 3)

      // Error state never falls back to Quasar's native #c10015.
      await page.evaluate(() => window.zen.set({ error: true }))
      const error = await read(page, '.q-field--error .q-field__control', ['border-top-color'])
      assert.notDeepEqual(rgb(error['border-top-color']).slice(0, 3), [193, 0, 21], `${scheme} field error must not use the native #c10015`)
      record(scheme, 'field error boundary', contrast(rgb(error['border-top-color']), opaque(paint.field['background-color'], `${scheme} error`)), 3)
    } finally { await page.close() }
  }

  // Reading presentation: decorative depth and motion gone, boundaries intact.
  for (const [scheme, bodyClass] of [['light', 'qds-ui qds-variant-zen qds-reading'], ['dark', 'qds-ui qds-variant-zen qds-theme-dark qds-reading']]) {
    const page = await mount(browser, bodyClass)
    try {
      const paint = await observe(page)
      for (const [label, sample] of [['button', paint.button], ['field', paint.field], ['tabs track', paint.tabsTrack], ['active tab', paint.tabActive], ['menu', paint.menu]]) {
        assert.equal(sample['box-shadow'], 'none', `reading ${scheme} ${label} must drop decorative depth`)
        assert.ok(parseFloat(sample['border-top-width']) >= 1, `reading ${scheme} ${label} must keep its boundary`)
        opaque(sample['background-color'], `reading ${scheme} ${label}`)
      }
      assert.ok(Number(paint.activeLabel['font-weight']) > Number(paint.idleLabel['font-weight']), `reading ${scheme} active tab keeps its weight cue`)
      // observe() closes the menu again, so reopen it before probing the portal.
      await page.evaluate(() => window.zen.set({ menu: true }))
      await page.waitForSelector('.q-menu', { state: 'visible' })
      const motion = await page.evaluate(() => ['#button', '.q-field__control', '.q-tab', '.q-menu'].map((selector) => {
        const computed = getComputedStyle(document.querySelector(selector))
        return `${computed.transitionProperty}/${computed.animationName}`
      }))
      for (const entry of motion) assert.equal(entry, 'none/none', `reading ${scheme} must remove motion, got ${entry}`)
    } finally { await page.close() }
  }
} finally { await browser.close() }

console.log(JSON.stringify({ observations: results.length, minimum: Math.min(...results.map((r) => r.contrast)), results }, null, 2))
console.log(`Zen browser proof PASS: ${results.length} computed contrast observations across light/dark, plus reading-mode depth, motion, boundary and opacity checks.`)
