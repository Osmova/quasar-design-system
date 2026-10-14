<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { PhFileArrowUp, PhFolderOpen } from '@phosphor-icons/vue'
import { useDesignSystem } from '@bastvi/quasar-design-system'

const ds = useDesignSystem()

const optionSingle = ref('compact')
const optionMultiple = ref(['motion', 'contrast'])
const checkbox = ref(true)
const radio = ref('ink')
const toggle = ref(true)
const file = ref<File | null>(null)
const affordanceFile = ref<File | null>(null)
const selectedFile = ref<File | null>(new File(['QDS fixture'], 'brand-guidelines.pdf', { type: 'application/pdf' }))
const selectedFiles = ref<File[]>([
  new File(['QDS fixture'], 'component-inventory.csv', { type: 'text/csv' }),
  new File(['QDS fixture'], 'theme-preview.png', { type: 'image/png' }),
])
const progressFiles = ref<File[]>([
  new File(['QDS fixture'], 'token-audit.json', { type: 'application/json' }),
  new File(['QDS fixture'], 'release-notes.md', { type: 'text/markdown' }),
])
const readonlyFile = ref<File | null>(new File(['QDS fixture'], 'approved-brief.pdf', { type: 'application/pdf' }))
const disabledFile = ref<File | null>(new File(['QDS fixture'], 'archived-token.json', { type: 'application/json' }))
const inputReadonly = ref('Tokenized readonly input')
const inputError = ref('Needs attention')
const inputDisabled = ref('Disabled input')
const selectReadonly = ref('Comfortable')
const selectError = ref('Compact')
const selectDisabled = ref('Touch')
const selectMultiple = ref(['Compact', 'Touch'])
const selectDialog = ref('Comfortable')
const selectCover = ref('Compact')
const selectNoOptions = ref<string | null>(null)
const selectLimited = ref(['Compact'])
const slider = ref(62)
const range = ref({ min: 24, max: 78 })
const color = ref('#6366f1')
const colorAlpha = ref('rgba(99, 102, 241, 0.72)')
const colorTune = ref('rgba(245, 158, 11, 0.84)')
const date = ref('2029/08/17')
const dateMonthView = ref('2029/08/17')
const dateYearView = ref('2029/08/17')
const dateRange = ref({ from: '2029/08/14', to: '2029/08/20' })
const time = ref('10:30')
const popupLabel = ref('Editable label')

const selectOptions = ['Compact', 'Comfortable', 'Touch']
const emptySelectOptions: string[] = []
const timeHourOptions = [9, 10, 11]

const isWideViewport = ref(typeof window !== 'undefined' ? window.innerWidth > 640 : true)
function handleResize() {
  isWideViewport.value = window.innerWidth > 640
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

function dateSelectable(day: string) {
  return !day.endsWith('/16') && !day.endsWith('/22')
}

function removeProgressFile(index: number) {
  progressFiles.value.splice(index, 1)
}

const optionChoices = [
  { label: 'Compact cards', value: 'compact' },
  { label: 'Comfortable cards', value: 'comfortable' },
  { label: 'Large touch targets', value: 'touch' },
]

const checkboxChoices = [
  { label: 'Motion', value: 'motion' },
  { label: 'Contrast', value: 'contrast' },
  { label: 'Density', value: 'density' },
]
</script>

<template>
  <q-card class="catalog-card q-pa-lg">
    <div class="text-h6 qds-display q-mb-md">Forms, pickers &amp; editing</div>
    <q-form class="catalog-form">
      <div class="catalog-grid catalog-grid--three">
        <div class="catalog-demo">
          <div class="catalog-label">QInput states</div>
          <div class="catalog-stack">
            <div data-test="qds-catalog-input-readonly">
              <q-input v-model="inputReadonly" name="catalog-input-readonly" label="Readonly" outlined readonly />
            </div>
            <div data-test="qds-catalog-input-error">
              <q-input v-model="inputError" name="catalog-input-error" label="Error" outlined error error-message="Visible validation message" />
            </div>
            <div data-test="qds-catalog-input-disabled">
              <q-input v-model="inputDisabled" name="catalog-input-disabled" label="Disabled" outlined disable />
            </div>
          </div>
        </div>

        <div class="catalog-demo">
          <div class="catalog-label">QSelect states</div>
          <div class="catalog-stack">
            <div data-test="qds-catalog-select-readonly">
              <q-select v-model="selectReadonly" name="catalog-select-readonly" :options="selectOptions" label="Readonly" outlined readonly />
            </div>
            <div data-test="qds-catalog-select-error">
              <q-select v-model="selectError" name="catalog-select-error" :options="selectOptions" label="Error" outlined error error-message="Visible selection message" />
            </div>
            <div data-test="qds-catalog-select-disabled">
              <q-select v-model="selectDisabled" name="catalog-select-disabled" :options="selectOptions" label="Disabled" outlined disable />
            </div>
            <div data-test="qds-catalog-select-multiple">
              <q-select v-model="selectMultiple" name="catalog-select-multiple" :options="selectOptions" label="Multiple chips" outlined multiple use-chips behavior="menu" />
            </div>
            <div data-test="qds-catalog-select-dialog">
              <q-select v-model="selectDialog" name="catalog-select-dialog" :options="selectOptions" label="Dialog behavior" outlined behavior="dialog" />
            </div>
            <div data-test="qds-catalog-select-cover">
              <q-select v-model="selectCover" name="catalog-select-cover" :options="selectOptions" label="Cover menu" outlined behavior="menu" options-cover />
            </div>
            <div data-test="qds-catalog-select-no-options">
              <q-select v-model="selectNoOptions" name="catalog-select-no-options" :options="emptySelectOptions" label="No options" outlined behavior="menu">
                <template #no-option>
                  <q-item><q-item-section class="qds-text-muted">No options available</q-item-section></q-item>
                </template>
              </q-select>
            </div>
            <div data-test="qds-catalog-select-limited">
              <q-select v-model="selectLimited" name="catalog-select-limited" :options="selectOptions" label="Maximum two values" outlined multiple use-chips counter :max-values="2" behavior="menu" />
            </div>
          </div>
        </div>

        <div class="catalog-demo" data-test="qds-catalog-option-group">
          <div class="catalog-label">QOptionGroup</div>
          <q-option-group v-model="optionSingle" name="catalog-option-radio" data-test="qds-catalog-option-radio" :options="optionChoices" color="primary" />
          <q-separator spaced />
          <q-option-group
            v-model="optionMultiple"
            name="catalog-option-checkbox"
            data-test="qds-catalog-option-checkbox"
            :options="checkboxChoices"
            color="accent"
            type="checkbox"
          />
          <q-separator spaced />
          <div class="catalog-stack">
            <q-checkbox v-model="checkbox" name="catalog-checkbox" data-test="qds-catalog-checkbox" color="primary" label="Checkbox proof" />
            <q-radio v-model="radio" name="catalog-radio" data-test="qds-catalog-radio" val="ink" color="primary" label="Radio proof" />
            <q-toggle v-model="toggle" name="catalog-toggle" data-test="qds-catalog-toggle" color="primary" label="Toggle proof" />
          </div>
        </div>

        <div class="catalog-demo">
          <div class="catalog-label">QFile states</div>
          <div class="catalog-stack">
            <div data-test="qds-catalog-file-empty">
              <q-file v-model="file" name="catalog-file-empty" label="Empty file field" outlined clearable counter />
            </div>
            <div data-test="qds-catalog-file-selected">
              <q-file v-model="selectedFile" name="catalog-file-selected" label="Selected file" outlined clearable counter />
            </div>
            <div data-test="qds-catalog-file-multiple">
              <q-file v-model="selectedFiles" name="catalog-file-multiple" label="Multiple files" outlined clearable counter multiple append use-chips />
            </div>
            <div data-test="qds-catalog-file-progress">
              <q-file v-model="progressFiles" name="catalog-file-progress" label="File slot progress" outlined counter multiple>
                <template #file="{ file: progressFile, index }">
                  <q-chip :key="progressFile.name" removable :remove-aria-label="`Remove ${progressFile.name}`" @remove="removeProgressFile(index)">
                    <span class="ellipsis">{{ progressFile.name }}</span>
                    <q-linear-progress class="full-width q-mt-xs" :value="index === 0 ? 0.72 : 1" :aria-label="`${progressFile.name} upload progress`" />
                  </q-chip>
                </template>
              </q-file>
            </div>
            <div data-test="qds-catalog-file-readonly">
              <q-file v-model="readonlyFile" name="catalog-file-readonly" label="Readonly file" outlined readonly />
            </div>
            <div data-test="qds-catalog-file-disabled">
              <q-file v-model="disabledFile" name="catalog-file-disabled" label="Disabled file" outlined disable />
            </div>
            <div data-test="qds-catalog-file-affordances">
              <q-file v-model="affordanceFile" name="catalog-file-affordances" label="File affordances" outlined>
                <template #prepend><PhFolderOpen :size="18" weight="regular" /></template>
                <template #append><PhFileArrowUp :size="18" weight="regular" /></template>
              </q-file>
            </div>
          </div>
        </div>

        <div class="catalog-demo">
          <div class="catalog-label">QSlider &amp; QRange</div>
          <div class="catalog-stack catalog-stack--relaxed">
            <q-slider v-model="slider" name="catalog-slider" data-test="qds-catalog-slider" :min="0" :max="100" label label-always markers />
            <q-range v-model="range" name="catalog-range" data-test="qds-catalog-range" :min="0" :max="100" label label-always markers />
          </div>
        </div>

        <div class="catalog-demo">
          <div class="catalog-label">QColor</div>
          <q-color v-model="color" name="catalog-color" default-view="palette" class="catalog-picker" data-test="qds-catalog-color" />
        </div>

        <div class="catalog-demo">
          <div class="catalog-label">QColor spectrum &amp; tune</div>
          <div class="catalog-stack catalog-stack--relaxed">
            <q-color v-model="colorAlpha" name="catalog-color-spectrum" default-view="spectrum" format-model="rgba" class="catalog-picker" data-test="qds-catalog-color-spectrum" />
            <q-color v-model="colorTune" name="catalog-color-tune" default-view="tune" format-model="rgba" class="catalog-picker" data-test="qds-catalog-color-tune" />
          </div>
        </div>

        <div class="catalog-demo">
          <div class="catalog-label">QDate</div>
          <q-date v-model="date" name="catalog-date" :options="dateSelectable" flat bordered class="catalog-picker" data-test="qds-catalog-date" />
        </div>

        <div class="catalog-demo">
          <div class="catalog-label">QDate month/year views</div>
          <div class="catalog-stack catalog-stack--relaxed">
            <q-date v-model="dateMonthView" name="catalog-date-months" default-view="Months" flat bordered class="catalog-picker" data-test="qds-catalog-date-months" />
            <q-date v-model="dateYearView" name="catalog-date-years" default-view="Years" flat bordered class="catalog-picker" data-test="qds-catalog-date-years" />
          </div>
        </div>

        <div class="catalog-demo">
          <div class="catalog-label">QDate range</div>
          <q-date v-model="dateRange" name="catalog-date-range" range flat bordered class="catalog-picker" data-test="qds-catalog-date-range" />
        </div>

        <div class="catalog-demo catalog-demo--wide">
          <div class="catalog-label">QTime AM/PM {{ isWideViewport ? 'landscape' : 'portrait' }}</div>
          <!-- Shadcn landscape keeps native QTime geometry; legacy moods retain their compact demo. -->
          <q-time v-model="time" name="catalog-time" flat bordered :landscape="isWideViewport" :format24h="false" :hour-options="timeHourOptions" :class="{ 'catalog-picker': !isWideViewport || ds.variant.value !== 'shadcn' }" data-test="qds-catalog-time" />
        </div>

        <div class="catalog-demo">
          <div class="catalog-label">QPopupEdit</div>
          <div class="catalog-edit-target" data-test="qds-catalog-popup-edit-target">
            {{ popupLabel }}
            <q-popup-edit v-model="popupLabel" buttons v-slot="scope">
              <q-input v-model="scope.value" name="catalog-popup-edit" dense autofocus @keyup.enter="scope.set" />
            </q-popup-edit>
          </div>
        </div>
      </div>
    </q-form>
  </q-card>
</template>
