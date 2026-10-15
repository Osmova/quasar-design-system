/**
 * T185 catalog contract tests — generation determinism + live inventory parity.
 * Development-only; run via `pnpm catalog:test` (node --test tests/catalog/).
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  REPO_ROOT,
  countAtlasHooks,
  generateAll,
  parseQuasarComponentExports,
  readQuasarSource,
  stableStringify,
  classifyExport,
} from '../../scripts/catalog-generate.mjs'

const CATALOG_DIR = path.join(REPO_ROOT, 'catalog')

test('classification is explicit and parent existence never invents render coverage', () => {
  assert.throws(() => classifyExport('QFutureUnknown'), /Unclassified native export/)
  assert.throws(() => classifyExport('QSpinnerFutureUnknown'), /Unclassified native export/)
  const { inventory } = generateAll()
  for (const name of ['QRouteTab', 'QItemLabel', 'QInfiniteScroll']) assert.equal(inventory.exports.find((r) => r.name === name).proofStatus, 'planned')
  assert.equal(classifyExport('QResponsive').disposition, 'helper')
  assert.equal(classifyExport('QInfiniteScroll').disposition, 'core')
  assert.equal(inventory.exports.filter((r) => r.proofStatus.startsWith('covered')).length, inventory.coveredByImplementedCases.length)
})

test('first-generation determinism: two fresh generations are byte-identical', () => {
  const first = generateAll()
  const second = generateAll()

  assert.equal(first.inventoryText, second.inventoryText)
  assert.equal(first.statusText, second.statusText)
  assert.deepEqual(
    first.fixtureFiles.map((fixture) => fixture.text),
    second.fixtureFiles.map((fixture) => fixture.text),
  )
})

test('committed generated files are fresh (byte-equal to a fresh regeneration)', () => {
  const generated = generateAll()

  const inventoryOnDisk = readFileSync(path.join(CATALOG_DIR, 'native-inventory.json'), 'utf8')
  assert.equal(inventoryOnDisk, generated.inventoryText, 'catalog/native-inventory.json is stale — run pnpm catalog:generate')

  const statusOnDisk = readFileSync(path.join(CATALOG_DIR, 'proof-status.json'), 'utf8')
  assert.equal(statusOnDisk, generated.statusText, 'catalog/proof-status.json is stale — run pnpm catalog:generate')

  for (const fixture of generated.fixtureFiles) {
    const fixturePath = path.join(CATALOG_DIR, 'fixtures', `${fixture.fileSafe}.fixture.json`)
    assert.ok(existsSync(fixturePath), `missing fixture: ${fixture.fileSafe}.fixture.json`)
    assert.equal(readFileSync(fixturePath, 'utf8'), fixture.text, `stale fixture: ${fixture.fileSafe}.fixture.json`)
  }
})

test('native inventory matches the LIVE installed quasar source (never assumed)', () => {
  const source = readQuasarSource()
  const live = parseQuasarComponentExports(source)
  const generated = generateAll().inventory

  assert.equal(generated.counts.exports, live.length, 'inventory exports count must equal live parsed count')
  assert.equal(generated.exports.length, live.length, 'inventory rows must equal live parsed count')
  assert.equal(
    generated.source.sourceSha256,
    createHash('sha256').update(source).digest('hex'),
    'recorded source hash must match the live source file',
  )

  const liveNames = new Set(live.map((entry) => entry.name))
  for (const row of generated.exports) {
    assert.ok(liveNames.has(row.name), `inventory row ${row.name} is not a live quasar export`)
  }

  const partition = generated.counts.mixins + generated.counts.helpers + generated.counts.compositeChildren + generated.counts.spinners + generated.counts.core
  assert.equal(partition, generated.counts.exports, 'dispositions must partition the exports exactly')
  assert.equal(generated.counts.pluginsVisual, 5, 'visual plugins stay a separate 5-row group')
  assert.equal(generated.counts.optionalModules, 1, 'optional QWindow stays a separate module row')
})

test('atlas hook reference count is machine-verified and recorded (not assumed)', () => {
  const live = countAtlasHooks()
  const generated = generateAll().inventory

  assert.ok(live.uniqueHookIds > 0, 'atlas hook inventory must not silently drop to zero')
  assert.equal(
    generated.references.atlasHookInventory.uniqueHookIds,
    live.uniqueHookIds,
    'recorded atlas hook count must equal the live atlas-families count',
  )
  // The atlas hooks are a different inventory from the native export list:
  // they are recorded only as a reference, never counted as catalog cases.
  assert.notEqual(live.uniqueHookIds, generated.counts.exports + generated.counts.pluginsVisual + generated.counts.optionalModules)
})

test('every fixture mirrors the control table (single source of defaults)', () => {
  const { manifest, control, fixtureFiles } = generateAll()

  for (const fixture of fixtureFiles) {
    const parsed = JSON.parse(fixture.text)
    const catalogCase = manifest.cases.find((single) => single.id === parsed.case)
    assert.ok(catalogCase, `fixture belongs to a manifest case: ${parsed.case}`)
    const rows = control.cases[parsed.case]
    assert.deepEqual(
      flattenDefaults(parsed.fixtures.defaults),
      flattenDefaults(Object.fromEntries(rows.map((row) => [row.key, row.default]))),
      `fixture defaults must equal control.json defaults for ${parsed.case}`,
    )
    assert.deepEqual(
      [...parsed.fixtures.assertedSubelements].sort(),
      [...catalogCase.subelements].sort(),
      `fixture asserted subelements must equal the manifest case subelements for ${parsed.case}`,
    )
    // No duplicated expected values: defaults come ONLY from control.json.
    // eslint-disable-next-line no-prototype-builtins
  }
})

function flattenDefaults(defaults) {
  return Object.fromEntries(Object.keys(defaults).sort().map((key) => [key, defaults[key]]))
}

test('stable serialization rejects accumulated nondeterminism (sorted keys, trailing newline)', () => {
  const value = { b: 2, a: { z: 1, y: [3, 1] } }
  const text = stableStringify(value)
  const parsed = JSON.parse(text)
  assert.deepEqual(
    Object.keys(parsed),
    ['a', 'b'],
    'top-level keys must be sorted for deterministic diffs',
  )
  assert.ok(text.endsWith('}\n'), 'stable output ends with a newline')
})
