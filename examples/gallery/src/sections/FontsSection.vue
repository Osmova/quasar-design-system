<script setup lang="ts">
// Faces shipped via @osmova/quasar-design-system/fonts/*.css (imported in main.ts).
const families = [
  { label: 'Inter Variable', stack: "'Inter Variable', sans-serif", note: 'Body and display / --qds-font-family' },
  { label: 'Open Sans Variable', stack: "'Open Sans Variable', sans-serif", note: 'Alternate body face' },
  { label: 'Selawik', stack: "'Selawik', sans-serif", note: 'Optional display face, off by default — an app may set --qds-font-family-display' },
]
const sample = 'The quick brown fox jumps. Le vif œuf brun. 0123456789'
</script>

<template>
  <div class="column" style="gap: 1.5rem">
    <q-card v-for="f in families" :key="f.label" class="q-pa-lg">
      <div class="row items-baseline justify-between q-mb-sm">
        <div class="text-h6" :style="{ fontFamily: f.stack }">{{ f.label }}</div>
        <code class="caption">{{ f.note }}</code>
      </div>
      <div :style="{ fontFamily: f.stack }" class="font-sample">{{ sample }}</div>
      <div :style="{ fontFamily: f.stack }" class="q-mt-sm qds-text-muted">{{ sample }}</div>
    </q-card>
  </div>
</template>

<style scoped>
.font-sample {
  font-size: 1.5rem;
  line-height: 1.4;
}

.caption {
  font-size: 0.7rem;
  color: var(--qds-text-muted);
}
</style>
