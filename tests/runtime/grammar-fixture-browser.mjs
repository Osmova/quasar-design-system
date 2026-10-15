import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { qdsIconSet } from '../../dist/icons/quasar-icon-set.js'
import { compilePilot, root } from './grammar-fixture.mjs'

// Explicit one-worker native-DOM proof; never connects to a gallery/server.
const require = createRequire(import.meta.url)
const galleryRequire = createRequire(new URL('examples/gallery/package.json', root))
let chromium
try { ({ chromium } = galleryRequire('@playwright/test')) }
catch (cause) {
  throw new Error('Grammar browser proof requires the full pnpm workspace install (including examples/gallery). Run pnpm install --frozen-lockfile, then pnpm -C examples/gallery exec playwright install chromium. No root-only/filtered install or skip is supported.', { cause })
}
const assets = {
  vue: readFileSync(require.resolve('vue/dist/vue.global.prod.js'), 'utf8'),
  quasar: readFileSync(require.resolve('quasar/dist/quasar.umd.prod.js'), 'utf8'),
  css: readFileSync(require.resolve('quasar/dist/quasar.prod.css'), 'utf8'),
}
// Consume the mandatory build's real package artifact. Playwright must receive
// plain SVG data, not Node imports/functions or a font-dependent fallback set.
const iconData = JSON.parse(JSON.stringify(qdsIconSet))
assert.deepEqual(iconData, qdsIconSet, 'compiled QDS icon set must be losslessly JSON serializable')
const fixture = `body { margin: 24px; } #app { width: 600px; display: grid; gap: 24px; }
  .qds-compatibility-host { position: absolute; left: 650px; top: 24px; width: 220px; }
  #tabs { width: 250px; } #vertical { width: 180px; height: 160px; }
  *, *::before, *::after { transition: none !important; animation: none !important; }`

async function mount(browser, css) {
  const page = await browser.newPage({ viewport: { width: 900, height: 1000 }, reducedMotion: 'reduce' })
  await page.setContent(`<style>${assets.css}</style><style>${css}</style><style>${fixture}</style><body class="qds-ui"><div id="app" class="qds-ui qds-grammar-pilot"></div><aside class="qds-compatibility-host"><div id="legacy" class="qds-ui"></div></aside></body>`)
  await page.addScriptTag({ content: assets.vue })
  await page.addScriptTag({ content: assets.quasar })
  await page.evaluate((icons) => {
    const { createApp, h, reactive, nextTick } = Vue
    const { QBtn, QBtnDropdown, QInput, QIcon, QTabs, QTab, QMenu, QList, QItem, QItemSection, QSeparator } = Quasar
    const icon = icons.fab.icon
    const state = reactive({ value: 'native', loading: false, disabled: false, readonly: false, error: false, tab: 'a', vertical: 'a', menu: false })
    let app
    const tabs = (vertical = false) => h(QTabs, {
      id: vertical ? 'vertical' : 'tabs', modelValue: vertical ? state.vertical : state.tab,
      'onUpdate:modelValue': (value) => { state[vertical ? 'vertical' : 'tab'] = value },
      vertical, outsideArrows: true, mobileArrows: true, breakpoint: 0,
    }, () => ['a', 'b', 'c', 'd', 'e'].map((name) => h(QTab, { name, label: `Native ${name}`, disable: name === 'e' })))
    app = createApp({ setup: () => () => [
      h('div', { style: 'display:flex;gap:24px' }, [
        h(QBtn, { id: 'button', label: 'Action', icon, loading: state.loading, disable: state.disabled }),
        h(QBtnDropdown, { id: 'dropdown', label: 'Options', contentClass: 'qds-pilot-portal' }, () => h('div', 'Native dropdown')),
      ]),
      h(QInput, { id: 'native-input', class: 'field-fixture', modelValue: state.value, 'onUpdate:modelValue': (v) => { state.value = v },
        label: 'Independent label', outlined: true, clearable: true, counter: true, maxlength: 20, hint: 'Native help',
        disable: state.disabled, readonly: state.readonly, error: state.error, errorMessage: 'Native error',
      }, { prepend: () => h(QIcon, { name: icon }), append: () => h(QIcon, { name: icon }) }),
      tabs(), tabs(true),
      h(QBtn, { id: 'menu-anchor', label: 'Open menu', onClick: () => { state.menu = true } }, () => h(QMenu, {
        id: 'portal-menu', class: 'qds-pilot-portal', noParentEvent: true, modelValue: state.menu, 'onUpdate:modelValue': (v) => { state.menu = v }, transitionDuration: 0,
      }, () => h(QList, {}, () => [
        h(QItem, { id: 'menu-item', clickable: true }, () => h(QItemSection, {}, () => 'Native item')),
        h(QSeparator, { id: 'menu-separator' }),
        h(QItem, { id: 'menu-disabled', clickable: true, disable: true }, () => h(QItemSection, {}, () => 'Disabled item')),
      ]))),
    ] })
    app.use(Quasar, { iconSet: icons })
    app.mount('#app')
    const legacy = createApp({ setup: () => () => [
      h(QBtn, { id: 'legacy-button', label: 'Legacy action' }),
      h(QInput, { class: 'legacy-field', modelValue: 'legacy', label: 'Legacy label', outlined: true }),
      h(QTabs, { id: 'legacy-tabs', modelValue: 'a' }, () => [h(QTab, { name: 'a', label: 'Legacy A' }), h(QTab, { name: 'b', label: 'Legacy B' })]),
    ] })
    legacy.use(Quasar, { iconSet: icons })
    legacy.mount('#legacy')
    window.pilot = { state, async set(values) { Object.assign(state, values); await nextTick() }, dispose() { app.unmount(); legacy.unmount() } }
  }, iconData)
  await settle(page)
  return page
}

async function settle(page) {
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
}

async function assertNativeIcons(page, state) {
  const actual = await page.evaluate(() => {
    const read = (element) => element ? {
      text: element.textContent.trim(), classes: element.className,
      font: getComputedStyle(element).fontFamily,
      viewBox: element.querySelector(':scope > svg')?.getAttribute('viewBox'),
      paths: [...element.querySelectorAll(':scope > svg > path')].map((path) => path.getAttribute('d')),
    } : null
    return {
      all: [...document.querySelectorAll('.q-icon')].map(read),
      specific: Object.fromEntries(Object.entries({
        button: '#button .q-btn__content > .q-icon',
        clear: '.field-fixture .q-field__focusable-action',
        dropdown: '#dropdown .q-btn-dropdown__arrow',
        left: '#tabs .q-tabs__arrow--left', right: '#tabs .q-tabs__arrow--right',
        up: '#vertical .q-tabs__arrow--left', down: '#vertical .q-tabs__arrow--right',
      }).map(([name, selector]) => [name, read(document.querySelector(selector))])),
      field: [...document.querySelectorAll('.field-fixture .q-icon')].map(read),
    }
  })
  assert.ok(actual.all.length > 0, `${state}: native icons must be mounted`)
  for (const icon of actual.all) {
    assert.equal(icon.text, '', `${state}: no icon-name ligature text`)
    assert.doesNotMatch(`${icon.classes} ${icon.font}`, /material[- ]?(?:icons|symbols)|chevron_|keyboard_arrow_|\bcancel\b/i, `${state}: no Material icon family/fallback`)
    assert.ok(icon.viewBox && icon.paths.length && icon.paths.every((path) => path?.length), `${state}: every native QIcon must render real SVG paths`)
  }
  const paths = (name) => name.split('|')[0].split('&&').map((path) => path.split('@@')[0])
  const expected = { button: iconData.fab.icon, clear: iconData.field.clear, dropdown: iconData.arrow.dropdown,
    left: iconData.tabs.left, right: iconData.tabs.right, up: iconData.tabs.up, down: iconData.tabs.down }
  for (const [name, data] of Object.entries(expected)) {
    if (name === 'button' && state === 'loading') continue
    if (name === 'clear' && !actual.specific.clear) continue
    assert.ok(actual.specific[name], `${state}: native ${name} icon must exist`)
    assert.deepEqual(actual.specific[name].paths, paths(data), `${state}: ${name} must use its compiled QDS SVG mapping`)
  }
  if (state === 'rest') assert.ok(actual.specific.clear, 'rest: actual clear-action SVG is required')
  if (state === 'error') assert.ok(actual.field.some((icon) => JSON.stringify(icon.paths) === JSON.stringify(paths(iconData.field.error))), 'error: actual native error SVG is required')
  return actual.all.length
}

async function sample(page) {
  return page.evaluate(() => {
    const selectors = {
      button: '#button', content: '#button .q-btn__content', spinner: '#button .q-spinner',
      arrow: '#dropdown .q-btn-dropdown__arrow', field: '.field-fixture', control: '.field-fixture .q-field__control',
      label: '.field-fixture .q-field__label', native: '.field-fixture input', marginal: '.field-fixture .q-field__marginal',
      bottom: '.field-fixture .q-field__bottom', help: '.field-fixture .q-field__messages', counter: '.field-fixture .q-field__counter',
      clear: '.field-fixture .q-field__focusable-action', tab: '#tabs .q-tab', indicator: '#tabs .q-tab--active .q-tab__indicator',
      verticalIndicator: '#vertical .q-tab--active .q-tab__indicator', tabArrow: '#tabs .q-tabs__arrow',
      disabledTab: '#tabs .q-tab.disabled', menu: '#portal-menu', item: '#menu-item', separator: '#menu-separator', disabledItem: '#menu-disabled',
    }
    const properties = ['display', 'visibility', 'opacity', 'color', 'backgroundColor', 'backgroundImage', 'borderTopWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderColor', 'borderStyle', 'borderRadius', 'outlineWidth', 'outlineStyle', 'outlineColor', 'boxShadow', 'backdropFilter', 'fontSize', 'fontFamily', 'lineHeight', 'gap', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'minHeight', 'clipPath', 'transform', 'content']
    function read(element, pseudo = null) {
      if (!element) return null
      const style = getComputedStyle(element, pseudo)
      const rect = element.getBoundingClientRect()
      return { styles: Object.fromEntries(properties.map((p) => [p, style[p]])), rect: pseudo ? null : ['x', 'y', 'width', 'height'].map((p) => Math.round(rect[p] * 100) / 100) }
    }
    const result = Object.fromEntries(Object.entries(selectors).map(([name, selector]) => [name, read(document.querySelector(selector))]))
    result.focus = read(document.querySelector('.field-fixture .q-field__control'), '::after')
    return result
  })
}

function assertOwned(actual, state) {
  assert.equal(actual.button.styles.minHeight, '46px', `${state}: button geometry`)
  assert.equal(actual.button.styles.borderRadius, '0px')
  assert.equal(actual.content.styles.gap, '10px')
  assert.equal(actual.arrow.styles.fontSize, '18px')
  if (state === 'rest') {
    assert.equal(actual.button.styles.backgroundColor, 'rgb(255, 248, 231)')
    for (const name of ['native', 'help', 'counter', 'clear', 'marginal']) assert.ok(actual[name], `native ${name} must be mounted`)
  }
  assert.equal(actual.control.rect[3], 64, `${state}: field geometry`)
  assert.equal(actual.control.styles.backgroundColor, state === 'disabled' ? 'rgb(211, 238, 229)' : 'rgb(255, 248, 231)')
  assert.equal(actual.label.styles.fontSize, '12px')
  assert.equal(actual.marginal.rect[3], 60)
  assert.equal(actual.bottom.styles.fontSize, '12px')
  assert.equal(actual.focus.styles.clipPath, 'none', `${state}: no Fluent bottom focus clipping`)
  assert.equal(actual.focus.styles.borderTopWidth, '2px', `${state}: perimeter not focusbar`)
  assert.equal(actual.indicator.rect[2], 6)
  assert.equal(actual.indicator.rect[3], 6)
  assert.equal(actual.verticalIndicator.rect[2], 6)
  assert.equal(actual.verticalIndicator.rect[3], 6)
  assert.equal(actual.tabArrow.styles.color, 'rgb(0, 90, 88)')
  assert.ok(actual.disabledTab)
  if (state === 'focus') assert.equal(actual.button.styles.outlineStyle, 'dashed')
  if (state === 'hover') assert.equal(actual.button.styles.backgroundColor, 'rgb(211, 238, 229)')
  if (state === 'pressed') assert.equal(actual.button.styles.backgroundColor, 'rgb(0, 90, 88)')
  if (state === 'loading') { assert.equal(actual.spinner.rect[2], 20); assert.equal(actual.spinner.styles.visibility, 'visible') }
  if (state === 'disabled') assert.equal(actual.button.styles.opacity, '0.45')
  if (state === 'readonly') assert.equal(actual.control.styles.borderStyle, 'dotted')
  if (state === 'error') {
    assert.equal(actual.control.styles.borderColor, 'rgb(160, 25, 40)')
    assert.equal(actual.bottom.styles.color, 'rgb(160, 25, 40)')
  }
  if (state === 'field-focus') assert.equal(actual.focus.styles.borderColor, 'rgb(0, 90, 88)')
  if (actual.menu) {
    assert.equal(actual.menu.styles.backgroundColor, 'rgb(255, 248, 231)')
    assert.equal(actual.menu.styles.borderStyle, 'dashed')
    assert.equal(actual.menu.styles.backdropFilter, 'none')
    assert.equal(actual.menu.styles.boxShadow, 'none')
    assert.equal(actual.item.rect[3], 38)
    assert.equal(actual.separator.rect[3], 2)
    assert.ok(actual.disabledItem)
  }
}

const states = [
  ['rest', async () => {}],
  ['hover', (p) => p.locator('#button').hover()],
  ['pressed', async (p) => { await p.locator('#button').hover(); await p.mouse.down() }],
  ['focus', async (p) => { await p.mouse.up(); await p.mouse.move(850, 950); await p.locator('#button').focus(); await p.keyboard.press('Tab'); await p.keyboard.press('Shift+Tab') }],
  ['loading', (p) => p.evaluate(() => pilot.set({ loading: true }))],
  ['disabled', async (p) => {
    await p.evaluate(() => pilot.set({ loading: false, disabled: true }))
    assert.equal(await p.locator('.field-fixture input').isDisabled(), true)
  }],
  ['readonly', async (p) => {
    await p.evaluate(() => pilot.set({ disabled: false, readonly: true }))
    assert.equal(await p.locator('.field-fixture input').getAttribute('readonly'), '')
  }],
  ['error', async (p) => {
    await p.evaluate(() => pilot.set({ readonly: false, error: true }))
    assert.equal(await p.locator('.field-fixture .q-field__messages').innerText(), 'Native error')
  }],
  ['field-focus', async (p) => {
    await p.evaluate(() => pilot.set({ error: false }))
    await p.locator('.field-fixture input').focus()
    assert.equal(await p.locator('.field-fixture input').evaluate((e) => e === document.activeElement), true)
  }],
  ['clear', async (p) => {
    assert.equal(await p.locator('.field-fixture .q-field__focusable-action').count(), 1)
    await p.locator('.field-fixture .q-field__focusable-action').click()
    assert.equal(await p.locator('.field-fixture input').inputValue(), '')
  }],
  ['dropdown', async (p) => {
    await p.locator('#dropdown').click()
    await p.locator('.q-menu').waitFor({ state: 'visible' })
    assert.equal(await p.locator('#dropdown').getAttribute('aria-expanded'), 'true')
  }],
  ['dropdown-escape', async (p) => { await p.keyboard.press('Escape'); await p.locator('.q-menu').waitFor({ state: 'detached' }) }],
  ['selected', async (p) => { await p.locator('#tabs .q-tab').nth(1).click(); await p.locator('#vertical .q-tab').nth(1).click() }],
  ['arrows', async (p) => {
    const arrows = p.locator('#tabs .q-tabs__arrow')
    assert.equal(await arrows.count(), 2)
    const before = await p.locator('#tabs .q-tabs__content').evaluate((e) => e.scrollLeft)
    await p.locator('#tabs .q-tabs__arrow--right').hover()
    await p.mouse.down()
    await p.waitForFunction(() => { const e = document.querySelector('#tabs .q-tabs__content'); return e.scrollLeft >= e.scrollWidth - e.clientWidth - 1 })
    await p.mouse.up()
    assert.ok(await p.locator('#tabs .q-tabs__content').evaluate((e) => e.scrollLeft) > before)
  }],
  ['menu', async (p) => {
    await p.locator('#menu-anchor').click()
    await p.locator('#portal-menu').waitFor({ state: 'visible' })
    assert.equal(await p.locator('#app #portal-menu').count(), 0, 'native portal must leave the mounted app')
    assert.equal(await p.locator('#portal-menu').evaluate((e) => document.body.contains(e)), true)
    await p.locator('#menu-item').hover()
  }],
  ['escape', async (p) => { await p.keyboard.press('Escape'); await p.locator('#portal-menu').waitFor({ state: 'detached' }) }],
]

let browser
try { browser = await chromium.launch({ headless: true }) }
catch (cause) { throw new Error('Grammar browser proof cannot launch Chromium. After a full pnpm install --frozen-lockfile, run pnpm -C examples/gallery exec playwright install chromium (install system dependencies as required). This mandatory gate never skips.', { cause }) }
console.log(JSON.stringify({ proof: 'grammar-pilot', pid: process.pid, browser: browser.version(), workers: 1, server: null, states: states.map(([name]) => name) }))
console.log(JSON.stringify({ evidenceSha256: Object.fromEntries([
  ['tests/runtime/grammar-fixture-browser.mjs', readFileSync(new URL(import.meta.url))],
  ['dist/icons/quasar-icon-set.js', readFileSync(new URL('dist/icons/quasar-icon-set.js', root))],
  ['serialized-qds-icon-set', JSON.stringify(iconData)],
].map(([name, data]) => [name, createHash('sha256').update(data).digest('hex')])) }))
try {
  let reference
  let legacyReference
  for (const [name, options] of [['with-compatibility', { compatibility: true }], ['without-compatibility', {}], ['modules-removed', { removed: true }]]) {
    const page = await mount(browser, compilePilot(options))
    const snapshots = []
    let iconObservations = 0
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    try {
      const legacy = await page.evaluate(() => {
        const button = getComputedStyle(document.querySelector('#legacy-button'))
        const control = document.querySelector('.legacy-field .q-field__control').getBoundingClientRect()
        const label = document.querySelector('.legacy-field .q-field__label').getBoundingClientRect()
        const indicator = getComputedStyle(document.querySelector('#legacy-tabs .q-tab--active .q-tab__indicator'))
        return { buttonHeight: button.minHeight, buttonFill: button.backgroundColor, labelAbove: label.bottom <= control.top, indicatorHeight: indicator.height }
      })
      if (options.compatibility) {
        assert.equal(legacy.buttonHeight, '32px', 'active compatibility button geometry')
        assert.equal(legacy.buttonFill, 'rgba(255, 255, 255, 0.7)', 'active compatibility neutral-fill paint, not native transparent Material')
        assert.equal(legacy.labelAbove, true, 'active compatibility label-above grammar')
        assert.equal(legacy.indicatorHeight, '3px', 'active compatibility tab rail')
        legacyReference = legacy
        console.log(`active mounted sibling compatibility sentinel PASS: ${JSON.stringify(legacy)}`)
      } else {
        assert.notDeepEqual(legacy, legacyReference, 'removing compatibility must visibly change the mounted legacy sentinel')
        assert.equal(legacy.labelAbove, false, 'legacy sentinel returns to native label grammar')
      }
      for (const [state, act] of states) {
        await act(page)
        await settle(page)
        iconObservations += await assertNativeIcons(page, state)
        const actual = await sample(page)
        assertOwned(actual, state)
        snapshots.push(actual)
        if (state === 'menu') assert.equal(actual.item.styles.backgroundColor, 'rgb(211, 238, 229)')
      }
      assert.deepEqual(errors, [])
      if (reference) assert.deepEqual(snapshots, reference, `${name}: actual native paint/geometry/subelements must survive removal`)
      else reference = snapshots
      console.log(`${name}: ${states.length} native states PASS; ${iconObservations} native SVG icon observations PASS (clear/error/dropdown/horizontal+vertical arrows and explicit content mappings)`)
    } finally {
      await page.evaluate(() => pilot.dispose())
      assert.equal(await page.locator('.q-menu').count(), 0)
      await page.close()
    }
  }
  for (const family of ['button', 'field', 'tabs', 'menu']) {
    const missing = await mount(browser, compilePilot({ removed: true, omit: family }))
    try {
      if (family === 'menu') await states.find(([name]) => name === 'menu')[1](missing)
      const actual = await sample(missing)
      assert.throws(() => assertOwned(actual, 'rest'), /AssertionError/, `removing ${family}'s own grammar must fail the same oracle`)
      console.log(`negative control: missing independent ${family} grammar REJECTED`)
    } finally { await missing.close() }
  }
  // Real emitted compatibility recipes, not forced exceptions or fabricated
  // declarations. Each corrupt family must fail the same positive oracle.
  for (const family of ['button', 'field', 'tabs', 'menu']) {
    const corrupt = await mount(browser, compilePilot({ leak: family }))
    try {
      if (family === 'menu') await states.find(([name]) => name === 'menu')[1](corrupt)
      if (family === 'field') await corrupt.locator('.field-fixture input').focus()
      const actual = await sample(corrupt)
      if (family === 'field') assert.notEqual(actual.focus.styles.clipPath, 'none', 'real leaked Fluent focusbar')
      assert.throws(() => assertOwned(actual, family === 'field' ? 'field-focus' : 'rest'), /AssertionError/)
      console.log(`negative control: real globally leaked compatibility ${family} REJECTED`)
    } finally { await corrupt.close() }
  }
} finally {
  await browser.close()
  console.log('grammar-pilot: owned browser/pages closed; no server started')
}
