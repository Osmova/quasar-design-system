import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import {
  createDesignSystemController, configureDesignSystem, DEFAULT_DESIGN_SYSTEM_OPTIONS,
  DESIGN_SYSTEM_VARIANTS, SHADCN_ACCENT_COLORS, SHADCN_BASE_COLORS, isShadcnBaseColor, isBuiltInDesignSystemVariantName,
} from '@osmova/quasar-design-system'
import { createDesignSystemController as runtimeExport } from '@osmova/quasar-design-system/runtime'
import { SHADCN_BASE_COLORS as themesExport } from '@osmova/quasar-design-system/themes'

const storageKey = DEFAULT_DESIGN_SYSTEM_OPTIONS.storageKey
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
afterEach(() => {
  for (const [name, descriptor] of [['window', originalWindow], ['document', originalDocument]]) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor)
    else delete globalThis[name]
  }
})

function target() {
  const classes = new Set(['author-class'])
  return {
    dataset: { author: 'retained' }, classes,
    classList: {
      toggle(name, enabled) { enabled ? classes.add(name) : classes.delete(name) },
      remove(...names) { names.forEach((name) => classes.delete(name)) },
    },
  }
}

function browser(stored, prefersDark = false, legacyListener = false) {
  const body = target()
  const storage = new Map(stored === undefined ? [] : [[storageKey, typeof stored === 'string' ? stored : JSON.stringify(stored)]])
  const listeners = new Set()
  const media = { matches: prefersDark }
  const add = (_event, callback) => listeners.add(callback)
  const remove = (_event, callback) => listeners.delete(callback)
  if (legacyListener) {
    media.addListener = (callback) => add('change', callback)
    media.removeListener = (callback) => remove('change', callback)
  } else {
    media.addEventListener = add
    media.removeEventListener = remove
  }
  globalThis.document = { body }
  globalThis.window = {
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    },
    matchMedia: () => media,
  }
  return {
    body, storage, listeners,
    change(matches) { media.matches = matches; listeners.forEach((callback) => callback({ matches })) },
  }
}

test('compiled package entrypoints expose every canonical variant and five exact base colors', () => {
  assert.equal(runtimeExport, createDesignSystemController)
  assert.equal(themesExport, SHADCN_BASE_COLORS)
  assert.deepEqual(SHADCN_BASE_COLORS.map(({ name }) => name), ['neutral', 'gray', 'zinc', 'stone', 'slate'])
  assert.deepEqual(Object.keys(DESIGN_SYSTEM_VARIANTS), ['win', 'ink', 'one', 'term', 'shadcn', 'zen', 'glass'])
  assert.equal(DESIGN_SYSTEM_VARIANTS.shadcn.cssClass, 'qds-variant-shadcn')
  assert.equal(isBuiltInDesignSystemVariantName('shadcn'), true)
  assert.equal(DESIGN_SYSTEM_VARIANTS.zen.cssClass, 'qds-variant-zen')
  assert.equal(isBuiltInDesignSystemVariantName('zen'), true)
  assert.equal(DESIGN_SYSTEM_VARIANTS.glass.cssClass, 'qds-variant-glass')
  assert.equal(isBuiltInDesignSystemVariantName('glass'), true)
  assert.equal(DEFAULT_DESIGN_SYSTEM_OPTIONS.variant, 'win')
  assert.equal(DEFAULT_DESIGN_SYSTEM_OPTIONS.mode, 'system')
  for (const bad of [undefined, null, '', 'Gray', 'gray ', '__proto__', 'toString', {}, ['slate'], 1]) {
    assert.equal(isShadcnBaseColor(bad), false)
  }
})

test('mandatory SSR: target:null + persist:true initializes, switches and destroys without any DOM', () => {
  delete globalThis.window
  delete globalThis.document
  const controller = createDesignSystemController({ target: null, persist: true, variant: 'shadcn', shadcnBaseColor: 'stone' })
  controller.initialize()
  controller.initialize()
  assert.equal(controller.state.initialized, true)
  assert.equal(controller.resolvedMode.value, 'light')
  assert.equal(controller.shadcnBaseColor.value, 'stone')
  for (const { name } of SHADCN_BASE_COLORS) assert.equal(controller.setShadcnBaseColor(name), name)
  controller.setDark()
  assert.equal(controller.isDark.value, true)
  controller.setVariant('win')
  assert.equal(controller.shadcnBaseColor.value, 'slate')
  controller.destroy()
  controller.destroy()
  assert.equal(controller.state.initialized, false)
  controller.initialize()
  assert.equal(controller.variant.value, 'win')
  assert.equal(controller.shadcnBaseColor.value, 'slate')
  controller.destroy()
})

test('explicit target:null does not fall back to body when document exists', () => {
  const env = browser()
  const controller = createDesignSystemController({ target: null, persist: true, variant: 'shadcn' })
  controller.initialize()
  controller.setShadcnBaseColor('zinc')
  controller.destroy()
  assert.deepEqual(env.body.dataset, { author: 'retained' })
  assert.deepEqual([...env.body.classes], ['author-class'])
})

test('all palettes switch on the same custom target and persist with mode and variant', () => {
  const env = browser()
  const subtree = target()
  const darkCalls = []
  const controller = createDesignSystemController({ target: subtree, variant: 'shadcn', mode: 'light', rootClass: 'extra-scope' }, { dark: { set: (value) => darkCalls.push(value) } })
  controller.initialize()
  for (const { name } of SHADCN_BASE_COLORS) {
    controller.setShadcnBaseColor(name)
    assert.equal(subtree.dataset.qdsShadcnBaseColor, name)
    assert.equal(subtree.dataset.qdsVariant, 'shadcn')
    assert.equal(subtree.dataset.qdsMode, 'light')
    assert.deepEqual(JSON.parse(env.storage.get(storageKey)), { mode: 'light', variant: 'shadcn', shadcnBaseColor: name, shadcnAccent: 'none' })
  }
  controller.setDark()
  assert.equal(subtree.dataset.qdsResolved, 'dark')
  assert.equal(darkCalls.at(-1), true)
  controller.setVariant('one')
  assert.equal(subtree.dataset.qdsShadcnBaseColor, undefined)
  assert.equal(controller.shadcnBaseColor.value, 'slate')
  controller.setVariant('shadcn')
  assert.equal(subtree.dataset.qdsShadcnBaseColor, 'slate')
  assert.equal(subtree.classes.has('qds-variant-one'), false)
  assert.equal(subtree.classes.has('qds-variant-shadcn'), true)
  assert.deepEqual(env.body.dataset, { author: 'retained' })
  controller.destroy()
  assert.deepEqual(subtree.dataset, { author: 'retained' })
  assert.deepEqual([...subtree.classes], ['author-class'])
  assert.equal(env.listeners.size, 0)
})

test('shadcn accent applies only on shadcn, persists, and falls back to none', () => {
  const env = browser()
  const subtree = target()
  const controller = createDesignSystemController({ target: subtree, variant: 'shadcn', mode: 'light', shadcnAccent: 'blue' })
  controller.initialize()
  assert.equal(subtree.dataset.qdsShadcnAccent, 'blue')
  assert.equal(controller.setShadcnAccent('blue'), 'blue')
  assert.equal(JSON.parse(env.storage.get(storageKey)).shadcnAccent, 'blue')
  controller.setVariant('win')
  assert.equal(subtree.dataset.qdsShadcnAccent, undefined)
  assert.equal(controller.shadcnAccent.value, 'blue')
  controller.setVariant('shadcn')
  assert.equal(subtree.dataset.qdsShadcnAccent, 'blue')
  assert.equal(controller.setShadcnAccent('purple'), 'none')
  assert.equal(subtree.dataset.qdsShadcnAccent, undefined)
  assert.ok(SHADCN_ACCENT_COLORS.some((accent) => accent.name === 'blue'))
  controller.destroy()
  assert.deepEqual(subtree.dataset, { author: 'retained' })
})

test('stored palette wins; absent old field preserves configured palette or defaults Neutral', () => {
  for (const [stored, config, expected] of [
    [{ mode: 'dark', variant: 'shadcn', shadcnBaseColor: 'gray' }, 'stone', 'gray'],
    [{ mode: 'dark', variant: 'ink' }, 'slate', 'slate'],
    [{ mode: 'light', variant: 'term' }, undefined, 'neutral'],
    [{ shadcnBaseColor: null }, 'slate', 'neutral'],
    [{ shadcnBaseColor: 'unknown' }, 'stone', 'neutral'],
  ]) {
    browser(stored)
    const controller = createDesignSystemController({ mode: 'light', variant: 'shadcn', shadcnBaseColor: config })
    controller.initialize()
    assert.equal(controller.shadcnBaseColor.value, expected)
    assert.equal(controller.mode.value, stored.mode ?? 'light')
    assert.equal(controller.variant.value, stored.variant ?? 'shadcn')
    controller.destroy()
  }
})

test('invalid JavaScript palette values normalize Neutral in configuration and setter', () => {
  browser()
  for (const bad of [null, 'Slate', 'bad', '', '__proto__', 'toString', {}, ['gray'], 42, false]) {
    const controller = createDesignSystemController({ shadcnBaseColor: bad, persist: false })
    controller.initialize()
    assert.equal(controller.shadcnBaseColor.value, 'neutral')
    controller.setShadcnBaseColor('gray')
    assert.equal(controller.setShadcnBaseColor(bad), 'neutral')
    controller.destroy()
  }
})

test('system lifecycle is idempotent, responds to media changes and detaches both listener APIs', () => {
  for (const legacy of [false, true]) {
    const env = browser(undefined, true, legacy)
    const controller = createDesignSystemController({ persist: false, variant: 'shadcn', shadcnBaseColor: 'gray' })
    controller.initialize()
    controller.initialize()
    assert.equal(env.listeners.size, 1)
    assert.equal(controller.resolvedMode.value, 'dark')
    env.change(false)
    assert.equal(controller.resolvedMode.value, 'light')
    controller.setDark()
    env.change(false)
    assert.equal(controller.resolvedMode.value, 'dark')
    controller.setSystem()
    assert.equal(controller.resolvedMode.value, 'light')
    controller.destroy()
    assert.equal(env.listeners.size, 0)
    env.change(true)
    assert.equal(env.body.dataset.qdsResolved, undefined)
    controller.initialize()
    assert.equal(env.listeners.size, 1)
    assert.equal(controller.resolvedMode.value, 'dark')
    controller.destroy()
  }
})

test('disabled persistence, malformed storage and blocked storage do not break switching', () => {
  const env = browser({ shadcnBaseColor: 'gray', variant: 'shadcn' })
  const previous = env.storage.get(storageKey)
  const controller = createDesignSystemController({ persist: false, syncWithSystem: false, shadcnBaseColor: 'stone' })
  controller.initialize()
  controller.setShadcnBaseColor('slate')
  assert.equal(env.listeners.size, 0)
  assert.equal(env.storage.get(storageKey), previous)
  controller.destroy()
  for (const value of ['{broken', 'null']) {
    const broken = browser(value)
    const c = createDesignSystemController({ shadcnBaseColor: 'zinc' })
    c.initialize()
    assert.equal(c.shadcnBaseColor.value, 'zinc')
    assert.equal(broken.storage.has(storageKey), false)
    c.destroy()
  }
  browser()
  Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked') } })
  const blocked = createDesignSystemController({ variant: 'shadcn' })
  blocked.initialize()
  assert.equal(blocked.setShadcnBaseColor('slate'), 'slate')
  assert.equal(blocked.setDark(), 'dark')
  blocked.destroy()
})

test('existing aliases and externally registered variants remain unchanged', () => {
  const env = browser()
  const variants = { custom: { name: 'custom', label: 'Custom', cssClass: 'custom-theme' } }
  const themes = { extra: { name: 'extra', label: 'Extra', variants: { alternate: { name: 'alternate', label: 'Alternate', cssClass: 'alternate-theme' } } } }
  const c = createDesignSystemController({ variants, themes, persist: false, variant: 'custom', shadcnBaseColor: 'gray' })
  c.initialize()
  assert.equal(env.body.classes.has('custom-theme'), true)
  c.setVariant('alternate')
  assert.equal(env.body.classes.has('custom-theme'), false)
  assert.equal(env.body.classes.has('alternate-theme'), true)
  for (const [alias, canonical] of Object.entries({ fluent: 'win', air: 'win', studio: 'win', feather: 'ink', mobile: 'one', terminal: 'term' })) {
    assert.equal(c.setVariant(alias), canonical)
    assert.equal(env.body.classes.has(`qds-variant-${canonical}`), true)
    assert.equal(Object.keys(DESIGN_SYSTEM_VARIANTS).includes(alias), false)
  }
  assert.equal(c.shadcnBaseColor.value, 'gray')
  c.destroy()
  assert.deepEqual([...env.body.classes], ['author-class'])
})

test('glass is its own variant, no longer a win alias, while fluent, air and studio still are', () => {
  const configured = browser()
  const c = createDesignSystemController({ persist: false, variant: 'glass' })
  c.initialize()
  assert.equal(c.variant.value, 'glass')
  assert.equal(configured.body.classes.has('qds-variant-glass'), true)
  assert.equal(configured.body.classes.has('qds-variant-win'), false)
  assert.equal(configured.body.dataset.qdsVariant, 'glass')
  assert.equal(c.setVariant('glass'), 'glass')
  for (const alias of ['fluent', 'air', 'studio']) {
    assert.equal(c.setVariant(alias), 'win')
    assert.equal(configured.body.classes.has('qds-variant-win'), true)
    assert.equal(configured.body.classes.has('qds-variant-glass'), false)
  }
  c.destroy()

  for (const [stored, expected] of [['glass', 'glass'], ['fluent', 'win'], ['air', 'win'], ['studio', 'win']]) {
    const env = browser({ mode: 'light', variant: stored })
    const restored = createDesignSystemController()
    restored.initialize()
    assert.equal(restored.variant.value, expected, `stored ${stored} resolves to ${expected}`)
    assert.equal(env.body.classes.has(`qds-variant-${expected}`), true)
    restored.destroy()
  }
})

test('configureDesignSystem initializes and provides the complete compiled public controller', () => {
  const env = browser()
  const provided = []
  const app = { config: { globalProperties: {} }, provide: (...args) => provided.push(args) }
  const c = configureDesignSystem(app, { variant: 'shadcn', shadcnBaseColor: 'slate' })
  assert.equal(app.config.globalProperties.$designSystem, c)
  assert.equal(provided[0][1], c)
  assert.equal(c.state.initialized, true)
  assert.equal(env.body.dataset.qdsShadcnBaseColor, 'slate')
  c.destroy()
})
