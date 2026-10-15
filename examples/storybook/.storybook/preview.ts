import type { Preview } from '@storybook/vue3-vite'
import { setup } from '@storybook/vue3-vite'
import { h } from 'vue'
import {
  ClosePopup,
  BottomSheet,
  Dialog,
  Loading,
  LoadingBar,
  Notify,
  Quasar,
} from 'quasar'

// T185 shared catalog: the controller comes from the COMPILED package entrypoint
// (@osmova/quasar-design-system -> dist). The catalog preview helper resolves the
// same dist file through a repository-relative import, and Vite resolves both
// specifiers to the same realpath module, so the injection key identity holds.
import {
  configureDesignSystem,
  qdsIconSet,
  DESIGN_SYSTEM_VARIANTS,
  SHADCN_BASE_COLORS,
  type DesignSystemController,
  type DesignSystemMode,
} from '@osmova/quasar-design-system'
import { ownPreviewController } from '../../../catalog/preview/index'

// Adoption CSS ordering mirrors the documented consumer path: native Quasar CSS
// first, then optional fonts, then the QDS tokens/component overrides AFTER
// Quasar (unlayered overrides win via `.qds-ui` scope, they must load last).
import 'quasar/src/css/index.sass'
import '@osmova/quasar-design-system/fonts/inter.css'
import '@osmova/quasar-design-system/fonts/open-sans.css'
import '@osmova/quasar-design-system/fonts/selawik.css'
import '@osmova/quasar-design-system/css'

interface PreviewController {
  state: { initialized: boolean }
  setMode(mode: DesignSystemMode): unknown
  setVariant(variant: string): unknown
  setShadcnBaseColor(color: string): unknown
}

interface CatalogGlobals {
  mode?: DesignSystemMode
  variant?: string
  shadcnBaseColor?: string
}

/**
 * One explicitly owned controller per preview document/app.
 *
 * `setup` runs on EVERY Vue app the renderer creates for this canvas document:
 * on forced remounts the previous app is unmounted first (our app.onUnmount
 * destroys that controller and drops its classes/attrs), then the fresh app
 * gets a fresh explicit controller. Non-remount arg updates reuse the same app,
 * so the same owned controller serves the whole document — never a second
 * authority, and never the module-global fallback.
 */
setup((app) => {
  app.use(Quasar, {
    iconSet: qdsIconSet,
    plugins: { BottomSheet, Dialog, Loading, LoadingBar, Notify },
    directives: { ClosePopup },
  })

  const controller = configureDesignSystem(app, {
    persist: false,
    mode: 'light',
    variant: 'fluent',
  })

  // Explicit dispose: a destroyed app removes the body attributes/classes it
  // painted; the fresh app re-derives its own controller afterwards.
  ownPreviewController(app, controller)
})

const variantNames = Object.keys(DESIGN_SYSTEM_VARIANTS)
const paletteNames = SHADCN_BASE_COLORS.map((palette) => palette.name)

export const globalTypes = {
  mode: {
    description: 'Design-system color mode (controller.setMode)',
    toolbar: {
      title: 'QDS mode',
      icon: 'mirror',
      dynamicTitle: true,
      items: [
        { value: 'light', title: 'Light' },
        { value: 'dark', title: 'Dark' },
        { value: 'system', title: 'System' },
      ],
    },
  },
  variant: {
    description: 'Design-system variant (controller.setVariant)',
    toolbar: {
      title: 'QDS variant',
      icon: 'summarize',
      dynamicTitle: true,
      items: variantNames.map((name) => ({ value: name, title: name })),
    },
  },
  shadcnBaseColor: {
    description: 'Shadcn palette axis (controller.setShadcnBaseColor; shadcn variant only)',
    toolbar: {
      title: 'Shadcn palette',
      icon: 'paintbrush',
      dynamicTitle: true,
      items: paletteNames.map((name) => ({ value: name, title: name })),
    },
  },
} as const

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    docs: {
      // Per-canvas isolation (docs canvases render in their own iframe document).
      // This is the addon-docs 10.x parameter read by the bundled Canvas blocks:
      // `props.story?.inline ?? parameters.docs?.story?.inline ?? false`.
      story: {
        inline: false,
      },
      iframeHeight: '480px',
      source: {
        type: 'code',
      },
    },
  },
  initialGlobals: {
    mode: 'light',
    variant: 'fluent',
    shadcnBaseColor: 'neutral',
  },
  decorators: [
    (story, context) => {
      // Docs pages render canvases inside iframes; decorators still run for the
      // docs chrome itself. Do not paint globals into the docs host document.
      if (context.viewMode === 'docs') {
        return story()
      }

      const holder = globalThis as unknown as Record<string, unknown>
      const controller = holder.__qdsCatalogController as PreviewController | undefined
      const phaseResolve = holder.__qdsCatalogPhase as (() => string) | undefined
      const phase = phaseResolve?.() ?? 'unknown'

      if (!controller || !controller.state?.initialized || phase !== 'mounted') {
        // Deterministic blocker surface instead of silently missing theme paint.
        return h(
          'div',
          {
            role: 'alert',
            style:
              'padding:1rem;border:1px solid #a4262c;color:#a4262c;font-family:ui-sans-serif,system-ui;',
          },
          `Controller blocker: no live preview controller injected for this canvas document (phase: ${phase}). Host setup must call configureDesignSystem(app, { persist: false }) from the compiled package entrypoint.`,
        )
      }

      const globals = (context.globals ?? {}) as CatalogGlobals
      if (globals.mode) {
        controller.setMode(globals.mode)
      }
      if (globals.variant) {
        controller.setVariant(globals.variant)
      }
      if (globals.variant === 'shadcn' && globals.shadcnBaseColor) {
        controller.setShadcnBaseColor(globals.shadcnBaseColor)
      }

      return story()
    },
  ],
}

export default preview
export type { DesignSystemController }
