import { createApp } from 'vue'
import { BottomSheet, Dialog, Loading, LoadingBar, Notify, Quasar } from 'quasar'
import { configureDesignSystem, qdsIconSet } from '@osmova/quasar-design-system'
import NativeConformance from './NativeConformance.vue'

const query = new URLSearchParams(location.search)
const app = createApp(NativeConformance)
app.use(Quasar, {
  plugins: { BottomSheet, Dialog, Loading, LoadingBar, Notify },
  iconSet: qdsIconSet,
  config: { loadingBar: { skipHijack: true } },
})
const ds = configureDesignSystem(app, {
  variant: 'shadcn', mode: 'light', persist: query.get('persist') === '1',
  storageKey: 'qds.shadcn.conformance',
})
;(window as unknown as { __qdsGallery: typeof ds }).__qdsGallery = ds
app.mount('#app')
