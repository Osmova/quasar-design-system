<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { QAvatar, QBadge, QBtn, QBtnGroup, QBtnToggle, QDrawer, QExpansionItem, QFile, QFooter, QHeader, QIcon, QInfiniteScroll, QInput, QItem, QItemLabel, QItemSection, QKnob, QLayout, QList, QPage, QPageContainer, QPageSticky, QPullToRefresh, QRange, QScrollArea, QSlideItem, QSlider, QSpinner, QSplitter, QTable, QToolbar, QToolbarTitle } from 'quasar'
import { ppPlus } from 'quasar-extras-svg-icons/phosphor-icons-v2'
const density = ref('comfortable')
const drawer = ref(true)
const mini = ref(false)
const tableGrid = ref(false)
const tableFullscreen = ref(false)
const expanded = ref(true)
const slider = ref(50)
const range = ref({ min: 25, max: 75 })
const split = ref(45)
const text = ref('Value')
const files = ref([new File(['Selected file'], 'selected.txt')])
const columns = [{ name: 'name', field: 'name', label: 'Name', sortable: true }]
const rows = [{ id: 'alex', name: 'Alex Morgan' }]
const selected = ref(rows)
const inputVariants = ['outlined', 'filled', 'standout', 'borderless'] as const
const knob = ref(50)
const refreshPending = ref(false)
let finishRefresh: (() => void) | undefined
function beginRefresh(done: () => void) { finishRefresh = done; refreshPending.value = true }
function completeRefresh() { finishRefresh?.(); finishRefresh = undefined; refreshPending.value = false }
const infinite = ref<{ trigger: () => void; stop: () => void }>()
let finishInfinite: ((stop?: boolean) => void) | undefined
function beginInfinite(_index: number, done: (stop?: boolean) => void) { finishInfinite = done }
onMounted(async () => { await nextTick(); infinite.value?.trigger() })
onBeforeUnmount(() => { completeRefresh(); finishInfinite?.(true); infinite.value?.stop() })
</script>
<template>
  <section aria-label="Native variant and state inventory" data-native="states" style="display: grid; gap: 16px; min-width: 0">
    <div style="display: flex; flex-wrap: wrap; gap: 8px" data-native="button-states">
      <q-btn dense no-caps label="Dense" /><q-btn square no-caps label="Square" /><q-btn outline no-caps label="Outline" /><q-btn push no-caps label="Push" />
      <q-btn loading no-caps label="Loading" /><q-btn disable no-caps label="Disabled" />
      <q-btn-group flat><q-btn flat no-caps label="Flat One" /><q-btn flat no-caps label="Flat Two" /></q-btn-group>
      <q-btn-group outline><q-btn outline no-caps label="Outline One" /><q-btn outline no-caps label="Outline Two" /></q-btn-group>
      <q-btn-toggle v-model="density" color="primary" no-caps :options="[{ label: 'Comfortable', value: 'comfortable' }, { label: 'Compact', value: 'compact' }, { label: 'Disabled', value: 'disabled', disable: true }]" />
    </div>
    <div data-native="field-states">
      <q-input v-for="variant in inputVariants" :key="variant" v-model="text" v-bind="{ [variant]: true }" :label="variant" />
      <q-input v-model="text" readonly dense outlined label="Readonly" /><q-input v-model="text" disable filled label="Disabled" />
      <q-input v-model="text" type="number" label="Number" /><q-input v-model="text" stack-label label="Stack label" />
      <q-file v-model="files" multiple use-chips clearable counter outlined label="Selected files" />
    </div>
    <div data-native="slider-states" style="display: flex; gap: 24px; flex-wrap: wrap">
      <q-slider v-model="slider" readonly label label-always style="width: 200px" /><q-slider v-model="slider" disable style="width: 200px" />
      <q-slider v-model="slider" vertical label label-always markers style="height: 180px" /><q-range v-model="range" vertical label label-always style="height: 180px" />
    </div>
    <q-list bordered data-native="list-states"><q-item clickable active><q-item-section avatar><q-avatar>AM</q-avatar></q-item-section><q-item-section><q-item-label>Active</q-item-label><q-item-label caption>Caption</q-item-label></q-item-section><q-item-section side><q-icon :name="ppPlus" /></q-item-section></q-item><q-item dense disable><q-item-section>Disabled dense</q-item-section></q-item><q-expansion-item v-model="expanded" label="Expandable"><q-item><q-item-section>Expanded content</q-item-section></q-item></q-expansion-item></q-list>
    <q-btn no-caps label="Table grid" @click="tableGrid = !tableGrid" /><q-btn no-caps label="Table fullscreen" @click="tableFullscreen = !tableFullscreen" />
    <q-table v-model:selected="selected" v-model:fullscreen="tableFullscreen" :grid="tableGrid" :rows="rows" :columns="columns" row-key="id" selection="multiple" data-native="state-table"><template #top-right><q-btn no-caps :label="tableFullscreen ? 'Exit table fullscreen' : 'Enter table fullscreen'" @click="tableFullscreen = !tableFullscreen" /></template></q-table>
    <q-table :rows="[]" :columns="columns" row-key="id" data-native="empty-table" />
    <q-table :rows="rows" :columns="columns" row-key="id" loading data-native="loading-table" />
    <q-btn no-caps label="Drawer mini" @click="mini = !mini" />
    <q-layout container view="hHh Lpr fFf" style="height: 300px" data-native="layout">
      <q-header><q-toolbar><q-toolbar-title>Native header</q-toolbar-title></q-toolbar></q-header>
      <q-drawer v-model="drawer" :mini="mini" :breakpoint="0" :width="140" show-if-above bordered><q-list><q-item clickable active><q-item-section>Sidebar</q-item-section></q-item></q-list></q-drawer>
      <q-page-container><q-page style="min-height: 200px"><q-scroll-area style="height: 180px" visible><div style="height: 400px">Scroller children</div></q-scroll-area><q-page-sticky position="bottom-right" :offset="[8, 8]"><q-btn round :icon="ppPlus" aria-label="Sticky add" /></q-page-sticky></q-page></q-page-container>
      <q-footer><q-toolbar><q-toolbar-title>Native footer</q-toolbar-title></q-toolbar></q-footer>
    </q-layout>
    <q-splitter v-model="split" style="height: 160px" data-native="state-splitter"><template #before>Before</template><template #after>After</template></q-splitter>
    <q-knob v-model="knob" show-value size="64px" data-native="state-knob" />
    <div id="native-refresh-scroll" data-native="refresh-scroll" style="height: 180px; overflow-y: auto">
      <q-pull-to-refresh scroll-target="#native-refresh-scroll" @refresh="beginRefresh" data-native="state-pull"><q-list style="min-height: 360px"><q-item><q-item-section>Pull content</q-item-section></q-item></q-list></q-pull-to-refresh>
    </div>
    <div><output data-native="refresh-status" aria-live="polite">{{ refreshPending ? 'Refresh pending' : 'Refresh idle' }}</output><q-btn no-caps label="Complete native refresh" data-native="refresh-complete" :disable="!refreshPending" @click="completeRefresh" /></div>
    <q-infinite-scroll ref="infinite" :offset="0" @load="beginInfinite" data-native="state-infinite"><div>Infinite content</div><template #loading><q-spinner /></template></q-infinite-scroll>
    <q-btn no-caps label="Finish infinite loading" @click="finishInfinite?.(true)" />
    <q-slide-item left-color="positive" right-color="negative" data-native="state-slide"><template #left>Accept</template><template #right>Reject</template><q-item><q-item-section>Swipe content</q-item-section></q-item></q-slide-item>
  </section>
</template>
