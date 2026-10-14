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
import { configureDesignSystem, qdsIconSet } from './src'
import 'quasar/src/css/index.sass'
import './src/fonts/inter.css'
import './src/fonts/selawik.css'
import './src/css/index.scss'
import '@quasar/quasar-ui-qwindow/index.css'
import '@bastvi/quasar-design-system/css/extensions/qwindow'
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

  configureDesignSystem(app, { persist: false })
}
