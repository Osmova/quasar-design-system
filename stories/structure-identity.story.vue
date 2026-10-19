<script setup lang="ts">
import { PhCircle, PhUser } from '@phosphor-icons/vue'
import {
  QAvatar,
  QBadge,
  QBar,
  QHeader,
  QLayout,
  QPage,
  QPageContainer,
  QPageScroller,
  QBreadcrumbs,
  QBreadcrumbsEl,
  QCard,
  QCardSection,
  QChatMessage,
  QScrollArea,
  QSeparator,
  QSpace,
  QSplitter,
  QToolbar,
  QToolbarTitle,
} from 'quasar'
import { ref } from 'vue'
import {
  DESIGN_SYSTEM_VARIANTS,
  type DesignSystemMode,
  type DesignSystemVariantName,
} from '../src'
import StoryShell from './_shared/StoryShell.vue'

const modeOptions: DesignSystemMode[] = ['light', 'dark', 'system']
const variantOptions = Object.keys(DESIGN_SYSTEM_VARIANTS) as Array<Extract<DesignSystemVariantName, string>>
const initState = () => ({ mode: 'light' as DesignSystemMode, variant: 'fluent' as DesignSystemVariantName })

const splitter = ref(38)
</script>

<template>
  <Story title="Design System / Structure &amp; Identity" :layout="{ type: 'single', iframe: true }" :init-state="initState">
    <Variant title="Chrome, identity and grouped structure">
      <template #default="{ state }">
        <StoryShell
          title="Structure &amp; identity"
          description="Window chrome, identity marks, wayfinding and the containers that group them."
          :mode="state.mode"
          :variant="state.variant"
        >
          <section class="qds-story-section">
            <h2>QAvatar</h2>
            <div class="qds-story-row">
              <QAvatar color="primary" text-color="white">BV</QAvatar>
              <QAvatar color="accent" text-color="white" size="48px" font-size="20px">QD</QAvatar>
              <QAvatar rounded color="secondary" text-color="white">R</QAvatar>
              <QAvatar square color="positive" text-color="white">S</QAvatar>
              <QAvatar color="info" text-color="white"><PhUser :size="18" weight="duotone" /></QAvatar>
            </div>
          </section>

          <section class="qds-story-section">
            <h2>QBar &amp; QToolbar</h2>
            <QCard>
              <QBar>
                <PhCircle :size="14" weight="duotone" />
                <div>Design review</div>
                <QSpace />
                <QBadge color="primary">draft</QBadge>
              </QBar>
              <QToolbar>
                <QToolbarTitle>Workspace settings</QToolbarTitle>
                <QBadge color="positive">saved</QBadge>
              </QToolbar>
              <QSeparator />
              <QCardSection>Chrome sits above content without borrowing its surface.</QCardSection>
            </QCard>
          </section>

          <section class="qds-story-section">
            <h2>QBreadcrumbs</h2>
            <QBreadcrumbs>
              <QBreadcrumbsEl label="Workspace" />
              <QBreadcrumbsEl label="Projects" />
              <QBreadcrumbsEl label="Design system" />
              <QBreadcrumbsEl label="Tokens" />
            </QBreadcrumbs>
            <QBreadcrumbs separator="/" active-color="accent" class="qds-story-spaced">
              <QBreadcrumbsEl label="Root" />
              <QBreadcrumbsEl label="Current" />
            </QBreadcrumbs>
          </section>

          <section class="qds-story-section">
            <h2>QSplitter</h2>
            <QSplitter v-model="splitter" style="height: 200px">
              <template #before>
                <div class="qds-story-pane">Before pane ({{ Math.round(splitter) }}%)</div>
              </template>
              <template #after>
                <div class="qds-story-pane">After pane</div>
              </template>
            </QSplitter>
          </section>

          <section class="qds-story-section">
            <h2>QScrollArea</h2>
            <QScrollArea style="height: 160px; max-width: 420px">
              <div v-for="index in 20" :key="index" class="qds-story-pane">Scrollable row {{ index }}</div>
            </QScrollArea>
          </section>

          <section class="qds-story-section">
            <h2>QLayout, QHeader &amp; QPageScroller</h2>
            <QLayout view="hHh lpR fFf" container style="height: 220px">
              <QHeader>
                <QToolbar>
                  <QToolbarTitle>Contained layout header</QToolbarTitle>
                </QToolbar>
              </QHeader>
              <QPageContainer>
                <QPage>
                  <div v-for="index in 12" :key="index" class="qds-story-pane">Scroll row {{ index }}</div>
                  <QPageScroller position="bottom-right" :offset="[12, 12]" :scroll-offset="60">
                    <QAvatar color="primary" text-color="white" size="36px">&#8593;</QAvatar>
                  </QPageScroller>
                </QPage>
              </QPageContainer>
            </QLayout>
          </section>

          <section class="qds-story-section">
            <h2>QChatMessage</h2>
            <QChatMessage name="Design" avatar="" :text="['Tokens are the contract.']" />
            <QChatMessage name="Engineering" :text="['Components read them, never a second copy.']" sent bg-color="primary" text-color="white" />
            <QChatMessage name="Design" :text="['Agreed.']" stamp="just now" />
          </section>
        </StoryShell>
      </template>

      <template #controls="{ state }">
        <HstSelect v-model="state.mode" title="Mode" :options="modeOptions" />
        <HstSelect v-model="state.variant" title="Variant" :options="variantOptions" />
      </template>
    </Variant>
  </Story>
</template>
