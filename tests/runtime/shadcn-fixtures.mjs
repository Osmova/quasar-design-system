import { readFileSync } from 'node:fs'
import * as sass from 'sass'

export const palettes = ['neutral', 'gray', 'zinc', 'stone', 'slate']
export const roles = ['primary', 'secondary', 'accent', 'positive', 'negative', 'warning', 'info']
const root = new URL('../../', import.meta.url)
const upstream = new URL('examples/shadcn-reference/upstream/apps/v4/', root)

export function sourceProfiles() {
  const source = readFileSync(new URL('registry/themes.ts', upstream), 'utf8')
  const profiles = {}
  for (const palette of palettes) {
    if (palette === 'gray' || palette === 'slate') {
      profiles[palette] = JSON.parse(readFileSync(new URL(`public/r/themes/${palette}.json`, upstream), 'utf8')).cssVars
      for (const profile of Object.values(profiles[palette])) {
        for (const [slot, value] of Object.entries(profile)) profile[slot] = `hsl(${value})`
        // Official legacy omissions use the approved deterministic aliases.
        Object.assign(profile, {
          sidebar: profile.popover, 'sidebar-foreground': profile['popover-foreground'],
          'sidebar-primary': profile.primary, 'sidebar-primary-foreground': profile['primary-foreground'],
          'sidebar-accent': profile.secondary, 'sidebar-accent-foreground': profile['secondary-foreground'],
          'sidebar-border': profile.border, 'sidebar-ring': profile.ring,
        })
      }
    } else {
      const block = source.split(`name: "${palette}"`)[1].split('name: "')[0]
      profiles[palette] = {}
      for (const scheme of ['light', 'dark']) {
        const values = block.match(new RegExp(`${scheme}: \\{([\\s\\S]*?)\\n      \\}`))[1]
        profiles[palette][scheme] = Object.fromEntries([...values.matchAll(/"([\w-]+)": "([^"]+)"/g)].map((m) => [m[1], m[2]]))
        delete profiles[palette][scheme].radius // New York Card geometry is rounded-xl, not the theme radius.
      }
    }
  }
  return profiles
}

export function emittedProfiles() {
  const fixtures = palettes.flatMap((palette) => ['light', 'dark'].map((scheme) =>
    `.fixture-${palette}-${scheme} { @include shadcn.scheme('${palette}', ${scheme}); }`)).join('\n')
  const { css } = sass.compileString(`@use 'src/themes/shadcn'; ${fixtures}`, {
    loadPaths: [root.pathname], silenceDeprecations: ['if-function'],
  })
  return Object.fromEntries([...css.matchAll(/\.fixture-([\w-]+) \{([^}]+)\}/g)].map((m) => [
    m[1], Object.fromEntries([...m[2].matchAll(/(--[\w-]+): ([^;]+);/g)].map((p) => [p[1], p[2]])),
  ]))
}

export function parseRgb(css) {
  const named = { white: 255, black: 0, whitesmoke: 245, gainsboro: 220, silver: 192, gray: 128, dimgray: 105, darkgray: 169, lightgray: 211 }
  if (Object.hasOwn(named, css)) return [named[css], named[css], named[css], 1]
  if (css.startsWith('#')) {
    let hex = css.slice(1)
    if (hex.length === 3) hex = [...hex].map((c) => c + c).join('')
    return [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)).concat(1)
  }
  if (/^rgba?\(/.test(css)) {
    const numbers = css.match(/[\d.]+/g).map(Number)
    return [...numbers.slice(0, 3), numbers[3] ?? 1]
  }
  throw new Error(`Not sRGB: ${css}`)
}

// Independent float64 OKLCH/HSL converter (no Sass calls). Color.js verification
// is also available via scripts/test-runtime-colorjs.mjs once installed by owner.
export function sourceRgb(css) {
  const values = css.match(/[\d.]+/g).map(Number)
  let rgb
  if (css.startsWith('oklch')) {
    const [l, c, degrees] = values
    const a = c * Math.cos(degrees * Math.PI / 180)
    const b = c * Math.sin(degrees * Math.PI / 180)
    const ll = (l + 0.3963377773761749 * a + 0.2158037573099136 * b) ** 3
    const mm = (l - 0.1055613458156586 * a - 0.0638541728258133 * b) ** 3
    const ss = (l - 0.0894841775298119 * a - 1.2914855480194092 * b) ** 3
    rgb = [
      4.076741661347994 * ll - 3.3077115913 * mm + 0.230969929981 * ss,
      -1.2684380046 * ll + 2.6097574011 * mm - 0.3413193965 * ss,
      -0.0041960863 * ll - 0.7034186147 * mm + 1.707614701 * ss,
    ].map((v) => v <= 0.0031308 ? 12.92 * v : 1.055 * Math.max(0, v) ** (1 / 2.4) - 0.055)
  } else if (css.startsWith('hsl')) {
    const [h, percentS, percentL] = values
    const s = percentS / 100
    const l = percentL / 100
    const a = s * Math.min(l, 1 - l)
    rgb = [0, 8, 4].map((n) => {
      const k = (n + h / 30) % 12
      return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    })
  } else throw new Error(`Unsupported source color: ${css}`)
  return [...rgb.map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255)), css.includes('/') ? values[3] / 100 : 1]
}

export function mix(fill, container, proportion) {
  return fill.slice(0, 3).map((v, i) => v * proportion + container[i] * (1 - proportion)).concat(1)
}

export function contrast(a, b) {
  const luminance = (rgb) => rgb.slice(0, 3).reduce((sum, byte, i) => {
    const v = byte / 255
    return sum + [0.2126, 0.7152, 0.0722][i] * (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  }, 0)
  const x = luminance(a), y = luminance(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
