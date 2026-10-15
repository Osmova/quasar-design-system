import { execFileSync } from 'node:child_process'
import { posix } from 'node:path'
import { compileString } from 'sass'
import { root } from './grammar-fixture.mjs'

// T184 substrate-only characterization. An intentional future grammar migration
// must explicitly retire/replace the current-vs-baseline parity assertion under
// review, NOT advance this immutable source reference or regenerate its hashes.
export const substrateBaseline = '150d9526aa9aad65af8259cb4aab313d7ab6cce4'
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
let paths
const sources = new Map()
function read(path) {
  if (!sources.has(path)) sources.set(path, git('show', `${substrateBaseline}:${path}`))
  return sources.get(path)
}

export function compileSubstrateBaseline(file) {
  paths ??= new Set(git('ls-tree', '-r', '--name-only', substrateBaseline, '--', 'src').trim().split('\n'))
  const importer = {
    canonicalize(url, { containingUrl }) {
      if (/^[a-z][a-z\d+.-]*:/i.test(url) && !url.startsWith('qds-substrate:')) return null
      const path = url.startsWith('qds-substrate:') ? new URL(url).pathname.slice(1)
        : posix.normalize(posix.join(containingUrl ? posix.dirname(containingUrl.pathname.slice(1)) : '', url))
      const dir = posix.dirname(path)
      const name = posix.basename(path)
      const candidates = path.endsWith('.scss') ? [path, posix.join(dir, `_${name}`)]
        : [`${path}.scss`, posix.join(dir, `_${name}.scss`), `${path}/index.scss`, `${path}/_index.scss`]
      const match = candidates.find((candidate) => paths.has(candidate))
      return match ? new URL(`qds-substrate:/${match}`) : null
    },
    load(url) { return { contents: read(url.pathname.slice(1)), syntax: 'scss' } },
  }
  return compileString(read(file), {
    url: new URL(`qds-substrate:/${file}`), importers: [importer],
    loadPaths: [new URL('node_modules/', root).pathname], style: 'compressed', silenceDeprecations: ['if-function'],
  }).css
}
