<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, type Component } from 'vue'
import type { QBtn, QTableColumn } from 'quasar'
import {
  PhArrowCounterClockwise,
  PhArrowLeft,
  PhArrowsClockwise,
  PhBell,
  PhChartLine,
  PhCheckCircle,
  PhClock,
  PhCpu,
  PhDatabase,
  PhFlask,
  PhGear,
  PhGlobe,
  PhHouse,
  PhKey,
  PhList,
  PhListMagnifyingGlass,
  PhPlus,
  PhPulse,
  PhRocketLaunch,
  PhTimer,
  PhUsers,
  PhWarning,
  PhWarningOctagon,
} from '@phosphor-icons/vue'

type Tone = 'positive' | 'warning' | 'negative'

const deployTargets = [
  { value: 'production', label: 'Deploy to production', caption: 'main · 3 regions', description: 'Rolls out gradually with automatic rollback.', icon: PhRocketLaunch },
  { value: 'staging', label: 'Deploy to staging', caption: 'release/2.4 · eu-west', description: 'Runs smoke checks before shifting traffic.', icon: PhFlask },
  { value: 'schedule', label: 'Schedule deployment', caption: 'Next window 22:00 UTC', description: 'Queues the release for the maintenance window.', icon: PhClock },
  { value: 'review', label: 'Request review', caption: 'Avery Chen · on call', description: 'Asks the on-call owner to approve the release.', avatar: 'AC' },
] as const
type DeployTarget = (typeof deployTargets)[number]['value']
const deployTarget = ref<DeployTarget>('production')
const deployLabel = computed(() => deployTargets.find((target) => target.value === deployTarget.value)!.label)
const deployStatus = ref('')

function runDeploy() {
  deployStatus.value = `${deployLabel.value} started.`
}

function chooseDeploy(value: DeployTarget) {
  deployTarget.value = value
  runDeploy()
}

const deployMenu = ref<{ $el: HTMLElement } | null>(null)

function focusMenuRow(index: number) {
  const rows = [...(deployMenu.value?.$el.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? [])]
  rows[(index + rows.length) % rows.length]?.focus()
}

function moveMenuFocus(event: KeyboardEvent) {
  const rows = [...(event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[role^="menuitem"]')]
  const index = rows.indexOf(document.activeElement as HTMLElement)
  const next = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: rows.length - 1 }[event.key]
  if (next === undefined) return
  event.preventDefault()
  focusMenuRow(next)
}

type NavItem = { value: string; label: string; icon: Component }
type NavSection = { group?: string; icon?: Component; items: NavItem[] }

const navSections: NavSection[] = [
  {
    items: [
      { value: 'home', label: 'Home', icon: PhHouse },
      { value: 'deployments', label: 'Deployments', icon: PhRocketLaunch },
    ],
  },
  {
    group: 'Monitoring',
    icon: PhPulse,
    items: [
      { value: 'metrics', label: 'Metrics', icon: PhChartLine },
      { value: 'logs', label: 'Logs', icon: PhListMagnifyingGlass },
      { value: 'alerts', label: 'Alerts', icon: PhBell },
    ],
  },
  {
    items: [
      { value: 'members', label: 'Members', icon: PhUsers },
      { value: 'settings', label: 'Settings', icon: PhGear },
    ],
  },
]
const navItems = navSections.flatMap((section) => section.items)
const narrowQuery = '(max-width: 45rem)'
const navMini = ref(matchMedia(narrowQuery).matches)
const navActive = ref('metrics')
const navMonitoringOpen = ref(true)
const navTip = ref<string | null>(null)
const navHead = ref<HTMLElement | null>(null)
const navMenu = ref<HTMLElement | null>(null)
const navHeight = ref(0)
let navObserver: ResizeObserver | undefined

// A container QLayout needs an explicit height, so it follows the rail's content.
onMounted(() => {
  navObserver = new ResizeObserver(() => {
    navHeight.value = (navHead.value?.offsetHeight ?? 0) + (navMenu.value?.offsetHeight ?? 0)
  })
  for (const element of [navHead.value, navMenu.value]) if (element) navObserver.observe(element)
})
onBeforeUnmount(() => navObserver?.disconnect())

const navActiveLabel = computed(() => navItems.find((item) => item.value === navActive.value)?.label ?? '')

const subpage = ref('general')
const subpages = [
  { name: 'general', label: 'General' },
  { name: 'notifications', label: 'Notifications' },
  { name: 'access', label: 'Access' },
  { name: 'advanced', label: 'Advanced' },
]
const workspaceName = ref('Northwind Ops')
const digest = ref(true)
const pageOnCall = ref(true)
const enforceSso = ref(false)
const auditRetention = ref('90 days')
const retentionOptions = ['30 days', '90 days', '1 year']

type Service = { name: string; region: string; status: Tone; statusLabel: string; latency: number }
const services: Service[] = [
  { name: 'checkout-api', region: 'eu-west', status: 'positive', statusLabel: 'Healthy', latency: 118 },
  { name: 'search-indexer', region: 'us-east', status: 'warning', statusLabel: 'Degraded', latency: 412 },
  { name: 'billing-worker', region: 'eu-west', status: 'positive', statusLabel: 'Healthy', latency: 96 },
  { name: 'media-proxy', region: 'ap-south', status: 'negative', statusLabel: 'Down', latency: 0 },
  { name: 'auth-gateway', region: 'us-east', status: 'positive', statusLabel: 'Healthy', latency: 74 },
]
const statusIcons: Record<Tone, Component> = { positive: PhCheckCircle, warning: PhWarning, negative: PhWarningOctagon }
const serviceColumns: QTableColumn<Service>[] = [
  { name: 'name', label: 'Service', field: 'name', align: 'left' },
  { name: 'region', label: 'Region', field: 'region', align: 'left' },
  { name: 'status', label: 'Status', field: 'statusLabel', align: 'left' },
  { name: 'latency', label: 'p95', field: 'latency', align: 'right', format: (value: number) => (value ? `${value} ms` : '—') },
  { name: 'traffic', label: 'Traffic', field: 'name', align: 'left' },
]
const serviceFilter = ref('all')
const serviceFilterOptions = [
  { label: 'All', value: 'all' },
  { label: 'Healthy', value: 'positive' },
  { label: 'Needs attention', value: 'attention' },
]
const filteredServices = computed(() =>
  services.filter((service) => serviceFilter.value === 'all' || (serviceFilter.value === 'positive' ? service.status === 'positive' : service.status !== 'positive')),
)
const traffic = ref<Record<string, string>>(Object.fromEntries(services.map((service) => [service.name, service.status === 'negative' ? 'off' : 'blue'])))
const trafficOptions = [
  { label: 'Blue', value: 'blue' },
  { label: 'Green', value: 'green' },
  { label: 'Off', value: 'off' },
]
const incidents = [
  { id: 'INC-2041', title: 'Elevated search latency', caption: 'search-indexer · opened 42 min ago', body: 'Index merges are saturating disk I/O in us-east. Traffic is shifted to the warm replica while compaction completes.' },
  { id: 'INC-2038', title: 'Media proxy unreachable', caption: 'media-proxy · opened 3 h ago', body: 'The ap-south edge lost its upstream route. Requests fail over to eu-west with higher latency.' },
]

type Tile = { label: string; value: string; meta: string; icon: Component; tone?: 'alert' | 'warning' | 'positive'; trend: number[]; summary: string }
const tiles: Tile[] = [
  { label: 'Open incidents', value: '3', meta: 'Critical: 2 need attention', icon: PhWarningOctagon, tone: 'alert', trend: [1, 1, 0, 2, 1, 2, 3, 3], summary: 'Rising from 1 to 3 over the last 8 hours.' },
  { label: 'p95 latency', value: '412 ms', meta: 'Warning: above the 300 ms target', icon: PhTimer, tone: 'warning', trend: [240, 260, 255, 290, 330, 360, 395, 412], summary: 'Rising from 240 to 412 ms over the last 8 hours.' },
  { label: 'Deployments today', value: '18', meta: 'On track: 4 more than yesterday', icon: PhRocketLaunch, tone: 'positive', trend: [2, 4, 5, 7, 9, 12, 15, 18], summary: 'Steady climb from 2 to 18 deployments today.' },
  { label: 'Uptime, 30 days', value: '99.95%', meta: 'Within the 99.9% objective', icon: PhCheckCircle, trend: [99.97, 99.96, 99.96, 99.95, 99.95, 99.96, 99.95, 99.95], summary: 'Flat between 99.95 and 99.97 percent.' },
  { label: 'CPU load', value: '64%', meta: 'Across 42 nodes', icon: PhCpu, trend: [48, 52, 58, 61, 59, 63, 66, 64], summary: 'Rising from 48 to 64 percent.' },
  { label: 'Queue depth', value: '1,284', meta: 'Draining since 09:40', icon: PhDatabase, trend: [2400, 2300, 2100, 1900, 1700, 1500, 1390, 1284], summary: 'Falling from 2,400 to 1,284 jobs.' },
]

function sparkPoints(values: number[]) {
  const min = Math.min(...values)
  const span = Math.max(...values) - min || 1
  return values.map((value, index) => `${((index / (values.length - 1)) * 100).toFixed(1)},${(22 - ((value - min) / span) * 20).toFixed(1)}`).join(' ')
}

const activity = [
  { title: 'checkout-api 2.4.1 deployed', caption: 'production · 12 min ago', icon: PhRocketLaunch },
  { title: 'Alert rule updated', caption: 'p95 latency > 300 ms · 38 min ago', icon: PhBell },
  { title: 'Key rotated', caption: 'billing-worker · 2 h ago', icon: PhKey },
]

const selectedServiceName = ref(services[0].name)
const selectedService = computed(() => services.find((service) => service.name === selectedServiceName.value)!)
const detailOpen = ref(false)
const detailHeading = ref<HTMLElement | null>(null)
const masterList = ref<HTMLElement | null>(null)
function openService(name: string) {
  selectedServiceName.value = name
  detailOpen.value = true
  if (matchMedia(narrowQuery).matches) void nextTick(() => detailHeading.value?.focus())
}

function closeService() {
  detailOpen.value = false
  void nextTick(() => masterList.value?.querySelector<HTMLElement>('[aria-current="true"]')?.focus())
}

const narrowMedia = matchMedia(narrowQuery)
const narrow = ref(narrowMedia.matches)
const onNarrowChange = (event: MediaQueryListEvent) => { narrow.value = event.matches }
onMounted(() => narrowMedia.addEventListener('change', onNarrowChange))
onBeforeUnmount(() => narrowMedia.removeEventListener('change', onNarrowChange))
const dialogOpen = ref(false)
const dialogStep = ref(1)
const dialogSteps = ['Source', 'Configure', 'Review']
const newService = ref('')
const newRegion = ref('eu-west')
const regionOptions = ['eu-west', 'us-east', 'ap-south']
const autoscale = ref(true)
const dialogResult = ref('')

function openDialog() {
  dialogStep.value = 1
  newService.value = ''
  dialogOpen.value = true
}

const dialogPrimary = ref<QBtn | null>(null)

function advanceDialog() {
  if (dialogStep.value < 3) {
    dialogStep.value += 1
    return
  }
  dialogResult.value = `${newService.value || 'new-service'} created in ${newRegion.value}.`
  dialogOpen.value = false
}

function backDialog() {
  dialogStep.value -= 1
  if (dialogStep.value === 1) void nextTick(() => (dialogPrimary.value?.$el as HTMLElement | undefined)?.focus())
}
</script>

<template>
  <div class="column no-wrap" style="gap: 1.5rem">
    <q-card class="q-pa-lg" data-test="qds-apps-split">
      <div class="text-h6 qds-display q-mb-xs">Split button</div>
      <div class="qds-text-muted q-mb-md">
        The primary segment runs the last chosen action; the chevron opens rich menu rows. Arrow keys move between rows (Tab also works), Enter activates, Escape closes and returns focus.
      </div>
      <div class="row items-center q-gutter-md">
        <q-btn-dropdown
          split
          unelevated
          color="primary"
          no-caps
          :label="deployLabel"
          toggle-aria-label="More deploy actions"
          toggle-aria-haspopup="menu"
          data-test="qds-apps-split-button"
          @click="runDeploy"
          @show="focusMenuRow(0)"
        >
          <q-list ref="deployMenu" role="menu" class="apps-menu" data-test="qds-apps-split-menu" @keydown="moveMenuFocus">
            <q-item
              v-for="target in deployTargets"
              :key="target.value"
              v-close-popup
              clickable
              role="menuitemradio"
              class="qds-menu-row"
              :active="deployTarget === target.value"
              :aria-checked="deployTarget === target.value ? 'true' : 'false'"
              @click="chooseDeploy(target.value)"
            >
              <q-item-section avatar class="qds-menu-row__icon">
                <q-avatar v-if="'avatar' in target" size="1.25rem" font-size="0.5625rem" color="primary" text-color="white">{{ target.avatar }}</q-avatar>
                <component :is="target.icon" v-else :size="20" weight="duotone" />
              </q-item-section>
              <q-item-section>
                <q-item-label class="qds-menu-row__title">{{ target.label }}</q-item-label>
                <q-item-label caption class="qds-menu-row__caption">{{ target.caption }}</q-item-label>
                <q-item-label class="qds-menu-row__description">{{ target.description }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-separator role="separator" />
            <q-item v-close-popup clickable role="menuitem" class="qds-menu-row" @click="deployStatus = 'Rollback started.'">
              <q-item-section avatar class="qds-menu-row__icon"><PhArrowCounterClockwise :size="20" weight="duotone" /></q-item-section>
              <q-item-section><q-item-label class="qds-menu-row__title">Roll back</q-item-label></q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
        <span class="qds-text-muted" role="status" data-test="qds-apps-split-status">{{ deployStatus }}</span>
      </div>
    </q-card>

    <q-card class="q-pa-lg" data-test="qds-apps-nav-card">
      <div class="text-h6 qds-display q-mb-xs">Compact navigation</div>
      <div class="qds-text-muted q-mb-md">NavigationView with nested destinations; the mini rail keeps every child named, focusable and labelled by a tooltip.</div>
      <div class="apps-nav" data-test="qds-apps-nav">
        <q-layout view="lHh Lpr lFf" container class="apps-nav__layout" :style="{ height: `max(16rem, ${navHeight + 2}px)` }">
          <q-drawer :model-value="true" behavior="desktop" :mini="navMini" :width="232" :mini-width="48" bordered data-test="qds-apps-nav-drawer">
            <div ref="navHead" class="apps-nav__head">
              <q-btn
                flat
                dense
                round
                :aria-label="navMini ? 'Expand navigation' : 'Collapse navigation'"
                :aria-expanded="navMini ? 'false' : 'true'"
                aria-controls="apps-nav-menu"
                data-test="qds-apps-nav-toggle"
                @click="navMini = !navMini"
              >
                <PhList :size="18" weight="regular" />
              </q-btn>
            </div>
            <nav id="apps-nav-menu" ref="navMenu" class="apps-nav__menu" aria-label="Operations console" data-test="qds-apps-nav-menu">
              <q-list role="none">
                <template v-for="(section, index) in navSections" :key="index">
                  <q-expansion-item v-if="section.group && !navMini" v-model="navMonitoringOpen" :label="section.group" data-test="qds-apps-nav-group">
                    <template #header>
                      <q-item-section avatar><component :is="section.icon" :size="18" weight="duotone" /></q-item-section>
                      <q-item-section>{{ section.group }}</q-item-section>
                    </template>
                    <q-item
                      v-for="item in section.items"
                      :key="item.value"
                      clickable
                      role="link"
                      :inset-level="0.5"
                      :active="navActive === item.value"
                      :aria-current="navActive === item.value ? 'page' : undefined"
                      :data-nav="item.value"
                      @click="navActive = item.value"
                    >
                      <q-item-section avatar><component :is="item.icon" :size="18" weight="duotone" /></q-item-section>
                      <q-item-section>{{ item.label }}</q-item-section>
                    </q-item>
                  </q-expansion-item>
                  <div
                    v-else
                    class="apps-nav__section"
                    :role="section.group ? 'group' : undefined"
                    :aria-label="section.group"
                    :data-test="section.group ? 'qds-apps-nav-group' : undefined"
                  >
                    <q-item
                      v-for="item in section.items"
                      :key="item.value"
                      clickable
                      role="link"
                      :active="navActive === item.value"
                      :aria-current="navActive === item.value ? 'page' : undefined"
                      :aria-label="navMini ? item.label : undefined"
                      :data-nav="item.value"
                      @click="navActive = item.value"
                      @focus="navTip = item.value"
                      @blur="navTip === item.value && (navTip = null)"
                    >
                      <q-item-section avatar><component :is="item.icon" :size="18" weight="duotone" /></q-item-section>
                      <q-item-section>{{ item.label }}</q-item-section>
                      <q-tooltip
                        v-if="navMini"
                        anchor="center end"
                        self="center start"
                        :offset="[8, 0]"
                        :model-value="navTip === item.value"
                        @update:model-value="(show: boolean) => { if (show) navTip = item.value; else if (navTip === item.value) navTip = null }"
                      >
                        {{ section.group ? `${section.group} › ${item.label}` : item.label }}
                      </q-tooltip>
                    </q-item>
                  </div>
                </template>
              </q-list>
            </nav>
          </q-drawer>
          <q-page-container>
            <q-page class="apps-nav__page">
              <h3 class="apps-nav__title qds-display" data-test="qds-apps-nav-title">{{ navActiveLabel }}</h3>
              <p class="qds-text-muted q-mb-none">Destination content for the selected page.</p>
            </q-page>
          </q-page-container>
        </q-layout>
      </div>
    </q-card>

    <q-card class="q-pa-lg" data-test="qds-apps-subpage">
      <div class="text-h6 qds-display q-mb-xs">Settings subpage</div>
      <div class="qds-text-muted q-mb-md">Four related subpages behind a 36px underline tab row. Arrow keys move between tabs.</div>
      <q-tabs v-model="subpage" class="qds-subpage-tabs" align="left" no-caps outside-arrows mobile-arrows aria-label="Workspace settings" data-test="qds-apps-subpage-tabs">
        <q-tab
          v-for="page in subpages"
          :id="`apps-subpage-tab-${page.name}`"
          :key="page.name"
          :name="page.name"
          :label="page.label"
          :aria-controls="subpage === page.name ? `apps-subpage-panel-${page.name}` : undefined"
        />
      </q-tabs>
      <q-tab-panels v-model="subpage" class="apps-subpage__panels" data-test="qds-apps-subpage-panels">
        <q-tab-panel name="general" id="apps-subpage-panel-general" aria-labelledby="apps-subpage-tab-general">
          <div class="qds-settings-group">
            <div class="qds-settings-card">
              <div class="qds-settings-card__icon"><PhGlobe :size="20" weight="duotone" /></div>
              <div class="qds-settings-card__header">Workspace name</div>
              <div class="qds-settings-card__description">Shown in the console header and in email.</div>
              <div class="qds-settings-card__action"><q-input v-model="workspaceName" name="apps-workspace-name" outlined aria-label="Workspace name" /></div>
            </div>
          </div>
        </q-tab-panel>
        <q-tab-panel name="notifications" id="apps-subpage-panel-notifications" aria-labelledby="apps-subpage-tab-notifications">
          <div class="qds-settings-group">
            <div class="qds-settings-card">
              <div class="qds-settings-card__icon"><PhBell :size="20" weight="duotone" /></div>
              <div class="qds-settings-card__header">Daily digest</div>
              <div class="qds-settings-card__description">A summary of incidents and deployments at 08:00.</div>
              <div class="qds-settings-card__action"><q-toggle v-model="digest" name="apps-digest" aria-label="Daily digest" /></div>
            </div>
            <div class="qds-settings-card">
              <div class="qds-settings-card__icon"><PhWarningOctagon :size="20" weight="duotone" /></div>
              <div class="qds-settings-card__header">Page the on-call owner</div>
              <div class="qds-settings-card__description">Critical alerts page immediately.</div>
              <div class="qds-settings-card__action"><q-toggle v-model="pageOnCall" name="apps-page-on-call" aria-label="Page the on-call owner" /></div>
            </div>
          </div>
        </q-tab-panel>
        <q-tab-panel name="access" id="apps-subpage-panel-access" aria-labelledby="apps-subpage-tab-access">
          <div class="qds-settings-group">
            <div class="qds-settings-card">
              <div class="qds-settings-card__icon"><PhKey :size="20" weight="duotone" /></div>
              <div class="qds-settings-card__header">Require single sign-on</div>
              <div class="qds-settings-card__description">Members sign in through the identity provider.</div>
              <div class="qds-settings-card__action"><q-toggle v-model="enforceSso" name="apps-sso" aria-label="Require single sign-on" /></div>
            </div>
          </div>
        </q-tab-panel>
        <q-tab-panel name="advanced" id="apps-subpage-panel-advanced" aria-labelledby="apps-subpage-tab-advanced">
          <div class="qds-settings-group">
            <div class="qds-settings-card">
              <div class="qds-settings-card__icon"><PhDatabase :size="20" weight="duotone" /></div>
              <div class="qds-settings-card__header">Audit log retention</div>
              <div class="qds-settings-card__description">Older entries are archived.</div>
              <div class="qds-settings-card__action"><q-select v-model="auditRetention" name="apps-retention" :options="retentionOptions" outlined aria-label="Audit log retention" /></div>
            </div>
          </div>
        </q-tab-panel>
      </q-tab-panels>
    </q-card>

    <q-card class="q-pa-lg" data-test="qds-apps-table-card">
      <div class="text-h6 qds-display q-mb-xs">Dense table controls</div>
      <div class="qds-text-muted q-mb-md">32px rows with segmented filters and per-row switchers, then expandable incident details.</div>
      <q-table
        dense
        flat
        :rows="filteredServices"
        :columns="serviceColumns"
        row-key="name"
        hide-pagination
        :pagination="{ rowsPerPage: 0 }"
        class="apps-table"
        data-test="qds-apps-table"
      >
        <template #top>
          <div class="apps-table__top">
            <span class="text-subtitle2">Services</span>
            <q-btn-toggle
              v-model="serviceFilter"
              class="qds-table-segmented"
              dense
              no-caps
              role="group"
              aria-label="Filter services"
              :options="serviceFilterOptions"
              data-test="qds-apps-table-filter"
            />
          </div>
        </template>
        <template #body-cell-status="props">
          <q-td :props="props">
            <span class="apps-status" :class="`text-${props.row.status}`">
              <component :is="statusIcons[props.row.status as Tone]" :size="14" weight="fill" aria-hidden="true" />
              <span class="apps-status__label">{{ props.row.statusLabel }}</span>
            </span>
          </q-td>
        </template>
        <template #body-cell-traffic="props">
          <q-td :props="props">
            <q-btn-toggle
              v-model="traffic[props.row.name]"
              class="qds-table-segmented"
              dense
              no-caps
              role="group"
              :aria-label="`Traffic for ${props.row.name}`"
              :options="trafficOptions"
              data-test="qds-apps-table-traffic"
            />
          </q-td>
        </template>
      </q-table>

      <div class="apps-incidents q-mt-md" role="group" aria-label="Open incidents" data-test="qds-apps-expansion">
        <q-expansion-item
          v-for="incident in incidents"
          :key="incident.id"
          group="apps-incidents"
          :label="`${incident.id} · ${incident.title}`"
          :caption="incident.caption"
          data-test="qds-apps-expansion-item"
        >
          <div class="apps-incidents__body">{{ incident.body }}</div>
        </q-expansion-item>
      </div>
    </q-card>

    <q-card class="apps-screen" data-test="qds-apps-dashboard">
      <header class="apps-screen__bar">
        <h2 class="apps-screen__title qds-display">Operations overview</h2>
        <div class="apps-screen__commands">
          <q-btn flat dense no-caps><PhArrowsClockwise :size="16" weight="regular" class="q-mr-xs" />Refresh</q-btn>
          <q-btn unelevated dense no-caps color="primary" label="New alert" />
        </div>
      </header>
      <div class="qds-tile-grid" role="list" aria-label="Service health" data-test="qds-apps-tiles">
        <div
          v-for="tile in tiles"
          :key="tile.label"
          role="listitem"
          class="qds-tile"
          :class="tile.tone ? `qds-tile--${tile.tone}` : undefined"
          data-test="qds-apps-tile"
        >
          <span class="qds-tile__icon"><component :is="tile.icon" :size="20" weight="duotone" aria-hidden="true" /></span>
          <div class="qds-tile__label">{{ tile.label }}</div>
          <div class="qds-tile__value">{{ tile.value }}</div>
          <div class="qds-tile__meta">{{ tile.meta }}</div>
          <div class="qds-tile__spark">
            <svg viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true" focusable="false">
              <polyline :points="sparkPoints(tile.trend)" />
            </svg>
            <span class="qds-sr-only">Trend: {{ tile.summary }}</span>
          </div>
        </div>
      </div>
      <section class="apps-activity" aria-labelledby="apps-activity-title">
        <h3 id="apps-activity-title" class="text-subtitle2 q-my-none">Recent activity</h3>
        <q-list dense>
          <q-item v-for="event in activity" :key="event.title">
            <q-item-section avatar><component :is="event.icon" :size="18" weight="duotone" /></q-item-section>
            <q-item-section>
              <q-item-label>{{ event.title }}</q-item-label>
              <q-item-label caption>{{ event.caption }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </section>
    </q-card>

    <q-card class="apps-screen" data-test="qds-apps-list-detail">
      <header class="apps-screen__bar">
        <h2 class="apps-screen__title qds-display">Services</h2>
      </header>
      <div class="apps-list-detail" :class="{ 'apps-list-detail--detail': detailOpen }">
        <div ref="masterList" class="apps-list-detail__master" role="group" aria-label="Services" data-test="qds-apps-list-detail-master">
          <q-list role="none">
            <q-item
              v-for="service in services"
              :key="service.name"
              clickable
              role="button"
              :active="selectedServiceName === service.name"
              :aria-current="selectedServiceName === service.name ? 'true' : undefined"
              @click="openService(service.name)"
            >
              <q-item-section>
                <q-item-label>{{ service.name }}</q-item-label>
                <q-item-label caption>{{ service.region }} · {{ service.statusLabel }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </div>
        <section class="apps-list-detail__detail" aria-labelledby="apps-detail-title" data-test="qds-apps-list-detail-pane">
          <q-btn flat dense no-caps class="apps-list-detail__back" data-test="qds-apps-list-detail-back" @click="closeService">
            <PhArrowLeft :size="16" weight="regular" class="q-mr-xs" />All services
          </q-btn>
          <h3 id="apps-detail-title" ref="detailHeading" tabindex="-1" class="apps-list-detail__heading qds-display">{{ selectedService.name }}</h3>
          <dl class="apps-list-detail__facts">
            <dt>Region</dt><dd>{{ selectedService.region }}</dd>
            <dt>Status</dt>
            <dd>
              <span class="apps-status" :class="`text-${selectedService.status}`">
                <component :is="statusIcons[selectedService.status]" :size="14" weight="fill" aria-hidden="true" />
                <span class="apps-status__label">{{ selectedService.statusLabel }}</span>
              </span>
            </dd>
            <dt>p95 latency</dt><dd>{{ selectedService.latency ? `${selectedService.latency} ms` : '—' }}</dd>
          </dl>
        </section>
      </div>
    </q-card>

    <q-card class="apps-screen" data-test="qds-apps-dialog-flow">
      <header class="apps-screen__bar">
        <h2 class="apps-screen__title qds-display">Add a service</h2>
        <div class="apps-screen__commands">
          <q-btn unelevated dense no-caps color="primary" data-test="qds-apps-dialog-trigger" @click="openDialog">
            <PhPlus :size="16" weight="regular" class="q-mr-xs" />Add service
          </q-btn>
        </div>
      </header>
      <p class="qds-text-muted q-px-lg q-pb-lg q-mb-none" role="status" data-test="qds-apps-dialog-result">{{ dialogResult || 'A three-step dialog: source, configuration and review.' }}</p>

      <q-dialog v-model="dialogOpen" aria-labelledby="apps-dialog-title">
        <q-card class="apps-dialog" data-test="qds-apps-dialog">
          <q-card-section class="q-pb-none">
            <div id="apps-dialog-title" class="text-h6 qds-display">Add service</div>
            <div v-if="narrow" class="qds-text-muted text-caption" aria-live="polite" data-test="qds-apps-dialog-step-caption">
              Step {{ dialogStep }} of {{ dialogSteps.length }} · {{ dialogSteps[dialogStep - 1] }}
            </div>
          </q-card-section>
          <q-stepper v-model="dialogStep" flat animated :contracted="narrow" class="apps-dialog__stepper" data-test="qds-apps-dialog-stepper">
            <q-step :name="1" title="Source" :done="dialogStep > 1">
              <q-input v-model="newService" name="apps-new-service" outlined label="Service name" autofocus data-test="qds-apps-dialog-name" />
            </q-step>
            <q-step :name="2" title="Configure" :done="dialogStep > 2">
              <div class="column" style="gap: 0.75rem">
                <q-select v-model="newRegion" name="apps-new-region" :options="regionOptions" outlined label="Region" />
                <q-toggle v-model="autoscale" name="apps-autoscale" label="Autoscale" />
              </div>
            </q-step>
            <q-step :name="3" title="Review">
              <p class="q-mb-none">{{ newService || 'new-service' }} in {{ newRegion }}, autoscale {{ autoscale ? 'on' : 'off' }}.</p>
            </q-step>
          </q-stepper>
          <q-card-actions align="right">
            <q-btn v-close-popup flat no-caps label="Cancel" />
            <q-btn flat no-caps label="Back" :disable="dialogStep === 1" @click="backDialog" />
            <q-btn ref="dialogPrimary" unelevated no-caps color="primary" :label="dialogStep < 3 ? 'Continue' : 'Create'" @click="advanceDialog" />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </q-card>
  </div>
</template>

<style scoped>
.apps-menu {
  max-width: 22rem;
}

.apps-nav__layout {
  overflow: hidden;
  border: 1px solid var(--qds-stroke-subtle);
  border-radius: var(--qds-card-radius);
}

.apps-nav__head {
  padding: var(--qds-space-xs) var(--qds-space-sm) 0;
}

/* Contains the list's margins so the measured height includes them. */
.apps-nav__menu {
  display: flow-root;
}

.apps-nav__section > .q-item {
  margin-block-start: var(--qds-row-gap);
}

.apps-nav__section:first-child > .q-item:first-child {
  margin-block-start: 0;
}

.apps-nav__page {
  padding: var(--qds-space-lg);
}

.apps-nav__title {
  margin: 0 0 var(--qds-space-xs);
  font-size: 1.5rem;
  line-height: 1.3;
}

.apps-subpage__panels {
  background: transparent;
}

.apps-table__top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--qds-space-sm);
  width: 100%;
}

.apps-status {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.apps-status__label {
  color: var(--qds-fg-default);
}

.apps-incidents {
  display: flex;
  flex-direction: column;
  gap: var(--qds-space-xs);
}

.apps-incidents__body {
  padding: var(--qds-space-xs) 0.75rem var(--qds-space-md);
  color: var(--qds-fg-muted);
}

:global(.qds-variant-one .apps-incidents__body) {
  padding-inline: var(--qds-space-md);
}

.apps-screen__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--qds-space-sm);
  padding: var(--qds-space-md) var(--qds-space-lg);
}

.apps-screen__title {
  margin: 0;
  font-size: 1.25rem;
  line-height: 1.4;
}

.apps-screen__commands {
  display: flex;
  gap: var(--qds-space-xs);
}

.apps-screen > .qds-tile-grid {
  padding-inline: var(--qds-space-lg);
}

.apps-activity {
  padding: var(--qds-space-md) var(--qds-space-lg) var(--qds-space-lg);
}

.apps-list-detail {
  display: grid;
  grid-template-columns: minmax(12rem, 18rem) minmax(0, 1fr);
  border-block-start: 1px solid var(--qds-stroke-divider);
}

.apps-list-detail__master {
  padding: var(--qds-space-sm);
  border-inline-end: 1px solid var(--qds-stroke-divider);
}

.apps-list-detail__detail {
  padding: var(--qds-space-md) var(--qds-space-lg) var(--qds-space-lg);
}

.apps-list-detail__back {
  display: none;
}

.apps-list-detail__heading:focus {
  outline: none;
}

.apps-list-detail__heading {
  margin: 0 0 var(--qds-space-md);
  font-size: 1.25rem;
  line-height: 1.4;
}

.apps-list-detail__facts {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  gap: var(--qds-space-xs) var(--qds-space-lg);
  margin: 0;
}

.apps-list-detail__facts dt {
  color: var(--qds-fg-muted);
}

.apps-list-detail__facts dd {
  margin: 0;
}

.apps-dialog {
  width: min(32rem, 100%);
}

@media (max-width: 45rem) {
  .apps-list-detail {
    grid-template-columns: minmax(0, 1fr);
  }

  .apps-list-detail__master {
    border-inline-end: 0;
  }

  .apps-list-detail--detail .apps-list-detail__master,
  .apps-list-detail:not(.apps-list-detail--detail) .apps-list-detail__detail {
    display: none;
  }

  .apps-list-detail__back {
    display: inline-flex;
    margin-block-end: var(--qds-space-sm);
  }
}
</style>
