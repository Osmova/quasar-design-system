<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import {
  SHADCN_BASE_COLORS,
  DESIGN_SYSTEM_VARIANTS,
  type DesignSystemVariant,
  type ShadcnBaseColor,
} from '../../dist/index.js'
import { useCatalogPreviewController } from './index.js'

const props = withDefaults(defineProps<{
  /** Stable case id, e.g. `actions/button`. */
  caseId: string
  /** Human title for the proof header. */
  title: string
  /** Storybook's toolbar is authoritative; Histoire uses these local controls. */
  themeControls?: boolean
}>(), { themeControls: true })

/**
 * Shared preview shell for both hosts (Histoire and Storybook): renders the
 * demo slot on top of the same per-document controller readout, so control and
 * lifecycle semantics are identical.
 */
const resolution = useCatalogPreviewController()
const controller = computed(() => resolution.controller)

const paletteOptions = SHADCN_BASE_COLORS.map((c) => c.name)

const resolvedModeLabel = computed(() => controller.value?.state.resolvedMode ?? '—')
const modeLabel = computed(() => controller.value?.state.mode ?? '—')
const variantLabel = computed(() => controller.value?.state.variant ?? '—')
const paletteLabel = computed(() => controller.value?.state.shadcnBaseColor ?? '—')

const scopeRevision = ref(0)
let scopeObserver: MutationObserver | undefined
onMounted(() => {
  scopeObserver = new MutationObserver(() => { scopeRevision.value++ })
  scopeObserver.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-qds-mode', 'data-qds-resolved', 'data-qds-variant', 'data-qds-shadcn-base-color'] })
  scopeRevision.value++
})
onUnmounted(() => scopeObserver?.disconnect())
const scopeStateLabel = computed(() => {
  void scopeRevision.value
  if (typeof document === 'undefined') {
    return 'SSR'
  }

  const root = document.body
  const bits = [
    'data-qds-mode=' + (root.dataset.qdsMode ?? '∅'),
    'data-qds-resolved=' + (root.dataset.qdsResolved ?? '∅'),
    'data-qds-variant=' + (root.dataset.qdsVariant ?? '∅'),
  ]
  const classes = ['qds-ui', 'qds-theme-light', 'qds-theme-dark'].filter((cls) => root.classList.contains(cls))
  bits.push('classes=' + (classes.length > 0 ? classes.join(' ') : '∅'))
  return bits.join(' · ')
})

const variantClassLabel = computed(() => {
  const name = controller.value?.state.variant
  if (!name) {
    return '∅'
  }
  const variant = DESIGN_SYSTEM_VARIANTS[name as keyof typeof DESIGN_SYSTEM_VARIANTS] as DesignSystemVariant | undefined
  return variant?.cssClass ?? '∅'
})

const variantNames = Object.keys(DESIGN_SYSTEM_VARIANTS)
const modeNames = ['light', 'dark', 'system']

function setMode(event: Event): void {
  controller.value?.setMode((event.target as HTMLSelectElement).value as 'light' | 'dark' | 'system')
}

function setVariant(event: Event): void {
  controller.value?.setVariant((event.target as HTMLSelectElement).value)
}

function setPalette(event: Event): void {
  controller.value?.setShadcnBaseColor((event.target as HTMLSelectElement).value as ShadcnBaseColor)
}

function paletteLabelFor(name: string): string {
  return (SHADCN_BASE_COLORS.find((p: { name: ShadcnBaseColor }) => p.name === name)?.label) ?? name
}
</script>

<template>
  <section class="qds-catalog-proof" :data-case-id="props.caseId">
    <header class="qds-catalog-proof__header">
      <div class="qds-catalog-proof__titles">
        <span class="qds-catalog-proof__title">{{ props.title }}</span>
        <span class="qds-catalog-proof__case">{{ props.caseId }}</span>
      </div>
      <div v-if="controller" class="qds-catalog-proof__readout">
        <span>mode: {{ modeLabel }} ({{ resolvedModeLabel }})</span>
        <span>variant: {{ variantLabel }} [{{ variantClassLabel }}]</span>
        <span v-if="variantLabel === 'shadcn'">
          palette: {{ paletteLabel }} ({{ paletteLabelFor(paletteLabel) }})
        </span>
        <span>body: {{ scopeStateLabel }}</span>
      </div>
      <div v-if="controller && props.themeControls !== false" class="qds-catalog-proof__theme-controls">
        <label>mode
          <select aria-label="mode" :value="modeLabel" @change="setMode">
            <option v-for="name in modeNames" :key="name" :value="name">{{ name }}</option>
          </select>
        </label>
        <label>variant
          <select aria-label="variant" :value="variantLabel" @change="setVariant">
            <option v-for="name in variantNames" :key="name" :value="name">{{ name }}</option>
          </select>
        </label>
        <label v-if="variantLabel === 'shadcn'">shadcn palette
          <select aria-label="shadcn palette" :value="paletteLabel" @change="setPalette">
            <option v-for="name in paletteOptions" :key="name" :value="name">{{ paletteLabelFor(name) }}</option>
          </select>
        </label>
      </div>
      <p v-if="!controller" class="qds-catalog-proof__blocked" role="alert">
        Controller blocker: {{ resolution.reason }}
      </p>
    </header>

    <div class="qds-catalog-proof__demo">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.qds-catalog-proof {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  gap: 0.75rem;
}

.qds-catalog-proof__header,
.qds-catalog-proof__demo {
  box-sizing: border-box;
  min-width: 0;
  grid-template-columns: minmax(0, 1fr);
}

.qds-catalog-proof__header {
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 0.8125rem;
  display: grid;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid rgba(127, 127, 127, 0.35);
  border-radius: 6px;
}

.qds-catalog-proof__titles {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem;
}

.qds-catalog-proof__titles > span,
.qds-catalog-proof__readout > span {
  min-width: 0;
  max-width: 100%;
  overflow-wrap: anywhere;
}

.qds-catalog-proof__title {
  font-weight: 600;
}

.qds-catalog-proof__case {
  font-family: ui-monospace, monospace;
  opacity: 0.75;
}

.qds-catalog-proof__readout {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  font-family: ui-monospace, monospace;
  opacity: 0.8;
}

.qds-catalog-proof__theme-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
}

.qds-catalog-proof__theme-controls select {
  font: inherit;
  min-width: 5.5rem;
}

.qds-catalog-proof__blocked {
  margin: 0;
  color: #a4262c;
}

.qds-catalog-proof__demo {
  position: relative;
  display: grid;
  gap: 0.5rem;
  padding: 0.75rem;
  border: 1px dashed rgba(127, 127, 127, 0.35);
  border-radius: 6px;
}
</style>
