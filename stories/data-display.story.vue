<script setup lang="ts">
import { ref } from 'vue'
import {
  QBadge,
  QCard,
  QExpansionItem,
  QItem,
  QItemLabel,
  QItemSection,
  QList,
  QPagination,
  QSeparator,
  QTable,
  type QTableColumn,
} from 'quasar'
import { PhDatabase, PhListChecks, PhStack } from '@phosphor-icons/vue'
import {
  DESIGN_SYSTEM_VARIANTS,
  type DesignSystemMode,
  type DesignSystemVariantName,
} from '../src'
import StoryShell from './_shared/StoryShell.vue'

type CoverageRow = {
  component: string
  group: string
  state: string
  coverage: number
}

const modeOptions: DesignSystemMode[] = ['light', 'dark', 'system']
const variantOptions = Object.keys(DESIGN_SYSTEM_VARIANTS) as Array<Extract<DesignSystemVariantName, string>>
const page = ref(2)
const expansionOpen = ref(true)
const secondExpansionOpen = ref(false)
const tablePagination = ref({ page: 1, rowsPerPage: 4 })

interface DataStoryState {
  mode: DesignSystemMode
  variant: DesignSystemVariantName
}

const initState = (): DataStoryState => ({ mode: 'light', variant: 'win' })

const tableColumns: QTableColumn<CoverageRow>[] = [
  { name: 'component', label: 'Component', field: 'component', align: 'left', sortable: true },
  { name: 'group', label: 'Group', field: 'group', align: 'left' },
  { name: 'state', label: 'State', field: 'state', align: 'left' },
  { name: 'coverage', label: 'Coverage', field: 'coverage', align: 'right', format: value => `${value}%` },
]

const tableRows: CoverageRow[] = [
  { component: 'QTable', group: 'Data', state: 'Flat bordered', coverage: 92 },
  { component: 'QPagination', group: 'Data', state: 'Compact navigation', coverage: 88 },
  { component: 'QList', group: 'Lists', state: 'Dense item rhythm', coverage: 94 },
  { component: 'QExpansionItem', group: 'Lists', state: 'Expanded header', coverage: 90 },
  { component: 'QItem', group: 'Lists', state: 'Side metadata', coverage: 96 },
]

</script>

<template>
  <Story title="Design System / Data Display" :layout="{ type: 'single', iframe: true }" :init-state="initState">
    <Variant title="Tables, pagination, lists and expansion">
      <template #default="{ state }">
        <StoryShell title="Structured content" description="Deterministic table, pagination, list, and expansion states for visual parity checks." :mode="state.mode" :variant="state.variant">
          <div class="qds-story-stack qds-story-stack--relaxed">
            <QCard class="qds-story-panel q-pa-lg q-mb-lg">
              <div class="row items-center q-mb-md">
                <div>
                  <div class="text-overline qds-text-muted">QTable + QPagination</div>
                  <div class="text-h6 qds-story-title">Coverage matrix sample</div>
                </div>
                <div class="q-ml-auto"><PhDatabase :size="28" weight="duotone" /></div>
              </div>

              <div class="qds-story-table-scroll">
                <QTable v-model:pagination="tablePagination" :columns="tableColumns" :rows="tableRows" row-key="component" flat bordered dense hide-bottom />
              </div>
              <div class="row justify-end q-mt-md qds-story-pagination">
                <QPagination v-model="page" data-test="qds-story-pagination" color="primary" :max="5" :max-pages="5" boundary-numbers direction-links />
              </div>
              <p class="qds-text-muted q-mt-sm q-mb-none">Switch to Ink or One to verify the same pagination proof against variant tokens.</p>
            </QCard>

            <div class="row q-col-gutter-lg">
              <div class="col-12 col-md-6">
                <QCard class="qds-story-panel q-pa-lg full-height">
                  <div class="row items-center q-mb-md">
                    <div class="text-overline qds-text-muted">QList</div>
                    <PhListChecks class="q-ml-auto" :size="26" weight="duotone" />
                  </div>
                  <QList separator>
                    <QItem clickable>
                      <QItemSection avatar><QBadge color="primary" rounded /></QItemSection>
                      <QItemSection>
                        <QItemLabel>Token audit</QItemLabel>
                        <QItemLabel caption>Neutral row with avatar marker</QItemLabel>
                      </QItemSection>
                      <QItemSection side>Today</QItemSection>
                    </QItem>
                    <QItem clickable active>
                      <QItemSection avatar><QBadge color="positive" rounded /></QItemSection>
                      <QItemSection>
                        <QItemLabel>Component pass</QItemLabel>
                        <QItemLabel caption>Active item state</QItemLabel>
                      </QItemSection>
                      <QItemSection side><QBadge outline color="primary" label="Live" /></QItemSection>
                    </QItem>
                    <QItem disable>
                      <QItemSection avatar><QBadge color="grey" rounded /></QItemSection>
                      <QItemSection>
                        <QItemLabel>Deprecated alias</QItemLabel>
                        <QItemLabel caption>Disabled row treatment</QItemLabel>
                      </QItemSection>
                    </QItem>
                  </QList>
                </QCard>
              </div>

              <div class="col-12 col-md-6">
                <QCard class="qds-story-panel q-pa-lg full-height">
                  <div class="row items-center q-mb-md">
                    <div class="text-overline qds-text-muted">QExpansionItem</div>
                    <PhStack class="q-ml-auto" :size="26" weight="duotone" />
                  </div>
                  <QList class="qds-story-expansion" separator>
                    <QExpansionItem v-model="expansionOpen" expand-separator>
                      <template #header="{ expanded }">
                        <QItemSection>
                          <QItemLabel>Expanded custom header</QItemLabel>
                          <QItemLabel caption>{{ expanded ? 'Content region is visible' : 'Content region is hidden' }}</QItemLabel>
                        </QItemSection>
                        <QItemSection side><QBadge outline color="primary" label="open" /></QItemSection>
                      </template>
                      <div class="qds-story-expansion-body">Expanded content uses the same card surface and muted border rhythm.</div>
                    </QExpansionItem>

                    <QExpansionItem
                      v-model="secondExpansionOpen"
                      dense
                      label="Dense collapsed row"
                      caption="Compact header state"
                      expand-icon-toggle
                    >
                      <div class="qds-story-expansion-body">Hidden until toggled.</div>
                    </QExpansionItem>
                  </QList>
                  <QSeparator class="q-my-md" />
                  <p class="qds-text-muted q-mb-none">Includes expanded, collapsed, dense, active, and disabled visual states.</p>
                </QCard>
              </div>
            </div>
          </div>
        </StoryShell>
      </template>

      <template #controls="{ state }">
        <HstSelect v-model="state.mode" title="Mode" :options="modeOptions" />
        <HstSelect v-model="state.variant" title="Variant" :options="variantOptions" />
      </template>
    </Variant>
  </Story>
</template>

<style scoped>
.qds-story-title {
  font-family: var(--qds-font-family-display);
}

.qds-story-expansion {
  overflow: hidden;
  border: var(--qds-border-width-control) solid var(--qds-border-subtle);
  border-radius: var(--qds-radius-lg);
}

.qds-story-expansion-body {
  padding: var(--qds-space-md);
  color: var(--qds-text-muted);
  background: var(--qds-surface-1);
}

.qds-story-table-scroll {
  max-inline-size: 100%;
  overflow-x: auto;
}

.qds-story-table-scroll :deep(.q-table) {
  min-inline-size: 36rem;
}

@media (max-width: 32rem) {
  .qds-story-pagination {
    justify-content: flex-start;
    overflow-x: auto;
  }
}
</style>
