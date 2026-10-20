<script setup lang="ts">
import { ref } from 'vue'
import {
  QAjaxBar,
  QBtn,
  QCard,
  QCardSection,
  QInfiniteScroll,
  QItem,
  QItemLabel,
  QItemSection,
  QList,
  QMarkupTable,
  QSpinnerDots,
  QSpinnerGears,
  QTable,
  QTd,
  QTree,
  QVirtualScroll,
} from 'quasar'
import {
  DESIGN_SYSTEM_VARIANTS,
  type DesignSystemMode,
  type DesignSystemVariantName,
} from '../src'
import StoryShell from './_shared/StoryShell.vue'

const modeOptions: DesignSystemMode[] = ['light', 'dark', 'system']
const variantOptions = Object.keys(DESIGN_SYSTEM_VARIANTS) as Array<Extract<DesignSystemVariantName, string>>
const initState = () => ({ mode: 'light' as DesignSystemMode, variant: 'fluent' as DesignSystemVariantName })

const treeNodes = [
  {
    label: 'src',
    children: [
      { label: 'tokens', children: [{ label: '_default.scss' }, { label: '_shadcn.scss' }] },
      { label: 'themes', children: [{ label: 'default.scss' }, { label: 'fallbacks.scss' }] },
      { label: 'css', children: [{ label: 'components' }, { label: 'extensions' }] },
    ],
  },
  { label: 'stories', children: [{ label: 'actions.story.vue' }] },
]
const expanded = ref(['src'])
const ticked = ref<string[]>([])

const tableColumns = [
  { name: 'token', label: 'Token', field: 'token', align: 'left' as const },
  { name: 'scope', label: 'Scope', field: 'scope', align: 'left' as const },
  { name: 'value', label: 'Value', field: 'value', align: 'right' as const },
]
const tableRows = [
  { token: '--qds-radius-control', scope: 'Fluent', value: '4px' },
  { token: '--qds-radius-control', scope: 'One', value: '14px' },
  { token: '--qds-radius-control', scope: 'Term', value: '6px' },
]

const virtualRows = Array.from({ length: 400 }, (_, index) => ({ id: index, label: `Row ${index + 1}` }))
const infiniteRows = ref(Array.from({ length: 8 }, (_, index) => index + 1))
const ajaxBar = ref<InstanceType<typeof QAjaxBar> | null>(null)

function loadMore(index: number, done: (stop?: boolean) => void) {
  const next = infiniteRows.value.length
  infiniteRows.value.push(...Array.from({ length: 4 }, (_, offset) => next + offset + 1))
  done(infiniteRows.value.length >= 24)
}
</script>

<template>
  <Story title="Design System / Scrolling &amp; Structured Data" :layout="{ type: 'single', iframe: true }" :init-state="initState">
    <Variant title="Trees, virtualised rows, static tables and progress">
      <template #default="{ state }">
        <StoryShell
          title="Scrolling &amp; structured data"
          description="Hierarchies, long lists and the static table that is not QTable."
          :mode="state.mode"
          :variant="state.variant"
        >
          <section class="qds-story-section">
            <h2>QTree</h2>
            <QTree
              v-model:expanded="expanded"
              v-model:ticked="ticked"
              :nodes="treeNodes"
              node-key="label"
              tick-strategy="leaf"
            />
          </section>

          <section class="qds-story-section">
            <h2>QMarkupTable</h2>
            <QMarkupTable flat bordered>
              <thead>
                <tr><th class="text-left">Token</th><th class="text-left">Scope</th><th class="text-right">Value</th></tr>
              </thead>
              <tbody>
                <tr><td>--qds-radius-control</td><td>Fluent</td><td class="text-right">4px</td></tr>
                <tr><td>--qds-radius-control</td><td>One</td><td class="text-right">14px</td></tr>
                <tr><td>--qds-radius-control</td><td>Term</td><td class="text-right">6px</td></tr>
              </tbody>
            </QMarkupTable>
          </section>

          <section class="qds-story-section">
            <h2>QTable with a QTd body cell</h2>
            <QTable flat bordered :rows="tableRows" :columns="tableColumns" row-key="token" hide-pagination :pagination="{ rowsPerPage: 0 }">
              <template #body-cell-value="props">
                <QTd :props="props"><code>{{ props.value }}</code></QTd>
              </template>
            </QTable>
          </section>

          <section class="qds-story-section">
            <h2>QVirtualScroll</h2>
            <QVirtualScroll :items="virtualRows" style="max-height: 200px" separator>
              <template #default="{ item, index }">
                <QItem :key="index" dense>
                  <QItemSection><QItemLabel>{{ item.label }}</QItemLabel></QItemSection>
                </QItem>
              </template>
            </QVirtualScroll>
          </section>

          <section class="qds-story-section">
            <h2>QInfiniteScroll</h2>
            <div style="max-height: 220px; overflow: auto">
              <QInfiniteScroll :offset="120" @load="loadMore">
                <QList bordered separator>
                  <QItem v-for="row in infiniteRows" :key="row">
                    <QItemSection>Loaded row {{ row }}</QItemSection>
                  </QItem>
                </QList>
                <template #loading>
                  <div class="qds-story-row"><QSpinnerDots size="24px" /><QSpinnerGears size="24px" /></div>
                </template>
              </QInfiniteScroll>
            </div>
          </section>

          <section class="qds-story-section">
            <h2>QAjaxBar</h2>
            <QCard>
              <QAjaxBar ref="ajaxBar" position="top" color="primary" size="4px" skip-hijack />
              <QCardSection class="qds-story-row">
                <QBtn no-caps label="Start" @click="ajaxBar?.start()" />
                <QBtn no-caps label="Stop" @click="ajaxBar?.stop()" />
              </QCardSection>
            </QCard>
          </section>
        </StoryShell>
      </template>

      <template #controls="{ state }">
        <HstSelect v-model="state.mode" title="Mode" :options="modeOptions" />
        <HstSelect v-model="state.variant" title="Variant" :options="variantOptions" />
      </template>
    </Variant>
  </Story>
</template>
