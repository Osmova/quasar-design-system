import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { createRenderer, h, reactive, nextTick } from 'vue'
import { parse, compileScript } from 'vue/compiler-sfc'
import { configureDesignSystem } from '../../dist/index.js'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'

const dataModule = (source) => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64')
function resolveImports(source, base, overrides = {}) {
  return source.replace(/from\s+(['"])([^'"]+)\1/g, (_match, quote, name) => {
    const resolved = overrides[name] ?? (name.startsWith('.') ? new URL(name, base).href : import.meta.resolve(name))
    return `from ${quote}${resolved}${quote}`
  })
}
const helperUrl = new URL('../../catalog/preview/index.ts', import.meta.url)
const helper = await import(dataModule(resolveImports(ts.transpileModule(readFileSync(helperUrl, 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText, helperUrl)))

const renderer = createRenderer({
  createElement: (tag) => ({ tag, children: [] }),
  createText: (text) => ({ text }), createComment: (text) => ({ text }),
  insert: (child, parent) => { parent.children.push(child); child.parent = parent },
  remove: (child) => { const p = child.parent; if (p) p.children.splice(p.children.indexOf(child), 1) },
  setText: (node, text) => { node.text = text }, setElementText: (node, text) => { node.text = text },
  parentNode: (node) => node.parent, nextSibling: () => null,
  patchProp: (node, key, _old, value) => { node[key] = value },
})

test('actual shared scaffold defaults theme controls on and explicitly disables them for Storybook', async () => {
  const url = new URL('../../catalog/preview/QdsPreviewScaffold.vue', import.meta.url)
  const { descriptor } = parse(readFileSync(url, 'utf8'))
  const compiled = compileScript(descriptor, { id: 'scaffold-ssr-test', inlineTemplate: true })
  const code = ts.transpileModule(compiled.content, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
  const helperModule = dataModule(resolveImports(ts.transpileModule(readFileSync(helperUrl, 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText, helperUrl))
  const { default: Scaffold } = await import(dataModule(resolveImports(code, url, { './index.js': helperModule })))
  for (const [extra, count] of [[{}, 2], [{ themeControls: true }, 2], [{ themeControls: false }, 0]]) {
    const app = createSSRApp({ render: () => h(Scaffold, { caseId: 'actions/button', title: 'Actual scaffold', ...extra }) })
    const controller = configureDesignSystem(app, { target: null, persist: false, mode: 'light', variant: 'fluent' })
    try {
      const html = await renderToString(app)
      assert.equal((html.match(/<select\b/g) ?? []).length, count)
      assert.match(html, /mode: light \(light\)/)
      assert.doesNotMatch(html, /Controller blocker/)
    } finally { controller.destroy() }
  }
})

test('injection never uses the runtime fallback, including after its owner dies', () => {
  const owner = renderer.createApp({ render: () => null })
  const fallback = configureDesignSystem(owner, { target: null, persist: false })
  let result
  const probe = () => renderer.createApp({ setup() { result = helper.useCatalogPreviewController(); return () => null } })
  const first = probe(); first.mount({ children: [] })
  assert.equal(result.controller, null)
  assert.match(result.reason, /No preview controller injected/)
  first.unmount(); fallback.destroy()
  const second = probe(); second.mount({ children: [] })
  assert.equal(result.controller, null)
  second.unmount()
})

test('owned app mount/switch/unmount uses the compiled injection and releases both handles', () => {
  let result
  const app = renderer.createApp({ setup() { result = helper.useCatalogPreviewController(); return () => null } })
  const controller = configureDesignSystem(app, { target: null, persist: false, mode: 'light' })
  helper.ownPreviewController(app, controller)
  app.mount({ children: [] })
  assert.equal(result.controller, controller)
  assert.equal(globalThis.__qdsCatalogController, controller)
  assert.equal(globalThis.__qdsCatalogPhase(), 'mounted')
  controller.setMode('dark'); controller.setVariant('shadcn'); controller.setShadcnBaseColor('slate')
  assert.equal(result.controller.state.mode, 'dark')
  assert.equal(result.controller.state.shadcnBaseColor, 'slate')
  app.unmount()
  assert.equal(controller.state.initialized, false)
  assert.equal('__qdsCatalogController' in globalThis, false)
  assert.equal('__qdsCatalogPhase' in globalThis, false)
})

test('late old-app disposal cannot delete newer owned handles', () => {
  const make = () => {
    const app = renderer.createApp({ render: () => null })
    const controller = configureDesignSystem(app, { target: null, persist: false })
    helper.ownPreviewController(app, controller)
    app.mount({ children: [] })
    return { app, controller }
  }
  const old = make(); const fresh = make()
  old.app.unmount()
  assert.equal(globalThis.__qdsCatalogController, fresh.controller)
  assert.equal(globalThis.__qdsCatalogPhase(), 'mounted')
  fresh.app.unmount()
  assert.equal('__qdsCatalogController' in globalThis, false)
  assert.equal('__qdsCatalogPhase' in globalThis, false)
})

for (const legacy of [false, true]) {
  test(`shared-body handover preserves new paint and disposes old ${legacy ? 'legacy' : 'modern'} media listeners`, () => {
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
    const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
    const classes = new Set(['author-class'])
    const body = {
      dataset: { author: 'retained' },
      classList: {
        toggle(name, enabled) { enabled ? classes.add(name) : classes.delete(name) },
        remove(...names) { names.forEach((name) => classes.delete(name)) },
      },
    }
    const listeners = new Set()
    const media = { matches: false }
    if (legacy) {
      media.addListener = (callback) => listeners.add(callback)
      media.removeListener = (callback) => listeners.delete(callback)
    } else {
      media.addEventListener = (_event, callback) => listeners.add(callback)
      media.removeEventListener = (_event, callback) => listeners.delete(callback)
    }
    globalThis.document = { body }
    globalThis.window = { matchMedia: () => media }
    const apps = []
    const make = (options) => {
      const app = renderer.createApp({ render: () => null })
      apps.push(app)
      // Deliberately use the default document.body, not target:null.
      const controller = configureDesignSystem(app, { persist: false, ...options })
      helper.ownPreviewController(app, controller)
      app.mount({ children: [] })
      return { app, controller }
    }
    try {
      const old = make({ mode: 'system', variant: 'fluent' })
      assert.equal(listeners.size, 1)
      const oldListener = [...listeners][0]
      let oldDestroyCalls = 0
      const destroyOld = old.controller.destroy
      old.controller.destroy = () => { oldDestroyCalls++; destroyOld() }
      const fresh = make({ mode: 'dark', variant: 'shadcn', shadcnBaseColor: 'slate' })
      const assertFreshPaint = () => {
        assert.deepEqual(body.dataset, {
          author: 'retained', qdsMode: 'dark', qdsResolved: 'dark',
          qdsVariant: 'shadcn', qdsShadcnBaseColor: 'slate',
        })
        assert.deepEqual([...classes].sort(), ['author-class', 'qds-theme-dark', 'qds-ui', 'qds-variant-shadcn'].sort())
        assert.equal(globalThis.__qdsCatalogController, fresh.controller)
        assert.equal(globalThis.__qdsCatalogPhase(), 'mounted')
        assert.equal(fresh.controller.state.initialized, true)
      }
      // Handover must dispose the old owner immediately, without leaking its listener.
      assert.equal(oldDestroyCalls, 1)
      assert.equal(old.controller.state.initialized, false)
      assert.equal(listeners.has(oldListener), false)
      assert.equal(listeners.size, 1)
      assertFreshPaint()
      old.app.unmount(); apps.splice(apps.indexOf(old.app), 1)
      assert.equal(oldDestroyCalls, 1, 'late old-app cleanup must be idempotent')
      assert.equal(listeners.size, 1)
      assertFreshPaint()
      media.matches = true
      for (const callback of listeners) callback({ matches: true })
      assert.equal(old.controller.state.prefersDark, false, 'old owner no longer receives system events')
      assert.equal(fresh.controller.state.prefersDark, true)
      assertFreshPaint()
      fresh.app.unmount(); apps.splice(apps.indexOf(fresh.app), 1)
      assert.equal(listeners.size, 0)
      assert.equal(fresh.controller.state.initialized, false)
      assert.deepEqual(body.dataset, { author: 'retained' })
      assert.deepEqual([...classes], ['author-class'])
      assert.equal('__qdsCatalogController' in globalThis, false)
      assert.equal('__qdsCatalogPhase' in globalThis, false)
    } finally {
      for (const app of apps) app.unmount()
      for (const [name, descriptor] of [['window', originalWindow], ['document', originalDocument]]) {
        if (descriptor) Object.defineProperty(globalThis, name, descriptor)
        else delete globalThis[name]
      }
    }
  })
}

test('non-isolated persistent or uninitialized injection is rejected', () => {
  for (const persist of [true, false]) {
    let result
    const app = renderer.createApp({ setup() { result = helper.useCatalogPreviewController(); return () => null } })
    const controller = configureDesignSystem(app, { target: null, persist })
    if (!persist) controller.destroy()
    app.mount({ children: [] })
    assert.equal(result.controller, null)
    assert.match(result.reason, persist ? /persist: false/ : /never initialized/)
    app.unmount(); controller.destroy()
  }
})

test('compiled shared button renders reactive loading in plain AND split branches', async () => {
  // Native stand-ins expose received props, not implementation strings. The actual
  // shared SFC is compiled and mounted; Quasar browser paint remains a browser gate.
  const native = dataModule(`import { h } from '${import.meta.resolve('vue')}';
    const component = (name) => ({ name, props: ['label', 'dense', 'icon', 'disable', 'loading'], setup(props) { return () => h('native-' + name, { ...props }) } });
    export const QBtn = component('QBtn'), QBtnDropdown = component('QBtnDropdown'), QList = component('QList'), QItem = component('QItem'), QItemSection = component('QItemSection');`)
  const url = new URL('../../catalog/demos/QdsButtonDemo.vue', import.meta.url)
  const { descriptor } = parse(readFileSync(url, 'utf8'))
  const compiled = compileScript(descriptor, { id: 'button-test', inlineTemplate: true })
  const code = ts.transpileModule(compiled.content, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
  const { default: Demo } = await import(dataModule(resolveImports(code, url, { quasar: native })))
  const props = reactive({ label: 'Action', icon: '', dense: false, disable: false, loading: false, split: false })
  const root = { children: [] }
  const app = renderer.createApp({ render: () => h(Demo, props) })
  app.directive('close-popup', {})
  app.mount(root)
  const nativeNode = () => root.children[0].children.find((c) => c.tag?.startsWith('native-'))
  assert.equal(nativeNode().tag, 'native-QBtn')
  props.loading = true; await nextTick()
  assert.equal(nativeNode().loading, true)
  props.split = true; await nextTick()
  assert.equal(nativeNode().tag, 'native-QBtnDropdown')
  assert.equal(nativeNode().loading, true)
  props.loading = false; props.label = 'Updated'; props.dense = true; props.disable = true; await nextTick()
  assert.equal(nativeNode().loading, false)
  assert.equal(nativeNode().label, 'Updated')
  assert.equal(nativeNode().dense, true)
  assert.equal(nativeNode().disable, true)
  app.unmount()
})

test('real CSF exports forward every live arg and share control defaults/options', async () => {
  const controls = JSON.parse(readFileSync(new URL('../../catalog/control.json', import.meta.url), 'utf8'))
  const manifest = JSON.parse(readFileSync(new URL('../../catalog/manifest.json', import.meta.url), 'utf8'))
  const overrides = {
    '@qds-catalog/control.json': dataModule(`export default ${JSON.stringify(controls)}`),
    '@qds-catalog/manifest.json': dataModule(`export default ${JSON.stringify(manifest)}`),
    '@qds-catalog/preview/QdsPreviewScaffold.vue': dataModule(`import { h } from '${import.meta.resolve('vue')}'; export default { props: ['caseId', 'title', 'themeControls'], setup(props, { slots }) { return () => h('scaffold', { ...props }, slots.default()) } }`),
  }
  for (const entry of manifest.cases) {
    const filename = entry.demo.split('/').pop()
    const name = filename.replace('.vue', '')
    overrides[`@qds-catalog/demos/${filename}`] = dataModule(`import { h } from '${import.meta.resolve('vue')}'; export default { props: ${JSON.stringify(entry.controls)}, setup(props) { return () => h('${name}', { ...props }) } }`)
    overrides[`@qds-catalog/demos/${filename}?raw`] = dataModule(`export default ${JSON.stringify(readFileSync(new URL('../../catalog/' + entry.demo, import.meta.url), 'utf8'))}`)
  }
  const url = new URL('../../examples/storybook/stories/catalog-proof.stories.ts', import.meta.url)
  const code = ts.transpileModule(readFileSync(url, 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
  const adapter = await import(dataModule(resolveImports(code, url, overrides)))
  for (const entry of manifest.cases) {
    const story = adapter[entry.hostIdMap.storybookExport]
    const rows = controls.cases[entry.id]
    assert.deepEqual(story.args, Object.fromEntries(rows.map((r) => [r.key, r.default])))
    const args = reactive({ ...story.args })
    const root = { children: [] }
    const app = renderer.createApp(story.render(args))
    app.mount(root)
    assert.equal(root.children[0].themeControls, false, 'only Storybook toolbar controls theme')
    for (const row of rows) {
      assert.equal(root.children[0].children[0][row.key], row.default)
      if (row.options) assert.deepEqual(story.argTypes[row.key].options, row.options)
      const changed = row.kind === 'toggle' ? !row.default : row.kind === 'select' ? row.options.find((v) => v !== row.default) : row.kind === 'number' ? 7 : 'Changed'
      args[row.key] = changed
      await nextTick()
      assert.equal(root.children[0].children[0][row.key], changed, `${entry.id}/${row.key} must stay reactive`)
    }
    assert.equal(story.parameters.docs.source.code, readFileSync(new URL('../../catalog/' + entry.demo, import.meta.url), 'utf8'))
    app.unmount()
  }
})

test('shared field control slot forwards edits and reactive readonly/disabled state', async () => {
  const native = dataModule(`import { h } from '${import.meta.resolve('vue')}';
    export const QIcon = { render: () => null };
    export const QField = { props: ['modelValue'], emits: ['update:modelValue'], setup(props, { slots, emit }) { return () => h('field', {}, slots.control({ id: 'field-control', modelValue: props.modelValue, emitValue: (v) => emit('update:modelValue', v) })) } };`)
  const url = new URL('../../catalog/demos/QdsFieldDemo.vue', import.meta.url)
  const { descriptor } = parse(readFileSync(url, 'utf8'))
  const compiled = compileScript(descriptor, { id: 'field-test', inlineTemplate: true })
  const code = ts.transpileModule(compiled.content, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
  const { default: Demo } = await import(dataModule(resolveImports(code, url, { quasar: native })))
  const controls = JSON.parse(readFileSync(new URL('../../catalog/control.json', import.meta.url), 'utf8'))
  const props = reactive(Object.fromEntries(controls.cases['forms/field'].map((r) => [r.key, r.default])))
  const root = { children: [] }
  const app = renderer.createApp({ render: () => h(Demo, props) })
  app.mount(root)
  const input = () => root.children[0].children[0].children.find((c) => c.tag === 'input')
  assert.equal(input().value, 'Draft value')
  // Vue's native v-on handler sends edits through QField's emitValue slot API.
  input().onInput({ target: { value: 'Edited' } })
  await nextTick()
  assert.equal(input().value, 'Edited')
  props.readonly = true; props.disable = true; props.counter = true
  await nextTick()
  assert.equal(input().readonly, true)
  assert.equal(input().disabled, true)
  assert.equal(input().maxlength, 24)
  app.unmount()
})
