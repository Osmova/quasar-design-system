<script setup lang="ts">
import { SHADCN_BASE_COLORS } from '@bastvi/quasar-design-system'
</script>
<template>
  <section aria-label="Shadcn palette comparison" data-test="qds-shadcn-panels" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: 16px">
    <q-card v-for="color in SHADCN_BASE_COLORS" :key="color.name" class="qds-variant-shadcn" :data-qds-shadcn-base-color="color.name" :data-test="`qds-shadcn-panel-${color.name}`">
      <q-card-section><h2>{{ color.label }}</h2><q-input outlined model-value="Alex Morgan" label="Name" /></q-card-section>
      <q-card-section><q-badge color="primary" label="Badge" /><q-chip removable>Chip</q-chip></q-card-section>
      <q-card-actions><q-btn color="primary" no-caps label="Button" /><q-btn outline no-caps label="Outline" /></q-card-actions>
      <q-linear-progress :value="0.6" />
    </q-card>
  </section>
</template>
