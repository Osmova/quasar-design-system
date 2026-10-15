import assert from 'node:assert/strict'
import { test } from 'node:test'
import { compileString } from 'sass'
import { fileURLToPath } from 'node:url'
import { contrast, parseRgb, mix } from './shadcn-fixtures.mjs'
import { flattenRules } from './css-rules.mjs'

const root = new URL('../../', import.meta.url)
const loadPaths = [fileURLToPath(root)]
const compile = (source) => compileString(source, { loadPaths, style: 'compressed', silenceDeprecations: ['if-function'] }).css
const families = ['button', 'field', 'menu', 'tabs']
const roles = ['primary', 'secondary', 'accent', 'positive', 'negative', 'warning', 'info']

// Folio owns its grammar outright: the partial must compile and emit identical
// rules with every compatibility module physically absent from the program.
test('the Folio profile compiles and emits identically with no compatibility grammar loaded', () => {
  const standalone = compile(`@use 'src/css/components/variants/folio';
    ${families.map((family) => `@include folio.${family};`).join('')} @include folio.reading;`)
  const withCompatibility = compile(`@use 'src/css/components/variants/folio';
    ${families.map((family) => `@use 'src/css/components/${family}';`).join('')}
    ${families.map((family) => `@include folio.${family};`).join('')} @include folio.reading;`)
  assert.equal(standalone, withCompatibility)
  assert.ok(standalone.length > 0)
  for (const selector of ['.q-btn', '.q-field__control', '.q-tab--active', '.q-menu']) {
    assert.ok(standalone.includes(selector), `Folio grammar must own ${selector}`)
  }
})

test('every Folio rule is scoped to the Folio profile and borrows no other profile scope', () => {
  const css = compile(`@use 'src/css/components/variants/folio';
    ${families.map((family) => `@include folio.${family};`).join('')} @include folio.reading;`)
  for (const [path] of flattenRules(css)) {
    assert.match(path, /\.qds-variant-folio/, `unscoped Folio rule: ${path}`)
    assert.doesNotMatch(path, /qds-variant-(fluent|ink|one|term|shadcn)/, `Folio borrowed another profile scope: ${path}`)
  }
})

// Independence is behavioural, not just textual: no Fluent focus bar or rail,
// no acrylic, no Ink drawn rule.
test('Folio declares no inherited Fluent focus bar, rail, acrylic or Ink sketch treatment', () => {
  const css = compile(`@use 'src/css/components/variants/folio';
    ${families.map((family) => `@include folio.${family};`).join('')} @include folio.reading;`)
  for (const pattern of [/backdrop-filter:\s*(?!none)/, /saturate\(/, /tab-active-rail/, /border-image/, /repeating-linear-gradient/]) {
    assert.doesNotMatch(css, pattern, `Folio must not inherit ${pattern}`)
  }
  // A bottom-edge focus bar is painted on the field control's ::after; Folio
  // removes that pseudo entirely and rings the whole control instead.
  assert.match(css, /\.q-field__control::after\{content:none\}|\.q-field__control::before,[^{]*::after\{content:none\}/)
  assert.match(css, /\.q-field--focused .q-field__control\{[^}]*outline:/)
  assert.match(css, /\.q-tab__indicator\{display:none\}/)
})

// Reading presentation is an explicit class, removes decorative depth and
// motion, and keeps every boundary. It claims nothing about e-paper hardware.
test('the .qds-reading modifier removes depth and motion while every Folio boundary survives', () => {
  const css = compile(`@use 'src/css/components/variants/folio';
    ${families.map((family) => `@include folio.${family};`).join('')} @include folio.reading;`)
  const reading = flattenRules(css).filter(([path]) => path.includes('.qds-reading'))
  assert.ok(reading.length >= 3)
  for (const [path] of reading) {
    assert.match(path, /\.qds-variant-folio\.qds-reading/, `reading rules stay scoped to Folio: ${path}`)
  }
  const declarations = reading.map(([, body]) => body).join(';')
  for (const removed of ['box-shadow:none', 'transition:none', 'animation:none', 'backdrop-filter:none', 'background-image:none']) {
    assert.ok(declarations.includes(removed), `reading must set ${removed}`)
  }
  assert.doesNotMatch(declarations, /border(-[a-z]+)?:\s*(none|0)/, 'reading must not remove a Folio boundary')
  // No device, hardware or user-agent heuristic anywhere in the profile.
  assert.doesNotMatch(css, /prefers-|pointer:|hover:|forced-colors|-webkit-min-device|monochrome|update:/)
})

// ── Contrast is a hard gate, computed from the shipped token values ──────────
const schemes = ['light', 'dark']
function folioTokens(scheme) {
  const prefix = scheme === 'dark' ? 'dark-' : 'light-'
  const palette = scheme === 'dark' ? 'dark-' : ''
  const keys = [
    ...[0, 1, 2, 3].map((step) => [`surface-${step}`, `${prefix}surface-${step}`]),
    ['text', `${prefix}text`], ['text-strong', `${prefix}text-strong`], ['text-muted', `${prefix}text-muted`],
    ['stroke-strong', `${prefix}stroke-strong`], ['border', `${prefix}border`],
    ...roles.map((role) => [role, `${palette}${role}`]),
    ...['brand', 'accent', 'positive', 'warning', 'negative', 'info', 'focus-block', 'transient']
      .map((wash) => [`soft-${wash}`, `${scheme === 'dark' ? 'dark-' : ''}soft-${wash}`]),
  ]
  const css = compile(`@use 'sass:map';@use 'src/tokens/default' as t;
    $folio: map.get(t.$variants, folio);
    .probe{${keys.map(([name, key]) => `--${name}:#{map.get($folio, '${key}')};`).join('')}
    --on-fill:#{map.get(map.get($folio, '${prefix}on-fill'), primary)};}`)
  return Object.fromEntries([...css.matchAll(/--([\w-]+):\s*([^;}]+)/g)].map((match) => [match[1], match[2].trim()]))
}

// qds-variant-scheme pins hover/pressed fills to these mixes over fg-strong,
// and keeps the on-fill text unmixed at pressed (text-on-fill-pressed-mix 100%).
const FILL_STATES = { default: 1, hover: 0.88, pressed: 0.76 }
const ROLE_FG_MIX = 0.8

for (const scheme of schemes) {
  test(`Folio ${scheme} text and on-fill pairings all clear 4.5:1`, () => {
    const token = folioTokens(scheme)
    const strong = parseRgb(token['text-strong'])
    const failures = []
    let checked = 0
    const check = (pair, a, b, minimum = 4.5) => {
      const ratio = contrast(a, b)
      checked++
      if (ratio < minimum) failures.push(`${pair}: ${ratio.toFixed(3)} < ${minimum}`)
    }
    for (const step of [0, 1, 2, 3]) {
      check(`text/surface-${step}`, parseRgb(token.text), parseRgb(token[`surface-${step}`]))
      check(`text-strong/surface-${step}`, strong, parseRgb(token[`surface-${step}`]))
    }
    for (const step of [0, 1, 2]) check(`text-muted/surface-${step}`, parseRgb(token['text-muted']), parseRgb(token[`surface-${step}`]))
    for (const wash of ['brand', 'accent', 'positive', 'warning', 'negative', 'info', 'focus-block', 'transient']) {
      check(`text/soft-${wash}`, parseRgb(token.text), parseRgb(token[`soft-${wash}`]))
      check(`text-muted/soft-${wash}`, parseRgb(token['text-muted']), parseRgb(token[`soft-${wash}`]))
    }
    for (const role of roles) {
      const fill = parseRgb(token[role])
      for (const [state, proportion] of Object.entries(FILL_STATES)) {
        check(`on-fill/${role}-${state}`, parseRgb(token['on-fill']), mix(fill, strong, proportion))
      }
      const foreground = mix(fill, strong, ROLE_FG_MIX)
      for (const step of [0, 1, 2]) check(`fg-${role}/surface-${step}`, foreground, parseRgb(token[`surface-${step}`]))
      // `secondary` has no role wash in any profile, so there is no pair to check.
      const wash = role === 'primary' ? 'brand' : role
      if (token[`soft-${wash}`]) check(`fg-${role}/soft-${wash}`, foreground, parseRgb(token[`soft-${wash}`]))
    }
    assert.deepEqual(failures, [], `${checked} ${scheme} pairings checked`)
    assert.ok(checked >= 70, `${checked} pairings`)
  })

  // Essential boundaries must be readable on their own: Folio controls resolve
  // their stroke to stroke-strong, which has to clear the 3:1 non-text minimum.
  test(`Folio ${scheme} essential control boundaries clear 3:1 on every surface and wash`, () => {
    const token = folioTokens(scheme)
    const stroke = parseRgb(token['stroke-strong'])
    const failures = []
    let checked = 0
    for (const key of [0, 1, 2, 3].map((step) => `surface-${step}`)
      .concat(['brand', 'accent', 'positive', 'warning', 'negative', 'info', 'focus-block', 'transient'].map((wash) => `soft-${wash}`))) {
      const ratio = contrast(stroke, parseRgb(token[key]))
      checked++
      if (ratio < 3) failures.push(`stroke-strong/${key}: ${ratio.toFixed(3)} < 3`)
    }
    // Role fills are their own boundary, so they carry the same minimum.
    for (const role of roles) {
      const ratio = contrast(parseRgb(token[role]), parseRgb(token['surface-0']))
      checked++
      if (ratio < 3) failures.push(`${role}/surface-0: ${ratio.toFixed(3)} < 3`)
    }
    assert.deepEqual(failures, [], `${checked} ${scheme} boundary pairings checked`)
  })
}

// ── Negative controls ───────────────────────────────────────────────────────
// Selector-set equality proves nothing, so the independence checks above are
// only trustworthy if a deliberately corrupted profile makes them fail.
const folioProgram = (extra = '') => `@use 'src/css/components/variants/folio';
  ${families.map((family) => `@include folio.${family};`).join('')} @include folio.reading; ${extra}`

test('a deliberately cross-profile-corrupted control fails the Folio scope check', () => {
  const corrupt = compile(folioProgram(`
    :is(.qds-ui.qds-variant-fluent, .qds-ui .qds-variant-fluent) .q-btn { border-radius: 12px; }
    .qds-ui .q-tab__indicator { background: red; }`))
  const paths = flattenRules(corrupt).map(([path]) => path)
  assert.ok(paths.some((path) => !/\.qds-variant-folio/.test(path)), 'the corrupted control must contain an unscoped rule')
  assert.ok(paths.some((path) => /qds-variant-fluent/.test(path)), 'the corrupted control must borrow another profile scope')
  assert.throws(() => {
    for (const path of paths) {
      assert.match(path, /\.qds-variant-folio/)
      assert.doesNotMatch(path, /qds-variant-(fluent|ink|one|term|shadcn)/)
    }
  }, 'the scope check must reject the corrupted control')
})

test('a Folio partial that depended on the compatibility grammar would fail the removal proof', () => {
  // The real partial loads no family module; a control that does cannot compile
  // once those modules are physically absent from the program.
  assert.doesNotThrow(() => compile(folioProgram()))
  assert.throws(() => compile(`@use 'src/css/components/variants/folio';
    @include folio.button; @include button.compatibility-styles;`), /button/)
})

test('with the compatibility grammar removed the Folio field still paints its own well in every state', () => {
  const css = compile(folioProgram())
  for (const expected of [
    /\.q-field__control\{[^}]*background:var\(--qds-surface-1\)/,
    /\.q-field__control:hover\{background:var\(--qds-surface-1\)\}/,
    /\.q-field--focused \.q-field__control\{[^}]*background:var\(--qds-surface-1\)/,
  ]) assert.match(css, expected)
})
