export type PaletteName = 'neutral' | 'gray' | 'zinc' | 'stone' | 'slate'
export type PaletteMode = 'light' | 'dark'
export type PaletteValues = Record<string, string>
export const PALETTE_NAMES: readonly PaletteName[]
export const LEGACY_SIDEBAR_ALIASES: Readonly<Record<string, string>>
export function modernPalette(source: string, name: string): Record<PaletteMode, PaletteValues>
export function buildPalettes(source: string, gray: unknown, slate: unknown): Record<PaletteName, Record<PaletteMode, PaletteValues>>
