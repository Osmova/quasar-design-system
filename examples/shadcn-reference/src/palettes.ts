import themesSource from '../upstream/apps/v4/registry/themes.ts?raw'
import gray from '../upstream/apps/v4/public/r/themes/gray.json'
import slate from '../upstream/apps/v4/public/r/themes/slate.json'
import { buildPalettes, PALETTE_NAMES } from './palette-data.mjs'

export const palettes = buildPalettes(themesSource, gray, slate)
export { PALETTE_NAMES }
export type { PaletteName, PaletteMode } from './palette-data.mjs'
