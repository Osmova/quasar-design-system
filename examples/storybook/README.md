QDS storybook (private proof workspace)
======================================

Development-only Storybook for the shared catalog proof. Not shipped with
`@osmova/quasar-design-system` (workspace deps live here only).

Rendered story set: `stories/catalog-proof.stories.ts` — the four proof cases
from `catalog/manifest.json`, each statically exported (CSF), with docs from
`tags: ['autodocs']`, the actual shared Vue demo source, argTypes mapped from the
shared `catalog/control.json`, and QDS theme toolbar globals
(mode / variant / shadcn palette).

- Runtime: `pnpm catalog:storybook` (requires port 6006 available; parent-reserved).
- Static build: `pnpm catalog:storybook:build` — outputs `storybook-static` (local only).
- Typecheck: `pnpm --filter @osmova/qds-storybook typecheck`.
- Production browser proof: build both hosts with `pnpm stories:build` and
  `pnpm catalog:storybook:build`, then run `pnpm catalog:browser:test`.
  The pinned Playwright 1.61.0 suite owns disposable Python static servers on
  127.0.0.1:6196 (Histoire) and :6197 (Storybook), with one worker, no retries,
  and no reuse of externally running servers. It needs Python 3 and the matching
  Chromium installation (`pnpm -C examples/storybook exec playwright install chromium`).
  CI reuses its existing Chromium installation. Reports/traces stay in ignored
  workspace output. This bounded functional/geometry proof does not replace
  independent visual review or the gallery release gate.

Both dev/build scripts first rebuild the root package runtime. Build output is ignored.
The toolbar is the sole theme authority; in-canvas theme selectors are hidden while
the scaffold shows the actual reactive controller/body state. Theme options come from
the public variant/palette registries. Quasar installs the package's Phosphor icon set.

The preview controller comes from the compiled package entrypoint
(`@osmova/quasar-design-system` → `dist`), is configured once per canvas
document (`app.use(Quasar, ...)` + `configureDesignSystem(app, { persist: false })`),
explicitly disposed in `app.onUnmount`, and exposed as `window.__qdsCatalogController`
for browser inspection; both controller/phase handles are removed on owner unmount
without erasing newer owners. Docs canvases render in iframes (`docs.story.inline: false`)
so every canvas owns exactly one controller/document lifecycle.
