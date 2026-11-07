<script setup lang="ts">
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import {
  PhBellRinging,
  PhCheckCircle,
  PhSparkle,
} from '@phosphor-icons/vue'
import {
  DESIGN_SYSTEM_VARIANTS,
  type DesignSystemMode,
  type DesignSystemVariantName,
} from '../src'
import StoryShell from './_shared/StoryShell.vue'

const $q = useQuasar()

const modeOptions: DesignSystemMode[] = ['light', 'dark', 'system']
const variantOptions = Object.keys(DESIGN_SYSTEM_VARIANTS) as Array<Extract<DesignSystemVariantName, string>>
const density = ref('Comfortable')
const search = ref('Design tokens')
const enabled = ref(true)

interface OverviewStoryState {
  mode: DesignSystemMode
  variant: DesignSystemVariantName
}

const initState = (): OverviewStoryState => ({ mode: 'light', variant: 'win' })

function notify() {
  $q.notify({
    type: 'info',
    message: 'QDS notification surface',
    caption: 'Phosphor control icons via qdsIconSet',
    timeout: 1400,
  })
}
</script>

<template>
  <Story title="Design System / Overview" :layout="{ type: 'single', iframe: true }" :init-state="initState">
    <Variant title="QDS catalog">
      <template #default="{ state }">
        <StoryShell title="Quasar Design System" description="Neutral-first components over Quasar 2 primitives." :mode="state.mode" :variant="state.variant">
        <q-toolbar class="qds-story-toolbar q-mb-lg rounded-borders">
          <q-toolbar-title>
            <div class="text-h6 qds-story-title">Component catalog</div>
            <div class="text-caption qds-text-muted">Fields, feedback, typography, and semantic actions.</div>
          </q-toolbar-title>
          <q-btn color="info" unelevated @click="notify">
            <template #default>
              <PhBellRinging :size="18" weight="regular" />
              Notify
            </template>
          </q-btn>
        </q-toolbar>

        <div class="row q-col-gutter-lg">
          <div class="col-12 col-lg-4">
            <q-card class="q-pa-lg qds-story-panel qds-story-panel--neutral">
              <div class="text-overline qds-text-muted">Field controls</div>
              <div class="text-h6 q-mb-md">Interactive states</div>
              <q-input v-model="search" label="Search field" outlined dense class="q-mb-md">
                <template #prepend>
                  <PhSparkle :size="18" weight="regular" />
                </template>
              </q-input>
              <q-select v-model="density" :options="['Compact', 'Comfortable', 'Spacious']" label="Density sample" outlined dense class="q-mb-md" />
              <q-toggle v-model="enabled" color="primary" label="Interactive state" />
              <q-separator class="q-my-md" />
              <div class="text-caption qds-text-muted">Mode and variant are controlled from the Histoire panel.</div>
            </q-card>
          </div>

          <div class="col-12 col-lg-8">
            <q-card class="q-pa-lg qds-story-panel q-mb-lg">
              <div class="row items-start q-col-gutter-lg">
                <div class="col-12 col-md-7">
                  <div class="text-overline qds-text-muted">Buttons</div>
                  <h2 class="qds-story-heading q-mt-none q-mb-sm">Neutral first, colour for meaning</h2>
                  <p class="qds-text-muted q-mb-lg">
                    Default actions are neutral; <code>color</code> gives a solid role fill and <code>qds-tonal</code> opts into a soft wash.
                  </p>
                  <div class="q-gutter-sm q-mb-md">
                    <q-btn label="Neutral" />
                    <q-btn unelevated color="primary" label="Primary" />
                    <q-btn outline label="Outline" />
                    <q-btn flat label="Subtle" />
                  </div>
                  <div class="q-gutter-sm">
                    <q-btn unelevated class="qds-tonal" color="primary" label="Primary tonal" />
                    <q-btn unelevated class="qds-tonal" color="positive" label="Positive tonal" />
                    <q-btn unelevated class="qds-tonal" color="warning" label="Warning tonal" />
                    <q-btn unelevated class="qds-tonal" color="negative" label="Negative tonal" />
                  </div>
                </div>

                <div class="col-12 col-md-5">
                  <div class="qds-story-feature q-pa-lg rounded-borders">
                    <PhSparkle :size="44" weight="duotone" />
                    <div class="text-h6 q-mt-md">Phosphor content icon</div>
                    <p class="qds-text-muted q-mb-none">
                      Content uses duotone icons; Quasar controls use the QDS Phosphor line icon set.
                    </p>
                  </div>
                </div>
              </div>
            </q-card>

            <div class="row q-col-gutter-lg">
              <div class="col-12 col-md-6">
                <q-card class="q-pa-lg qds-story-panel full-height">
                  <div class="text-overline qds-text-muted">Cards and surfaces</div>
                  <div class="text-h6 q-mb-sm">Layered surface rhythm</div>
                  <p class="qds-text-muted">Cards keep a neutral border, subtle depth, and tokenized radius across variants.</p>
                  <div class="qds-story-surface q-pa-md rounded-borders q-mb-md">
                    Muted surface utility with body text and soft boundary.
                  </div>
                  <div class="qds-glass q-pa-md rounded-borders">Acrylic utility for translucent emphasis.</div>
                </q-card>
              </div>

              <div class="col-12 col-md-6">
                <q-card class="q-pa-lg qds-story-panel full-height">
                  <div class="text-overline qds-text-muted">Feedback</div>
                  <div class="text-h6 q-mb-md">Badges, chips, notification</div>
                  <div class="q-gutter-sm q-mb-md">
                    <q-badge color="primary" label="Primary" />
                    <q-badge color="positive" label="Ready" />
                    <q-chip color="warning" label="Review" />
                    <q-chip color="info" removable label="Info chip" />
                  </div>
                  <q-banner rounded class="qds-story-banner">
                    <template #avatar>
                      <PhCheckCircle :size="24" weight="duotone" />
                    </template>
                    Toolbar, menu, fields, and Notify all inherit QDS tokens.
                  </q-banner>
                </q-card>
              </div>
            </div>

            <q-card class="q-pa-lg qds-story-panel q-mt-lg">
              <div class="text-overline qds-text-muted">Typography</div>
              <div class="qds-story-display">Display face: Fluent-inspired, calm, readable.</div>
              <p class="qds-story-body q-mb-none">
                Body face: Inter variable with local font assets and semantic token fallbacks for public package consumers.
              </p>
            </q-card>
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
.qds-story-toolbar,
.qds-story-panel {
  background: var(--qds-card-bg);
  border: var(--qds-border-width-control) solid var(--qds-card-border);
}

.qds-story-toolbar :deep(.q-toolbar__title) {
  overflow: visible;
  white-space: normal;
  text-overflow: clip;
}

.qds-story-toolbar {
  min-height: auto;
  gap: var(--qds-space-sm);
}

.qds-story-toolbar :deep(.q-toolbar__title) {
  min-width: 0;
}

.qds-story-title,
.qds-story-display {
  font-family: var(--qds-font-family-display);
}

.qds-story-feature {
  background: rgba(var(--qds-color-primary-rgb), var(--qds-tonal-bg-opacity));
  border: var(--qds-border-width-control) solid rgba(var(--qds-color-primary-rgb), var(--qds-tonal-border-opacity));
}

.qds-story-surface,
.qds-story-banner {
  background: var(--qds-surface-1);
  border: var(--qds-border-width-control) solid var(--qds-border-subtle);
}

.qds-story-display {
  font-size: clamp(1.75rem, 4vw, 3rem);
  font-weight: var(--qds-font-weight-bold);
  line-height: 1.05;
}

.qds-story-body {
  max-width: 64ch;
  color: var(--qds-text-muted);
}

@media (max-width: 32rem) {
  .qds-story-toolbar {
    flex-wrap: wrap;
    align-items: flex-start;
  }

  .qds-story-toolbar :deep(.q-toolbar__title),
  .qds-story-toolbar :deep(.q-btn) {
    flex-basis: 100%;
  }
}
</style>
