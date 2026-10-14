/**
 * Canonical inventory of the public CSS custom-property contract.
 * Every `--qds-*` token the package emits is listed here so consumers can
 * discover, type, and override the full surface. The stable public contract
 * is the `--qds-*` prefix; Sass map names remain internal.
 *
 * Source of truth: the union of `--qds-*` properties emitted at `:root` in
 * `src/themes/fallbacks.scss` (base layer) and `src/themes/default.scss`
 * (default theme + derived tokens), plus variant-scoped primitives in
 * `src/themes/_shadcn.scss`. Tokens are grouped in a stable order; shadcn
 * primitives intentionally do not change the universal fallback output.
 */
export const QDS_TOKENS = [
  // Shadcn upstream slots (variant-scoped; aliases below remain universal).
  '--qds-shadcn-background',
  '--qds-shadcn-foreground',
  '--qds-shadcn-card',
  '--qds-shadcn-card-foreground',
  '--qds-shadcn-popover',
  '--qds-shadcn-popover-foreground',
  '--qds-shadcn-primary',
  '--qds-shadcn-primary-foreground',
  '--qds-shadcn-secondary',
  '--qds-shadcn-secondary-foreground',
  '--qds-shadcn-muted',
  '--qds-shadcn-muted-foreground',
  '--qds-shadcn-accent',
  '--qds-shadcn-accent-foreground',
  '--qds-shadcn-destructive',
  '--qds-shadcn-destructive-foreground',
  '--qds-shadcn-border',
  '--qds-shadcn-input',
  '--qds-shadcn-ring',
  '--qds-shadcn-chart-1',
  '--qds-shadcn-chart-2',
  '--qds-shadcn-chart-3',
  '--qds-shadcn-chart-4',
  '--qds-shadcn-chart-5',
  '--qds-shadcn-sidebar',
  '--qds-shadcn-sidebar-foreground',
  '--qds-shadcn-sidebar-primary',
  '--qds-shadcn-sidebar-primary-foreground',
  '--qds-shadcn-sidebar-accent',
  '--qds-shadcn-sidebar-accent-foreground',
  '--qds-shadcn-sidebar-border',
  '--qds-shadcn-sidebar-ring',
  '--qds-surface-secondary-soft',
  // Calibrated Shadcn role states; primary hover/pressed are listed below.
  '--qds-color-secondary-hover',
  '--qds-color-secondary-pressed',
  '--qds-color-accent-hover',
  '--qds-color-accent-pressed',
  '--qds-color-positive-hover',
  '--qds-color-positive-pressed',
  '--qds-color-negative-hover',
  '--qds-color-negative-pressed',
  '--qds-color-warning-hover',
  '--qds-color-warning-pressed',
  '--qds-color-info-hover',
  '--qds-color-info-pressed',
  '--qds-color-primary-hover-rgb',
  '--qds-color-primary-pressed-rgb',
  '--qds-color-secondary-hover-rgb',
  '--qds-color-secondary-pressed-rgb',
  '--qds-color-accent-hover-rgb',
  '--qds-color-accent-pressed-rgb',
  '--qds-color-positive-hover-rgb',
  '--qds-color-positive-pressed-rgb',
  '--qds-color-negative-hover-rgb',
  '--qds-color-negative-pressed-rgb',
  '--qds-color-warning-hover-rgb',
  '--qds-color-warning-pressed-rgb',
  '--qds-color-info-hover-rgb',
  '--qds-color-info-pressed-rgb',
  '--qds-text-on-primary-pressed-mix',
  '--qds-text-on-secondary-pressed-mix',
  '--qds-text-on-accent-pressed-mix',
  '--qds-text-on-positive-pressed-mix',
  '--qds-text-on-negative-pressed-mix',
  '--qds-text-on-warning-pressed-mix',
  '--qds-text-on-info-pressed-mix',
  // ── Colors ──────────────────────────────────────────────────────────
  '--qds-color-primary',
  '--qds-color-primary-light',
  '--qds-color-primary-dark',
  '--qds-color-primary-hover',
  '--qds-color-primary-pressed',
  '--qds-color-secondary',
  '--qds-color-accent',
  '--qds-color-positive',
  '--qds-color-negative',
  '--qds-color-warning',
  '--qds-color-info',

  // ── Colors (RGB) ────────────────────────────────────────────────────
  '--qds-color-primary-rgb',
  '--qds-color-primary-light-rgb',
  '--qds-color-primary-dark-rgb',
  '--qds-color-secondary-rgb',
  '--qds-color-accent-rgb',
  '--qds-color-positive-rgb',
  '--qds-color-negative-rgb',
  '--qds-color-warning-rgb',
  '--qds-color-info-rgb',

  // ── Surfaces ────────────────────────────────────────────────────────
  '--qds-surface-0',
  '--qds-surface-1',
  '--qds-surface-2',
  '--qds-surface-3',
  '--qds-surface-glass',
  '--qds-surface-brand-soft',
  '--qds-surface-accent-soft',
  '--qds-surface-positive-soft',
  '--qds-surface-warning-soft',
  '--qds-surface-negative-soft',
  '--qds-surface-info-soft',
  '--qds-surface-focus-block',
  '--qds-surface-transient',

  // ── Text ────────────────────────────────────────────────────────────
  '--qds-text',
  '--qds-text-strong',
  '--qds-text-muted',
  '--qds-text-on-solid',
  '--qds-text-on-primary',
  '--qds-text-on-secondary',
  '--qds-text-on-accent',
  '--qds-text-on-positive',
  '--qds-text-on-negative',
  '--qds-text-on-warning',
  '--qds-text-on-info',

  // ── Media ───────────────────────────────────────────────────────────
  '--qds-media-scrim',
  '--qds-media-scrim-strong',

  // ── Materials ───────────────────────────────────────────────────────
  '--qds-backdrop',
  '--qds-mica-alt',
  '--qds-material-thin-bg',
  '--qds-material-regular-bg',
  '--qds-material-thick-bg',
  '--qds-material-thin-blur',
  '--qds-material-regular-blur',
  '--qds-material-thick-blur',
  '--qds-material-thin-filter',
  '--qds-material-regular-filter',
  '--qds-material-thick-filter',
  '--qds-material-saturate',
  '--qds-material-stroke',
  '--qds-material-edge',

  // ── Borders ─────────────────────────────────────────────────────────
  '--qds-border',
  '--qds-border-subtle',

  // ── Spacing ─────────────────────────────────────────────────────────
  '--qds-space-xs',
  '--qds-space-sm',
  '--qds-space-md',
  '--qds-space-lg',
  '--qds-space-xl',

  // ── Radius ──────────────────────────────────────────────────────────
  '--qds-radius-xs',
  '--qds-radius-sm',
  '--qds-radius-md',
  '--qds-radius-lg',
  '--qds-radius-xl',
  '--qds-radius-full',
  '--qds-radius-control',

  // ── Shadows ─────────────────────────────────────────────────────────
  '--qds-shadow-sm',
  '--qds-shadow-md',
  '--qds-shadow-lg',
  '--qds-shadow-2',
  '--qds-shadow-4',
  '--qds-shadow-8',
  '--qds-shadow-16',
  '--qds-shadow-28',
  '--qds-shadow-64',

  // ── Typography ──────────────────────────────────────────────────────
  '--qds-font-family',
  '--qds-font-family-display',
  '--qds-font-family-accent',
  '--qds-font-weight-regular',
  '--qds-font-weight-medium',
  '--qds-font-weight-semibold',
  '--qds-font-weight-bold',

  // ── Motion ──────────────────────────────────────────────────────────
  '--qds-motion-fast',
  '--qds-motion-base',
  '--qds-motion-duration-fast',
  '--qds-motion-duration-base',
  '--qds-motion-duration-medium',
  '--qds-motion-duration-slow',
  '--qds-motion-ease-out',
  '--qds-motion-ease-in-out',

  // ── Focus ring ──────────────────────────────────────────────────────
  '--qds-focus-ring-width',
  '--qds-focus-ring-offset',
  '--qds-focus-ring-opacity',

  // ── State opacities ─────────────────────────────────────────────────
  '--qds-state-hover-opacity',
  '--qds-state-focus-opacity',
  '--qds-state-press-opacity',
  '--qds-disabled-opacity',

  // ── Tonal opacities ─────────────────────────────────────────────────
  '--qds-tonal-bg-opacity',
  '--qds-tonal-hover-opacity',
  '--qds-tonal-border-opacity',
  '--qds-tonal-text-mix',

  // ── Solid fill states ───────────────────────────────────────────────
  '--qds-fill-hover-mix',
  '--qds-fill-pressed-mix',
  '--qds-fill-state-base',
  '--qds-text-on-fill-pressed-mix',

  // ── Border widths ───────────────────────────────────────────────────
  '--qds-border-width-control',

  // ── Control ─────────────────────────────────────────────────────────
  '--qds-control-size-sm',
  '--qds-control-size-md',
  '--qds-control-size-lg',
  '--qds-control-font-size-sm',
  '--qds-control-icon-size-sm',
  '--qds-control-icon-size-md',
  '--qds-control-icon-size-lg',
  '--qds-control-icon-opacity',
  '--qds-control-icon-opacity-active',
  '--qds-control-letter-spacing',
  '--qds-control-text-transform',
  '--qds-control-content-line-height',

  // ── Control size helpers (derived) ───────────────────────────────────
  '--qds-button-size-sm',
  '--qds-button-size-md',
  '--qds-button-size-lg',
  '--qds-field-size-sm',
  '--qds-field-size-md',
  '--qds-field-size-lg',
  '--qds-field-label-size-rest',
  '--qds-field-label-size-float',
  '--qds-field-label-gap',
  '--qds-field-label-column',
  '--qds-field-value-inset-block-start',
  '--qds-field-value-inset-block-end',
  '--qds-field-value-inset-block-start-dense',
  '--qds-field-value-inset-block-end-dense',
  '--qds-field-transition',
  '--qds-field-label-weight',
  '--qds-field-shadow',
  '--qds-field-focus-stroke',
  '--qds-field-focus-halo',
  '--qds-field-description-color',
  '--qds-field-help-gap',
  '--qds-control-fill-input-active',
  '--qds-control-stroke-default',
  '--qds-control-stroke-secondary',
  '--qds-control-stroke-strong',
  '--qds-control-stroke-top',
  '--qds-control-stroke-bottom',
  '--qds-control-stroke-on-accent-top',
  '--qds-control-stroke-on-accent-bottom',
  '--qds-card-fill',
  '--qds-card-stroke',
  '--qds-control-halo',
  '--qds-row-gap',
  '--qds-row-radius',
  '--qds-row-inset',
  '--qds-progress-stripe',
  '--qds-spinner-static-arc',
  '--qds-spinner-static-offset',
  '--qds-icon-size-xs',
  '--qds-icon-size-sm',
  '--qds-icon-size-md',
  '--qds-icon-size-lg',
  '--qds-control-icon-color',
  '--qds-button-icon-size',
  '--qds-button-dense-icon-size',
  '--qds-field-icon-size',
  '--qds-field-dense-icon-size',
  '--qds-chip-icon-size',
  '--qds-chip-dense-icon-size',
  '--qds-compact-action-size',
  '--qds-compact-action-icon-size',

  // ── Inline icons ────────────────────────────────────────────────────
  '--qds-inline-icon-gap',
  '--qds-inline-icon-dense-gap',

  // ── Button ──────────────────────────────────────────────────────────
  '--qds-button-min-height',
  '--qds-button-padding-inline',
  '--qds-button-dense-min-height',
  '--qds-button-dense-padding-inline',
  '--qds-button-dense-radius',
  '--qds-button-dense-font-size',
  '--qds-button-round-size',
  '--qds-button-elevated-shadow',
  '--qds-button-elevated-shadow-hover',
  '--qds-fab-size',
  '--qds-fab-mini-size',

  // ── Avatar ──────────────────────────────────────────────────────────
  '--qds-avatar-initials-scale',

  // ── Card ────────────────────────────────────────────────────────────
  '--qds-card-acrylic-tint-rgb',
  '--qds-card-tonal-opacity',
  '--qds-card-fallback-tonal-opacity',
  '--qds-card-readable-tonal-opacity',
  '--qds-card-readable-surface-mix',
  '--qds-card-header-tonal-opacity',
  '--qds-card-header-surface-mix',
  '--qds-card-border-mix',
  '--qds-card-backdrop-blur',
  '--qds-card-backdrop-saturate',

  // ── Chrome ──────────────────────────────────────────────────────────
  '--qds-chrome-border-mix',
  '--qds-chrome-border-soft-mix',
  '--qds-chrome-surface-mix',
  '--qds-chrome-surface-strong-mix',
  '--qds-separator-mix',
  '--qds-handle-border-mix',
  '--qds-handle-primary-mix',

  // ── Badge ───────────────────────────────────────────────────────────
  '--qds-badge-min-height',
  '--qds-badge-padding',

  // ── Chip ────────────────────────────────────────────────────────────
  '--qds-chip-min-height',
  '--qds-chip-padding',
  '--qds-chip-dense-min-height',
  '--qds-chip-dense-padding',

  // ── Field ───────────────────────────────────────────────────────────
  '--qds-field-min-height',
  '--qds-field-dense-min-height',
  '--qds-field-padding-inline',
  '--qds-field-label-size',
  '--qds-field-focus-border-width',

  // ── Glass effects ───────────────────────────────────────────────────
  '--qds-glass-blur',
  '--qds-glass-saturate',
  '--qds-glass-border-mix',

  // ── Elevation (derived from shadows) ────────────────────────────────
  '--qds-elevation-1',
  '--qds-elevation-2',
  '--qds-elevation-3',

  // ── Interactive (derived from surfaces/text/border) ─────────────────
  '--qds-interactive-bg',
  '--qds-interactive-bg-hover',
  '--qds-interactive-bg-active',
  '--qds-interactive-border',
  '--qds-interactive-border-strong',
  '--qds-interactive-text',
  '--qds-interactive-text-muted',

  // ── Button (derived) ────────────────────────────────────────────────
  '--qds-button-icon-gap',
  '--qds-button-dense-icon-gap',
  '--qds-button-radius',

  // ── Chip (derived) ──────────────────────────────────────────────────
  '--qds-chip-icon-gap',
  '--qds-chip-dense-icon-gap',
  '--qds-chip-radius',

  // ── Badge (derived) ─────────────────────────────────────────────────
  '--qds-badge-icon-gap',
  '--qds-badge-dense-icon-gap',
  '--qds-badge-radius',

  // ── Banner (component) ──────────────────────────────────────────────
  '--qds-banner-accent',
  '--qds-banner-accent-rgb',
  '--qds-banner-text',

  // ── Card (derived) ──────────────────────────────────────────────────
  '--qds-card-bg',
  '--qds-card-bg-fallback',
  '--qds-card-bg-readable',
  '--qds-card-bg-opaque',
  '--qds-card-border',
  '--qds-card-border-strong',
  '--qds-card-header-bg',
  '--qds-card-header-bg-opaque',
  '--qds-card-header-border',
  '--qds-card-radius',
  '--qds-card-shadow',
  '--qds-card-shadow-value',

  // ── Chrome (derived) ────────────────────────────────────────────────
  '--qds-chrome-border',
  '--qds-chrome-border-soft',
  '--qds-chrome-surface',
  '--qds-chrome-surface-strong',
  '--qds-chrome-shadow',
  '--qds-chrome-shadow-value',
  '--qds-media-frame-shadow',
  '--qds-media-frame-shadow-value',
  '--qds-separator-color',
  '--qds-handle-color',

  // ── Menu (derived) ──────────────────────────────────────────────────
  '--qds-menu-bg',
  '--qds-menu-border',
  '--qds-menu-item-min-height',
  '--qds-menu-item-min-height-value',
  '--qds-menu-radius',
  '--qds-menu-shadow',

  // ── Notification (derived) ──────────────────────────────────────────
  '--qds-notification-radius',
  '--qds-notification-shadow',

  // ── Notification (component) ────────────────────────────────────────
  '--qds-notify-accent',
  '--qds-notify-accent-rgb',
  '--qds-notify-bg',
  '--qds-notify-text',

  // ── Pagination (component) ──────────────────────────────────────────
  '--qds-pagination-active-bg',
  '--qds-pagination-active-border',
  '--qds-pagination-active-text',

  // ── Scrollbar (component) ───────────────────────────────────────────
  '--qds-scrollbar-size',
  '--qds-scrollbar-thumb',
  '--qds-scrollbar-thumb-hover',

  // ── Selection controls (component) ──────────────────────────────────
  '--qds-selection-inner-size',
  '--qds-selection-mark-offset',
  '--qds-selection-mark-size',

  // ── Stepper (component) ─────────────────────────────────────────────
  '--qds-stepper-rail',
  '--qds-stepper-rail-active',

  // ── List (derived) ──────────────────────────────────────────────────
  '--qds-list-item-min-height',
  '--qds-list-item-min-height-value',

  // ── Expansion (derived) ─────────────────────────────────────────────
  '--qds-expansion-item-min-height',
  '--qds-expansion-item-min-height-value',

  // ── Table (derived) ─────────────────────────────────────────────────
  '--qds-table-header-height',
  '--qds-table-header-height-value',
  '--qds-table-row-height',
  '--qds-table-row-height-value',

  // ── Table (component) ───────────────────────────────────────────────
  '--qds-table-header-bg',
  '--qds-table-header-text',
  '--qds-table-row-hover-bg',
  '--qds-table-selected-bg',
  '--qds-table-sort-icon',

  // ── Timeline (component) ────────────────────────────────────────────
  '--qds-timeline-rail',

  // ── Chat (component) ────────────────────────────────────────────────
  '--qds-chat-bubble-bg',
  '--qds-chat-bubble-fg',

  // ── Toolbar (derived) ───────────────────────────────────────────────
  '--qds-toolbar-bg',
  '--qds-toolbar-dense-min-height',

  // ── Tile (component) ────────────────────────────────────────────────
  '--qds-tile-min-width',
  '--qds-tile-spark-height',

  // ── Field (derived) ─────────────────────────────────────────────────
  '--qds-field-label-bg',

  // ── Slider (derived) ────────────────────────────────────────────────
  '--qds-slider-label-bg',
  '--qds-slider-label-text',
  '--qds-slider-label-border',

  // ── Tab (derived) ───────────────────────────────────────────────────
  '--qds-tab-radius',
  '--qds-tab-min-height',
  '--qds-tab-hover-bg',
  '--qds-tab-active-bg',
  '--qds-tab-active-text',
  '--qds-tab-active-rail',

  // ── Toggle (derived) ────────────────────────────────────────────────
  '--qds-toggle-track-width',
  '--qds-toggle-track-height',
  '--qds-toggle-thumb-inset',

  // ── Semantic foreground ─────────────────────────────────────────────
  '--qds-fg-default',
  '--qds-fg-strong',
  '--qds-fg-muted',
  '--qds-fg-disabled',
  '--qds-fg-on-brand',
  '--qds-fg-brand',
  '--qds-fg-primary',
  '--qds-fg-secondary',
  '--qds-fg-accent',
  '--qds-fg-positive',
  '--qds-fg-negative',
  '--qds-fg-warning',
  '--qds-fg-info',

  // ── Semantic background ──────────────────────────────────────────────
  '--qds-bg-canvas',
  '--qds-bg-surface-1',
  '--qds-bg-surface-2',
  '--qds-bg-layer',
  '--qds-bg-flyout',
  '--qds-bg-overlay',
  '--qds-bg-card',
  '--qds-bg-card-hover',

  // ── Semantic stroke ─────────────────────────────────────────────────
  '--qds-stroke-default',
  '--qds-stroke-subtle',
  '--qds-stroke-strong',
  '--qds-stroke-focus',
  '--qds-stroke-error',
  '--qds-stroke-divider',

  // ── Semantic state layers ───────────────────────────────────────────
  '--qds-state-hover',
  '--qds-state-pressed',
  '--qds-state-selected',
  '--qds-state-disabled',
  '--qds-state-focus-indicator',

  // ── Semantic control fill ───────────────────────────────────────────
  '--qds-control-fill-default',
  '--qds-control-fill-hover',
  '--qds-control-fill-pressed',
  '--qds-control-fill-disabled',

  // ── Semantic segmented control ──────────────────────────────────────
  '--qds-segmented-track-bg',
  '--qds-segmented-thumb-bg',
  '--qds-bar-dark-bg',
  '--qds-bar-dark-fg',

  // ── Typography ramp ──────────────────────────────────────────────────
  '--qds-font-size-caption',
  '--qds-line-height-caption',
  '--qds-font-weight-caption',
  '--qds-font-size-body',
  '--qds-line-height-body',
  '--qds-font-weight-body',
  '--qds-font-size-body-strong',
  '--qds-line-height-body-strong',
  '--qds-font-weight-body-strong',
  '--qds-font-size-subtitle',
  '--qds-line-height-subtitle',
  '--qds-font-weight-subtitle',
  '--qds-font-size-title',
  '--qds-line-height-title',
  '--qds-font-weight-title',
  '--qds-font-size-title-large',
  '--qds-line-height-title-large',
  '--qds-font-weight-title-large',
  '--qds-font-size-display',
  '--qds-line-height-display',
  '--qds-font-weight-display',
  '--qds-font-size-h1',
  '--qds-line-height-h1',
  '--qds-font-weight-h1',
  '--qds-font-size-h2',
  '--qds-line-height-h2',
  '--qds-font-weight-h2',
  '--qds-font-size-h3',
  '--qds-line-height-h3',
  '--qds-font-weight-h3',
  '--qds-font-size-h4',
  '--qds-line-height-h4',
  '--qds-font-weight-h4',
  '--qds-font-size-h5',
  '--qds-line-height-h5',
  '--qds-font-weight-h5',
  '--qds-font-size-h6',
  '--qds-line-height-h6',
  '--qds-font-weight-h6',
  '--qds-font-size-subtitle1',
  '--qds-line-height-subtitle1',
  '--qds-font-weight-subtitle1',
  '--qds-font-size-subtitle2',
  '--qds-line-height-subtitle2',
  '--qds-font-weight-subtitle2',
  '--qds-font-size-body1',
  '--qds-line-height-body1',
  '--qds-font-weight-body1',
  '--qds-font-size-body2',
  '--qds-line-height-body2',
  '--qds-font-weight-body2',
  '--qds-font-size-overline',
  '--qds-line-height-overline',
  '--qds-font-weight-overline',
  '--qds-letter-spacing-display',
  '--qds-letter-spacing-h1',
  '--qds-letter-spacing-h2',
  '--qds-letter-spacing-h3',
  '--qds-letter-spacing-overline',

  // ── Elevation roles ─────────────────────────────────────────────────
  '--qds-elevation-card',
  '--qds-elevation-flyout',
  '--qds-elevation-dialog',
] as const

/** A public CSS custom-property name in the `--qds-*` contract. */
export type QdsToken = (typeof QDS_TOKENS)[number]

/** A partial override map keyed by public token name. */
export type QdsTokenMap = Partial<Record<QdsToken, string>>
