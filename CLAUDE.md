# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`@osmova/quasar-design-system` — an opinionated **visual layer** for Quasar 2. Microsoft Fluent 2 is the
primary direction, now with tonal/acrylic defaults; the `ink` variant is the paper-neutral editorial
surface with charcoal type and pastel role washes, and the `one` variant references Samsung One UI
(neutral grey or true-black pages, rounded blocks, pill controls, a calm blue accent). It provides design tokens, surfaces, shape, motion, typography,
Quasar component overrides, and a runtime light/dark/system + variant controller.
The fifth variant, `shadcn`, provides opaque New York-inspired native Quasar styling with
Neutral/Gray/Zinc/Stone/Slate palettes. It requires Quasar >=2.35; the existing ^2.0.0 peer range
remains for existing variants. No mandatory Tailwind/Reka dependency is introduced.

It is a pure visual product: **no business logic, no entity/model layer, no API/transport code, no
permissions, no app routes, no private endpoints.** Prefer semantic token names over app-specific
selectors. Anything that is not generic, reusable visual language does not belong here.

## Commands

- `pnpm typecheck` — `vue-tsc --noEmit` against `tsconfig.json`; run it
  after changing any `.ts`/`.vue`.
- `pnpm gallery:dev` — run the example gallery (`examples/gallery`, a Quasar SPA that consumes the package).
- `pnpm gallery:build` — build the static gallery.
- `pnpm gallery:test` — Playwright visual gate (the release gate; keep it green).
- `pnpm test:runtime` — mandatory Node SSR/controller, independent color, and browser-cascade checks.
- `pnpm css:budget` — finite source and Sass-compressed/gzip-9 budgets, both main exports and separate optional extensions.
- `pnpm verify:publish` — budget, build, typecheck, runtime checks, and pack dry-run; never skip runtime checks.
- `pnpm shadcn-reference:check` / `pnpm shadcn-reference:build` — isolated pinned upstream reference.
- `pnpm gallery:shadcn-reference:test` — dedicated two-origin comparison config; add `QDS_SCREENS=1` only in the matching pinned Playwright image for screenshot pairs.

The package publishes built TypeScript runtime entrypoints in `dist/` (`main` and `types` in
`package.json` point at compiled ESM and `.d.ts` files), while SCSS and font exports remain source-first
from `src/`. Run `pnpm build` after changing exported `.ts` files so the gallery and package exports use
fresh compiled runtime code. Validate visual work via `typecheck` + visual review in the gallery.

## Architecture

### Three styling layers (apply in this order of preference)

1. **Quasar Sass variable overrides** — `src/quasar.variables.scss`. Consumed from the app's own
   `quasar.variables.scss` via `@use '@osmova/quasar-design-system/quasar-variables' as *`. Always
   override a Quasar variable here *before* reaching for a direct component selector.
2. **Design tokens as CSS custom properties** — `--qds-*` vars defined in `src/themes/default.scss`,
   sourced from Sass maps in `src/tokens/_default.scss` (`$palette`, `$palette-rgb`, surfaces, text,
   borders, `$space`, `$radius`, `$font`, motion, state opacities, focus ring). This is the single
   source of truth for design values — never hardcode a second copy of a brand value.
3. **Direct component selectors** — `src/css/components/_*.scss`, only for behavior/polish Quasar
   variables can't express. These must be scoped under `.qds-ui` and consume `var(--qds-*)` tokens.

### CSS cascade (the important gotcha)

Design **tokens** are emitted in `@layer qds.tokens`, but the Quasar **component overrides are emitted
UNLAYERED** in the default `./css` bundle. Quasar ships unlayered CSS, and unlayered always beats any
`@layer` regardless of specificity — so layering the overrides would lose. They instead win via
`.qds-ui` scoping + specificity, which **requires consumers to import the
QDS CSS *after* Quasar's own CSS**. An optional `./css/layered` export wraps everything in layers for
apps that deliberately layer Quasar. Consumers must first declare `@layer qds-important, quasar, qds;`
and import native Quasar (and optional native QWindow) CSS into `layer(quasar)`. The layered exports
configure `css/importance` to route the same important declarations into the earliest top-level
`qds-important` layer; normal overrides remain in the later `qds` sublayers. The default export stays
unlayered. Do not combine both adoption paths within one Sass compilation.
Important declarations reverse layer order. The variables-only shadcn helper already emits the seven
Quasar role bridges unlayered; do not duplicate them in component/base styles or mutate global colors.
Consumer primitive overrides must rebind dependent aliases at the same element when inheritance has
already resolved them. Literal Quasar palette utilities remain native; semantic solid fills own their
on-fill foreground over text utilities/normal inline color, while author inline important color wins.
Arbitrary consumer titlebar/background paint remains author-owned, including its text/focus contrast;
do not silently recolor it or extend library-palette guarantees to arbitrary authored combinations.

### CSS entry point

`src/css/index.scss` (the `./css` export) `@use`s `themes/fallbacks` (a guaranteed base layer defining
every public `--qds-*` once) then `themes/default`, then `@include`s each override partial's
top-level (unlayered) `@mixin styles`. Adding a component override = create
`src/css/components/_name.scss` exposing `@mixin styles` (scoped to `.qds-ui`, consuming `var(--qds-*)`)
and `@include` it in `index.scss` (and the layered entry).

### Runtime theme controller — `src/runtime/theme.ts`

`configureDesignSystem(app, options)` is the app entry point. It provides a reactive
`DesignSystemController` (also via `useDesignSystem()` / `getDesignSystemController()`), and:

- Resolves `mode` (`light | dark | system`) against `prefers-color-scheme`, mirrors it onto Quasar's
  `$q.dark`, and writes `data-qds-mode` / `data-qds-resolved` / `data-qds-variant` plus the
  `qds-theme-light|dark` and `.qds-ui` classes onto the target (default `document.body`).
- `.qds-ui` is the scoping class the stronger overrides depend on — it is added here, not by hand.
- Applies the `variant` as a body class (`qds-variant-fluent|ink|one|term|shadcn`; legacy `air`/`glass`/`studio` normalize to `fluent`; legacy `feather` normalizes to `ink`; legacy `mobile`/`terminal` normalize to `one`/`term`).
- Exposes `shadcnBaseColor` in options/state/computed refs and `setShadcnBaseColor()`; exports
  `SHADCN_BASE_COLORS` and `ShadcnBaseColor`. Invalid palettes normalize to Neutral. Selection survives
  other variants, while the active palette attribute exists only on shadcn.
- Persists `{ mode, variant, shadcnBaseColor }` to `localStorage` and listens to system theme changes. Defaults live
  in `DEFAULT_DESIGN_SYSTEM_OPTIONS`.
- Valid stored palettes win; older records without a palette preserve configuration. No-DOM SSR and
  teardown are mandatory checks. Body target covers portals/plugins; custom targets cover descendants
  only. CSS-only markup keeps variant/palette/mode on one element and owns persistence/system syncing.
- Supported scoping is a single body or isolated custom root, with non-overlapping sibling roots.
  Arbitrary nested independently themed roots do not guarantee nearest-palette component grammar or
  local-dark paint: an inner Neutral local-dark card can retain an outer Slate palette. Require isolated
  render roots or separate documents/iframes for independent component trees; do not promise nested resets.
- Within a supported body or isolated custom root, native local-dark surfaces rebind the complete palette.
  Explicit light support requires an observable
  DOM marker; a markerless `dark=false` cannot be inferred. Body typography stays body-scoped.

### Themes vs variants — `src/themes/index.ts`

There is **one theme** (`default`). "Variants" (`fluent`, `ink`, `one`, `term`, `shadcn`) are mood shifts
expressed purely as CSS classes (`DESIGN_SYSTEM_VARIANTS[*].cssClass`) over the same token system —
not separate brands. Legacy inputs `air`/`glass`/`studio` normalize to `fluent`; `feather` normalizes
to `ink`. New themes start as variables-only files: `src/themes/{name}.scss` for CSS
vars/classes + registration metadata in `src/themes/index.ts`. Keep `src/themes/` free of component
selectors — themes define values, the implementation reads them through `var(--qds-*)`.
Shadcn's pinned MIT source is unovue/shadcn-vue `b251d9fd92aa496495e127137a7734704fb34a29`:
modern Neutral/Stone/Zinc, official legacy HSL Gray/Slate, with documented sidebar aliases and
contrast calibration. Reference tooling/dependencies remain private to the isolated example.
The shipped `src/tokens/SHADCN-NOTICE.md` carries the upstream copyright and full MIT permission
notice for the adaptation; the development-only reference application is excluded from the package.

### Public API surface

`src/index.ts` re-exports the runtime controller, theme metadata/types, `QDS_TOKENS` (+ token types),
and `qdsIconSet`. `package.json#exports` exposes `.`, `./css`, `./css/layered`, `./quasar-variables`,
`./runtime`, `./tokens`, `./tokens/default`, `./themes`, `./themes/default`, `./themes/fallbacks`,
`./fonts/*`, and `./icons/quasar-icon-set`. Update both when changing the public surface.

## Conventions

- All tokens and classes are namespaced `qds-` / `--qds-*`. Keep new ones semantic, not app-specific.
- Themes are variables-only. Component styling lives in `src/css/`, never in `src/themes/`.
- UnoCSS is allowed only as an *optional* preset; the plain SCSS/CSS path must always work so any
  Quasar 2 app can adopt the package without changing its build.
