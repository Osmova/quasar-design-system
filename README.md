# Quasar Design System

Opinionated Quasar 2 design system inspired by Microsoft Fluent 2, Apple's Human Interface Guidelines, and Samsung One UI.

Published under the personal scope `@bastvi/quasar-design-system` while the visual language is still evolving. It contains only generic visual language — no business logic, models, or app-specific assumptions.

[Live gallery](https://qds.osmova.com/) · [Component catalog](https://qds.osmova.com/histoire/)

## Goals

- Provide a full Quasar 2 visual layer: tokens, surfaces, shape, motion, typography, and component overrides.
- Keep functional libraries (components, features, models, entities, helpers, composables) separate from the visual language.
- Let apps opt into the design system explicitly instead of forcing every consumer into one visual language.
- Support multiple close variants of the same design language without pretending to be strict Fluent UI compliance.

## Design Direction

The default language is Microsoft Fluent 2-inspired and neutral-first: colour marks the primary action and status, everything else is a calm grey. Apple and One UI contribute softer corners, grouped inset rows, and touch comfort.

- neutral grey surfaces and text, a Fluent blue brand for the primary CTA, charcoal secondary, marigold accent
- compact 24/32/40px controls with quiet 1px strokes and subtle state layers
- label-above fields
- Windows 11 geometry: 4px control and 8px card/dialog radii (variants keep their own); cards are flat layers with a hairline stroke
- a clear 2px brand focus stroke
- adaptive light/dark/system mode
- deliberate variant overlays (see Variants), not separate brands

## Install

```bash
pnpm add @bastvi/quasar-design-system
```

> **Built TS + source SCSS.** TypeScript runtime entrypoints ship pre-compiled as ESM
> JS with `.d.ts` declarations in `dist/`. SCSS and font exports remain in raw `src/`
> so your build pipeline can consume and customize them. Import the design-system CSS
> **after** Quasar's own CSS. Git/source installs run the package `prepare` script to
> generate `dist/`; npm releases already include the built files.

## Basic Usage

Import Quasar's own CSS first, then the design-system CSS:

```ts
import 'quasar/src/css/index.sass'
import '@bastvi/quasar-design-system/css'
```

The default `./css` bundle is **unlayered** and must be imported **after** Quasar's CSS — Quasar ships unlayered CSS, so the overrides win on cascade order plus specificity, not on `@layer`. If your app deliberately places Quasar's CSS in a lower `@layer`, use the advanced `@bastvi/quasar-design-system/css/layered` bundle instead. Mixing the layered bundle with unlayered Quasar CSS is unsupported (a layer cannot beat unlayered rules).

For the layered path, declare the order **before** importing either framework or skin. Normal rules prefer the later `qds` layer; important rules reverse that order, so the same QDS important declarations live in the earliest `qds-important` layer:

```css
/* quasar-layered.css */
@layer qds-important, quasar, qds;
@import 'quasar/dist/quasar.css' layer(quasar);
```

```ts
import './quasar-layered.css'
import '@bastvi/quasar-design-system/css/layered'
```

Choose one adoption path; do not combine the default and layered exports in the same Sass compilation. Inline author important declarations still win over stylesheet declarations.

For a deeper Quasar integration, use the package Sass variable bridge from your app-level `quasar.variables.scss`:

```scss
@use '@bastvi/quasar-design-system/quasar-variables' as *;
```

This is the first styling layer: it overrides Quasar Sass defaults where Quasar exposes variables. The runtime CSS then defines design tokens, and direct component selectors are only used for behavior or polish that Quasar variables cannot express.

Configure the runtime theme controller during app startup:

```ts
import { configureDesignSystem } from '@bastvi/quasar-design-system'

configureDesignSystem(app, {
  mode: 'system',
  variant: 'fluent',
  persist: true,
})
```

Add `qds-ui` to the body automatically through `configureDesignSystem()`. The class scopes the stronger Quasar overrides.

## Optional Modules

Optional modules stay out of the default runtime and CSS bundle. Install their native peer explicitly, import the native CSS first, then import the QDS extension stylesheet.

### QWindow

`QdsWindow` wraps `@quasar/quasar-ui-qwindow` with QDS BEM chrome (`.qds-window`, `.qds-window__*`, `.qds-window--*`) while passing QWindow props, slots, methods, and events through to the native component.

```bash
pnpm add @quasar/quasar-ui-qwindow @bastvi/quasar-design-system
```

```ts
import '@quasar/quasar-ui-qwindow/index.css'
import '@bastvi/quasar-design-system/css/extensions/qwindow'
import { QdsWindow } from '@bastvi/quasar-design-system/qwindow'
```

For layered Quasar setups, use `@bastvi/quasar-design-system/css/extensions/qwindow/layered` instead. Do not import either QWindow stylesheet unless the native QWindow peer is installed and used.

When using that layered extension, also import the native QWindow stylesheet into `layer(quasar)` in the CSS file above, rather than importing it unlayered. Consumer `titlebarStyle`, colors, and other authored paint are preserved. Consumers own text and focus contrast on arbitrary authored backgrounds; the library's palette contrast guarantees do not extend to arbitrary color combinations.

> **Native QWindow minimize caveat:** `@quasar/quasar-ui-qwindow@3.0.0` exposes a `minimize` action/method, but that native action currently throws in its internal state guard. `QdsWindow` therefore treats `minimized` as a consumer-controlled visual state and filters `minimize` out of the native action list. Use your application state layer, such as a taskbar/window store, to hide and restore minimized windows until the peer fixes this action.

## Buttons, Badges, and Chips

Neutral comes first; add `color` when the control carries meaning.

```vue
<q-btn label="Cancel" />                                     <!-- neutral default: surface fill + 1px stroke -->
<q-btn unelevated color="primary" label="Save" />            <!-- solid: primary CTA -->
<q-btn outline color="primary" label="Edit" />               <!-- outlined -->
<q-btn flat label="More" />                                  <!-- subtle: no fill until hover -->
<q-btn unelevated class="qds-tonal" color="primary" label="Preview" />  <!-- opt-in tonal wash -->
```

| Component | No `color` | With `color` | Opt-in |
| --- | --- | --- | --- |
| `QBtn` | neutral | solid role fill | `.qds-tonal` soft wash |
| `QBadge` | neutral tint | solid role fill | `.qds-tonal` soft wash |
| `QChip` | neutral tint | soft role tint | `.qds-solid` solid fill |

Chips stay soft by default because they usually sit in groups; `.qds-solid` is only meaningful on chips. Buttons sit on the 24/32/40px scale (`size="sm"`, default, `size="lg"`); `dense` uses the 24px step.

## Fields

`QInput`, `QSelect`, and the other `QField` controls place the label **above** a 32px control (24px dense) with a 1px stroke and a 2px brand bar on focus. No markup changes are needed.

Older layouts stay available per field:

- `qds-field--float` — Quasar's floating label inside a 48px control
- `qds-field--stacked-animated` — label animates to the top edge inside the control
- `qds-form--label-start` + `qds-field--start` — labels in a shared side column on wide screens, collapsing to label-above on narrow ones

## Icons

Icons use Phosphor through a Quasar icon-set (no Material Icons):

```ts
import { Quasar } from 'quasar'
import { qdsIconSet } from '@bastvi/quasar-design-system'

app.use(Quasar, { iconSet: qdsIconSet })
```

For content icons, use `@phosphor-icons/vue` (duotone for feature icons, line weight for controls).

## Fonts

Inter (body and display), Open Sans (compatibility/body alternative), and Selawik (an optional display face an app may enable) ship as optional CSS — import what you need:

```ts
import '@bastvi/quasar-design-system/fonts/inter.css'
import '@bastvi/quasar-design-system/fonts/open-sans.css'
import '@bastvi/quasar-design-system/fonts/selawik.css'
```

The display stack follows the body stack (Inter) by default. Selawik is not part of any default stack; to use it for display text, import its CSS and set the token after the QDS CSS:

```css
:root { --qds-font-family-display: 'Selawik', var(--qds-font-family); }
```

The core CSS only declares the font stack, so skipping these still yields a sane system fallback. An accent font token is reserved for future use.

## Materials

Overlays use Windows 11-style acrylic materials: menus, popups, pickers, and notifications use the
regular material; dialogs and the bottom sheet the thick one; tooltips the thin one. The page sits on a Mica backdrop
(`--qds-backdrop`, painted on a fixed `body::before` layer), and the header, drawer, and toolbars use the opaque
`--qds-mica-alt` tint. Cards stay solid; add `qds-material` (or `qds-material--thin` /
`qds-material--thick`) to opt an element into a material.

Materials fall back to solid surfaces without `backdrop-filter` support, under `prefers-reduced-transparency: reduce`,
and in forced-colors mode. The `ink` variant is always solid; `term` keeps acrylic only on menus and opt-in materials;
`one` keeps acrylic menus, tooltips and popups on a flat page (no Mica tint), with solid dialogs and bottom sheets.

Tokens: `--qds-material-{thin,regular,thick}-{bg,blur,filter}`, `--qds-material-saturate`, `--qds-material-stroke`,
`--qds-material-edge`, `--qds-mica-alt`, `--qds-backdrop` (a full `background` value, not a colour).

## Variants

The package is structured around `src/themes/`. For now there is one real theme, `default`, plus small runtime variants layered over it:

- `fluent`: default Fluent 2-inspired direction with a Mica app backdrop, acrylic overlays, solid reading surfaces, and low-border content. Absorbs the legacy Air translucency behavior.
- `ink`: paper-neutral editorial surfaces with charcoal type and coordinated pastel role washes.
- `one`: Samsung One UI-inspired neutral grey or true-black pages, rounded blocks, pill controls, a calm blue accent, and touch-friendly rhythm.
- `term`: opaque amber developer UI on warm cream or near-black panes, with crisp hairline rules, amber fills carrying dark ink, and a monospace-forward feel.
- `shadcn`: opaque New York-inspired native Quasar controls with Neutral (default), Gray, Zinc, Stone, and Slate base palettes, compact 36px regular controls, 8px control radii, and 14px card radii. No Tailwind or Reka dependency is required by the package.

They are not separate brands — deliberate overlays over the same token system.

Choose the variant once at app startup and let the runtime keep the matching body class in sync:

```ts
configureDesignSystem(app, {
  mode: 'system',
  variant: 'ink', // fluent | ink | one | term | shadcn
})
```

Legacy inputs `air`, `glass`, and `studio` resolve to `fluent`; `feather` resolves to `ink`; `mobile` resolves to `one`; `terminal` resolves to `term`. The runtime accepts these legacy names for options, `setVariant` and persisted state, but writes only the canonical body classes; new apps should use the canonical names above.

### Shadcn adoption and compatibility

The new `shadcn` styling requires **Quasar 2.35 or newer**. The package's existing `quasar: ^2.0.0` peer range is unchanged for existing variants; this is not a claim that shadcn is tested on every Quasar 2 release. These changes target the `0.8.0-rc.3` prerelease on `next`; the stable `latest` channel remains on `0.7`.

```ts
import {
  configureDesignSystem, SHADCN_BASE_COLORS,
  type ShadcnBaseColor,
} from '@bastvi/quasar-design-system'

const theme = configureDesignSystem(app, {
  mode: 'system', variant: 'shadcn', shadcnBaseColor: 'zinc', persist: true,
})
const nextPalette: ShadcnBaseColor = 'stone'
theme.setShadcnBaseColor(nextPalette)
// SHADCN_BASE_COLORS contains typed { name, label } entries for palette pickers.
// theme.shadcnBaseColor.value and theme.state.shadcnBaseColor expose the selection.
```

Mode, variant, and `shadcnBaseColor` persist together under the existing storage key (`bastvi.quasar-design-system.theme` by default). A valid stored palette wins over configuration; an older stored record without that field keeps the configured palette, or Neutral. Invalid JavaScript/storage palette values normalize to Neutral. Switching to another variant retains the palette selection but removes `data-qds-shadcn-base-color`; returning to shadcn restores it. `destroy()` removes owned attributes/classes and the system-theme listener. The controller can be created without a DOM for SSR; select deterministic server markup and initialize on the client to apply system preference and persistence.

Use the default **body target** for Quasar's teleported dialogs, menus, tooltips, notifications, and loading plugins. A custom `target` scopes descendant controls only: portals mounted elsewhere do not inherit it, and body typography/backdrop rules are not relocated to that subtree. Supported visual scoping is a single body root or an isolated custom root; sibling roots can be themed independently when their scopes do not overlap. Put the variant, palette, and mode on the **same element**.

**Known limitation — nested theme roots:** arbitrary independently themed roots nested inside another theme root are not supported as nearest-palette boundaries for component grammar or local-dark paint. For example, a native local-dark card inside an inner Neutral root can still take the outer Slate palette. Use non-overlapping isolated render roots or separate documents/iframes when independently themed component trees need isolation; do not rely on a nested palette attribute to reset all component styling.

Within a supported single body or isolated custom root, local dark classes emitted by supported native components rebind the palette; explicit light styling is supported only when an observable native light marker exists. A `dark=false` prop with no distinguishing DOM marker cannot be inferred by CSS.

CSS-only usage needs no controller:

```html
<body class="qds-ui qds-variant-shadcn qds-theme-light"
      data-qds-shadcn-base-color="neutral">
```

Use `qds-theme-dark` for dark mode, or a consistent `data-qds-resolved="light|dark"`; an explicit resolved light value takes precedence over stale dark classes. Within a supported body or isolated root, missing/invalid palette attributes use Neutral. CSS-only mode does not synchronize Quasar's Dark plugin, follow system preference, or persist choices: those remain the consumer's responsibility.

Keep QDS after Quasar for the default export. For the layered export, layer Quasar deliberately; **important declarations reverse layer order**, so audit consumer important overrides separately from normal declarations. The theme already bridges the seven Quasar role variables (`--q-primary`, `--q-secondary`, `--q-accent`, `--q-positive`, `--q-negative`, `--q-warning`, `--q-info`) within shadcn and local scheme boundaries; it does not mutate global Quasar colors or `--q-dark`. Unlayered consumer overrides after QDS are supported. Primitive overrides inside a component must also rebind the semantic aliases that consume them, because inherited custom properties can already be resolved at their parent scope.

Unlike Fluent, an ordinary uncolored filled shadcn button is a primary action; contextual picker, pagination, toggle, and editor controls retain their native grammar. Flat, outline, push, dense, rounded/square, loading, literal palette colors, and explicit sizes remain distinct. Semantic solid fills own their on-fill foreground even with `text-color="white"` or normal inline text color; inline **important** author color wins. Literal combinations such as `color="red-7" text-color="white"` stay native. Use `.qds-tonal` for a soft button/badge and `.qds-solid` for a solid chip. `.qds-button--link` supplies a link-like visual treatment but does not change button semantics. Shadcn fields use perimeter strokes/focus halos rather than Fluent's focus bar, and surfaces remain opaque rather than acrylic.

### Reference provenance

Shadcn values and geometry reference the MIT-licensed [unovue/shadcn-vue](https://github.com/unovue/shadcn-vue/tree/b251d9fd92aa496495e127137a7734704fb34a29), commit `b251d9fd92aa496495e127137a7734704fb34a29`, New York v4 registry. Neutral/Stone/Zinc come from `apps/v4/registry/themes.ts`; Gray/Slate use the same commit's official legacy HSL theme files, not invented modern OKLCH profiles. Missing legacy sidebar slots are explicit same-palette aliases. Text, focus, and role hover/pressed colors are minimally calibrated for contrast after sRGB quantization rather than silently reproducing unreadable upstream pairs. Inter and Phosphor remain the package's font/icon direction; the isolated reference normalizes these and is not a Lucide-silhouette or strict pixel-match oracle. The shipped [shadcn adaptation notice](src/tokens/SHADCN-NOTICE.md) includes the upstream copyright and complete MIT license. The development-only reference retains its own vendored license and integrity manifest and is excluded from the published package.

## Component Coverage

QDS skins visible Quasar chrome — buttons, cards, inputs, toolbars, drawers, lists, expansion items, and similar surfaces that carry tokenized visual treatment. The release gallery and Histoire catalog exercise the high-value sub-elements across forms/pickers, data/navigation/layout, media/complex/loading, and overlays/plugins.

Public QDS-owned component classes use strict namespaced BEM for new optional modules: block `.qds-window`, elements such as `.qds-window__titlebar`, and modifiers such as `.qds-window--embedded`. Utility hooks such as `.qds-ui`, `.qds-tonal`, `.qds-solid`, and variant classes remain intentionally semantic rather than component blocks.

It intentionally does **not** add CSS for behavior-only, SSR, observer, or composable surfaces. These inherit Quasar's own defaults or have no visual representation at all:

- **SSR/layout helpers:** `QNoSSR`, `QResponsive`, `QSpace`, `QSlideTransition`
- **Observer helpers:** `QIntersection`, `QResizeObserver`, `QScrollObserver`
- **Icon component:** `QIcon` itself is not separately skinned — QDS provides the Phosphor `qdsIconSet` and font guidance instead
- **Nonvisual plugins:** AddressbarColor, AppFullscreen, AppVisibility, Cookies, Dark, Meta, Local/Session Storage
- **Behavior directives:** `v-close-popup`, `v-intersection`, `v-mutation`, `v-morph`, `v-scroll`, `v-scroll-fire`, `v-touch-*`; Material Ripple is intentionally suppressed in QDS surfaces
- **Composables and utilities:** no CSS added unless visual behavior is directly affected

Layout helpers that carry visible chrome (header, footer, toolbar, sticky child controls) are covered through the gallery examples and visual tests; scroll/position observers remain behavior-only unless an app adds visible child controls.

Some interaction-heavy Quasar states are intentionally documented/manual rather than automated in the visual gate because they depend on teleported overlays, gestures, or scroll thresholds: QPopupEdit popup interaction, QPageScroller activation, QSlideItem and QPullToRefresh gestures, and QInfiniteScroll scroll-triggered loading. Static skins and common visible states remain covered.

## Gallery

Live: **https://qds.osmova.com** · run locally with `pnpm gallery:dev` (build with `pnpm gallery:build`).
