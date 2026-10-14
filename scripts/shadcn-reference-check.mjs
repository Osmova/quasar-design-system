import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildPalettes, modernPalette, PALETTE_NAMES, LEGACY_SIDEBAR_ALIASES } from '../examples/shadcn-reference/src/palette-data.mjs'

const root = fileURLToPath(new URL('../examples/shadcn-reference/', import.meta.url))
const text = path => readFile(resolve(root, path), 'utf8')
const manifest = JSON.parse(await text('upstream/manifest.json'))
const metadata = JSON.parse(await text('source-metadata.json'))
assert.equal(metadata.commit, manifest.commit)
assert.match(await text('upstream/LICENSE'), /MIT License[\s\S]*Copyright \(c\) 2023 unovue/)
const source = await text('upstream/apps/v4/registry/themes.ts')
const gray = JSON.parse(await text('upstream/apps/v4/public/r/themes/gray.json'))
const slate = JSON.parse(await text('upstream/apps/v4/public/r/themes/slate.json'))
const palettes = buildPalettes(source, gray, slate)
const required = [
  'background', 'foreground', 'card', 'card-foreground', 'popover', 'popover-foreground',
  'primary', 'primary-foreground', 'secondary', 'secondary-foreground', 'muted',
  'muted-foreground', 'accent', 'accent-foreground', 'destructive', 'border', 'input',
  'ring', 'radius', ...[1, 2, 3, 4, 5].map(number => `chart-${number}`),
  ...Object.keys(LEGACY_SIDEBAR_ALIASES),
]
assert.deepEqual(Object.keys(palettes).sort(), [...PALETTE_NAMES].sort())
for (const name of PALETTE_NAMES) {
  for (const mode of ['light', 'dark']) {
    const values = palettes[name][mode]
    for (const key of required) assert.ok(values[key], `${name}/${mode}: missing ${key}`)
    assert.equal(values.radius, '0.625rem')
    if (['gray', 'slate'].includes(name)) {
      const registry = name === 'gray' ? gray : slate
      for (const [key, value] of Object.entries(registry.cssVars[mode])) assert.equal(values[key], `hsl(${value})`)
      for (const [slot, original] of Object.entries(LEGACY_SIDEBAR_ALIASES)) assert.equal(values[slot], values[original])
    } else {
      const original = modernPalette(source, name)[mode]
      for (const [key, value] of Object.entries(original)) assert.equal(values[key], value)
    }
  }
}
assert.throws(() => modernPalette(source, 'nonexistent'))
assert.throws(() => buildPalettes(source, { ...gray, name: 'wrong' }, slate))

// Ensure the pinned tree is self-contained and every upstream import has either
// a vendored destination, a declared dependency, or the audited Phosphor alias.
const files = new Set(manifest.files.map(file => resolve(root, file.local)))
const packageJson = JSON.parse(await text('package.json'))
const declared = new Set([...Object.keys(packageJson.dependencies), ...Object.keys(packageJson.devDependencies)])
const iconNames = new Set()
for (const file of manifest.files.filter(file => /\.(vue|ts)$/.test(file.path) && !file.path.endsWith('registry/themes.ts'))) {
  const content = await text(file.local)
  for (const match of content.matchAll(/(?:from\s+|import\s*)["']([^"']+)["']/g)) {
    const specifier = match[1]
    if (specifier === '@lucide/vue') continue
    let candidate
    if (specifier.startsWith('.')) candidate = resolve(dirname(resolve(root, file.local)), specifier)
    else if (specifier === '@/lib/utils') candidate = resolve(root, 'upstream/apps/v4/lib/utils')
    else if (specifier.startsWith('@/registry/new-york-v4/')) candidate = resolve(root, 'upstream/apps/v4/registry/new-york-v4', specifier.slice('@/registry/new-york-v4/'.length))
    else {
      const dependency = specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0]
      assert.ok(declared.has(dependency), `${file.local}: undeclared ${dependency}`)
      continue
    }
    assert.ok([candidate, `${candidate}.ts`, `${candidate}.vue`, resolve(candidate, 'index.ts')].some(path => files.has(path)), `${file.local}: missing ${specifier}`)
  }
  for (const match of content.matchAll(/import\s*{([^}]+)}\s*from\s*"@lucide\/vue"/g)) {
    for (const name of match[1].split(',').map(name => name.trim())) iconNames.add(name)
  }
}
const icons = await text('src/icons.ts')
for (const name of iconNames) assert.match(icons, new RegExp(`as ${name}\\b`))
const css = await text('src/style.css')
const upstreamCss = await text('upstream/apps/v4/assets/css/main.css')
for (const declaration of css.matchAll(/--radius-[\w-]+: [^;]+;/g)) assert.ok(upstreamCss.includes(declaration[0]), `Non-upstream geometry: ${declaration[0]}`)
assert.ok(css.includes('source(none)'))
assert.ok(css.includes('@source "../upstream/apps/v4/registry/new-york-v4/ui"'))
assert.ok(!css.includes('qds-'))
const app = await text('src/App.vue')
for (const family of ['button', 'input', 'selection', 'tabs', 'badge', 'card', 'table', 'menu', 'dialog', 'sidebar']) assert.ok(app.includes(`data-family="${family}"`), `Missing fixture: ${family}`)
assert.ok(!app.includes('<SidebarMenuSkeleton'))
assert.ok(app.includes(':default-open="true" :open="true"'))

// Syntax-only compiler check uses the existing Vue installation, not new deps.
const { parse, compileTemplate } = await import('vue/compiler-sfc')
const authoredVue = [{ local: 'src/App.vue' }]
for (const file of [...manifest.files.filter(file => file.path.endsWith('.vue')), ...authoredVue]) {
  const content = await text(file.local)
  const { descriptor, errors } = parse(content, { filename: file.local })
  assert.deepEqual(errors, [], `${file.local}: invalid SFC`)
  if (descriptor.template) {
    const result = compileTemplate({ source: descriptor.template.content, filename: file.local, id: file.local, compilerOptions: { expressionPlugins: ['typescript'] } })
    assert.deepEqual(result.errors, [], `${file.local}: invalid template`)
  }
}
console.log('PASS: five palettes × two modes, exact source values, complete slots, import closure, icon aliases, upstream radius scale, ten fixture families and Vue template syntax')
