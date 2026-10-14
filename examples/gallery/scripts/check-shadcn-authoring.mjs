// Authoring-only syntax/inventory check. Does not resolve runtime imports,
// compile Sass, start a server, collect Playwright tests, or render components.
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { parse, compileScript, compileTemplate } from 'vue/compiler-sfc'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const root = new URL('../../../', import.meta.url)
const files = [
  'examples/gallery/src/App.vue', 'examples/gallery/src/sections/VariantsSection.vue',
  'examples/gallery/src/sections/catalog/CatalogLoadingData.vue',
  'examples/gallery/src/sections/PluginsSection.vue',
  'examples/gallery/src/components/ShadcnPalettePanels.vue',
  'examples/gallery/src/conformance/NativeConformance.vue', 'examples/gallery/src/conformance/NativeScheme.vue',
  'examples/gallery/src/conformance/NativeStates.vue', 'examples/gallery/src/conformance/NativeOracle.vue',
  'stories/_shared/StoryShell.vue', 'stories/shadcn-native.story.vue',
  'histoire.setup.ts', 'examples/gallery/vite.config.ts',
  'examples/gallery/playwright.config.ts', 'examples/gallery/playwright.shadcn-reference.config.ts',
  'examples/gallery/src/conformance/bootstrap.ts', 'examples/gallery/src/conformance/main.ts', 'examples/gallery/src/conformance/main-layered.ts',
  'examples/gallery/tests/visual/helpers.ts', 'examples/gallery/tests/visual/shadcn-browser.ts',
  'examples/gallery/tests/visual/shadcn-coverage.ts', 'examples/gallery/tests/visual/shadcn-catalog.spec.ts',
  'examples/gallery/tests/visual/shadcn-contracts.spec.ts', 'examples/gallery/tests/visual/shadcn-overlays.spec.ts',
  'examples/gallery/tests/visual/shadcn-reference.spec.ts', 'examples/gallery/tests/visual/variants.spec.ts',
  'examples/gallery/tests/visual/forms.spec.ts', 'examples/gallery/tests/visual/apps.spec.ts',
  'examples/gallery/tests/visual/control-composition.spec.ts', 'examples/gallery/tests/visual/overrides.spec.ts',
]
let failures = 0
for (const path of files) {
  const filename = fileURLToPath(new URL(path, root))
  const source = await readFile(filename, 'utf8')
  try {
    let script = source
    if (path.endsWith('.vue')) {
      const { descriptor, errors } = parse(source, { filename })
      if (errors.length) throw errors[0]
      script = compileScript(descriptor, { id: path }).content
      const template = compileTemplate({ source: descriptor.template.content, filename, id: path, compilerOptions: { expressionPlugins: ['typescript'] } })
      if (template.errors.length) throw template.errors[0]
    }
    const compiled = ts.transpileModule(script, { fileName: filename, reportDiagnostics: true, compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext } })
    const errors = compiled.diagnostics?.filter(entry => entry.category === ts.DiagnosticCategory.Error) ?? []
    if (errors.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(errors, { getCanonicalFileName: name => name, getCurrentDirectory: () => fileURLToPath(root), getNewLine: () => '\n' }))
    if (/\btest\.(skip|only|fixme)\s*\(/.test(source)) throw new Error('Skipped/focused test is forbidden')
  } catch (error) { failures++; console.error(`${path}: ${error.message ?? error}`) }
}
const source = await readFile(new URL('examples/gallery/tests/visual/shadcn-coverage.ts', root), 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext } }).outputText
const { NATIVE_ROWS } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
const rows = NATIVE_ROWS.map(row => row.row)
if (JSON.stringify(rows) !== JSON.stringify(Array.from({ length: 31 }, (_, i) => i + 7))) throw new Error('T170 row inventory is incomplete/duplicated')
for (const row of NATIVE_ROWS) if (!row.parts.length && !row.stateSpec) throw new Error(`No assertion disposition for row ${row.row}`)
const routes = new Set(NATIVE_ROWS.filter(row => row.parts.length).map(row => row.route)).size
console.log(JSON.stringify({
  kind: 'static authoring check, NOT mounted acceptance', parsedFiles: files.length, syntaxFailures: failures,
  checklistRows: rows.length, nativeSelectors: NATIVE_ROWS.reduce((n, row) => n + row.parts.length, 0),
  intendedPerProject: {
    catalog: { functional: 5 + 10 * routes, screens: 12 },
    overlays: { functional: 20, screens: 10 },
    contracts: { functional: 33, screens: 0 },
    reference: { functional: 10, screens: 2 },
  }, projects: ['desktop', 'mobile'],
}, null, 2))
if (failures) process.exitCode = 1
