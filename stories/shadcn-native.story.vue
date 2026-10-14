<script setup lang="ts">
import { DESIGN_SYSTEM_VARIANTS, useDesignSystem, type DesignSystemMode, type DesignSystemVariantName } from '../src'
import NativeConformance from '../examples/gallery/src/conformance/NativeConformance.vue'
import StoryShell from './_shared/StoryShell.vue'
const controller = useDesignSystem()
const variantOptions = Object.keys(DESIGN_SYSTEM_VARIANTS)
const modeOptions = ['light', 'dark', 'system']
const initState = () => ({ mode: 'light' as DesignSystemMode, variant: 'shadcn' as DesignSystemVariantName })
</script>
<template>
  <Story title="Design System / Native conformance" :layout="{ type: 'single', iframe: true }" :init-state="initState">
    <Variant title="Full native catalog and local scheme boundaries">
      <template #default="{ state }">
        <StoryShell title="Native consumer conformance" description="Actual native anatomy, overlays, and local scheme states. The standalone gallery entries additionally omit all gallery and story helper CSS." :mode="state.mode" :variant="state.variant">
          <NativeConformance :controller="controller" />
        </StoryShell>
      </template>
      <template #controls="{ state }"><HstSelect v-model="state.mode" title="Mode" :options="modeOptions" /><HstSelect v-model="state.variant" title="Variant" :options="variantOptions" /></template>
    </Variant>
  </Story>
</template>
