// T189 replaced whole-bundle equality with immutable historical characterization
// plus an enumerated list of reviewed changes. The frozen baseline hashes are
// never regenerated; each entry below is applied to the baseline text so the
// rest of it must still match verbatim, and an unlisted change still fails.

// F01: the on-fill label no longer dilutes into the fill it sits on. Only Fluent
// reads this emission; every other profile re-declares 100% right after it.
const ON_FILL = ['--qds-text-on-fill-pressed-mix: 90%', '--qds-text-on-fill-pressed-mix: 100%']

// F02: the field clear/password action carries Quasar's no-outline utility, so
// its focus ring needs the same importance channel QBtn already uses. The
// unlayered bundle keeps the declaration inline; the layered bundle routes it
// into the earliest `qds-important` layer, which leaves the original rule
// holding only its offset and adds one rule matched by ADDED_IMPORTANT_RULE.
const FOCUS_RING = /(\.q-field__focusable-action:focus-visible\{)outline:var\(--qds-focus-ring-width\) solid var\(--qds-stroke-focus\);(outline-offset:)/g

// S01: the shadcn switch follows the v4 Switch (input track, primary when on, scheme-aware thumb).
const S = '.qds-variant-shadcn:is(.qds-ui,.qds-ui *) .q-toggle'
const SWITCH_BEFORE = [
  `${S} .q-toggle__track{border-color:var(--qds-control-stroke-strong);background:var(--qds-control-fill-hover)}`,
  `${S} .q-toggle__thumb::after{background:var(--qds-bg-canvas);box-shadow:var(--qds-shadow-sm)}`,
  `${S} .q-toggle__inner--indet{color:var(--qds-color-primary)}`,
  `${S} .q-toggle__inner--indet .q-toggle__track{background:currentColor;border-color:currentColor}`,
  `${S} .q-toggle__inner--indet .q-toggle__thumb::after{background:var(--qds-selection-on, var(--qds-text-on-primary))}`,
  `${S} :is(.q-toggle__inner--truthy,.q-toggle__inner--indet) .q-toggle__track{border-color:var(--qds-control-stroke-strong)}`,
].join('')
const SWITCH_AFTER = [
  `${S} .q-toggle__track{border-color:rgba(0,0,0,0);background:var(--qds-shadcn-input)}`,
  `${S}:not(.disabled):hover .q-toggle__inner--falsy .q-toggle__track{border-color:rgba(0,0,0,0)}`,
  `${S} .q-toggle__thumb::after{background:var(--qds-bg-canvas);box-shadow:none}`,
  `${S} .q-toggle__inner--falsy .q-toggle__thumb::after{box-shadow:0 0 0 1px var(--qds-text-muted)}`,
  `${S} .q-toggle__inner--indet{color:var(--qds-color-primary)}`,
  `${S} :is(.q-toggle__inner--truthy,.q-toggle__inner--indet) .q-toggle__track{background:currentColor;border-color:rgba(0,0,0,0)}`,
  `${S} :is(.q-toggle__inner--truthy,.q-toggle__inner--indet) .q-toggle__thumb::after{background:var(--qds-selection-on, var(--qds-text-on-primary))}`,
].join('')
const SWITCH_FOCUS = '.qds-variant-shadcn:is(.qds-ui,.qds-ui *) :is(.q-checkbox,.q-radio,.q-toggle):focus-visible :is(.q-checkbox__inner,.q-radio__inner,.q-toggle__inner){box-shadow:var(--qds-field-focus-halo);outline-width:var(--qds-border-width-control)}'
const SWITCH_SCHEME = `@supports(color: light-dark(#000, #fff)){${S} .q-toggle__track{background:light-dark(var(--qds-shadcn-input), color-mix(in srgb, var(--qds-shadcn-input) 80%, transparent))}${S} .q-toggle__inner--falsy .q-toggle__thumb::after{background:light-dark(var(--qds-shadcn-background), var(--qds-shadcn-foreground));box-shadow:0 0 0 1px light-dark(var(--qds-text-muted), transparent)}}`

export function applyDeclaredShadcnChanges(css) {
  if (!css.includes(SWITCH_BEFORE) || !css.includes(SWITCH_FOCUS)) throw new Error('S01: shadcn switch baseline rules not found')
  return css.replace(SWITCH_BEFORE, SWITCH_AFTER).replace(SWITCH_FOCUS, `${SWITCH_FOCUS}${SWITCH_SCHEME}`)
}

export const ADDED_IMPORTANT_RULE = /^@layer qds-important\|[^|]*\.q-field__focusable-action:focus-visible\{outline:[^}]*!important\}$/

export function applyDeclaredFluentChanges(css, { layered = false } = {}) {
  const text = css.replaceAll(ON_FILL[0], ON_FILL[1])
  return layered
    ? text.replace(FOCUS_RING, '$1$2')
    : text.replace(FOCUS_RING, '$1outline:var(--qds-focus-ring-width) solid var(--qds-stroke-focus) !important;$2')
}

// The inverse of F01, for gates that hash the historical text rather than
// compare it. Each emitting block declares the base value once and a profile
// may re-declare it after, so only the first occurrence per block is historical.
export function revertDeclaredFluentChanges(css) {
  return css.split('}').map(block => block.replace(ON_FILL[1], ON_FILL[0])).join('}')
}
