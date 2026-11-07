<script setup lang="ts">
import { ref } from 'vue'
import {
  QBanner,
  QBtn,
  QCard,
  QCircularProgress,
  QInnerLoading,
  QKnob,
  QLinearProgress,
  QSeparator,
  QSkeleton,
  QSpinner,
  useQuasar,
} from 'quasar'
import { PhBellRinging, PhCheckCircle, PhCloudArrowUp, PhWarningCircle } from '@phosphor-icons/vue'
import {
  DESIGN_SYSTEM_VARIANTS,
  type DesignSystemMode,
  type DesignSystemVariantName,
} from '../src'
import StoryShell from './_shared/StoryShell.vue'

const $q = useQuasar()
const modeOptions: DesignSystemMode[] = ['light', 'dark', 'system']
const variantOptions = Object.keys(DESIGN_SYSTEM_VARIANTS) as Array<Extract<DesignSystemVariantName, string>>
const knobValue = ref(64)

interface FeedbackStoryState {
  mode: DesignSystemMode
  variant: DesignSystemVariantName
}

const initState = (): FeedbackStoryState => ({ mode: 'light', variant: 'win' })

function notify() {
  $q.notify({
    type: 'positive',
    message: 'Design-system notification',
    caption: 'Notify plugin preview from Histoire',
    timeout: 1400,
  })
}

</script>

<template>
  <Story title="Design System / Feedback" :layout="{ type: 'single', iframe: true }" :init-state="initState">
    <Variant title="Notify, banner, skeleton and progress">
      <template #default="{ state }">
        <StoryShell title="Feedback surfaces" description="Static loading states plus a Notify trigger for plugin-level visual review." :mode="state.mode" :variant="state.variant">
          <div class="qds-story-stack qds-story-stack--relaxed">
            <QCard class="qds-story-panel q-pa-lg">
              <div class="row items-center justify-between q-gutter-md">
                <div>
                  <div class="text-overline qds-text-muted">Notify</div>
                  <div class="text-h6 qds-story-title">Plugin-level feedback</div>
                </div>
              <QBtn color="primary" unelevated no-caps @click="notify">
                <PhBellRinging :size="18" weight="regular" />
                Show Notify
              </QBtn>
              </div>
            </QCard>
            <div class="row q-col-gutter-lg">
              <div class="col-12">
                <QCard class="qds-story-panel q-pa-lg">
                  <div class="text-overline qds-text-muted">QBanner</div>
                  <QBanner rounded class="qds-story-banner q-mt-sm">
                    <template #avatar>
                      <PhCheckCircle :size="28" weight="duotone" />
                    </template>
                    <div class="text-weight-medium">Visual gate ready</div>
                    <div class="qds-text-muted">Banners use surface, border, icon, and muted-text tokens across modes.</div>
                  </QBanner>
                  <QBanner rounded class="qds-story-banner qds-story-banner--warning q-mt-md">
                    <template #avatar>
                      <PhWarningCircle :size="28" weight="duotone" />
                    </template>
                    <div class="text-weight-medium">Review required</div>
                    <div class="qds-text-muted">Secondary banner state with warning color context.</div>
                  </QBanner>
                </QCard>
              </div>

              <div class="col-12 col-md-6">
                <QCard class="qds-story-panel q-pa-lg full-height">
                  <div class="text-overline qds-text-muted">QLinearProgress</div>
                  <div class="text-h6 qds-story-title q-mb-md">Progress states</div>
                  <QLinearProgress :value="0.68" rounded color="primary" size="12px" />
                  <QLinearProgress :value="0.38" rounded color="secondary" size="8px" class="q-mt-md" />
                  <QSeparator class="q-my-md" />
                  <div class="row items-center q-gutter-md">
                    <QCircularProgress class="qds-story-progress-track" show-value :value="72" size="3.5rem" color="accent" track-color="transparent" />
                    <QSpinner color="primary" size="2rem" />
                    <div>
                      <div class="text-weight-medium">Circular progress + spinner</div>
                      <div class="qds-text-muted">Static proof for determinate and live wait treatments.</div>
                    </div>
                  </div>
                  <QSeparator class="q-my-md" />
                  <div class="row items-center q-gutter-md">
                    <QKnob v-model="knobValue" class="qds-story-progress-track" show-value size="4.5rem" :thickness="0.18" color="primary" track-color="transparent" />
                    <div class="qds-text-muted">Knob inherits QDS progress color and track tokens.</div>
                  </div>
                </QCard>
              </div>

              <div class="col-12 col-md-6">
                <QCard class="qds-story-panel q-pa-lg full-height">
                  <div class="text-overline qds-text-muted">QSkeleton</div>
                  <div class="text-h6 qds-story-title q-mb-md">Placeholder block</div>
                  <QSkeleton type="text" animation="none" width="42%" />
                  <QSkeleton type="rect" animation="none" height="72px" class="q-mt-sm" />
                  <QSkeleton type="text" animation="none" width="72%" class="q-mt-sm" />
                  <QSkeleton type="text" animation="none" width="56%" class="q-mt-sm" />
                </QCard>
              </div>

              <div class="col-12">
                <QCard class="qds-story-panel q-pa-lg">
                  <div class="text-overline qds-text-muted">QInnerLoading overlay</div>
                  <div class="qds-story-loading-box q-mt-sm">
                    <div class="row items-center q-col-gutter-md">
                      <div class="col-auto"><PhCloudArrowUp :size="34" weight="duotone" /></div>
                      <div class="col">
                        <div class="text-h6 qds-story-title">Syncing design assets</div>
                        <p class="qds-text-muted q-mb-none">A deterministic overlay state for loading-surface review.</p>
                      </div>
                    </div>
                    <QInnerLoading showing label="Syncing" color="primary" class="qds-plugin-inner-loading" data-test="qds-story-inner-loading" />
                  </div>
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

.qds-story-banner,
.qds-story-loading-box {
  background: var(--qds-surface-1);
  border: var(--qds-border-width-control) solid var(--qds-border-subtle);
}

.qds-story-progress-track :deep(.q-circular-progress__track),
.qds-story-progress-track :deep(.q-knob__track) {
  stroke: var(--qds-border-subtle);
}

.qds-story-banner--warning {
  border-color: rgba(var(--qds-color-warning-rgb), var(--qds-tonal-border-opacity));
}

.qds-story-loading-box {
  position: relative;
  min-height: 9rem;
  padding: var(--qds-space-lg);
  border-radius: var(--qds-radius-lg);
}
</style>
