import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { createHash } from 'node:crypto'
import * as sass from 'sass'
import { QDS_TOKENS } from '@osmova/quasar-design-system/tokens'
import { palettes, roles, sourceProfiles, emittedProfiles, sourceRgb, parseRgb, mix, contrast } from './shadcn-fixtures.mjs'
import { expectationSlots, expectations, stateExpectationSlots, stateExpectations } from './shadcn-expectations.mjs'

const sources = sourceProfiles()
const emitted = emittedProfiles()

test('all 140 actual role-state fills pass 4.5 with the unchanged pair, coherent RGB and 100% pressed text mix', () => {
  let checked = 0
  for (const [profile, p] of Object.entries(emitted)) {
    const card = parseRgb(p['--qds-shadcn-card'])
    for (const role of roles) {
      const rest = parseRgb(p[`--qds-color-${role}`])
      const pair = parseRgb(p[`--qds-text-on-${role}`])
      assert.equal(p[`--qds-text-on-${role}-pressed-mix`], '100%')
      for (const [state, weight] of [['hover', 0.9], ['pressed', 0.8]]) {
        const paint = parseRgb(p[`--qds-color-${role}-${state}`])
        assert.equal(paint[3], 1, `${profile}/${role}/${state} is opaque`)
        assert.ok(contrast(pair, paint) >= 4.5, `${profile}/${role}/${state}: ${contrast(pair, paint)}`)
        assert.deepEqual(p[`--qds-color-${role}-${state}-rgb`].split(',').map(Number), paint.slice(0, 3))
        const initial = mix(rest, card, weight).slice(0, 3).map(Math.round).concat(1)
        if (contrast(pair, initial) >= 4.5) assert.deepEqual(paint, initial, `${profile}/${role}/${state} passing start must stay unchanged`)
        checked++
      }
    }
  }
  assert.equal(checked, 140)
})

test('frozen ten-profile expectation table stays stable', () => {
  assert.equal(expectations.length, 10)
  for (const [profile, ...values] of expectations) {
    assert.equal(values.length, expectationSlots.length)
    expectationSlots.forEach((slot, i) => {
      assert.deepEqual(parseRgb(emitted[profile][`--qds-${slot}`]), parseRgb(`#${values[i]}`), `${profile}/${slot}`)
    })
  }
})

test('frozen 140-state expectation table stays stable and every state token is registered in the source inventory', () => {
  const inventory = readFileSync(new URL('../../src/tokens/index.ts', import.meta.url), 'utf8')
  assert.equal(stateExpectations.length, 10)
  for (const [profile, ...values] of stateExpectations) {
    assert.equal(values.length, stateExpectationSlots.length)
    stateExpectationSlots.forEach((slot, i) => {
      assert.deepEqual(parseRgb(emitted[profile][`--qds-${slot}`]), parseRgb(`#${values[i]}`), `${profile}/${slot}`)
      assert.ok(inventory.includes(`'--qds-${slot}'`), `inventory: ${slot}`)
      assert.ok(inventory.includes(`'--qds-${slot}-rgb'`), `RGB inventory: ${slot}`)
    })
  }
  for (const role of roles) assert.ok(inventory.includes(`'--qds-text-on-${role}-pressed-mix'`))
})

test('existing default-theme values stay byte-identical with only the two static-spinner geometry additions', () => {
  const root = new URL('../../', import.meta.url)
  const path = new URL('src/themes/default.scss', root)
  const source = readFileSync(path, 'utf8')
  // Folio is removed the same way shadcn is, so the frozen hash below still
  // verifies every pre-Folio declaration and its emission order byte for byte.
  const old = source.replace("@use 'shadcn';\n", '').replace('\n@include shadcn.scopes;\n', '\n')
    .replace('@include qds-folio-scopes;\n', '')
  const options = { url: path, loadPaths: [root.pathname], silenceDeprecations: ['if-function'] }
  const baseline = sass.compileString(old, options).css
  const current = sass.compile(path.pathname, options).css
  assert.ok(current.startsWith(baseline), 'existing declarations or their emission order changed')
  const additions = ['--qds-spinner-static-arc', '--qds-spinner-static-offset']
  for (const token of additions) assert.ok(QDS_TOKENS.includes(token), `registered geometry: ${token}`)
  assert.match(baseline, /--qds-spinner-static-arc: 89 200;/)
  assert.match(baseline, /--qds-spinner-static-offset: 0;/)
  const oldDeclarations = baseline.replace(/^\s*--qds-spinner-static-(?:arc|offset):[^;]*;\n/gm, '')
  // Captured before adding the two allowlisted properties, not regenerated from
  // the new output. This protects every prior default/variant value and order.
  assert.equal(createHash('sha256').update(oldDeclarations).digest('hex'), 'd81f65b10c6fe6455f719961a6b6465b374d760f781f45e1ab733e1b22fe4749')
})

test('all ten full profiles match their pinned official source, including alpha, charts and sidebar aliases', () => {
  for (const palette of palettes) {
    for (const scheme of ['light', 'dark']) {
      const output = emitted[`${palette}-${scheme}`]
      for (const [slot, source] of Object.entries(sources[palette][scheme])) {
        const property = `--qds-shadcn-${slot}`
        assert.ok(QDS_TOKENS.includes(property), `inventory: ${property}`)
        assert.deepEqual(parseRgb(output[property]), sourceRgb(source), `${palette}/${scheme}/${slot}`)
      }
    }
  }
})

test('native role fills, pairs and RGB come from the same profile with exact shared Quasar roles', () => {
  for (const palette of palettes) {
    for (const scheme of ['light', 'dark']) {
      const p = emitted[`${palette}-${scheme}`]
      const expected = {
        primary: p['--qds-shadcn-primary'], secondary: p['--qds-shadcn-secondary'], accent: p['--qds-shadcn-accent'],
        negative: p['--qds-shadcn-destructive'], positive: scheme === 'light' ? '#15803d' : '#22c55e',
        warning: '#f59e0b', info: scheme === 'light' ? '#2563eb' : '#60a5fa',
      }
      for (const role of roles) {
        const fill = parseRgb(p[`--qds-color-${role}`])
        assert.deepEqual(fill, parseRgb(expected[role]))
        assert.deepEqual(p[`--qds-color-${role}-rgb`].split(',').map(Number), fill.slice(0, 3))
        assert.equal(p[`--q-${role}`], `var(--qds-color-${role})`)
        if (['primary', 'secondary', 'accent'].includes(role)) {
          assert.equal(p[`--qds-text-on-${role}`], p[`--qds-shadcn-${role}-foreground`])
        }
        const pair = parseRgb(p[`--qds-text-on-${role}`])
        assert.ok(contrast(pair, fill) >= 4.5, `${palette}/${scheme}/${role} on-fill`)
      }
      const negative = parseRgb(p['--qds-color-negative'])
      const candidates = ['#ffffff', '#18181b'].map(parseRgb)
      assert.equal(contrast(parseRgb(p['--qds-text-on-negative']), negative), Math.max(...candidates.map((c) => contrast(c, negative))))
      assert.equal(p['--q-dark'], undefined)
      assert.equal(p['--q-primary-rgb'], undefined)
    }
  }
})

test('quantized role text and muted text meet 4.5 on actual float-composited scheme backgrounds; strong/focus stroke meets 3', () => {
  for (const palette of palettes) {
    for (const scheme of ['light', 'dark']) {
      const p = emitted[`${palette}-${scheme}`]
      const card = parseRgb(p['--qds-shadcn-card'])
      const backgrounds = ['background', 'card', 'popover', 'muted', 'accent'].map((slot) => parseRgb(p[`--qds-shadcn-${slot}`]))
      for (const role of roles) backgrounds.push(mix(parseRgb(p[`--qds-color-${role}`]), card, 0.1))
      for (const property of ['--qds-text-muted', ...roles.map((role) => `--qds-fg-${role}`), '--qds-stroke-strong']) {
        const threshold = property === '--qds-stroke-strong' ? 3 : 4.5
        const fg = parseRgb(p[property])
        for (const bg of backgrounds) {
          assert.ok(contrast(fg, bg) >= threshold, `${palette}/${scheme}/${property}: ${contrast(fg, bg)}`)
          if (property === '--qds-stroke-strong') assert.ok(contrast(mix(fg, bg, 0.5), bg) >= 3, `${palette}/${scheme} painted focus halo`)
        }
      }
    }
  }
})

test('local emitter rebinds native surfaces, control/button/nav/material/typography/shadows without Fluent literals', () => {
  for (const p of Object.values(emitted)) {
    for (const [name, value] of Object.entries({
      'surface-0': 'var(--qds-shadcn-background)', 'surface-1': 'var(--qds-shadcn-card)',
      'surface-2': 'var(--qds-shadcn-muted)', 'surface-3': 'var(--qds-shadcn-accent)',
      'bg-card': 'var(--qds-shadcn-card)', 'bg-flyout': 'var(--qds-shadcn-popover)',
      'fg-default': 'var(--qds-text)', 'fg-brand': 'var(--qds-fg-primary)', 'fg-on-brand': 'var(--qds-text-on-primary)',
      'control-size-sm': '2rem', 'control-size-md': '2.25rem', 'control-size-lg': '2.5rem',
      'button-min-height': 'var(--qds-control-size-md)', 'button-radius': 'var(--qds-radius-control)',
      'radius-control': '0.5rem', 'card-radius': '0.875rem', 'font-size-body': '0.875rem',
      'menu-bg': 'var(--qds-shadcn-popover)', 'toolbar-bg': 'var(--qds-shadcn-background)',
      'tab-active-text': 'var(--qds-text)', 'material-regular-bg': 'var(--qds-shadcn-popover)',
      'material-regular-filter': 'none', 'card-bg': 'var(--qds-shadcn-card)',
      'card-backdrop-blur': '0px', 'field-focus-stroke': 'var(--qds-stroke-focus)',
      'fill-hover-mix': '90%', 'fill-pressed-mix': '80%', 'fill-state-base': 'var(--qds-bg-card)',
      'button-elevated-shadow': 'var(--qds-shadow-sm)',
    })) assert.equal(p[`--qds-${name}`], value, name)
    // Every var() alias emitted by the local emitter points to a declaration in
    // that emitter or the universal base contract, never an unregistered token.
    for (const value of Object.values(p)) {
      for (const ref of value.matchAll(/var\((--qds-[\w-]+)/g)) assert.ok(QDS_TOKENS.includes(ref[1]), ref[1])
    }
  }
})

test('emitter rejects unknown profiles and mathematically impossible contrast instead of hiding failure', () => {
  const options = { loadPaths: [new URL('../../', import.meta.url).pathname], silenceDeprecations: ['if-function'] }
  assert.throws(() => sass.compileString("@use 'src/themes/shadcn'; .x { @include shadcn.scheme('unknown'); }", options), /Unknown shadcn profile/)
  assert.throws(() => sass.compileString("@use 'src/tokens/shadcn'; .x { color: shadcn.readable(#888, (white, black), light, 7); }", options), /contrast conflict/)
  assert.throws(() => sass.compileString("@use 'src/tokens/shadcn'; .x { color: shadcn.state-fill(#888, white, white, 90%, 7); }", options), /rest fill\/pair conflict/)
})

test('local state container uses inner surface over card over canvas and can be supplied to the complete emitter', () => {
  const root = new URL('../../', import.meta.url)
  const css = sass.compileString(`@use 'src/themes/shadcn'; @use 'src/tokens/shadcn' as tokens; @use 'sass:map';
    .a { @include shadcn.scheme('stone', dark, true, rgba(255,255,255,.2)); }
    $profile: tokens.profile('stone', dark); $fills: tokens.role-fills($profile, dark); $pairs: tokens.role-pairs($profile, dark);
    .b { @each $role, $fill in $fills { @each $state, $weight in (hover:90%, pressed:80%) {
      --qds-color-#{$role}-#{$state}: #{tokens.state-fill($fill,map.get($pairs,$role),rgb(73.4,71,69.4),$weight)};
    } } }`, {
    loadPaths: [root.pathname], silenceDeprecations: ['if-function'],
  }).css
  const properties = (selector) => Object.fromEntries([...css.match(new RegExp(`\\.${selector} \\{([^}]+)\\}`))[1].matchAll(/(--[\w-]+): ([^;]+);/g)].map((p) => [p[1], p[2]]))
  const a = properties('a'), b = properties('b')
  for (const role of roles) {
    for (const state of ['hover', 'pressed']) assert.equal(a[`--qds-color-${role}-${state}`], b[`--qds-color-${role}-${state}`])
  }
})

test('theme modules contain declarations only; scoped selectors never target components or element tags', () => {
  const root = new URL('../../', import.meta.url)
  const source = readFileSync(new URL('src/themes/_shadcn.scss', root), 'utf8')
  assert.doesNotMatch(source, /\.q-(?:btn|card|field|menu|dialog)|!important/)
  const css = sass.compileString("@use 'src/themes/shadcn'; @include shadcn.scopes;", {
    loadPaths: [root.pathname], silenceDeprecations: ['if-function'],
  }).css
  // @use fallbacks emits the unchanged universal root contract first.
  const shadcnCss = css.slice(css.indexOf('  :is(body.qds-ui.qds-variant-shadcn'))
  for (const rule of shadcnCss.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!rule[1].trim().startsWith('@')) {
      assert.match(rule[1], /\.qds-variant-shadcn/)
      assert.doesNotMatch(rule[2], /(?:^|;)\s*(?!color-scheme\b)[a-z][\w-]*\s*:/)
    }
  }
  assert.match(css, /\}\s*\.qds-variant-shadcn \{\s*--q-primary:/)
})

test('final declaration map emits no overwritten fallback assignments or duplicate properties', () => {
  const root = new URL('../../', import.meta.url)
  const css = sass.compileString("@use 'src/themes/shadcn'; .aliases { @include shadcn.aliases; } .boundary { @include shadcn.boundary-aliases; }", {
    loadPaths: [root.pathname], silenceDeprecations: ['if-function'],
  }).css
  for (const block of css.matchAll(/\.(aliases|boundary) \{([^}]+)\}/g)) {
    const names = [...block[2].matchAll(/(--[\w-]+):/g)].map((m) => m[1])
    assert.equal(new Set(names).size, names.length, `${block[1]} emits duplicates`)
    if (block[1] === 'boundary') {
      for (const name of names) assert.doesNotMatch(name, /--qds-(?:radius-|control-size-|font-|line-height-|selection-|scrollbar-size|table-row-height|table-header-height)/)
      for (const required of ['--qds-fg-default','--qds-bg-card','--qds-field-label-bg','--qds-banner-text','--qds-table-header-text','--qds-material-regular-bg','--qds-card-header-bg']) assert.ok(names.includes(required), `${required} stranded`)
    }
  }
})
