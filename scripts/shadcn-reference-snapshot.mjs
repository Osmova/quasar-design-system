// Acquire data only: no upstream scripts, installers, or TypeScript are executed.
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../examples/shadcn-reference/', import.meta.url))
const commit = 'b251d9fd92aa496495e127137a7734704fb34a29'
const prefix = 'apps/v4/registry/new-york-v4/ui/'
const families = ['button', 'input', 'checkbox', 'radio-group', 'switch', 'select',
  'tabs', 'badge', 'card', 'table', 'dropdown-menu', 'dialog', 'sidebar',
  'sheet', 'separator', 'skeleton', 'tooltip']
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const manifestPath = resolve(root, 'upstream/manifest.json')

async function fetchBytes(path) {
  const response = await fetch(`https://raw.githubusercontent.com/unovue/shadcn-vue/${commit}/${path}`)
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}

if (process.argv[2] === '--check') {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  if (manifest.commit !== commit) throw new Error('Unexpected upstream revision')
  for (const file of manifest.files) {
    const target = resolve(root, file.local)
    if (!target.startsWith(`${root}upstream/`)) throw new Error('Unsafe snapshot path')
    if (hash(await readFile(target)) !== file.sha256) throw new Error(`Snapshot changed: ${file.local}`)
  }
  console.log(`Verified ${manifest.files.length} byte-exact upstream files at ${commit}`)
} else if (process.argv[2] === '--acquire') {
  // Explicit maintenance action; normal dev/build/check never accesses the network.
  const response = await fetch(`https://api.github.com/repos/unovue/shadcn-vue/git/trees/${commit}?recursive=1`)
  if (!response.ok) throw new Error(`Upstream tree: HTTP ${response.status}`)
  const tree = await response.json()
  if (tree.truncated) throw new Error('Incomplete upstream tree')
  const paths = tree.tree.filter(entry => entry.type === 'blob'
    && families.some(family => entry.path.startsWith(`${prefix}${family}/`))
    && /\.(vue|ts)$/.test(entry.path)).map(entry => entry.path)
  paths.push('LICENSE', 'apps/v4/lib/utils.ts', 'apps/v4/registry/themes.ts',
    'apps/v4/public/r/themes/gray.json', 'apps/v4/public/r/themes/slate.json',
    'apps/v4/assets/css/main.css', 'pnpm-workspace.yaml')
  paths.sort()
  const files = []
  // Bounded fetch concurrency, sorted output, no wall-clock metadata.
  for (let index = 0; index < paths.length; index += 4) {
    const batch = await Promise.all(paths.slice(index, index + 4).map(async path => {
      const bytes = await fetchBytes(path)
      const local = `upstream/${path}`
      const target = resolve(root, local)
      if (!target.startsWith(`${root}upstream/`)) throw new Error('Unsafe upstream path')
      await mkdir(dirname(target), { recursive: true })
      await writeFile(target, bytes)
      return { path, local, sha256: hash(bytes), bytes: bytes.length }
    }))
    files.push(...batch)
  }
  await writeFile(manifestPath, `${JSON.stringify({
    repository: 'https://github.com/unovue/shadcn-vue', commit,
    license: 'MIT', families, transformations: 'none; byte-exact snapshot', files,
  }, null, 2)}\n`)
  console.log(`Acquired ${files.length} upstream data files; run --check offline`)
} else {
  throw new Error('Use --check (offline) or --acquire (explicit pinned data download)')
}
