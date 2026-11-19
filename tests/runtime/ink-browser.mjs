// Computed-paint proof for Ink: real Quasar controls, the real compiled QDS bundle,
// every selectable ink in light and dark, measured contrast and the e-ink promises
// (one ink plus one danger red, no blur or tint, inverted selection, print face by default).
// INK_SHOTS=<dir> also writes a review board per ink and scheme there.
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
  h6 { margin: 0 0 -8px; font-size: 0.8125rem; color: var(--qds-fg-muted); }
  .note { margin: 0; max-width: 640px; font-size: 0.9375rem; line-height: 1.55; color: var(--qds-fg-default); }
  .split { display: grid; grid-template-columns: 1fr 220px; gap: 24px; align-items: start; }`

const roles = ['primary', 'secondary', 'accent', 'positive', 'negative', 'warning', 'info']
// Strongest line of each role pattern, as a share of the ink over paper.
const PATTERN = { primary: 0, secondary: 0, accent: 0, positive: 0.2, negative: 0.2, warning: 0.3, info: 0.22 }
const DOTS = 0.24
const HATCH = 0.18

async function mount(browser, bodyClass, ink, options = {}) {
  const page = await browser.newPage({ viewport: { width: 964, height: 1100 }, reducedMotion: options.reducedMotion ?? 'reduce', forcedColors: options.forcedColors ?? 'none' })
  await page.setContent(`<style>${fontFaces}</style><style>${assets.quasarCss}</style><style>${assets.qds}</style><style>${fixture}</style>`
    + `<body class="${bodyClass}" data-qds-ink="${ink}"><div id="app"></div></body>`)
  await page.addScriptTag({ content: assets.vue })
  await page.addScriptTag({ content: assets.quasar })
  await page.evaluate((roleNames) => {
    const { createApp, h, reactive, nextTick } = Vue
    const { QBtn, QInput, QTabs, QTab, QMenu, QList, QItem, QItemSection, QItemLabel, QSeparator, QChip, QToggle, QBadge, QBanner } = Quasar
    const state = reactive({ value: 'Ruled paper', tab: 'notes', side: 'pens', menu: false, on: true, off: false })
    const field = (id, props) => h('div', { id }, h(QInput, { modelValue: state.value, 'onUpdate:modelValue': (v) => { state.value = v }, ...props }))
    const app = createApp({ setup: () => () => [
      h('div', { id: 'display', class: 'text-h4 qds-display' }, 'Field notes'),
      h('h2', { id: 'heading', style: 'margin:0;font-size:1.5rem' }, 'Section heading'),
      h('p', { id: 'note', class: 'note' }, ['Reading text stays in the print face. ', h('em', { id: 'em' }, 'An aside'), ' and ', h('span', { id: 'hand', class: 'qds-hand' }, 'a handwritten note'), ' are opt-in.']),
      h('h6', 'Buttons'),
      h('div', { class: 'row' }, [
        h(QBtn, { id: 'button', label: 'Default', noCaps: true }),
        h(QBtn, { id: 'outline', label: 'Outline', outline: true }),
        h(QBtn, { id: 'flat', label: 'Flat', flat: true, color: 'primary' }),
        h(QBtn, { id: 'round', label: '+', round: true, color: 'primary' }),
        h(QBtn, { id: 'dense', label: 'Dense', dense: true }),
        h(QBtn, { id: 'disabled', label: 'Disabled', disable: true }),
      ]),
      h('div', { class: 'row' }, roleNames.map((role) => h(QBtn, { id: `fill-${role}`, label: role, color: role, unelevated: true }))),
      h('div', { class: 'row' }, [
        ...roleNames.map((role) => h(QChip, { id: `chip-${role}`, label: role, color: role })),
        h(QChip, { id: 'chip-selected', label: 'Selected', selected: true, clickable: true }),
      ]),
      h('h6', 'Switches'),
      h('div', { class: 'row', id: 'switches' }, [
        ['toggle-on', 'On', { modelValue: true }], ['toggle-off', 'Off', { modelValue: false }],
        ['toggle-dense-on', 'Dense on', { modelValue: true, dense: true }], ['toggle-dense-off', 'Dense off', { modelValue: false, dense: true }],
        ['toggle-disabled-on', 'Disabled on', { modelValue: true, disable: true }], ['toggle-disabled-off', 'Disabled off', { modelValue: false, disable: true }],
      ].map(([id, label, props]) => h(QToggle, { id, label, ...props }))),
      h('h6', 'Danger'),
      h('div', { class: 'row', id: 'danger' }, [
        h(QBtn, { id: 'danger-outline', label: 'Delete', outline: true, color: 'negative' }),
        h(QBtn, { id: 'danger-flat', label: 'Discard', flat: true, color: 'negative' }),
        h(QBadge, { id: 'badge-negative', label: '3 failed', color: 'negative' }),
        h(QBanner, { id: 'banner-negative', class: 'text-negative', dense: true }, () => 'Sync failed'),
      ]),
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
          h(QItem, { id: 'destructive-item', clickable: true, class: 'text-negative' }, () => h(QItemSection, {}, () => 'Delete page')),
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
const hex = (value) => [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16)).concat(1)
const opaque = (value, context) => {
  const paint = rgb(value)
  assert.equal(paint[3], 1, `${context} must paint an opaque fill, got ${value}`)
  return paint
}
const mix = (top, bottom, weight) => top.slice(0, 3).map((channel, i) => channel * weight + bottom[i] * (1 - weight)).concat(1)
// One ink: every opaque paint lies on the line from ink to paper (no second hue).
const onInkLine = (paint, ink, paper, context) => {
  if (paint[3] === 0) return
  const d = ink.slice(0, 3).map((v, i) => v - paper[i])
  const t = Math.max(0, Math.min(1, d.reduce((sum, v, i) => sum + v * (paint[i] - paper[i]), 0) / d.reduce((sum, v) => sum + v * v, 0)))
  const off = Math.hypot(...paint.slice(0, 3).map((v, i) => v - (paper[i] + t * d[i])))
  assert.ok(off < 4, `${context}: ${paint.map(Math.round)} is a second hue off the ink line`)
}

const PAINT = ['color', 'background-color', 'background-image', 'border-top-width', 'border-top-color', 'border-top-style', 'box-shadow', 'outline-width', 'outline-color', 'outline-style', 'font-family', 'transition-property', 'display']

const results = []
const record = (context, label, ratio, minimum) => {
  results.push({ context, label, contrast: Number(ratio.toFixed(3)), minimum })
  assert.ok(ratio >= minimum, `${context} ${label}: computed contrast ${ratio.toFixed(3)} < ${minimum}`)
}
const noBlur = (shadow, context) => {
  for (const layer of shadow === 'none' ? [] : shadow.split(/,(?![^(]*\))/)) {
    const lengths = layer.replace(/(rgba?|color)\([^)]*\)/g, '').match(/-?[\d.]+px/g) ?? []
    assert.ok(!lengths[2] || parseFloat(lengths[2]) === 0, `${context}: ink never blurs depth, got ${shadow}`)
  }
}

const INKS = ['charcoal', 'black', 'navy']
const shots = process.env.INK_SHOTS
const browser = await chromium.launch()
try {
  for (const ink of INKS) for (const [scheme, bodyClass] of [['light', 'qds-ui qds-variant-ink qds-theme-light'], ['dark', 'qds-ui qds-variant-ink qds-theme-dark body--dark']]) {
    const at = `${ink}/${scheme}`
    const page = await mount(browser, bodyClass, ink)
    try {
      const tokens = await read(page, 'body', ['--qds-text-strong', '--qds-surface-0', '--qds-fg-negative', 'background-color'])
      const inkPaint = hex(tokens['--qds-text-strong'].trim())
      const paper = hex(tokens['--qds-surface-0'].trim())
      const danger = hex(tokens['--qds-fg-negative'].trim())
      const pageFill = opaque(tokens['background-color'], `${at} page`)
      assert.deepEqual(pageFill.slice(0, 3), paper.slice(0, 3), `${at} page and sheets are the same flat paper`)
      record(at, 'ink on paper', contrast(inkPaint, paper), 7)
      record(at, 'danger red on paper', contrast(danger, paper), 4.5)
      assert.ok(danger[0] > danger[1] + 60 && danger[0] > danger[2] + 60, `${at} danger is a red, got ${danger}`)
      await page.evaluate(() => window.ink.set({ menu: true }))
      await page.waitForSelector('.q-menu', { state: 'visible' })
      if (shots) await page.screenshot({ path: `${shots}/ink-${ink}-${scheme}.png`, fullPage: true })
      if (shots) for (const part of ['switches', 'danger']) await page.locator(`#${part}`).screenshot({ path: `${shots}/${part}-${ink}-${scheme}.png` })

      const s = {}
      for (const [name, selector] of [
        ['button', '#button'], ['outline', '#outline'], ['flat', '#flat'], ['disabled', '#disabled'],
        ['field', '#field .q-field__control'], ['fieldNative', '#field input'], ['fieldLabel', '#field .q-field__label'], ['hint', '#field .q-field__bottom'],
        ['tabActive', '#tabs .q-tab--active'], ['tabIdle', '#tabs .q-tab:not(.q-tab--active):not(.disabled)'], ['vtabActive', '#vtabs .q-tab--active'],
        ['tabLabel', '#tabs .q-tab--active .q-tab__label'], ['indicator', '#tabs .q-tab--active .q-tab__indicator'],
        ['menu', '.q-menu'], ['menuItem', '.q-menu .q-item--active'], ['destructive', '.q-menu #destructive-item'], ['menuIdle', '.q-menu #idle-item'], ['menuHeader', '.q-menu .q-item__label--header'],
        ['chipSelected', '#chip-selected'], ['display', '#display'], ['heading', '#heading'], ['note', '#note'], ['em', '#em'], ['hand', '#hand'],
      ]) s[name] = await read(page, selector, PAINT)
      for (const [name, selector, pseudo] of [['fieldStroke', '#field .q-field__control', '::before'], ['standardStroke', '#standard .q-field__control', '::before'], ['errorStroke', '#error-field .q-field__control', '::before']]) {
        s[name] = await read(page, selector, [...PAINT, 'border-bottom-color', 'border-bottom-width', 'border-bottom-style'], pseudo)
      }
      const menuFill = opaque(s.menu['background-color'], `${at} menu`)

      for (const [label, color, fill] of [
        ['button label', s.button.color, opaque(s.button['background-color'], `${at} button`)], ['outline label', s.outline.color, pageFill], ['flat label', s.flat.color, pageFill],
        ['field text', s.fieldNative.color, pageFill], ['field label', s.fieldLabel.color, pageFill], ['field hint', s.hint.color, pageFill],
        ['idle tab label', s.tabIdle.color, pageFill], ['menu item', s.menuIdle.color, menuFill], ['menu header', s.menuHeader.color, menuFill], ['reading text', s.note.color, pageFill],
        ['active tab (inverted)', s.tabActive.color, opaque(s.tabActive['background-color'], `${at} active tab`)],
        ['active vertical tab (inverted)', s.vtabActive.color, opaque(s.vtabActive['background-color'], `${at} active vertical tab`)],
        ['selected menu item (inverted)', s.menuItem.color, opaque(s.menuItem['background-color'], `${at} selected item`)],
        ['selected chip (inverted)', s.chipSelected.color, opaque(s.chipSelected['background-color'], `${at} selected chip`)],
      ]) record(at, label, contrast(rgb(color), fill), 4.5)
      for (const [label, sample] of [['active tab', s.tabActive], ['selected menu item', s.menuItem], ['selected chip', s.chipSelected]]) {
        assert.deepEqual(rgb(sample['background-color']).slice(0, 3), inkPaint.slice(0, 3), `${at} ${label} inverts to an ink fill`)
      }
      assert.equal(s.indicator.display, 'none', `${at} tabs carry no Fluent indicator rail`)

      // Roles without hue: solid ink, an edge, or a fill pattern under ink text.
      for (const role of roles) {
        for (const kind of ['fill', 'chip']) {
          const selector = `#${kind}-${role}`
          const rest = await read(page, selector, PAINT)
          const text = rgb(rest.color)
          if (role === 'primary') {
            assert.deepEqual(opaque(rest['background-color'], `${at} ${role} ${kind}`).slice(0, 3), inkPaint.slice(0, 3), `${at} primary ${kind} is solid ink`)
            record(at, `${role} ${kind} label`, contrast(text, inkPaint), 4.5)
          } else {
            const pen = role === 'negative' ? danger : inkPaint
            assert.deepEqual(text.slice(0, 3), pen.slice(0, 3), `${at} ${role} ${kind} label is ${role === 'negative' ? 'the danger red' : 'ink'}`)
            record(at, `${role} ${kind} label on paper`, contrast(text, paper), 4.5)
            if (PATTERN[role]) {
              assert.match(rest['background-image'], /gradient/, `${at} ${role} ${kind} carries its fill pattern`)
              record(at, `${role} ${kind} label on pattern line`, contrast(text, mix(pen, paper, PATTERN[role])), 4.5)
            }
            const edged = parseFloat(rest['border-top-width']) >= 1 && rgb(rest['border-top-color'])[3] === 1
            const ringed = /inset/.test(rest['box-shadow'])
            assert.ok(edged || ringed, `${at} ${role} ${kind} keeps an edge`)
            if (edged) record(at, `${role} ${kind} edge`, contrast(rgb(rest['border-top-color']), paper), 3)
          }
        }
        const selector = `#fill-${role}`
        const rest = await read(page, selector, ['color'])
        await page.hover(selector)
        const hover = await read(page, selector, ['background-image', 'display'], '::before')
        assert.match(hover['background-image'], /radial-gradient/, `${at} ${role} hover is a dot screen`)
        const face = role === 'primary' ? inkPaint : paper
        record(at, `${role} hover dot screen`, contrast(rgb(rest.color), mix(rgb(rest.color), face, DOTS)), 4.5)
        const box = await page.locator(selector).boundingBox()
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
        await page.mouse.down()
        const pressed = await read(page, selector, ['background-image', 'display'], '::before')
        await page.mouse.up()
        assert.match(pressed['background-image'], /repeating-linear-gradient/, `${at} ${role} pressed is hatched`)
        assert.notEqual(pressed.display, 'none', `${at} ${role} state layer renders`)
        record(at, `${role} pressed hatch`, contrast(rgb(rest.color), mix(rgb(rest.color), face, HATCH)), 4.5)
      }
      await page.mouse.move(0, 0)
      record(at, 'disabled button label', contrast(rgb(s.disabled.color), pageFill), 3)
      assert.equal(s.disabled['border-top-style'], 'dashed', `${at} disabled buttons are dashed`)

      for (const [label, width, color] of [
        ['button stroke', s.button['border-top-width'], s.button['border-top-color']],
        ['outlined field stroke', s.fieldStroke['border-top-width'], s.fieldStroke['border-top-color']],
        ['standard field rule', s.standardStroke['border-bottom-width'], s.standardStroke['border-bottom-color']],
        ['menu stroke', s.menu['border-top-width'], s.menu['border-top-color']],
      ]) {
        assert.ok(parseFloat(width) >= 1, `${at} ${label}: no boundary, width ${width}`)
        record(at, label, contrast(rgb(color), pageFill), 3)
      }
      assert.equal(s.errorStroke['border-bottom-style'], 'double', `${at} errors are a double stroke`)
      assert.deepEqual(rgb(s.errorStroke['border-bottom-color']).slice(0, 3), danger.slice(0, 3), `${at} error stroke is the danger red`)
      record(at, 'error stroke', contrast(rgb(s.errorStroke['border-bottom-color']), pageFill), 3)
      const errorText = await read(page, '#error-field .q-field__bottom', ['color'])
      assert.deepEqual(rgb(errorText.color).slice(0, 3), danger.slice(0, 3), `${at} error message is the danger red`)
      record(at, 'error message', contrast(rgb(errorText.color), pageFill), 4.5)
      const destructive = s.destructive
      assert.deepEqual(rgb(destructive.color).slice(0, 3), danger.slice(0, 3), `${at} destructive menu item is the danger red`)
      record(at, 'destructive menu item', contrast(rgb(destructive.color), menuFill), 4.5)
      const banner = await read(page, '#banner-negative', ['border-top-color'])
      assert.deepEqual(rgb(banner['border-top-color']).slice(0, 3), danger.slice(0, 3), `${at} negative banner keeps ink copy inside a red edge`)
      record(at, 'negative banner edge', contrast(rgb(banner['border-top-color']), paper), 3)
      for (const [label, selector] of [['negative outline button', '#danger-outline'], ['negative flat button', '#danger-flat'], ['negative badge', '#badge-negative']]) {
        const sample = await read(page, selector, ['color', 'border-top-color', 'border-top-width'])
        assert.deepEqual(rgb(sample.color).slice(0, 3), danger.slice(0, 3), `${at} ${label} text is the danger red`)
        record(at, `${label} text`, contrast(rgb(sample.color), paper), 4.5)
        if (parseFloat(sample['border-top-width']) >= 1 && label !== 'negative flat button') record(at, `${label} edge`, contrast(rgb(sample['border-top-color']), paper), 3)
      }

      // Switches: off is an outlined track with the knob at the start, on is a solid ink track with a paper knob at the end.
      for (const [id, on, disabled] of [['toggle-on', true, false], ['toggle-off', false, false], ['toggle-dense-on', true, false], ['toggle-dense-off', false, false], ['toggle-disabled-on', true, true], ['toggle-disabled-off', false, true]]) {
        const track = await read(page, `#${id} .q-toggle__track`, ['background-color', 'border-top-color', 'border-top-style', 'border-top-width'])
        const knob = await read(page, `#${id} .q-toggle__thumb`, ['background-color', 'border-top-color'], '::after')
        const geometry = await page.evaluate((target) => {
          const inner = document.querySelector(`${target} .q-toggle__inner`).getBoundingClientRect()
          const thumb = document.querySelector(`${target} .q-toggle__thumb`).getBoundingClientRect()
          const trackBox = document.querySelector(`${target} .q-toggle__track`).getBoundingClientRect()
          return { start: thumb.left - inner.left, end: inner.right - thumb.right, knob: thumb.height, track: trackBox.height }
        }, `#${id}`)
        const pen = disabled ? rgb(track['border-top-color']) : inkPaint
        assert.ok(on ? geometry.end < geometry.start : geometry.start < geometry.end, `${at} ${id} knob sits at the ${on ? 'end' : 'start'}`)
        assert.ok(geometry.knob >= geometry.track * 0.6, `${at} ${id} knob fills the track (${geometry.knob} of ${geometry.track})`)
        if (!disabled) assert.deepEqual(rgb(track['border-top-color']).slice(0, 3), inkPaint.slice(0, 3), `${at} ${id} track is outlined in ink`)
        record(at, `${id} track edge`, contrast(rgb(track['border-top-color']), paper), 3)
        if (on) {
          assert.deepEqual(opaque(track['background-color'], `${at} ${id} track`).slice(0, 3), pen.slice(0, 3), `${at} ${id} track is filled`)
          record(at, `${id} paper knob on filled track`, contrast(opaque(knob['background-color'], `${at} ${id} knob`), pen), 3)
        } else {
          assert.deepEqual(opaque(track['background-color'], `${at} ${id} track`).slice(0, 3), paper.slice(0, 3), `${at} ${id} track is paper`)
          record(at, `${id} outlined knob`, contrast(rgb(knob['border-top-color']), paper), 3)
          if (disabled) assert.equal(track['border-top-style'], 'dashed', `${at} ${id} is dashed`)
        }
      }

      // E-ink physics: flat, hard-edged depth and one ink everywhere.
      for (const [label, sample] of [['button', s.button], ['field', s.field], ['menu', s.menu], ['tab', s.tabActive]]) noBlur(sample['box-shadow'], `${at} ${label}`)
      assert.match(s.menu['box-shadow'], /px/, `${at} menu sits on a hard offset sheet`)
      for (const [label, sample] of Object.entries(s)) {
        if (label === 'errorStroke' || label === 'destructive') continue
        for (const key of ['color', 'background-color', 'border-top-color']) if (sample[key]) onInkLine(rgb(sample[key]), inkPaint, paper, `${at} ${label} ${key}`)
      }
      for (const role of roles) {
        const sample = await read(page, `#fill-${role}`, ['color', 'background-color', 'border-top-color'])
        for (const [key, value] of Object.entries(sample)) onInkLine(rgb(value), role === 'negative' ? danger : inkPaint, paper, `${at} ${role} fill ${key}`)
      }

      // Print face by default; handwriting only on display titles and opt-in classes.
      for (const [label, sample] of [['button', s.button], ['field', s.fieldNative], ['menu item', s.menuIdle], ['menu header', s.menuHeader], ['tab', s.tabLabel], ['heading', s.heading], ['reading text', s.note]]) {
        assert.match(sample['font-family'], /^"?Atkinson Hyperlegible Next/, `${at} ${label} uses the print face`)
      }
      for (const [label, sample] of [['display title', s.display], ['qds-hand', s.hand], ['em (italic-hand)', s.em]]) {
        assert.match(sample['font-family'], /Caveat/, `${at} ${label} is handwritten`)
      }

      await page.focus('#button')
      await page.keyboard.press('Shift+Tab')
      await page.keyboard.press('Tab')
      const ring = await read(page, '#button', ['outline-width', 'outline-style', 'outline-color'])
      assert.equal(ring['outline-style'], 'solid', `${at} button focus ring is drawn`)
      assert.ok(parseFloat(ring['outline-width']) >= 2, `${at} focus ring width ${ring['outline-width']}`)
      record(at, 'button focus ring', contrast(rgb(ring['outline-color']), pageFill), 3)
      await page.focus('#field input')
      await page.waitForSelector('#field .q-field--highlighted')
      const rule = await read(page, '#field .q-field__control', ['border-bottom-width', 'border-bottom-color', 'transform'], '::after')
      assert.equal(rule.transform, 'matrix(1, 0, 0, 1, 0, 0)', `${at} focused field draws its heavier rule`)
      assert.ok(parseFloat(rule['border-bottom-width']) >= 2, `${at} focus rule width ${rule['border-bottom-width']}`)
      record(at, 'field focus rule', contrast(rgb(rule['border-bottom-color']), pageFill), 3)
    } finally { await page.close() }
  }

  const forced = await mount(browser, 'qds-ui qds-variant-ink qds-theme-light', 'charcoal', { forcedColors: 'active' })
  try {
    await forced.evaluate(() => window.ink.set({ menu: true }))
    await forced.waitForSelector('.q-menu', { state: 'visible' })
    assert.equal((await read(forced, '.q-menu', ['box-shadow']))['box-shadow'], 'none', 'forced colours drop the drawn sheet')
    assert.equal((await read(forced, '#tabs .q-tab--active', ['forced-color-adjust']))['forced-color-adjust'], 'none', 'forced colours keep the inverted selection as Highlight')
    assert.equal((await read(forced, '#button', ['background-image'], '::before'))['background-image'], 'none', 'forced colours drop the pattern layers')
  } finally { await forced.close() }
  const still = await mount(browser, 'qds-ui qds-variant-ink qds-theme-light', 'charcoal', { reducedMotion: 'reduce' })
  try {
    for (const selector of ['#button', '#tabs .q-tab']) {
      assert.equal((await read(still, selector, ['transition-property']))['transition-property'], 'none', `reduced motion stills ${selector}`)
    }
    const box = await still.locator('#button').boundingBox()
    await still.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await still.mouse.down()
    assert.equal((await read(still, '#button', ['transform'])).transform, 'none', 'reduced motion drops the press offset')
    await still.mouse.up()
  } finally { await still.close() }
} finally { await browser.close() }

console.log(JSON.stringify({ observations: results.length, minimum: Math.min(...results.map((r) => r.contrast)), lowest: [...results].sort((a, b) => a.contrast - b.contrast).slice(0, 6) }, null, 2))
console.log(`Ink browser proof PASS: ${results.length} computed contrast observations across ${INKS.length} inks × light/dark, plus single-ink, inversion, type-scope, focus, forced-colour and motion checks.`)
