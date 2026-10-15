import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import Color from 'colorjs.io'
import { qdsIconSet } from '../../dist/icons/quasar-icon-set.js'
import { root } from './grammar-fixture.mjs'

const require = createRequire(import.meta.url)
export const { chromium } = createRequire(new URL('examples/gallery/package.json', root))('@playwright/test')
const assets = Object.fromEntries(Object.entries({ vue: 'vue/dist/vue.global.prod.js', quasar: 'quasar/dist/quasar.umd.prod.js', css: 'quasar/dist/quasar.prod.css' }).map(([key, path]) => [key, readFileSync(require.resolve(path), 'utf8')]))
export const roles = ['primary', 'secondary', 'accent', 'positive', 'negative', 'warning', 'info']

export async function mount(browser, css, { layered = false, mode = 'light', profile = 'fluent', custom = false, coarse = false, forced = false } = {}) {
  const page = await browser.newPage({ viewport: { width: coarse ? 393 : 1100, height: 1000 }, hasTouch: coarse, isMobile: coarse, forcedColors: forced ? 'active' : 'none' })
  const classes = `qds-ui qds-theme-${mode} ${profile === 'default' ? '' : `qds-variant-${profile.startsWith('shadcn') ? 'shadcn' : profile}`}`
  const palette = profile.startsWith('shadcn-') ? profile.slice(7) : 'neutral'
  await page.setContent(`<style>${layered ? '@layer qds-important,quasar,qds;@layer quasar {' + assets.css + '}' : assets.css}</style><style>${css}</style><style>@property --qds-active-probe { syntax: '<integer>'; inherits: false; initial-value: 0 } button:active, [role='button']:active, a:active, input:active, textarea:active, select:active { --qds-active-probe: 1 }</style><style>body{margin:16px}#app{display:grid;gap:16px} .roles,.group{display:flex;gap:8px;flex-wrap:wrap} .field{max-width:340px} .contexts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px} .q-editor{max-width:360px}</style><body class="${custom ? '' : classes}" data-qds-shadcn-base="${palette}"><main id="app" class="${custom ? classes : ''}" data-qds-shadcn-base="${palette}"></main></body>`)
  await page.addScriptTag({ content: assets.vue })
  await page.addScriptTag({ content: assets.quasar })
  await page.evaluate(({ icons, roles, mode }) => {
    const { createApp, h, reactive, nextTick } = Vue
    const { QBtn, QInput, QSelect, QIcon, QPagination, QBtnToggle, QDate, QEditor } = Quasar
    const state = reactive({ value: 'Project', chips: ['One', 'Two'], page: 2, toggle: 'a', date: '2026/10/15', editor: 'Native editor' })
    const app = createApp({ setup: () => () => [
      h('div', { class: 'roles' }, roles.map((role) => h(QBtn, { id: role, label: role, color: role, textColor: 'white', unelevated: true, ripple: false, icon: icons.fab.icon }))),
      h('div', { class: 'group' }, [h(QBtn, { id: 'literal', label: 'Literal', color: 'red-7', textColor: 'white', ripple: false }), h(QBtn, { id: 'author', label: 'Author', color: 'primary', style: 'color:rgb(13,23,33)!important;background-color:rgb(233,223,213)!important', ripple: false }), h(QBtn, { id: 'tonal', label: 'Tonal', color: 'primary', class: 'qds-tonal', ripple: false }), h(QBtn, { id: 'disabled', label: 'Disabled', color: 'primary', disable: true })]),
      h(QInput, { class: 'field', modelValue: state.value, 'onUpdate:modelValue': (v) => { state.value = v }, label: 'Project', outlined: true, clearable: true, counter: true, hint: 'Native hint' }, { append: () => h(QBtn, { id: 'append', flat: true, round: true, dense: true, icon: icons.fab.icon, 'aria-label': 'Custom append', ripple: false }) }),
      h(QBtn, { id: 'next', label: 'Next', ripple: false }),
      h(QSelect, { class: 'chips', modelValue: state.chips, multiple: true, useChips: true, options: ['One', 'Two'], outlined: true, label: 'Tags' }),
      h('div', { class: 'contexts' }, [
        h(QPagination, { id: 'pagination', modelValue: state.page, max: 4, color: 'primary' }),
        h(QBtnToggle, { id: 'toggle', modelValue: state.toggle, toggleColor: 'primary', options: [{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }] }),
        h(QDate, { id: 'calendar', modelValue: state.date, minimal: true, color: 'primary', defaultYearMonth: '2026/10' }),
        h(QEditor, { id: 'editor', modelValue: state.editor, toolbar: [['bold', 'italic']], toolbarToggleColor: 'primary' }),
      ]),
    ] })
    app.use(Quasar, { iconSet: icons, config: { dark: mode === 'dark' } })
    app.mount('#app')
    window.fixture = { state, async reset() { state.value = 'Project'; await nextTick() }, dispose: () => app.unmount() }
  }, { icons: JSON.parse(JSON.stringify(qdsIconSet)), roles, mode })
  await settle(page)
  return page
}

export async function settle(page) {
  // Wait for actual native transitions, not for a contrast threshold that rest might satisfy.
  await page.evaluate(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    await Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => {})))
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  })
}

export async function paint(page, selector) {
  const colors = await page.locator(selector).evaluate((el) => {
    const style = getComputedStyle(el)
    const ancestors = []
    for (let node = el; node; node = node.parentElement) {
      const s = getComputedStyle(node)
      if (s.opacity !== '1') throw new Error(`Unexpected group opacity ${s.opacity}`)
      ancestors.push(s.backgroundColor)
    }
    return { foreground: style.color, background: style.backgroundColor, ancestors, active: style.getPropertyValue('--qds-active-probe').trim() === '1' }
  })
  const parse = (text) => { const c = new Color(text).to('srgb'); return [...c.coords, c.alpha] }
  const over = (a, b) => a.slice(0, 3).map((v, i) => v * a[3] + b[i] * (1 - a[3]))
  let fill = [1, 1, 1]
  for (const background of colors.ancestors.toReversed()) fill = over(parse(background), fill)
  const text = over(parse(colors.foreground), fill)
  const lum = (rgb) => rgb.map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0)
  const [a, b] = [lum(fill), lum(text)].sort((x, y) => y - x)
  return { ...colors, fill, luminance: lum(fill), ratio: (a + 0.05) / (b + 0.05) }
}

export async function snapshot(page, selector = '#app') {
  return page.locator(selector).evaluate((root) => {
    const properties = ['color', 'background-color', 'background-image', 'border-color', 'border-width', 'border-radius', 'box-shadow', 'outline', 'outline-offset', 'opacity', 'display', 'visibility', 'font', 'letter-spacing', 'line-height', 'padding', 'margin', 'gap', 'transform', 'clip-path', 'width', 'height', 'min-height', 'position', 'inset']
    return [root, ...root.querySelectorAll('*')].map((el) => ({
      tag: el.tagName, class: el.getAttribute('class'), text: el.childElementCount ? null : el.textContent,
      svg: el.getAttribute('d'), fill: el.getAttribute('fill'),
      styles: [null, '::before', '::after'].map((pseudo) => {
        const style = getComputedStyle(el, pseudo)
        return Object.fromEntries(properties.map((property) => [property, style.getPropertyValue(property)]))
      }),
      rect: (() => { const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height] })(),
    }))
  })
}
