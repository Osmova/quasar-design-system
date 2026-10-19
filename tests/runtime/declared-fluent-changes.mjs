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
