import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { h, type VNode } from 'vue'

// Shared catalog: ONE copy of demos + control semantics for both hosts. The
// Storybook adapter maps catalog control rows into CSF argTypes/args statically
// (explicit export per case — no Histoire bridge, no iframe substitution).
interface CatalogControlRow {
  key: string
  kind: 'toggle' | 'select' | 'number' | 'text'
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
  disposition: 'implemented' | 'planned'
}

type DemoArgs = Record<string, string | number | boolean>

import controlData from '@qds-catalog/control.json'
import manifestData from '@qds-catalog/manifest.json'
import QdsPreviewScaffold from '@qds-catalog/preview/QdsPreviewScaffold.vue'
import QdsButtonDemo from '@qds-catalog/demos/QdsButtonDemo.vue'
import QdsFieldDemo from '@qds-catalog/demos/QdsFieldDemo.vue'
import QdsTabsDemo from '@qds-catalog/demos/QdsTabsDemo.vue'
import QdsMenuDemo from '@qds-catalog/demos/QdsMenuDemo.vue'
import buttonSource from '@qds-catalog/demos/QdsButtonDemo.vue?raw'
import fieldSource from '@qds-catalog/demos/QdsFieldDemo.vue?raw'
import tabsSource from '@qds-catalog/demos/QdsTabsDemo.vue?raw'
import menuSource from '@qds-catalog/demos/QdsMenuDemo.vue?raw'

const control = controlData as { kinds: string[]; cases: Record<string, CatalogControlRow[]> }
const manifest = manifestData as { cases: CatalogManifestCase[] }

function caseById(id: string): CatalogManifestCase {
  const catalogCase = manifest.cases.find((single) => single.id === id)
  if (!catalogCase) {
    throw new Error(`Shared catalog manifest is missing case ${id}`)
  }
  return catalogCase
}

function argTypesFor(catalogCase: CatalogManifestCase): Record<string, unknown> {
  const rows = control.cases[catalogCase.id] ?? []
  const argTypes: Record<string, unknown> = {}
  for (const row of rows) {
    argTypes[row.key] = {
      control:
        row.kind === 'toggle'
          ? { type: 'boolean' }
          : row.kind === 'select'
            ? { type: 'select' }
            : row.kind === 'number'
              ? { type: 'number' }
              : { type: 'text' },
      table: {
        category: `${row.subelement} (${row.kind})`,
        defaultValue: { summary: JSON.stringify(row.default) },
      },
      ...(row.options ? { options: row.options } : {}),
      description: row.semantics,
    }
  }
  return argTypes
}

function argsFor(catalogCase: CatalogManifestCase): DemoArgs {
  const rows = control.cases[catalogCase.id] ?? []
  const args: DemoArgs = {}
  for (const row of rows) {
    args[row.key] = row.default
  }
  return args
}

function scaffold(catalogCase: CatalogManifestCase, renderArgs: (demoArgs: DemoArgs) => VNode) {
  // Args the renderer hands to CSF render functions are the reactive storyArgs
  // store for this canvas document, so reading them inside a component render
  // keeps Controls-driven updates live without force-remounting.
  return (storyArgs: DemoArgs) => ({
    name: 'QdsCatalogProofCanvas',
    setup(): () => VNode {
      return () => h(
        QdsPreviewScaffold,
        { caseId: catalogCase.id, title: catalogCase.title, themeControls: false },
        { default: () => renderArgs(storyArgs) },
      )
    },
  })
}

function buttonDemoFor(args: DemoArgs): VNode {
  return h(QdsButtonDemo, {
    label: String(args.label),
    icon: String(args.icon),
    dense: Boolean(args.dense),
    loading: Boolean(args.loading),
    disable: Boolean(args.disable),
    split: Boolean(args.split),
  })
}

function fieldDemoFor(args: DemoArgs): VNode {
  return h(QdsFieldDemo, {
    label: String(args.label),
    dense: Boolean(args.dense),
    stackLabel: Boolean(args.stackLabel),
    marginals: Boolean(args.marginals),
    hint: Boolean(args.hint),
    counter: Boolean(args.counter),
    clearable: Boolean(args.clearable),
    error: Boolean(args.error),
    loading: Boolean(args.loading),
    disable: Boolean(args.disable),
    readonly: Boolean(args.readonly),
  })
}

function tabsDemoFor(args: DemoArgs): VNode {
  return h(QdsTabsDemo, {
    dense: Boolean(args.dense),
    tabCount: String(args.tabCount),
    disabledTab: String(args.disabledTab),
  })
}

function menuDemoFor(args: DemoArgs): VNode {
  return h(QdsMenuDemo, {
    dense: Boolean(args.dense),
    persistent: Boolean(args.persistent),
    checkable: Boolean(args.checkable),
  })
}

function storyFor(
  catalogCase: CatalogManifestCase,
  renderArgs: (demoArgs: DemoArgs) => VNode,
): StoryObj {
  return {
    render: scaffold(catalogCase, renderArgs) as unknown as StoryObj['render'],
    args: argsFor(catalogCase),
    argTypes: argTypesFor(catalogCase),
  }
}
const meta = {
  title: 'QDS shared catalog proof',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      // Per-canvas isolation: docs canvases render in iframes (preview.ts sets
      // the documented docs isolation parameters) — never double-mounted Vue apps.
      story: { inline: false },
      iframeHeight: '420px',
      source: { type: 'code' },
    },
  },
} satisfies Meta

export default meta

export const buttonProof: StoryObj = storyFor(
  caseById('actions/button'),
  buttonDemoFor,
)
buttonProof.parameters = {
  docs: {
    source: {
      code: buttonSource,
    },
  },
}

export const fieldProof: StoryObj = storyFor(
  caseById('forms/field'),
  fieldDemoFor,
)
fieldProof.parameters = {
  docs: {
    source: {
      code: fieldSource,
    },
  },
}

export const tabsProof: StoryObj = storyFor(
  caseById('navigation/tabs'),
  tabsDemoFor,
)
tabsProof.parameters = {
  docs: {
    source: {
      code: tabsSource,
    },
  },
}

export const menuProof: StoryObj = storyFor(
  caseById('overlays/menu'),
  menuDemoFor,
)
menuProof.parameters = {
  docs: {
    source: {
      code: menuSource,
    },
  },
}
