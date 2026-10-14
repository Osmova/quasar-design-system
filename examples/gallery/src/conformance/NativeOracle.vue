<script setup lang="ts">
import { ref } from 'vue'
import { QBadge, QBtn, QCard, QCardActions, QCardSection, QCheckbox, QDialog, QDrawer, QInput, QItem, QItemLabel, QItemSection, QLayout, QList, QMarkupTable, QMenu, QPage, QPageContainer, QRadio, QSelect, QSeparator, QSpace, QTab, QTabPanel, QTabPanels, QTabs, QToggle } from 'quasar'
import { PhHouse, PhFolder, PhGearSix } from '@phosphor-icons/vue'
import { ppX } from 'quasar-extras-svg-icons/phosphor-icons-v2'
const name = ref('Alex Morgan')
const checked = ref(true)
const enabled = ref(true)
const density = ref('comfortable')
const fruit = ref('apple')
const tab = ref('account')
const menu = ref(false)
const dialog = ref(false)
const invoices = [{ id: 'INV001', status: 'Paid', method: 'Credit Card', amount: '$250.00' }, { id: 'INV002', status: 'Pending', method: 'PayPal', amount: '$150.00' }, { id: 'INV003', status: 'Unpaid', method: 'Bank Transfer', amount: '$350.00' }]
const query = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search)
const visible = (family: string) => !query.has('oracle') || query.get('oracle') === family
</script>
<template>
  <section aria-label="Native reference counterparts" data-native="oracle" style="display: grid; gap: 24px; min-width: 0">
    <section v-if="visible('button')" data-oracle="button"><h2>Buttons</h2><q-btn no-caps label="Button" data-case="default" /><q-btn color="secondary" no-caps label="Secondary" /><q-btn outline no-caps label="Outline" /><q-btn flat no-caps label="Ghost" /><q-btn color="negative" no-caps label="Destructive" /></section>
    <section v-if="visible('input')" data-oracle="input"><h2>Inputs</h2><label>Name<q-input v-model="name" outlined aria-label="Name" data-case="default" /></label></section>
    <section v-if="visible('selection')" data-oracle="selection"><h2>Selection</h2><q-checkbox v-model="checked" label="Accept terms and conditions" data-case="checked" /><q-radio v-model="density" val="comfortable" label="Comfortable" /><q-radio v-model="density" val="compact" label="Compact" /><q-toggle v-model="enabled" label="Notifications" /><q-select v-model="fruit" outlined label="Fruit" :options="[{ label: 'Apple', value: 'apple' }, { label: 'Banana', value: 'banana' }, { label: 'Orange', value: 'orange' }]" emit-value map-options data-case="select" /></section>
    <section v-if="visible('tabs')" data-oracle="tabs"><h2>Tabs</h2><q-tabs v-model="tab" no-caps><q-tab name="account" label="Account" /><q-tab name="password" label="Password" /><q-tab name="disabled" label="Disabled" disable /></q-tabs><q-tab-panels v-model="tab"><q-tab-panel name="account">Make changes to your account here.</q-tab-panel><q-tab-panel name="password">Change your password here.</q-tab-panel></q-tab-panels></section>
    <section v-if="visible('badge')" data-oracle="badge"><h2>Badges</h2><q-badge color="primary" label="Badge" data-case="default" /><q-badge color="secondary" label="Secondary" /><q-badge outline label="Outline" /><q-badge color="negative" label="Destructive" /></section>
    <section v-if="visible('card')" data-oracle="card"><h2>Card</h2><q-card data-case="default"><q-card-section><h3>Create project</h3><p>Deploy your new project in one click.</p></q-card-section><q-card-section><label>Name<q-input model-value="My project" outlined /></label></q-card-section><q-card-actions align="between"><q-btn outline no-caps label="Cancel" /><q-btn no-caps label="Deploy" /></q-card-actions></q-card></section>
    <section v-if="visible('table')" data-oracle="table"><h2>Table</h2><q-markup-table><caption>A list of your recent invoices.</caption><thead><tr><th>Invoice</th><th>Status</th><th>Method</th><th>Amount</th></tr></thead><tbody><tr v-for="invoice in invoices" :key="invoice.id"><td>{{ invoice.id }}</td><td>{{ invoice.status }}</td><td>{{ invoice.method }}</td><td>{{ invoice.amount }}</td></tr></tbody><tfoot><tr><td colspan="3">Total</td><td>$750.00</td></tr></tfoot></q-markup-table></section>
    <section v-if="visible('menu')" data-oracle="menu"><h2>Menu</h2><q-btn outline no-caps label="Open menu"><q-menu v-model="menu" data-oracle-popup="menu" style="min-width: 224px"><q-list><q-item-label header>My account</q-item-label><q-separator /><q-item clickable><q-item-section>Profile</q-item-section><q-item-section side>⇧⌘P</q-item-section></q-item><q-item disable><q-item-section>Billing</q-item-section></q-item><q-item><q-checkbox v-model="enabled" label="Show status bar" /></q-item><q-separator /><q-item><q-radio v-model="density" val="comfortable" label="Comfortable" /></q-item><q-item><q-radio v-model="density" val="compact" label="Compact" /></q-item><q-separator /><q-item clickable><q-item-section>Log out</q-item-section></q-item></q-list></q-menu></q-btn></section>
    <section v-if="visible('dialog')" data-oracle="dialog">
      <h2>Dialog</h2><q-btn outline no-caps label="Edit profile" @click="dialog = true" />
      <q-dialog v-model="dialog" aria-labelledby="qds-oracle-dialog-title">
        <q-card data-oracle-popup="dialog" style="width: 512px; max-width: calc(100vw - 32px)">
          <q-card-section>
            <div class="row items-start no-wrap"><h2 id="qds-oracle-dialog-title" class="q-dialog__title q-ma-none col">Edit profile</h2><q-btn flat dense round :icon="ppX" aria-label="Close profile" @click="dialog = false" /></div>
            <p class="q-dialog__message q-mb-none">Make changes to your profile here. Click save when you are done.</p>
          </q-card-section>
          <q-card-section><label>Name<q-input v-model="name" outlined /></label></q-card-section>
          <q-card-actions align="right"><q-btn outline no-caps label="Cancel" @click="dialog = false" /><q-btn no-caps label="Save changes" @click="dialog = false" /></q-card-actions>
        </q-card>
      </q-dialog>
    </section>
    <section v-if="visible('sidebar')" data-oracle="sidebar">
      <h2>Sidebar</h2>
      <q-card flat bordered data-case="provider" style="overflow: hidden">
        <q-layout container style="height: 320px">
          <q-drawer :model-value="true" :width="256" :breakpoint="0" show-if-above behavior="desktop">
            <q-list data-case="default" style="height: 100%; display: flex; flex-direction: column">
              <q-item-label header>Acme workspace</q-item-label><q-separator /><q-item-label header>Application</q-item-label>
              <q-item clickable active><q-item-section avatar><PhHouse :size="16" /></q-item-section><q-item-section>Home</q-item-section></q-item>
              <q-item clickable><q-item-section avatar><PhFolder :size="16" /></q-item-section><q-item-section>Projects</q-item-section><q-item-section side>12</q-item-section></q-item>
              <q-item disable><q-item-section avatar><PhGearSix :size="16" /></q-item-section><q-item-section>Settings</q-item-section></q-item>
              <q-space /><q-separator /><q-item dense><q-item-section><q-item-label caption>Alex Morgan</q-item-label></q-item-section></q-item>
            </q-list>
          </q-drawer>
          <q-page-container><q-page class="flex flex-center"><p class="qds-text-muted gt-xs">Workspace content</p></q-page></q-page-container>
        </q-layout>
      </q-card>
    </section>
  </section>
</template>
