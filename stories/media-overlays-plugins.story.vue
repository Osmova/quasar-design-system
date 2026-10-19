<script setup lang="ts">
import { ref } from 'vue'
import { PhPlus } from '@phosphor-icons/vue'
import {
  QBtn,
  QCard,
  QCardActions,
  QCardSection,
  QForm,
  QInput,
  QItem,
  QItemLabel,
  QItemSection,
  QList,
  QPageSticky,
  QParallax,
  QPopupProxy,
  QPullToRefresh,
  QSlideItem,
  QTooltip,
  QVideo,
  useQuasar,
} from 'quasar'
import {
  DESIGN_SYSTEM_VARIANTS,
  type DesignSystemMode,
  type DesignSystemVariantName,
} from '../src'
import StoryShell from './_shared/StoryShell.vue'

const $q = useQuasar()
const modeOptions: DesignSystemMode[] = ['light', 'dark', 'system']
const variantOptions = Object.keys(DESIGN_SYSTEM_VARIANTS) as Array<Extract<DesignSystemVariantName, string>>
const initState = () => ({ mode: 'light' as DesignSystemMode, variant: 'fluent' as DesignSystemVariantName })

const workspace = ref('Northwind Ops')
const slideStatus = ref('idle')
const refreshes = ref(0)

function onRefresh(done: () => void) {
  refreshes.value += 1
  done()
}

function onSlide(side: string, reset: () => void) {
  slideStatus.value = side
  reset()
}

function openBottomSheet() {
  $q.bottomSheet({
    title: 'Share surface',
    actions: [
      { label: 'Copy link', id: 'copy' },
      { label: 'Export tokens', id: 'export' },
      {},
      { label: 'Cancel', id: 'cancel' },
    ],
  })
}

function openDialog() {
  $q.dialog({
    title: 'Discard draft',
    message: 'The draft surface has unsaved token overrides.',
    cancel: true,
    persistent: false,
  })
}
</script>

<template>
  <Story title="Design System / Media, Overlays &amp; Plugins" :layout="{ type: 'single', iframe: true }" :init-state="initState">
    <Variant title="Media frames, transient overlays and global plugins">
      <template #default="{ state }">
        <StoryShell
          title="Media, overlays &amp; plugins"
          description="Media frames, gesture rows, transient overlays and the plugin surfaces that leave the component tree."
          :mode="state.mode"
          :variant="state.variant"
        >
          <section class="qds-story-section">
            <h2>QForm</h2>
            <QForm class="qds-story-stack" @submit.prevent>
              <QInput v-model="workspace" outlined label="Workspace name" hint="Shown in invitations." />
              <div class="qds-story-row">
                <QBtn no-caps type="submit" color="primary" label="Save" />
                <QBtn no-caps flat type="reset" label="Reset" />
              </div>
            </QForm>
          </section>

          <section class="qds-story-section">
            <h2>QTooltip &amp; QPopupProxy</h2>
            <div class="qds-story-row">
              <QBtn no-caps label="Hover me">
                <QTooltip>Transient hint on a solid surface</QTooltip>
              </QBtn>
              <QBtn no-caps label="Open proxy">
                <QPopupProxy>
                  <QCard>
                    <QCardSection>Proxy picks menu or dialog by viewport.</QCardSection>
                    <QCardActions align="right"><QBtn v-close-popup flat no-caps label="Close" /></QCardActions>
                  </QCard>
                </QPopupProxy>
              </QBtn>
            </div>
          </section>

          <section class="qds-story-section">
            <h2>QSlideItem</h2>
            <QList bordered separator>
              <QSlideItem left-color="positive" right-color="negative" @left="onSlide('left', $event.reset)" @right="onSlide('right', $event.reset)">
                <template #left>Archive</template>
                <template #right>Delete</template>
                <QItem>
                  <QItemSection>
                    <QItemLabel>Swipe this row</QItemLabel>
                    <QItemLabel caption>Last gesture: {{ slideStatus }}</QItemLabel>
                  </QItemSection>
                </QItem>
              </QSlideItem>
            </QList>
          </section>

          <section class="qds-story-section">
            <h2>QPullToRefresh</h2>
            <div style="max-height: 180px; overflow: auto">
              <QPullToRefresh @refresh="onRefresh">
                <QList bordered separator>
                  <QItem v-for="row in 6" :key="row"><QItemSection>Row {{ row }}</QItemSection></QItem>
                </QList>
                <div class="qds-story-pane">Refreshed {{ refreshes }} time(s)</div>
              </QPullToRefresh>
            </div>
          </section>

          <section class="qds-story-section">
            <h2>QParallax</h2>
            <QParallax :height="180" :speed="0.5">
              <template #media>
                <div style="width: 100%; height: 100%; background: linear-gradient(135deg, var(--qds-color-primary), var(--qds-color-accent))" />
              </template>
              <h3 style="color: var(--qds-text-on-solid)">Scrim-backed caption</h3>
            </QParallax>
          </section>

          <section class="qds-story-section">
            <h2>QVideo</h2>
            <QVideo ratio="16/9" src="about:blank" title="Placeholder frame" style="max-width: 420px" />
          </section>

          <section class="qds-story-section">
            <h2>QPageSticky</h2>
            <div class="qds-story-pane" style="position: relative; height: 140px">
              <QPageSticky position="bottom-right" :offset="[12, 12]">
                <QBtn fab color="primary" aria-label="Add"><PhPlus :size="20" weight="bold" /></QBtn>
              </QPageSticky>
            </div>
          </section>

          <section class="qds-story-section">
            <h2>BottomSheet &amp; Dialog plugins</h2>
            <div class="qds-story-row">
              <QBtn no-caps label="Bottom sheet" @click="openBottomSheet" />
              <QBtn no-caps label="Dialog" @click="openDialog" />
            </div>
          </section>
        </StoryShell>
      </template>

      <template #controls="{ state }">
        <HstSelect v-model="state.mode" title="Mode" :options="modeOptions" />
        <HstSelect v-model="state.variant" title="Variant" :options="variantOptions" />
      </template>
    </Variant>
  </Story>
</template>
