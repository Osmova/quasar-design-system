import assert from 'node:assert/strict'
import { compile } from 'sass'
import { compileSubstrateBaseline } from './grammar-fixture-baseline.mjs'
import { root } from './grammar-fixture.mjs'
import { chromium, mount, settle, paint, snapshot, roles } from './fluent-native-fixture.mjs'

const audit = process.argv.includes('--baseline-audit')
const browser = await chromium.launch({ headless: true })
const report = []
try {
  for (const layered of audit ? [false] : [false, true]) {
    const file = `src/css/index${layered ? '.layered' : ''}.scss`
    const baseline = compileSubstrateBaseline(file)
    const current = audit ? baseline : compile(new URL(file, root).pathname, { style: 'compressed', loadPaths: [new URL('node_modules/', root).pathname], silenceDeprecations: ['if-function'] }).css
    for (const mode of ['light', 'dark']) {
      const page = await mount(browser, current, { layered, mode })
      try {
        for (const role of roles) {
          const button = page.locator(`#${role}`)
          await page.mouse.move(0, 0); await settle(page)
          const rest = await paint(page, `#${role}`)
          await button.hover(); await settle(page)
          const hover = await paint(page, `#${role}`)
          await page.mouse.down(); await settle(page)
          const pressed = await paint(page, `#${role}`)
          assert.equal(pressed.active, true)
          await page.mouse.up(); await page.mouse.move(0, 0)
          await button.focus(); await page.keyboard.down('Space'); await settle(page)
          const keyboard = await paint(page, `#${role}`)
          await page.keyboard.up('Space')
          report.push({ layered, mode, role, rest: rest.ratio, hover: hover.ratio, pressed: pressed.ratio, keyboard: keyboard.ratio, fill: pressed.background, foreground: pressed.foreground })
          if (!audit) {
            for (const state of [rest, hover, pressed, keyboard]) assert.ok(state.ratio >= 4.5, `${mode}/${role}: ${JSON.stringify(state)}`)
            assert.equal(pressed.foreground, rest.foreground, 'on-fill must not fade or flip while held')
            assert.equal(keyboard.background, pressed.background)
            const direction = mode === 'light' ? 1 : -1
            assert.ok(direction * (pressed.luminance - hover.luminance) > 0, `${mode}/${role} pressed direction`)
          }
        }
        // Quasar's DOM puts the native clear control before a custom append.
        await page.locator('.field input').focus(); await page.keyboard.press('Tab'); await settle(page)
        const clear = page.locator('.field .q-field__focusable-action')
        const focus = await clear.evaluate((el) => ({ active: el === document.activeElement, visible: el.matches(':focus-visible'), outline: getComputedStyle(el).outline, width: getComputedStyle(el).outlineWidth, svg: el.querySelector('svg')?.outerHTML }))
        report.push({ layered, mode, clear: focus })
        assert.ok(focus.active && focus.visible)
        assert.ok(focus.svg?.toLowerCase().includes('currentcolor'))
        if (!audit) assert.notEqual(focus.width, '0px')
        for (const key of ['Enter', 'Space']) {
          await page.keyboard.press(key)
          assert.equal(await page.locator('.field input').inputValue(), '')
          await page.evaluate(() => fixture.reset())
          await page.locator('.field input').focus(); await page.keyboard.press('Tab')
        }
        await page.keyboard.press('Tab')
        assert.equal(await page.locator('#append').evaluate((el) => el === document.activeElement), true)
        await page.keyboard.press('Tab')
        assert.equal(await page.locator('#next').evaluate((el) => el === document.activeElement), true)
      } finally { await page.close() }
    }
    if (audit) continue
    // Frozen actual native states, not selector-only or lookalike HTML comparisons.
    for (const mode of ['light', 'dark']) for (const profile of ['one', 'term', 'ink', ...['neutral', 'gray', 'zinc', 'stone', 'slate'].map((p) => `shadcn-${p}`), 'fluent', 'default']) {
      const fluent = ['fluent', 'default'].includes(profile)
      const options = { layered, mode, profile, custom: profile !== 'fluent' }
      const old = await mount(browser, baseline, options)
      const now = await mount(browser, current, options)
      try {
        const same = async (selector = '#app') => assert.deepEqual(await snapshot(now, selector), await snapshot(old, selector), `${file}/${mode}/${profile}/${selector}`)
        await same()
        if (!fluent) assert.deepEqual(await now.screenshot({ caret: 'hide' }), await old.screenshot({ caret: 'hide' }), `${profile} resting pixels`)
        for (const selector of ['#primary', '#secondary', '#accent', '#positive', '#negative', '#warning', '#info', '#literal', '#author', '#tonal', '#pagination .q-btn.bg-primary', '#toggle .q-btn.bg-primary', '#calendar .q-btn.bg-primary', '#editor .q-btn']) {
          for (const p of [old, now]) { await p.locator(selector).first().hover(); await settle(p) }
          await same()
          for (const p of [old, now]) { await p.mouse.down(); await settle(p) }
          // Only the seven standalone Fluent held solids are accepted changes.
          if (!fluent || !roles.some((role) => selector === `#${role}`)) await same()
          for (const p of [old, now]) { await p.mouse.up(); await p.mouse.move(0, 0); await settle(p) }
        }
        for (const p of [old, now]) { await p.locator('.field input').focus(); await settle(p) }
        await same()
        for (const p of [old, now]) { await p.keyboard.press('Tab'); await settle(p) }
        await same() // custom append remains author/native-owned
        for (const p of [old, now]) { await p.keyboard.press('Tab'); await settle(p) }
        if (!fluent) await same()
      } finally { await old.close(); await now.close() }
    }
  }
  console.log(JSON.stringify({ audit, report }, null, 2))
} finally { await browser.close() }
