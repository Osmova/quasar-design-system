<script setup lang="ts">
import { computed } from 'vue'
import { QBtn, QBtnDropdown, QList, QItem, QItemSection } from 'quasar'
import {
  ppPencilSimpleBold,
  ppPlus,
  ppX,
} from 'quasar-extras-svg-icons/phosphor-icons-v2'

const props = defineProps<{
  /** Visible control label (content subelement). */
  label: string
  /** Named control option mapped onto real Phosphor line SVG paths ('' clears the icon). */
  icon: string
  dense: boolean
  /** Native spinner replaces the content while true. */
  loading: boolean
  disable: boolean
  /** Renders a split QBtnDropdown (arrow + popover) instead of the plain QBtn. */
  split: boolean
}>()

const iconPath = computed(() => {
  if (props.icon === 'plus') {
    return ppPlus
  }
  if (props.icon === 'close') {
    return ppX
  }
  if (props.icon === 'edit') {
    return ppPencilSimpleBold
  }
  return undefined
})
</script>

<template>
  <div class="qds-catalog-demo-button">
    <QBtnDropdown
      v-if="split"
      :label="label"
      :dense="dense"
      :loading="loading"
      :icon="iconPath"
      :disable="disable"
      split
      class="qds-catalog-demo__control"
    >
      <QList>
        <QItem v-close-popup clickable>
          <QItemSection>Primary action</QItemSection>
        </QItem>
        <QItem v-close-popup clickable>
          <QItemSection>Secondary action</QItemSection>
        </QItem>
      </QList>
    </QBtnDropdown>

    <QBtn
      v-else
      type="button"
      unelevated
      color="primary"
      class="qds-catalog-demo__control"
      :label="label"
      :dense="dense"
      :loading="loading"
      :disable="disable"
      :icon="iconPath"
    />
  </div>
</template>

<style scoped>
.qds-catalog-demo-button {
  display: grid;
  justify-items: start;
  gap: 0.25rem;
}
</style>
