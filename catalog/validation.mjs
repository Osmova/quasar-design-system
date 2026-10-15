// Development-only validation over a captured source tree. No test-only CLI faults.
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { parse, compileScript, compileTemplate } from 'vue/compiler-sfc'
import {
  REPO_ROOT, readQuasarSource, readQuasarVersion, countAtlasHooks,
  buildNativeInventory, buildFixtures, buildProofStatus, stableStringify,
} from '../scripts/catalog-generate.mjs'

export function loadCatalogSources(root = REPO_ROOT) {
  const files = {}
  const load = (name) => {
    const absolute = path.join(root, name)
    if (existsSync(absolute)) files[name] = readFileSync(absolute, 'utf8')
  }
  load('catalog/manifest.json')
  load('catalog/control.json')
  load('catalog/native-inventory.json')
  load('catalog/proof-status.json')
  const manifest = JSON.parse(files['catalog/manifest.json'])
  for (const entry of manifest.cases) {
    load(path.posix.join('catalog', entry.demo))
    load(path.posix.join('catalog', entry.fixtures))
  }
  load('stories/catalog-proof.story.vue')
  load(manifest.hosts.storybook.adapter)
  return { files, quasarSource: readQuasarSource(root), quasarVersion: readQuasarVersion(root), atlas: countAtlasHooks(root) }
}

function walkTs(node, visit) {
  visit(node)
  ts.forEachChild(node, (child) => walkTs(child, visit))
}
function identifiers(expression) {
  const names = new Set()
  walkTs(ts.createSourceFile('expression.ts', expression, ts.ScriptTarget.Latest, true), (node) => {
    if (ts.isIdentifier(node)) names.add(node.text)
  })
  return names
}

// Compiler AST: comments/imports/prop type declarations cannot satisfy a binding.
export function templateEvidence(source, filename) {
  const { descriptor, errors } = parse(source, { filename })
  if (errors.length || !descriptor.template) throw new Error(`invalid Vue SFC: ${filename}`)
  const script = compileScript(descriptor, { id: filename })
  const dependencies = new Map()
  walkTs(ts.createSourceFile(filename + '.ts', descriptor.scriptSetup?.content ?? '', ts.ScriptTarget.Latest, true), (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer
      && ts.isCallExpression(node.initializer) && node.initializer.expression.getText() === 'computed') {
      dependencies.set(node.name.text, identifiers(node.initializer.getText()))
    }
  })
  const expand = (expression) => {
    const names = identifiers(expression)
    for (const name of names) for (const dep of dependencies.get(name) ?? []) names.add(dep)
    return names
  }
  const compiled = compileTemplate({ source: descriptor.template.content, filename, id: filename, compilerOptions: { bindingMetadata: script.bindings, expressionPlugins: ['typescript'] } })
  if (compiled.errors.length) throw new Error(`invalid Vue template: ${filename}: ${compiled.errors.join(', ')}`)
  const bindings = new Set()
  const elements = []
  const visit = (node) => {
    if (node.type === 1) {
      elements.push(node)
      for (const prop of node.props) {
        if (prop.type === 7 && prop.exp) for (const name of expand(prop.exp.loc.source)) bindings.add(name)
      }
    }
    if (node.type === 5) for (const name of expand(node.content.loc.source)) bindings.add(name)
    if (node.condition) for (const name of expand(node.condition.loc.source)) bindings.add(name)
    if (node.source?.loc) for (const name of expand(node.source.loc.source)) bindings.add(name)
    for (const child of node.children ?? []) visit(child)
    for (const branch of node.branches ?? []) visit(branch)
  }
  visit(compiled.ast)
  return { bindings, elements, descriptor }
}

function storybookEvidence(source) {
  const ast = ts.createSourceFile('adapter.ts', source, ts.ScriptTarget.Latest, true)
  const functions = new Map()
  const exports = new Map()
  walkTs(ast, (node) => {
    if (ts.isFunctionDeclaration(node) && node.name) functions.set(node.name.text, node)
    if (ts.isVariableStatement(node) && node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
      for (const declaration of node.declarationList.declarations) exports.set(declaration.name.getText(ast), declaration.initializer)
    }
  })
  return { ast, functions, exports }
}

export function validateCatalog(snapshot, { complete = false } = {}) {
  const errors = []
  const check = (ok, message) => { if (!ok) errors.push(message) }
  const { files } = snapshot
  let manifest, control, inventory
  try {
    manifest = JSON.parse(files['catalog/manifest.json'])
    control = JSON.parse(files['catalog/control.json'])
    inventory = JSON.parse(files['catalog/native-inventory.json'])
  } catch (error) { return { errors: [`invalid catalog JSON: ${error.message}`] } }
  check(manifest.schemaVersion === 1 && manifest.scope?.kind === 'development-only', 'manifest schema/scope invalid')
  check(manifest.runtime?.persist === false && manifest.runtime.injection.key === 'DESIGN_SYSTEM_THEME_KEY', 'preview injection/persistence contract invalid')
  check(new Set(manifest.cases.map((c) => c.id)).size === manifest.cases.length, 'duplicate case id')
  // Proof mode stays bounded; full mode derives completion only from actual rows.
  if (!complete) {
    check(manifest.cases.length === 4 && ['actions/button', 'forms/field', 'navigation/tabs', 'overlays/menu'].every((id) => manifest.cases.some((c) => c.id === id)), 'bounded proof requires its four cases')
  }
  let expected
  try {
    expected = buildNativeInventory(manifest, snapshot.quasarVersion, snapshot.quasarSource, snapshot.atlas)
    check(files['catalog/native-inventory.json'] === stableStringify(expected), 'native-inventory.json is stale or claims unbacked coverage')
    check(files['catalog/proof-status.json'] === stableStringify(buildProofStatus(manifest, expected, snapshot.quasarVersion)), 'proof-status.json is stale')
  } catch (error) { errors.push(error.message) }
  try {
    for (const fixture of buildFixtures(manifest, control)) {
      check(files[`catalog/fixtures/${fixture.case.replaceAll('/', '-')}.fixture.json`] === stableStringify(fixture), `fixture rows/defaults drift: ${fixture.case}`)
    }
  } catch (error) { errors.push(error.message) }
  const sb = storybookEvidence(files[manifest.hosts.storybook.adapter] ?? '')
  let histoire
  try { histoire = templateEvidence(files['stories/catalog-proof.story.vue'] ?? '', 'catalog-proof.story.vue') }
  catch (error) { errors.push(error.message) }
  const hsScript = histoire?.descriptor.scriptSetup?.content ?? ''
  const hsAst = ts.createSourceFile('histoire.ts', hsScript, ts.ScriptTarget.Latest, true)
  const demoMap = new Map()
  walkTs(hsAst, (node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(hsAst) === 'demoByCase' && ts.isObjectLiteralExpression(node.initializer)) {
      for (const prop of node.initializer.properties) if (ts.isPropertyAssignment(prop)) demoMap.set(prop.name.text, prop.initializer.getText(hsAst))
    }
  })
  for (const [index, entry] of manifest.cases.entries()) {
    check(entry.order === index + 1 && ['implemented', 'planned'].includes(entry.disposition), `case order/disposition invalid: ${entry.id}`)
    const rows = control.cases[entry.id] ?? []
    check(rows.length === entry.controls.length && rows.every((r) => entry.controls.includes(r.key)), `control rows mismatch: ${entry.id}`)
    for (const row of rows) {
      check(control.kinds.includes(row.kind) && Boolean(row.subelement && row.semantics), `control semantics invalid: ${entry.id}/${row.key}`)
      check((row.kind === 'select') === Array.isArray(row.options) && (row.kind !== 'select' || row.options.includes(row.default)), `control options/default invalid: ${entry.id}/${row.key}`)
      check(row.kind !== 'toggle' || typeof row.default === 'boolean', `control toggle default invalid: ${entry.id}/${row.key}`)
    }
    if (entry.disposition !== 'implemented') continue
    const demoPath = path.posix.join('catalog', entry.demo)
    const demoName = path.basename(entry.demo, '.vue')
    const source = files[demoPath]
    check(typeof source === 'string', `demo file missing: ${entry.id}`)
    if (source) {
      try {
        const evidence = templateEvidence(source, demoPath)
        for (const key of entry.controls) check(evidence.bindings.has(key), `demo template binding missing: ${entry.id}/${key}`)
        for (const name of entry.nativeExports) check(evidence.elements.some((e) => e.tag === name), `native export not rendered: ${entry.id}/${name}`)
        if (entry.id === 'actions/button') {
          for (const tag of ['QBtn', 'QBtnDropdown']) {
            check(evidence.elements.filter((e) => e.tag === tag).every((e) => e.props.some((p) => p.type === 7 && p.name === 'bind' && p.arg?.content === 'loading' && identifiers(p.exp?.loc.source ?? '').has('loading'))), `button branch loading binding missing: ${tag}`)
          }
        }
      } catch (error) { errors.push(error.message) }
    }
    const exported = sb.exports.get(entry.hostIdMap.storybookExport)
    check(Boolean(exported), `storybook static export missing: ${entry.hostIdMap.storybookExport}`)
    // Inspect the actual export -> storyFor -> render function -> h(Demo, props).
    let renderFunction
    if (exported && ts.isCallExpression(exported) && exported.expression.getText(sb.ast) === 'storyFor') {
      check(exported.arguments[0]?.getText(sb.ast) === `caseById('${entry.id}')`, `storybook case mapping drift: ${entry.id}`)
      renderFunction = sb.functions.get(exported.arguments[1]?.getText(sb.ast))
    }
    const passed = new Set()
    if (renderFunction) walkTs(renderFunction, (node) => {
      if (ts.isCallExpression(node) && node.expression.getText(sb.ast) === 'h' && node.arguments[0]?.getText(sb.ast) === demoName && ts.isObjectLiteralExpression(node.arguments[1])) {
        for (const prop of node.arguments[1].properties) {
          if (!ts.isPropertyAssignment(prop)) continue
          const key = prop.name.getText(sb.ast)
          walkTs(prop.initializer, (value) => {
            if (ts.isPropertyAccessExpression(value) && value.expression.getText(sb.ast) === 'args' && value.name.text === key) passed.add(key)
          })
        }
      }
    })
    for (const key of entry.controls) check(passed.has(key), `storybook render binding missing: ${entry.id}/${key}`)
    check(demoMap.get(entry.id) === demoName, `histoire demo mapping drift: ${entry.id}`)
  }
  check(histoire?.elements.some((e) => e.tag === 'component' && e.props.some((p) => p.type === 7 && p.name === 'bind' && !p.arg && p.exp?.content === 'state')), 'histoire reactive state binding missing')
  check(histoire?.elements.some((e) => e.tag === 'QdsPreviewScaffold'), 'histoire shared scaffold missing')
  const layout = histoire?.elements.find((e) => e.tag === 'Story')?.props.find((p) => p.type === 7 && p.name === 'bind' && p.arg?.content === 'layout')?.exp?.loc.source
  let isolated = false
  if (layout) walkTs(ts.createSourceFile('layout.ts', `const layout = ${layout}`, ts.ScriptTarget.Latest, true), (node) => {
    if (ts.isObjectLiteralExpression(node)) {
      const values = new Map(node.properties.filter(ts.isPropertyAssignment).map((p) => [p.name.getText(), p.initializer.getText()]))
      isolated = values.get('type') === "'single'" && values.get('iframe') === 'true'
    }
  })
  check(isolated, 'histoire proof must use isolated single iframe layout')
  const planned = inventory.exports.filter((row) => row.proofStatus === 'planned')
  if (complete) {
    for (const row of [...planned, ...inventory.visualPlugins.filter((r) => r.proofStatus === 'planned'), ...inventory.optionalModules.filter((r) => r.proofStatus === 'optional-separate')]) errors.push(`PLANNED ${row.name}: no implemented proof`)
    for (const entry of manifest.cases.filter((c) => c.disposition === 'planned')) errors.push(`PLANNED case ${entry.id}`)
  }
  return { errors, caseCount: manifest.cases.length, exportCount: inventory.exports.length, plannedCount: planned.length }
}
