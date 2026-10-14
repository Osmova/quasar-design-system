<script setup lang="ts">
import { ref } from 'vue'

const expansionExpanded = ref(true)
const expansionCollapsed = ref(false)
const expansionDense = ref(true)
const treeExpanded = ref(['design-system'])
const treeSelected = ref('components')
const treeTicked = ref(['tokens'])
const compactTreeExpanded = ref(['compact-root'])
const compactTreeSelected = ref('compact-controls')
const compactTreeTicked = ref(['compact-controls'])
const darkTreeExpanded = ref(['dark-root'])
const darkTreeSelected = ref('dark-audit')
const ajaxBar = ref<{ start: () => void; stop: () => void } | null>(null)

const treeNodes = [
  {
    label: 'Design system',
    value: 'design-system',
    children: [
      { label: 'Tokens', value: 'tokens' },
      { label: 'Components', value: 'components' },
      { label: 'Runtime theme', value: 'runtime-theme' },
      { label: 'Deprecated alias bridge', value: 'compat-aliases', disabled: true },
    ],
  },
]

const compactTreeNodes = [
  {
    label: 'Compact shell',
    value: 'compact-root',
    children: [
      { label: 'Controls', value: 'compact-controls' },
      { label: 'Disabled row', value: 'compact-disabled', disabled: true },
    ],
  },
]

const darkTreeNodes = [
  {
    label: 'Dark audit',
    value: 'dark-root',
    children: [
      { label: 'Contrast checks', value: 'dark-audit' },
      { label: 'Published surfaces', value: 'dark-surfaces' },
    ],
  },
]

const virtualItems = Array.from({ length: 18 }, (_, index) => `Virtual row ${index + 1}`)

function pulseAjaxBar(): void {
  ajaxBar.value?.start()
  window.setTimeout(() => ajaxBar.value?.stop(), 900)
}
</script>

<template>
  <q-card class="catalog-card q-pa-lg">
    <div class="text-h6 qds-display q-mb-md">Progress, loading &amp; placeholders</div>
    <q-ajax-bar ref="ajaxBar" color="primary" position="top" size="3px" skip-hijack />
    <div class="catalog-grid catalog-grid--three">
      <div class="catalog-demo">
        <div class="catalog-label">QAjaxBar</div>
        <q-btn unelevated color="primary" label="Pulse ajax bar" no-caps @click="pulseAjaxBar" />
        <div class="qds-text-muted q-mt-sm">Manual preview only; no network hijacking.</div>
      </div>

      <div class="catalog-demo">
        <div class="catalog-label">QLinearProgress</div>
        <q-linear-progress :value="0.68" rounded color="primary" size="12px" data-test="qds-linear-progress" />
      </div>

      <div class="catalog-demo">
        <div class="catalog-label">QCircularProgress + QSpinner</div>
        <div class="row items-center q-gutter-md">
          <q-circular-progress
            show-value
            :value="72"
            size="64px"
            color="accent"
            track-color="grey-3"
            data-test="qds-circular-progress"
          />
          <q-spinner color="primary" size="2rem" data-test="qds-spinner" />
        </div>
      </div>

      <div class="catalog-demo">
        <div class="catalog-label">QInnerLoading</div>
        <div class="catalog-loading-box">
          <div class="qds-text-muted">Loading overlay preview</div>
          <q-inner-loading showing label="Syncing" color="primary" data-test="qds-catalog-inner-loading" />
        </div>
      </div>

      <div class="catalog-demo catalog-demo--wide">
        <div class="catalog-label">QSkeleton</div>
        <q-skeleton type="text" width="45%" data-test="qds-catalog-skeleton" />
        <q-skeleton type="rect" height="64px" class="q-mt-sm" />
        <q-skeleton type="text" width="72%" class="q-mt-sm" />
      </div>
    </div>
  </q-card>

  <q-card class="catalog-card q-pa-lg">
    <div class="text-h6 qds-display q-mb-md">Data display &amp; navigation structures</div>
    <div class="catalog-grid catalog-grid--two">
      <div class="catalog-demo catalog-demo--wide">
        <div class="catalog-label">QExpansionItem</div>
        <q-list class="catalog-expansion-list" separator>
          <q-expansion-item
            v-model="expansionExpanded"
            class="qds-card"
            expand-separator
            data-test="qds-expansion-expanded"
          >
            <template #header="{ expanded }">
              <q-item-section>
                <q-item-label>Expanded custom header</q-item-label>
                <q-item-label caption>{{ expanded ? 'Content region is visible' : 'Content region is hidden' }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-badge outline color="primary" label="header slot" />
              </q-item-section>
            </template>
            <div class="catalog-expansion-content">
              Expanded content uses the same card, border, and text tokens as the list header.
            </div>
          </q-expansion-item>

          <q-expansion-item
            v-model="expansionCollapsed"
            class="qds-card"
            label="Collapsed chevron state"
            caption="Chevron remains deterministic and content starts hidden"
            expand-icon-toggle
            data-test="qds-expansion-collapsed"
          >
            <div class="catalog-expansion-content">Hidden until toggled.</div>
          </q-expansion-item>

          <q-expansion-item
            v-model="expansionDense"
            class="qds-card"
            dense
            expand-separator
            label="Dense expanded row"
            caption="Reduced header rhythm"
            data-test="qds-expansion-dense"
          >
            <div class="catalog-expansion-content catalog-expansion-content--dense">Dense content spacing.</div>
          </q-expansion-item>

          <q-expansion-item
            class="qds-card"
            disable
            label="Disabled header"
            caption="Non-interactive expansion header"
            data-test="qds-expansion-disabled"
          >
            <div class="catalog-expansion-content">Disabled content remains closed.</div>
          </q-expansion-item>
        </q-list>
      </div>

      <div class="catalog-demo">
        <div class="catalog-label">QTree</div>
        <q-tree
          v-model:expanded="treeExpanded"
          v-model:selected="treeSelected"
          v-model:ticked="treeTicked"
          :nodes="treeNodes"
          node-key="value"
          tick-strategy="leaf"
          data-test="qds-tree-primary"
        />
        <q-separator class="q-my-md" />
        <q-tree
          v-model:expanded="compactTreeExpanded"
          v-model:selected="compactTreeSelected"
          v-model:ticked="compactTreeTicked"
          :nodes="compactTreeNodes"
          node-key="value"
          tick-strategy="leaf"
          dense
          no-connectors
          data-test="qds-tree-dense"
        />
        <q-separator class="q-my-md" />
        <q-tree
          v-model:expanded="darkTreeExpanded"
          v-model:selected="darkTreeSelected"
          :nodes="darkTreeNodes"
          node-key="value"
          dark
          no-connectors
          data-test="qds-tree-dark-no-connectors"
        />
      </div>

      <div class="catalog-demo">
        <div class="catalog-label">QVirtualScroll</div>
        <q-virtual-scroll :items="virtualItems" style="height: 220px" separator v-slot="{ item, index }" data-test="qds-catalog-virtual-scroll">
          <q-item :key="index" dense>
            <q-item-section>{{ item }}</q-item-section>
            <q-item-section side>#{{ index + 1 }}</q-item-section>
          </q-item>
        </q-virtual-scroll>
      </div>

      <div class="catalog-demo catalog-demo--wide">
        <div class="catalog-label">QMarkupTable</div>
        <q-markup-table flat bordered dense tabindex="0" role="region" aria-label="Coverage summary" data-test="qds-catalog-markup">
          <thead>
            <tr>
              <th class="text-left">Component</th>
              <th class="text-left">State</th>
              <th class="text-right">Coverage</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Controls</td>
              <td>Visual only</td>
              <td class="text-right">100%</td>
            </tr>
            <tr>
              <td>Media</td>
              <td>Static embeds</td>
              <td class="text-right">100%</td>
            </tr>
          </tbody>
        </q-markup-table>
      </div>
    </div>
  </q-card>
</template>
