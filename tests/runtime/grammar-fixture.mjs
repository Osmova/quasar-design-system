import { compileString } from 'sass'
import { fileURLToPath } from 'node:url'

export const root = new URL('../../', import.meta.url)
export const families = ['button', 'field', 'tabs', 'menu']
const imports = families.map((name) => `@use 'src/css/components/${name}';`).join('\n')

// A deliberately utilitarian test specimen, NOT a proposed Ink/Folio/Apple design.
// These values and every visual recipe are test-owned, with no production tokens.
const grammar = `
@mixin pilot-button {
  .qds-grammar-pilot .q-btn { min-height: 46px; padding: 0 18px; border: 2px solid var(--qds-pilot-accent); border-radius: 0; background: var(--qds-pilot-paper); color: var(--qds-pilot-ink); font: 600 16px/1.4 monospace; text-transform: none; box-shadow: none; }
  .qds-grammar-pilot .q-btn::before { content: none; }
  .qds-grammar-pilot .q-btn .q-focus-helper { display: none; }
  .qds-grammar-pilot .q-btn:focus-visible { outline: 3px dashed var(--qds-pilot-accent) !important; outline-offset: 4px; }
  .qds-grammar-pilot .q-btn:not(.disabled):hover { background: var(--qds-pilot-hover); }
  .qds-grammar-pilot .q-btn:not(.disabled):active { background: var(--qds-pilot-accent); color: white; }
  .qds-grammar-pilot .q-btn.disabled { opacity: .45 !important; }
  .qds-grammar-pilot .q-btn__content { gap: 10px; font-size: 16px; }
  .qds-grammar-pilot .q-btn__content > .q-icon { font-size: 18px; margin: 0; }
  .qds-grammar-pilot .q-btn .q-spinner { width: 20px; height: 20px; }
  .qds-grammar-pilot .q-btn-dropdown__arrow { margin-left: 10px; font-size: 18px; }
}
@mixin pilot-field {
  .qds-grammar-pilot .q-field { padding-top: 0; color: var(--qds-pilot-ink); font: 16px/24px monospace; }
  .qds-grammar-pilot .q-field__control { height: 64px; min-height: 64px; padding: 0 12px; border: 2px solid var(--qds-pilot-accent); border-radius: 0; background: var(--qds-pilot-paper); color: var(--qds-pilot-accent); }
  .qds-grammar-pilot .q-field__control::before { content: none; }
  .qds-grammar-pilot .q-field__control::after { content: ''; position: absolute; inset: -6px; border: 2px dashed transparent; border-radius: 0; transform: none; pointer-events: none; }
  .qds-grammar-pilot .q-field--focused .q-field__control::after { border-color: var(--qds-pilot-accent); }
  .qds-grammar-pilot .q-field__control-container { padding-top: 0; }
  .qds-grammar-pilot .q-field__label { top: 6px; left: 0; transform: none; font: 12px/16px monospace; color: var(--qds-pilot-ink); }
  .qds-grammar-pilot .q-field__native { padding: 22px 0 4px; min-height: 0; font: inherit; color: var(--qds-pilot-ink); }
  .qds-grammar-pilot .q-field__marginal { height: 60px; color: var(--qds-pilot-accent); font-size: 20px; }
  .qds-grammar-pilot .q-field__bottom { padding: 8px 0 0; font: 12px/16px monospace; color: var(--qds-pilot-ink); }
  .qds-grammar-pilot .q-field__counter { font-variant-numeric: tabular-nums; }
  .qds-grammar-pilot .q-field__focusable-action { opacity: 1; }
  .qds-grammar-pilot .q-field--error .q-field__control { border-color: var(--qds-pilot-error); }
  .qds-grammar-pilot .q-field--error .q-field__bottom { color: var(--qds-pilot-error); }
  .qds-grammar-pilot .q-field--readonly .q-field__control { border-style: dotted; }
  .qds-grammar-pilot .q-field--disabled .q-field__control { background: var(--qds-pilot-hover); }
}
@mixin pilot-tabs {
  .qds-grammar-pilot .q-tabs { color: var(--qds-pilot-ink); }
  .qds-grammar-pilot .q-tab { min-height: 50px; padding: 0 20px; border-radius: 0; opacity: 1; color: var(--qds-pilot-ink); }
  .qds-grammar-pilot .q-tab__label { font: 14px/20px monospace; text-transform: none; }
  .qds-grammar-pilot .q-tab--active { background: var(--qds-pilot-hover); }
  .qds-grammar-pilot .q-tab .q-focus-helper { display: none; }
  .qds-grammar-pilot .q-tab:focus-visible { outline: 2px dashed var(--qds-pilot-accent); outline-offset: -4px; }
  .qds-grammar-pilot .q-tab__indicator { width: 6px; height: 6px; left: calc(50% - 3px); right: auto; bottom: 4px; background: var(--qds-pilot-accent); border-radius: 50%; }
  .qds-grammar-pilot .q-tabs--vertical .q-tab__indicator { top: calc(50% - 3px); bottom: auto; left: auto; right: 6px; }
  .qds-grammar-pilot .q-tabs__arrow { width: 24px; font-size: 20px; color: var(--qds-pilot-accent); background: var(--qds-pilot-paper); text-shadow: none; }
}
@mixin pilot-menu {
  // Portals are outside both isolated roots: their profile is explicit on QMenu.
  .q-menu.qds-pilot-portal { min-width: 224px; padding: 6px; border: 2px dashed var(--qds-pilot-accent); border-radius: 0; color: var(--qds-pilot-ink); background: var(--qds-pilot-paper); box-shadow: none; }
  .q-menu.qds-pilot-portal .q-list { padding: 0; }
  .q-menu.qds-pilot-portal .q-item { min-height: 38px; padding: 6px 10px; border-radius: 0; font: 14px/20px monospace; }
  .q-menu.qds-pilot-portal .q-item:not(.disabled):is(:hover, :focus-visible, .q-item--active) { background: var(--qds-pilot-hover); }
  .q-menu.qds-pilot-portal .q-focus-helper { display: none; }
  .q-menu.qds-pilot-portal .q-separator { height: 2px; margin: 6px 0; background: var(--qds-pilot-accent); }
}
.qds-grammar-pilot, .qds-pilot-portal { --qds-pilot-paper: #fff8e7; --qds-pilot-ink: #182a2a; --qds-pilot-accent: #005a58; --qds-pilot-hover: #d3eee5; --qds-pilot-error: #a01928; }
`

export function compilePilot({ compatibility = false, removed = false, leak = null, omit = null } = {}) {
  // "removed" cannot load any of the four old grammar modules at all. This is
  // stronger than emitting them and hiding their selectors behind a later reset.
  const prelude = removed ? "@use 'src/css/components/variants/mechanics';" : imports
  const source = `@use 'src/themes/default';\n${prelude}\n${grammar}\n${families.filter((name) => name !== omit).map((name) => removed
    ? `@include mechanics.${name}; @include pilot-${name};`
    : `@include ${name}.styles(independent) { @include pilot-${name}; }`).join('\n')}
    ${compatibility ? `.qds-compatibility-host { ${families.map((name) => `@include ${name}.styles;`).join('\n')} }` : ''}
    ${leak ? `@include ${leak}.compatibility-styles;` : ''}`
  return compileString(source, { loadPaths: [fileURLToPath(root)], style: 'compressed', silenceDeprecations: ['if-function'] }).css
}

export function compileMechanics() {
  return compileString(`@use 'src/css/components/variants/mechanics'; ${families.map((name) => `@include mechanics.${name};`).join(' ')}`,
    { loadPaths: [fileURLToPath(root)], style: 'compressed' }).css
}
