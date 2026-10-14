<script setup lang="ts">
import { computed } from 'vue'
import type { QdsToken } from '@osmova/quasar-design-system'

const props = defineProps<{
  token: QdsToken | string
  /** Render style: a color chip, a box (radius/shadow), or a plain value. */
  kind?: 'color' | 'box' | 'value'
}>()

const cssVar = computed(() => `var(${props.token})`)
const kind = computed(() => props.kind ?? 'color')
const boxStyle = computed(() => {
  if (props.token.includes('radius')) {
    return {
      borderRadius: cssVar.value,
      background: 'linear-gradient(135deg, rgba(var(--qds-color-primary-rgb), 0.16), rgba(var(--qds-color-accent-rgb), 0.14)), var(--qds-surface-0)',
    }
  }

  if (props.token.includes('shadow') || props.token.includes('elevation')) {
    return {
      boxShadow: cssVar.value,
      background: 'linear-gradient(135deg, rgba(var(--qds-color-info-rgb), 0.16), rgba(var(--qds-color-primary-rgb), 0.08)), var(--qds-surface-0)',
    }
  }

  return {}
})
</script>

<template>
  <div class="qds-card q-pa-sm column" style="gap: 0.5rem">
    <div
      v-if="kind === 'color'"
      class="swatch swatch--color"
      :style="{ background: cssVar }"
    />
    <div
      v-else-if="kind === 'box'"
      class="swatch swatch--box"
      :style="boxStyle"
    />
    <code class="token-name">{{ token }}</code>
  </div>
</template>

<style scoped>
.swatch {
  width: 100%;
  height: 3rem;
  border: 1px solid var(--qds-border);
}
.swatch--color {
  border-radius: var(--qds-radius-sm);
}
.swatch--box {
  background: var(--qds-surface-0);
}
.token-name {
  font-size: 0.68rem;
  color: var(--qds-text-muted);
  overflow-wrap: anywhere;
  line-height: 1.25;
}
</style>
