export {
  DEFAULT_DESIGN_SYSTEM_OPTIONS,
  DESIGN_SYSTEM_THEME_KEY,
  configureDesignSystem,
  createDesignSystemController,
  getDesignSystemController,
  useDesignSystem,
  type DesignSystemController,
  type DesignSystemMode,
  type DesignSystemOptions,
  type DesignSystemResolvedMode,
  type DesignSystemState,
} from './runtime/theme.js'

export {
  DEFAULT_THEME,
  DEFAULT_THEME_NAME,
  DESIGN_SYSTEM_THEMES,
  DESIGN_SYSTEM_VARIANTS,
  SHADCN_BASE_COLORS,
  isShadcnBaseColor,
  isBuiltInDesignSystemVariantName,
  isDesignSystemVariantName,
  type BuiltInDesignSystemVariantName,
  type CanonicalDesignSystemVariantName,
  type DesignSystemVariant,
  type DesignSystemVariantName,
  type LegacyDesignSystemVariantName,
  type QuasarDesignTheme,
  type ShadcnBaseColor,
} from './themes/index.js'

export { QDS_TOKENS, type QdsToken, type QdsTokenMap } from './tokens/index.js'

export { default as qdsIconSet, type QdsIconSet } from './icons/quasar-icon-set.js'
