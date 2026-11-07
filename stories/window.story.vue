<script setup lang="ts">
import { ref } from 'vue'
import { QBtn } from 'quasar'
import { QdsWindow } from '../src/qwindow'
import {
  DESIGN_SYSTEM_VARIANTS,
  type DesignSystemMode,
  type DesignSystemVariantName,
} from '../src'
import '@quasar/quasar-ui-qwindow/index.css'
import '../src/css/extensions/qwindow.scss'
import StoryShell from './_shared/StoryShell.vue'

const visible = ref(true)
const maximized = ref(false)
const modeOptions: DesignSystemMode[] = ['light', 'dark', 'system']
const variantOptions = Object.keys(DESIGN_SYSTEM_VARIANTS) as Array<Extract<DesignSystemVariantName, string>>

interface WindowStoryState {
  mode: DesignSystemMode
  variant: DesignSystemVariantName
}

const initState = (): WindowStoryState => ({ mode: 'light', variant: 'win' })
</script>

<template>
  <Story title="Optional / QWindow" :layout="{ type: 'single', iframe: true }" :init-state="initState">
    <Variant title="Embedded QDS window">
      <template #default="{ state }">
        <StoryShell title="Optional window" description="An embedded optional-module surface with a reliable close and reopen path." :mode="state.mode" :variant="state.variant">
          <div class="qds-window-story__stage">
            <QdsWindow
              v-if="visible"
              v-model="visible"
              v-model:maximized="maximized"
              title="QDS optional window"
              embedded
              dense
              no-resize
              :actions="['close']"
              aria-label="QDS optional QWindow story"
            >
              <div class="qds-window-story__content">
                <p class="text-overline qds-text-muted q-mb-xs">Optional module</p>
                <h2 class="qds-story-heading q-mt-none q-mb-sm">Window chrome follows QDS tokens</h2>
                <p class="qds-text-muted q-mb-none">
                  Consumers install <code>@quasar/quasar-ui-qwindow</code>, import its native CSS, then opt into the QDS extension stylesheet.
                </p>
              </div>
            </QdsWindow>
            <div v-else class="qds-window-story__reopen">
              <QBtn color="primary" unelevated no-caps label="Reopen window" @click="visible = true" />
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
.qds-window-story__stage {
  min-height: 22rem;
  padding: var(--qds-space-md);
  border: var(--qds-border-width-control) solid var(--qds-border-subtle);
  border-radius: var(--qds-radius-xl);
  background: var(--qds-surface-0);
}

.qds-window-story__reopen {
  display: grid;
  min-block-size: 18rem;
  place-items: center;
}

.qds-window-story__content {
  max-width: 44rem;
}

.qds-story-heading {
  font-family: var(--qds-font-family-display);
  font-size: clamp(1.5rem, 2.4vw, 2.2rem);
  line-height: 1.1;
}
</style>
