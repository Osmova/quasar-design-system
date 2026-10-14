// Compare the compact emitter against a pre-edit compiled CSS artifact.
// Usage: node scripts/test-runtime-emitter-parity.mjs /tmp/opencode/t171-before-default.css
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import * as sass from 'sass'
import { QDS_TOKENS } from '@bastvi/quasar-design-system/tokens'

const root = new URL('../', import.meta.url)
const { chromium } = createRequire(new URL('examples/gallery/package.json', root))('@playwright/test')
assert.ok(process.argv[2], 'Supply the CSS compiled before the emitter edit')
const before = readFileSync(process.argv[2], 'utf8')
const browser = await chromium.launch({ headless: true })
const palettes = ['neutral', 'gray', 'zinc', 'stone', 'slate']
const cases = []
for (const palette of palettes) for (const mode of ['light', 'dark']) cases.push({ palette, mode, resolved: mode })
for (const palette of palettes) cases.push({ palette, mode: 'light', resolved: 'light', staleDark: true })
for (const palette of [null, '', 'unknown', 'Gray']) for (const mode of ['light', 'dark']) cases.push({ palette, mode })
for (const outer of ['light', 'dark']) {
  for (const middle of ['light', 'dark']) {
    for (const inner of ['', 'qds-theme-light', 'qds-theme-dark', 'resolved-light', 'resolved-dark']) {
      cases.push({ palette: 'gray', mode: outer, resolved: outer, middle, inner })
    }
  }
}
let checked = 0
try {
  for (const entry of ['index.scss', 'index.layered.scss']) {
    const after = sass.compile(new URL(`src/css/${entry}`, root).pathname, { silenceDeprecations: ['if-function'] }).css
    const pages = await Promise.all([browser.newPage(), browser.newPage()])
    await Promise.all(pages.map((page, i) => page.setContent(`<style>${i ? after : before}</style><div id="middle"><div id="probe"></div></div>`)))
    for (const scenario of cases) {
      const values = await Promise.all(pages.map(async (page) => {
        await page.evaluate((s) => {
          document.body.className = `qds-ui qds-variant-shadcn qds-theme-${s.mode}${s.staleDark ? ' body--dark' : ''}`
          if (s.palette === null) delete document.body.dataset.qdsShadcnBaseColor
          else document.body.dataset.qdsShadcnBaseColor = s.palette
          if (s.resolved) document.body.dataset.qdsResolved = s.resolved
          else delete document.body.dataset.qdsResolved
          const middle = document.querySelector('#middle'), probe = document.querySelector('#probe')
          middle.className = s.middle ? `qds-theme-${s.middle}` : ''
          probe.className = s.middle ? `qds-variant-shadcn ${s.inner.startsWith('resolved') ? '' : s.inner}` : ''
          if (s.inner?.startsWith('resolved')) probe.dataset.qdsResolved = s.inner.slice(9)
          else delete probe.dataset.qdsResolved
          if (s.middle) probe.dataset.qdsShadcnBaseColor = 'stone'
          else delete probe.dataset.qdsShadcnBaseColor
        }, scenario)
        return page.evaluate((names) => {
          const style = getComputedStyle(document.querySelector('#probe'))
          return Object.fromEntries(names.map((name) => [name, style.getPropertyValue(name).trim().replace(/\s+/g, ' ')]))
        }, QDS_TOKENS)
      }))
      assert.deepEqual(values[1], values[0], `${entry}: ${JSON.stringify(scenario)}`)
      checked += QDS_TOKENS.length
    }
    await Promise.all(pages.map((p) => p.close()))
  }
  console.log(`Pre-edit emitter parity: ${cases.length} scopes × two exports, ${checked} computed token values passed.`)
} finally { await browser.close() }
