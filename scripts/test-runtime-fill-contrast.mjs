// Diagnostic gate for actual emitted state fills and the unchanged role pairs.
// 90%/80% starts are calibrated only when their quantized fill fails 4.5.
import { emittedProfiles, parseRgb, contrast, roles } from '../tests/runtime/shadcn-fixtures.mjs'

const failures = []
let checked = 0
for (const [profile, values] of Object.entries(emittedProfiles())) {
  for (const role of roles) {
    const fill = parseRgb(values[`--qds-color-${role}`])
    const pair = parseRgb(values[`--qds-text-on-${role}`])
    for (const state of ['default', 'hover', 'pressed']) {
      const paint = state === 'default' ? fill : parseRgb(values[`--qds-color-${role}-${state}`])
      const ratio = contrast(pair, paint)
      if (ratio < 4.5) failures.push({ profile, role, state, contrast: ratio, minimum: 4.5 })
      checked++
    }
  }
}
console.log(JSON.stringify({ checked, failures, constraints: 'unchanged rest/pair; emitted calibrated opaque states; minimum4.5' }, null, 2))
if (failures.length) process.exitCode = 1
