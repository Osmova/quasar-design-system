import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import { compileString } from 'sass'

const ROOT = new URL('../', import.meta.url)
const BASELINE = '71bb9d52bf483a93de0b50202df122b73f70ed9e'
const LIMITS = { important: 45, doubled: 0, lines: 3915 }
const BUNDLES = [
  ['src/css/index.scss', { min: 480000, gzip: 48000 }],
  ['src/css/index.layered.scss', { min: 480000, gzip: 48000 }],
]
const EXTENSION_ALLOWANCE = { lines: 80, min: 4096, gzip: 1024 }
const failures = []
const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
const baselineFiles = git('ls-tree', '-r', '--name-only', BASELINE, '--', 'src').trim().split('\n')
const baselinePaths = new Set(baselineFiles)
const baselineSource = new Map()
function readBaseline(path) {
  if (!baselineSource.has(path)) baselineSource.set(path, git('show', `${BASELINE}:${path}`))
  return baselineSource.get(path)
}

// Resolve the frozen extension's relative Sass imports in memory, never in a worktree or artifact directory.
const baselineImporter = {
  canonicalize(url, { containingUrl }) {
    if (/^[a-z][a-z\d+.-]*:/i.test(url) && !url.startsWith('qds-baseline:')) return null
    const path = url.startsWith('qds-baseline:')
      ? new URL(url).pathname.slice(1)
      : posix.normalize(posix.join(containingUrl ? posix.dirname(containingUrl.pathname.slice(1)) : '', url))
    const dir = posix.dirname(path)
    const name = posix.basename(path)
    const candidates = path.endsWith('.scss')
      ? [path, posix.join(dir, `_${name}`)]
      : [`${path}.scss`, posix.join(dir, `_${name}.scss`), `${path}/index.scss`, `${path}/_index.scss`]
    const match = candidates.find((candidate) => baselinePaths.has(candidate))
    return match ? new URL(`qds-baseline:/${match}`) : null
  },
  load(url) {
    return { contents: readBaseline(url.pathname.slice(1)), syntax: 'scss' }
  },
}

function sourceMetrics(file, source) {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1')
  return {
    file,
    important: (code.match(/!\s*important/g) ?? []).length,
    doubled: (code.match(/\.(q-[\w-]+)\.\1(?![\w-])/g) ?? []).length,
    lines: source.split('\n').length - (source.endsWith('\n') ? 1 : 0),
  }
}

function currentRows(directory) {
  return readdirSync(new URL(directory, ROOT), { recursive: true })
    .filter((name) => name.endsWith('.scss')).sort()
    .map((name) => {
      const file = `${directory}/${name}`
      return sourceMetrics(file, readFileSync(new URL(file, ROOT), 'utf8'))
    })
}

function total(rows) {
  return rows.reduce((sum, row) => ({ important: sum.important + row.important, doubled: sum.doubled + row.doubled, lines: sum.lines + row.lines }), { important: 0, doubled: 0, lines: 0 })
}

function enforce(label, measured, limits) {
  console.log(`${label}: ${JSON.stringify(measured)}; limits: ${JSON.stringify(limits)}`)
  for (const [key, limit] of Object.entries(limits)) {
    if (!Number.isFinite(limit) || !Number.isFinite(measured[key]) || measured[key] > limit) {
      failures.push(`${label}: ${key} ${measured[key]} > ${limit} (finite values required)`)
    }
  }
}

function compiledMetrics(file, baseline = false) {
  const source = baseline ? readBaseline(file) : readFileSync(new URL(file, ROOT), 'utf8')
  const { css } = compileString(source, {
    url: baseline ? new URL(`qds-baseline:/${file}`) : new URL(file, ROOT),
    importers: baseline ? [baselineImporter] : [],
    loadPaths: [fileURLToPath(new URL('node_modules/', ROOT))],
    style: 'compressed',
    sourceMap: false,
  })
  return { min: Buffer.byteLength(css), gzip: gzipSync(css, { level: 9 }).length }
}

const components = currentRows('src/css/components')
for (const row of components) console.log(JSON.stringify(row))
enforce('components', total(components), LIMITS)
for (const [file, limits] of BUNDLES) enforce(file, compiledMetrics(file), limits)

// Optional extensions have their own immutable pre-variant baseline; they cannot borrow core headroom.
const extensionRows = currentRows('src/css/extensions')
const extensionBase = total(baselineFiles.filter((file) => file.startsWith('src/css/extensions/') && file.endsWith('.scss')).map((file) => sourceMetrics(file, readBaseline(file))))
console.log(`extension baseline ${BASELINE}: ${JSON.stringify(extensionBase)}`)
enforce('extensions', total(extensionRows), { ...extensionBase, lines: extensionBase.lines + EXTENSION_ALLOWANCE.lines })
for (const file of ['src/css/extensions/qwindow.scss', 'src/css/extensions/qwindow.layered.scss']) {
  const base = compiledMetrics(file, true)
  console.log(`${file} baseline: ${JSON.stringify(base)}`)
  enforce(file, compiledMetrics(file), { min: base.min + EXTENSION_ALLOWANCE.min, gzip: base.gzip + EXTENSION_ALLOWANCE.gzip })
}

for (const failure of failures) console.error(`css budget exceeded: ${failure}`)
process.exitCode = failures.length ? 1 : 0
