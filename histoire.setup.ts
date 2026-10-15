import {
  ClosePopup,
  BottomSheet,
  Dialog,
  Loading,
  LoadingBar,
  Notify,
  QBadge,
  QBanner,
  QBtn,
  QCard,
  QChip,
  QInput,
  QItem,
  QItemSection,
  QList,
  QMenu,
  QSelect,
  QSeparator,
  QToggle,
  QToolbar,
  QToolbarTitle,
  Quasar,
} from 'quasar'
import type { App } from 'vue'

// T185 shared catalog: the preview controller is configured from the COMPILED
// package entrypoint (dist), matching the gallery consumer and the Storybook
// proof host — same entrypoint, same injection-identity, one explicit owner
// per preview document (Histoire shell app lives for the whole iframe
// document; the runtime controller is destroyed together with it).
import { configureDesignSystem, qdsIconSet } from './dist/index.js'
import { ownPreviewController } from './catalog/preview/index'

// Legacy underline stories keep importing `../src`; they receive the SAME
// controller object through its source-module key (bridge below), so there is
// never a second, competing injection authority. Do not rewrite old story
// imports to make this work — the bridge is explicit here instead.
import {
  DESIGN_SYSTEM_THEME_KEY,
} from './src'
import 'quasar/src/css/index.sass'
import './src/fonts/inter.css'
import './src/fonts/selawik.css'
import './src/css/index.scss'
import '@quasar/quasar-ui-qwindow/index.css'
import '@osmova/quasar-design-system/css/extensions/qwindow'
import './stories/_shared/story.scss'

type QuasarInstall = (app: App, options: object, ssrContext?: unknown) => void

export function setupVue3({ app }: { app: App }) {
  const isSsr = Boolean((import.meta as unknown as { env?: { SSR?: boolean } }).env?.SSR)
  const quasarOptions = {
    components: {
      QBadge,
      QBanner,
      QBtn,
      QCard,
      QChip,
      QInput,
      QItem,
      QItemSection,
      QList,
      QMenu,
      QSelect,
      QSeparator,
      QToggle,
      QToolbar,
      QToolbarTitle,
    },
    directives: {
      ClosePopup,
    },
    iconSet: qdsIconSet,
    plugins: {
      BottomSheet,
      Dialog,
      Loading,
      LoadingBar,
      Notify,
    },
  }

  if (isSsr) {
    ;(Quasar.install as QuasarInstall)(app, quasarOptions, { req: { headers: {} } })
  } else {
    app.use(Quasar, quasarOptions)
  }

  // One explicitly owned preview controller per preview document. Persistence is
  // off so browser/tab state cannot leak mode/variant between proof canvases.
  const controller = configureDesignSystem(app, { persist: false })

  // Explicit lifecycle: the runtime controller dies when the preview document
  // (its owning app) unmounts. After this point no fallback/legacy copy must be
  // used — the known entrypoints re-derive the controller per document.
  ownPreviewController(app, controller)

  // Legacy `./src`-importing stories receive the same compiled controller through
  // their own provide key — the migration bridge keeps a single live authority.
  app.provide(DESIGN_SYSTEM_THEME_KEY, controller)

}
