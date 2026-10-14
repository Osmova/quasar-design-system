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
import { galleryHash, parseGalleryHash, type GalleryTab } from './gallery-url'

const ds = useDesignSystem()

const tab = ref<GalleryTab>(parseGalleryHash(typeof window === 'undefined' ? '' : window.location.hash).tab)
let applyingUrl = false

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

const themeMenuOpen = ref(false)
const modeLabels = { light: 'Light', dark: 'Dark', system: 'System' } as const

// QMenu owns autofocus, Escape and refocus; its arbitrary content has no arrow navigation.
function onThemeMenuKeydown(event: KeyboardEvent) {
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
  const items = Array.from((event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[role="menuitemradio"]'))
  const current = items.indexOf(document.activeElement as HTMLElement)
  const index = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
    : (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
  event.preventDefault()
  items[index]?.focus()
}

function revealFocusedVariant(event: FocusEvent) {
  (event.target as HTMLElement).closest('button')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}
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

function syncUrl() {
  if (typeof window === 'undefined' || applyingUrl) return
  const nextHash = galleryHash(tab.value, ds.variant.value, window.location.hash)
  if (window.location.hash !== nextHash) {
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}${nextHash}`)
  }
}

function onHashChange() {
  const next = parseGalleryHash(window.location.hash)
  applyingUrl = true
  try {
    tab.value = next.tab
    // Page-only/invalid in-session links retain the ongoing selection.
    if (next.variant) ds.setVariant(next.variant)
  } finally {
    applyingUrl = false
  }
  syncUrl()
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
  window.addEventListener('popstate', onHashChange)
  revealActiveGalleryTab()
})

onBeforeUnmount(() => {
  window.removeEventListener('hashchange', onHashChange)
  window.removeEventListener('popstate', onHashChange)
})

// Synchronous guards keep URL-driven updates atomic and avoid queued feedback.
watch([tab, ds.variant], syncUrl, { flush: 'sync' })
watch(tab, revealActiveGalleryTab)
</script>

<template>
  <q-layout view="hHh lpR fFf">
    <q-header class="gallery-header">
      <q-toolbar>
        <q-toolbar-title class="gallery-title">Quasar Design System</q-toolbar-title>

        <div class="gallery-controls">
          <q-btn-toggle
            :model-value="ds.variant.value"
            no-caps
            aria-label="Variant"
            role="group"
            class="gallery-switcher"
            :options="variantOptions"
            @update:model-value="onVariant"
            @focusin="revealFocusedVariant"
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
        <q-btn
          flat
          round
          class="gallery-theme"
          :aria-label="`Theme: ${modeLabels[ds.mode.value]}`"
          aria-haspopup="menu"
          :aria-expanded="themeMenuOpen"
          aria-controls="gallery-theme-menu"
        >
          <component :is="modeIcons[ds.mode.value]" :size="20" weight="duotone" aria-hidden="true" />
          <q-menu
            id="gallery-theme-menu"
            v-model="themeMenuOpen"
            role="menu"
            aria-label="Theme"
            anchor="bottom right"
            self="top right"
            @keydown="onThemeMenuKeydown"
          >
            <q-list>
              <q-item
                v-for="mode in modes"
                :key="mode"
                v-close-popup
                clickable
                :autofocus="ds.mode.value === mode"
                role="menuitemradio"
                :aria-checked="ds.mode.value === mode"
                :active="ds.mode.value === mode"
                @click="onMode(mode)"
              >
                <q-item-section avatar>
                  <component :is="modeIcons[mode]" :size="18" weight="duotone" aria-hidden="true" />
                </q-item-section>
                <q-item-section>{{ modeLabels[mode] }}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
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
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: var(--qds-space-xs);
  padding-block: var(--qds-space-xs);
}

.gallery-header .gallery-title {
  min-width: 0;
  padding: 0.35rem 0;
  overflow: visible;
  white-space: normal;
  font-family: 'Playwrite FR Moderne', cursive;
  font-weight: 400;
  font-size: 24px;
  line-height: 1.8;
}

.gallery-controls {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.25rem;
  min-width: 0;
}

.gallery-switcher {
  flex: 0 1 auto;
  min-width: 0;
  max-width: 100%;
  overflow-x: auto;
  scrollbar-width: none;
}

.gallery-palette {
  flex: 0 0 9rem;
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

@media (max-width: 1100px) {
  .gallery-header :deep(.q-toolbar) {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .gallery-header .gallery-title {
    font-size: 22px;
  }

  .gallery-theme {
    grid-column: 2;
    grid-row: 1;
  }

  .gallery-controls {
    grid-column: 1 / -1;
    grid-row: 2;
    justify-content: flex-start;
  }
}
</style>
