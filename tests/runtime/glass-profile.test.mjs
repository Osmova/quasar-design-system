import assert from 'node:assert/strict'
import { test } from 'node:test'
import { compileString } from 'sass'
import { fileURLToPath } from 'node:url'
import { contrast, parseRgb, mix } from './shadcn-fixtures.mjs'
import { flattenRules } from './css-rules.mjs'

const root = new URL('../../', import.meta.url)
const loadPaths = [fileURLToPath(root)]
const compile = (source) => compileString(source, { loadPaths, style: 'compressed', silenceDeprecations: ['if-function'] }).css
const families = ['button', 'field', 'menu', 'tabs', 'capability']
const roles = ['primary', 'secondary', 'accent', 'positive', 'negative', 'warning', 'info']
const grammar = () => compile(`@use 'src/css/components/variants/glass';
  ${families.map((family) => `@include glass.${family};`).join('')}`)

test('the glass grammar compiles identically with or without the compatibility grammar loaded', () => {
  const standalone = grammar()
  const withCompatibility = compile(`@use 'src/css/components/variants/glass';
    ${['button', 'field', 'menu', 'tabs'].map((family) => `@use 'src/css/components/${family}';`).join('')}
    ${families.map((family) => `@include glass.${family};`).join('')}`)
  assert.equal(standalone, withCompatibility)
  for (const selector of ['.q-btn', '.q-field__control', '.q-tab--active', '.q-menu', '.q-btn-toggle']) {
    assert.ok(standalone.includes(selector), `glass grammar must own ${selector}`)
  }
})

test('every glass rule is scoped to the glass profile, borrows no other scope and needs no !important', () => {
  const css = grammar()
  for (const [path, body] of flattenRules(css)) {
    assert.match(path, /\.qds-variant-glass/, `unscoped glass rule: ${path}`)
    assert.doesNotMatch(path, /qds-variant-(fluent|ink|one|term|shadcn|zen)/, `glass borrowed another profile scope: ${path}`)
    assert.doesNotMatch(body, /!important/, `glass must win on specificity: ${path}`)
  }
})

// Reduced motion keeps the fade and drops the spring scale.
test('menus emerge from their anchor and reduced motion drops the scale', () => {
  const css = grammar()
  assert.match(css, /\.q-menu\{transform-origin:top\}/)
  assert.match(css, /prefers-reduced-motion: ?reduce\)\{[^}]*\.q-menu\.q-transition--fade-enter-from\{transform:none\}/)
})

// Translucency is decoration only: each fallback resolves the glass scope to opaque materials.
test('no-filter, reduced transparency, forced colours and increased contrast all resolve to opaque glass', () => {
  const css = compile(`@use 'src/themes/default';`)
  const rules = flattenRules(css).filter(([path]) => path.includes('.qds-variant-glass'))
    .map(([path, body]) => [path.replace(/: /g, ':'), body.replace(/:\s+/g, ':')])
  const opaque = (pattern) => rules.filter(([path, body]) => pattern.test(path)
    && body.includes('--qds-material-regular-bg:var(--qds-surface-0)')
    && body.includes('--qds-material-regular-filter:none')
    && body.includes('--_qds-glass-fade:none'))
  for (const [name, pattern] of [
    ['no backdrop-filter', /@supports not/],
    ['reduced transparency', /prefers-reduced-transparency:reduce/],
    ['forced colours', /forced-colors:active/],
    ['increased contrast', /prefers-contrast:more/],
  ]) {
    assert.ok(opaque(pattern).length >= 2, `${name} must reach both the light and the dark glass scope`)
  }
  const contrastRules = rules.filter(([path]) => /@media ?\(prefers-contrast:more\)\|/.test(path))
  assert.ok(contrastRules.some(([, body]) => body.includes('--qds-color-primary:#0040dd')), 'light increased-contrast accent')
  assert.ok(contrastRules.some(([, body]) => body.includes('--qds-color-primary:#8cc3ff')), 'dark increased-contrast accent')
})

// ── Contrast is a hard gate, computed from the shipped token values ──────────
function glassTokens(scheme) {
  const prefix = scheme === 'dark' ? 'dark-' : 'light-'
  const palette = scheme === 'dark' ? 'dark-' : ''
  const keys = [
    ...[0, 1, 2, 3].map((step) => [`surface-${step}`, `${prefix}surface-${step}`]),
    ['text', `${prefix}text`], ['text-strong', `${prefix}text-strong`], ['text-muted', `${prefix}text-muted`],
    ['stroke-strong', `${prefix}stroke-strong`], ['hc-primary', `${prefix}hc-primary`],
    ...roles.map((role) => [role, `${palette}${role}`]),
    ['primary-dark', `${palette}primary-dark`],
    ...['brand', 'accent', 'positive', 'warning', 'negative', 'info'].map((wash) => [`soft-${wash}`, `${palette}soft-${wash}`]),
  ]
  const css = compile(`@use 'sass:map';@use 'src/tokens/default' as t;
    $glass: map.get(t.$variants, glass);
    .probe{${keys.map(([name, key]) => `--${name}:#{map.get($glass, '${key}')};`).join('')}
    ${roles.map((role) => `--on-${role}:#{map.get(map.get($glass, '${prefix}on-fill'), ${role})};`).join('')}}`)
  return Object.fromEntries([...css.matchAll(/--([\w-]+):\s*([^;}]+)/g)].map((match) => [match[1], parseRgb(match[2].trim())]))
}

const FILL_STATES = { hover: 0.88, pressed: 0.76 }
const ROLE_FG_MIX = 0.86
const MATERIAL = { light: 0.88, dark: 0.92 }

export function glassPairs(scheme) {
  const token = glassTokens(scheme)
  const pairs = []
  const add = (group, pair, a, b, minimum) => pairs.push({ group, pair, ratio: contrast(a, b), minimum })
  const surfaces = [0, 1, 2].map((step) => [`surface-${step}`, token[`surface-${step}`]])
  for (const [name, surface] of [...surfaces, ['surface-3', token['surface-3']]]) {
    add('text', `text/${name}`, token.text, surface, 4.5)
  }
  for (const [name, surface] of surfaces) add('text', `text-muted/${name}`, token['text-muted'], surface, 4.5)
  for (const role of roles) {
    const fill = token[role]
    const label = token[`on-${role}`]
    add('role fill', `on-${role}/rest`, label, fill, 4.5)
    // Primary hover and pressed resolve to primary-dark; the other roles mix toward strong text.
    for (const [state, proportion] of Object.entries(FILL_STATES)) {
      const paint = role === 'primary' ? token['primary-dark'] : mix(fill, token['text-strong'], proportion)
      add('role fill', `on-${role}/${state}`, label, paint, 4.5)
    }
    const foreground = role === 'primary' ? fill : mix(fill, token['text-strong'], ROLE_FG_MIX)
    for (const [name, surface] of surfaces) add('role text', `fg-${role}/${name}`, foreground, surface, 4.5)
    const wash = role === 'primary' ? 'brand' : role
    if (token[`soft-${wash}`]) add('role text', `fg-${role}/soft-${wash}`, foreground, token[`soft-${wash}`], 4.5)
    add('control edge', `${role} fill/surface-0`, fill, token['surface-0'], 3)
  }
  // Control boundaries: the stroke must read on every surface and on glass over every surface.
  for (const [name, surface] of surfaces) {
    add('control edge', `stroke/${name}`, token['stroke-strong'], surface, 3)
    add('control edge', `stroke/glass over ${name}`, token['stroke-strong'], mix(token[scheme === 'dark' ? 'surface-2' : 'surface-0'], surface, MATERIAL[scheme]), 3)
  }
  add('control edge', 'stroke/segmented track', token['stroke-strong'], token['surface-2'], 3)
  add('state indicator', 'knob/switch off track', parseRgb('#ffffff'), token['stroke-strong'], 3)
  // Dark tracks shade the role toward the page so the light knob keeps its edge.
  const track = scheme === 'dark' ? mix(token.primary, token['surface-1'], 0.7) : token.primary
  add('state indicator', 'knob/switch on track', parseRgb('#ffffff'), track, 3)
  add('state indicator', 'slider thumb/selection', parseRgb('#ffffff'), track, 3)
  for (const name of ['surface-0', 'surface-1']) add('state indicator', `on track/${name}`, track, token[name], 3)
  // Increased contrast: the edge becomes the muted text colour and the accent deepens.
  for (const [name, surface] of surfaces) add('increased contrast', `edge/${name}`, token['text-muted'], surface, 4.5)
  add('increased contrast', 'on-primary/hc fill', token['on-primary'], token['hc-primary'], 7)
  return pairs
}

for (const scheme of ['light', 'dark']) {
  test(`glass ${scheme}: text, role fills, control edges and state indicators clear their minimums`, () => {
    const pairs = glassPairs(scheme)
    const failures = pairs.filter(({ ratio, minimum }) => ratio < minimum).map(({ pair, ratio, minimum }) => `${pair}: ${ratio.toFixed(2)} < ${minimum}`)
    assert.deepEqual(failures, [], `${pairs.length} ${scheme} pairings checked`)
    assert.ok(pairs.length >= 78, `${pairs.length} pairings`)
  })
}
