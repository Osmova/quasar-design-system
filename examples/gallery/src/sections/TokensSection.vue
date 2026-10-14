<script setup lang="ts">
import { QDS_TOKENS } from '@osmova/quasar-design-system'
import TokenSwatch from '../components/TokenSwatch.vue'

// Group the public --qds-* contract by visual category for the gallery.
const colorTokens = QDS_TOKENS.filter(
  (t) => t.startsWith('--qds-color-') && !t.endsWith('-rgb'),
)
const surfaceTokens = QDS_TOKENS.filter(
  (t) => t.startsWith('--qds-surface-')
    || t.startsWith('--qds-text')
    || (t.startsWith('--qds-border') && !t.startsWith('--qds-border-width-')),
)
const spaceTokens = QDS_TOKENS.filter((t) => t.startsWith('--qds-space-'))
const radiusTokens = QDS_TOKENS.filter((t) => t.startsWith('--qds-radius-'))
const shadowTokens = QDS_TOKENS.filter(
  (t) => t.startsWith('--qds-shadow-') || t.startsWith('--qds-elevation-'),
)
const motionTokens = QDS_TOKENS.filter((t) => t.startsWith('--qds-motion-'))
const semanticForegroundRoles = ['solid', 'primary', 'secondary', 'accent', 'positive', 'negative', 'warning', 'info'] as const
const semanticRoles = ['primary', 'secondary', 'accent', 'positive', 'negative', 'warning', 'info'] as const
const mutedSurfaces = [0, 1, 2, 3] as const

function semanticForegroundFill(role: typeof semanticForegroundRoles[number]) {
  return role === 'solid' ? '--qds-media-scrim-strong' : `--qds-color-${role}`
}
</script>

<template>
  <div class="tokens-section">
    <q-card class="q-pa-lg">
      <div class="text-h6 qds-display q-mb-sm">Color</div>
      <div class="grid">
        <TokenSwatch v-for="t in colorTokens" :key="t" :token="t" kind="color" />
      </div>
    </q-card>

    <q-card class="q-pa-lg">
      <div class="text-h6 qds-display q-mb-sm">Surface &amp; Text</div>
      <div class="grid">
        <TokenSwatch v-for="t in surfaceTokens" :key="t" :token="t" kind="color" />
      </div>
    </q-card>

    <q-card class="q-pa-lg">
      <div class="text-h6 qds-display q-mb-sm">Semantic foreground utilities</div>
      <div class="grid" data-test="qds-semantic-foreground-utilities">
        <div
          v-for="role in semanticForegroundRoles"
          :key="role"
          class="q-pa-sm rounded-borders"
          :class="`qds-text-on-${role}`"
          :data-test="`qds-semantic-foreground-${role}`"
          :style="{ backgroundColor: `var(${semanticForegroundFill(role)})` }"
        >
          <div class="text-weight-medium">{{ role }}</div>
          <code>.qds-text-on-{{ role }}</code>
        </div>
      </div>
    </q-card>

    <q-card class="q-pa-lg" data-test="qds-semantic-contrast-fixtures">
      <div class="text-h6 qds-display q-mb-sm">Semantic contrast</div>
      <div class="grid q-mb-md">
        <div
          v-for="role in semanticRoles"
          :key="`text-${role}`"
          class="qds-surface q-pa-sm rounded-borders"
          :data-test="`qds-semantic-text-surface-${role}`"
        >
          <span :class="`text-${role}`" :data-test="`qds-semantic-text-${role}`">{{ role }} text</span>
        </div>
      </div>
      <div class="qds-surface q-pa-sm rounded-borders q-mb-md" data-test="qds-tonal-badge-surface">
        <q-badge
          v-for="role in semanticRoles"
          :key="`badge-${role}`"
          class="qds-tonal q-mr-sm q-mb-xs"
          :color="role"
          :data-test="`qds-tonal-badge-${role}`"
          :label="role"
        />
      </div>
      <div class="qds-surface q-pa-sm rounded-borders q-mb-md" data-test="qds-neutral-badge-surface">
        <q-badge color="grey" label="Neutral tonal" data-test="qds-neutral-badge-tonal" />
        <q-badge outline color="grey" class="q-ml-sm" label="Neutral outline" data-test="qds-neutral-badge-outline" />
      </div>
      <q-list class="qds-surface rounded-borders" data-test="qds-active-item-surface">
        <q-item active clickable data-test="qds-active-item">
          <q-item-section>
            <q-item-label>Active semantic item</q-item-label>
            <q-item-label caption>Role remains visible through its active rail and surface.</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
      <div class="grid q-mt-md" data-test="qds-muted-text-fixtures">
        <div
          v-for="surface in mutedSurfaces"
          :key="surface"
          class="q-pa-sm rounded-borders"
          :data-test="`qds-muted-text-surface-${surface}`"
          :style="{ backgroundColor: `var(--qds-surface-${surface})` }"
        >
          <span class="qds-text-muted" :data-test="`qds-muted-text-${surface}`">Muted text on surface {{ surface }}</span>
        </div>
      </div>
      <div class="qds-surface q-pa-sm rounded-borders q-mt-md" data-test="qds-button-contrast-surface">
        <div class="qds-button-row">
          <q-btn outline color="primary" label="Outline" no-caps data-test="qds-button-outline-primary" />
          <q-btn flat color="primary" label="Flat" no-caps data-test="qds-button-flat-primary" />
          <q-btn color="primary" label="Standard" no-caps data-test="qds-button-standard-primary" />
          <q-btn unelevated class="qds-tonal" color="primary" label="Tonal" no-caps data-test="qds-button-tonal-primary" />
          <q-btn unelevated color="primary" label="Solid" no-caps data-test="qds-button-solid-primary" />
        </div>
      </div>
    </q-card>

    <q-card class="q-pa-lg">
      <div class="text-h6 qds-display q-mb-sm">Spacing</div>
      <div class="row q-col-gutter-md items-end">
        <div v-for="t in spaceTokens" :key="t" class="col-auto column items-center" style="gap: 0.5rem">
          <div class="space-bar" :style="{ width: `var(${t})`, height: `var(${t})` }" />
          <code class="caption">{{ t }}</code>
        </div>
      </div>
    </q-card>

    <q-card class="q-pa-lg">
      <div class="text-h6 qds-display q-mb-sm">Radius</div>
      <div class="grid">
        <TokenSwatch v-for="t in radiusTokens" :key="t" :token="t" kind="box" />
      </div>
    </q-card>

    <q-card class="q-pa-lg">
      <div class="text-h6 qds-display q-mb-sm">Shadow &amp; Elevation</div>
      <div class="grid">
        <TokenSwatch v-for="t in shadowTokens" :key="t" :token="t" kind="box" />
      </div>
    </q-card>

    <q-card class="q-pa-lg">
      <div class="text-h6 qds-display q-mb-sm">Motion</div>
      <div class="row q-col-gutter-md">
        <div v-for="t in motionTokens" :key="t" class="col-auto column items-center" style="gap: 0.5rem">
          <div class="motion-dot" :style="{ transition: `transform var(${t})` }" />
          <code class="caption">{{ t }}</code>
        </div>
      </div>
      <p class="qds-text-muted q-mt-sm">Hover a dot to feel the easing/duration.</p>
    </q-card>
  </div>
</template>

<style scoped>
.tokens-section {
  display: grid;
  gap: var(--qds-space-md);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 0.75rem;
}
.caption {
  font-size: 0.7rem;
  color: var(--qds-text-muted);
}
.space-bar {
  background: var(--qds-color-primary);
  border-radius: var(--qds-radius-xs);
}
.motion-dot {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--qds-radius-full);
  background: var(--qds-color-accent);
}
.motion-dot:hover {
  transform: translateX(2rem) scale(1.15);
}
</style>
