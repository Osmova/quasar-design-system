export type CanonicalDesignSystemVariantName = 'fluent' | 'ink' | 'one' | 'term' | 'shadcn'
export type LegacyDesignSystemVariantName = 'studio' | 'air' | 'glass' | 'feather' | 'mobile' | 'terminal'
export type BuiltInDesignSystemVariantName = CanonicalDesignSystemVariantName | LegacyDesignSystemVariantName

// Built-ins are typed narrowly while still accepting variants registered by
// external projects. `(string & {})` keeps literal autocompletion.
export type DesignSystemVariantName = BuiltInDesignSystemVariantName | (string & {})

export interface DesignSystemVariant {
  name: DesignSystemVariantName
  label: string
  description?: string
  cssClass: string
}

export interface QuasarDesignTheme {
  name: string
  label: string
  description?: string
  cssClass?: string
  variants: Record<string, DesignSystemVariant>
}

export const DEFAULT_THEME_NAME = 'default'

export const SHADCN_BASE_COLORS = [
  { name: 'neutral', label: 'Neutral' },
  { name: 'gray', label: 'Gray' },
  { name: 'zinc', label: 'Zinc' },
  { name: 'stone', label: 'Stone' },
  { name: 'slate', label: 'Slate' },
] as const

export type ShadcnBaseColor = (typeof SHADCN_BASE_COLORS)[number]['name']

export function isShadcnBaseColor(value: unknown): value is ShadcnBaseColor {
  return SHADCN_BASE_COLORS.some((color) => color.name === value)
}

export const DESIGN_SYSTEM_VARIANTS = {
  fluent: {
    name: 'fluent',
    label: 'Fluent',
    description: 'Default Fluent 2-inspired baseline with solid mica surfaces and restrained tonal color.',
    cssClass: 'qds-variant-fluent',
  },
  ink: {
    name: 'ink',
    label: 'Ink',
    description: 'Paper-neutral editorial surfaces with charcoal type and coordinated pastel role washes.',
    cssClass: 'qds-variant-ink',
  },
  one: {
    name: 'one',
    label: 'One',
    description: 'One UI-inspired neutral blocks, calm blue accent, pill controls, and touch-friendly rhythm.',
    cssClass: 'qds-variant-one',
  },
  term: {
    name: 'term',
    label: 'Term',
    description: 'Opaque amber developer UI on warm cream or near-black panes, with hairline rules and monospace type.',
    cssClass: 'qds-variant-term',
  },
  shadcn: {
    name: 'shadcn',
    label: 'Shadcn',
    description: 'Opaque New York-inspired surfaces with five neutral base palettes.',
    cssClass: 'qds-variant-shadcn',
  },
} as Record<CanonicalDesignSystemVariantName, DesignSystemVariant> & {
  studio: DesignSystemVariant
  air: DesignSystemVariant
  glass: DesignSystemVariant
  feather: DesignSystemVariant
  mobile: DesignSystemVariant
  terminal: DesignSystemVariant
}

const LEGACY_VARIANT_ALIASES = {
  studio: {
    name: 'studio',
    label: 'Fluent',
    description: 'Legacy alias for the fluent variant.',
    cssClass: 'qds-variant-fluent',
  },
  air: {
    name: 'air',
    label: 'Fluent',
    description: 'Legacy alias for the fluent variant.',
    cssClass: 'qds-variant-fluent',
  },
  glass: {
    name: 'glass',
    label: 'Fluent',
    description: 'Legacy alias for the fluent variant.',
    cssClass: 'qds-variant-fluent',
  },
  feather: {
    name: 'feather',
    label: 'Ink',
    description: 'Legacy alias for the ink variant.',
    cssClass: 'qds-variant-ink',
  },
  mobile: {
    name: 'mobile',
    label: 'One',
    description: 'Legacy alias for the one variant.',
    cssClass: 'qds-variant-one',
  },
  terminal: {
    name: 'terminal',
    label: 'Term',
    description: 'Legacy alias for the term variant.',
    cssClass: 'qds-variant-term',
  },
} satisfies Record<LegacyDesignSystemVariantName, DesignSystemVariant>

for (const [name, variant] of Object.entries(LEGACY_VARIANT_ALIASES)) {
  Object.defineProperty(DESIGN_SYSTEM_VARIANTS, name, {
    enumerable: false,
    configurable: false,
    value: variant,
  })
}

export const DEFAULT_THEME: QuasarDesignTheme = {
  name: DEFAULT_THEME_NAME,
  label: 'Default',
  description: 'Fluent 2 focused Quasar 2 design language with Ink, One, Term, and Shadcn variants.',
  variants: DESIGN_SYSTEM_VARIANTS,
}

export const DESIGN_SYSTEM_THEMES = {
  [DEFAULT_THEME.name]: DEFAULT_THEME,
} as const

export function isBuiltInDesignSystemVariantName(value: unknown): value is BuiltInDesignSystemVariantName {
  return value === 'fluent' || value === 'ink' || value === 'one' || value === 'term' || value === 'shadcn'
    || value === 'studio' || value === 'air' || value === 'glass' || value === 'feather'
    || value === 'mobile' || value === 'terminal'
}

// Accepts any non-empty string so external projects can register variants;
// the runtime falls back to the default only for empty/invalid input.
export function isDesignSystemVariantName(value: unknown): value is DesignSystemVariantName {
  return typeof value === 'string' && value.length > 0
}
