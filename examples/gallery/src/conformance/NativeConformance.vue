<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useQuasar, ClosePopup as vClosePopup, QAjaxBar, QAvatar, QBadge, QBanner, QBreadcrumbs, QBreadcrumbsEl, QBtn, QBtnDropdown, QBtnGroup, QBtnToggle, QCard, QCardActions, QCardSection, QCheckbox, QChip, QCircularProgress, QDialog, QEditor, QFab, QFabAction, QIcon, QInnerLoading, QInput, QItem, QItemSection, QLinearProgress, QList, QMenu, QPopupEdit, QPopupProxy, QRating, QSelect, QSeparator, QTooltip, QUploader } from 'quasar'
import { QdsWindow, type QdsWindowInstance } from '@bastvi/quasar-design-system/qwindow'
import { SHADCN_BASE_COLORS, useDesignSystem, type DesignSystemController } from '@bastvi/quasar-design-system'
import { ppPlus, ppStar } from 'quasar-extras-svg-icons/phosphor-icons-v2'
import NativeScheme from './NativeScheme.vue'
import NativeStates from './NativeStates.vue'
import NativeOracle from './NativeOracle.vue'

const props = defineProps<{ controller?: DesignSystemController }>()
const ds = props.controller ?? useDesignSystem()
const $q = useQuasar()
const value = ref('Alex Morgan')
const dialog = ref(false)
const menu = ref(false)
const tooltip = ref(false)
const windowVisible = ref(true)
// Only methods exposed by the public QDS wrapper, never the native Vue instance.
type QdsWindowPublic = Pick<QdsWindowInstance, 'show' | 'hide' | 'float' | 'embed' | 'enterFullscreen' | 'leaveFullscreen' | 'getPosition'>
const embeddedWindow = ref<QdsWindowPublic | null>(null)
const floatingWindow = ref<QdsWindowPublic | null>(null)
const floatingVisible = ref(false)
const floatingFullscreen = ref(false)
const fullscreenAccepted = ref<boolean | null>(null)
const fullscreenError = ref('')
function requestFullscreen(target: QdsWindowPublic | null) {
  fullscreenError.value = ''
  fullscreenAccepted.value = target?.enterFullscreen() ?? false
}
function recordFullscreenError(event: Event) { fullscreenError.value = event.type }
function recordRejection(event: PromiseRejectionEvent) { fullscreenError.value = String(event.reason) }
const nativeTest = {
  get embeddedWindow() { return embeddedWindow.value },
  get floatingWindow() { return floatingWindow.value },
  get fullscreenAccepted() { return fullscreenAccepted.value },
  get fullscreenError() { return fullscreenError.value },
  get fullscreenState() { return floatingFullscreen.value },
}
const testHost = window as unknown as { __qdsNativeTest?: typeof nativeTest }
const windowMaximized = ref(false)
const windowMinimized = ref(false)
const windowFullscreen = ref(false)
const windowHeadless = ref(false)
const windowDisabled = ref(false)
const customWindowPaint = ref(false)
const fab = ref(true)
const selected = ref('account')
const checked = ref<boolean | null>(null)
const uploader = ref<{ addFiles: (files: File[]) => void; files: File[]; updateFileStatus: (file: File, status: string, size?: number) => void }>()
const ajax = ref<{ start: (speed?: number) => void; stop: () => void; increment: (amount: number) => void }>()
const editor = ref('<p><a href="https://example.org">Native link</a> and <strong>bold text</strong></p>')
const events = ref('Ready')
const dismissals: Array<() => void> = []
const roles = ['primary', 'secondary', 'accent', 'positive', 'negative', 'warning', 'info']
const image = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32"%3E%3Crect width="32" height="32" fill="gray"/%3E%3C/svg%3E'

onMounted(async () => {
  testHost.__qdsNativeTest = nativeTest
  document.addEventListener('fullscreenerror', recordFullscreenError)
  window.addEventListener('unhandledrejection', recordRejection)
  await nextTick()
  uploader.value?.addFiles([new File(['queued'], 'queued.txt'), new File(['progress'], 'progress.txt'), new File(['failed'], 'failed.txt'), new File(['uploaded'], 'uploaded.txt'), new File(['<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="gray"/></svg>'], 'thumbnail.svg', { type: 'image/svg+xml' })])
  await nextTick()
  const files = uploader.value?.files ?? []
  if (files[1]) uploader.value?.updateFileStatus(files[1], 'uploading', 3)
  if (files[2]) uploader.value?.updateFileStatus(files[2], 'failed')
  if (files[3]) uploader.value?.updateFileStatus(files[3], 'uploaded')
})
function cleanup() { dismissals.splice(0).forEach(dismiss => dismiss()); $q.loading.hide(); $q.loadingBar.stop(); ajax.value?.stop() }
onBeforeUnmount(() => {
  cleanup()
  delete testHost.__qdsNativeTest
  document.removeEventListener('fullscreenerror', recordFullscreenError)
  window.removeEventListener('unhandledrejection', recordRejection)
})
function notify() {
  cleanup()
  dismissals.push($q.notify({ message: 'Native notification', caption: 'Action and progress', avatar: image, timeout: 60_000, progress: true, group: false, actions: [{ label: 'Dismiss', noCaps: true }] }))
}
function sheet(grid: boolean) { $q.bottomSheet({ title: 'Surface actions', grid, actions: [{ label: 'Copy', icon: ppPlus, id: 'copy' }, { label: 'Cancel', id: 'cancel' }] }) }
function pluginDialog(prompt = false) { $q.dialog({ title: 'Plugin dialog', message: 'Native dialog body', cancel: true, ...(prompt ? { prompt: { model: '', type: 'text' } } : { options: { type: 'radio', model: 'account', items: [{ label: 'Account', value: 'account' }, { label: 'Password', value: 'password' }] } }) }) }
function loading() { $q.loading.show({ group: 'base', delay: 0, message: 'Base group' }); $q.loading.show({ group: 'newer', delay: 0, message: 'Newer group' }) }
</script>

<template>
  <!-- Only native components and consumer layout sizing. No gallery/style-helper import. -->
  <main style="padding: 16px; display: grid; grid-template-columns: minmax(0, 1fr); gap: 24px; min-width: 0" data-conformance>
    <NativeOracle />
    <header style="display: flex; flex-wrap: wrap; gap: 8px">
      <h1>Native QDS conformance</h1>
      <q-btn v-for="color in SHADCN_BASE_COLORS" :key="color.name" no-caps :label="color.label" @click="ds.setShadcnBaseColor(color.name)" />
      <q-btn no-caps label="Light" @click="ds.setMode('light')" /><q-btn no-caps label="Dark" @click="ds.setMode('dark')" />
      <q-btn no-caps label="Native RTL" @click="$q.lang.set({ ...$q.lang, rtl: !$q.lang.rtl })" />
    </header>
    <section aria-label="Role state matrix" data-native="roles" style="display: flex; flex-wrap: wrap; gap: 8px">
      <q-btn v-for="role in roles" :key="role" :color="role" :data-role="role" no-caps :label="role" />
      <q-btn data-native="default-button" no-caps label="Button" />
      <q-btn data-native="literal" color="red-7" text-color="white" no-caps label="Literal" />
      <q-btn data-native="author-inline" color="primary" style="color: magenta" no-caps label="Author inline" />
      <q-btn data-native="author-important" color="primary" style="color: magenta !important" no-caps label="Author important" />
      <q-btn data-native="weight" class="text-weight-bold" no-caps label="Explicit weight" />
      <q-btn outline no-caps label="Outline" /><q-btn flat no-caps label="Flat" /><q-btn push no-caps label="Push" /><q-btn round :icon="ppPlus" aria-label="Add item" />
      <q-btn loading no-caps label="Loading" /><q-btn disable no-caps label="Disabled" />
      <q-btn-dropdown split no-caps label="Split" data-native="split"><q-list><q-item clickable v-close-popup><q-item-section>Copy</q-item-section></q-item></q-list></q-btn-dropdown>
      <q-btn-group data-native="group"><q-btn no-caps label="One" /><q-btn no-caps label="Two"><q-badge floating label="99+" /></q-btn></q-btn-group>
      <q-btn-toggle v-model="selected" no-caps :options="[{ label: 'Account', value: 'account' }, { label: 'Password', value: 'password' }]" data-native="segments" />
      <q-fab v-model="fab" :icon="ppPlus" label="Create" no-caps data-native="fab"><q-fab-action :icon="ppPlus" label="Draft" /></q-fab>
    </section>
    <section aria-label="Identity" data-native="identity">
      <q-avatar><img :src="image" alt="Alex" /></q-avatar><q-avatar>AM</q-avatar><q-avatar :icon="ppPlus" />
      <q-chip removable selected><q-avatar>AM</q-avatar>Selected chip</q-chip><q-badge outline label="Outline" /><q-badge transparent label="Transparent" />
      <q-rating :model-value="2.5" :icon="ppStar" :max="5" />
      <q-breadcrumbs><q-breadcrumbs-el label="Home" /><q-breadcrumbs-el label="Current" /></q-breadcrumbs>
      <q-banner><template #avatar><q-avatar>AM</q-avatar></template>Banner content<template #action><q-btn flat no-caps label="Action" /></template></q-banner>
    </section>
    <section aria-label="Form anatomy" data-native="anatomy">
      <q-input v-model="value" outlined clearable label="Name" hint="Description" counter prefix="$" suffix="USD"><template #prepend><q-icon :name="ppPlus" /></template><template #append><q-icon :name="ppPlus" /></template></q-input>
      <q-input model-value="Invalid" error error-message="Visible error" label="Invalid email" />
      <q-input v-model="value" type="textarea" autogrow label="Notes" />
      <q-checkbox v-model="checked" label="Indeterminate" /><q-checkbox :model-value="false" label="Unchecked" /><q-checkbox :model-value="true" disable keep-color label="Disabled" />
      <q-select v-model="selected" behavior="dialog" label="Dialog select" :options="['account', 'password']" data-native="dialog-select" />
      <q-btn no-caps label="Edit value"><q-popup-proxy data-native="popup-proxy"><q-card flat data-native="popup-proxy-content"><q-card-section><q-input v-model="value" label="Popup value" /></q-card-section><q-card-actions><q-btn v-close-popup no-caps label="Close popup" /></q-card-actions></q-card></q-popup-proxy></q-btn>
      <span tabindex="0" data-native="popup-edit">{{ value }}<q-popup-edit v-model="value" buttons v-slot="scope"><q-input v-model="scope.value" autofocus label="Edit name" /></q-popup-edit></span>
    </section>
    <section aria-label="Native overlays" data-native="overlays">
      <q-btn no-caps label="Open menu" data-native="menu-trigger"><q-menu v-model="menu" data-native="menu"><q-list><q-item clickable v-close-popup><q-item-section avatar><q-icon :name="ppPlus" /></q-item-section><q-item-section>Copy link</q-item-section><q-item-section side>⌘C</q-item-section></q-item><q-separator /><q-item disable><q-item-section>Disabled</q-item-section></q-item></q-list></q-menu></q-btn>
      <q-btn no-caps label="Tooltip" data-native="tooltip-trigger" @focus="tooltip = true" @blur="tooltip = false"><q-tooltip v-model="tooltip" no-parent-event data-native="tooltip">Native tooltip</q-tooltip></q-btn>
      <q-btn no-caps label="Open dialog" data-native="dialog-trigger" @click="dialog = true" />
      <q-dialog v-model="dialog"><q-card data-native="dialog"><q-card-section><h2>Dialog title</h2><p>Dialog body</p><q-input v-model="value" label="Name" /></q-card-section><q-card-actions><q-btn v-close-popup no-caps label="Cancel" /><q-btn v-close-popup color="primary" no-caps label="Confirm" /></q-card-actions></q-card></q-dialog>
      <q-btn no-caps label="Native Notify" @click="notify" /><q-btn no-caps label="List sheet" @click="sheet(false)" /><q-btn no-caps label="Grid sheet" @click="sheet(true)" />
      <q-btn no-caps label="Options dialog" @click="pluginDialog(false)" /><q-btn no-caps label="Prompt dialog" @click="pluginDialog(true)" />
      <q-btn no-caps label="Grouped Loading" @click="loading" /><q-btn no-caps label="Restore Loading base" @click="$q.loading.hide('newer')" /><q-btn no-caps label="Cleanup" @click="cleanup" />
      <q-btn no-caps label="Start LoadingBar" @click="$q.loadingBar.start(0)" /><q-btn no-caps label="Start AjaxBar" @click="ajax?.start(0); ajax?.increment(34)" />
      <q-ajax-bar ref="ajax" skip-hijack data-native="ajax-bar" />
    </section>
    <section aria-label="Native rich controls" data-native="rich">
      <q-btn color="primary" loading no-caps label="Material loading button" data-test="t180-spinner-button" />
      <div data-test="t180-spinner-field"><q-input outlined loading model-value="Busy field" label="Material loading field" /></div>
      <div style="position: relative; min-height: 80px" data-test="t180-spinner-inner"><q-inner-loading showing color="primary" label="Material inline loading" /></div>
      <q-editor v-model="editor" :toolbar="[['bold', 'italic', 'link'], [{ label: 'Format', fixedLabel: true, list: 'no-icons', options: ['p', 'h5', 'code'] }], ['fullscreen']]" data-native="editor" />
      <q-uploader ref="uploader" multiple :auto-upload="false" label="Native uploader" data-native="uploader" style="max-width: 100%" />
      <q-linear-progress :value="0.5" :buffer="0.8" /><q-linear-progress indeterminate /><q-circular-progress :value="60" show-value />
      <div style="position: relative; min-height: 100px"><q-inner-loading showing label="Syncing" /></div>
    </section>
    <section aria-label="Actual browser fullscreen fixture" style="display: flex; flex-wrap: wrap; gap: 8px">
      <q-btn no-caps label="Reject embedded fullscreen" data-native="window-reject-fullscreen" @click="requestFullscreen(embeddedWindow)" />
      <q-btn no-caps label="Open floating window" data-native="window-open-floating" @click="floatingVisible = true" />
      <output data-native="window-request-result">{{ fullscreenAccepted === null ? 'No request' : fullscreenAccepted ? 'Request accepted' : 'Request rejected' }}{{ fullscreenError ? `: ${fullscreenError}` : '' }}</output>
      <QdsWindow v-if="floatingVisible" ref="floatingWindow" v-model="floatingVisible" v-model:fullscreen="floatingFullscreen" title="Floating native window" aria-label="Floating native window" :width="Math.min(480, $q.screen.width - 32)" :height="280" :start-x="16" :start-y="16" no-resize :actions="['fullscreen', 'close']">
        <q-btn no-caps label="Enter actual window fullscreen" data-native="window-enter-fullscreen" @click="requestFullscreen(floatingWindow)" />
        <q-btn no-caps label="Exit actual window fullscreen" data-native="window-exit-fullscreen" @click="floatingWindow?.leaveFullscreen()" />
        <q-btn no-caps label="Close floating fixture" data-native="window-close-floating" @click="floatingWindow?.hide()" />
        <output data-native="window-native-state">{{ floatingFullscreen ? 'Native fullscreen event active' : 'Native fullscreen event inactive' }}</output>
      </QdsWindow>
    </section>
    <section aria-label="Window states" data-native="window-controls">
      <q-btn no-caps label="Window maximize" @click="windowMaximized = !windowMaximized" /><q-btn no-caps label="Window minimize" @click="windowMinimized = !windowMinimized" />
      <q-btn no-caps label="Window fullscreen requested prop" @click="windowFullscreen = !windowFullscreen" /><q-btn no-caps label="Window headless" @click="windowHeadless = !windowHeadless" /><q-btn no-caps label="Window disable" @click="windowDisabled = !windowDisabled" />
      <q-btn no-caps label="Toggle author titlebar paint" @click="customWindowPaint = !customWindowPaint" />
      <QdsWindow ref="embeddedWindow" v-model="windowVisible" v-model:maximized="windowMaximized" v-model:minimized="windowMinimized" v-model:fullscreen="windowFullscreen" :headless="windowHeadless" :disabled="windowDisabled" embedded dense no-resize title="Native window" :actions="['minimize', 'maximize', 'close']" :titlebar-style="customWindowPaint ? { background: 'rgb(37, 99, 235)' } : undefined"><q-input v-model="value" label="Window field" /><q-btn no-caps label="Window action" /><q-btn v-if="windowFullscreen || windowMaximized" no-caps label="Restore window" @click="windowFullscreen = false; windowMaximized = false" /></QdsWindow>
    </section>
    <section aria-label="Complete native scheme boundaries" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr)); gap: 24px">
      <NativeScheme :dark="true" :variant="ds.variant.value" :palette="ds.shadcnBaseColor.value" /><NativeScheme :dark="false" :variant="ds.variant.value" :palette="ds.shadcnBaseColor.value" />
    </section>
    <NativeStates />
    <output aria-live="polite">{{ events }}</output>
  </main>
</template>

<style scoped>
[data-conformance] > section { min-width: 0; }
</style>
