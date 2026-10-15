#!/usr/bin/env node
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadCatalogSources, validateCatalog } from '../catalog/validation.mjs'

export { loadCatalogSources, validateCatalog }

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2)
  if (args.some((arg) => arg !== '--complete')) {
    process.stderr.write('Usage: catalog-check.mjs [--complete]\n')
    process.exitCode = 2
  } else {
    try {
      const result = validateCatalog(loadCatalogSources(), { complete: args.includes('--complete') })
      if (result.errors.length) {
        process.stderr.write(result.errors.map((error) => `CHECK-FAIL ${error}`).join('\n') + '\n')
        process.exitCode = 1
      } else {
        process.stdout.write(`catalog-check: OK — ${result.caseCount} proof cases, ${result.exportCount} native exports explicit, ${result.plannedCount} planned\n`)
      }
    } catch (error) {
      process.stderr.write(`CHECK-FAIL load: ${error.message}\n`)
      process.exitCode = 1
    }
  }
}
