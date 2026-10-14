import { nextTick, reactive, ref } from 'vue'
import { palettes, PALETTE_NAMES, type PaletteMode, type PaletteName } from './palettes'
import { LEGACY_SIDEBAR_ALIASES } from './palette-data.mjs'

export const UPSTREAM_COMMIT = 'b251d9fd92aa496495e127137a7734704fb34a29'
export const FAMILIES = ['button', 'input', 'selection', 'tabs', 'badge', 'card', 'table', 'menu', 'dialog', 'sidebar'] as const
export type Family = typeof FAMILIES[number]
export type Overlay = 'menu' | 'dialog' | 'select' | null

const query = new URLSearchParams(window.location.search)
const initialPalette = query.get('palette') as PaletteName
const initialFamily = query.get('family') as Family
export const state = reactive({
  mode: (query.get('mode') === 'dark' ? 'dark' : 'light') as PaletteMode,
  palette: PALETTE_NAMES.includes(initialPalette) ? initialPalette : 'neutral' as PaletteName,
  family: FAMILIES.includes(initialFamily) ? initialFamily : 'all' as Family | 'all',
  capture: query.get('capture') === '1',
  ready: false,
})
export const menuOpen = ref(false)
export const dialogOpen = ref(false)
export const selectOpen = ref(false)
export const fixtureRevision = ref(0)

function applyTheme() {
  const root = document.documentElement
  // Remove stale legacy-only properties when switching back to modern palettes.
  const keys = new Set(Object.values(palettes).flatMap(palette => Object.values(palette).flatMap(values => Object.keys(values))))
  for (const key of keys) root.style.removeProperty(`--${key}`)
  for (const [key, value] of Object.entries(palettes[state.palette][state.mode])) root.style.setProperty(`--${key}`, value)
  root.classList.toggle('dark', state.mode === 'dark')
  root.classList.toggle('light', state.mode === 'light')
  root.style.colorScheme = state.mode
  root.dataset.referenceMode = state.mode
  root.dataset.referencePalette = state.palette
  root.dataset.referenceCapture = String(state.capture)
  root.dataset.referenceFamily = state.family
  root.dataset.referenceReady = 'false'
}

let generation = 0
export async function settle() {
  const current = ++generation
  state.ready = false
  document.documentElement.dataset.referenceReady = 'false'
  await nextTick()
  const faces = await document.fonts.load('400 14px "Inter Variable"', 'Reference œ')
  if (faces.length === 0) throw new Error('The local Inter font-face is not available')
  await document.fonts.load('500 14px "Inter Variable"', 'Reference œ')
  await document.fonts.load('600 18px "Inter Variable"', 'Reference œ')
  await document.fonts.ready
  // Reka floating-position observers and Vue DOM updates finish before capture.
  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
  if (current === generation) {
    state.ready = true
    document.documentElement.dataset.referenceReady = 'true'
  }
}

async function setMode(mode: PaletteMode) {
  if (mode !== 'light' && mode !== 'dark') throw new Error(`Unsupported reference mode: ${mode}`)
  state.mode = mode
  applyTheme()
  await settle()
}

async function setPalette(palette: PaletteName) {
  if (!PALETTE_NAMES.includes(palette)) throw new Error(`Unsupported reference palette: ${palette}`)
  state.palette = palette
  applyTheme()
  await settle()
}

async function setFamily(family: Family | 'all') {
  if (family !== 'all' && !FAMILIES.includes(family)) throw new Error(`Unsupported reference family: ${family}`)
  await openOverlay(null)
  state.family = family
  applyTheme()
  await settle()
}

async function openOverlay(overlay: Overlay) {
  if (![null, 'menu', 'dialog', 'select'].includes(overlay)) throw new Error(`Unsupported overlay: ${overlay}`)
  // Never capture unrelated overlapping overlays or stale focus traps.
  menuOpen.value = false
  dialogOpen.value = false
  selectOpen.value = false
  await nextTick()
  menuOpen.value = overlay === 'menu'
  dialogOpen.value = overlay === 'dialog'
  selectOpen.value = overlay === 'select'
  await settle()
}

export const reference = {
  commit: UPSTREAM_COMMIT,
  palettes: PALETTE_NAMES,
  families: FAMILIES,
  get ready() { return state.ready },
  get mode() { return state.mode },
  get palette() { return state.palette },
  get family() { return state.family },
  setMode,
  setPalette,
  setBaseColor: setPalette,
  setFamily,
  openOverlay,
  async setCapture(capture: boolean) {
    state.capture = Boolean(capture)
    applyTheme()
    await settle()
  },
  async reset() {
    await openOverlay(null)
    fixtureRevision.value++
    await settle()
  },
  settle,
  getTokens() { return { ...palettes[state.palette][state.mode] } },
  getProvenance() {
    return {
      commit: UPSTREAM_COMMIT,
      components: 'apps/v4/registry/new-york-v4/ui',
      palette: state.palette,
      source: ['gray', 'slate'].includes(state.palette)
        ? `apps/v4/public/r/themes/${state.palette}.json`
        : 'apps/v4/registry/themes.ts',
      normalization: ['gray', 'slate'].includes(state.palette)
        ? { colors: 'hsl(source triplet), no color conversion', sidebarAliases: LEGACY_SIDEBAR_ALIASES, radius: 'neutral.light.radius' }
        : { colors: 'verbatim OKLCH', radius: `${state.palette}.light.radius in both modes` },
      icons: 'Phosphor regular via Vite import alias',
      font: 'shared local Inter Variable',
    }
  },
}

declare global {
  interface Window { __shadcnReference: typeof reference }
}

applyTheme()
window.__shadcnReference = reference
