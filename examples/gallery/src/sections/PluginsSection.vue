<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { QSpinnerGears, useQuasar, type QNotifyUpdateOptions } from 'quasar'
import { ppCheck } from 'quasar-extras-svg-icons/phosphor-icons-v2'

const $q = useQuasar()

const status = ref('No plugin surface opened yet.')

type NotifyHandle = (props?: QNotifyUpdateOptions) => void

declare global {
  interface Window {
    __qdsPluginsTest?: {
      hideLoading: () => void
      hideNewerLoadingGroup: () => void
      cleanup: () => void
    }
  }
}

const notifyTypes = ['positive', 'negative', 'warning', 'info'] as const

let dismissNotify: NotifyHandle | undefined
let dismissGroupedNotify: NotifyHandle | undefined
let updateNotify: NotifyHandle | undefined

const notifyAvatar = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="#0f6cbd"/><path fill="#fff" d="M20 48V38c0-6.6 5.4-12 12-12s12 5.4 12 12v10H20Zm12-26a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"/></svg>')}`

const listActions = [
  { id: 'pin', label: 'Pin surface' },
  { id: 'duplicate', label: 'Duplicate card' },
  { id: 'archive', label: 'Archive draft' },
  {},
  { id: 'cancel', label: 'Cancel' },
]

const gridActions = [
  { id: 'fluent', label: 'Fluent' },
  { id: 'ink', label: 'Ink' },
  { id: 'one', label: 'One' },
  { id: 'term', label: 'Term' },
  {},
  { id: 'tokens', label: 'Tokens' },
  { id: 'motion', label: 'Motion' },
]

function setStatus(message: string) {
  status.value = message
}

function openListBottomSheet() {
  $q.bottomSheet({
    title: 'Surface actions',
    message: 'List mode keeps the action rail compact and tokenized.',
    actions: listActions,
  }).onOk((action: { label?: string }) => {
    setStatus(`BottomSheet list action: ${action.label ?? 'separator'}`)
  }).onCancel(() => {
    setStatus('BottomSheet list dismissed')
  })
}

function openGridBottomSheet() {
  $q.bottomSheet({
    title: 'Variant shortcuts',
    message: 'Grid mode proves the larger BottomSheet layout is skinned too.',
    grid: true,
    actions: gridActions,
  }).onOk((action: { label?: string }) => {
    setStatus(`BottomSheet grid action: ${action.label ?? 'separator'}`)
  }).onCancel(() => {
    setStatus('BottomSheet grid dismissed')
  })
}

function openDialog() {
  $q.dialog({
    title: 'Plugin dialog',
    message: 'The Dialog plugin uses the same QDS card, scrim, and action styling as component dialogs.',
    cancel: { label: 'Cancel', noCaps: true, flat: true, color: 'primary' },
    ok: { label: 'Confirm', noCaps: true, unelevated: true, color: 'primary' },
  }).onOk(() => {
    setStatus('Dialog plugin confirmed')
  }).onCancel(() => {
    setStatus('Dialog plugin cancelled')
  })
}

function showNotify() {
  clearNotifications()
  dismissNotify = $q.notify({
    type: 'info',
    message: 'Plugin notification',
    caption: 'Dismissed explicitly by the demo or visual gate.',
    position: 'bottom-right',
    timeout: 0,
    group: false,
    actions: [{ label: 'Dismiss', color: 'info', noCaps: true }],
    onDismiss: () => {
      dismissNotify = undefined
      setStatus('Notify plugin dismissed')
    },
  })
  setStatus('Notify plugin opened')
}

function showAvatarNotify() {
  clearNotifications()
  dismissNotify = $q.notify({
    color: 'info',
    textColor: 'white',
    message: 'Avatar notification',
    caption: 'Owned SVG avatar fixture at the top-left viewport position.',
    avatar: notifyAvatar,
    position: 'top-left',
    timeout: 0,
    group: false,
    classes: 'qds-notify-avatar qds-notify-position-top',
    actions: [{ label: 'Dismiss', color: 'info', noCaps: true }],
    onDismiss: () => {
      dismissNotify = undefined
      setStatus('Avatar Notify dismissed')
    },
  })
  setStatus('Avatar Notify opened at top-left')
}

function showBottomNotify() {
  clearNotifications()
  dismissNotify = $q.notify({
    type: 'positive',
    message: 'Bottom-center notification',
    caption: 'A persistent viewport-position fixture with deterministic cleanup.',
    position: 'bottom',
    timeout: 0,
    group: false,
    classes: 'qds-notify-position-bottom',
    actions: [{ label: 'Dismiss', color: 'positive', noCaps: true }],
    onDismiss: () => {
      dismissNotify = undefined
      setStatus('Bottom-center Notify dismissed')
    },
  })
  setStatus('Bottom-center Notify opened')
}

function showProgressNotify() {
  clearNotifications()
  dismissNotify = $q.notify({
    type: 'info',
    message: 'Publishing visual proof',
    caption: 'The progress rail remains visible until this deterministic fixture is dismissed.',
    position: 'bottom-right',
    timeout: 60_000,
    progress: true,
    group: false,
    spinner: true,
    spinnerColor: 'info',
    spinnerSize: '1.5rem',
    classes: 'qds-notify-progress',
    actions: [
      { label: 'Keep open', color: 'info', noCaps: true, noDismiss: true, handler: () => setStatus('Notify progress kept open') },
      { label: 'Dismiss', color: 'info', noCaps: true },
    ],
    onDismiss: () => {
      dismissNotify = undefined
      setStatus('Notify progress dismissed')
    },
  })
  setStatus('Notify progress opened')
}

function showGroupedNotify() {
  clearNotifications()
  const options = {
    type: 'warning',
    message: 'Repeated token audit',
    caption: 'The same explicit group increments Quasar’s stable notification badge.',
    position: 'bottom-right' as const,
    timeout: 0,
    group: 'qds-gallery-notify-group',
    badgePosition: 'top-left' as const,
    classes: 'qds-notify-grouped',
    actions: [{ label: 'Dismiss', color: 'warning' as const, noCaps: true }],
    onDismiss: () => {
      dismissGroupedNotify = undefined
      setStatus('Grouped Notify dismissed')
    },
  }

  $q.notify(options)
  dismissGroupedNotify = $q.notify(options)
  setStatus('Grouped Notify opened with badge count 2')
}

function completeUpdatableNotify() {
  updateNotify?.({
    type: 'positive',
    message: 'Visual proof complete',
    caption: 'The same non-grouped Notify handle updated from spinner to semantic success.',
    spinner: false,
    icon: ppCheck,
    iconColor: 'positive',
  })
  setStatus('Updatable Notify completed')
}

function showUpdatableNotify() {
  clearNotifications()
  updateNotify = $q.notify({
    type: 'info',
    message: 'Syncing visual proof',
    caption: 'This persistent non-grouped notification can be updated in place.',
    position: 'bottom-right',
    timeout: 0,
    group: false,
    spinner: true,
    spinnerColor: 'info',
    spinnerSize: '1.5rem',
    classes: 'qds-notify-updatable',
    actions: [
      { label: 'Complete', color: 'positive', noCaps: true, noDismiss: true, handler: completeUpdatableNotify },
      { label: 'Dismiss', color: 'info', noCaps: true },
    ],
    onDismiss: () => {
      updateNotify = undefined
      setStatus('Updatable Notify dismissed')
    },
  })
  setStatus('Updatable Notify opened')
}

function showSemanticNotify(type: typeof notifyTypes[number]) {
  clearNotifications()
  dismissNotify = $q.notify({
    type,
    message: `${type[0].toUpperCase()}${type.slice(1)} semantic surface`,
    caption: 'Each canonical QDS variant resolves the matching role accent and wash.',
    position: 'bottom-right',
    timeout: 0,
    group: false,
    classes: `qds-notify-semantic qds-notify-semantic--${type}`,
    actions: [{ label: 'Dismiss', color: type, noCaps: true }],
    onDismiss: () => {
      dismissNotify = undefined
      setStatus(`${type} Notify dismissed`)
    },
  })
  setStatus(`${type} Notify opened`)
}

function clearNotifications() {
  dismissNotify?.()
  dismissGroupedNotify?.()
  updateNotify?.()
  dismissNotify = undefined
  dismissGroupedNotify = undefined
  updateNotify = undefined
}

function hideLoading() {
  $q.loading.hide()
}

function showLoading() {
  hideLoading()
  $q.loading.show({
    delay: 0,
    message: 'Rendering a custom Quasar spinner…',
    spinnerSize: 56,
    spinner: QSpinnerGears,
    spinnerColor: 'accent',
    messageColor: 'warning',
    backgroundColor: 'positive',
    boxClass: 'qds-plugin-loading-box',
    customClass: 'qds-plugin-loading',
  })
  setStatus('Loading plugin opened')
}

function showGroupedLoading() {
  hideLoading()
  $q.loading.show({
    delay: 0,
    group: 'qds-loading-base',
    message: 'Loading base group',
    customClass: 'qds-plugin-loading-group qds-plugin-loading-group--base',
  })
  $q.loading.show({
    delay: 0,
    group: 'qds-loading-newer',
    message: 'Loading newer group',
    customClass: 'qds-plugin-loading-group qds-plugin-loading-group--newer',
  })
  setStatus('Loading newer group opened above the base group')
}

function hideNewerLoadingGroup() {
  $q.loading.hide('qds-loading-newer')
  setStatus('Loading newer group hidden; base group restored')
}

function startLoadingBar() {
  // Native speed=0 disables random timed increments for reproducible capture.
  $q.loadingBar.start(0)
  $q.loadingBar.increment(34)
  setStatus('LoadingBar plugin started')
}

function stopLoadingBar() {
  $q.loadingBar.stop()
  setStatus('LoadingBar plugin stopped')
}

const pluginTestHooks = {
  hideLoading,
  hideNewerLoadingGroup,
  cleanup: () => {
    hideLoading()
    clearNotifications()
    $q.loadingBar.stop()
  },
}

onMounted(() => {
  window.__qdsPluginsTest = pluginTestHooks
})

onBeforeUnmount(() => {
  pluginTestHooks.cleanup()
  if (window.__qdsPluginsTest === pluginTestHooks) {
    delete window.__qdsPluginsTest
  }
})
</script>

<template>
  <div class="column" style="gap: var(--qds-space-lg)">
    <q-card class="q-pa-lg">
      <div class="text-h6 qds-display q-mb-sm">Quasar plugin surfaces</div>
      <p class="qds-text-muted q-mb-lg" style="max-width: 64rem">
        Deterministic coverage for plugin/global UI that renders outside the local component tree.
        BottomSheet gets dedicated QDS styling; Dialog, Notify, Loading, and LoadingBar prove their
        teleported surfaces continue to inherit the body-level <code>.qds-ui</code> scope.
      </p>

      <div class="row q-col-gutter-md">
        <div class="col-12 col-md-6 col-lg-4">
          <q-card flat bordered class="q-pa-md full-height" data-test="qds-plugin-bottomsheet-card">
            <div class="text-subtitle1 qds-text-strong q-mb-xs">BottomSheet</div>
            <div class="qds-text-muted q-mb-md">List and grid action sheets share one tokenized surface.</div>
            <div class="qds-button-row">
              <q-btn outline no-caps label="Open list BottomSheet" @click="openListBottomSheet" />
              <q-btn outline no-caps label="Open grid BottomSheet" @click="openGridBottomSheet" />
            </div>
          </q-card>
        </div>

        <div class="col-12 col-md-6 col-lg-4">
          <q-card flat bordered class="q-pa-md full-height" data-test="qds-plugin-dialog-notify-card">
            <div class="text-subtitle1 qds-text-strong q-mb-xs">Dialog &amp; Notify</div>
            <div class="qds-text-muted q-mb-md">Global overlays reuse the existing dialog and notification skin.</div>
            <div class="qds-button-row">
              <q-btn outline no-caps label="Open plugin dialog" @click="openDialog" />
              <q-btn outline no-caps label="Show plugin notify" @click="showNotify" />
              <q-btn outline no-caps label="Show avatar Notify" data-test="qds-notify-avatar-trigger" @click="showAvatarNotify" />
              <q-btn outline no-caps label="Show bottom-center Notify" data-test="qds-notify-bottom-trigger" @click="showBottomNotify" />
              <q-btn outline no-caps label="Show action and progress notify" data-test="qds-notify-progress-trigger" @click="showProgressNotify" />
              <q-btn outline no-caps label="Show grouped notify" data-test="qds-notify-grouped-trigger" @click="showGroupedNotify" />
              <q-btn outline no-caps label="Show updatable notify" data-test="qds-notify-updatable-trigger" @click="showUpdatableNotify" />
              <q-btn flat no-caps label="Clear demo notifications" data-test="qds-notify-clear" @click="clearNotifications" />
            </div>
            <div class="qds-button-row q-mt-sm" aria-label="Semantic Notify surfaces">
              <q-btn
                v-for="type in notifyTypes"
                :key="type"
                outline
                no-caps
                :label="`Show ${type} Notify`"
                :data-test="`qds-notify-${type}-trigger`"
                @click="showSemanticNotify(type)"
              />
            </div>
          </q-card>
        </div>

        <div class="col-12 col-md-6 col-lg-4">
          <q-card flat bordered class="q-pa-md full-height" data-test="qds-plugin-loading-card">
            <div class="text-subtitle1 qds-text-strong q-mb-xs">Loading surfaces</div>
            <div class="qds-text-muted q-mb-md">Custom Quasar loading options stay visible until their explicit cleanup action.</div>
            <div class="qds-button-row">
              <q-btn outline no-caps label="Show loading overlay" @click="showLoading" />
              <q-btn flat no-caps label="Hide loading overlay" data-test="qds-loading-hide" @click="hideLoading" />
              <q-btn outline no-caps label="Show grouped Loading precedence" data-test="qds-loading-grouped-trigger" @click="showGroupedLoading" />
              <q-btn flat no-caps label="Hide newer Loading group" data-test="qds-loading-hide-newer" @click="hideNewerLoadingGroup" />
              <q-btn outline no-caps label="Start loading bar" @click="startLoadingBar" />
              <q-btn flat no-caps label="Stop loading bar" @click="stopLoadingBar" />
            </div>
            <div class="qds-plugin-inner-loading-box q-mt-md" data-test="qds-plugin-inner-loading-box">
              <div class="qds-text-strong">Inline busy proof</div>
              <div class="qds-text-muted">QInnerLoading keeps plugin-overlay material without a timer.</div>
              <q-inner-loading showing label="Syncing" color="primary" class="qds-plugin-inner-loading" data-test="qds-plugin-inner-loading" />
            </div>
          </q-card>
        </div>
      </div>
    </q-card>

    <q-card class="q-pa-md" data-test="qds-plugin-status-card" data-testid="plugin-status-card">
      <div class="text-subtitle2 qds-text-muted q-mb-xs">Last plugin event</div>
      <div class="qds-text-strong" data-test="qds-plugin-status" data-testid="plugin-status">{{ status }}</div>
    </q-card>
  </div>
</template>

<style scoped>
.qds-plugin-inner-loading-box {
  position: relative;
  min-height: 6.5rem;
  padding: var(--qds-space-md);
  overflow: hidden;
  background: var(--qds-surface-1);
  border: var(--qds-border-width-control) solid var(--qds-border-subtle);
  border-radius: var(--qds-radius-lg);
}
</style>
