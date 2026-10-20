/**
 * T185 catalog contract tests — package boundary + dependency decision hygiene.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url))

test('published package boundary: no catalog content in files/exports; scripts exist', () => {
  const pkg = JSON.parse(readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'))

  for (const entry of pkg.files ?? []) {
    assert.ok(!entry.includes('catalog'), `files entry must not ship catalog: ${entry}`)
  }
  for (const exportKey of Object.keys(pkg.exports ?? {})) {
    assert.ok(!exportKey.includes('catalog'), `exports must not expose catalog: ${exportKey}`)
    assert.ok(!JSON.stringify(pkg.exports[exportKey]).includes('catalog/'), `export target must not point at catalog: ${exportKey}`)
  }

  for (const script of ['catalog:generate', 'catalog:check', 'catalog:check:complete', 'catalog:test', 'catalog:storybook', 'catalog:storybook:build']) {
    assert.ok(pkg.scripts?.[script], `root script missing: ${script}`)
  }
})

test('age policy stays intact: minimumReleaseAge not weakened', () => {
  const workspace = readFileSync(path.join(REPO_ROOT, 'pnpm-workspace.yaml'), 'utf8')
  assert.match(workspace, /minimumReleaseAge:\s*4320/, 'workspace keeps the three-day release cooldown')
  // The workspace package patterns must still be the documented ones.
  assert.match(workspace, /examples\/\*/)
})

test('storybook dependency decision: exact 10.6.1 trio, no addon-essentials', () => {
  const storybookPkg = JSON.parse(readFileSync(path.join(REPO_ROOT, 'examples', 'storybook', 'package.json'), 'utf8'))

  for (const dep of ['storybook', '@storybook/vue3-vite', '@storybook/addon-docs']) {
    assert.equal(storybookPkg.devDependencies?.[dep], '10.6.1', `${dep} must be pinned exactly at 10.6.1`)
  }
  const allDeps = { ...storybookPkg.dependencies, ...storybookPkg.devDependencies }
  assert.ok(!('@storybook/addon-essentials' in allDeps), 'addon-essentials is explicitly not used')

  // The catalog proof must not mutate the version on the public package root. A
  // literal pin would fail every release, so this ties the version to the newest
  // versioned CHANGELOG heading instead: a bump passes only when it was deliberate
  // enough to be written down.
  const rootPkg = JSON.parse(readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'))
  assert.match(rootPkg.version, /^\d+\.\d+\.\d+(-rc\.\d+)?$/, 'root package version must be a plain release or rc version')
  const changelog = readFileSync(path.join(REPO_ROOT, 'CHANGELOG.md'), 'utf8')
  const newest = changelog.match(/^## \[(\d+\.\d+\.\d+(?:-rc\.\d+)?)\]/m)
  assert.ok(newest, 'CHANGELOG must carry at least one versioned heading')
  assert.equal(rootPkg.version, newest[1], 'package version must match the newest versioned CHANGELOG heading')
})

test('root tsconfig covers the shared catalog/adapters (typecheck surface)', () => {
  const tsconfig = JSON.parse(readFileSync(path.join(REPO_ROOT, 'tsconfig.json'), 'utf8'))
  assert.ok(tsconfig.include.includes('catalog/**/*.ts'), 'root typecheck includes catalog TS')
  assert.ok(tsconfig.include.includes('catalog/**/*.vue'), 'root typecheck includes catalog Vue demos')
  assert.ok(tsconfig.include.includes('stories/**/*.vue'), 'root typecheck includes the Histoire proof adapter')
})
