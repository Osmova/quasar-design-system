<script setup lang="ts">
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { QAvatar, QBadge, QBar, QBtn, QCard, QCardActions, QCardSection, QCarousel, QCarouselSlide, QChatMessage, QCheckbox, QChip, QColor, QDate, QEditor, QExpansionItem, QFile, QIcon, QInput, QItem, QItemLabel, QItemSection, QLinearProgress, QList, QMarkupTable, QPagination, QRadio, QRange, QRating, QSelect, QSeparator, QSkeleton, QSlider, QStep, QStepper, QTab, QTabPanel, QTabPanels, QTable, QTabs, QTime, QTimeline, QTimelineEntry, QToggle, QToolbar, QToolbarTitle, QTree, QUploader } from 'quasar'
import { ppCheck, ppStar, ppPlus } from 'quasar-extras-svg-icons/phosphor-icons-v2'
import type { ShadcnBaseColor } from '@bastvi/quasar-design-system'

defineProps<{ dark: boolean; variant: string; palette: ShadcnBaseColor }>()
const $q = useQuasar()
const value = ref('Alex Morgan')
const checked = ref(true)
const choice = ref('account')
const slider = ref(42)
const range = ref({ min: 20, max: 70 })
const color = ref('#808080')
const date = ref('2029/08/17')
const time = ref('10:30')
const editor = ref('<p>Native editor content</p>')
const file = ref<File | null>(null)
const columns = [{ name: 'name', label: 'Name', field: 'name', sortable: true }]
const ticked = ref(['checked-leaf'])
const nodes = [{ label: 'Root', id: 'root', children: [{ label: 'Branch', id: 'branch', children: [{ label: 'Checked leaf', id: 'checked-leaf' }, { label: 'Unchecked leaf', id: 'unchecked-leaf' }, { label: 'Disabled leaf', id: 'disabled-leaf', disabled: true }] }] }]
</script>

<template>
  <q-card :dark="dark" :class="dark ? undefined : ['qds-theme-light', `qds-variant-${variant}`]" :data-qds-shadcn-base-color="!dark && variant === 'shadcn' ? palette : undefined" :data-scheme="dark ? 'dark' : 'light'" style="display: grid; gap: 16px; min-width: 0; padding: 16px">
    <q-card :dark="dark" bordered data-native="card">
      <q-card-section><h2>{{ dark ? 'Local dark' : 'Explicit light' }}</h2></q-card-section>
      <q-card-section>
        <q-btn color="primary" no-caps label="Button" />
        <q-badge color="primary" label="Badge" />
        <q-chip :dark="dark" removable :icon="ppCheck">Chip</q-chip>
        <q-avatar color="primary" text-color="white">QD</q-avatar>
        <q-rating :model-value="2.5" :icon="ppStar" :max="5" />
      </q-card-section>
      <q-card-actions><q-btn flat no-caps label="Cancel" /><q-btn color="primary" no-caps label="Deploy" /></q-card-actions>
    </q-card>
    <q-input v-model="value" :dark="dark" outlined label="Name" hint="Description" counter clearable prefix="$" suffix="USD" data-native="input">
      <template #prepend><q-icon :name="ppPlus" /></template>
    </q-input>
    <q-select v-model="choice" :dark="dark" outlined :options="['account', 'password']" label="Section" data-native="select" />
    <q-file v-model="file" :dark="dark" outlined label="File" data-native="file" />
    <q-checkbox v-model="checked" :dark="dark" label="Accept terms" data-native="checkbox" />
    <q-radio v-model="choice" :dark="dark" val="account" label="Account" data-native="radio" />
    <q-toggle v-model="checked" :dark="dark" label="Notifications" data-native="toggle" />
    <q-slider v-model="slider" :dark="dark" label label-always markers data-native="slider" />
    <q-range v-model="range" :dark="dark" label label-always markers data-native="range" />
    <q-color v-model="color" :dark="dark" default-view="spectrum" data-native="color" style="max-width: 100%" />
    <q-date v-model="date" :dark="dark" data-native="date" style="max-width: 100%" />
    <q-time v-model="time" :dark="dark" data-native="time" style="max-width: 100%" />
    <q-list :dark="dark" bordered separator data-native="list">
      <q-item clickable active><q-item-section avatar><q-avatar>QD</q-avatar></q-item-section><q-item-section><q-item-label>Selected</q-item-label><q-item-label caption>Caption</q-item-label></q-item-section></q-item>
      <q-expansion-item default-opened label="Expanded" caption="Details"><q-item><q-item-section>Content</q-item-section></q-item></q-expansion-item>
      <q-item disable><q-item-section>Disabled</q-item-section></q-item>
    </q-list>
    <q-tabs v-model="choice" :dark="dark" no-caps data-native="tabs"><q-tab name="account" label="Account" /><q-tab name="password" label="Password" /><q-tab name="disabled" label="Disabled" disable /></q-tabs>
    <q-tab-panels v-model="choice" :dark="dark" data-native="panels"><q-tab-panel name="account">Account panel</q-tab-panel><q-tab-panel name="password">Password panel</q-tab-panel></q-tab-panels>
    <q-toolbar :dark="dark" data-native="toolbar"><q-toolbar-title>Toolbar title</q-toolbar-title><q-btn flat no-caps label="Action" /></q-toolbar>
    <q-bar :dark="dark" data-native="bar">Native bar</q-bar>
    <q-separator :dark="dark" data-native="separator" />
    <q-table :dark="dark" :columns="columns" :rows="[{ id: 1, name: 'Alex Morgan' }]" row-key="id" selection="multiple" data-native="table" />
    <q-markup-table :dark="dark" data-native="markup"><thead><tr><th>Name</th></tr></thead><tbody><tr><td>Alex Morgan</td></tr></tbody></q-markup-table>
    <q-pagination v-model="slider" :max="50" input :dark="dark" data-native="pagination" />
    <q-linear-progress :dark="dark" :value="0.6" :buffer="0.8" data-native="progress" />
    <q-skeleton :dark="dark" type="rect" data-native="skeleton" />
    <q-tree v-model:ticked="ticked" :dark="dark" :nodes="nodes" node-key="id" tick-strategy="leaf" :expanded="['root', 'branch']" data-native="tree" />
    <q-stepper :dark="dark" :model-value="1" :contracted="$q.screen.lt.sm" data-native="stepper"><q-step :name="1" title="Active" caption="Review">Content</q-step><q-step :name="2" title="Done" done /><q-step :name="3" title="Error" error /><q-step :name="4" title="Disabled" disable /></q-stepper>
    <q-stepper :dark="dark" :model-value="3" vertical data-native="stepper-error"><q-step :name="1" title="Active" caption="Review" /><q-step :name="2" title="Done" done /><q-step :name="3" title="Error" caption="Resolve validation before continuing" error>Visible error content</q-step><q-step :name="4" title="Disabled" disable /></q-stepper>
    <q-timeline :dark="dark" data-native="timeline"><q-timeline-entry title="Entry" subtitle="Caption">Content</q-timeline-entry></q-timeline>
    <q-chat-message :dark="dark" name="Alex" stamp="10:30" :text="['Received message']" data-native="chat" />
    <q-carousel :dark="dark" model-value="first" navigation arrows height="160px" data-native="carousel"><q-carousel-slide name="first">First slide</q-carousel-slide><q-carousel-slide name="second">Second slide</q-carousel-slide></q-carousel>
    <q-editor v-model="editor" :dark="dark" :toolbar="[['bold', 'italic', 'link', 'fullscreen']]" data-native="editor" />
    <q-uploader :dark="dark" label="Native uploader" :auto-upload="false" data-native="uploader" style="max-width: 100%" />
  </q-card>
</template>
