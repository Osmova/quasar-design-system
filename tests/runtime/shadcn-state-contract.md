# T171 calibrated filled-role contract

Applies to Shadcn only. Existing variants and upstream/rest colors are unchanged.

## Catalog consumption

For each `ROLE` in `primary`, `secondary`, `accent`, `positive`, `negative`,
`warning`, `info`, the complete `shadcn.scheme()` emitter supplies:

| Token | Use |
| --- | --- |
| `--qds-color-ROLE` | Rest fill |
| `--qds-color-ROLE-hover` | Actual opaque hover fill |
| `--qds-color-ROLE-pressed` | Actual opaque pressed fill |
| `--qds-color-ROLE-rgb` | Rest RGB tuple |
| `--qds-color-ROLE-hover-rgb` | Hover RGB tuple from the same state color |
| `--qds-color-ROLE-pressed-rgb` | Pressed RGB tuple from the same state color |
| `--qds-text-on-ROLE` | Unchanged foreground at rest, hover and pressed |
| `--qds-text-on-ROLE-pressed-mix` | `100%`: bind to generic pressed text mix if needed |

Component lanes must consume the state tokens directly, not recreate
`color-mix(... 90%/80% ...)`. Keep the same foreground across states; do not fade
it or flip white/dark. A component using the generic pressed-text calculation
must rebind `--qds-text-on-fill-pressed-mix` to
`var(--qds-text-on-ROLE-pressed-mix)`. Shadcn also emits the generic value as
`100%`, but a more-specific native component declaration may otherwise replace it.
Do not apply a further state overlay or opacity to these fills or foregrounds:
that changes the verified pair. Disabled rendering is a separate contract.

## Deliberate fidelity deviation

The upstream fills/pairs and sRGB hover90%/pressed80% compositing failed 26
normal-text combinations. Those percentages remain the starting point, but
accessibility takes precedence over exact reference opacity.

1. Resolve the actual container as **inner surface over card over canvas**.
   Without a local surface override, the container is card over canvas.
2. Mix the unchanged, quantized rest fill with that opaque container in sRGB at
   90% (hover) or 80% (pressed).
3. Convert this candidate to OKLCH. Preserve its C/h; test L unchanged first.
4. Quantize clipped sRGB channels to nearest 8-bit, then check the unchanged
   on-fill foreground at WCAG 4.5, with no downward tolerance.
5. Only if failing, move candidate L in `.001` steps **away from the foreground**
   (darker with light text, lighter with dark text), bounded to `[0,1]`.
   Return the first quantized passing fill. Throw if impossible.

The emitted fills are opaque, so their foreground contrast remains the same on
canvas/card/popover/muted/selected/role-soft backgrounds. Rest/source primitives
and on-fill pairs are not changed. Hue/chroma preservation is in the candidate
OKLCH space before required sRGB clipping and nearest-byte storage.

## Local-dark / local-container API

`src/themes/_shadcn.scss`:

```scss
@include shadcn.scheme('gray', dark); // complete local-dark boundary
@include shadcn.scheme('gray', dark, true, rgba(0, 0, 0, 0.1));
// fourth argument is an inner local surface, composed over profile card/canvas
```

`scheme($palette: neutral, $scheme: light, $bridge: true, $state-container: null)`
and `palette($palette: neutral, $scheme: light, $state-container: null)` accept
the optional Sass-known local inner surface. `palette()` is dynamic values only;
use the complete `scheme()` after native local-dark inversion.

`src/tokens/_shadcn.scss`:

- `role-state-fills($profile, $scheme, $container: null)` returns
  `ROLE: (hover: COLOR, pressed: COLOR)` for all seven roles.
- `state-fill($fill, $on-fill, $container, $weight, $minimum: 4.5)` accepts an
  **already opaque composed container** and returns the first passing fill.
- `profile($palette, $scheme)` supplies the normalized profile map.

CSS-only primitive overrides do not regenerate calibrated state colors. Rebind
the associated state tokens, or emit a boundary with the correct Sass-known
container. Keep the Quasar bridge at the same local boundary.

## Compact grouped native local-dark boundary (T174)

Call once inside the component stylesheet's unlayered styles mixin, **after**
the existing native inversion. Do not put it inside an individual component
selector; supply the relative selector or selector list as the first argument:

```scss
@include shadcn.local-scopes(
  ':is(.q-card--dark, .q-table--dark, .q-tree--dark, .q-stepper--dark, .q-list--dark, .q-menu--dark, .q-uploader--dark, .q-date--dark, .q-time--dark)'
);
```

Signature: `local-scopes($boundaries, $scheme: dark,
$scope: ':is(.qds-ui.qds-variant-shadcn, .qds-ui .qds-variant-shadcn)',
$state-container: null)`.

The default scope has sufficient specificity to replace the native unlayered
inversion when emitted afterward. Supply an isolated palette-bearing `$scope`
when composing independently themed nested roots. Its palette attribute must
be on that scope's target, not on the boundary element.

This emits one shared transitive color/material alias closure and Quasar bridge,
one complete Neutral profile (also the missing/invalid-attribute fallback), and
four Neutral-relative palette deltas. All calibrated states/RGB/foregrounds are
retained. Dimensions, typography, invariant shadows and disconnected component
defaults remain inherited from the Shadcn root. `scheme()` remains the full
standalone declaration emitter; `boundary-alias-values()` exposes the compact
closure for verification. Tests compare every emitted token with a properly
scoped, unlayered full emitter after the actual native inversion, plus independent
pinned-profile checks. A negative control reproduces the incorrect underscoped
oracle on the default export, so parity alone cannot hide that fixture failure.

## Verification

`node scripts/test-runtime-fill-contrast.mjs` checks actual emitted rest/hover/
pressed pairs. `node --test tests/runtime/*.test.mjs` checks the frozen state
table, RGB coherence, unchanged pairs and actual browser consumption.
`node scripts/test-runtime-colorjs.mjs` independently verifies first-passing
calibration using dev-only `colorjs.io@0.7.1` once installed by the manifest owner.
