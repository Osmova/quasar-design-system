<script setup lang="ts">
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import {
  PhCalendarBlank,
  PhCheck,
  PhDotsThreeVertical,
  PhInfo,
  PhList,
  PhMagnifyingGlass,
  PhPlus,
  PhSidebar,
  PhSparkle,
} from '@phosphor-icons/vue'
import { ppArchive, ppBell, ppCopy, ppHouse, ppLink, ppPencilSimple, ppShareNetwork, ppTrash, ppX } from 'quasar-extras-svg-icons/phosphor-icons-v2'

const $q = useQuasar()

const colors = ['primary', 'secondary', 'accent', 'positive', 'negative', 'warning', 'info'] as const
const text = ref('')
const colorToggle = ref('week')
const colorToggleOptions = [{ label: 'Day', value: 'day' }, { label: 'Week', value: 'week' }, { label: 'Month', value: 'month' }, { label: 'Year', value: 'year', disable: true }]
const select = ref<string | null>(null)
const selectMultiple = ref(['Fluent', 'Ink'])
const selectOptions = ['Fluent', 'Ink', 'One']
const dialogOpen = ref(false)
const persistentDialogOpen = ref(false)
const maximizedDialogOpen = ref(false)
const bottomDialogOpen = ref(false)
const promptDialogOpen = ref(false)
const promptName = ref('Release notes')
const tooltipPositions = [
  { name: 'top', anchor: 'top middle', self: 'bottom middle' },
  { name: 'right', anchor: 'center right', self: 'center left' },
  { name: 'bottom', anchor: 'bottom middle', self: 'top middle' },
  { name: 'left', anchor: 'center left', self: 'center right' },
] as const
const horizontalTab = ref('overview')
const scrollTab = ref('tab-1')
const scrollTabs = Array.from({ length: 8 }, (_, index) => `tab-${index + 1}`)
const tooltipOpen = ref(false)
const drawerOpen = ref(true)
const drawerSeamlessOpen = ref(true)
const drawerMiniToOverlayOpen = ref(true)
const drawerMini = ref(true)
const page = ref(3)
const inputPage = ref(3)
const checkbox = ref(true)
const radio = ref('comfortable')
const toggle = ref(true)
const denseCheckbox = ref(true)
const denseRadio = ref('dense-comfortable')
const denseToggle = ref(true)
const slider = ref(42)
const range = ref({ min: 24, max: 76 })
const verticalTab = ref('network')

const tableColumns = [
  { name: 'surface', label: 'Surface', field: 'surface', align: 'left' as const, sortable: true },
  { name: 'density', label: 'Density', field: 'density', align: 'left' as const },
  { name: 'state', label: 'State', field: 'state', align: 'left' as const },
]

const tableRows = [
  { surface: 'Command card', density: 'Comfortable', state: 'Ready' },
  { surface: 'Data table', density: 'Dense', state: 'Audited' },
  { surface: 'Overlay menu', density: 'Compact', state: 'Tokenized' },
]

const tableVisibleColumns = ref(['surface', 'density'])
const tableFullscreen = ref(false)
const tableVisibleColumnOptions = tableColumns.map(({ name, label }) => ({ label, value: name }))

function notify(type: 'positive' | 'negative' | 'warning' | 'info') {
  $q.notify({
    type,
    message: `This is a ${type} notification`,
    position: 'bottom-right',
  })
}
</script>

<template>
  <div class="column no-wrap" style="gap: 1.5rem">
    <!-- QBtn -->
    <q-card class="q-pa-lg">
      <div class="text-h6 qds-display q-mb-md">QBtn</div>

      <div class="text-subtitle2 qds-text-muted q-mb-xs">Neutral default</div>
      <div class="qds-button-row q-mb-md">
        <q-btn label="Default" no-caps />
        <q-btn outline label="Outline" no-caps />
        <q-btn flat label="Subtle" no-caps />
        <q-btn label="Disabled" disable no-caps />
      </div>

      <div class="text-subtitle2 qds-text-muted q-mb-xs">Primary action</div>
      <div class="qds-button-row q-mb-md">
        <q-btn unelevated color="primary" label="Save" no-caps />
        <q-btn data-test="qds-control-standard-button" color="primary" label="Standard" no-caps />
        <q-btn label="Cancel" no-caps />
      </div>

      <div class="text-subtitle2 qds-text-muted q-mb-xs">Sizes (24 / 32 / 40)</div>
      <div class="qds-button-row q-mb-md">
        <q-btn size="sm" label="Small" no-caps />
        <q-btn label="Medium" no-caps />
        <q-btn size="lg" label="Large" no-caps />
        <q-btn dense unelevated color="primary" label="Dense" no-caps />
      </div>

      <div class="text-subtitle2 qds-text-muted q-mb-xs">Variant case &amp; <code>no-caps</code></div>
      <div class="qds-button-row q-mb-md">
        <q-btn unelevated color="primary" label="Variant case" data-test="qds-btn-variant-case" />
        <q-btn unelevated color="primary" label="Keeps its case" no-caps data-test="qds-btn-no-caps" />
      </div>

      <div class="text-subtitle2 qds-text-muted q-mb-xs">Dense row</div>
      <div class="row items-center no-wrap q-mb-md" style="gap: var(--qds-space-sm)" data-test="qds-dense-row">
        <q-input dense outlined model-value="" name="components-dense-row" placeholder="Filter" aria-label="Filter" />
        <q-btn dense outline label="Apply" no-caps />
        <q-btn dense unelevated color="primary" label="Run" />
      </div>

      <div class="text-subtitle2 qds-text-muted q-mb-xs">Round &amp; disabled</div>
      <div class="qds-button-row q-mb-lg">
        <q-btn round color="primary" aria-label="Add"><PhPlus :size="18" weight="regular" /></q-btn>
        <q-btn round outline aria-label="Confirm"><PhCheck :size="18" weight="regular" /></q-btn>
        <q-btn round flat aria-label="More"><PhDotsThreeVertical :size="18" weight="regular" /></q-btn>
        <q-btn unelevated color="primary" label="Disabled" disable no-caps />
      </div>

      <div class="text-subtitle1 qds-text-strong q-mb-xs">Role colours</div>
      <div class="qds-text-muted q-mb-md">Colour carries meaning (brand CTA and status); reach for it after the neutral set.</div>

      <div class="text-subtitle2 qds-text-muted q-mb-xs">Solid (<code>color</code> + <code>unelevated</code>)</div>
      <div class="qds-button-row q-mb-md">
        <q-btn v-for="c in colors" :key="`u-${c}`" unelevated :color="c" :label="c" no-caps />
      </div>

      <div class="text-subtitle2 qds-text-muted q-mb-xs">Outline</div>
      <div class="qds-button-row q-mb-md">
        <q-btn v-for="c in colors" :key="`o-${c}`" :data-test="c === 'primary' ? 'qds-control-outline-button' : undefined" outline :color="c" :label="c" no-caps />
      </div>

      <div class="text-subtitle2 qds-text-muted q-mb-xs">Flat</div>
      <div class="qds-button-row q-mb-md">
        <q-btn flat color="primary" label="Flat" no-caps />
        <q-btn flat color="negative" label="Flat" no-caps />
      </div>

      <div class="text-subtitle2 qds-text-muted q-mb-xs">Tonal (opt-in <code>qds-tonal</code>)</div>
      <div class="qds-button-row">
        <q-btn v-for="c in colors" :key="`t-${c}`" unelevated class="qds-tonal" :color="c" :label="c" no-caps />
      </div>
    </q-card>

    <!-- QBadge + QChip -->
    <q-card class="q-pa-lg">
      <div class="text-h6 qds-display q-mb-md">QBadge &amp; QChip</div>
      <div class="text-subtitle2 qds-text-muted q-mb-xs">Badges: neutral tint, solid <code>color</code>, opt-in <code>qds-tonal</code></div>
      <div class="qds-button-row q-mb-sm">
        <q-badge label="Neutral" />
        <q-badge v-for="c in colors" :key="`b-${c}`" :color="c" :label="c" />
        <q-badge class="qds-demo-icon-badge" color="primary"><PhSparkle :size="14" weight="duotone" /> Status</q-badge>
      </div>
      <div class="qds-button-row q-mb-md">
        <q-badge v-for="c in colors" :key="`bt-${c}`" class="qds-tonal" :color="c" :label="c" />
      </div>
      <div class="text-subtitle2 qds-text-muted q-mb-xs">Chips: neutral default, <code>color</code> tint, opt-in <code>qds-solid</code></div>
      <div class="qds-button-row">
        <q-chip label="Neutral" />
        <q-chip color="primary" label="Primary" />
        <q-chip color="positive"><PhCheck :size="16" weight="regular" /> Done</q-chip>
        <q-chip color="warning" label="Removable" removable />
        <q-chip outline color="accent" label="Outline" />
        <q-chip clickable color="info" label="Clickable" />
        <q-chip dense color="info"><PhInfo :size="14" weight="regular" /> Dense</q-chip>
        <q-chip class="qds-solid" color="primary" label="Solid" />
        <q-chip color="grey" label="Grey" data-test="qds-chip-grey" />
      </div>
      <div class="text-subtitle2 qds-text-muted q-mt-md q-mb-xs">Floating, multiline, square &amp; avatar</div>
      <div class="qds-button-row items-start q-pt-sm">
        <q-btn outline no-caps label="Inbox" data-test="qds-badge-floating">
          <q-badge color="negative" floating>4</q-badge>
        </q-btn>
        <q-btn-group outline data-test="qds-badge-floating-group">
          <q-btn outline no-caps label="Queue">
            <q-badge color="negative" floating>99+</q-badge>
          </q-btn>
          <q-btn outline no-caps label="Done" />
        </q-btn-group>
        <q-btn-toggle v-model="colorToggle" color="primary" no-caps :options="colorToggleOptions" data-test="qds-toggle-color" />
        <q-badge multi-line color="info" class="qds-demo-multiline-badge" data-test="qds-badge-multiline">
          Multiline badges wrap long status text onto a second line
        </q-badge>
        <q-chip square color="primary" label="Square" data-test="qds-chip-square" />
        <q-chip data-test="qds-chip-avatar">
          <q-avatar color="primary" text-color="white">QD</q-avatar>
          Design owner
        </q-chip>
      </div>
    </q-card>

    <!-- QCard -->
    <q-card class="q-pa-lg">
      <div class="text-h6 qds-display q-mb-md">QCard</div>
      <div class="row q-col-gutter-md">
        <div class="col-12 col-sm-6 col-md-4">
          <q-card data-test="qds-card-header-action">
            <q-card-section horizontal class="qds-card__header items-center">
              <div class="col">
                <div class="text-subtitle1 qds-text-strong">Card header action</div>
                <div class="qds-text-muted">Round actions keep the card-header inset.</div>
              </div>
              <q-btn flat round aria-label="Card options"><PhDotsThreeVertical :size="18" weight="regular" /></q-btn>
            </q-card-section>
            <q-card-actions align="right">
              <q-btn flat color="primary" label="Action" no-caps />
            </q-card-actions>
          </q-card>
        </div>
        <div class="col-12 col-sm-6 col-md-4">
          <div class="qds-glass q-pa-md" style="border-radius: var(--qds-card-radius)">
            <div class="text-subtitle1 qds-text-strong">Acrylic surface</div>
            <div class="qds-text-muted">.qds-glass utility for shared blur + saturate + border-mix treatment.</div>
          </div>
        </div>
      </div>
    </q-card>

    <!-- QInput / field -->
    <q-card class="q-pa-lg">
      <div class="text-h6 qds-display q-mb-md">QInput / QSelect</div>
      <div class="text-subtitle2 qds-text-muted q-mb-sm">Default: label above the control</div>
      <div class="row q-col-gutter-md">
        <div class="col-12 col-sm-6 column" style="gap: var(--qds-space-md)">
          <div data-test="qds-control-input">
            <q-input v-model="text" name="components-outlined" label="Outlined" outlined clearable />
          </div>
          <q-input model-value="Search" name="components-search" label="With icon" outlined>
            <template #prepend><PhMagnifyingGlass :size="18" weight="regular" /></template>
          </q-input>
          <div data-test="qds-control-input-filled">
            <q-input model-value="" name="components-filled" label="Filled" filled />
          </div>
          <div data-test="qds-control-input-error">
            <q-input model-value="" name="components-error" label="With error" outlined error error-message="Required field" />
          </div>
        </div>
        <div class="col-12 col-sm-6 column" style="gap: var(--qds-space-md)">
          <div data-test="qds-control-select">
            <q-select v-model="select" name="components-select" :options="selectOptions" label="Outlined select" outlined />
          </div>
          <div data-test="qds-control-select-multiple">
            <q-select
              v-model="selectMultiple"
              name="components-select-multiple"
              :options="selectOptions"
              label="Multiple select"
              filled
              multiple
              use-chips
            />
          </div>
          <div data-test="qds-control-select-dense">
            <q-select v-model="select" name="components-select-dense" :options="selectOptions" label="Dense select" outlined dense />
          </div>
          <div data-test="qds-control-input-disabled">
            <q-input model-value="" name="components-disabled" label="Disabled" outlined disable />
          </div>
        </div>
      </div>

      <div class="text-subtitle1 qds-text-strong q-mt-lg q-mb-xs">Opt-in field variants</div>
      <div class="qds-text-muted q-mb-md">Add a class per field when a form needs the older floating or side-label layouts.</div>
      <div class="qds-field-demo-grid">
        <div data-test="qds-field-float">
          <div class="qds-text-muted q-mb-xs"><code>qds-field--float</code> (empty)</div>
          <q-input model-value="" name="components-float" label="Floating label" outlined class="qds-field--float" />
        </div>
        <div data-test="qds-field-float-value">
          <div class="qds-text-muted q-mb-xs"><code>qds-field--float</code> (with value)</div>
          <q-input model-value="Floated value" name="components-float-value" label="Floating label" outlined class="qds-field--float" />
        </div>
        <div data-test="qds-field-stacked-animated">
          <div class="qds-text-muted q-mb-xs"><code>qds-field--stacked-animated</code></div>
          <q-input model-value="Filled value" name="components-stacked-animated" label="Animated top" outlined class="qds-field--stacked-animated" />
        </div>
      </div>

      <div class="qds-form--label-start qds-form--label-start-md q-mt-md" data-test="qds-field-start-form">
        <div class="qds-text-muted"><code>qds-form--label-start</code> + <code>qds-field--start</code></div>
        <q-input model-value="" name="components-start-first" label="First name" outlined class="qds-field--start" />
        <q-input model-value="" name="components-start-last" label="Last name" outlined class="qds-field--start" />
      </div>
    </q-card>

    <!-- Standalone outlined field (no card ancestor) for label-bg regression -->
    <div data-test="qds-control-input-standalone" class="q-pa-md" style="max-width: 20rem">
      <q-input model-value="value" name="components-standalone" label="Standalone outlined" outlined />
    </div>

    <!-- QDialog / overlays -->
    <q-card class="q-pa-lg">
      <div class="text-h6 qds-display q-mb-md">Dialogs, tooltips &amp; popups</div>
      <div class="qds-button-row">
        <q-btn unelevated color="primary" label="Open dialog" no-caps @click="dialogOpen = true" />
        <q-btn outline color="info" no-caps @click="tooltipOpen = !tooltipOpen">
          Tooltip target
          <PhInfo :size="18" weight="regular" />
          <q-tooltip v-model="tooltipOpen" anchor="top middle" self="bottom middle" no-parent-event>
            Tokenized tooltip surface with QDS depth.
          </q-tooltip>
        </q-btn>
        <q-btn outline color="accent" no-caps>
          Popup proxy
          <PhCalendarBlank :size="18" weight="regular" />
          <q-popup-proxy>
            <div class="q-pa-md" style="min-width: 220px">
              <div class="text-subtitle2 qds-text-strong q-mb-xs">Popup surface</div>
              <div class="qds-text-muted">Uses menu tokens for radius, border, and depth.</div>
            </div>
          </q-popup-proxy>
        </q-btn>
      </div>

      <div class="text-subtitle2 qds-text-muted q-mt-md q-mb-xs">Dialog modes</div>
      <div class="qds-button-row">
        <q-btn outline no-caps label="Persistent dialog" data-test="qds-dialog-persistent-trigger" @click="persistentDialogOpen = true" />
        <q-btn outline no-caps label="Maximized dialog" data-test="qds-dialog-maximized-trigger" @click="maximizedDialogOpen = true" />
        <q-btn outline no-caps label="Bottom dialog" data-test="qds-dialog-bottom-trigger" @click="bottomDialogOpen = true" />
        <q-btn outline no-caps label="Prompt dialog" data-test="qds-dialog-prompt-trigger" @click="promptDialogOpen = true" />
      </div>

      <div class="text-subtitle2 qds-text-muted q-mt-md q-mb-xs">Tooltip positions &amp; delay</div>
      <div class="qds-button-row" data-test="qds-tooltip-triggers">
        <q-btn v-for="position in tooltipPositions" :key="position.name" flat no-caps :label="`Tooltip ${position.name}`" :data-test="`qds-tooltip-${position.name}-trigger`">
          <q-tooltip :anchor="position.anchor" :self="position.self" :data-test="`qds-tooltip-${position.name}`">Placed {{ position.name }}</q-tooltip>
        </q-btn>
        <q-btn flat no-caps label="Delayed tooltip" data-test="qds-tooltip-delay-trigger">
          <q-tooltip :delay="600" data-test="qds-tooltip-delay">Appears after a 600ms delay</q-tooltip>
        </q-btn>
      </div>

      <q-dialog v-model="dialogOpen">
        <q-card>
          <q-card-section>
            <div class="text-h6 qds-display">Delete draft?</div>
            <div class="qds-text-muted q-mt-sm">
              Dialogs use a plain scrim, an 8px overlay radius, and a neutral secondary action.
            </div>
          </q-card-section>
          <q-card-actions align="right">
            <q-btn flat label="Cancel" no-caps v-close-popup />
            <q-btn unelevated color="negative" label="Delete" no-caps v-close-popup />
          </q-card-actions>
        </q-card>
      </q-dialog>

      <q-dialog v-model="persistentDialogOpen" persistent>
        <q-card data-test="qds-dialog-persistent">
          <q-card-section>
            <div class="text-h6 qds-display">Unsaved changes</div>
            <div class="qds-text-muted q-mt-sm">Persistent dialogs ignore scrim clicks and Escape until an action is chosen.</div>
          </q-card-section>
          <q-card-actions align="right">
            <q-btn flat label="Keep editing" no-caps v-close-popup />
            <q-btn unelevated color="primary" label="Discard changes" no-caps v-close-popup />
          </q-card-actions>
        </q-card>
      </q-dialog>

      <q-dialog v-model="maximizedDialogOpen" maximized>
        <q-card data-test="qds-dialog-maximized">
          <q-toolbar>
            <q-toolbar-title>Maximized surface</q-toolbar-title>
            <q-btn flat round aria-label="Close maximized dialog" v-close-popup><q-icon :name="ppX" /></q-btn>
          </q-toolbar>
          <q-card-section class="qds-text-muted">
            Maximized dialogs fill the viewport and drop the card radius.
          </q-card-section>
        </q-card>
      </q-dialog>

      <q-dialog v-model="bottomDialogOpen" position="bottom">
        <q-card data-test="qds-dialog-bottom" style="width: 28rem; max-width: 100%">
          <q-list>
            <q-item v-close-popup clickable>
              <q-item-section avatar><q-icon :name="ppShareNetwork" /></q-item-section>
              <q-item-section>Share link</q-item-section>
            </q-item>
            <q-item v-close-popup clickable>
              <q-item-section avatar><q-icon :name="ppCopy" /></q-item-section>
              <q-item-section>Copy to workspace</q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </q-dialog>

      <q-dialog v-model="promptDialogOpen">
        <q-card data-test="qds-dialog-prompt" style="width: 24rem; max-width: 100%">
          <q-form @submit.prevent="promptDialogOpen = false">
            <q-card-section>
              <div class="text-h6 qds-display">Rename document</div>
            </q-card-section>
            <q-card-section class="q-pt-none">
              <q-input v-model="promptName" name="components-prompt-name" label="Document name" outlined autofocus />
            </q-card-section>
            <q-card-actions align="right">
              <q-btn flat label="Cancel" no-caps v-close-popup />
              <q-btn unelevated color="primary" type="submit" label="Rename" no-caps />
            </q-card-actions>
          </q-form>
        </q-card>
      </q-dialog>
    </q-card>

    <!-- QTable / pagination -->
    <q-card class="q-pa-lg">
      <div class="text-h6 qds-display q-mb-md">QTable &amp; QPagination</div>
      <div>
        <q-table
          :rows="tableRows"
          :columns="tableColumns"
          row-key="surface"
          v-model:visible-columns="tableVisibleColumns"
          v-model:fullscreen="tableFullscreen"
          dark
          dense
          flat
          :class="{ 'q-mb-md': !tableFullscreen }"
          data-test="qds-table-official-modes"
        >
          <template #top="scope">
            <div class="row items-center full-width q-col-gutter-sm">
              <div class="col-grow">
                <div class="text-subtitle1 qds-text-strong">Surface audit</div>
                <div class="qds-text-muted">Explicit dark mode with selectable columns and custom table controls.</div>
              </div>
              <div class="col-auto">
                <q-select
                  v-model="tableVisibleColumns"
                  :options="tableVisibleColumnOptions"
                  option-label="label"
                  option-value="value"
                  emit-value
                  map-options
                  multiple
                  dense
                  outlined
                  label="Visible columns"
                  aria-label="Visible table columns"
                  style="min-width: 11rem"
                />
              </div>
              <div class="col-auto">
                <q-btn
                  flat
                  color="primary"
                  no-caps
                  :label="scope.inFullscreen ? 'Exit fullscreen' : 'View fullscreen'"
                  :aria-label="scope.inFullscreen ? 'Exit table fullscreen' : 'View table fullscreen'"
                  @click="scope.toggleFullscreen"
                />
              </div>
            </div>
          </template>
          <template #bottom="scope">
            <div class="row items-center justify-between full-width q-col-gutter-sm">
              <div class="col qds-text-muted">Showing {{ tableRows.length }} audited surfaces</div>
              <div class="col-auto qds-text-muted">Page {{ scope.pagination.page }} of {{ scope.pagesNumber }}</div>
            </div>
          </template>
        </q-table>
        <q-table
          :rows="tableRows"
          :columns="tableColumns"
          row-key="surface"
          hide-header
          hide-bottom
          dense
          flat
          data-test="qds-table-no-chrome"
        />
      </div>
      <q-pagination v-model="page" data-test="qds-pagination" :max="7" direction-links boundary-links color="primary" />
      <div class="q-mt-md" role="group" aria-label="Input mode pagination">
        <q-pagination
          v-model="inputPage"
          input
          data-test="qds-pagination-input"
          :max="7"
          direction-links
          boundary-links
          color="primary"
        />
        <div class="qds-text-muted q-mt-xs" data-test="qds-pagination-input-current-page">Current page: {{ inputPage }}</div>
      </div>
    </q-card>

    <q-card data-test="qds-card-table-composition">
      <q-card-section>
        <div class="text-h6 qds-display">Flush card table</div>
        <div class="qds-text-muted">The card owns the outer frame; the direct table keeps a clean section separator.</div>
      </q-card-section>
      <q-markup-table flat bordered dense data-test="qds-flush-card-table">
        <thead>
          <tr>
            <th class="text-left">Resource</th>
            <th class="text-right">Usage</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Memory</td>
            <td class="text-right">42%</td>
          </tr>
          <tr>
            <td>Storage</td>
            <td class="text-right">68%</td>
          </tr>
        </tbody>
      </q-markup-table>
    </q-card>

    <!-- QTabs -->
    <q-card class="q-pa-lg">
      <div class="text-h6 qds-display q-mb-md">QTabs</div>
      <div class="row q-col-gutter-md">
        <div class="col-12 col-md-5">
          <q-tabs v-model="verticalTab" vertical align="left" no-caps class="qds-card qds-vertical-tabs-demo q-pa-xs" data-test="qds-tabs-vertical">
            <q-tab name="home" label="Home" />
            <q-tab name="network" label="Network & internet" />
            <q-tab name="personalization" label="Personalization" />
          </q-tabs>
        </div>
        <div class="col-12 col-md-7">
          <div class="qds-card q-pa-md" style="border-radius: var(--qds-radius-md)">
            <div class="text-subtitle1 qds-text-strong">Short rounded rail</div>
            <div class="qds-text-muted">
              Active tabs use a tokenized 2px accent underline that respects padding and avoids boxed fills.
            </div>
          </div>
        </div>
      </div>
      <div class="row q-col-gutter-md q-mt-sm">
        <div class="col-12 col-md-7">
          <div class="text-subtitle2 qds-text-muted q-mb-xs">Icons, badge &amp; disabled</div>
          <q-tabs v-model="horizontalTab" align="left" no-caps data-test="qds-tabs-horizontal">
            <q-tab name="overview" :icon="ppHouse" label="Overview" />
            <q-tab name="alerts" :icon="ppBell" label="Alerts">
              <q-badge color="negative" floating>3</q-badge>
            </q-tab>
            <q-tab name="archive" :icon="ppArchive" label="Archive" disable />
          </q-tabs>
        </div>
        <div class="col-12 col-md-5">
          <div class="text-subtitle2 qds-text-muted q-mb-xs">Scroll arrows</div>
          <q-tabs v-model="scrollTab" dense no-caps outside-arrows mobile-arrows class="qds-demo-scroll-tabs" data-test="qds-tabs-scroll">
            <q-tab v-for="(name, index) in scrollTabs" :key="name" :name="name" :label="`Section ${index + 1}`" />
          </q-tabs>
        </div>
      </div>
    </q-card>

    <!-- QDrawer / layout shell -->
    <q-card class="q-pa-lg">
      <div class="row items-center justify-between q-mb-md">
        <div class="text-h6 qds-display">QDrawer / layout shell</div>
        <q-btn dense outline color="primary" no-caps @click="drawerOpen = !drawerOpen">
          <PhSidebar :size="18" weight="regular" /> Toggle drawer
        </q-btn>
      </div>
      <q-layout view="hHh lpR fFf" container style="height: 320px; border-radius: var(--qds-card-radius); overflow: hidden">
        <q-drawer v-model="drawerOpen" data-test="qds-drawer" show-if-above bordered :width="220">
          <q-list role="none">
            <q-item clickable active>
              <q-item-section avatar><PhSparkle :size="18" weight="duotone" /></q-item-section>
              <q-item-section>Overview</q-item-section>
            </q-item>
            <q-item clickable>
              <q-item-section avatar><PhList :size="18" weight="regular" /></q-item-section>
              <q-item-section>Components</q-item-section>
            </q-item>
          </q-list>
        </q-drawer>
        <q-page-container>
          <q-page class="q-pa-md">
            <div class="qds-card q-pa-md" style="border-radius: var(--qds-radius-md)">
              <div class="text-subtitle1 qds-text-strong">Content shell</div>
              <div class="qds-text-muted">Drawer surfaces share the same acrylic, border, and active-list language.</div>
            </div>
            <!-- QPageSticky: generic layout helper — transparent surface, anchored to page edge -->
            <q-page-sticky position="bottom-right" :offset="[12, 12]">
              <q-btn round color="primary" size="sm" aria-label="Sticky action">
                <PhPlus :size="16" weight="regular" />
              </q-btn>
            </q-page-sticky>
            <!-- QPageScroller: deterministic scroll-to-top in a tall page.
                 Docs-only in the gallery because the demo container is too short
                 to trigger the scroll threshold reliably. The override in
                 _footer.scss resets its background to transparent. -->
          </q-page>
        </q-page-container>
        <q-footer bordered class="qds-layout-footer-demo">
          <q-toolbar class="q-px-md" style="min-height: 2.25rem">
            <div class="qds-text-muted" style="font-size: 0.8125rem">Footer surface — tokenized border-top, shared marginal background.</div>
          </q-toolbar>
        </q-footer>
      </q-layout>

      <div class="row q-col-gutter-md q-mt-md">
        <div class="col-12 col-md-6">
          <div class="text-subtitle2 qds-text-muted q-mb-sm">Seamless drawer</div>
          <q-layout view="hHh lpR fFf" container style="height: 190px; border-radius: var(--qds-card-radius); overflow: hidden">
            <q-drawer v-model="drawerSeamlessOpen" data-test="qds-drawer-seamless" behavior="desktop" :width="164">
              <q-list role="none">
                <q-item clickable active>
                  <q-item-section avatar><PhSparkle :size="18" weight="duotone" /></q-item-section>
                  <q-item-section>Overview</q-item-section>
                </q-item>
              </q-list>
            </q-drawer>
            <q-page-container>
              <q-page class="q-pa-md">
                <q-btn dense flat color="primary" no-caps :label="drawerSeamlessOpen ? 'Hide seamless drawer' : 'Show seamless drawer'" @click="drawerSeamlessOpen = !drawerSeamlessOpen" />
                <div class="qds-text-muted q-mt-sm">The layout stays continuous when the drawer has no explicit border.</div>
              </q-page>
            </q-page-container>
          </q-layout>
        </div>

        <div class="col-12 col-md-6">
          <div class="text-subtitle2 qds-text-muted q-mb-sm">Mini to overlay drawer</div>
          <q-layout view="hHh lpR fFf" container style="height: 190px; border-radius: var(--qds-card-radius); overflow: hidden">
            <q-drawer
              v-model="drawerMiniToOverlayOpen"
              :mini="drawerMini"
              mini-to-overlay
              behavior="desktop"
              :mini-width="62"
              :width="184"
              bordered
              data-test="qds-drawer-mini-overlay"
            >
              <template #mini>
                <q-list>
                  <q-item aria-label="Overview">
                    <q-item-section avatar><PhSparkle :size="18" weight="duotone" /></q-item-section>
                  </q-item>
                </q-list>
              </template>
              <q-list role="none">
                <q-item clickable active>
                  <q-item-section avatar><PhSparkle :size="18" weight="duotone" /></q-item-section>
                  <q-item-section>Overview</q-item-section>
                </q-item>
                <q-item clickable>
                  <q-item-section avatar><PhList :size="18" weight="regular" /></q-item-section>
                  <q-item-section>Components</q-item-section>
                </q-item>
              </q-list>
            </q-drawer>
            <q-page-container>
              <q-page class="q-pa-md">
                <q-btn dense flat color="primary" no-caps :label="drawerMini ? 'Expand mini drawer' : 'Collapse mini drawer'" @click="drawerMini = !drawerMini" />
                <div class="qds-text-muted q-mt-sm">The expanded drawer overlays this content instead of shifting it.</div>
              </q-page>
            </q-page-container>
          </q-layout>
        </div>
      </div>
    </q-card>

    <!-- Form controls -->
    <q-card class="q-pa-lg">
      <div class="text-h6 qds-display q-mb-md">Selection controls</div>
      <div class="row q-col-gutter-lg">
        <div class="col-12 col-md-5 column" style="gap: .75rem">
          <q-checkbox v-model="checkbox" name="components-checkbox" label="Checkbox selected" />
          <q-radio v-model="radio" name="components-radio-comfortable" val="comfortable" label="Comfortable density" />
          <q-radio v-model="radio" name="components-radio-compact" val="compact" label="Compact density" />
          <q-toggle v-model="toggle" name="components-toggle" label="Enable tonal surfaces" />
          <div class="qds-text-muted q-mt-sm">Dense controls keep Quasar's compact branch.</div>
          <q-checkbox v-model="denseCheckbox" name="components-dense-checkbox" dense label="Dense checkbox" />
          <q-radio v-model="denseRadio" name="components-dense-radio-comfortable" dense val="dense-comfortable" label="Dense radio selected" />
          <q-radio v-model="denseRadio" name="components-dense-radio-compact" dense val="dense-compact" label="Dense radio unselected" />
          <q-toggle v-model="denseToggle" name="components-dense-toggle" dense label="Dense toggle" />
        </div>
        <div class="col-12 col-md-7">
          <div class="text-subtitle2 qds-text-muted q-mb-sm">Slider</div>
          <q-slider v-model="slider" name="components-slider" :min="0" :max="100" label color="primary" />
          <div class="qds-text-muted">Current value: {{ slider }}</div>
          <div class="text-subtitle2 qds-text-muted q-mt-md q-mb-sm">Range</div>
          <q-range v-model="range" name="components-range" :min="0" :max="100" label color="primary" />
        </div>
      </div>
    </q-card>

    <!-- QMenu + QToolbar -->
    <q-card class="q-pa-lg">
      <div class="text-h6 qds-display q-mb-md">QMenu &amp; QToolbar</div>
      <q-toolbar class="qds-card q-mb-md" style="border-radius: var(--qds-radius-md)">
        <q-btn flat round aria-label="Menu"><PhList :size="20" weight="regular" /></q-btn>
        <q-toolbar-title>Toolbar surface</q-toolbar-title>
        <q-btn flat round aria-label="More actions">
          <PhDotsThreeVertical :size="20" weight="regular" />
          <q-menu :offset="[0, 4]">
            <q-list style="min-width: 180px">
              <q-item v-close-popup clickable>
                <q-item-section>Edit</q-item-section>
              </q-item>
              <q-item v-close-popup clickable>
                <q-item-section>Duplicate</q-item-section>
              </q-item>
              <q-separator />
              <q-item v-close-popup clickable>
                <q-item-section class="text-negative">Delete</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </q-toolbar>
      <q-btn unelevated color="primary" label="Open menu" no-caps>
        <q-menu :offset="[0, 4]">
          <q-list style="min-width: 160px">
            <q-item v-close-popup clickable><q-item-section>Fluent</q-item-section></q-item>
            <q-item v-close-popup clickable><q-item-section>Ink</q-item-section></q-item>
            <q-item v-close-popup clickable><q-item-section>One</q-item-section></q-item>
          </q-list>
        </q-menu>
      </q-btn>

      <div class="text-subtitle2 qds-text-muted q-mt-md q-mb-xs">Dense, sectioned &amp; context menus</div>
      <div class="qds-button-row items-stretch">
        <q-btn outline no-caps label="Dense menu" data-test="qds-menu-dense-trigger">
          <q-menu :offset="[0, 4]" data-test="qds-menu-dense">
            <q-list dense style="min-width: 160px">
              <q-item v-close-popup clickable><q-item-section>Rename</q-item-section></q-item>
              <q-item v-close-popup clickable><q-item-section>Move</q-item-section></q-item>
              <q-item v-close-popup clickable><q-item-section>Export</q-item-section></q-item>
            </q-list>
          </q-menu>
        </q-btn>
        <q-btn outline no-caps label="Sectioned menu" data-test="qds-menu-sections-trigger">
          <q-menu :offset="[0, 4]" data-test="qds-menu-sections">
            <q-list style="min-width: 220px">
              <q-item-label header>Edit</q-item-label>
              <q-item v-close-popup clickable>
                <q-item-section avatar><q-icon :name="ppPencilSimple" /></q-item-section>
                <q-item-section>Rename</q-item-section>
                <q-item-section side>F2</q-item-section>
              </q-item>
              <q-item v-close-popup clickable>
                <q-item-section avatar><q-icon :name="ppCopy" /></q-item-section>
                <q-item-section>Duplicate</q-item-section>
                <q-item-section side>Ctrl+D</q-item-section>
              </q-item>
              <q-separator />
              <q-item-label header>Share</q-item-label>
              <q-item v-close-popup clickable>
                <q-item-section avatar><q-icon :name="ppLink" /></q-item-section>
                <q-item-section>Copy link</q-item-section>
              </q-item>
              <q-item disable>
                <q-item-section avatar><q-icon :name="ppShareNetwork" /></q-item-section>
                <q-item-section>Publish externally</q-item-section>
              </q-item>
              <q-separator />
              <q-item v-close-popup clickable>
                <q-item-section avatar><q-icon :name="ppTrash" color="negative" /></q-item-section>
                <q-item-section class="text-negative">Move to trash</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
        <div class="qds-demo-context-target" tabindex="0" data-test="qds-menu-context-target">
          Right-click this area
          <q-menu touch-position context-menu data-test="qds-menu-context">
            <q-list dense style="min-width: 180px">
              <q-item v-close-popup clickable><q-item-section>Cut</q-item-section></q-item>
              <q-item v-close-popup clickable><q-item-section>Copy</q-item-section></q-item>
              <q-item v-close-popup clickable><q-item-section>Paste</q-item-section></q-item>
            </q-list>
          </q-menu>
        </div>
      </div>
    </q-card>

    <!-- QNotification -->
    <q-card class="q-pa-lg">
      <div class="text-h6 qds-display q-mb-md">Notifications</div>
      <div class="qds-button-row">
        <q-btn unelevated color="positive" label="Positive" no-caps @click="notify('positive')" />
        <q-btn unelevated color="negative" label="Negative" no-caps @click="notify('negative')" />
        <q-btn unelevated color="warning" label="Warning" no-caps @click="notify('warning')" />
        <q-btn unelevated color="info" label="Info" no-caps @click="notify('info')" />
      </div>
    </q-card>
  </div>
</template>

<style scoped>
.qds-demo-multiline-badge {
  max-width: 12rem;
}

.qds-demo-scroll-tabs {
  max-width: 18rem;
}

.qds-demo-context-target {
  display: flex;
  align-items: center;
  min-height: 2.25rem;
  padding-inline: var(--qds-space-md);
  color: var(--qds-text-muted);
  border: 1px dashed var(--qds-border-subtle);
  border-radius: var(--qds-radius-md);
}
</style>
