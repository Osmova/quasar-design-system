<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type Component } from 'vue'
import { useQuasar } from 'quasar'
import {
  PhBookOpenText,
  PhBooks,
  PhCaretDown,
  PhDeviceMobile,
  PhMoonStars,
  PhMonitor,
  PhPalette,
  PhPenNib,
  PhSidebarSimple,
  PhSun,
  PhTerminal,
  PhSquaresFour,
  PhLeaf,
  PhDrop,
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
import { catalogLinks } from './catalog-links'
import { galleryHash, parseGalleryHash, type GalleryTab } from './gallery-url'

const $q = useQuasar()
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
  zen: PhLeaf,
  glass: PhDrop,
}
const linkIcons: Record<string, Component> = {
  histoire: PhBooks,
  storybook: PhBookOpenText,
}

const navGroups: { label: string, tabs: { name: GalleryTab, label: string }[] }[] = [
  {
    label: 'Foundations',
    tabs: [
      { name: 'tokens', label: 'Tokens' },
      { name: 'typography', label: 'Typography' },
      { name: 'icons', label: 'Icons' },
      { name: 'fonts', label: 'Fonts' },
    ],
  },
  {
    label: 'Components',
    tabs: [
      { name: 'components', label: 'Components' },
      { name: 'forms', label: 'Forms' },
      { name: 'catalog', label: 'Catalog' },
      { name: 'plugins', label: 'Plugins' },
      { name: 'window', label: 'Window' },
    ],
  },
  {
    label: 'Systems',
    tabs: [
      { name: 'variants', label: 'Variants' },
      { name: 'scenes', label: 'Scenes' },
      { name: 'compare', label: 'Compare' },
    ],
  },
  {
    label: 'Patterns',
    tabs: [{ name: 'apps', label: 'Apps' }],
  },
]

const drawerOpen = ref(false)
const themeMenuOpen = ref(false)
const variantMenuOpen = ref(false)
const modeLabels = { light: 'Light', dark: 'Dark', system: 'System' } as const

// QMenu owns autofocus, Escape and refocus; its arbitrary content has no arrow navigation.
function onMenuKeydown(event: KeyboardEvent) {
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
  const items = Array.from((event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[role="menuitemradio"]'))
  const current = items.indexOf(document.activeElement as HTMLElement)
  const index = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
    : (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
  event.preventDefault()
  items[index]?.focus()
}

const activeVariant = computed(() => variants.find((variant) => variant.name === ds.variant.value) ?? variants[0])

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

// The overlay drawer covers the page it just navigated to, including a re-pick.
function closeOverlayDrawer() {
  if (!$q.screen.gt.sm) drawerOpen.value = false
}

function revealActiveGalleryTab() {
  nextTick(() => {
    window.setTimeout(() => {
      document.querySelector<HTMLElement>('.gallery-nav .q-tab--active')?.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
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
  <q-layout view="hHh LpR fFf">
    <q-header class="gallery-header">
      <q-toolbar>
        <q-btn
          flat
          round
          class="gallery-burger"
          aria-label="Pages"
          :aria-expanded="drawerOpen"
          aria-controls="gallery-nav"
          @click="drawerOpen = !drawerOpen"
        >
          <PhSidebarSimple :size="20" weight="duotone" aria-hidden="true" />
        </q-btn>

        <q-toolbar-title class="gallery-title">
          <span class="gallery-title__mark">Quasar</span>
          <span class="gallery-title__sub">Design System</span>
        </q-toolbar-title>

        <div class="gallery-controls">
          <q-btn
            flat
            no-caps
            class="gallery-switcher"
            :aria-label="`Variant: ${activeVariant.label}`"
            aria-haspopup="menu"
            :aria-expanded="variantMenuOpen"
            aria-controls="gallery-variant-menu"
            data-test="qds-variant-switcher"
          >
            <component :is="variantIcons[activeVariant.name] ?? PhPalette" :size="16" weight="duotone" aria-hidden="true" />
            <span class="gallery-switcher__label">{{ activeVariant.label }}</span>
            <PhCaretDown :size="12" weight="bold" class="gallery-switcher__caret" aria-hidden="true" />
            <q-menu
              id="gallery-variant-menu"
              v-model="variantMenuOpen"
              role="menu"
              aria-label="Variant"
              anchor="bottom left"
              self="top left"
              @keydown="onMenuKeydown"
            >
              <q-list class="gallery-variant-menu">
                <q-item
                  v-for="variant in variants"
                  :key="variant.name"
                  v-close-popup
                  clickable
                  :autofocus="ds.variant.value === variant.name"
                  role="menuitemradio"
                  :aria-checked="ds.variant.value === variant.name"
                  :active="ds.variant.value === variant.name"
                  :data-test="`qds-variant-option-${variant.name}`"
                  @click="onVariant(variant.name)"
                >
                  <q-item-section avatar>
                    <component :is="variantIcons[variant.name] ?? PhPalette" :size="18" weight="duotone" aria-hidden="true" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ variant.label }}</q-item-label>
                    <q-item-label v-if="variant.description" caption lines="2">{{ variant.description }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-btn>
        </div>

        <div class="gallery-links">
          <q-btn
            v-for="link in catalogLinks"
            :key="link.name"
            flat
            no-caps
            type="a"
            class="gallery-link"
            :href="link.href"
            :aria-label="link.description"
            :data-test="`qds-link-${link.name}`"
          >
            <component :is="linkIcons[link.name] ?? PhBookOpenText" :size="18" weight="duotone" aria-hidden="true" />
            <span class="gallery-link__label">{{ link.label }}</span>
          </q-btn>
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
            @keydown="onMenuKeydown"
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
            <template v-if="ds.variant.value === 'shadcn'">
              <q-separator />
              <div class="gallery-palette-slot">
                <q-select
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
            </template>
          </q-menu>
        </q-btn>
      </q-toolbar>
    </q-header>

    <q-drawer
      id="gallery-nav"
      v-model="drawerOpen"
      show-if-above
      bordered
      side="left"
      :width="236"
      class="gallery-drawer"
    >
      <q-tabs
        v-model="tab"
        vertical
        no-caps
        align="left"
        indicator-color="transparent"
        class="gallery-tabs gallery-nav"
        @click="closeOverlayDrawer"
      >
        <template v-for="group in navGroups" :key="group.label">
          <div class="gallery-nav__header">{{ group.label }}</div>
          <q-tab v-for="page in group.tabs" :key="page.name" :name="page.name" :label="page.label" />
        </template>
      </q-tabs>
    </q-drawer>

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
/* The shell repaints with the active variant but must never resize with it, so the
   control tokens the shipped rules read are pinned locally to literals. */
.gallery-header,
.gallery-nav {
  --gallery-chrome-font: 'Inter Variable', Inter, system-ui, sans-serif;
  --gallery-title-font: 'Plus Jakarta Sans', 'Inter Variable', Inter, system-ui, sans-serif;
  --qds-button-min-height: 32px;
  --qds-button-size-sm: 32px;
  --qds-button-size-md: 32px;
  --qds-button-size-lg: 32px;
  --qds-button-padding-inline: 0px;
  --qds-button-dense-padding-inline: 0px;
  --qds-button-radius: 6px;
  --qds-radius-control: 6px;
  --qds-control-size-md: 32px;
  --qds-control-letter-spacing: 0;
  --qds-control-text-transform: none;
  --qds-tab-min-height: 34px;
  --qds-row-min-height: 34px;
}

.gallery-page {
  min-height: 0;
  padding: var(--qds-space-md);
}

.gallery-header {
  box-shadow: none;
}

.gallery-header :deep(.q-toolbar) {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  min-height: 56px;
  padding: 0.25rem 0.75rem;
}

.gallery-burger.gallery-burger.gallery-burger {
  display: none;
  width: 36px;
  min-width: 36px;
  height: 36px;
  min-height: 36px;
}

.gallery-header .gallery-title {
  display: flex;
  flex: 1 1 auto;
  align-items: baseline;
  gap: 0.4ch;
  min-width: 0;
  padding: 0;
  overflow: hidden;
  font-family: var(--gallery-title-font);
  font-size: 18px;
  line-height: 1.4;
  letter-spacing: -0.012em;
  white-space: nowrap;
}

.gallery-title__mark {
  font-weight: 640;
  font-variation-settings: 'wght' 640;
}

.gallery-title__sub {
  font-weight: 420;
  font-variation-settings: 'wght' 420;
  opacity: 0.62;
}

.gallery-controls,
.gallery-links {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: flex-end;
  gap: 0.25rem;
  min-width: 0;
}

.gallery-switcher.gallery-switcher.gallery-switcher {
  flex: 0 0 auto;
  width: 8rem;
  height: 32px;
  min-height: 32px;
  padding-inline: 0.625rem 0.5rem;
  border: 0;
  border-radius: 6px;
  font-family: var(--gallery-chrome-font);
  font-size: 12px;
  font-weight: 500;
}

.gallery-switcher :deep(.q-btn__content) {
  flex-wrap: nowrap;
  justify-content: flex-start;
  gap: 0.375rem;
  width: 100%;
}

.gallery-switcher__label {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-align: start;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gallery-switcher__caret {
  flex: 0 0 auto;
  opacity: 0.72;
}

.gallery-variant-menu {
  width: 20rem;
  max-width: calc(100vw - 2rem);
}

.gallery-link.gallery-link.gallery-link {
  height: 32px;
  min-height: 32px;
  padding-inline: 0.5rem;
  border: 0;
  font-family: var(--gallery-chrome-font);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0;
  text-transform: none;
}

.gallery-link :deep(.q-btn__content) {
  flex-wrap: nowrap;
  gap: 0.3rem;
}

.gallery-theme.gallery-theme.gallery-theme {
  width: 36px;
  min-width: 36px;
  height: 36px;
  min-height: 36px;
  border: 0;
}

.gallery-palette-slot {
  padding: 0.5rem;
}

.gallery-palette {
  width: 11rem;
}

.gallery-nav {
  padding-block: 0.25rem 0.75rem;
  font-family: var(--gallery-chrome-font);
  color: var(--qds-text);
}

.gallery-nav.gallery-nav.gallery-nav {
  padding: 0.25rem 0 0.75rem;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.gallery-nav.gallery-nav.gallery-nav :deep(.q-tabs__content) {
  align-items: stretch;
  padding: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.gallery-nav__header {
  padding: 0.85rem 1rem 0.3rem;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  line-height: 1.4;
  opacity: 0.56;
}

.gallery-nav.gallery-nav.gallery-nav :deep(.q-tab) {
  justify-content: flex-start;
  height: 34px;
  min-height: 34px;
  font-family: var(--gallery-chrome-font);
  margin-inline: 0.5rem;
  padding: 0 0.625rem;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 450;
  letter-spacing: 0;
  text-transform: none;
}

.gallery-nav :deep(.q-tab__content) {
  min-width: 0;
}

.gallery-nav.gallery-nav.gallery-nav :deep(.q-tab--active) {
  background: color-mix(in srgb, var(--qds-color-primary) 12%, transparent);
  /* A light-on-light primary (term amber) is unreadable as a label; the tint carries the accent. */
  color: var(--qds-fg-strong);
  font-weight: 560;
}

.gallery-panels :deep(.q-tab-panel) {
  padding: 0;
}

@media (max-width: 1023px) {
  .gallery-burger.gallery-burger.gallery-burger {
    display: inline-flex;
  }
}

@media (max-width: 1200px) {
  .gallery-link__label {
    display: none;
  }

  .gallery-link {
    padding-inline: 0.4rem;
  }
}

@media (max-width: 920px) {
  .gallery-header .gallery-title {
    font-size: 16px;
  }

  .gallery-controls {
    order: 1;
    flex-basis: 100%;
    justify-content: flex-start;
  }
}
</style>
