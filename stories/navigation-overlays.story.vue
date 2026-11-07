<script setup lang="ts">
import { ref } from 'vue'
import {
  QBtn,
  QCard,
  QCardSection,
  QDialog,
  QDrawer,
  QFooter,
  QItem,
  QItemSection,
  QLayout,
  QList,
  QMenu,
  QPage,
  QPageContainer,
  QSeparator,
  QTab,
  QTabPanel,
  QTabPanels,
  QTabs,
  QToolbar,
} from 'quasar'
import { PhBell, PhFolderOpen, PhPalette, PhSidebar, PhSparkle } from '@phosphor-icons/vue'
import {
  DESIGN_SYSTEM_VARIANTS,
  type DesignSystemMode,
  type DesignSystemVariantName,
} from '../src'
import StoryShell from './_shared/StoryShell.vue'

const modeOptions: DesignSystemMode[] = ['light', 'dark', 'system']
const variantOptions = Object.keys(DESIGN_SYSTEM_VARIANTS) as Array<Extract<DesignSystemVariantName, string>>
const tab = ref('overview')
const dialogOpen = ref(false)
const drawerOpen = ref(false)
const menuOpen = ref(false)

interface NavigationStoryState {
  mode: DesignSystemMode
  variant: DesignSystemVariantName
}

const initState = (): NavigationStoryState => ({ mode: 'light', variant: 'win' })
</script>

<template>
  <Story title="Design System / Navigation" :layout="{ type: 'single', iframe: true }" :init-state="initState">
    <Variant title="Tabs, panels, dialog and menu">
      <template #default="{ state }">
        <StoryShell title="Navigation states" description="Tabs, panels, menus, drawers, and modal overlays use tokenized chrome across QDS variants." :mode="state.mode" :variant="state.variant">
          <div class="qds-story-stack qds-story-stack--relaxed">
            <QCard class="qds-story-panel q-pa-lg q-mb-lg">
              <div class="text-overline qds-text-muted">QTabs + QTabPanels</div>
              <QTabs v-model="tab" align="left" inline-label class="qds-story-tabs q-mt-sm">
                <QTab name="overview" aria-label="Overview">
                  <PhSparkle :size="18" weight="regular" class="qds-story-tab-icon on-left" /> <span class="qds-story-tab-label">Overview</span>
                </QTab>
                <QTab name="assets" aria-label="Assets">
                  <PhFolderOpen :size="18" weight="regular" class="qds-story-tab-icon on-left" /> <span class="qds-story-tab-label">Assets</span>
                </QTab>
                <QTab name="alerts" aria-label="Alerts">
                  <PhBell :size="18" weight="regular" class="qds-story-tab-icon on-left" /> <span class="qds-story-tab-label">Alerts</span>
                </QTab>
              </QTabs>
              <QSeparator />
              <QTabPanels v-model="tab" animated class="qds-story-tab-panels">
                <QTabPanel name="overview">
                  <div class="row items-center q-col-gutter-md">
                    <div class="col-auto"><PhSparkle :size="34" weight="duotone" /></div>
                    <div class="col">
                      <div class="text-h6 qds-story-title">Overview panel</div>
                      <p class="qds-text-muted q-mb-none">Active panel with soft card surface and deterministic content.</p>
                    </div>
                  </div>
                </QTabPanel>
                <QTabPanel name="assets">
                  <div class="row items-center q-col-gutter-md">
                    <div class="col-auto"><PhFolderOpen :size="34" weight="duotone" /></div>
                    <div class="col">Asset navigation keeps tab spacing consistent with list and menu rows.</div>
                  </div>
                </QTabPanel>
                <QTabPanel name="alerts">
                  <div class="row items-center q-col-gutter-md">
                    <div class="col-auto"><PhBell :size="34" weight="duotone" /></div>
                    <div class="col">Alert panel demonstrates icon and body text alignment.</div>
                  </div>
                </QTabPanel>
              </QTabPanels>
            </QCard>

            <QCard class="qds-story-panel q-pa-lg q-mb-lg">
              <div class="text-overline qds-text-muted">QDrawer</div>
              <div class="row items-center justify-between q-gutter-md q-mb-md">
                <div class="text-h6 qds-story-title">Layout shell proof</div>
                <QBtn outline color="primary" no-caps label="Toggle drawer" @click="drawerOpen = !drawerOpen" />
              </div>
              <QLayout view="hHh lpR fFf" container class="qds-story-layout">
                <QDrawer v-model="drawerOpen" bordered :width="216" data-test="qds-story-drawer">
                  <QList dense>
                    <QItem clickable active>
                      <QItemSection avatar><PhSparkle :size="18" weight="duotone" /></QItemSection>
                      <QItemSection>Overview</QItemSection>
                    </QItem>
                    <QItem clickable>
                      <QItemSection avatar><PhSidebar :size="18" weight="regular" /></QItemSection>
                      <QItemSection>Navigation</QItemSection>
                    </QItem>
                  </QList>
                </QDrawer>
                <QPageContainer>
                  <QPage class="q-pa-md">
                    <div class="qds-story-panel q-pa-md">Fluent keeps selective material; Ink resolves to a matte separator-driven drawer.</div>
                  </QPage>
                </QPageContainer>
                <QFooter bordered>
                  <QToolbar style="min-height: 2.25rem"><span class="qds-text-muted">Footer edge proof</span></QToolbar>
                </QFooter>
              </QLayout>
            </QCard>

            <div class="row q-col-gutter-lg">
              <div class="col-12 col-md-6">
                <QCard class="qds-story-panel q-pa-lg full-height">
                  <div class="text-overline qds-text-muted">QMenu</div>
                  <div class="text-h6 qds-story-title q-mb-md">Anchored overlay menu</div>
                  <QBtn color="primary" unelevated label="Open menu" no-caps data-test="qds-story-menu-trigger">
                    <QMenu v-model="menuOpen" persistent anchor="bottom left" self="top left" :offset="[0, 8]" class="qds-story-menu-proof">
                      <QList dense style="min-width: 220px">
                        <QItem clickable>
                          <QItemSection avatar><PhPalette :size="18" weight="regular" /></QItemSection>
                          <QItemSection>Switch variant</QItemSection>
                        </QItem>
                        <QItem clickable>
                          <QItemSection avatar><PhSidebar :size="18" weight="regular" /></QItemSection>
                          <QItemSection>Pin navigation</QItemSection>
                        </QItem>
                        <QSeparator />
                        <QItem clickable>
                          <QItemSection>Open documentation</QItemSection>
                        </QItem>
                      </QList>
                    </QMenu>
                  </QBtn>
                  <p class="qds-text-muted q-mt-md q-mb-none">Open the menu to review the anchored overlay material in each variant.</p>
                </QCard>
              </div>

              <div class="col-12 col-md-6">
                <QCard class="qds-story-panel q-pa-lg full-height">
                  <div class="text-overline qds-text-muted">QDialog</div>
                  <div class="text-h6 qds-story-title q-mb-md">Modal surface</div>
                  <QBtn outline color="primary" label="Open dialog" no-caps @click="dialogOpen = true" />
                  <QDialog v-model="dialogOpen" persistent>
                    <QCard class="qds-story-dialog" style="min-width: 320px">
                      <QCardSection>
                        <div class="text-h6 qds-story-title">Design-system dialog</div>
                        <p class="qds-text-muted q-mb-none">Open on demand to review scrim, card radius, and action spacing.</p>
                      </QCardSection>
                      <QCardSection class="row justify-end q-gutter-sm">
                        <QBtn flat label="Cancel" no-caps @click="dialogOpen = false" />
                        <QBtn color="primary" unelevated label="Confirm" no-caps @click="dialogOpen = false" />
                      </QCardSection>
                    </QCard>
                  </QDialog>
                  <p class="qds-text-muted q-mt-md q-mb-none">The dialog can be closed and reopened without changing any story data.</p>
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
.qds-story-panel,
.qds-story-dialog {
  background: var(--qds-card-bg);
  border: var(--qds-border-width-control) solid var(--qds-card-border);
}

.qds-story-title {
  font-family: var(--qds-font-family-display);
}

.qds-story-tabs,
.qds-story-tab-panels {
  background: transparent;
}

.qds-story-layout {
  block-size: clamp(16rem, 48vw, 18.75rem);
  overflow: hidden;
  border: var(--qds-border-width-control) solid var(--qds-card-border);
  border-radius: var(--qds-card-radius);
}

@media (max-width: 32rem) {
  .qds-story-tabs :deep(.q-tab) {
    flex: 1 1 0;
    min-width: 0;
    padding-inline: var(--qds-space-sm);
  }

  .qds-story-tab-label {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }

  .qds-story-tab-icon {
    margin-inline: 0;
  }
}
</style>
