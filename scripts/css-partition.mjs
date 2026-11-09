import { compile } from 'sass'
import postcss from 'postcss'

export const VARIANT_SCOPES = ['ink', 'one', 'term', 'shadcn', 'zen', 'glass']
const OWNED_BY = { reading: 'zen' }

const scopeRe = new RegExp(`\\.qds-variant-(${VARIANT_SCOPES.join('|')})\\b|\\.qds-(reading)\\b`, 'g')

function ownersOf(selector) {
  const owners = new Set()
  for (const match of selector.matchAll(scopeRe)) owners.add(match[1] ?? OWNED_BY[match[2]])
  return owners
}

function ownerOfSelector(selector) {
  const own = ownersOf(selector)
  return own.size === 1 ? [...own][0] : null
}

const LEAF_AT_RULES = new Set(['keyframes', 'font-face', 'property'])

function split(container, buckets) {
  for (const node of [...container.nodes]) {
    if (node.type === 'rule') {
      const groups = new Map()
      for (const selector of node.selectors) {
        const owner = ownerOfSelector(selector) ?? 'core'
        if (!groups.has(owner)) groups.set(owner, [])
        groups.get(owner).push(selector)
      }
      for (const [owner, selectors] of groups) {
        const part = groups.size === 1 ? node : node.clone({ selectors })
        ;(buckets[owner] ??= []).push({ node: part, path: parents(node) })
      }
    } else if (node.type === 'atrule' && node.nodes && !LEAF_AT_RULES.has(node.name)) {
      split(node, buckets)
    } else {
      ;(buckets.core ??= []).push({ node, path: parents(node) })
    }
  }
}

function parents(node) {
  const chain = []
  for (let parent = node.parent; parent && parent.type !== 'root'; parent = parent.parent) chain.unshift(parent)
  return chain
}

function emit(entries) {
  const root = postcss.root()
  const clones = new Map()
  for (const { node, path } of entries) {
    let target = root
    for (const ancestor of path) {
      let clone = clones.get(ancestor)
      if (!clone) {
        clone = ancestor.clone({ nodes: [] })
        target.append(clone)
        clones.set(ancestor, clone)
      }
      target = clone
    }
    target.append(node.clone())
  }
  return root
}

export function partitionCss(css) {
  const root = postcss.parse(css)
  const buckets = {}
  split(root, buckets)
  const out = {}
  for (const [name, entries] of Object.entries(buckets)) out[name] = emit(entries).toString()
  return out
}

export function compileEntry(path) {
  return compile(path, { style: 'compressed', loadPaths: ['node_modules'], quietDeps: true, silenceDeprecations: ['if-function', 'import', 'global-builtin', 'color-functions', 'mixed-decls'] }).css
}
