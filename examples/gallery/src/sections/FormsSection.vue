<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import type { QInput } from 'quasar'
import { useDesignSystem } from '@osmova/quasar-design-system'
import {
  PhAt,
  PhBookOpen,
  PhCheck,
  PhCircleHalf,
  PhCloudArrowUp,
  PhCopy,
  PhDesktop,
  PhDrop,
  PhEye,
  PhEyeSlash,
  PhFilmSlate,
  PhGameController,
  PhHouse,
  PhMagnifyingGlass,
  PhMinus,
  PhMusicNotes,
  PhPaintBrush,
  PhPalette,
  PhPlus,
  PhShieldCheck,
  PhSquaresFour,
  PhUserCircle,
  PhWarning,
} from '@phosphor-icons/vue'

const variants = [
  { name: 'outlined', props: { outlined: true }, class: '' },
  { name: 'filled', props: { filled: true }, class: '' },
  { name: 'standout', props: { standout: true }, class: '' },
  { name: 'ghost', props: { borderless: true }, class: 'qds-field--ghost' },
  { name: 'borderless', props: { borderless: true }, class: '' },
] as const
const sizes = [
  { name: 'dense', dense: true, class: '', label: 'Dense (24)' },
  { name: 'default', dense: false, class: '', label: 'Default (32)' },
  { name: 'lg', dense: false, class: 'qds-field--lg', label: 'Large (40)' },
] as const

const workspace = ref('Northwind Ops')
const handle = ref('')
const displayName = ref('')
const contactEmail = ref('ops@example.com')
const slug = ref('')

const rest = ref('')
const hover = ref('')
const focusValue = ref('')
const focusTarget = ref<QInput | null>(null)
const positive = ref('northwind')
const warning = ref('admin')
const invalid = ref('ops@')
const readonlyValue = ref('ws_01HZX4Q8')

const memberQuery = ref('')
const memberRole = ref('Editor')
const waitlistEmail = ref('')
const memberFilter = ref('')
const roleOptions = ['Viewer', 'Editor', 'Admin']
const search = ref('')
const seats = ref(12)
const tags = ref(['billing', 'priority'])
const password = ref('correct-horse')
const passwordVisible = ref(false)
const inviteLink = 'https://example.com/invite/7Q4M-2KXD'
const copied = ref(false)
const project = ref('Quarterly review')
const bio = ref('Runs the support rotation and the weekly release checklist.')
const owner = ref('Avery Chen')
const ownerOptions = ['Avery Chen', 'Jordan Blake', 'Sam Rivera']
const files = ref<File[] | null>(null)
const pin = ref(['4', '8', '1', '', '', ''])
const pinInputs = ref<(QInput | null)[]>([])
const plan = ref('team')
const planOptions = [
  { label: 'Starter', value: 'starter' },
  { label: 'Team', value: 'team' },
  { label: 'Enterprise', value: 'enterprise' },
]
const channels = ref(['email'])
const channelOptions = [
  { label: 'Email', value: 'email' },
  { label: 'Push', value: 'push' },
  { label: 'SMS', value: 'sms', disable: true },
]

const timezone = ref('UTC+01:00 Paris')
const timezoneOptions = ['UTC', 'UTC+01:00 Paris', 'UTC-05:00 New York']

const category = ref('apps')
const pills = [
  { value: 'home', label: 'Home', icon: PhHouse, color: 'text-primary' },
  { value: 'apps', label: 'Apps', icon: PhSquaresFour, color: 'text-accent' },
  { value: 'games', label: 'Games', icon: PhGameController, color: 'text-positive' },
  { value: 'movies', label: 'Movies', icon: PhFilmSlate, color: 'text-negative' },
  { value: 'music', label: 'Music', icon: PhMusicNotes, color: 'text-primary' },
  { value: 'books', label: 'Books', icon: PhBookOpen, color: 'text-warning' },
]

const settingsSection = ref('appearance')
const settingsNav = [
  { value: 'home', label: 'Home', icon: PhHouse },
  { value: 'system', label: 'System', icon: PhDesktop },
  { value: 'appearance', label: 'Appearance', icon: PhPaintBrush },
  { value: 'apps', label: 'Apps', icon: PhSquaresFour },
  { value: 'accounts', label: 'Accounts', icon: PhUserCircle },
  { value: 'privacy', label: 'Privacy & security', icon: PhShieldCheck },
]
const appearanceMode = ref('Dark')
const appearanceModes = ['Light', 'Dark', 'Custom']
const transparency = ref(true)
const ds = useDesignSystem()
const accentOpen = ref(true)
const accent = ref('primary')
const swatches = [
  { value: 'primary', label: 'Primary', color: 'var(--qds-color-primary)' },
  { value: 'secondary', label: 'Secondary', color: 'var(--qds-color-secondary)' },
  { value: 'accent', label: 'Accent', color: 'var(--qds-color-accent)' },
  { value: 'positive', label: 'Green', color: 'var(--qds-color-positive)' },
  { value: 'warning', label: 'Amber', color: 'var(--qds-color-warning)' },
  { value: 'negative', label: 'Red', color: 'var(--qds-color-negative)' },
  { value: 'info', label: 'Blue', color: 'var(--qds-color-info)' },
]
const accentLabel = computed(() => swatches.find((swatch) => swatch.value === accent.value)?.label ?? 'Manual')

function moveSwatch(event: KeyboardEvent) {
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key]
  if (!step) return
  event.preventDefault()
  const index = swatches.findIndex((swatch) => swatch.value === accent.value)
  accent.value = swatches[(index + step + swatches.length) % swatches.length].value
  const group = (event.currentTarget as HTMLElement).parentElement
  void nextTick(() => group?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus())
}

function focusField() {
  focusTarget.value?.focus()
}

function initials(name: string) {
  return name.split(' ').map((part) => part[0]).join('')
}

async function copyLink() {
  await navigator.clipboard?.writeText(inviteLink).catch(() => undefined)
  copied.value = true
  window.setTimeout(() => { copied.value = false }, 1500)
}

function onPinInput(index: number, value: string | number | null) {
  const digit = String(value ?? '').replace(/\D/g, '').slice(-1)
  pin.value[index] = digit
  if (digit && index < pin.value.length - 1) pinInputs.value[index + 1]?.focus()
}

function onPinBackspace(index: number) {
  if (!pin.value[index] && index > 0) pinInputs.value[index - 1]?.focus()
}
</script>

<template>
  <div class="column no-wrap" style="gap: 1.5rem">
    <q-card class="q-pa-lg" data-test="qds-forms-anatomy">
      <div class="text-h6 qds-display q-mb-xs">Field anatomy</div>
      <div class="qds-text-muted q-mb-md">
        Label, hint, description, control, help and error. <code>.qds-form-field</code> wraps any control.
      </div>
      <div class="forms-grid">
        <div class="qds-form-field qds-form-field--required" data-test="qds-forms-anatomy-field">
          <div class="qds-form-field__header">
            <label class="qds-form-field__label" for="forms-workspace">Workspace name</label>
            <span class="qds-form-field__hint">Visible to members</span>
          </div>
          <p id="forms-workspace-description" class="qds-form-field__description">Shown in the sidebar and in invitation emails.</p>
          <q-input
            v-model="workspace"
            for="forms-workspace"
            name="forms-workspace"
            outlined
            required
            hide-bottom-space
            aria-describedby="forms-workspace-description forms-workspace-help"
          />
          <p id="forms-workspace-help" class="qds-form-field__help">Use 3 to 40 characters.</p>
        </div>

        <div class="qds-form-field" data-test="qds-forms-anatomy-error">
          <div class="qds-form-field__header">
            <label class="qds-form-field__label" for="forms-handle">Handle</label>
            <span class="qds-form-field__hint">Optional</span>
          </div>
          <q-input
            v-model="handle"
            for="forms-handle"
            name="forms-handle"
            outlined
            error
            hide-bottom-space
            aria-describedby="forms-handle-error"
          >
            <template #prepend><PhAt :size="16" weight="regular" /></template>
          </q-input>
          <p class="qds-form-field__help">Lowercase letters, numbers and dashes.</p>
          <p id="forms-handle-error" class="qds-form-field__error" role="alert">Handle is already taken.</p>
        </div>

        <div data-test="qds-forms-label-hint">
          <q-input v-model="displayName" name="forms-display-name" outlined label-slot>
            <template #label>Display name <span class="qds-field__hint">Optional</span></template>
          </q-input>
        </div>

        <div data-test="qds-forms-required">
          <q-input v-model="contactEmail" name="forms-contact-email" type="email" label="Contact email" outlined required />
        </div>

        <div data-test="qds-forms-required-aria">
          <q-input v-model="slug" name="forms-slug" label="URL slug" outlined aria-required="true" />
        </div>

        <div data-test="qds-forms-required-class">
          <q-select v-model="timezone" name="forms-anatomy-timezone" :options="timezoneOptions" label="Timezone" outlined class="qds-field--required" />
        </div>
      </div>

      <div class="qds-form-field qds-form-field--horizontal q-mt-lg" data-test="qds-forms-horizontal">
        <div class="qds-form-field__header">
          <label class="qds-form-field__label" for="forms-horizontal-email">Billing email</label>
          <span class="qds-form-field__hint">Optional</span>
        </div>
        <p class="qds-form-field__description">Invoices and receipts are sent here.</p>
        <q-input v-model="contactEmail" for="forms-horizontal-email" name="forms-horizontal-email" type="email" outlined hide-bottom-space />
        <p class="qds-form-field__help">Leave empty to use the owner's address.</p>
      </div>
    </q-card>

    <q-card class="q-pa-lg" data-test="qds-forms-variants">
      <div class="text-h6 qds-display q-mb-xs">Variants &amp; sizes</div>
      <div class="qds-text-muted q-mb-md">Fluent heights 24 / 32 / 40: <code>dense</code>, default, <code>.qds-field--lg</code>.</div>
      <div class="forms-matrix">
        <template v-for="variant in variants" :key="variant.name">
          <div class="forms-matrix__label qds-text-muted"><code>{{ variant.class || variant.name }}</code></div>
          <div
            v-for="size in sizes"
            :key="`${variant.name}-${size.name}`"
            :data-test="`qds-forms-variant-${variant.name}-${size.name}`"
          >
            <q-input
              model-value=""
              v-bind="variant.props"
              :name="`forms-${variant.name}-${size.name}`"
              :dense="size.dense"
              :class="[variant.class, size.class]"
              :label="size.label"
              placeholder="Type here"
            />
          </div>
        </template>
      </div>
    </q-card>

    <q-card class="q-pa-lg" data-test="qds-forms-states">
      <div class="text-h6 qds-display q-mb-xs">States</div>
      <div class="qds-text-muted q-mb-md">Rest, hover, focus, validation, disabled, read-only and loading.</div>
      <div class="forms-grid">
        <div data-test="qds-forms-state-rest">
          <q-input v-model="rest" name="forms-state-rest" label="Rest" outlined placeholder="Project name" />
        </div>
        <div data-test="qds-forms-state-hover">
          <q-input v-model="hover" name="forms-state-hover" label="Hover" outlined placeholder="Point at this field" />
        </div>
        <div data-test="qds-forms-state-focus">
          <q-input ref="focusTarget" v-model="focusValue" name="forms-state-focus" label="Focus" outlined placeholder="Focused by the button" />
          <q-btn class="q-mt-xs" flat dense no-caps color="primary" label="Focus field" data-test="qds-forms-focus-trigger" @click="focusField" />
        </div>
        <div data-test="qds-forms-state-positive">
          <q-input v-model="positive" name="forms-state-positive" label="Subdomain" outlined class="qds-field--positive" hint="Subdomain is available">
            <template #append><PhCheck :size="16" weight="regular" /></template>
          </q-input>
        </div>
        <div data-test="qds-forms-state-warning">
          <q-input v-model="warning" name="forms-state-warning" label="Username" outlined class="qds-field--warning" hint="Common names are easy to guess">
            <template #append><PhWarning :size="16" weight="regular" /></template>
          </q-input>
        </div>
        <div data-test="qds-forms-state-error">
          <q-input v-model="invalid" name="forms-state-error" label="Email" outlined error error-message="Enter a complete email address" />
        </div>
        <div data-test="qds-forms-state-disabled">
          <q-input model-value="Managed by your admin" name="forms-state-disabled" label="Disabled" outlined disable />
        </div>
        <div data-test="qds-forms-state-readonly">
          <q-input v-model="readonlyValue" name="forms-state-readonly" label="Workspace ID" outlined readonly />
        </div>
        <div data-test="qds-forms-state-loading">
          <q-input model-value="northwind-ops" name="forms-state-loading" label="Checking availability" outlined loading />
        </div>
      </div>
    </q-card>

    <q-card class="q-pa-lg" data-test="qds-forms-compositions">
      <div class="text-h6 qds-display q-mb-xs">Compositions</div>
      <div class="qds-text-muted q-mb-md">Joined groups, shortcuts, steppers, tags, secrets, uploads, codes and option cards.</div>

      <div class="text-subtitle2 qds-text-muted q-mb-xs">Field group</div>
      <div class="qds-field-group q-mb-lg" role="group" aria-label="Invite member" data-test="qds-forms-field-group">
        <q-input v-model="memberQuery" name="forms-member" outlined placeholder="name@example.com" aria-label="Member email" />
        <q-select v-model="memberRole" name="forms-member-role" :options="roleOptions" outlined aria-label="Role" />
        <q-btn unelevated color="primary" no-caps label="Invite" />
      </div>
      <div class="qds-field-group q-mb-sm" role="group" aria-label="Join waitlist" data-test="qds-forms-field-group-pair">
        <q-input v-model="waitlistEmail" name="forms-waitlist" outlined placeholder="you@example.com" aria-label="Waitlist email" />
        <q-btn unelevated color="primary" no-caps label="Join" />
      </div>
      <div class="qds-field-group q-mb-lg" role="group" aria-label="Filter members" data-test="qds-forms-field-group-button-first">
        <q-btn outline no-caps label="Filter" />
        <q-input v-model="memberFilter" name="forms-member-filter" outlined placeholder="Filter by name" aria-label="Member filter" />
      </div>

      <div class="forms-grid">
        <div data-test="qds-forms-kbd">
          <q-input v-model="search" name="forms-search" label="Search settings" outlined placeholder="Search">
            <template #prepend><PhMagnifyingGlass :size="16" weight="regular" /></template>
            <template #append><kbd class="qds-kbd">Ctrl</kbd><kbd class="qds-kbd">K</kbd></template>
          </q-input>
          <div class="qds-text-muted q-mt-xs">Press <kbd>Esc</kbd> to clear the query.</div>
        </div>

        <div data-test="qds-forms-stepper">
          <q-input v-model.number="seats" name="forms-seats" type="number" label="Seats" outlined class="qds-field--stepper" :min="1" :max="500">
            <template #append>
              <q-btn flat dense round aria-label="Remove a seat" :disable="seats <= 1" @click="seats = Math.max(1, seats - 1)">
                <PhMinus :size="16" weight="regular" />
              </q-btn>
              <q-btn flat dense round aria-label="Add a seat" @click="seats = Math.min(500, seats + 1)">
                <PhPlus :size="16" weight="regular" />
              </q-btn>
            </template>
          </q-input>
        </div>

        <div data-test="qds-forms-tags">
          <q-select
            v-model="tags"
            name="forms-tags"
            label="Tags"
            outlined
            multiple
            use-chips
            use-input
            hide-dropdown-icon
            new-value-mode="add-unique"
            input-debounce="0"
            placeholder="Add a tag"
          />
        </div>

        <div data-test="qds-forms-password">
          <q-input v-model="password" name="forms-password" :type="passwordVisible ? 'text' : 'password'" label="Password" outlined autocomplete="new-password">
            <template #append>
              <q-btn
                flat
                dense
                round
                :aria-label="passwordVisible ? 'Hide password' : 'Show password'"
                :aria-pressed="passwordVisible"
                @click="passwordVisible = !passwordVisible"
              >
                <component :is="passwordVisible ? PhEyeSlash : PhEye" :size="16" weight="regular" />
              </q-btn>
            </template>
          </q-input>
        </div>

        <div data-test="qds-forms-copy">
          <q-input :model-value="inviteLink" name="forms-invite-link" label="Invite link" outlined readonly>
            <template #append>
              <q-btn flat dense round :aria-label="copied ? 'Copied' : 'Copy invite link'" @click="copyLink">
                <component :is="copied ? PhCheck : PhCopy" :size="16" weight="regular" />
              </q-btn>
            </template>
          </q-input>
        </div>

        <div data-test="qds-forms-clearable">
          <q-input v-model="project" name="forms-project" label="Project" outlined clearable />
        </div>

        <div data-test="qds-forms-counter">
          <q-input v-model="bio" name="forms-bio" label="Bio" type="textarea" autogrow outlined counter maxlength="160" />
        </div>

        <div data-test="qds-forms-avatar">
          <q-select v-model="owner" name="forms-owner" :options="ownerOptions" label="Owner" outlined>
            <template #prepend>
              <q-avatar size="1.25rem" color="primary" text-color="white" font-size="0.625rem">{{ initials(owner) }}</q-avatar>
            </template>
          </q-select>
        </div>

        <div data-test="qds-forms-dropzone">
          <q-file v-model="files" name="forms-attachments" label="Attachments" outlined multiple class="qds-field--dropzone" display-value="Drop files or browse" hint="PDF or PNG, up to 10 MB each">
            <template #prepend><PhCloudArrowUp :size="20" weight="duotone" /></template>
          </q-file>
        </div>

        <div data-test="qds-forms-pin-block">
          <div id="forms-pin-label" class="qds-form-field__label q-mb-xs">Verification code</div>
          <div class="qds-pin" role="group" aria-labelledby="forms-pin-label" data-test="qds-forms-pin">
            <q-input
              v-for="(digit, index) in pin"
              :key="index"
              :ref="(el) => { pinInputs[index] = el as QInput | null }"
              :model-value="digit"
              :name="`forms-pin-${index}`"
              outlined
              maxlength="1"
              inputmode="numeric"
              autocomplete="one-time-code"
              :aria-label="`Digit ${index + 1}`"
              @update:model-value="onPinInput(index, $event)"
              @keydown.backspace="onPinBackspace(index)"
            />
          </div>
        </div>
      </div>

      <div class="forms-grid q-mt-lg">
        <div data-test="qds-forms-option-cards-radio">
          <div id="forms-plan-label" class="qds-form-field__label q-mb-xs">Plan</div>
          <q-option-group v-model="plan" :options="planOptions" type="radio" name="forms-plan" class="qds-option-group--card" aria-labelledby="forms-plan-label" />
        </div>
        <div data-test="qds-forms-option-cards-checkbox">
          <div id="forms-channels-label" class="qds-form-field__label q-mb-xs">Notification channels</div>
          <q-option-group v-model="channels" :options="channelOptions" type="checkbox" name="forms-channels" class="qds-option-group--card" aria-labelledby="forms-channels-label" />
        </div>
      </div>
    </q-card>

    <q-card class="q-pa-lg" data-test="qds-forms-pills-card">
      <div class="text-h6 qds-display q-mb-xs">Category pills</div>
      <div class="qds-text-muted q-mb-md">Store-style filters: a coloured icon per pill and a soft halo on hover and selection.</div>
      <div class="forms-pills" role="group" aria-label="Browse categories" data-test="qds-forms-pills">
        <q-chip
          v-for="pill in pills"
          :key="pill.value"
          clickable
          role="button"
          :selected="category === pill.value"
          :aria-pressed="category === pill.value"
          @update:selected="category = pill.value"
        >
          <component :is="pill.icon" :size="16" weight="duotone" :class="pill.color" />
          {{ pill.label }}
        </q-chip>
      </div>
    </q-card>

    <q-card class="q-pa-lg" data-test="qds-forms-settings">
      <div class="forms-settings">
        <nav aria-label="Settings sections">
          <q-list role="none" class="forms-settings__nav">
            <q-item
              v-for="entry in settingsNav"
              :key="entry.value"
              clickable
              :active="settingsSection === entry.value"
              :aria-current="settingsSection === entry.value ? 'page' : undefined"
              @click="settingsSection = entry.value"
            >
              <q-item-section avatar><component :is="entry.icon" :size="18" weight="duotone" /></q-item-section>
              <q-item-section>{{ entry.label }}</q-item-section>
            </q-item>
          </q-list>
        </nav>

        <div class="forms-settings__main">
          <q-breadcrumbs class="forms-settings__title qds-display" separator="›" data-test="qds-forms-settings-title">
            <q-breadcrumbs-el label="Appearance" />
            <q-breadcrumbs-el label="Colors" />
          </q-breadcrumbs>

          <div class="qds-settings-group" data-test="qds-forms-settings-group">
            <div class="qds-settings-card" data-test="qds-forms-settings-mode">
              <div class="qds-settings-card__icon"><PhCircleHalf :size="20" weight="duotone" /></div>
              <div class="qds-settings-card__header">Choose your mode</div>
              <div class="qds-settings-card__description">Change the colors that appear in the app.</div>
              <div class="qds-settings-card__action">
                <q-select v-model="appearanceMode" name="forms-appearance-mode" :options="appearanceModes" outlined aria-label="Choose your mode" />
              </div>
            </div>

            <div class="qds-settings-card" data-test="qds-forms-settings-transparency">
              <div class="qds-settings-card__icon"><PhDrop :size="20" weight="duotone" /></div>
              <div class="qds-settings-card__header">Transparency effects</div>
              <div class="qds-settings-card__description">Windows and surfaces appear slightly translucent.</div>
              <div class="qds-settings-card__action">
                <q-toggle v-model="transparency" name="forms-transparency" :label="transparency ? 'On' : 'Off'" left-label aria-label="Transparency effects" />
              </div>
            </div>

            <q-expansion-item
              v-model="accentOpen"
              class="qds-settings-card"
              data-test="qds-forms-settings-accent"
            >
              <template #header>
                <div class="qds-settings-card__icon"><PhPalette :size="20" weight="duotone" /></div>
                <div class="qds-settings-card__header">Accent color</div>
                <div class="qds-settings-card__description">Used for highlights, selection and focus.</div>
                <div class="qds-settings-card__action qds-text-muted">{{ accentLabel }}</div>
              </template>
              <div class="forms-swatches" role="radiogroup" aria-label="Accent color" data-test="qds-forms-settings-swatches">
                <button
                  v-for="swatch in swatches"
                  :key="swatch.value"
                  type="button"
                  role="radio"
                  class="forms-swatch"
                  :class="{ 'forms-swatch--selected': accent === swatch.value, [`bg-${swatch.value}`]: ds.variant.value === 'ink' }"
                  :style="{ background: swatch.color }"
                  :aria-checked="accent === swatch.value"
                  :aria-label="swatch.label"
                  :tabindex="accent === swatch.value ? 0 : -1"
                  @click="accent = swatch.value"
                  @keydown="moveSwatch"
                />
              </div>
            </q-expansion-item>

            <div class="qds-settings-card" data-test="qds-forms-settings-contrast">
              <div class="qds-settings-card__icon"><PhEye :size="20" weight="duotone" /></div>
              <div class="qds-settings-card__header">Contrast themes</div>
              <div class="qds-settings-card__description">Color themes for low vision and light sensitivity.</div>
              <div class="qds-settings-card__action">
                <q-btn no-caps label="Open" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </q-card>
  </div>
</template>

<style scoped>
.forms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
  gap: var(--qds-space-lg) var(--qds-space-md);
  align-items: start;
}

.forms-matrix {
  display: grid;
  grid-template-columns: minmax(6rem, auto) repeat(3, minmax(0, 1fr));
  gap: var(--qds-space-md);
  align-items: end;
}

.forms-matrix__label {
  align-self: center;
}

.forms-pills {
  display: flex;
  flex-wrap: wrap;
  gap: var(--qds-space-sm);
}

.forms-settings {
  display: grid;
  grid-template-columns: minmax(12rem, 16rem) minmax(0, 1fr);
  gap: var(--qds-space-lg);
  align-items: start;
}

.forms-settings__title {
  margin-block-end: var(--qds-space-md);
  font-size: 1.75rem;
  font-weight: var(--qds-font-weight-semibold);
  color: var(--qds-fg-muted);
}

.forms-settings__title :deep(.q-breadcrumbs > div:last-child) { color: var(--qds-fg-strong); }

.forms-swatches {
  display: flex;
  flex-wrap: wrap;
  gap: var(--qds-space-sm);
  padding-block: var(--qds-space-sm);
  padding-inline-start: 3rem;
}

.forms-swatch {
  width: 2rem;
  height: 2rem;
  border: 0;
  border-radius: var(--qds-radius-control);
  cursor: pointer;
}

.forms-swatch--selected,
.forms-swatch:focus-visible {
  outline: 2px solid var(--qds-fg-default);
  outline-offset: 2px;
}

@media (max-width: 720px) {
  .forms-matrix,
  .forms-settings {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
