import { inject, type App } from 'vue'

import {
  DESIGN_SYSTEM_THEME_KEY,
  type DesignSystemController,
} from '../../dist/index.js'

/**
 * Reads the design-system controller that the preview host setup explicitly
 * injected for THIS preview document/app (`configureDesignSystem(app, { persist: false })`
 * from the compiled `dist` entrypoint).
 *
 * The catalog deliberately does NOT call `useDesignSystem()` here: that API has a
 * module-global fallback (`fallbackController`), which can outlive a destroyed
 * controller or silently create a second authority. The proof path must observe
 * real injection. When injection is missing, callers get `null` with an explicit
 * reason instead of a stale/false controller object.
 */
export interface CatalogControllerResolution {
  controller: DesignSystemController | null
  reason: string
}

export function useCatalogPreviewController(): CatalogControllerResolution {
  const injected = inject<DesignSystemController | null>(DESIGN_SYSTEM_THEME_KEY, null)
  if (!injected) {
    return {
      controller: null,
      reason:
        'No preview controller injected for this preview document. The host setup must call '
        + 'configureDesignSystem(app, { persist: false }) from the compiled package entrypoint.',
    }
  }

  if (injected.state.persist === true) {
    return {
      controller: null,
      reason: 'Own injected controller must use persist: false so preview state stays inside the document.',
    }
  }

  if (injected.state.initialized === false) {
    return {
      controller: null,
      reason: 'Injected controller exists but was never initialized — treat it as a host/setup bug.',
    }
  }

  return { controller: injected, reason: '' }
}

export const CATALOG_PREVIEW_CONTROLLER_HANDLE = '__qdsCatalogController'

/**
 * Host setup files register the controller on `globalThis` under this handle so
 * browser tooling can inspect identity/lifecycle without adding public API.
 */
export function exposePreviewHandle(controller: DesignSystemController): () => void {
  if (typeof globalThis === 'undefined') {
    return () => {}
  }

  const holder = globalThis as unknown as Record<string, unknown>
  holder[CATALOG_PREVIEW_CONTROLLER_HANDLE] = controller
  const phase = () => 'mounted'
  holder['__qdsCatalogPhase'] = phase
  return () => {
    if (holder[CATALOG_PREVIEW_CONTROLLER_HANDLE] === controller) delete holder[CATALOG_PREVIEW_CONTROLLER_HANDLE]
    if (holder.__qdsCatalogPhase === phase) delete holder.__qdsCatalogPhase
  }
}

let disposePreviewOwner: (() => void) | undefined

/** One owner per preview document; handover disposes listeners before repainting. */
export function ownPreviewController(app: App, controller: DesignSystemController): void {
  const previous = disposePreviewOwner
  previous?.()
  // configureDesignSystem has already painted the incoming controller. Disposing
  // the old owner clears that same body, so restore the complete incoming state.
  if (previous) controller.setMode(controller.state.mode)

  const release = exposePreviewHandle(controller)
  let disposed = false
  const dispose = () => {
    if (disposed) return
    disposed = true
    try { controller.destroy() } finally {
      release()
      if (disposePreviewOwner === dispose) disposePreviewOwner = undefined
    }
  }
  disposePreviewOwner = dispose
  app.onUnmount(dispose)
}
