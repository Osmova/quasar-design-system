// Parse the pinned data literal, never evaluate downloaded TypeScript.
export const PALETTE_NAMES = Object.freeze(['neutral', 'gray', 'zinc', 'stone', 'slate'])

export function modernPalette(source, name) {
  const marker = `name: "${name}"`
  const start = source.indexOf(marker)
  if (start < 0) throw new Error(`Missing upstream palette: ${name}`)
  const cssStart = source.indexOf('cssVars:', start)
  const brace = source.indexOf('{', cssStart)
  let depth = 0
  let quoted = false
  let escaped = false
  for (let index = brace; index < source.length; index++) {
    const character = source[index]
    if (quoted) {
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === '"') quoted = false
    } else if (character === '"') quoted = true
    else if (character === '{') depth++
    else if (character === '}' && --depth === 0) {
      return JSON.parse(source.slice(brace, index + 1)
        .replace(/\b(light|dark):/g, '"$1":').replace(/,\s*([}\]])/g, '$1'))
    }
  }
  throw new Error(`Incomplete upstream palette: ${name}`)
}

// Legacy registries have no sidebar slots. Explicit aliases reuse THIS palette,
// not a guessed OKLCH ramp or another palette's colors. Exposed in provenance.
export const LEGACY_SIDEBAR_ALIASES = Object.freeze({
  sidebar: 'background',
  'sidebar-foreground': 'foreground',
  'sidebar-primary': 'primary',
  'sidebar-primary-foreground': 'primary-foreground',
  'sidebar-accent': 'accent',
  'sidebar-accent-foreground': 'accent-foreground',
  'sidebar-border': 'border',
  'sidebar-ring': 'ring',
})

export function buildPalettes(modernSource, gray, slate) {
  const palettes = Object.fromEntries(['neutral', 'stone', 'zinc'].map(name => [name, modernPalette(modernSource, name)]))
  for (const name of ['gray', 'slate']) {
    const registry = name === 'gray' ? gray : slate
    if (registry.name !== name) throw new Error(`Wrong legacy registry: ${name}`)
    palettes[name] = {}
    for (const mode of ['light', 'dark']) {
      const values = Object.fromEntries(Object.entries(registry.cssVars[mode]).map(([key, value]) => {
        if (!/^[-\d.]+\s+[-\d.]+%\s+[-\d.]+%$/.test(value)) throw new Error(`Unexpected HSL: ${name}/${key}`)
        return [key, `hsl(${value})`]
      }))
      for (const [slot, source] of Object.entries(LEGACY_SIDEBAR_ALIASES)) values[slot] = values[source]
      // Same New York v4 geometry for all five palettes; legacy JSON has no radius.
      values.radius = palettes.neutral.light.radius
      palettes[name][mode] = values
    }
  }
  for (const name of ['neutral', 'stone', 'zinc']) {
    palettes[name].dark.radius = palettes[name].light.radius
  }
  return palettes
}
