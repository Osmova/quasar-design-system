import assert from 'node:assert/strict'
import { test } from 'node:test'
import { compile } from 'sass'
import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { readFileSync } from 'node:fs'
import { compileMechanics, compilePilot, families, root } from './grammar-fixture.mjs'
import { compileSubstrateBaseline, substrateBaseline } from './grammar-fixture-baseline.mjs'

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

test('T184 substrate compares current entries to immutable 150d952 source including its entire Sass import context', () => {
  assert.equal(substrateBaseline, '150d9526aa9aad65af8259cb4aab313d7ab6cce4')
  const baselines = [
    ['index.scss', '09821b3b1e84586cf76ecd16aae554fe034ea6053a7375cc8641453334c0d2dd', 457110, 47255],
    ['index.layered.scss', 'a3bf89607b40ad497b4f7f9ae5e3c2db822e19ad7f934f325f8a04cc0db3a407', 467546, 47877],
  ]
  for (const [entry, hash, bytes, gzip] of baselines) {
    const { css } = compile(new URL(`src/css/${entry}`, root).pathname, { style: 'compressed', loadPaths: [new URL('node_modules/', root).pathname], silenceDeprecations: ['if-function'] })
    const baseline = compileSubstrateBaseline(`src/css/${entry}`)
    assert.equal(createHash('sha256').update(baseline).digest('hex'), hash, `${substrateBaseline}/${entry}`)
    assert.equal(css, baseline, `T184 substrate parity: ${entry}; intentional future grammar migrations must explicitly replace this phase gate, never regenerate its baseline`)
    assert.equal(Buffer.byteLength(css), bytes)
    assert.equal(gzipSync(css, { level: 9 }).length, gzip)
    assert.ok(bytes <= 480000 && gzip <= 48000)
  }
})

test('mandatory runtime and publish gates run grammar browser proof serially after the existing checks', () => {
  const { scripts } = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'))
  assert.equal(scripts['test:runtime:grammar:browser'], 'node tests/runtime/grammar-fixture-browser.mjs')
  assert.equal(scripts['test:runtime'], 'pnpm test:runtime:ssr && pnpm test:runtime:colorjs && pnpm test:runtime:fill-contrast && pnpm test:runtime:grammar:browser')
  assert.ok(scripts['verify:publish'].split(' && ').includes('pnpm test:runtime'))
})
