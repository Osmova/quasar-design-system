<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch, type Component } from 'vue'
import {
  PhDeviceMobile,
  PhMoonStars,
  PhMonitor,
  PhPalette,
  PhPenNib,
  PhSun,
  PhTerminal,
  PhSquaresFour,
} from '@phosphor-icons/vue'
import {
  useDesignSystem,
  DESIGN_SYSTEM_VARIANTS,
  SHADCN_BASE_COLORS,
  type ShadcnBaseColor,
  type DesignSystemMode,
  type DesignSystemVariantName,
} from '@osmova/quasar-design-system'

import TokensSection from './sections/TokensSection.vue'
import TypographySection from './sections/TypographySection.vue'
import ComponentsSection from './sections/ComponentsSection.vue'
import FormsSection from './sections/FormsSection.vue'
import AppsSection from './sections/AppsSection.vue'
import CatalogSection from './sections/CatalogSection.vue'
import CompareSection from './sections/CompareSection.vue'
import IconsSection from './sections/IconsSection.vue'
import FontsSection from './sections/FontsSection.vue'
import PluginsSection from './sections/PluginsSection.vue'
import ScenesSection from './sections/ScenesSection.vue'
import VariantsSection from './sections/VariantsSection.vue'
import WindowSection from './sections/WindowSection.vue'

const ds = useDesignSystem()

type GalleryTab = 'tokens' | 'typography' | 'compare' | 'components' | 'forms' | 'apps' | 'catalog' | 'variants' | 'scenes' | 'plugins' | 'window' | 'icons' | 'fonts'

const tabs: GalleryTab[] = ['tokens', 'typography', 'compare', 'components', 'forms', 'apps', 'catalog', 'variants', 'scenes', 'plugins', 'window', 'icons', 'fonts']
const tab = ref<GalleryTab>(tabFromHash())

const modes: DesignSystemMode[] = ['light', 'dark', 'system']
const variants = Object.values(DESIGN_SYSTEM_VARIANTS)
const modeIcons = {
  light: PhSun,
  dark: PhMoonStars,
  system: PhMonitor,
} as const
const variantIcons: Record<string, Component> = {
  fluent: PhPalette,
  ink: PhPenNib,
  one: PhDeviceMobile,
  term: PhTerminal,
  shadcn: PhSquaresFour,
}

const modeOptions = modes.map((mode) => ({
  value: mode,
  slot: `mode-${mode}`,
  class: 'gallery-switcher__button',
  attrs: { 'aria-label': `${mode} mode` },
}))
const variantOptions = variants.map((variant) => ({
  value: variant.name,
  slot: `variant-${variant.name}`,
  class: 'gallery-switcher__button',
  attrs: { 'aria-label': variant.label },
}))

function onMode(mode: DesignSystemMode) {
  ds.setMode(mode)
}

function onVariant(variant: DesignSystemVariantName) {
  ds.setVariant(variant)
}

function onBaseColor(color: ShadcnBaseColor) {
  ds.setShadcnBaseColor(color)
}

function tabFromHash(): GalleryTab {
  if (typeof window === 'undefined') {
    return 'tokens'
  }

  const value = window.location.hash.replace(/^#\/?/, '')
  return tabs.includes(value as GalleryTab) ? value as GalleryTab : 'tokens'
}

function onHashChange() {
  tab.value = tabFromHash()
}

function revealActiveGalleryTab() {
  nextTick(() => {
    window.setTimeout(() => {
      document.querySelector<HTMLElement>('.gallery-tabs .q-tab--active')?.scrollIntoView({
        block: 'nearest',
        inline: 'center',
      })
    }, 0)
  })
}

onMounted(() => {
  window.addEventListener('hashchange', onHashChange)
  revealActiveGalleryTab()
})

onBeforeUnmount(() => {
  window.removeEventListener('hashchange', onHashChange)
})

watch(tab, (value) => {
  if (typeof window === 'undefined') {
    return
  }

  const nextHash = value === 'tokens' ? '' : `#${value}`
  const next = `${window.location.pathname}${window.location.search}${nextHash}`
  if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== next) {
    window.history.replaceState(null, '', next)
  }

  revealActiveGalleryTab()
})
</script>

<template>
  <q-layout view="hHh lpR fFf">
    <q-header class="gallery-header">
      <q-toolbar>
        <q-toolbar-title class="gallery-title qds-display">Quasar Design System</q-toolbar-title>

        <div class="gallery-controls">
          <q-btn-toggle
            :model-value="ds.mode.value"
            no-caps
            aria-label="Mode"
            role="group"
            class="gallery-switcher"
            :options="modeOptions"
            @update:model-value="onMode"
          >
            <template v-for="mode in modes" :key="mode" #[`mode-${mode}`]>
              <component :is="modeIcons[mode]" :size="16" weight="duotone" />
              <span class="gallery-switcher__label">{{ mode }}</span>
            </template>
          </q-btn-toggle>

          <q-btn-toggle
            :model-value="ds.variant.value"
            no-caps
            aria-label="Variant"
            role="group"
            class="gallery-switcher"
            :options="variantOptions"
            @update:model-value="onVariant"
          >
            <template v-for="variant in variants" :key="variant.name" #[`variant-${variant.name}`]>
              <component :is="variantIcons[variant.name] ?? PhPalette" :size="16" weight="duotone" />
              <span class="gallery-switcher__label">{{ variant.label }}</span>
            </template>
          </q-btn-toggle>
          <q-select
            v-if="ds.variant.value === 'shadcn'"
            :model-value="ds.shadcnBaseColor.value"
            :options="SHADCN_BASE_COLORS"
            option-value="name"
            option-label="label"
            emit-value
            map-options
            dense
            outlined
            label="Base palette"
            aria-label="Shadcn base palette"
            class="gallery-palette"
            data-test="qds-shadcn-palette"
            @update:model-value="onBaseColor"
          />
        </div>
      </q-toolbar>

      <q-tabs
        v-model="tab"
        align="left"
        no-caps
        inline-label
        mobile-arrows
        outside-arrows
        class="gallery-tabs"
      >
        <q-tab name="tokens" label="Tokens" />
        <q-tab name="typography" label="Typography" />
        <q-tab name="compare" label="Compare" />
        <q-tab name="components" label="Components" />
        <q-tab name="forms" label="Forms" />
        <q-tab name="apps" label="Apps" />
        <q-tab name="catalog" label="Catalog" />
        <q-tab name="variants" label="Variants" />
        <q-tab name="scenes" label="Scenes" />
        <q-tab name="plugins" label="Plugins" />
        <q-tab name="window" label="Window" />
        <q-tab name="icons" label="Icons" />
        <q-tab name="fonts" label="Fonts" />
      </q-tabs>
    </q-header>

    <q-page-container>
      <q-page class="gallery-page">
        <q-tab-panels v-model="tab" animated class="gallery-panels bg-transparent">
          <q-tab-panel name="tokens"><TokensSection /></q-tab-panel>
          <q-tab-panel name="typography"><TypographySection /></q-tab-panel>
          <q-tab-panel name="compare"><CompareSection /></q-tab-panel>
          <q-tab-panel name="components"><ComponentsSection /></q-tab-panel>
          <q-tab-panel name="forms"><FormsSection /></q-tab-panel>
          <q-tab-panel name="apps"><AppsSection /></q-tab-panel>
          <q-tab-panel name="catalog"><CatalogSection /></q-tab-panel>
          <q-tab-panel name="variants"><VariantsSection /></q-tab-panel>
          <q-tab-panel name="scenes"><ScenesSection /></q-tab-panel>
          <q-tab-panel name="plugins"><PluginsSection /></q-tab-panel>
          <q-tab-panel name="window"><WindowSection /></q-tab-panel>
          <q-tab-panel name="icons"><IconsSection /></q-tab-panel>
          <q-tab-panel name="fonts"><FontsSection /></q-tab-panel>
        </q-tab-panels>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<style scoped>
.gallery-page {
  min-height: 0;
  padding: var(--qds-space-md);
}

.gallery-header {
  box-shadow: none;
}

.gallery-header :deep(.q-toolbar) {
  flex-wrap: wrap;
  gap: var(--qds-space-xs);
  padding-block: var(--qds-space-xs);
}

.gallery-title {
  flex: 1 1 12rem;
  min-width: 10rem;
  overflow: visible;
  font-size: clamp(1rem, 3.6vw, 1.35rem);
}

.gallery-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.25rem;
  min-width: 0;
}

.gallery-switcher {
  flex: 0 0 auto;
  max-width: 100%;
  overflow-x: auto;
  scrollbar-width: none;
}

.gallery-palette {
  flex: 0 1 10rem;
  min-width: 8rem;
  max-width: 100%;
}

.gallery-switcher :deep(.q-btn__content) {
  gap: 0.25rem;
}

.gallery-tabs {
  background: transparent;
  color: var(--qds-text);
  overflow-x: auto;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--qds-text) 28%, transparent) transparent;
}

.gallery-tabs::-webkit-scrollbar {
  height: 0.1875rem;
}

.gallery-tabs::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--qds-text) 28%, transparent);
  border-radius: var(--qds-radius-full);
}

.gallery-tabs :deep(.q-tabs__content) {
  flex-wrap: nowrap;
}

.gallery-tabs :deep(.q-tab) {
  flex: 0 0 auto;
  min-width: max-content;
  padding: 0 0.75rem;
}

.gallery-panels :deep(.q-tab-panel) {
  padding: 0;
}

@media (max-width: 720px) {
  .gallery-title {
    flex-basis: 100%;
  }

  .gallery-controls {
    flex: 1 1 100%;
    justify-content: flex-start;
  }

  .gallery-switcher {
    flex: 0 1 auto;
    min-width: 0;
  }
}

@media (max-width: 420px) {
  .gallery-switcher__label {
    display: none;
  }
}
</style>
