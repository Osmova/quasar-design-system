<script setup lang="ts">
import { reactive } from 'vue'
import { useDesignSystem } from '@osmova/quasar-design-system'
import ShadcnPalettePanels from '../components/ShadcnPalettePanels.vue'

type VariantName = 'fluent' | 'ink' | 'one' | 'term' | 'shadcn' | 'zen'
const ds = useDesignSystem()

type VariantSample = {
  name: VariantName
  label: string
  intent: string
  sample: string
}

const variants: VariantSample[] = [
  {
    name: 'fluent',
    label: 'Fluent',
    intent: 'Solid mica surfaces, low-border content, and selective transient material over cool geometry.',
    sample: 'Settings surface 01',
  },
  {
    name: 'ink',
    label: 'Ink',
    intent: 'Paper-neutral editorial surfaces with charcoal type and coordinated pastel role washes.',
    sample: 'Editorial spread 07',
  },
  {
    name: 'one',
    label: 'One',
    intent: 'One UI-inspired neutral blocks, pill controls, a calm blue accent, and touch-first rhythm.',
    sample: 'Touch panel 04',
  },
  {
    name: 'term',
    label: 'Term',
    intent: 'Developer shell: monospace type, crisp hairlines, compact amber controls.',
    sample: 'qdsctl --inspect',
  },
  {
    name: 'zen',
    label: 'Zen',
    intent: 'Soft tinted paper blocks, a quiet reading rhythm and an essential edge on every control.',
    sample: 'Reading pane 01',
  },
  {
    name: 'shadcn',
    label: 'Shadcn',
    intent: 'Opaque neutral New York surfaces, crisp outlines, and restrained role fills.',
    sample: 'Native surface 05',
  },
]

const pages = reactive<Record<VariantName, number>>({
  fluent: 3,
  ink: 3,
  one: 3,
  term: 3,
  shadcn: 3,
  zen: 3,
})
</script>

<template>
  <section class="variants-section" data-test="qds-variants-section" aria-labelledby="qds-variants-title">
    <ShadcnPalettePanels v-if="ds.variant.value === 'shadcn'" />
    <div class="variants-hero qds-card">
      <p class="variants-kicker">Variant lab</p>
      <h1 id="qds-variants-title" class="qds-display">Same anatomy, different visual systems</h1>
      <p class="qds-text-muted">
        This view keeps component anatomy identical so variant-specific typography, density, borders,
        material, and state rules are visible side by side. Six canonical variants share one token system.
      </p>
    </div>

    <div class="variants-grid" aria-label="Variant comparison grid">
      <q-card
        v-for="variant in variants"
        :key="variant.name"
        class="variant-card"
        :class="`qds-variant-${variant.name}`"
        :data-qds-shadcn-base-color="variant.name === 'shadcn' ? ds.shadcnBaseColor.value : undefined"
        :data-test="`qds-variant-card-${variant.name}`"
      >
        <q-card-section>
          <div class="variant-card__eyebrow">{{ variant.sample }}</div>
          <h2 class="variant-card__title qds-display">{{ variant.label }}</h2>
          <p class="variant-card__copy">{{ variant.intent }}</p>
        </q-card-section>

        <q-card-section class="variant-card__controls">
          <q-input model-value="Variant token" name="variant-outlined-field" label="Outlined field" outlined dense readonly />

          <div class="variant-card__roles" :data-test="`qds-variant-roles-${variant.name}`">
            <span class="variant-role variant-role--info">Info surface</span>
            <span class="variant-role variant-role--positive">Ready</span>
            <span class="variant-role variant-role--warning">Review</span>
            <span class="variant-role variant-role--negative">Alert</span>
          </div>

          <div class="qds-button-row qds-button-row--tight">
            <q-btn unelevated color="primary" label="Apply" />
            <q-btn outline color="primary" label="Inspect" />
          </div>

          <q-list separator>
            <q-item clickable active>
              <q-item-section>
                <q-item-label>Active row</q-item-label>
                <q-item-label caption>Spacing, type, and active state</q-item-label>
              </q-item-section>
            </q-item>
            <q-item clickable>
              <q-item-section>
                <q-item-label>Secondary row</q-item-label>
                <q-item-label caption>Shared anatomy, variant behavior</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>

          <q-card flat class="variant-card__nested" :data-test="`qds-variant-nested-${variant.name}`">
            <q-card-section>
              <div class="variant-card__eyebrow">Nested chrome</div>
              <p class="variant-card__copy">Secondary card material, separators, and variant-specific shadow rules.</p>
            </q-card-section>
          </q-card>

          <q-markup-table dense flat bordered :data-test="`qds-variant-table-${variant.name}`">
            <thead>
              <tr>
                <th class="text-left">Token</th>
                <th class="text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>radius</td>
                <td class="text-right">{{ variant.label }}</td>
              </tr>
            </tbody>
          </q-markup-table>

          <div class="variant-card__progress" :data-test="`qds-variant-progress-${variant.name}`">
            <q-linear-progress rounded size="8px" :value="0.62" color="primary" aria-label="Primary coverage" />
            <q-linear-progress rounded size="8px" :value="0.38" color="positive" aria-label="Positive coverage" />
          </div>

          <q-pagination
            v-model="pages[variant.name]"
            :max="128"
            :max-pages="6"
            boundary-numbers
            boundary-links
            direction-links
            color="primary"
          />
        </q-card-section>
      </q-card>
    </div>
  </section>
</template>

<style scoped>
.variants-section {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--qds-space-lg);
}

.variants-section > *,
.variant-card,
.variant-card__controls > * {
  min-width: 0;
}

.variants-hero {
  padding: clamp(1.25rem, 3vw, 2rem);
}

.variants-kicker {
  margin: 0 0 var(--qds-space-xs);
  color: var(--qds-color-primary);
  font-size: 0.78rem;
  font-weight: var(--qds-font-weight-semibold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.variants-hero h1 {
  margin: 0 0 var(--qds-space-sm);
  color: var(--qds-text-strong);
  font-size: clamp(1.75rem, 4vw, 3rem);
  line-height: 1.05;
}

.variants-hero p {
  max-width: 62rem;
  margin: 0;
  font-size: 1rem;
}

.variants-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--qds-space-lg);
}

.variant-card__eyebrow {
  color: var(--qds-color-primary);
  font-family: var(--qds-font-family);
  font-size: 0.75rem;
  font-weight: var(--qds-font-weight-semibold);
  letter-spacing: var(--qds-control-letter-spacing);
  text-transform: var(--qds-control-text-transform);
}

.variant-card.qds-variant-term .variant-card__eyebrow,
.variant-card.qds-variant-one .variant-card__eyebrow,
.qds-variant-term .variants-kicker,
.qds-variant-one .variants-kicker {
  color: var(--qds-fg-brand);
}

.variant-card__title {
  margin: 0.2rem 0 0;
  color: var(--qds-text-strong);
  font-size: clamp(1.6rem, 3vw, 2.25rem);
  line-height: 1;
}

.variant-card__copy {
  margin: var(--qds-space-sm) 0 0;
  color: var(--qds-text-muted);
}

.variant-card__controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--qds-space-md);
}

.variant-card__roles {
  display: flex;
  flex-wrap: wrap;
  gap: var(--qds-space-xs);
}

.variant-role {
  display: inline-flex;
  align-items: center;
  min-height: 1.5rem;
  padding: 0 0.625rem;
  border-radius: var(--qds-radius-full);
  font-size: 0.78rem;
  font-weight: var(--qds-font-weight-medium);
  background: rgba(var(--qds-color-primary-rgb), var(--qds-tonal-bg-opacity));
  color: var(--qds-text-strong);
}

.variant-role--info {
  background: rgba(var(--qds-color-info-rgb, 59 130 246), var(--qds-tonal-bg-opacity));
}

.variant-role--positive {
  background: rgba(var(--qds-color-positive-rgb, 16 185 129), var(--qds-tonal-bg-opacity));
}

.variant-role--warning {
  background: rgba(var(--qds-color-warning-rgb, 245 158 11), var(--qds-tonal-bg-opacity));
}

.variant-role--negative {
  background: rgba(var(--qds-color-negative-rgb, 239 68 68), var(--qds-tonal-bg-opacity));
}

.variant-card__nested {
  padding: var(--qds-space-xs);
}

.variant-card__progress {
  display: grid;
  gap: var(--qds-space-xs);
}

.variant-card :deep(.q-pagination) {
  justify-content: flex-start;
}

.variant-card :deep(.q-pagination__content) {
  flex-wrap: wrap;
  min-width: 0;
  max-width: 100%;
}

.variant-card :deep(.q-pagination__middle) {
  flex-shrink: 0;
}

@media (max-width: 900px) {
  .variants-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
