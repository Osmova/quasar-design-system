<script setup lang="ts">
import { ref } from 'vue'
import {
  QBtn,
  QBtnDropdown,
  QBtnGroup,
  QBtnToggle,
  QCard,
  QFab,
  QFabAction,
  QItem,
  QItemSection,
  QList,
} from 'quasar'
import {
  PhArrowBendUpRight,
  PhCopy,
  PhPalette,
  PhPencilSimple,
  PhPlus,
  PhShareNetwork,
  PhSparkle,
} from '@phosphor-icons/vue'
import {
  DESIGN_SYSTEM_VARIANTS,
  type DesignSystemMode,
  type DesignSystemVariantName,
} from '../src'
import StoryShell from './_shared/StoryShell.vue'

const modeOptions: DesignSystemMode[] = ['light', 'dark', 'system']
const variantOptions = Object.keys(DESIGN_SYSTEM_VARIANTS) as Array<Extract<DesignSystemVariantName, string>>
const cadence = ref('weekly')
const density = ref('comfortable')
const fabOpen = ref(true)

interface ActionStoryState {
  mode: DesignSystemMode
  variant: DesignSystemVariantName
}

const initState = (): ActionStoryState => ({
  mode: 'light',
  variant: 'win',
})

const cadenceOptions = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
]

const densityOptions = [
  { label: 'Compact', value: 'compact' },
  { label: 'Comfortable', value: 'comfortable' },
  { label: 'Touch', value: 'touch' },
]

</script>

<template>
  <Story title="Design System / Actions" :layout="{ type: 'single', iframe: true }" :init-state="initState">
    <Variant title="Buttons, groups and FAB">
      <template #default="{ state }">
        <StoryShell
          title="Action primitives"
          description="Focused coverage for grouped actions, dropdown affordances, toggles, and floating entry points."
          :mode="state.mode"
          :variant="state.variant"
        >
          <div class="qds-actions-layout">
            <QCard class="qds-story-panel q-pa-lg">
              <div class="text-overline qds-text-muted">Interaction inventory</div>
              <h2 class="qds-story-heading q-my-sm">Buttons, groups and FAB</h2>
              <p class="qds-text-muted q-mb-none">
                Review action hierarchy, segmented choices, and a contained floating action state.
              </p>
            </QCard>

            <QCard class="qds-story-panel q-pa-lg">
              <div class="qds-story-grid">
                <div class="qds-story-demo">
                  <div class="qds-story-label">QBtnDropdown</div>
                  <QBtnDropdown unelevated color="primary" label="Actions" no-caps>
                    <QList dense style="min-width: 180px">
                      <QItem v-close-popup clickable>
                        <QItemSection>Duplicate</QItemSection>
                      </QItem>
                      <QItem v-close-popup clickable>
                        <QItemSection>Move</QItemSection>
                      </QItem>
                      <QItem v-close-popup clickable>
                        <QItemSection>Archive</QItemSection>
                      </QItem>
                    </QList>
                  </QBtnDropdown>
                </div>

                <div class="qds-story-demo">
                  <div class="qds-story-label">QBtnGroup</div>
                  <QBtnGroup unelevated spread>
                    <QBtn color="primary" label="One" no-caps />
                    <QBtn color="primary" label="Two" no-caps />
                    <QBtn color="primary" label="Three" no-caps />
                  </QBtnGroup>
                </div>

                <div class="qds-story-demo">
                  <div class="qds-story-label">QBtnToggle</div>
                  <QBtnToggle v-model="cadence" unelevated no-caps toggle-color="primary" :options="cadenceOptions" />
                </div>

                <div class="qds-story-demo">
                  <div class="qds-story-label">Segmented density</div>
                  <QBtnToggle v-model="density" dense unelevated no-caps toggle-color="secondary" :options="densityOptions" />
                </div>

                <div class="qds-story-demo qds-story-demo--wide">
                  <div class="qds-story-label">QFab open state</div>
                  <div class="qds-story-fab-stage">
                    <QFab v-model="fabOpen" color="accent" direction="up" label="Create" no-caps>
                      <QFabAction color="primary" label="Draft">
                        <PhPencilSimple :size="18" weight="regular" />
                      </QFabAction>
                      <QFabAction color="secondary" label="Share">
                        <PhShareNetwork :size="18" weight="regular" />
                      </QFabAction>
                    </QFab>
                  </div>
                </div>

                <div class="qds-story-demo qds-story-demo--wide">
                  <div class="qds-story-label">Icon + tonal actions</div>
                  <div class="qds-actions-icon-row">
                    <QBtn unelevated color="primary" no-caps>
                      <PhSparkle :size="18" weight="regular" />
                      Compose
                    </QBtn>
                    <QBtn outline color="primary" no-caps>
                      <PhCopy :size="18" weight="regular" />
                      Copy
                    </QBtn>
                    <QBtn flat color="primary" no-caps>
                      <PhArrowBendUpRight :size="18" weight="regular" />
                      Share
                    </QBtn>
                    <QBtn round color="accent" aria-label="Quick add">
                      <PhPlus :size="20" weight="bold" />
                    </QBtn>
                    <QBtn round flat aria-label="Palette">
                      <PhPalette :size="20" weight="regular" />
                    </QBtn>
                  </div>
                </div>
              </div>
            </QCard>
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
.qds-actions-layout {
  display: grid;
  gap: var(--qds-space-md);
}

.qds-story-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--qds-space-md);
}

.qds-story-demo--wide {
  grid-column: 1 / -1;
}

.qds-story-fab-stage {
  display: flex;
  min-height: 12rem;
  align-items: end;
  padding: 6rem var(--qds-space-sm) var(--qds-space-sm);
}

.qds-actions-icon-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--qds-space-sm);
}

@media (max-width: 42rem) {
  .qds-story-grid {
    grid-template-columns: 1fr;
  }
}
</style>
