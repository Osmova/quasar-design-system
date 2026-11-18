// Computed-paint proof for the Ink pilot: real Quasar controls, the real compiled
// QDS bundle, measured contrast and the pen grammar's structural promises.
// INK_SHOTS=<dir> also writes the light/dark review boards there.
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
  throw new Error('The Ink browser proof requires the full pnpm workspace install (including examples/gallery). Run pnpm install --frozen-lockfile, then pnpm -C examples/gallery exec playwright install chromium.', { cause })
}

const fontsDir = new URL('src/fonts/', root)
const fontFaces = readFileSync(new URL('ink.css', fontsDir), 'utf8')
  .replace(/url\('\.\/files\/([^']+)'\)/g, (_, file) => `url(data:font/woff2;base64,${readFileSync(new URL(`files/${file}`, fontsDir)).toString('base64')})`)

const assets = {
  vue: readFileSync(require.resolve('vue/dist/vue.global.prod.js'), 'utf8'),
  quasar: readFileSync(require.resolve('quasar/dist/quasar.umd.prod.js'), 'utf8'),
  quasarCss: readFileSync(require.resolve('quasar/dist/quasar.prod.css'), 'utf8'),
  // Sass emits a BOM and @charset; injected into <style> they drop the first at-rule.
  qds: compile(new URL('src/css/index.scss', root).pathname, {
    style: 'compressed', loadPaths: [new URL('node_modules/', root).pathname], silenceDeprecations: ['if-function'],
  }).css.replace(/^﻿/, '').replace(/^@charset "[^"]*";/, ''),
}

const fixture = `body { margin: 0; padding: 28px 32px 48px; background: var(--qds-surface-1); }
  #app { width: 900px; display: grid; gap: 22px; }
  .row { display: flex; gap: 14px; flex-wrap: wrap; align-items: center; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px 20px; }
  h2 { margin: 0; font-size: 2rem; line-height: 1.1; }
  h6 { margin: 0 0 -8px; font-size: 0.8125rem; color: var(--qds-fg-muted); }
  .note { margin: 0; max-width: 640px; font-size: 0.9375rem; line-height: 1.55; color: var(--qds-fg-default); }
  .split { display: grid; grid-template-columns: 1fr 220px; gap: 24px; align-items: start; }`

const roles = ['primary', 'secondary', 'accent', 'positive', 'negative', 'warning', 'info']

async function mount(browser, bodyClass, options = {}) {
  const page = await browser.newPage({ viewport: { width: 964, height: 1100 }, reducedMotion: options.reducedMotion ?? 'reduce', forcedColors: options.forcedColors ?? 'none' })
  await page.setContent(`<style>${fontFaces}</style><style>${assets.quasarCss}</style><style>${assets.qds}</style><style>${fixture}</style>`
    + `<body class="${bodyClass}"><div id="app"></div></body>`)
  await page.addScriptTag({ content: assets.vue })
  await page.addScriptTag({ content: assets.quasar })
  await page.evaluate((roleNames) => {
    const { createApp, h, reactive, nextTick } = Vue
    const { QBtn, QInput, QTabs, QTab, QMenu, QList, QItem, QItemSection, QItemLabel, QSeparator } = Quasar
    const state = reactive({ value: 'Ruled paper', tab: 'notes', side: 'pens', menu: false, error: false })
    const field = (id, props) => h('div', { id }, h(QInput, { modelValue: state.value, 'onUpdate:modelValue': (v) => { state.value = v }, ...props }))
    const app = createApp({ setup: () => () => [
      h('h2', 'Field notes'),
      h('p', { class: 'note' }, 'Reading text stays in a plain, legible face on clean paper. Handwriting is kept for short labels, and every edge is a drawn line.'),
      h('h6', 'Buttons'),
      h('div', { class: 'row' }, [
        h(QBtn, { id: 'button', label: 'Default', noCaps: true }),
        h(QBtn, { id: 'outline', label: 'Outline', outline: true }),
        h(QBtn, { id: 'flat', label: 'Flat', flat: true, color: 'primary' }),
        h(QBtn, { id: 'round', label: '+', round: true, color: 'primary' }),
        h(QBtn, { id: 'round-outline', label: '✓', round: true, outline: true }),
        h(QBtn, { id: 'dense', label: 'Dense', dense: true }),
        h(QBtn, { id: 'disabled', label: 'Disabled', disable: true }),
      ]),
      h('div', { class: 'row' }, roleNames.map((role) => h(QBtn, { id: `fill-${role}`, label: role, color: role, unelevated: true }))),
      h('h6', 'Fields'),
      h('div', { class: 'grid' }, [
        field('field', { label: 'Outlined', outlined: true, hint: 'Helper text' }),
        field('filled', { label: 'Filled', filled: true }),
        field('standard', { label: 'Standard' }),
        field('error-field', { label: 'With error', outlined: true, error: true, errorMessage: 'Required field', noErrorIcon: true }),
        field('readonly', { label: 'Read only', outlined: true, readonly: true }),
        field('disabled-field', { label: 'Disabled', outlined: true, disable: true }),
      ]),
      h('h6', 'Tabs & menu'),
      h('div', { class: 'split' }, [
        h('div', { style: 'display:grid;gap:18px' }, [
          h('div', { id: 'tabs' }, h(QTabs, { modelValue: state.tab, 'onUpdate:modelValue': (v) => { state.tab = v }, align: 'left' },
            () => [['overview', 'Overview'], ['notes', 'Notes'], ['sketches', 'Sketches'], ['archive', 'Archive']].map(([name, label]) => h(QTab, { name, label, disable: name === 'archive' })))),
          h('div', { id: 'vtabs' }, h(QTabs, { vertical: true, modelValue: state.side, 'onUpdate:modelValue': (v) => { state.side = v }, style: 'width:200px' },
            () => [['pens', 'Pens'], ['paper', 'Paper'], ['ink', 'Ink wells']].map(([name, label]) => h(QTab, { name, label })))),
        ]),
        h(QBtn, { id: 'anchor', label: 'Open menu', outline: true, onClick: () => { state.menu = true } }, () => h(QMenu, {
          id: 'menu', noParentEvent: true, modelValue: state.menu, 'onUpdate:modelValue': (v) => { state.menu = v }, transitionDuration: 0, anchor: 'bottom left', self: 'top left', offset: [0, 10],
        }, () => h(QList, { style: 'min-width:220px' }, () => [
          h(QItemLabel, { header: true }, () => 'Notebook'),
          h(QItem, { id: 'item', clickable: true, active: true }, () => h(QItemSection, {}, () => 'Current page')),
          h(QItem, { id: 'idle-item', clickable: true }, () => h(QItemSection, {}, () => 'Duplicate')),
          h(QItem, { clickable: true }, () => h(QItemSection, {}, () => 'Export as PDF')),
          h(QSeparator, { id: 'separator' }),
          h(QItem, { clickable: true, disable: true }, () => h(QItemSection, {}, () => 'Tear out')),
        ]))),
      ]),
    ] })
    app.use(Quasar)
    app.mount('#app')
    window.ink = { state, async set(values) { Object.assign(state, values); await nextTick() } }
  }, roles)
  await page.evaluate(() => document.fonts.ready)
  return page
}

const read = (page, selector, properties, pseudo = null) => page.evaluate(([target, names, pseudoElement]) => {
  const element = document.querySelector(target)
  if (!element) return null
  const computed = getComputedStyle(element, pseudoElement)
  return Object.fromEntries(names.map((name) => [name, computed.getPropertyValue(name)]))
}, [selector, properties, pseudo])

// Chrome serializes a resolved color-mix() as `color(srgb r g b / a)` with 0..1 components.
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
const over = (top, bottom) => top.slice(0, 3).map((channel, i) => channel * top[3] + bottom[i] * (1 - top[3])).concat(1)
// The pressed hatch is 1px lines of the current ink at 16% over the face.
const hatchLine = (ink, face) => over([...ink.slice(0, 3), 0.16], face)

const PAINT = ['color', 'background-color', 'border-top-width', 'border-top-color', 'border-top-style', 'box-shadow', 'outline-width', 'outline-color', 'outline-style', 'font-family', 'transition-property']

const results = []
const record = (scheme, label, ratio, minimum) => {
  results.push({ scheme, label, contrast: Number(ratio.toFixed(3)), minimum })
  assert.ok(ratio >= minimum, `${scheme} ${label}: computed contrast ${ratio.toFixed(3)} < ${minimum}`)
}
const noBlur = (shadow, context) => {
  for (const layer of shadow === 'none' ? [] : shadow.split(/,(?![^(]*\))/)) {
    const lengths = layer.replace(/(rgba?|color)\([^)]*\)/g, '').match(/-?[\d.]+px/g) ?? []
    assert.ok(!lengths[2] || parseFloat(lengths[2]) === 0, `${context}: ink never blurs depth, got ${shadow}`)
  }
}

const shots = process.env.INK_SHOTS
const browser = await chromium.launch()
try {
  for (const [scheme, bodyClass] of [['light', 'qds-ui qds-variant-ink qds-theme-light'], ['dark', 'qds-ui qds-variant-ink qds-theme-dark body--dark']]) {
    const page = await mount(browser, bodyClass)
    try {
      const pageFill = opaque((await read(page, 'body', ['background-color']))['background-color'], `${scheme} page`)
      await page.evaluate(() => window.ink.set({ menu: true }))
      await page.waitForSelector('.q-menu', { state: 'visible' })
      if (shots) await page.screenshot({ path: `${shots}/pilot-${scheme}-rest.png`, fullPage: true })

      const s = {}
      for (const [name, selector] of [
        ['button', '#button'], ['outline', '#outline'], ['flat', '#flat'], ['disabled', '#disabled'],
        ['field', '#field .q-field__control'], ['fieldNative', '#field input'], ['fieldLabel', '#field .q-field__label'], ['hint', '#field .q-field__bottom'],
        ['filled', '#filled .q-field__control'], ['standard', '#standard .q-field__control'],
        ['tabActive', '#tabs .q-tab--active'], ['tabIdle', '#tabs .q-tab:not(.q-tab--active):not(.disabled)'], ['tabDisabled', '#tabs .q-tab.disabled'],
        ['tabLabel', '#tabs .q-tab--active .q-tab__label'], ['indicator', '#tabs .q-tab--active .q-tab__indicator'],
        ['menu', '.q-menu'], ['menuItem', '.q-menu .q-item--active'], ['menuIdle', '.q-menu #idle-item'], ['menuHeader', '.q-menu .q-item__label--header'],
      ]) s[name] = await read(page, selector, PAINT)
      for (const [name, selector, pseudo] of [['fieldStroke', '#field .q-field__control', '::before'], ['standardStroke', '#standard .q-field__control', '::before'],
        ['overdraw', '#button', '::after'], ['fieldPen', '#field .q-field__control', '::after']]) {
        s[name] = await read(page, selector, [...PAINT, 'border-bottom-color', 'border-bottom-width', 'mask-image', 'content', 'opacity'], pseudo)
      }
      s.indicatorMask = await read(page, '#tabs .q-tab--active .q-tab__indicator', ['mask-image', 'opacity', 'height'])
      s.idleIndicator = await read(page, '#tabs .q-tab:not(.q-tab--active) .q-tab__indicator', ['opacity'])
      const paper = opaque(s.button['background-color'], `${scheme} button face`)
      const menuFill = opaque(s.menu['background-color'], `${scheme} menu`)

      // Reading and control text on the real painted fills.
      for (const [label, color, fill] of [
        ['button label', s.button.color, paper], ['outline label', s.outline.color, pageFill], ['flat label', s.flat.color, pageFill],
        ['field text', s.fieldNative.color, opaque(s.field['background-color'], `${scheme} field`)], ['field label', s.fieldLabel.color, pageFill], ['field hint', s.hint.color, pageFill],
        ['filled field text', s.fieldNative.color, opaque(s.filled['background-color'], `${scheme} filled`)],
        ['active tab label', s.tabActive.color, pageFill], ['idle tab label', s.tabIdle.color, pageFill],
        ['menu item', s.menuIdle.color, menuFill], ['selected menu item', s.menuItem.color, opaque(s.menuItem['background-color'], `${scheme} selected item`)],
        ['menu header', s.menuHeader.color, menuFill],
      ]) record(scheme, label, contrast(rgb(color), fill), 4.5)

      // Role fills at rest, hover (a wash of the on-fill ink on Quasar's ::before)
      // and pressed (fine hatching, measured at the line) against their on-fill text.
      for (const role of roles) {
        const selector = `#fill-${role}`
        const rest = await read(page, selector, PAINT)
        const fill = opaque(rest['background-color'], `${scheme} ${role}`)
        record(scheme, `${role} fill rest`, contrast(rgb(rest.color), fill), 4.5)
        record(scheme, `${role} fill vs page`, contrast(fill, pageFill), 3)
        await page.hover(selector)
        const hover = await read(page, selector, ['background-color'], '::before')
        record(scheme, `${role} fill hover`, contrast(rgb(rest.color), over(rgb(hover['background-color']), fill)), 4.5)
        const box = await page.locator(selector).boundingBox()
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
        await page.mouse.down()
        const pressed = await read(page, selector, ['background-image', 'display'], '::before')
        await page.mouse.up()
        assert.match(pressed['background-image'], /repeating-linear-gradient/, `${scheme} ${role} pressed is hatched`)
        assert.notEqual(pressed.display, 'none', `${scheme} ${role} state layer renders`)
        record(scheme, `${role} fill pressed hatch`, contrast(rgb(rest.color), hatchLine(rgb(rest.color), fill)), 4.5)
      }
      record(scheme, 'neutral pressed hatch', contrast(rgb(s.button.color), hatchLine(rgb(s.button.color), paper)), 4.5)
      await page.mouse.move(0, 0)
      record(scheme, 'disabled button label', contrast(rgb(s.disabled.color), pageFill), 3)
      record(scheme, 'disabled label on hatch', contrast(rgb(s.disabled.color), hatchLine(rgb(s.disabled.color), pageFill)), 3)
      const disabledLayer = await read(page, '#disabled', ['background-image', 'display'], '::before')
      assert.match(disabledLayer['background-image'], /repeating-linear-gradient/, `${scheme} disabled buttons are hatched`)
      assert.notEqual(disabledLayer.display, 'none', `${scheme} disabled hatch renders`)

      // Essential boundaries are drawn strokes measured against what they sit on.
      for (const [label, width, color, behind] of [
        ['button stroke', s.button['border-top-width'], s.button['border-top-color'], pageFill],
        ['disabled button stroke', s.disabled['border-top-width'], s.disabled['border-top-color'], pageFill],
        ['outlined field stroke', s.fieldStroke['border-top-width'], s.fieldStroke['border-top-color'], pageFill],
        ['standard field rule', s.standardStroke['border-bottom-width'], s.standardStroke['border-bottom-color'], pageFill],
        ['menu stroke', s.menu['border-top-width'], s.menu['border-top-color'], pageFill],
      ]) {
        assert.ok(parseFloat(width) >= 1, `${scheme} ${label}: no boundary, width ${width}`)
        record(scheme, label, contrast(rgb(color), behind), 3)
      }
      record(scheme, 'active tab pen stroke', contrast(rgb(s.indicator['background-color']), pageFill), 3)

      // Pen grammar: drawn depth only, an overdraw on framed buttons, handwriting on
      // tab and menu-header accents only, and deterministic mask strokes.
      for (const [label, sample] of [['button', s.button], ['field', s.field], ['menu', s.menu], ['tab', s.tabActive]]) noBlur(sample['box-shadow'], `${scheme} ${label}`)
      assert.equal((s.menu['box-shadow'].match(/px/g) ?? []).length >= 8, true, `${scheme} menu sits on a drawn second sheet, got ${s.menu['box-shadow']}`)
      assert.notEqual(s.overdraw.content, 'none', `${scheme} framed buttons carry an overdraw stroke`)
      assert.ok(Number(s.overdraw.opacity) < 1, `${scheme} overdraw is lighter than the stroke`)
      assert.match(s.indicatorMask['mask-image'], /^url\("data:image\/svg\+xml/, `${scheme} active tab is underlined by a pen stroke`)
      assert.equal(s.idleIndicator.opacity, '0', `${scheme} idle tabs carry no underline`)
      assert.match(s.fieldPen['mask-image'], /^url\("data:image\/svg\+xml/, `${scheme} field focus draws a pen stroke`)
      assert.match(s.tabLabel['font-family'], /Caveat/, `${scheme} tab labels are handwritten`)
      assert.match(s.menuHeader['font-family'], /Caveat/, `${scheme} menu header is handwritten`)
      for (const [label, sample] of [['button', s.button], ['field', s.fieldNative], ['menu item', s.menuIdle]]) {
        assert.match(sample['font-family'], /^"?Atkinson Hyperlegible Next/, `${scheme} ${label} keeps the reading face`)
      }

      // Focus: a clear ring on buttons, and the pen stroke under a focused field.
      await page.keyboard.press('Tab')
      await page.focus('#button')
      await page.keyboard.press('Shift+Tab')
      await page.keyboard.press('Tab')
      const ring = await read(page, '#button', ['outline-width', 'outline-style', 'outline-color'])
      assert.equal(ring['outline-style'], 'solid', `${scheme} button focus ring is drawn`)
      assert.ok(parseFloat(ring['outline-width']) >= 2, `${scheme} focus ring width ${ring['outline-width']}`)
      record(scheme, 'button focus ring', contrast(rgb(ring['outline-color']), pageFill), 3)
      if (shots) {
        await page.hover('#outline')
        await page.focus('#field input')
        await page.screenshot({ path: `${shots}/pilot-${scheme}-states.png`, clip: { x: 0, y: 0, width: 964, height: 420 } })
      }
      await page.focus('#field input')
      await page.waitForSelector('#field .q-field--highlighted')
      const pen = await read(page, '#field .q-field__control', ['clip-path', 'background-color'], '::after')
      assert.equal(pen['clip-path'], 'inset(0px)', `${scheme} focused field draws its full pen stroke`)
      record(scheme, 'field focus pen stroke', contrast(rgb(pen['background-color']), pageFill), 3)
      await page.evaluate(() => window.ink.set({ error: true }))
      const error = await read(page, '#error-field .q-field__control', ['background-color'], '::after')
      assert.notDeepEqual(rgb(error['background-color']).slice(0, 3), [193, 0, 21], `${scheme} field error must not use the native #c10015`)
      record(scheme, 'field error stroke', contrast(rgb(error['background-color']), pageFill), 3)
      if (shots) {
        const box = await page.locator('#fill-primary').boundingBox()
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
        await page.mouse.down()
        await page.screenshot({ path: `${shots}/pilot-${scheme}-pressed.png`, clip: { x: 0, y: 150, width: 964, height: 140 } })
        await page.mouse.up()
      }
    } finally { await page.close() }
  }

  // Forced colours: masks and overdraws give way to system ink; reduced motion stills the controls.
  const forced = await mount(browser, 'qds-ui qds-variant-ink qds-theme-light', { forcedColors: 'active' })
  try {
    const indicator = await read(forced, '#tabs .q-tab--active .q-tab__indicator', ['mask-image'])
    assert.equal(indicator['mask-image'], 'none', 'forced colours drop the masked tab stroke')
    assert.equal((await read(forced, '#button', ['content'], '::after')).content, 'none', 'forced colours drop the overdraw')
  } finally { await forced.close() }
  const still = await mount(browser, 'qds-ui qds-variant-ink qds-theme-light', { reducedMotion: 'reduce' })
  try {
    for (const selector of ['#button', '#tabs .q-tab']) {
      assert.equal((await read(still, selector, ['transition-property']))['transition-property'], 'none', `reduced motion stills ${selector}`)
    }
    assert.equal((await read(still, '#field .q-field__control', ['transition-property'], '::after'))['transition-property'], 'none', 'reduced motion stills the field pen stroke')
  } finally { await still.close() }
} finally { await browser.close() }

console.log(JSON.stringify({ observations: results.length, minimum: Math.min(...results.map((r) => r.contrast)), lowest: [...results].sort((a, b) => a.contrast - b.contrast).slice(0, 6) }, null, 2))
console.log(`Ink browser proof PASS: ${results.length} computed contrast observations across light/dark, plus pen-grammar, focus, forced-colour and motion checks.`)
