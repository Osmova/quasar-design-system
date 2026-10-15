# QDS shared catalog — bounded proof (development only)

This directory is **development-only tooling** for the shared Histoire + Storybook catalog proof.
It is **not part of the published package**: `package.json#files` and `#exports` deliberately do not
reference `catalog/`, and `npm pack` never ships it.

## Layout

- `manifest.json` — the four proof cases (`actions/button`, `forms/field`, `navigation/tabs`,
  `overlays/menu`), their demo files, native export mapping and host-ID map. Case list is separate
  from the native export inventory.
- `schema.json` — manifest schema reference; `validation.mjs` checks the bounded contract,
  compiler-derived bindings, adapter render structures and deterministic generated data.
- `control.json` — single source of control rows (key/kind/default/options/subelement). Both preview
  hosts build their controls from it; demos intentionally carry **no prop defaults**.
- `demos/` — shared Vue demo components (plain Quasar + `--qds-*` tokens; no Histoire/Storybook APIs).
- `preview/` — shared preview helper: `useCatalogPreviewController()` reads the **injected**
  controller directly (module-global fallback is never used in the proof path), and
  `QdsPreviewScaffold.vue` renders the same shell + lifecycle readout in both hosts.
- `fixtures/` — generated fixture JSON (fresh state/fixtured defaults + assertion lists per case).
- `native-inventory.json` — machine-generated native Quasar inventory: every `node_modules/quasar/src/components.js`
  export with an explicit disjoint disposition (`mixin`, `helper`, `composite-child`, `spinner`, `core`),
  the five visual plugins and optional QWindow as separate rows, plus machine-verified reference counts.
- `proof-status.json` — generated case-coverage rollup shown by `catalog:check`.

Coverage requires a named export rendered in an implemented demo; a parent's presence
does not cover invisible/unrendered children. QRouteTab and QItemLabel stay planned.
QResponsive is a native aspect-ratio layout helper without an independent skin;
QInfiniteScroll has visible loading-slot states and remains a planned visual case.
Unknown native names (including new spinner names) fail classification explicitly.

## Commands

- `pnpm catalog:generate` — regenerate `native-inventory.json`, `fixtures/*.fixture.json` and `proof-status.json` (deterministic; no timestamps).
- `pnpm catalog:check` — proof-mode check (the four cases + every inventory entry explicit).
- `pnpm catalog:check:complete` — full-catalog gate: **fails** while any inventory entry is only `planned`
  (expected to fail until the full catalog ports cases; do not fake-complete). Also fails on literally
  any unexplained export. Intended: the gate turns green when every planned row gains a real case.
- `pnpm catalog:test` — dedicated `node --test` suite: generation determinism, live inventory parity,
  adapter parity, package boundary). Also `--complete`, negative controls, host-dep hygiene.
  Negative controls mutate cloned sources and real temporary fixtures and assert specific
  diagnostics; there is no checker test hook or forced-failure path.
- `pnpm stories` / `pnpm stories:build` and `pnpm catalog:storybook` /
  `pnpm catalog:storybook:build` rebuild the compiled runtime before starting the host.
- `pnpm catalog:storybook:typecheck` includes Storybook configs and its CSF adapter.
- `pnpm catalog:browser:test` exercises both already-built production hosts with
  config-owned static servers (6196/6197). See the private workspace README for
  prerequisites. The proof includes actual controls/readout, portals, native icons,
  held tab arrows, 393px document geometry and isolated Docs/source checks.

## Boundaries (must hold)

- `src/**`, gallery, and existing stories are untouched by this proof.
- The preview controllers use the **compiled package entrypoint** (`dist`) in both hosts, one explicit
  controller per preview document/app, `persist: false`, `app.onUnmount`-driven dispose; `catalog/preview`
  rejects the `fallbackController` module-global shortcut.
- Storybook deps live only in the private `examples/storybook` workspace (`storybook`,
  `@storybook/vue3-vite`, `@storybook/addon-docs` pinned exactly at 10.6.1).
- Histoire owns theme changes through the shared scaffold. Storybook owns them through
  toolbar globals only (in-canvas theme selectors hidden); both show live actual body state.
- The four proof variants use Histoire's isolated single-iframe layout. Existing story files
  and their URLs are unchanged. No claim of complete catalog or browser acceptance is made.
