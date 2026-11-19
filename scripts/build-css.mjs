import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { compileEntry, partitionCss } from './css-partition.mjs'

const ROOT = new URL('../', import.meta.url)
const OUT = fileURLToPath(new URL('dist/css/', ROOT))
const ENTRIES = [['index', ''], ['index.layered', 'layered/']]

rmSync(OUT, { recursive: true, force: true })
for (const [entry, prefix] of ENTRIES) {
  const parts = partitionCss(compileEntry(fileURLToPath(new URL(`src/css/${entry}.scss`, ROOT))))
  mkdirSync(`${OUT}${prefix}variants`, { recursive: true })
  for (const [name, css] of Object.entries(parts)) {
    writeFileSync(name === 'core' ? `${OUT}${prefix}index.css` : `${OUT}${prefix}variants/${name}.css`, css)
  }
}
