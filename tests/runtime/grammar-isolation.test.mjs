import assert from 'node:assert/strict'
import { test } from 'node:test'
import { compile } from 'sass'
import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { readFileSync } from 'node:fs'
import { compileMechanics, compilePilot, families, root } from './grammar-fixture.mjs'
import { compileSubstrateBaseline, substrateBaseline } from './grammar-fixture-baseline.mjs'
import { ruleKeys } from './css-rules.mjs'

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
// with current-profile checks rather than regenerating its baseline. Folio is
// that change, so parity is now enforced rule by rule: every 150d952 rule must
// still be present verbatim and in order, and every added rule must be
// Folio-scoped. The immutable baseline source hash is never regenerated.
const FOLIO_SCOPES = /qds-variant-folio|qds-reading/
test('T184 substrate keeps every immutable 150d952 rule verbatim and admits only Folio-scoped additions', () => {
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
    const expected = ruleKeys(baseline)
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
      assert.match(rule, FOLIO_SCOPES, `T184 parity: ${entry} added a rule outside the Folio profile: ${rule.slice(0, 160)}`)
    }
    assert.ok(added.length > 0, `${entry} must actually carry the Folio profile`)
  }
})

// css:budget owns these caps; this gate repeats them so a runtime-only run
// cannot report green while the shipped bundle is over budget.
test('both entries stay inside the reviewed CSS budget', () => {
  for (const entry of ['index.scss', 'index.layered.scss']) {
    const { css } = compile(new URL(`src/css/${entry}`, root).pathname, { style: 'compressed', loadPaths: [new URL('node_modules/', root).pathname], silenceDeprecations: ['if-function'] })
    const bytes = Buffer.byteLength(css)
    const gzip = gzipSync(css, { level: 9 }).length
    assert.ok(bytes <= 600000 && gzip <= 58000, `${entry}: measured min ${bytes} / gzip ${gzip} against caps 600000 / 58000`)
  }
})

test('mandatory runtime and publish gates run grammar browser proof serially after the existing checks', () => {
  const { scripts } = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'))
  assert.equal(scripts['test:runtime:grammar:browser'], 'node tests/runtime/grammar-fixture-browser.mjs')
  assert.equal(scripts['test:runtime'], 'pnpm test:runtime:ssr && pnpm test:runtime:colorjs && pnpm test:runtime:fill-contrast && pnpm test:runtime:grammar:browser')
  assert.ok(scripts['verify:publish'].split(' && ').includes('pnpm test:runtime'))
})
