// The shipped per-variant files must paint native Quasar exactly like the single bundle they are cut from.
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { compileEntry, VARIANT_SCOPES } from '../../scripts/css-partition.mjs'

const root = new URL('../../', import.meta.url)
const require = createRequire(import.meta.url)
const galleryRequire = createRequire(new URL('examples/gallery/package.json', root))
let chromium
try { ({ chromium } = galleryRequire('@playwright/test')) }
catch (cause) {
  throw new Error('The variant bundle browser proof requires the full pnpm workspace install (including examples/gallery). Run pnpm install --frozen-lockfile, then pnpm -C examples/gallery exec playwright install chromium.', { cause })
}

const dist = (path) => {
  const url = new URL(`dist/css/${path}`, root)
  assert.ok(existsSync(url), `missing ${url.pathname}; run pnpm build first`)
  return readFileSync(url, 'utf8')
}
const files = {
  '/vue.js': readFileSync(require.resolve('vue/dist/vue.global.prod.js'), 'utf8'),
  '/quasar.js': readFileSync(require.resolve('quasar/dist/quasar.umd.prod.js'), 'utf8'),
  '/quasar.css': readFileSync(require.resolve('quasar/dist/quasar.prod.css'), 'utf8'),
  '/full.css': compileEntry(new URL('src/css/index.scss', root).pathname),
  '/full-layered.css': compileEntry(new URL('src/css/index.layered.scss', root).pathname),
}
for (const prefix of ['', 'layered/']) {
  files[`/${prefix}win.css`] = dist(`${prefix}index.css`)
  for (const name of VARIANT_SCOPES) files[`/${prefix}${name}.css`] = dist(`${prefix}variants/${name}.css`)
}

const head = {
  unlayered: (css) => `<link rel="stylesheet" href="/quasar.css"><link rel="stylesheet" href="${css}">`,
  layered: (css) => `<style>@layer qds-important, quasar, qds; @import url(/quasar.css) layer(quasar);</style><link rel="stylesheet" href="${css}">`,
}

const SAMPLES = [
  ['body'], ['.fx-btn'], ['.fx-btn', '::before'], ['.fx-btn-flat'], ['.fx-btn-primary'], ['.fx-btn-outline'], ['.fx-btn .q-btn__content'],
  ['.fx-field .q-field__control'], ['.fx-field .q-field__control', '::before'], ['.fx-field .q-field__control', '::after'],
  ['.fx-field .q-field__native'], ['.fx-field .q-field__label'], ['.fx-filled .q-field__control'],
  ['.fx-tabs'], ['.fx-tabs .q-tab--active'], ['.fx-tabs .q-tab:not(.q-tab--active)'], ['.fx-tabs .q-tab--active .q-tab__label'], ['.fx-tabs .q-tab--active .q-tab__indicator'],
  ['.q-menu'], ['.q-menu .q-item--active'], ['.q-menu .q-item:not(.q-item--active)'],
  ['.fx-card'], ['.fx-card .q-card__section'], ['.fx-knob'], ['.fx-knob .q-circular-progress__text'],
  ['.fx-toggle .q-toggle__track'], ['.fx-check .q-checkbox__bg'], ['.fx-chip'],
  ['.fx-group > .q-btn'], ['.fx-editor .q-editor__toolbar .q-btn'], ['.fx-color .q-tab'],
]

async function mount(browser, entry, css) {
  const page = await browser.newPage({ viewport: { width: 900, height: 900 }, reducedMotion: 'reduce' })
  await page.route('http://qds.test/**', (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === '/') return route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><head>${head[entry](css)}</head><body><div id="app"></div><script src="/vue.js"></script><script src="/quasar.js"></script></body></html>` })
    if (!(path in files)) return route.fulfill({ status: 404, body: '' })
    return route.fulfill({ contentType: path.endsWith('.css') ? 'text/css' : 'text/javascript', body: files[path] })
  })
  await page.goto('http://qds.test/')
  await page.evaluate(() => {
    const { createApp, h } = Vue
    const { QBtn, QInput, QTabs, QTab, QMenu, QList, QItem, QItemSection, QCard, QCardSection, QKnob, QToggle, QCheckbox, QChip, QEditor, QColor } = Quasar
    createApp({ setup: () => () => [
      h('div', { style: 'display:flex;gap:12px;flex-wrap:wrap' }, [
        h(QBtn, { class: 'fx-btn', label: 'Action' }),
        h(QBtn, { class: 'fx-btn-flat', label: 'Flat', flat: true }),
        h(QBtn, { class: 'fx-btn-primary', label: 'Primary', color: 'primary', unelevated: true }),
        h(QBtn, { class: 'fx-btn-outline', label: 'Outline', outline: true }),
      ]),
      h(QInput, { class: 'fx-field', modelValue: 'Value', label: 'Label', outlined: true, hint: 'Help' }),
      h(QInput, { class: 'fx-filled', modelValue: '', label: 'Filled', filled: true }),
      h(QTabs, { class: 'fx-tabs', modelValue: 'a' }, () => ['a', 'b'].map((name) => h(QTab, { name, label: `Tab ${name}` }))),
      h(QBtn, { class: 'fx-anchor', label: 'Menu' }, () => h(QMenu, { modelValue: true, noParentEvent: true, transitionDuration: 0 },
        () => h(QList, {}, () => [
          h(QItem, { clickable: true, active: true }, () => h(QItemSection, {}, () => 'Active')),
          h(QItem, { clickable: true }, () => h(QItemSection, {}, () => 'Idle')),
        ]))),
      h(QCard, { class: 'fx-card' }, () => h(QCardSection, {}, () => 'Card')),
      h('div', { style: 'display:flex;gap:12px;align-items:center' }, [
        h(QKnob, { class: 'fx-knob', modelValue: 40, showValue: true, size: '64px' }),
        h(QToggle, { class: 'fx-toggle', modelValue: true, label: 'On' }),
        h(QCheckbox, { class: 'fx-check', modelValue: true, label: 'Checked' }),
        h(QChip, { class: 'fx-chip', label: 'Chip' }),
      ]),
      h('div', { class: 'qds-field-group fx-group' }, [h(QInput, { modelValue: 'Grouped', outlined: true }), h(QBtn, { label: 'Go', unelevated: true })]),
      h(QEditor, { class: 'fx-editor', modelValue: 'Text' }),
      h(QColor, { class: 'fx-color', modelValue: '#3366cc' }),
    ] }).use(Quasar).mount('#app')
    window.quasarBodyClass = document.body.className.replace(/\bbody--(light|dark)\b/g, '')
  })
  await page.waitForSelector('.q-menu', { state: 'visible' })
  return page
}

const observe = (page, bodyClass) => page.evaluate(([bodyClass, samples]) => {
  document.body.className = `${window.quasarBodyClass} ${bodyClass}`
  document.body.offsetHeight
  for (const animation of document.getAnimations()) {
    try { animation.finish() } catch { animation.cancel() }
  }
  const out = { sentinel: getComputedStyle(document.body).getPropertyValue('--_qds-variant').trim() }
  for (const [selector, pseudo] of samples) {
    const element = document.querySelector(selector)
    if (!element) { out[selector + (pseudo ?? '')] = null; continue }
    const style = getComputedStyle(element, pseudo)
    const values = {}
    for (let i = 0; i < style.length; i++) values[style[i]] = style.getPropertyValue(style[i])
    out[selector + (pseudo ?? '')] = values
  }
  return out
}, [bodyClass, SAMPLES])

function differences(actual, expected) {
  const rows = []
  for (const sample of Object.keys(expected)) {
    if (sample === 'sentinel') continue
    assert.ok(expected[sample], `fixture element ${sample} did not render`)
    for (const property of new Set([...Object.keys(expected[sample]), ...Object.keys(actual[sample] ?? {})])) {
      if (actual[sample]?.[property] !== expected[sample][property]) rows.push(`${sample} ${property}: ${actual[sample]?.[property]} != ${expected[sample][property]}`)
    }
  }
  return rows
}

const SCHEMES = { light: 'qds-theme-light body--light', dark: 'qds-theme-dark body--dark' }
const browser = await chromium.launch()
const failures = []
let compared = 0
try {
  for (const [entry, prefix, full] of [['unlayered', '', '/full.css'], ['layered', 'layered/', '/full-layered.css']]) {
    const reference = await mount(browser, entry, full)
    for (const name of ['win', ...VARIANT_SCOPES]) {
      const page = await mount(browser, entry, `/${prefix}${name}.css`)
      for (const [scheme, schemeClass] of Object.entries(SCHEMES)) {
        const bodyClass = `qds-ui qds-variant-${name} ${schemeClass}`
        const [actual, expected] = [await observe(page, bodyClass), await observe(reference, bodyClass)]
        assert.deepEqual([actual.sentinel, expected.sentinel], [name, name], `${entry} ${name}: stylesheets did not load`)
        const rows = differences(actual, expected)
        compared++
        if (rows.length) failures.push(`${entry} ${name} ${scheme}: ${rows.length} computed differences, first: ${rows.slice(0, 5).join(' | ')}`)
      }
      await page.close()
    }
    await reference.close()
  }
} finally { await browser.close() }

assert.deepEqual(failures, [], 'each shipped variant file must compute exactly like the single bundle')
console.log(`variant bundle browser proof: ${compared} file/scheme pairs match the single bundle across ${SAMPLES.length} samples`)
