<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import {
  ppPlus,
  ppTrash,
  ppCloudArrowUp,
  ppArrowsOut,
  ppPlay,
  ppArrowLeft,
  ppArrowRight,
  ppArrowUp,
  ppArrowDown,
  ppPalette,
  ppSliders,
  ppWarning,
  ppCheckCircle,
  ppTextAa,
  ppAlignLeft,
} from 'quasar-extras-svg-icons/phosphor-icons-v2'

type UploaderProbe = {
  addFiles: (files: File[]) => void
  files: File[]
  updateFileStatus: (file: File, status: 'idle' | 'uploading' | 'failed' | 'uploaded', uploadedSize?: number) => void
}

const step = ref(2)
const horizontalStep = ref(2)
const compactStep = ref(1)
const verticalStep = ref(2)
const carouselSlide = ref('ink')
const verticalCarouselSlide = ref('first')
const carouselFullscreen = ref(false)
const splitter = ref(42)
const knob = ref(64)
const editor = ref('<p><strong>Token notes</strong> stay local to the gallery.</p>')
const readonlyEditor = ref('<p>Read-only content remains tokenized.</p>')
const uploader = ref<UploaderProbe | null>(null)
const $q = useQuasar()

const virtualItems = Array.from({ length: 18 }, (_, index) => `Virtual row ${index + 1}`)
const infiniteItems = ['Loaded block 1', 'Loaded block 2', 'Loaded block 3']
const uploadFactory = () => Promise.resolve({ url: '' })
const editorToolbar = [
  ['bold', 'italic', 'underline'],
  [
    {
      label: 'Format',
      icon: ppTextAa,
      list: 'no-icons',
      options: ['p', 'h5', 'h6', 'code'],
    },
    {
      label: 'Align',
      icon: ppAlignLeft,
      fixedLabel: true,
      options: ['left', 'center', 'right', 'justify'],
    },
  ],
  ['quote', 'unordered', 'ordered'],
  ['fullscreen'],
]

function makeProbeFile(name: string, size: number, type = 'text/plain'): File {
  return new File([new Uint8Array(size).fill(65)], name, { type, lastModified: 86 })
}

onMounted(async () => {
  await nextTick()

  uploader.value?.addFiles([
    makeProbeFile('media-queued.txt', 128),
    makeProbeFile('media-progress.bin', 512, 'application/octet-stream'),
    makeProbeFile('media-error.txt', 96),
    makeProbeFile('media-uploaded.txt', 192),
  ])

  await nextTick()

  const files = uploader.value?.files ?? []
  if (files[1]) uploader.value?.updateFileStatus(files[1], 'uploading', Math.round(files[1].size * 0.58))
  if (files[2]) uploader.value?.updateFileStatus(files[2], 'failed')
  if (files[3]) uploader.value?.updateFileStatus(files[3], 'uploaded')
})

function svgData(svg: string): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

function mediaSvg(title: string, subtitle: string, from: string, via: string, to: string): string {
  return svgData(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540" role="img" aria-label="${title}">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop stop-color="${from}"/>
          <stop offset=".54" stop-color="${via}"/>
          <stop offset="1" stop-color="${to}"/>
        </linearGradient>
        <radialGradient id="orb" cx="50%" cy="50%" r="50%">
          <stop stop-color="white" stop-opacity=".42"/>
          <stop offset="1" stop-color="white" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="960" height="540" rx="52" fill="url(#g)"/>
      <path d="M0 414 C180 318 290 494 470 386 S735 260 960 350 V540 H0 Z" fill="white" fill-opacity=".16"/>
      <circle cx="744" cy="132" r="156" fill="url(#orb)"/>
      <circle cx="202" cy="392" r="194" fill="url(#orb)"/>
      <rect x="64" y="66" width="420" height="162" rx="32" fill="black" fill-opacity=".18"/>
      <text x="96" y="132" font-family="Inter, Arial, sans-serif" font-size="54" font-weight="750" fill="white">${title}</text>
      <text x="98" y="184" font-family="Inter, Arial, sans-serif" font-size="28" fill="white" fill-opacity=".86">${subtitle}</text>
    </svg>
  `)
}

function avatarSvg(initials: string, fill: string): string {
  return svgData(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img" aria-label="${initials} avatar">
      <rect width="96" height="96" rx="48" fill="${fill}"/>
      <text x="48" y="63" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="42" font-weight="700" fill="white">${initials}</text>
    </svg>
  `)
}

const visualImage = mediaSvg('QDS Gallery', 'Static media surface', '#6366f1', '#06b6d4', '#f59e0b')
const loadingImageSrc = '/qds-media-loading.svg'
const errorImageSrc = '/qds-media-error.svg'
const carouselSlides = [
  {
    name: 'ink',
    title: 'Editorial surface',
    caption: 'Paper-neutral surface with pastel role washes and charcoal type.',
    src: mediaSvg('Ink', 'Editorial pastel roles', '#5f6f52', '#a98255', '#6366f1'),
  },
  {
    name: 'one',
    title: 'One radius',
    caption: 'Large rounded frames with deterministic artwork.',
    src: mediaSvg('One', 'One UI inspired spacing', '#0f6cbd', '#14b8a6', '#ffb020'),
  },
  {
    name: 'fluent',
    title: 'Fluent contrast',
    caption: 'Readable captions over owned gradient surfaces.',
    src: mediaSvg('Fluent', 'Primary QDS tone', '#0f6cbd', '#2563eb', '#8b5cf6'),
  },
]
const chatAvatars = {
  designer: avatarSvg('DS', '#0f6cbd'),
  reviewer: avatarSvg('RV', '#616161'),
}
const videoSrc = `data:text/html;charset=utf-8,${encodeURIComponent(`
  <!doctype html>
  <html lang="en">
    <body style="margin:0;min-height:100vh;display:grid;place-items:center;background:linear-gradient(135deg,#111827,#312e81,#0891b2);font-family:Inter,Arial,sans-serif;color:white;">
      <div style="text-align:center;padding:4vw;">
        <div style="font-size:clamp(10px,3.5vw,13px);letter-spacing:.16em;text-transform:uppercase;opacity:.72;">QVideo</div>
        <div style="margin-top:1vw;font-size:clamp(16px,6vw,28px);font-weight:700;">Static embed preview</div>
        <div style="margin-top:1vw;font-size:clamp(11px,3.8vw,15px);opacity:.76;">Local iframe content keeps the gallery deterministic.</div>
      </div>
    </body>
  </html>
`)}`

function refresh(done: () => void): void {
  window.setTimeout(done, 250)
}

function selectCarouselSlide(name: string): void {
  carouselSlide.value = name
}

function moveCarousel(direction: -1 | 1): void {
  const index = carouselSlides.findIndex(slide => slide.name === carouselSlide.value)
  carouselSlide.value = carouselSlides[(index + direction + carouselSlides.length) % carouselSlides.length].name
}

type ComplexMediaTestHook = {
  getRtl: () => boolean
  setRtl: (rtl: boolean) => boolean
}

const complexMediaTestHook: ComplexMediaTestHook = {
  getRtl: () => $q.lang.rtl,
  setRtl: (rtl) => {
    $q.lang.set({ ...$q.lang, rtl })
    return $q.lang.rtl
  },
}

onMounted(() => {
  ;(window as Window & { __qdsComplexMedia?: ComplexMediaTestHook }).__qdsComplexMedia = complexMediaTestHook
})

onBeforeUnmount(() => {
  delete (window as Window & { __qdsComplexMedia?: ComplexMediaTestHook }).__qdsComplexMedia
})
</script>

<template>
  <q-card class="catalog-card q-pa-lg">
    <div class="text-h6 qds-display q-mb-md">Flows, timelines &amp; rich content</div>
    <div class="catalog-grid catalog-grid--two">
      <div class="catalog-demo">
        <div class="catalog-label">QStepper</div>
        <q-stepper
          v-model="step"
          flat
          bordered
          animated
          vertical
          header-nav
          color="primary"
          done-color="positive"
          error-color="negative"
          data-test="qds-stepper"
        >
          <q-step :name="1" title="Tokens" caption="Done" :icon="ppPalette" done>
            Token aliases and semantic CSS variables are ready.
          </q-step>

          <q-step :name="2" title="Components" caption="Editable active step" :icon="ppSliders">
            Exercise Quasar surfaces with a visible vertical rail and navigation slot.
            <q-stepper-navigation data-test="qds-stepper-nav">
              <q-btn color="primary" unelevated no-caps label="Continue" />
              <q-btn flat no-caps label="Back" class="q-ml-sm" />
            </q-stepper-navigation>
          </q-step>

          <q-step :name="3" title="Native parity" caption="Error proof" :icon="ppWarning" error>
            Error styling stays tokenized without changing stepper logic.
          </q-step>

          <q-step :name="4" title="Release note" caption="Done" :icon="ppCheckCircle" done>
            Completed state verifies the positive rail and marker treatment.
          </q-step>
        </q-stepper>
      </div>

      <div class="catalog-demo">
        <div class="catalog-label">QTimeline</div>
        <q-timeline color="primary" layout="comfortable" data-test="qds-timeline">
          <q-timeline-entry title="Baseline" subtitle="Left alignment" side="left" :icon="ppPalette">
            Theme variables are loaded.
          </q-timeline-entry>
          <q-timeline-entry title="Catalog" subtitle="Right alignment" side="right" color="positive" :icon="ppCheckCircle">
            Comfortable entries retain readable rails and content.
          </q-timeline-entry>
        </q-timeline>
        <q-timeline color="primary" layout="dense" class="q-mt-md" data-test="qds-timeline-dense">
          <q-timeline-entry title="Dense proof" subtitle="Compact alignment" side="right" :icon="ppSliders">
            Dense timeline content remains locally deterministic.
          </q-timeline-entry>
        </q-timeline>
      </div>

      <div class="catalog-demo catalog-demo--wide">
        <div class="catalog-label">QStepper horizontal</div>
        <q-stepper
          v-model="horizontalStep"
          flat
          bordered
          header-nav
          color="primary"
          done-color="positive"
          error-color="negative"
          data-test="qds-stepper-horizontal"
        >
          <q-step :name="1" title="Queued" caption="Inactive" :icon="ppPalette">
            This marker remains neutral until the flow advances.
          </q-step>

          <q-step :name="2" title="Review" caption="Active" :icon="ppSliders">
            Horizontal rails expose the same role treatment as the vertical flow.
            <q-stepper-navigation data-test="qds-stepper-horizontal-nav">
              <q-btn color="primary" unelevated no-caps label="Approve" />
            </q-stepper-navigation>
          </q-step>

          <q-step :name="3" title="Published" caption="Done" :icon="ppCheckCircle" done>
            The finished marker retains its positive treatment.
          </q-step>

          <q-step :name="4" title="Resolve" caption="Error" :icon="ppWarning" error>
            Error state remains visible without changing the active step.
          </q-step>
        </q-stepper>
      </div>

      <div class="catalog-demo catalog-demo--wide">
        <div class="catalog-label">QStepper vertical flow</div>
        <q-stepper
          v-model="verticalStep"
          flat
          vertical
          animated
          color="primary"
          done-color="positive"
          data-test="qds-stepper-vertical"
        >
          <q-step :name="1" title="Choose a template" caption="Completed" :icon="ppPalette" done>
            A starter template seeds the workspace.
          </q-step>

          <q-step :name="2" title="Configure surfaces" caption="In progress" :icon="ppSliders">
            Pick the density and material for the new workspace.
            <q-stepper-navigation data-test="qds-stepper-vertical-nav">
              <q-btn color="primary" unelevated no-caps label="Continue" @click="verticalStep = 3" />
              <q-btn flat no-caps label="Back" class="q-ml-sm" @click="verticalStep = 1" />
            </q-stepper-navigation>
          </q-step>

          <q-step :name="3" title="Publish" caption="Pending" :icon="ppCheckCircle">
            Publishing makes the workspace visible to collaborators.
            <q-stepper-navigation>
              <q-btn color="primary" unelevated no-caps label="Finish" />
              <q-btn flat no-caps label="Back" class="q-ml-sm" @click="verticalStep = 2" />
            </q-stepper-navigation>
          </q-step>
        </q-stepper>
      </div>

      <div class="catalog-demo catalog-demo--wide">
        <div class="catalog-label">QStepper contracted dark prefix proof</div>
        <q-stepper v-model="compactStep" dark contracted header-nav active-icon="none" done-icon="none" error-icon="none" data-test="qds-stepper-compact">
          <q-step :name="1" prefix="1" title="Draft">Compact active prefix.</q-step>
          <q-step :name="2" prefix="2" title="Review" done>Compact done prefix.</q-step>
          <q-step :name="3" prefix="3" title="Resolve" error>Compact error prefix.</q-step>
        </q-stepper>
      </div>

      <div class="catalog-demo catalog-demo--wide">
        <div class="catalog-label">QChatMessage</div>
        <q-chat-message
          data-test="qds-chat-sent"
          name="Designer"
          :avatar="chatAvatars.designer"
          stamp="10:24"
          :text="['Does the surface keep QDS radius, tail color, and readable contrast?']"
          sent
        />
        <q-chat-message
          data-test="qds-chat-received"
          name="Reviewer"
          :avatar="chatAvatars.reviewer"
          stamp="10:25"
          :text="['Yes — both bubbles use tokenized surfaces and deterministic avatars.']"
        />
      </div>
    </div>
  </q-card>

  <q-card class="catalog-card q-pa-lg">
    <div class="text-h6 qds-display q-mb-md">Media</div>
    <div class="catalog-grid catalog-grid--two">
      <div class="catalog-demo">
        <div class="catalog-label">QCarousel + QImg</div>
        <q-img :src="visualImage" alt="QDS gallery static media surface" ratio="16/9" class="catalog-image q-mb-md">
          <div class="absolute-bottom catalog-media-caption">Standalone image surface</div>
        </q-img>
        <div class="catalog-label q-mt-md">QImg state proof</div>
        <div class="catalog-grid catalog-grid--two">
          <div class="catalog-img-proof">
            <q-img :src="loadingImageSrc" alt="Loading media preview" loading="eager" :ratio="16 / 9" class="catalog-image" data-test="qds-img-loading">
              <template #loading><div class="column flex-center q-gutter-xs" data-test="qds-img-loading-state"><q-spinner color="primary" size="1.5rem" /><span>Loading preview</span></div></template>
            </q-img>
          </div>
          <div class="catalog-img-proof">
            <q-img :src="errorImageSrc" alt="Unavailable media preview" loading="eager" :ratio="16 / 9" class="catalog-image" data-test="qds-img-error">
              <template #error><div class="column flex-center q-gutter-xs" data-test="qds-img-error-state"><q-icon :name="ppWarning" size="1.5rem" /><span>Preview unavailable</span></div></template>
            </q-img>
          </div>
        </div>
        <q-carousel
          v-model="carouselSlide"
          animated
          swipeable
          infinite
          v-model:fullscreen="carouselFullscreen"
          padding
          height="280px"
          class="catalog-media"
          data-test="qds-carousel"
        >
          <template #control>
            <q-carousel-control position="top-right" :offset="[12, 12]">
              <div class="catalog-carousel-controls" data-test="qds-carousel-controls">
                <q-btn dense round unelevated aria-label="Previous carousel slide" data-test="qds-carousel-previous" @click="moveCarousel(-1)"><q-icon :name="ppArrowLeft" /></q-btn>
                <q-btn v-for="slide in carouselSlides" :key="slide.name" dense round unelevated :aria-label="`Show ${slide.title}`" :aria-current="carouselSlide === slide.name ? 'true' : undefined" :aria-pressed="carouselSlide === slide.name" :data-test="`qds-carousel-nav-${slide.name}`" @click="selectCarouselSlide(slide.name)"><q-icon :name="ppPlay" /></q-btn>
                <q-btn dense round unelevated aria-label="Next carousel slide" data-test="qds-carousel-next" @click="moveCarousel(1)"><q-icon :name="ppArrowRight" /></q-btn>
                <q-btn
                  dense
                  round
                  unelevated
                  color="white"
                  text-color="dark"
                  aria-label="Toggle carousel fullscreen"
                  data-test="qds-carousel-fullscreen"
                  @click="carouselFullscreen = !carouselFullscreen"
                >
                  <q-icon :name="ppArrowsOut" />
                </q-btn>
              </div>
            </q-carousel-control>
          </template>

          <q-carousel-slide
            v-for="slide in carouselSlides"
            :key="slide.name"
            :name="slide.name"
            :img-src="slide.src"
            class="catalog-carousel-slide q-pa-none"
          >
            <q-img :src="slide.src" :alt="`${slide.title}: ${slide.caption}`" class="catalog-carousel-image" fit="cover" no-spinner>
              <div class="absolute-bottom catalog-media-caption">
                <div class="text-subtitle2 text-weight-bold">{{ slide.title }}</div>
                <div class="text-caption">{{ slide.caption }}</div>
              </div>
            </q-img>
          </q-carousel-slide>
        </q-carousel>
        <div class="catalog-label q-mt-md">QCarousel vertical control proof</div>
        <q-carousel v-model="verticalCarouselSlide" vertical padding control-type="outline" height="180px" class="catalog-media" data-test="qds-carousel-vertical">
          <q-carousel-slide name="first" class="catalog-vertical-slide">Vertical first panel</q-carousel-slide>
          <q-carousel-slide name="second" class="catalog-vertical-slide">Vertical second panel</q-carousel-slide>
          <template #control>
            <q-carousel-control position="left" :offset="[8, 8]"><div class="catalog-carousel-controls"><q-btn dense round outline aria-label="Show first vertical panel" :aria-current="verticalCarouselSlide === 'first' ? 'true' : undefined" @click="verticalCarouselSlide = 'first'"><q-icon :name="ppArrowUp" /></q-btn><q-btn dense round outline aria-label="Show second vertical panel" :aria-current="verticalCarouselSlide === 'second' ? 'true' : undefined" @click="verticalCarouselSlide = 'second'"><q-icon :name="ppArrowDown" /></q-btn></div></q-carousel-control>
          </template>
        </q-carousel>
      </div>

      <div class="catalog-demo">
        <div class="catalog-label">QParallax</div>
        <q-parallax :src="visualImage" :height="220">
          <div class="catalog-parallax-caption text-white text-h5 qds-display" data-test="qds-parallax-caption">Parallax surface</div>
        </q-parallax>
      </div>

      <div class="catalog-demo catalog-demo--wide">
        <div class="catalog-label">QVideo</div>
        <div class="catalog-video"><q-video :src="videoSrc" :ratio="16 / 9" data-test="qds-video" /></div>
      </div>
    </div>
  </q-card>

  <q-card class="catalog-card q-pa-lg">
    <div class="text-h6 qds-display q-mb-md">Scrolling, split layouts &amp; gestures</div>
    <div class="catalog-grid catalog-grid--two">
      <div class="catalog-demo">
        <div class="catalog-label">QScrollArea</div>
        <q-scroll-area style="height: 180px" class="catalog-scroll-box" data-test="qds-scroll-area">
          <div v-for="item in virtualItems" :key="`scroll-${item}`" class="q-pa-sm">{{ item }}</div>
        </q-scroll-area>
      </div>

      <div class="catalog-demo">
        <div class="catalog-label">QSplitter</div>
        <q-splitter v-model="splitter" style="height: 180px" class="catalog-splitter" data-test="qds-splitter">
          <template #before><div class="q-pa-md">Navigation</div></template>
          <template #after><div class="q-pa-md qds-text-muted">Preview content</div></template>
        </q-splitter>
      </div>

      <div class="catalog-demo">
        <div class="catalog-label">QSlideItem</div>
        <q-slide-item left-color="positive" right-color="negative" data-test="qds-slide-item">
          <template #left>Archive</template>
          <template #right>Delete</template>
          <q-item>
            <q-item-section>Slide me to reveal actions</q-item-section>
          </q-item>
        </q-slide-item>
      </div>

      <div class="catalog-demo">
        <div class="catalog-label">QPullToRefresh</div>
        <q-pull-to-refresh data-test="qds-pull-to-refresh" @refresh="refresh">
          <div class="catalog-pull-box">Pull area with a safe local refresh callback.</div>
        </q-pull-to-refresh>
      </div>

      <div class="catalog-demo">
        <div class="catalog-label">QKnob</div>
        <q-knob
          v-model="knob"
          show-value
          size="96px"
          :thickness="0.18"
          color="primary"
          track-color="grey-3"
          data-test="qds-knob"
        />
      </div>

      <div class="catalog-demo">
        <div class="catalog-label">QInfiniteScroll</div>
        <q-infinite-scroll disable :offset="120" data-test="qds-infinite-scroll">
          <q-item v-for="item in infiniteItems" :key="item" dense>
            <q-item-section>{{ item }}</q-item-section>
          </q-item>
          <template #loading>
            <div class="row justify-center q-my-md"><q-spinner color="primary" /></div>
          </template>
        </q-infinite-scroll>
      </div>
    </div>
  </q-card>

  <q-card class="catalog-card q-pa-lg">
    <div class="text-h6 qds-display q-mb-md">Rich text &amp; safe upload shell</div>
    <div class="catalog-grid catalog-grid--two">
      <div class="catalog-demo">
        <div class="catalog-label">QEditor</div>
        <!-- Root class hook: Quasar 2.25+ routes $attrs to QEditor's content node and teleports
             the .q-editor root (which keeps `class`, the frame, and the `fullscreen` modifier)
             when full-screen, so root-geometry proofs anchor here while data-test lands on content. -->
        <q-editor v-model="editor" min-height="8rem" :toolbar="editorToolbar" class="qds-editor-proof" data-test="qds-editor" />
        <div class="catalog-label q-mt-md">QEditor read-only</div>
        <q-editor v-model="readonlyEditor" readonly min-height="5rem" :toolbar="[]" class="qds-editor-proof-readonly" data-test="qds-editor-readonly" />
      </div>

      <div class="catalog-demo">
        <div class="catalog-label">QUploader</div>
        <q-uploader
          ref="uploader"
          label="Uploader state proof"
          class="full-width"
          data-test="qds-uploader"
          :factory="uploadFactory"
          :auto-upload="false"
          multiple
          no-thumbnails
          hide-upload-btn
        >
          <template #header="scope">
            <div class="catalog-uploader-header">
              <q-uploader-add-trigger />
              <div>
                <div class="text-weight-semibold">Uploader state proof</div>
                <div class="text-caption qds-text-muted">Queued, progress, failed, uploaded, remove, and local-only upload affordances.</div>
              </div>
              <q-space />
              <q-btn dense round flat aria-label="Add local files" data-test="qds-uploader-add">
                <q-icon :name="ppPlus" />
              </q-btn>
              <q-btn
                dense
                round
                flat
                aria-label="Local upload intentionally disabled"
                data-test="qds-uploader-upload"
                :disable="scope.files.length === 0"
                @click.stop.prevent
              >
                <q-icon :name="ppCloudArrowUp" />
              </q-btn>
              <q-btn
                dense
                round
                flat
                aria-label="Remove queued files"
                data-test="qds-uploader-clear"
                :disable="scope.files.length === 0"
                @click="scope.removeQueuedFiles"
              >
                <q-icon :name="ppTrash" />
              </q-btn>
            </div>
          </template>
        </q-uploader>

        <q-uploader
          disable
          label="Disabled upload shell"
          class="full-width q-mt-md"
          data-test="qds-uploader-disabled"
          :factory="uploadFactory"
          :auto-upload="false"
          no-thumbnails
          hide-upload-btn
        />
      </div>
    </div>
  </q-card>
</template>

<style scoped>
.catalog-parallax-caption {
  padding: var(--qds-space-sm) var(--qds-space-md);
  border-radius: var(--qds-radius-control);
  background: var(--qds-media-scrim-strong);
}

.catalog-carousel-controls,
.catalog-uploader-header {
  display: flex;
  align-items: center;
  gap: var(--qds-space-sm);
}

.catalog-carousel-controls {
  padding: var(--qds-space-2xs, 0.125rem);
  border-radius: var(--qds-radius-full);
}

.catalog-uploader-header {
  position: relative;
  min-height: 4.75rem;
  padding: var(--qds-space-md);
  color: var(--qds-text-strong);
  background: color-mix(in srgb, var(--qds-surface-1) 86%, var(--qds-color-primary) 6%);
  border-bottom: var(--qds-border-width-control) solid var(--qds-separator-color);
}

.catalog-vertical-slide {
  padding: var(--qds-space-md);
  padding-left: 5rem;
}

.catalog-img-proof {
  position: relative;
  width: min(100%, 32rem);
}

</style>
