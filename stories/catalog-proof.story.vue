<script setup lang="ts">
/**
   * Bounded proof — Histoire adapter for the shared catalog.
 *
 * Thin-adapter rules:
 * - the demo components live in `catalog/demos/` and contain no host APIs;
 * - case defaults come from `catalog/control.json` (single source of control semantics);
 * - each Variant re-initializes a FRESH state from those defaults (fresh fixtures);
 * - the same shared preview scaffold hosts the demos here and in the Storybook adapter.
 */
import controlsData from '../catalog/control.json'
import manifestData from '../catalog/manifest.json'
import QdsButtonDemo from '../catalog/demos/QdsButtonDemo.vue'
import QdsFieldDemo from '../catalog/demos/QdsFieldDemo.vue'
import QdsTabsDemo from '../catalog/demos/QdsTabsDemo.vue'
import QdsMenuDemo from '../catalog/demos/QdsMenuDemo.vue'
import QdsPreviewScaffold from '../catalog/preview/QdsPreviewScaffold.vue'

interface CatalogControlRow {
  key: string
  kind: string
  default: string | number | boolean
  options?: string[]
  subelement: string
  semantics: string
}

interface CatalogManifestCase {
  id: string
  family: string
  title: string
  order: number
  demo: string
  nativeExports: string[]
  controls: string[]
  fixtures: string
  subelements: string[]
  hostIdMap: {
    histoireVariantTitle: string
    storybookExport: string
  }
  disposition: string
}

const manifest = manifestData as {
  cases: CatalogManifestCase[]
}

const controlRows = controlsData as {
  kinds: string[]
  cases: Record<string, CatalogControlRow[]>
}

const demoByCase: Record<string, unknown> = {
  'actions/button': QdsButtonDemo,
  'forms/field': QdsFieldDemo,
  'navigation/tabs': QdsTabsDemo,
  'overlays/menu': QdsMenuDemo,
}

function controlsFor(caseId: string): CatalogControlRow[] {
  return controlRows.cases[caseId]
}

function initStateFor(caseId: string): () => Record<string, string | number | boolean> {
  return () => {
    const state: Record<string, string | number | boolean> = {}
    for (const row of controlsFor(caseId)) {
      state[row.key] = row.default
    }
    return state
  }
}
</script>

<template>
  <Story title="QDS shared catalog / proof" :layout="{ type: 'single', iframe: true }">
    <Variant
      v-for="catalogCase in manifest.cases"
      :key="catalogCase.id"
      :title="catalogCase.hostIdMap.histoireVariantTitle"
      :init-state="initStateFor(catalogCase.id)"
    >
      <template #default="{ state }">
        <QdsPreviewScaffold :case-id="catalogCase.id" :title="catalogCase.title" :theme-controls="true">
          <component :is="demoByCase[catalogCase.id]" v-bind="state" />
        </QdsPreviewScaffold>
      </template>

      <template #controls="{ state }">
        <template v-for="row in controlsFor(catalogCase.id)" :key="row.key">
          <HstCheckbox
            v-if="row.kind === 'toggle'"
            v-model="state[row.key]"
            :title="row.key"
          />
          <HstSelect
            v-else-if="row.kind === 'select'"
            v-model="state[row.key]"
            :title="row.key"
            :options="(row.options ?? []).map((option: string) => ({ label: option, value: option }))"
          />
          <HstNumber
            v-else-if="row.kind === 'number'"
            v-model="state[row.key]"
            :title="row.key"
          />
          <HstText
            v-else
            v-model="state[row.key]"
            :title="row.key"
          />
        </template>
      </template>
    </Variant>
  </Story>
</template>
