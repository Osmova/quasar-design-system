import assert from 'node:assert/strict'
import { test } from 'node:test'
import { compile } from 'sass'
import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import postcss from 'postcss'
import { compileEntry, DEFAULT_SCOPE, ownerOfSelector, partitionCss, VARIANT_SCOPES } from '../../scripts/css-partition.mjs'
import { readFileSync } from 'node:fs'
import { compileMechanics, compilePilot, families, root } from './grammar-fixture.mjs'
import { compileSubstrateBaseline, substrateBaseline } from './grammar-fixture-baseline.mjs'
import { ruleKeys } from './css-rules.mjs'
import { ADDED_WIN_RULE, ADDED_IMPORTANT_RULE, applyDeclaredFluentChanges, applyDeclaredShadcnChanges } from './declared-fluent-changes.mjs'

test('independent hooks compile identically after physically excluding all compatibility modules', () => {
  assert.equal(compilePilot(), compilePilot({ removed: true }))
  for (const family of families) assert.notEqual(compilePilot({ omit: family }), compilePilot())
  assert.notEqual(compilePilot({ compatibility: true }), compilePilot())
  for (const family of families) assert.notEqual(compilePilot({ leak: family }), compilePilot())
})

test('neutral mechanics emit layout/containment only, without focus, paint, typography or profile geometry', () => {
  const css = compileMechanics()
  const declarations = [...css.matchAll(/(?:\{|;)([\w-]+):/g)].map((m) => m[1])
  assert.deepEqual(new Set(declarations), new Set(['min-width', 'flex-shrink', 'overflow-wrap', 'pointer-events', 'overflow', 'overscroll-behavior']))
  assert.doesNotMatch(css, /fluent|variant|focus|::|--qds-/)
  for (const family of ['q-btn', 'q-field', 'q-tab', 'q-menu']) assert.ok(css.includes(family))
})

// T184 froze whole-entry byte parity against 150d952 for the extraction step and
// recorded that the FIRST intentional grammar change replaces that phase gate
// with current-profile checks rather than regenerating its baseline. Parity is
// now enforced rule by rule: every 150d952 rule must still be present verbatim
// and in order, and every added rule must belong to a profile added after it.
// The immutable baseline source hash is never regenerated.
// data-qds-shadcn-accent: optional shadcn brand accent added after 150d952 (token-only rules).
// Ink is rebuilt for 0.10.0 as a new design language: its 150d952 rules are
// retired, not immutable, and its new rules are an added profile.
const PROFILE_SCOPES = /qds-variant-zen|qds-reading|qds-variant-glass|qds-variant-ink|data-qds-shadcn-accent/
const RETIRED_PROFILE = 'ink'
const selectorsOf = (rule) => {
  const path = rule.slice(0, rule.indexOf('{')).split('|')
  const list = path[path.length - 1]
  const parts = []
  let depth = 0
  let start = 0
  for (let i = 0; i < list.length; i++) {
    if (list[i] === '(') depth++
    else if (list[i] === ')') depth--
    else if (list[i] === ',' && depth === 0) { parts.push(list.slice(start, i)); start = i + 1 }
  }
  return [...parts, list.slice(start)]
}
// Ink's rules left the shared partials: drop its own selectors and its alternatives inside shared :is() lists.
const INK_ALTERNATIVES = [':is(.qds-ui.qds-variant-ink,.qds-ui .qds-variant-ink),', '.qds-ui.qds-variant-ink,.qds-ui .qds-variant-ink,']
const retire = (rule) => {
  const brace = rule.indexOf('{')
  const head = rule.slice(0, brace)
  const prefix = head.slice(0, head.lastIndexOf('|') + 1)
  const kept = selectorsOf(rule).filter((selector) => ownerOfSelector(selector) !== RETIRED_PROFILE)
    .map((selector) => INK_ALTERNATIVES.reduce((out, alt) => out.replace(alt, ''), selector).replace(/:is\((:is\([^()]*\))\)/g, '$1'))
  return kept.length ? `${prefix}${kept.join(',')}${rule.slice(brace)}` : null
}
// The runtime's per-variant stylesheet sentinel, one declaration per variant scope.
const VARIANT_SENTINEL = /\.qds-variant-([a-z]+)\{--_qds-variant: ?\1\}$/
test('T184 substrate keeps every immutable 150d952 rule verbatim and admits only added-profile rules', () => {
  assert.equal(substrateBaseline, '150d9526aa9aad65af8259cb4aab313d7ab6cce4')
  const baselines = [
    ['index.scss', '09821b3b1e84586cf76ecd16aae554fe034ea6053a7375cc8641453334c0d2dd', 457110, 47255],
    ['index.layered.scss', 'a3bf89607b40ad497b4f7f9ae5e3c2db822e19ad7f934f325f8a04cc0db3a407', 467546, 47877],
  ]
  for (const [entry, hash, baselineBytes, baselineGzip] of baselines) {
    const { css } = compile(new URL(`src/css/${entry}`, root).pathname, { style: 'compressed', loadPaths: [new URL('node_modules/', root).pathname], silenceDeprecations: ['if-function'] })
    const baseline = compileSubstrateBaseline(`src/css/${entry}`)
    assert.equal(createHash('sha256').update(baseline).digest('hex'), hash, `${substrateBaseline}/${entry}`)
    assert.equal(Buffer.byteLength(baseline), baselineBytes)
    assert.equal(gzipSync(baseline, { level: 9 }).length, baselineGzip)

    const current = ruleKeys(css)
    // The frozen hash above still covers the untouched baseline; only the
    // enumerated declared changes are normalised before the rule-by-rule compare.
    const expected = ruleKeys(applyDeclaredShadcnChanges(applyDeclaredFluentChanges(baseline, { layered: entry.includes('layered') }))).map(retire).filter(Boolean)
    const added = []
    let cursor = 0
    for (const rule of expected) {
      const found = current.indexOf(rule, cursor)
      assert.notEqual(found, -1, `T184 parity: ${entry} dropped or altered an immutable 150d952 rule: ${rule.slice(0, 160)}`)
      added.push(...current.slice(cursor, found))
      cursor = found + 1
    }
    added.push(...current.slice(cursor))
    for (const rule of added) {
      if (ADDED_IMPORTANT_RULE.test(rule) || ADDED_WIN_RULE.test(rule) || VARIANT_SENTINEL.test(rule)) continue
      assert.match(rule, PROFILE_SCOPES, `T184 parity: ${entry} added a rule outside the added profiles: ${rule.slice(0, 160)}`)
    }
    assert.ok(added.length > 0, `${entry} must actually carry the added profiles`)
  }
})

// css:budget owns these caps; this gate repeats them so a runtime-only run
// cannot report green while the shipped bundle is over budget.
test('the all-in bundle, the shared core and every complete variant bundle stay inside the reviewed CSS budget', () => {
  for (const entry of ['index.scss', 'index.layered.scss']) {
    const full = compileEntry(new URL(`src/css/${entry}`, root).pathname)
    const [allMin, allGzip] = [Buffer.byteLength(full), gzipSync(full, { level: 9 }).length]
    assert.ok(allMin <= 705000 && allGzip <= 71000, `${entry} all: measured min ${allMin} / gzip ${allGzip} against caps 705000 / 71000`)
    const parts = partitionCss(full)
    for (const [name, css] of Object.entries(parts)) {
      const [maxMin, maxGzip] = name === 'core' ? [210000, 26000] : [380000, 46000]
      const bytes = Buffer.byteLength(css)
      const gzip = gzipSync(css, { level: 9 }).length
      assert.ok(bytes <= maxMin && gzip <= maxGzip, `${entry} ${name}: measured min ${bytes} / gzip ${gzip} against caps ${maxMin} / ${maxGzip}`)
    }
  }
})

test('each variant bundle is the full stylesheet minus every other variant, in the original rule order', () => {
  // Adjacent rules with identical declarations are one rule split by owner; their selector order is immaterial.
  const rules = (css, keep = () => true) => {
    const rows = []
    postcss.parse(css).walkRules((rule) => {
      const at = []
      for (let p = rule.parent; p && p.type !== 'root'; p = p.parent) at.unshift(`${p.name} ${p.params}`)
      const head = `${at.join('>')}|${rule.nodes.map((n) => n.toString()).join(';')}`
      const selectors = rule.selectors.filter(keep)
      if (!selectors.length) return
      const last = rows[rows.length - 1]
      if (last?.head === head) last.selectors.push(...selectors)
      else rows.push({ head, selectors })
    })
    return rows.map(({ head, selectors }) => `${head}|${selectors.sort().join(',')}`)
  }
  for (const entry of ['index.scss', 'index.layered.scss']) {
    const full = compileEntry(new URL(`src/css/${entry}`, root).pathname)
    const parts = partitionCss(full)
    for (const name of ['core', ...VARIANT_SCOPES]) {
      const keep = (selector) => {
        const owner = ownerOfSelector(selector)
        return owner === null || owner === name || (name === 'core' && owner === DEFAULT_SCOPE)
      }
      assert.deepEqual(rules(parts[name]), rules(full, keep), `${entry}: ${name} keeps its own and the shared rules in source order`)
    }
  }
})

test('mandatory runtime and publish gates run the grammar and variant bundle browser proofs serially after the existing checks', () => {
  const { scripts } = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'))
  assert.equal(scripts['test:runtime:grammar:browser'], 'node tests/runtime/grammar-fixture-browser.mjs')
  assert.equal(scripts['test:runtime:variants:browser'], 'node tests/runtime/variant-bundles-browser.mjs')
  assert.equal(scripts['test:runtime'], 'pnpm test:runtime:ssr && pnpm test:runtime:colorjs && pnpm test:runtime:fill-contrast && pnpm test:runtime:grammar:browser && pnpm test:runtime:variants:browser')
  assert.ok(scripts['verify:publish'].split(' && ').includes('pnpm test:runtime'))
})
