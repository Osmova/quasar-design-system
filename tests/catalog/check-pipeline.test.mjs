import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { loadCatalogSources, validateCatalog } from '../../catalog/validation.mjs'

const baseline = loadCatalogSources()
const checker = new URL('../../scripts/catalog-check.mjs', import.meta.url)
const validate = (snapshot) => validateCatalog(snapshot).errors
const clone = () => structuredClone(baseline)
const jsonEdit = (snapshot, name, mutate) => {
  const data = JSON.parse(snapshot.files[name])
  mutate(data)
  snapshot.files[name] = JSON.stringify(data)
}
const manifestEdit = (s, fn) => jsonEdit(s, 'catalog/manifest.json', fn)

test('CLI and pure validator pass the actual proof tree', () => {
  assert.deepEqual(validate(baseline), [])
  const result = spawnSync(process.execPath, [checker.pathname], { encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /4 proof cases/)
})

test('complete fails on actual planned rows, not a fixed case count', () => {
  const errors = validateCatalog(baseline, { complete: true }).errors
  assert.ok(errors.some((e) => e === 'PLANNED QRouteTab: no implemented proof'))
  assert.ok(errors.some((e) => e === 'PLANNED Notify: no implemented proof'))
  assert.ok(errors.some((e) => e === 'PLANNED QWindow: no implemented proof'))
  const expanded = clone()
  manifestEdit(expanded, (m) => m.cases.push({ ...m.cases[0], id: 'future/planned', order: 5, disposition: 'planned' }))
  assert.ok(!validateCatalog(expanded, { complete: true }).errors.some((e) => /four cases/.test(e)))
  assert.ok(validateCatalog(expanded, { complete: true }).errors.includes('PLANNED case future/planned'))
})

const faults = [
  ['missing-fixture-row', (s) => jsonEdit(s, 'catalog/fixtures/actions-button.fixture.json', (f) => f.fixtures.controls.shift()), /fixture rows\/defaults drift: actions\/button/],
  ['stale-inventory', (s) => jsonEdit(s, 'catalog/native-inventory.json', (i) => i.counts.exports++), /native-inventory.json is stale/],
  ['missing-adapter-export', (s) => { s.files['examples/storybook/stories/catalog-proof.stories.ts'] = s.files['examples/storybook/stories/catalog-proof.stories.ts'].replace('export const buttonProof', 'const buttonProof') }, /storybook static export missing: buttonProof/],
  ['unknown-case-export', (s) => manifestEdit(s, (m) => m.cases[0].nativeExports.push('QNotARealComponent')), /unknown quasar exports: QNotARealComponent/],
  ['missing-demo-file', (s) => { delete s.files['catalog/demos/QdsButtonDemo.vue'] }, /demo file missing: actions\/button/],
  ['drop-controlled-key', (s) => manifestEdit(s, (m) => m.cases[0].controls.shift()), /control rows mismatch: actions\/button/],
  ['planned-as-covered', (s) => jsonEdit(s, 'catalog/native-inventory.json', (i) => { i.exports.find((r) => r.name === 'QRouteTab').proofStatus = 'covered-via-parent' }), /native-inventory.json is stale or claims unbacked coverage/],
]

for (const [name, mutate, diagnostic] of faults) {
  test(`real source fault: ${name}`, () => {
    const snapshot = clone()
    mutate(snapshot)
    assert.notDeepEqual(snapshot, baseline, 'fault must actually change input')
    const assertDetected = (validator) => {
      const errors = validator(snapshot)
      assert.ok(errors.some((e) => diagnostic.test(e)), `missing specific diagnostic ${diagnostic}: ${errors.join('\n')}`)
    }
    assertDetected(validate)
    // The same harness must reject a disabled validator, not just accept exit 1.
    assert.throws(() => assertDetected(() => []), assert.AssertionError)
  })
}

test('mutation control: removing bindings is detected despite retained props and comments', () => {
  const snapshot = clone()
  snapshot.files['catalog/demos/QdsButtonDemo.vue'] = snapshot.files['catalog/demos/QdsButtonDemo.vue'].replaceAll(':loading="loading"', '<!-- loading -->')
  // Keep valid template syntax and the TypeScript prop declaration intact.
  snapshot.files['catalog/demos/QdsButtonDemo.vue'] = snapshot.files['catalog/demos/QdsButtonDemo.vue'].replaceAll('<!-- loading -->', '')
  snapshot.files['catalog/demos/QdsButtonDemo.vue'] += '\n<!-- loading is still declared -->'
  const assertDetected = (validator) => assert.ok(validator(snapshot).some((e) => e === 'demo template binding missing: actions/button/loading'))
  assertDetected(validate)
  assert.throws(() => assertDetected(() => []), assert.AssertionError)
})

test('split-only loading loss and render-adapter loss are independently detected', () => {
  const split = clone()
  split.files['catalog/demos/QdsButtonDemo.vue'] = split.files['catalog/demos/QdsButtonDemo.vue'].replace(':loading="loading"', '')
  assert.ok(validate(split).includes('button branch loading binding missing: QBtnDropdown'))
  const adapter = clone()
  adapter.files['examples/storybook/stories/catalog-proof.stories.ts'] = adapter.files['examples/storybook/stories/catalog-proof.stories.ts'].replace('loading: Boolean(args.loading)', 'loading: false /* args.loading */')
  assert.ok(validate(adapter).includes('storybook render binding missing: actions/button/loading'))
})

test('loader reads a real temporary source tree, including a missing demo', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'qds-catalog-'))
  const write = (name, data) => { mkdirSync(path.dirname(path.join(root, name)), { recursive: true }); writeFileSync(path.join(root, name), data) }
  try {
    for (const [name, text] of Object.entries(baseline.files)) write(name, text)
    write('node_modules/quasar/src/components.js', baseline.quasarSource)
    write('node_modules/quasar/package.json', JSON.stringify({ version: baseline.quasarVersion }))
    // Only hook IDs are used by the loader's independent reference inventory.
    write('examples/gallery/tests/visual/atlas-families.ts', readFileSync(new URL('../../examples/gallery/tests/visual/atlas-families.ts', import.meta.url), 'utf8'))
    assert.deepEqual(validate(loadCatalogSources(root)), [])
    rmSync(path.join(root, 'catalog/demos/QdsButtonDemo.vue'))
    assert.ok(validate(loadCatalogSources(root)).includes('demo file missing: actions/button'))
  } finally { rmSync(root, { recursive: true, force: true }) }
})
