# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added

- **Fields**: a Windows 11 (WinUI 3) finish, with a layer fill, an elevation border and a strong bottom stroke.
  On focus the field switches to the input-active fill and shows the accent bar. Fields have no halo by default.
  Quasar `color`, forced colours and reduced motion are respected.
- Field anatomy:
  - A required mark on labels of `required` / `aria-required` controls, or with `.qds-field--required`.
  - `.qds-field__hint` for the QInput `#label` slot.
  - A `.qds-form-field` wrapper for any control: header, label, hint, description, help and error, with
    `--required` and `--horizontal` modifiers.
- Field variants: `.qds-field--ghost` and the `.qds-field--positive` / `--warning` validation tints.
- Form compositions:
  - `.qds-field-group` joins inputs, selects and buttons.
  - `kbd` / `.qds-kbd` keycaps.
  - `.qds-field--stepper` number fields.
  - `.qds-field--dropzone` file tiles.
  - `.qds-pin` code rows.
  - `.qds-option-group--card` option tiles.
- Settings cards: `.qds-settings-group` / `.qds-settings-card` rows with icon, header, description and action,
  plus an expander variant on `QExpansionItem`.
- App compositions:
  - `.qds-menu-row` rich menu items with `__icon`, `__title`, `__caption` and `__description`; multi-line rows
    align to the title line.
  - `.qds-subpage-tabs`: left-aligned 36px underline tabs over a hairline divider, with padded panels below.
  - `.qds-table-segmented`: a 24px `QBtnToggle` inside a 32px dense table row.
  - `.qds-tile-grid` / `.qds-tile` dashboard tiles with `__icon`, `__label`, `__value`, `__meta` and a `__spark`
    sparkline; `--alert` / `--warning` / `--positive` tint the icon, meta and sparkline and add a tone ring that
    stays visible in cards, Ink and forced colours.
  - `.qds-sr-only` visually hidden text.
  - Tokens `--qds-tile-min-width` (9rem) and `--qds-tile-spark-height` (2rem).
- Gallery: a new **Forms** tab covering:
  - anatomy, variants × sizes and states;
  - compositions;
  - Store-style category pills;
  - a Windows 11 Settings-style page.
- Gallery: a new **Apps** tab with consumer-app compositions on the Mica backdrop:
  - a split button with rich menu rows;
  - an expanded and mini NavigationView with nested destinations;
  - a four-tab settings subpage;
  - a dense table with segmented controls and expandable incident rows;
  - Dashboard, List-detail and Dialog flow screens with a responsive tile grid.

### Changed

- **Windows 11 control layer**: new tokens `--qds-control-fill-input-active`,
  `--qds-control-stroke-default|secondary|strong|top|bottom|on-accent-top|on-accent-bottom`, `--qds-card-fill`,
  `--qds-card-stroke` and `--qds-control-halo`. `--qds-control-fill-*` are now translucent layer values instead of
  aliases of `--qds-surface-*`, so surface overrides no longer flow into them; override the control tokens directly.
  Ink, Term, reduced transparency, forced colours and browsers without `backdrop-filter` use opaque layers and
  no halo.
- **Buttons**: neutral filled buttons use the layer fill with an elevation border; accent buttons gain a light top
  and dark bottom edge (not on date picker selections); pressed neutral text is muted.
- **Chips**: layer fill with an elevation border; clickable and selected chips show the halo.
- **Cards**: a flat translucent layer with a hairline `--qds-card-stroke`; `--qds-card-shadow` defaults to `none`.
  Nested cards stay strokeless; maximized dialog cards stay opaque.
- **Lists**: the active item is a subtle pill with an accent indicator bar.
- `.qds-field--required` is visual only; pair it with `required` or `aria-required` for assistive technology.
- **Breaking — variant IDs**: `mobile` is now `one` and `terminal` is now `term` (labels **One** and **Term**).
  The runtime writes `qds-variant-one` / `qds-variant-term` and `data-qds-variant="one|term"`. `mobile` and
  `terminal` are still accepted as legacy aliases (options, `setVariant`, persisted state), but the
  `.qds-variant-mobile` / `.qds-variant-terminal` classes are no longer emitted or styled; update any consumer
  selectors that target them. The `$variants` map in `./tokens/default` is keyed `one` / `term` as well.
- **Fluent geometry (Windows 11)**: `--qds-radius-control` is 4px and `--qds-radius-lg` (cards, dialogs, tables,
  bordered lists) is 8px; list and navigation rows (`--qds-row-radius`) use the 4px control radius at 36px. Ink,
  One and Term keep their own radii. Quasar's compile-time Sass radii (`$generic-border-radius` and friends) come
  from `$radius control` and are global to every variant, so QTable cards, `.rounded-borders` and default-shape
  QSkeletons now read the runtime radius tokens instead.
- **Fluent light surfaces**: a Mica-like base — `--qds-surface-1` `#f3f3f3`, `--qds-surface-2` `#eeeeee`,
  `--qds-surface-3` `#e8e8e8` — so layers separate from the page. Dark surfaces are unchanged.
- **Solid role buttons**: in Fluent, hover and press lighten toward the layer (95% / 90% of the role fill) and the
  pressed label uses the 90% on-fill text, keeping ≥ 4.5:1 at rest and hover and ≥ 3:1 pressed for every role in
  light and dark. New tokens `--qds-color-primary-hover`, `--qds-fill-hover-mix`, `--qds-fill-pressed-mix`,
  `--qds-fill-state-base` and `--qds-text-on-fill-pressed-mix`. Checked checkbox, radio and toggle hovers use
  `--qds-color-primary-hover` too. Ink, One and Term keep their darker states.
- **Breaking — pressed primary**: `--qds-color-primary-pressed` is now derived from the fill-state tokens (a lighter
  Fluent press) instead of the fixed dark `#0c3b5e`, and the `primary-pressed` key is removed from the `$palette` /
  `$dark-palette` maps in `./tokens/default`. Consumers that read either should use `--qds-color-primary-dark` for
  a darker primary.
- **Touch**: coarse pointers use a 32 / 40 / 48px control ramp (`--qds-control-size-lg` is now 48px) so dense,
  default and large controls stay distinct; toggles, which size from it, grow to 48 × 24px. Dense toolbars read
  the new `--qds-toolbar-dense-min-height` (40px; One 48px).
- **Fields**: filled and standout hover fills mix 8% of the foreground instead of 12%, keeping placeholder and
  affix text ≥ 4.5:1 in Fluent.
- **Tabs**: a floating badge inside a tab stays within the tab strip instead of being clipped.
- **Field groups**: below 30rem, groups of three or more unlabelled children wrap — the first child takes its own
  row and the joined corners follow the wrap. Pairs and groups with labelled fields stay on one row.
- **Navigation**: in a `q-drawer` or `nav`, a collapsed `QExpansionItem` (or any expansion in a mini drawer) with
  an active child shows the 3px indicator on its header; other collapsed expansions do not.
- **Expansion items**: hovering, focusing or pressing an expanded header now adds a state layer.
- **Split buttons**: the chevron segment is narrower (8px side padding, 34px wide at 32px height).
- **Mini drawer**: 4px list padding, so items are 40px wide at `:mini-width="48"`.
- **Forced colours**: navigation indicator rails and the selected `.qds-table-segmented` segment use `Highlight`.
- **Ink (paper)**: a warm paper palette — light page `#f1ece4`, sheets `#fbf9f5` (never white), charcoal `#2e2c28`
  ink; dark page `#1f1e1b`, sheets `#282622`, paper-tone text. Light role fills are muted pigments with paper text,
  dark ones pastels with charcoal text, so every solid role button is ≥ 4.5:1 at rest, hover and press (fixes the
  accent, warning and info hover gaps). Role washes are desaturated pastels.
- **Ink surfaces**: cards are paper sheets with a hairline instead of a lavender wash; nested cards and tiles are
  page-tone wells with a hairline. Menus, tooltips, dialogs, bottom sheets and toasts take a crisp
  `--qds-stroke-strong` rule; the dialog scrim is a warm ink tint. Drop shadows (including `--qds-elevation-*`),
  card tints and the inner-loading blur are off. Buttons use one hairline instead of the Win11 two-tone edge; fields
  keep their `--qds-stroke-strong` bottom edge (≥ 3:1 on page, sheet and well).
- **Ink selection and states**: checked checkboxes, radios and toggles fill with the charcoal (dark: paper) primary
  and an on-fill glyph; pressed primary mixes toward the sheet so hover and press differ; `--qds-fg-on-brand` and
  `--qds-text-on-solid` use the paper on-fill.
- **Ink rows**: the 40 / 36px list and menu rows apply to fine pointers only, so coarse pointers get the 44px touch rows.
- **Term (crisp)**: opaque warm-cream light panes (`#f8f6f0` on `#eeebe2`) and warm near-black dark panes (`#141412`
  on `#0c0c0b`), charcoal / paper text, and no glow, drop shadows (including `--qds-elevation-*`), card tints or Win11
  two-tone edges. Thin and thick materials (tooltips, dialogs, bottom sheets) and the header are solid; regular
  acrylic stays on menus and opt-in `.qds-material` surfaces, with a crisp hairline. Muted text is ≥ 4.5:1 on every
  surface (fixes the 4.13 placeholder and inactive `QBtnToggle` segment); the light negative fill is `#e86a6a` and
  role presses mix 82% so every solid role button is ≥ 4.5:1 at rest and hover and ≥ 4.4:1 pressed.
- **Term strokes**: controls, fields, outline buttons and overlays use `--qds-border` (≥ 3:1 on every surface; outline
  role buttons are ruled in their role text colour); cards, nested cards, tiles, tables and steppers use the subtler
  decorative `--qds-card-stroke`. Error, positive and warning field strokes use the role text colours (≥ 3:1). Cards
  stay opaque Term panes even inside another variant's scope.
- **Term amber**: amber stays a fill with dark ink. Solid role buttons (including the selected `QDate` day), checked
  checkboxes, radios, toggles, slider thumbs and the slider selection carry a rule in their on-fill ink so they stay
  bounded on cream; focus rings, tab rails and brand text use `--qds-fg-brand` (≥ 5.9:1); rating stars deepen to
  ≥ 3:1. Neutral buttons drop the amber tint; the active `QBtnToggle` segment takes the control hairline.
- **Term rows**: the 38 / 32px list and menu rows and 38px expansion headers apply to fine pointers only, so coarse
  pointers get the 44px touch rows.
- **Breaking — One (One UI 8 neutral)**: One palette, surface, text, border, role-wash, focus-block and shadow token
  values changed. Light page `#f2f2f2` with white blocks, dark true-black page with `#1a1a1a` blocks; the lavender
  focus-block cast, Mica tint and card tints are gone. Calm blue accent (`#1b5fcf`, dark fill `#2f6fdc` with
  light-blue `--qds-fg-brand`) and desaturated role fills with white text, ≥ 4.5:1 at rest and hover in both modes
  (hover and press darken). Muted text, placeholders (including hovered fields), brand text and the focus ring meet
  contrast on every One surface (fixes the 4.05 dark placeholder and 4.18 muted-on-focus-block gaps).
- **One surfaces**: cards and blocks separate by tone and roundness (24px radius, no stroke); nested cards, tiles,
  carousels and settings cards take the grey `--qds-surface-focus-block`; dialogs (28px), floating bottom sheets
  (all corners rounded, inset from the edges) and windows sit on `--qds-surface-transient`, and controls, cards and
  fields inside them step one tone up from the overlay. Card headers drop the brand wash; carousels sit on a block
  tone; explicit bordered steppers, framed media, bordered tables and bordered uploaders keep their stroke. The mini
  drawer rail is one block. Menus keep their acrylic.
- **One controls**: pill buttons, pill segmented tracks and tabs (the dark selected segment is a lighter step);
  fields fill with the nested grey (filled and standout too, and flip inside nested blocks) behind a 1px perimeter
  that is ≥ 3:1 on blocks and nested blocks; focus and validation states draw a 2px perimeter in the brand or role
  colour instead of the focus bar. Neutral controls keep one subtle hairline (no Win11 two-tone edge). Field-group
  buttons follow the field radius. Pressed primary is one step darker than hover. Active list and navigation rows
  take the brand wash with brand text, so they stand out from their block. `QDate` fits narrow containers (flexible
  day cells, compact navigation arrows).
- **One rows**: 48 / 40px list and menu rows and 48px expansion headers on fine pointers; coarse pointers keep the
  56 / 48 / 52px One UI touch rows.
- **Term dense buttons** follow `--qds-control-size-sm` like dense fields (24px fine / 32px coarse; was a fixed
  28px), so dense controls in one row share a height.

### Fixed

- Shadcn QWindow close-action focus uses the system Highlight color in forced-colors mode without
  adding important declarations or changing the other variants' window surfaces.
- One and Term QWindow close-action focus rings use contrasting role foregrounds on library-controlled
  surfaces while preserving their resting and hover paint.

- QBtn `no-caps` is respected in variants that uppercase controls (Term).
- Quasar `text-weight-*` / `text-bold` utilities win over the QDS type scale on headings and `text-*` steps again,
  and `text-lowercase` / `text-capitalize` win over the uppercase overline.
- Plain prose links inside `.qds-ui` take `--qds-fg-brand` (visited too), a soft underline that firms on hover and
  the QDS focus ring; links with any `q-` class (Quasar components, spacing utilities) keep their own styling.
- Custom `[role="button"]` / `[role="link"]` elements with a `tabindex` (and no `q-` class) get an inset QDS focus
  ring instead of the browser one (zero specificity, so components keep theirs).
- QChip `color="grey"` takes the neutral layer, as role chips take their tonal fill, instead of default text on the
  palette grey.
- Joined QBtnGroup / split-button segments draw their focus ring inside their own edge (in the on-fill ink on role
  fills), so it no longer squares off against the next segment or overlaps nearby rows.

## [@osmova/quasar-design-system 0.8.0-rc.3] — 2026-10-14

### Changed

- Publish the design system under the `@osmova/quasar-design-system` npm scope on `next`.
  Update package imports and installation examples without changing the exported API or visual styling.
  Existing `@bastvi/quasar-design-system` releases remain available; their versions and release tags are unchanged.
- Move the repository to `Osmova/quasar-design-system` and the live gallery and component catalog to
  `https://qds.osmova.com` and `https://qds.osmova.com/histoire/`.

## [0.8.0-rc.3] — 2026-10-14

### Added

- **Shadcn variant**: opaque New York-inspired native Quasar styling with Neutral (default), Gray, Zinc,
  Stone, and Slate palettes; `shadcnBaseColor`, `setShadcnBaseColor()`, `SHADCN_BASE_COLORS`, and the
  `ShadcnBaseColor` type. Palette selection persists with mode/variant and survives variant switching;
  invalid values normalize to Neutral and older storage records retain configured defaults.
- CSS-only same-element palette/mode scopes, local-dark rebinding, observable explicit-light boundaries,
  SSR/teardown checks, and an isolated MIT-pinned shadcn-vue reference with Inter/Phosphor normalization.
  No mandatory Tailwind/Reka dependencies; shadcn requires Quasar >=2.35 without narrowing the existing peer range.
- Mandatory runtime checks in `verify:publish`, finite compressed/gzip budgets for both CSS exports,
  separate optional-extension allowances, and pinned gallery/reference screenshot-pair CI gates.
- Gallery regression coverage for variant-card bounds and pagination, multiline font geometry, and
  table fullscreen across all five variants in light/dark and desktop/mobile, plus Fluent dark scene contrast.
  Legacy variant aliases remain covered by the theme tests.

### Changed

- Shadcn's shared prose, typography, custom focus, and semantic role grammar are scoped to the new
  variant; existing Fluent/Ink/One/Term styling is retained. Ordinary filled shadcn buttons use primary,
  while native contextual controls and literal palette colors retain their own grammar. Semantic on-fill
  text takes precedence over normal author color; inline important color remains authoritative.
- Shadcn text/focus and hover/pressed fills are calibrated for contrast after sRGB quantization; official
  legacy Gray/Slate sidebar gaps are explicit aliases, not invented upstream values. Custom targets cover
  descendants only; body targeting is required for full portal/plugin styling.

### Fixed

- Gallery variant cards and pagination stay within their mobile bounds without overlapping controls.
- Gallery font samples use readable multiline line spacing without overlapping glyphs.
- Gallery tables remove their demo margin in fullscreen so the table covers the full viewport and restores
  its original spacing on exit.
- The Fluent dark gallery scene uses an opaque reading surface with AA text contrast over its wallpaper.

## [0.8.0-rc.2] — 2026-09-29

### Added

- **Materials**: Windows 11 / SwiftUI-style acrylic on overlays — menus, popups, pickers, and notifications
  (regular), dialogs and the bottom sheet (thick), tooltips (thin) — with a hairline stroke and an inner top edge
  highlight.
  New tokens `--qds-material-*`, `--qds-mica-alt`, `--qds-backdrop`; opt-in `.qds-material` (`--thin`, `--thick`)
  for cards and other elements. Solid fallbacks without `backdrop-filter`, under
  `prefers-reduced-transparency: reduce`, and in forced-colors mode; `ink` stays solid.
- Menus fade and scale in from 98%; dialogs scale from 96% with a fade. Quasar `transition-duration` values
  shorter than the token still apply; longer ones are capped.
- `pnpm css:budget` (`scripts/css-budget.mjs`) caps `!important`, doubled Quasar class selectors, and component
  stylesheet lines; `verify:publish` runs it first.
- Icon-size ramp `--qds-icon-size-xs|sm|md|lg` (12/14/16/20px); `--qds-control-icon-size-*` alias it.
- The gallery gate lints sub-elements across the atlas families: no Material ligature icons, chat bubble tails,
  tree L-connectors, play-triangle carets, or raw white/black fills, and the icon-size tokens resolve.

### Changed

- The page shows the Mica backdrop (`--qds-backdrop`, a `background` value) on a fixed `body::before` layer tied
  to the window; header, footer, drawer, and toolbars use the opaque `--qds-mica-alt` tint (`--qds-toolbar-bg`).
- The bottom sheet is full-bleed below 600px and respects the bottom safe area.
- `--qds-menu-bg` now resolves to the translucent regular material; dialogs, menus, and tooltips carry the material
  stroke and edge highlight.
- Chat messages drop the bubble tail and use 32px circular avatars aligned to the bubble bottom.
- Stepper connectors pass through the dot centres; dot icons are 14px.
- QTree uses a single indent guide and the Phosphor caret (`tree.icon` in `qdsIconSet`) instead of the play triangle.
- QColor header and footer tabs are segmented controls; the swatch grid uses hairline gaps.
- Dark brand foreground (`--qds-fg-brand`) is lighter (≈ `#63acf6`) so brand text keeps 4.5:1 on hover layers.
- Dark thin material is 85% opaque (was 80%) so muted captions keep 4.5:1 over white content.
- Floating badges anchor 8px inside the host's top-end corner and grow outward instead of centring on it.
- Every `backdrop-filter` is emitted through one internal materials mixin; QInnerLoading now also carries the
  `-webkit-` prefix.
- Sass: `$control` no longer carries `icon-size-sm|md|lg`; read the new `$icon-size` map from `./tokens/default`
  instead (the `--qds-control-icon-size-*` custom properties remain).

### Fixed

- Multiline badges no longer break mid-word.
- Floating badges inside a QBtnGroup keep their counter width and paint above the next button.
- A coloured QBtnToggle keeps unselected segments unfilled with muted text; disabled segments stay unfilled.
- A floating badge no longer covers the last letter of an outline button label.
- Below 600px, banner actions stay on one end-aligned row.
- Breadcrumb icon separators no longer end a wrapped line.
- Gallery QRating row labels align with their card titles.
- README and the gallery Fonts tab describe Selawik as an optional display face; the display stack follows Inter.

## [0.8.0-rc.1] — 2026-09-28

Reference-driven Fluent 2 rebuild. Default controls are neutral-first; colour is
reserved for the primary action and status. The previous tonal look remains
available through opt-in classes.

### Breaking changes

- **Palette and neutral grammar reset** from the Fluent 2 web tokens: neutral
  grey surfaces, text, and strokes replace the warm cream neutrals and slate
  text; secondary is a charcoal neutral, info a neutral grey, accent marigold.
- **Control scale 36 → 32px**: buttons and fields use 24/32/40px
  (`--qds-control-size-sm|md|lg`); `dense` uses the 24px step.
- **Buttons are solid by default**: `color` + `unelevated` renders a solid role
  fill (was a tonal wash). No `color` renders the neutral button (surface fill,
  1px stroke). Badges with `color` are solid pills.
- **Fields place the label above the control** by default (32px control, 24px
  dense); the floating label moved to the opt-in `qds-field--float` (48px).
- **Radii**: controls 6px, cards and dialogs 12px.
- **Cards** lift with a layered shadow and no longer draw a stroke.
- **Dialogs** use a plain scrim without backdrop blur.
- **Lists and menus** use 32px desktop rows (36px comfortable) as rounded inset
  rows.
- **Removed** the `.qds-field--stacked` behaviour (label-above is now the
  default) and the `.qds-plugin-inner-loading` hook.
- **Selawik left the display stack**: `--qds-font-family-display` follows the
  body stack (Inter) unless an app sets it.
- `.qds-solid` is now meaningful only on chips; on buttons and badges it has no
  effect because `color` is already solid.

### Deprecated

- No-op tokens kept for compatibility and slated for removal:
  `--qds-tab-hover-bg`, `--qds-progress-stripe`, `--qds-media-frame-shadow`,
  and `--qds-card-border-mix`.

### Added

- `.qds-tonal` opt-in for the previous tonal wash on buttons and badges.
- Gallery Compare page placing Fluent 2 web components beside QDS defaults.

### Migration notes

- Keep the old tonal buttons or badges: add `class="qds-tonal"` next to `color`.
- Remove `class="qds-solid"` from buttons; `unelevated color="…"` is already
  solid. Keep it on chips that need a solid fill.
- Keep floating labels: add `class="qds-field--float"` to the field. Remove
  `qds-field--stacked`; the default already stacks the label above.
- Layouts sized around 36px buttons or 48px fields: re-check toolbars, table
  actions, and form rows against the 32px controls.
- Replace `.qds-plugin-inner-loading` with your own class on `QInnerLoading`
  if you relied on its blurred veil.
- Want Selawik for headings: import `fonts/selawik.css` and set
  `--qds-font-family-display: 'Selawik', var(--qds-font-family)` on `:root`.
- Stop reading or setting the deprecated tokens above; they no longer change
  the rendered output.

## [0.7.0] — 2026-09-16

Stable release of the Fluent 2 overhaul validated through the complete gallery,
accessibility, package, live-browser, and comparative visual gates. This release
contains all changes from `0.7.0-rc.1` through `0.7.0-rc.3` plus the final
post-RC accessibility corrections.

### Added

- Public field-label variants and responsive form-label utilities.
- Semantic geometry, row, state, typography, elevation, and progress tokens.
- Safe-area utility classes for One/mobile layouts.

### Changed

- Rebuilt Fluent field anatomy, selection controls, command surfaces, cards,
  lists, menus, tabs, sliders, and dark surface hierarchy around semantic tokens.
- Canonical variants are Fluent, Ink, One (`mobile`), and Terminal; legacy Air,
  Glass, Studio, and Feather inputs continue to normalize to supported variants.
- Unified Fluent radii and reduced Material-style chrome while preserving One
  touch geometry and the distinct Ink and Terminal systems.

### Fixed

- Ensured muted text meets WCAG 4.5:1 across Fluent and Ink light surfaces,
  including tinted role washes.
- Added accessible names to variant progress bars and retained clean axe and
  Lighthouse evidence.
- Corrected toggle thumb centering/travel, radio-dot scale, nested dark surfaces,
  media assets, responsive tabs, RTL geometry, and theme-transition test races.

### Verification

- Typecheck and package build pass.
- Playwright gallery gate: 168/168 desktop and mobile tests.
- Production Lighthouse: Accessibility, Best Practices, SEO, and Agentic
  Browsing all score 100 on desktop and mobile.
- Independent browser and comparative visual review returned GO.

## [0.7.0-rc.3] — 2026-08-27

Fluent 2 anatomy alignment + Material-tell removal, validated by comparative
vision-agent review against Fluent 2 official, Apple HIG, and Samsung One UI.

### Changed

- **Toggle/switch geometry rebuilt**: thumb 12px vertically centered in a 16px
  track (was off by 2px hanging below), symmetric travel (37.5% off, 75% on —
  was 20-62.5% with thumb buried in the track). Dense: 11px, 36%/80%. Mobile:
  44×24 track with mirrored travel. Radio dot scaled ×1.36 → 59.5% of the ring
  (was 44%). All offsets are `--qds-toggle-*` custom properties.
- **Quiet command surfaces**: QBtnGroup/QBtnToggle and the gallery mode/variant
  switcher no longer use a Material capsule shell (outer border + padding +
  filled rail). Transparent group with 1px hairline separators and quiet tonal
  selected/hover states — Fluent 2 command-surface anatomy.
- **Dark surface hierarchy repaired**: `surface-1` was darker than `surface-0`
  (inverted), causing nested panels to disappear. New order: canvas `#1a1d22`
  → raised `#21252b` → `#282d34` → `#31373f`. Expansion content is now opaque
  raised surface + hairline instead of an alpha-blended tint.
- **Radius unification (Fluent 2)**: cards 8px (was 12), controls/menus 4px
  (was 8/12). Ink/mobile/terminal keep their distinctive variant radii.
- **Slider/range thinned**: track 2px (was 6), thumb 16px (was 18), 1px stroke
  (was 3px), shadow removed.
- **Tab indicator**: 2px underline (was 3px rail).
- **One UI mobile**: list separators now inset-aligned with content (was
  full-width). Added `.qds-safe-bottom` / `.qds-safe-top` utility classes for
  `env(safe-area-inset-*)` rhythm.

### Fixed

- Stale gallery copy updated: "3px accent rail" → "2px accent underline".

## [0.7.0-rc.2] — 2026-08-25

Alignment republish: the npm tarball now matches the production site exactly.

### Changed

- Fluent light muted text darkened a further step `#5a6a80` → `#556579`, clearing
  WCAG 4.5:1 also on soft role washes (≥ 4.84:1 on info-tinted surfaces, ~5.0–7.1:1
  on standard surfaces).
- Linear-progress stripe gradient consumes the new `--qds-progress-stripe` token
  (added to `QDS_TOKENS` and the public token inventory test).
- List item caption/overline labels are themed via `--qds-fg-muted` instead of
  Quasar's raw `rgba(0, 0, 0, …)` defaults.
- Gallery shell: added meta description; `favicon.ico` shipped alongside
  `favicon.svg`. Test stabilization: 150ms settle after theme/variant switches in
  the catalog forms suite.

## [0.7.0-rc.1] — 2026-08-25

First public prerelease of the Fluent 2 overhaul (an intentional visual break).
Note: `0.6.4` was published to npm without a changelog entry; the committed `0.6.5`
was never published and is folded into this release track.

### Added

- Field label variant class contract: `qds-field--float` (animated center-to-border,
  the Fluent default), `qds-field--stacked-animated`, `qds-field--stacked`,
  `qds-field--start`, plus the `qds-form--label-start|--sm|--md|--lg` parent
  utilities. Start labels collapse to stacked below `45rem`.
- Semantic field geometry tokens: `--qds-field-size-sm/md/lg`,
  `--qds-field-label-size-rest/float`, `--qds-field-label-gap`,
  `--qds-field-label-column`, `--qds-field-value-inset-block-start/end`,
  `--qds-field-transition`.
- Shared row tokens `--qds-row-gap`, `--qds-row-radius`, `--qds-row-inset`, now
  consumed by menu, list, drawer, tree, option-group, markup-table, and editor
  toolbar styling instead of duplicated raw geometry.

### Changed

- **Semantic token migration** across all component families (`--qds-text` →
  `--qds-fg-default`, etc.). Old `--qds-text*` names remain defined as aliases in
  `src/themes/fallbacks.scss`, so existing CSS consumers keep working.
- Reworked field anatomy: 48px normal / 40px dense outlined and filled controls,
  vertically centered rest labels, animated border-float labels when
  focused/filled, protected value band, no label/value overlap.
- Tightened Fluent surface hierarchy (quieter cards with intentional hairlines),
  compact desktop selection-control geometry, lighter transient surfaces, and
  semantic table hover/selected state layers.
- Removed dead `.qds-variant-feather` selectors (~211 lines); the runtime already
  normalized `feather` → `ink`.

### Fixed

- Fluent light muted text darkened `#64748b` → `#556579`; token-name labels,
  list captions/overlines, and all small muted text now meet WCAG 4.5:1 on
  every light surface including soft role washes (≥ 4.8:1 on info-tinted
  surfaces, 4.93–7.1:1 elsewhere).

## [0.6.3] — 2026-08-06

### Added

- Expanded gallery and Histoire proof coverage across canonical variants, official Quasar states, stable public modes, responsive layouts, accessibility, RTL, and reduced motion.
- Added deterministic browser contracts for Fluent foundations, control geometry, low-chrome composition, semantic dark contrast, public token parity, and the optional QWindow extension.

### Changed

- **Variant convergence.** The visible variant set is now `fluent`, `ink`, `mobile` (One), and `terminal`. The Air visual system is removed; its low-border/selective-material behavior is absorbed by Fluent. Feather is renamed to Ink and is now a colored, flat, paper-neutral editorial surface with charcoal anchors and coordinated pastel role washes (no longer monochrome).
- Fluent inherits the legacy Air translucency behavior without the iOS palette or oversized geometry.
- Ink replaces Feather as the paper-neutral variant, now with deliberate pastel role surfaces across cards, tables, progress, badges, and selection.
- One (mobile) gains its own focus blocks and touch rhythm treatment distinct from Fluent.
- Gallery and Histoire variant switchers, scenes, and story controls enumerate the four canonical variants only. The Air showcase and Feather showcase are removed as public surfaces.
- Gallery mobile header layout repaired at 390px: single accessible horizontally scrollable tab strip with visible but non-obstructive overflow; compact control layout avoids competing clipped scrollers.
- Reworked Fluent buttons, fields, chips, icons, lists, ratings, cards, and QWindow chrome around a shared control scale, explicit framing, and measurable optical alignment.
- Separated normal chips, dense chips, and badges into a 30px / 26px / 22px hierarchy, and tuned Fluent dark semantic fills and soft surfaces independently from light mode.
- Replaced QWindow text glyph actions with Phosphor SVG icons while preserving the optional module and native QWindow behavior.

### Fixed

- Kept outlined labels, values, marginal icons, multiple chips, and validation messages aligned and contained across normal, dense, standalone, and mobile fields.
- Removed redundant card frames and separators while retaining explicit readable, bordered, transient, One, and Terminal boundaries.
- Prevented mobile tab arrows from covering neighboring labels and kept deep-linked active tabs inside dedicated arrow lanes.
- Removed fixture-created scene/comparison overflow, raw icon ligatures, undersized QWindow glyphs, and an extraneous QWindow attribute warning.
- Reconciled all 251 public token names with exact fallback/default token-layer emissions without narrowing the existing TypeScript token union.

### Compatibility

- Runtime legacy aliases preserved: `air`, `glass`, and `studio` inputs resolve to `fluent`; `feather` resolves to `ink`. Persisted state and body classes remain compatible.
- The `qds-variant-air`, `qds-variant-glass`, and `qds-variant-feather` body classes are no longer emitted for new sessions; legacy classes are cleared on variant change.
- Public TypeScript types expose `CanonicalDesignSystemVariantName` (`fluent` | `ink` | `mobile` | `terminal`) and `LegacyDesignSystemVariantName` (`studio` | `air` | `glass` | `feather`) for migration.

## [0.6.2] — 2026-07-29

### Fixed

- Removed duplicate borders, rounded corners, and shadows when a table is used as flush direct content inside a card, while retaining section separators and standalone table frames.

## [0.6.1] — 2026-07-08

### Changed

- Added reusable readable/opaque card surface and header classes for image-backed layouts, and updated the Scenes gallery to use them for stronger live contrast.
- Lightened Air typography weights and control icon opacity/stroke treatment so the variant reads thinner without losing contrast.

## [0.6.0] — 2026-07-07

### Added

- Added an optional `@bastvi/quasar-design-system/qwindow` module with `QdsWindow`, QWindow type re-exports, and opt-in QWindow extension styles at `./css/extensions/qwindow` and `./css/extensions/qwindow/layered`.
- Added gallery and Histoire QWindow proofs that import native QWindow CSS separately from the default QDS bundle.

## [0.5.6] — 2026-07-07

### Changed

- Deepened native-pattern styling and proof coverage for complex controls: `QStepper`, `QCarousel`, `QEditor`, and `QUploader` now expose richer active/done/error/navigation, thumbnail/control, toolbar/dropdown/focus, and upload-state treatments.
- Expanded picker coverage for `QSelect` multiple chips/menu states, `QColor` spectrum/tune/alpha views, `QDate` disabled/month/year views, `QTime` AM/PM landscape mode, and `QPopupEdit` popup chrome.
- Updated public project guidance to reflect built `dist/` TypeScript entrypoints and the current five built-in variants.

### Fixed

- Kept the catalog a11y gate green after adding QColor tune inputs by extending the existing known Quasar picker exclusion to QColor's internal unlabeled channel inputs.

## [0.5.5] — 2026-07-07

### Changed

- Rebalanced the Air variant so it is more translucent than Fluent while preserving contrast with stronger tonal tint, border, and chrome guardrails.
- Improved `QColor` picker chrome with cleaner tabs, animated state transitions, and square palette swatches.
- Refined `QTree` row spacing, indentation, hover treatment, and RTL-safe child padding.

### Fixed

- Kept `QToggle` knobs inset inside their tracks in normal and dense branches.
- Strengthened tab/tree hover transitions without changing active tabs back into filled pills.

## [0.5.4] — 2026-07-07

### Fixed

- Fixed the deployed gallery Media section `QVideo` proof overflowing into the following Scrolling section on wide viewports by constraining the demo iframe frame.

## [0.5.3] — 2026-07-07

### Changed

- Made the deployed gallery default to `system` mode so it follows the OS light/dark preference on first load.
- Added initial `sm` / `md` / `lg` control and icon-size CSS tokens for calmer default field, button, chip, and expansion control proportions.
- Rebalanced Fluent/default card material with clearer surface and border separation while keeping Air/acrylic card chrome softer.
- Updated the gallery icon proof row to exercise Quasar icon-set-driven controls and `sm` / `md` / `lg` button sizing.

### Fixed

- Fixed `QSlider` / `QRange` always-visible labels rendering as unstyled square chips, including dark mode.
- Reduced oversized/aggressive internal control icons for fields, selects, chips, buttons, and expansion chevrons.
- Updated visual expectations so deterministic tests explicitly force light mode where they assert light-token values.

## [0.5.2] — 2026-07-06

### Changed

- Softened the default Fluent card material by reducing resting card border mix and dark elevation weight.
- Retuned Air dark surfaces toward a cooler, airier material so Air separates more clearly from dark Fluent.
- Reworked `QBtnGroup`, `QBtnToggle`, and `QPagination` into cohesive segmented controls with shared shells and internal dividers instead of per-button boxes.
- Deepened `QDate` day/month/year, selected, today, focus, and range-state styling with tokenized rounded cells and range fills.

### Fixed

- Added gallery and Histoire `QDate` range examples plus Playwright assertions so range styling is covered by the release gate.
- Updated gallery visual assertions for the new Fluent/Air token contract and stabilized variant restoration after the legacy `glass` alias check.

## [0.5.1] — 2026-07-02

### Added

- Expanded Quasar sub-element proof coverage across the release gallery and Histoire catalog:
  - Forms and pickers now expose and test QSlider, QRange, QCheckbox, QRadio, QToggle, QOptionGroup, QFile, and QInput/QSelect state surfaces.
  - Data, navigation, and layout coverage now proves QAvatar, QPagination, QDrawer, and consolidated QTabPanels treatment.
  - Media, complex, progress, and loading coverage now proves QCarousel, QEditor, deterministic QUploader queue/progress/error/uploaded states, QScrollArea, QSplitter, QTimeline, QKnob, QCircularProgress, and QSpinner.
  - Overlay/plugin coverage now proves Air QMenu material, Air/Feather/Terminal Notify treatment, and plugin-scoped QInnerLoading.

### Changed

- Deepened built-in variant structure beyond token swaps:
  - **One** (`mobile` key) now has stronger touch-first row/menu/control rhythm, grouped tabs, and bottom-nav depth.
  - **Air** now has cleaner sheet/media/nested chrome treatment with low resting noise and contextual overlay depth.
  - **Feather** now has more matte paper/document styling for cards, tables, forms, popups, loading surfaces, and media.
- Expanded the gallery Variant lab with nested chrome and table examples.

### Fixed

- Added regression coverage for One rhythm, Air nested-chrome shadowlessness, Feather matte/table behavior, and existing Terminal typography/pagination behavior.
- Added final gallery and Histoire release gates for the expanded component proof wave.
- Ensured `configureDesignSystem({ rootClass })` always keeps the required `.qds-ui` scope class and treats `rootClass` as an additional hook, matching the documented CSS-scoping contract.

### Notes

- The following interaction-heavy states remain documented manual-only exceptions rather than brittle automated gates: QPopupEdit's teleported popup, QPageScroller scroll threshold, QSlideItem and QPullToRefresh gestures, QInfiniteScroll scroll-triggered loading, and any future LoadingBar ownership relocation.

## [0.5.0] — 2026-06-26

### Added

- Added `terminal` built-in variant (`qds-variant-terminal`): dark amber developer
  UI with near-black surfaces, #fcc40d amber primary, crisp hairline cards,
  restrained glow, and tight 6px control radius.
- Added terminal scene wallpaper SVG and Playwright variant/scenes expectations.

## [0.4.0] — 2026-06-25

### Added

- Added a gallery **Scenes** tab with deterministic owned SVG wallpapers for
  comparing `fluent`, `air`, `mobile`, and `feather` materials in image-rich
  contexts.
- Added visual scene tests covering scene mount, Air material tokens, and
  Feather paper/e-ink behavior.
- Added public inline icon-gap tokens for comfortable default spacing and
  compact dense spacing across buttons, chips, badges, and select chips.

### Changed

- Retuned default `fluent` card acrylic to use a neutral explicit tint token
  instead of primary-blue resting glow.
- Retuned `air` toward a modern matte-glass material with stronger blur,
  image-friendly translucency, and tokenized acrylic tint/depth.
- Refined `feather` as a warm paper/e-ink variant with minimal glass behavior,
  muted sage/earth actions, paper borders, and low-fatigue dark mode.
- Improved default Quasar coverage with explicit `QHeader` styling and focused
  `QBtnDropdown` / `QBtnGroup` / `QBtnToggle` assertions.

### Fixed

- Consolidated duplicate LoadingBar styling so the catalog/loading-data rule is
  the single source for the public QDS loading-bar treatment.

## [0.3.0] — 2026-06-24

### Changed

- **Built TypeScript entrypoints.** Runtime TS exports (`.`, `./runtime`, `./tokens`,
  `./themes`, `./icons/quasar-icon-set`) now resolve to pre-compiled ESM JS and
  `.d.ts` files in `dist/`. Consumers no longer need to compile this package's
  TypeScript — bundlers pick up the built output directly.
- `main` and `types` fields now point at `dist/index.js` and `dist/index.d.ts`.
- Export map uses `types` + `import` conditions for all TS entrypoints.
- Added `pnpm build` (`tsc -p tsconfig.build.json`) and wired it into
  `verify:publish` / `prepublishOnly`.
- SCSS, CSS, and font exports remain source-first (`src/`) — no change for
  Sass consumers.
- Packed tarball verified: all public subpaths (JS, `.d.ts`, SCSS, fonts) resolve
  from the extracted package.

### Notes

- Visual output, token contract, and component coverage are unchanged.
- Gallery, Histoire, and Playwright gates are unaffected.

## [0.2.0] — prior

- Initial public-surface release with source-only TS entrypoints.
- Fluent 2-inspired design tokens, Quasar component overrides, runtime theme
  controller, Phosphor icon set, and optional font CSS.
