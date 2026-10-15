<script setup lang="ts">
import { computed, ref } from 'vue'
import { QTabs, QTab, QTabPanels, QTabPanel } from 'quasar'

const props = defineProps<{
  dense: boolean
  /** Number of tabs; larger counts overflow the constrained row and reveal native scroll arrows. */
  tabCount: string
  /** Which tab is natively disabled: 'none' | 'second' | 'last'. */
  disabledTab: string
}>()

const count = computed(() => {
  const parsed = Number.parseInt(props.tabCount, 10)
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 12 ? parsed : 6
})

const model = ref('tab-1')
</script>

<template>
  <div class="qds-catalog-demo-tabs">
    <QTabs
      v-model="model"
      class="qds-catalog-demo__control qds-catalog-demo-tabs__row"
      align="left"
      :dense="dense"
      inline-label
    >
      <QTab
        v-for="index in count"
        :key="'tab-' + index"
        :name="'tab-' + index"
        :disable="disabledTab === 'second' ? index === 2 : disabledTab === 'last' ? index === count : false"
      >
        Tab {{ index }}
      </QTab>
    </QTabs>

    <QTabPanels v-model="model" class="qds-catalog-demo-tabs__panels" animated>
      <QTabPanel
        v-for="index in count"
        :key="'tab-panel-' + index"
        :name="'tab-' + index"
        class="qds-catalog-demo-tabs__panel"
      >
        Panel {{ index }} content
      </QTabPanel>
    </QTabPanels>
  </div>
</template>

<style scoped>
.qds-catalog-demo-tabs {
  /* Width-capped block wrapper: the QTabs row always fills this box, so the
     native scrollable/arrow detection engages deterministically whenever the
     host canvas is narrower than 26rem (no grid-track min-width trap). */
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  max-width: 26rem;
}

.qds-catalog-demo-tabs__row {
  width: 100%;
  min-width: 0;
}

.qds-catalog-demo-tabs__panels {
  width: 100%;
  min-height: 4rem;
}

.qds-catalog-demo-tabs__panel {
  padding: 0.5rem 0.75rem;
}
</style>
