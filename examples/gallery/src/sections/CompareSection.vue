<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useDesignSystem } from '@bastvi/quasar-design-system'

// Reference oracle: real Fluent 2 web components beside the QDS/Quasar equivalent.
const ds = useDesignSystem()
const root = ref<HTMLElement | null>(null)
const ready = ref(false)

const text = ref('')
const select = ref<string | null>(null)
const selectOptions = ['Comfortable', 'Compact', 'Spacious']
const checkbox = ref(true)
const radio = ref('a')
const toggle = ref(true)
const slider = ref(40)
const tab = ref('overview')
const dialogOpen = ref(false)

let applyTheme: (dark: boolean) => void = () => {}

onMounted(async () => {
  // Children must upgrade before listbox/dropdown and radio-group read them.
  await Promise.all([
    import('@fluentui/web-components/option/define.js'),
    import('@fluentui/web-components/radio/define.js'),
  ])
  const [{ setTheme }, { webLightTheme, webDarkTheme }] = await Promise.all([
    import('@fluentui/web-components'),
    import('@fluentui/tokens'),
    import('@fluentui/web-components/button/define.js'),
    import('@fluentui/web-components/badge/define.js'),
    import('@fluentui/web-components/checkbox/define.js'),
    import('@fluentui/web-components/dialog/define.js'),
    import('@fluentui/web-components/dialog-body/define.js'),
    import('@fluentui/web-components/dropdown/define.js'),
    import('@fluentui/web-components/field/define.js'),
    import('@fluentui/web-components/label/define.js'),
    import('@fluentui/web-components/listbox/define.js'),
    import('@fluentui/web-components/menu/define.js'),
    import('@fluentui/web-components/menu-button/define.js'),
    import('@fluentui/web-components/menu-item/define.js'),
    import('@fluentui/web-components/menu-list/define.js'),
    import('@fluentui/web-components/progress-bar/define.js'),
    import('@fluentui/web-components/radio-group/define.js'),
    import('@fluentui/web-components/slider/define.js'),
    import('@fluentui/web-components/switch/define.js'),
    import('@fluentui/web-components/tab/define.js'),
    import('@fluentui/web-components/tablist/define.js'),
    import('@fluentui/web-components/text-input/define.js'),
    import('@fluentui/web-components/tooltip/define.js'),
  ])

  // Same face on both sides so the comparison isolates anatomy, not typography.
  applyTheme = (dark) => {
    if (root.value) {
      setTheme({ ...(dark ? webDarkTheme : webLightTheme), fontFamilyBase: 'var(--qds-font-family)' }, root.value)
    }
  }
  applyTheme(ds.isDark.value)
  ready.value = true
})

watch(ds.isDark, (dark) => applyTheme(dark))

function openFluentDialog() {
  root.value?.querySelector<HTMLElement & { show: () => void }>('#compare-fluent-dialog')?.show()
}
</script>

<template>
  <div ref="root" class="compare" :class="{ 'compare--ready': ready }">
    <p class="compare__intro">
      Left: Fluent 2 web components (<code>@fluentui/web-components</code>, official tokens, QDS font).
      Right: Quasar components with the QDS package defaults. Fluent is the main inspiration, not a pixel target — Swift and One UI refinements are intentional.
    </p>

    <section class="compare__row" data-compare="button">
      <h2 class="compare__title">Button</h2>
      <div class="compare__cell compare__cell--fluent">
        <fluent-button>Default</fluent-button>
        <fluent-button appearance="primary">Primary</fluent-button>
        <fluent-button appearance="outline">Outline</fluent-button>
        <fluent-button appearance="subtle">Subtle</fluent-button>
        <fluent-button appearance="transparent">Transparent</fluent-button>
        <fluent-button disabled>Disabled</fluent-button>
        <fluent-button size="small">Small</fluent-button>
        <fluent-button size="large">Large</fluent-button>
      </div>
      <div class="compare__cell compare__cell--qds">
        <q-btn no-caps label="Default" />
        <q-btn no-caps unelevated color="primary" label="Primary" />
        <q-btn no-caps outline label="Outline" />
        <q-btn no-caps flat label="Subtle" />
        <q-btn no-caps flat label="Transparent" />
        <q-btn no-caps disable label="Disabled" />
        <q-btn no-caps size="sm" label="Small" />
        <q-btn no-caps size="lg" label="Large" />
      </div>
    </section>

    <section class="compare__row" data-compare="field">
      <h2 class="compare__title">Field</h2>
      <div class="compare__cell compare__cell--fluent compare__cell--stack">
        <fluent-field label-position="above">
          <label slot="label">Display name</label>
          <fluent-text-input slot="input" placeholder="Jane Doe" />
        </fluent-field>
        <fluent-field label-position="above">
          <label slot="label">Filled darker</label>
          <fluent-text-input slot="input" appearance="filled-darker" placeholder="Search" />
        </fluent-field>
        <fluent-field label-position="above">
          <label slot="label">Density</label>
          <fluent-dropdown slot="input" placeholder="Select density">
            <fluent-listbox>
              <fluent-option v-for="option in selectOptions" :key="option" :value="option">{{ option }}</fluent-option>
            </fluent-listbox>
          </fluent-dropdown>
        </fluent-field>
        <fluent-field label-position="above" flag-custom-error>
          <label slot="label">Email</label>
          <fluent-text-input slot="input" value="not-an-email" />
          <span slot="message">Enter a valid email address.</span>
        </fluent-field>
      </div>
      <div class="compare__cell compare__cell--qds compare__cell--stack">
        <q-input v-model="text" outlined label="Display name" placeholder="Jane Doe" />
        <q-input filled model-value="" label="Filled darker" placeholder="Search" />
        <q-select v-model="select" outlined label="Density" :options="selectOptions" />
        <q-input outlined label="Email" model-value="not-an-email" error error-message="Enter a valid email address." />
      </div>
    </section>

    <section class="compare__row" data-compare="selection">
      <h2 class="compare__title">Selection</h2>
      <div class="compare__cell compare__cell--fluent">
        <fluent-field label-position="after">
          <label slot="label">Checkbox</label>
          <fluent-checkbox slot="input" checked />
        </fluent-field>
        <fluent-radio-group value="a" orientation="horizontal">
          <fluent-field label-position="after">
            <label slot="label">Option A</label>
            <fluent-radio slot="input" value="a" />
          </fluent-field>
          <fluent-field label-position="after">
            <label slot="label">Option B</label>
            <fluent-radio slot="input" value="b" />
          </fluent-field>
        </fluent-radio-group>
        <fluent-field label-position="after">
          <label slot="label">Switch</label>
          <fluent-switch slot="input" checked />
        </fluent-field>
        <fluent-slider value="40" min="0" max="100" class="compare__slider" />
      </div>
      <div class="compare__cell compare__cell--qds">
        <q-checkbox v-model="checkbox" label="Checkbox" />
        <q-option-group v-model="radio" inline :options="[{ label: 'Option A', value: 'a' }, { label: 'Option B', value: 'b' }]" />
        <q-toggle v-model="toggle" label="Switch" />
        <q-slider v-model="slider" :min="0" :max="100" class="compare__slider" />
      </div>
    </section>

    <section class="compare__row" data-compare="tabs">
      <h2 class="compare__title">Tabs</h2>
      <div class="compare__cell compare__cell--fluent">
        <fluent-tablist activeid="overview" class="compare__tabs compare__tabs--fluent">
          <fluent-tab id="overview">Overview</fluent-tab>
          <fluent-tab id="activity">Activity</fluent-tab>
          <fluent-tab id="settings">Settings</fluent-tab>
          <fluent-tab id="disabled" disabled>Disabled</fluent-tab>
        </fluent-tablist>
      </div>
      <div class="compare__cell compare__cell--qds">
        <div class="compare__tab-scroll" tabindex="0" role="region" aria-label="QDS comparison tabs, scroll horizontally for more">
          <q-tabs v-model="tab" no-caps align="left" inline-label>
            <q-tab name="overview" label="Overview" />
            <q-tab name="activity" label="Activity" />
            <q-tab name="settings" label="Settings" />
            <q-tab name="disabled" label="Disabled" disable />
          </q-tabs>
        </div>
      </div>
    </section>

    <section class="compare__row" data-compare="badge">
      <h2 class="compare__title">Badge</h2>
      <div class="compare__cell compare__cell--fluent">
        <fluent-badge>Brand</fluent-badge>
        <fluent-badge appearance="tint">Tint</fluent-badge>
        <fluent-badge appearance="outline">Outline</fluent-badge>
        <fluent-badge appearance="ghost">Ghost</fluent-badge>
        <fluent-badge color="success">Success</fluent-badge>
        <fluent-badge color="danger" appearance="tint">Danger</fluent-badge>
        <fluent-badge color="warning" appearance="tint">Warning</fluent-badge>
        <fluent-badge color="informative" appearance="tint">Neutral</fluent-badge>
      </div>
      <div class="compare__cell compare__cell--qds">
        <q-badge color="primary" label="Brand" />
        <q-badge label="Tint" />
        <q-badge outline color="primary" label="Outline" />
        <q-badge transparent label="Ghost" />
        <q-badge color="positive" label="Success" />
        <q-badge color="negative" label="Danger" />
        <q-badge color="warning" label="Warning" />
        <q-badge color="grey" label="Neutral" />
      </div>
    </section>

    <section class="compare__row" data-compare="progress">
      <h2 class="compare__title">Progress</h2>
      <div class="compare__cell compare__cell--fluent compare__cell--stack">
        <fluent-progress-bar value="0.6" max="1" />
        <fluent-progress-bar value="0.35" max="1" validation-state="error" />
      </div>
      <div class="compare__cell compare__cell--qds compare__cell--stack">
        <q-linear-progress :value="0.6" aria-label="Compare progress" />
        <q-linear-progress :value="0.35" color="negative" aria-label="Compare error progress" />
      </div>
    </section>

    <section class="compare__row" data-compare="surface">
      <h2 class="compare__title">Card &amp; menu</h2>
      <div class="compare__cell compare__cell--fluent">
        <div class="compare__fluent-card">
          <div class="compare__fluent-card-title">Quarterly report</div>
          <div class="compare__fluent-card-body">Card built from Fluent tokens: neutral background 1, shadow 4, large radius.</div>
          <div class="compare__actions">
            <fluent-button appearance="primary" size="small">Open</fluent-button>
            <fluent-button appearance="subtle" size="small">Share</fluent-button>
          </div>
        </div>
        <fluent-menu-list class="compare__fluent-menu">
          <fluent-menu-item>New file</fluent-menu-item>
          <fluent-menu-item>Rename</fluent-menu-item>
          <fluent-menu-item disabled>Move</fluent-menu-item>
          <fluent-menu-item>Delete</fluent-menu-item>
        </fluent-menu-list>
      </div>
      <div class="compare__cell compare__cell--qds">
        <q-card class="compare__qds-card">
          <q-card-section>
            <div class="text-subtitle1">Quarterly report</div>
            <div class="text-body2">Card with the QDS package defaults.</div>
          </q-card-section>
          <q-card-actions>
            <q-btn no-caps unelevated color="primary" size="sm" label="Open" />
            <q-btn no-caps flat size="sm" label="Share" />
          </q-card-actions>
        </q-card>
        <q-card class="compare__qds-menu">
          <q-list>
            <q-item clickable><q-item-section>New file</q-item-section></q-item>
            <q-item clickable><q-item-section>Rename</q-item-section></q-item>
            <q-item clickable disable><q-item-section>Move</q-item-section></q-item>
            <q-item clickable><q-item-section>Delete</q-item-section></q-item>
          </q-list>
        </q-card>
      </div>
    </section>

    <section class="compare__row" data-compare="overlay">
      <h2 class="compare__title">Overlays</h2>
      <div class="compare__cell compare__cell--fluent">
        <fluent-menu>
          <fluent-menu-button slot="trigger">Menu</fluent-menu-button>
          <fluent-menu-list>
            <fluent-menu-item>Copy</fluent-menu-item>
            <fluent-menu-item>Paste</fluent-menu-item>
          </fluent-menu-list>
        </fluent-menu>
        <fluent-button id="compare-fluent-tooltip-anchor">Tooltip</fluent-button>
        <fluent-tooltip anchor="compare-fluent-tooltip-anchor">Fluent tooltip</fluent-tooltip>
        <fluent-button @click="openFluentDialog">Dialog</fluent-button>
        <fluent-dialog id="compare-fluent-dialog">
          <fluent-dialog-body>
            <span slot="title">Discard changes?</span>
            <p>Your edits will be lost.</p>
            <fluent-button slot="action" appearance="primary">Discard</fluent-button>
            <fluent-button slot="action">Cancel</fluent-button>
          </fluent-dialog-body>
        </fluent-dialog>
      </div>
      <div class="compare__cell compare__cell--qds">
        <q-btn no-caps label="Menu">
          <q-menu :offset="[0, 4]">
            <q-list>
              <q-item v-close-popup clickable><q-item-section>Copy</q-item-section></q-item>
              <q-item v-close-popup clickable><q-item-section>Paste</q-item-section></q-item>
            </q-list>
          </q-menu>
        </q-btn>
        <q-btn no-caps label="Tooltip">
          <q-tooltip>QDS tooltip</q-tooltip>
        </q-btn>
        <q-btn no-caps label="Dialog" @click="dialogOpen = true" />
        <q-dialog v-model="dialogOpen">
          <q-card class="compare__qds-dialog">
            <q-card-section class="text-h5">Discard changes?</q-card-section>
            <q-card-section class="q-pt-none">Your edits will be lost.</q-card-section>
            <q-card-actions align="right">
              <q-btn v-close-popup no-caps unelevated color="primary" label="Discard" />
              <q-btn v-close-popup no-caps label="Cancel" />
            </q-card-actions>
          </q-card>
        </q-dialog>
      </div>
    </section>
  </div>
</template>

<style scoped>
.compare {
  display: flex;
  flex-direction: column;
  gap: var(--qds-space-lg);
}

.compare__intro {
  margin: 0;
  max-width: 60rem;
  color: var(--qds-text-muted);
}

.compare__row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--qds-space-sm) var(--qds-space-lg);
}

.compare__title {
  grid-column: 1 / -1;
  margin: 0;
  font-size: 1rem;
  line-height: 1.5rem;
  font-weight: 600;
}

.compare__cell {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  align-content: flex-start;
  gap: var(--qds-space-sm);
  min-width: 0;
  padding: 2rem var(--qds-space-md) var(--qds-space-md);
  border-radius: var(--qds-radius-md);
  outline: 1px dashed var(--qds-border-subtle);
}

.compare__cell::before {
  position: absolute;
  inset-block-start: var(--qds-space-sm);
  inset-inline-start: var(--qds-space-md);
  font-size: 0.75rem;
  line-height: 1rem;
  color: var(--qds-text-muted);
}

.compare__cell--fluent::before {
  content: 'Fluent 2';
}

.compare__cell--qds::before {
  content: 'QDS';
}

.compare__cell--fluent {
  background: var(--colorNeutralBackground2);
  color: var(--colorNeutralForeground1);
  font-family: var(--fontFamilyBase);
  font-size: var(--fontSizeBase300);
  line-height: var(--lineHeightBase300);
}

.compare__cell--stack {
  flex-direction: column;
  align-items: stretch;
}

.compare__slider {
  width: 12rem;
}

/* Bound the demo tracks, not the library's native tab sizing/scroll grammar. */
.compare__tabs {
  width: 100%;
  min-width: 0;
}

.compare__tabs--fluent {
  flex-wrap: wrap;
}

.compare__tab-scroll {
  width: 100%;
  min-width: 0;
  overflow-x: auto;
}

.compare__tab-scroll > .q-tabs {
  width: max-content;
  min-width: 100%;
}

.compare__actions {
  display: flex;
  gap: var(--spacingHorizontalS);
}

.compare__fluent-card {
  display: flex;
  flex-direction: column;
  gap: var(--spacingVerticalM);
  width: 16rem;
  padding: var(--spacingVerticalL) var(--spacingHorizontalL);
  border-radius: var(--borderRadiusLarge);
  background: var(--colorNeutralBackground1);
  box-shadow: var(--shadow4);
}

.compare__fluent-card-title {
  font-size: var(--fontSizeBase400);
  line-height: var(--lineHeightBase400);
  font-weight: var(--fontWeightSemibold);
}

.compare__fluent-menu {
  width: 12rem;
  padding: var(--spacingVerticalXS);
  border-radius: var(--borderRadiusMedium);
  background: var(--colorNeutralBackground1);
  box-shadow: var(--shadow16);
}

.compare__qds-card {
  width: 16rem;
}

.compare__qds-menu {
  width: 12rem;
}

.compare__qds-dialog {
  min-width: 20rem;
}

@media (max-width: 720px) {
  .compare__row {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
