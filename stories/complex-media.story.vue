<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import {
  QBtn,
  QCarousel,
  QCarouselControl,
  QCarouselSlide,
  QCard,
  QEditor,
  QImg,
  QRating,
  QSpinner,
  QStep,
  QStepper,
  QStepperNavigation,
  QTimeline,
  QTimelineEntry,
  QUploader,
  QUploaderAddTrigger,
  Loading,
  Notify,
} from 'quasar'
import {
  ppArrowLeft,
  ppArrowRight,
  ppCheckCircle,
  ppFileText,
  ppImageSquare,
  ppPalette,
  ppStar,
  ppStarHalfFill,
  ppWarning,
} from 'quasar-extras-svg-icons/phosphor-icons-v2'
import { PhBellRinging, PhCloudArrowUp, PhFloppyDisk, PhImageSquare, PhWarning } from '@phosphor-icons/vue'
import {
  DESIGN_SYSTEM_VARIANTS,
  type DesignSystemMode,
  type DesignSystemVariantName,
} from '../src'
import StoryShell from './_shared/StoryShell.vue'

const modeOptions: DesignSystemMode[] = ['light', 'dark', 'system']
const variantOptions = Object.keys(DESIGN_SYSTEM_VARIANTS) as Array<Extract<DesignSystemVariantName, string>>
const activeStep = ref(2)
const editableRating = ref(3.5)
const editorContent = ref('<p><strong>Release note</strong> — visual content stays local to this isolated preview.</p>')
const readonlyEditorContent = ref('<p>Read-only content retains the same framed editor surface.</p>')
const carouselSlide = ref('baseline')
let dismissNotification: (() => void) | undefined
let loadingTimer: ReturnType<typeof setTimeout> | undefined

interface ComplexMediaStoryState {
  mode: DesignSystemMode
  variant: DesignSystemVariantName
}

const initState = (): ComplexMediaStoryState => ({ mode: 'light', variant: 'fluent' })

function svgData(svg: string): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

const artwork = svgData(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540" role="img" aria-label="Local abstract design-system artwork">
    <defs>
      <linearGradient id="qds-media" x1="0" x2="1" y1="0" y2="1">
        <stop stop-color="#0f6cbd"/><stop offset=".52" stop-color="#2563eb"/><stop offset="1" stop-color="#8b5cf6"/>
      </linearGradient>
    </defs>
    <rect width="960" height="540" rx="48" fill="url(#qds-media)"/>
    <circle cx="758" cy="130" r="180" fill="#fff" fill-opacity=".18"/>
    <path d="M0 408c142-102 284 94 452-20s330-164 508-54v206H0Z" fill="#fff" fill-opacity=".16"/>
  </svg>
`)
const invalidArtwork = 'data:image/png;base64,AAAA'
const carouselSlides = [
  {
    name: 'baseline',
    title: 'Baseline',
    caption: 'Default slide with local artwork.',
    src: svgData('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540"><rect width="960" height="540" rx="48" fill="#2563eb"/><circle cx="690" cy="152" r="186" fill="#bfdbfe" fill-opacity=".3"/><path d="M0 410c180-122 336 92 552-16s260-20 408-72v218H0Z" fill="#fff" fill-opacity=".16"/></svg>'),
  },
  {
    name: 'review',
    title: 'Review',
    caption: 'Navigation remains local and reversible.',
    src: svgData('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540"><rect width="960" height="540" rx="48" fill="#0f766e"/><circle cx="240" cy="150" r="180" fill="#99f6e4" fill-opacity=".32"/><path d="M0 430C220 260 430 570 960 260v280H0Z" fill="#fff" fill-opacity=".18"/></svg>'),
  },
  {
    name: 'release',
    title: 'Release',
    caption: 'A distinct completion-state surface.',
    src: svgData('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540"><rect width="960" height="540" rx="48" fill="#7c3aed"/><circle cx="700" cy="162" r="210" fill="#fde68a" fill-opacity=".28"/><path d="M0 360c184 112 352-86 570 16s262 18 390-28v192H0Z" fill="#fff" fill-opacity=".18"/></svg>'),
  },
]

function showNotification(): void {
  dismissNotification?.()
  dismissNotification = Notify.create({
    type: 'positive',
    message: 'Media proof ready',
    caption: 'This notification is safe to dismiss or reopen.',
    timeout: 3500,
    actions: [{ label: 'Dismiss', color: 'white', handler: () => dismissNotification?.() }],
  })
}

function showLoading(): void {
  if (loadingTimer) clearTimeout(loadingTimer)

  Loading.show({ message: 'Preparing local preview…', spinnerColor: 'primary' })
  loadingTimer = setTimeout(hideLoading, 1600)
}

function hideLoading(): void {
  if (loadingTimer) clearTimeout(loadingTimer)
  loadingTimer = undefined
  Loading.hide()
}

function moveToStep(step: number): void {
  activeStep.value = step
}

function focusEditor(): void {
  document.querySelector<HTMLElement>('[data-test="qds-story-editor"] .q-editor__content')?.focus()
}

const ratingIconAriaLabels: string[] = ['1 star', '2 stars', '3 stars', '4 stars', '5 stars']

function wrapCarouselSlide(direction: -1 | 1): string {
  const currentIndex = carouselSlides.findIndex(s => s.name === carouselSlide.value)
  const nextIndex = (currentIndex + direction + carouselSlides.length) % carouselSlides.length
  return carouselSlides[nextIndex].name
}

onBeforeUnmount(() => {
  dismissNotification?.()
  hideLoading()
})
</script>

<template>
  <Story title="Design System / Complex & Media" :layout="{ type: 'single', iframe: true }" :init-state="initState">
    <Variant title="Stepper, media, ratings, plugins and rich-content shells">
      <template #default="{ state }">
        <StoryShell
          title="Complex & media states"
          description="Representative local parity proofs for flow, media, and rich-content states—not an exhaustive gallery fixture."
          :mode="state.mode"
          :variant="state.variant"
        >
          <div class="qds-story-stack qds-story-stack--relaxed">
            <QCard class="qds-story-panel q-pa-lg">
              <div class="row items-center q-col-gutter-md q-mb-md">
                <div class="col">
                  <div class="text-overline qds-text-muted">QStepper · horizontal</div>
                  <div class="text-h6 qds-story-title">Workflow state rail</div>
                </div>
                <div class="col-auto qds-text-muted text-caption">Inactive · active · done · error</div>
              </div>
              <div class="qds-story-stepper-wrap">
                <QStepper
                  v-model="activeStep"
                  flat
                  bordered
                  header-nav
                  color="primary"
                  done-color="positive"
                  error-color="negative"
                  class="qds-story-stepper"
                  data-test="qds-story-horizontal-stepper"
                >
                  <QStep :name="1" title="Queued" caption="Inactive" :icon="ppPalette">
                    A neutral first marker stays available through header navigation.
                  </QStep>
                  <QStep :name="2" title="Review" caption="Active" :icon="ppFileText">
                    <div class="qds-text-muted">Current content region with recoverable navigation controls.</div>
                    <QStepperNavigation class="q-mt-md" data-test="qds-story-stepper-navigation">
                      <QBtn color="primary" unelevated no-caps label="Approve" @click="moveToStep(3)">
                        <PhFloppyDisk :size="18" weight="regular" />
                      </QBtn>
                      <QBtn flat color="primary" no-caps label="Back" class="q-ml-sm" @click="moveToStep(1)" />
                    </QStepperNavigation>
                  </QStep>
                  <QStep :name="3" title="Published" caption="Done" :icon="ppCheckCircle" done>
                    Completed state preserves the positive marker and rail treatment.
                  </QStep>
                  <QStep :name="4" title="Resolve" caption="Error" :icon="ppWarning" error>
                    Error state is isolated from any asynchronous workflow.
                  </QStep>
                </QStepper>
              </div>
            </QCard>

            <div class="row q-col-gutter-lg">
              <div class="col-12 col-md-7">
                <QCard class="qds-story-panel q-pa-lg full-height">
                  <div class="row items-center q-col-gutter-md q-mb-md">
                    <div class="col">
                      <div class="text-overline qds-text-muted">QImg · local data sources</div>
                      <div class="text-h6 qds-story-title">Owned media placeholders</div>
                    </div>
                    <PhImageSquare class="col-auto" :size="26" weight="duotone" />
                  </div>
                  <QImg
                    :src="artwork"
                    alt="Abstract blue and violet design-system artwork"
                    :ratio="16 / 9"
                    no-spinner
                    class="qds-story-artwork"
                    data-test="qds-story-image"
                  >
                    <div class="absolute-bottom qds-story-media-caption">
                      <div class="text-weight-medium">Local data-image surface</div>
                      <div class="text-caption">Intentional caption overlay with no remote dependency.</div>
                    </div>
                  </QImg>
                  <div class="row q-col-gutter-md q-mt-sm">
                    <div class="col-12 col-sm-6">
                      <div class="qds-story-image-proof">
                        <QImg :src="artwork" alt="Local artwork loading preview" :ratio="16 / 9" data-test="qds-story-image-loading">
                          <template #loading>
                            <div class="qds-story-image-slot column flex-center q-gutter-xs">
                              <QSpinner color="primary" size="1.5rem" />
                              <span class="text-caption">Loading preview</span>
                            </div>
                          </template>
                        </QImg>
                        <p class="text-caption qds-text-muted q-mt-xs q-mb-none">Native <code>#loading</code> slot proof; data URIs resolve instantly so the state is transient here.</p>
                      </div>
                    </div>
                    <div class="col-12 col-sm-6">
                      <div class="qds-story-image-proof">
                        <QImg :src="invalidArtwork" alt="Unavailable local artwork preview" :ratio="16 / 9" data-test="qds-story-image-error">
                          <template #error>
                            <div class="qds-story-image-slot qds-story-image-slot--error column flex-center q-gutter-xs">
                              <PhWarning :size="25" weight="duotone" />
                              <span class="text-caption">Preview unavailable</span>
                            </div>
                          </template>
                        </QImg>
                        <p class="text-caption qds-text-muted q-mt-xs q-mb-none">Native <code>#error</code> slot; the invalid data URI fails deterministically without a request hook.</p>
                      </div>
                    </div>
                  </div>
                </QCard>
              </div>

              <div class="col-12 col-md-5">
                <QCard class="qds-story-panel q-pa-lg full-height">
                  <div class="text-overline qds-text-muted">QRating</div>
                  <div class="text-h6 qds-story-title q-mb-lg">Rating states</div>
                  <div class="qds-story-rating-row">
                    <span>Editable half</span>
                    <QRating v-model="editableRating" aria-label="Editable rating" :icon-aria-label="ratingIconAriaLabels" :max="5" :icon="ppStar" :icon-half="ppStarHalfFill" color="primary" size="2rem" />
                  </div>
                  <div class="qds-story-rating-row">
                    <span>Read-only</span>
                    <QRating :model-value="4" aria-label="Read-only rating, four of five" :icon-aria-label="ratingIconAriaLabels" readonly :max="5" :icon="ppStar" color="positive" size="2rem" />
                  </div>
                  <div class="qds-story-rating-row">
                    <span>Disabled</span>
                    <QRating :model-value="2" aria-label="Disabled rating, two of five" :icon-aria-label="ratingIconAriaLabels" disable :max="5" :icon="ppStar" color="primary" size="2rem" />
                  </div>
                  <p class="qds-text-muted q-mt-lg q-mb-none">The editable proof starts at {{ editableRating }} stars; read-only and disabled states remain deterministic.</p>
                </QCard>
              </div>
            </div>

            <div class="row q-col-gutter-lg">
              <div class="col-12 col-md-7">
                <QCard class="qds-story-panel q-pa-lg full-height">
                  <div class="row items-center q-col-gutter-md q-mb-md">
                    <div class="col">
                      <div class="text-overline qds-text-muted">QCarousel · control + navigation</div>
                      <div class="text-h6 qds-story-title">Local slide navigation</div>
                    </div>
                    <span class="col-auto qds-text-muted text-caption">{{ carouselSlide }}</span>
                  </div>
                  <QCarousel
                    v-model="carouselSlide"
                    swipeable
                    infinite
                    aria-label="Local artwork carousel"
                    height="15rem"
                    class="qds-story-carousel"
                    data-test="qds-story-carousel"
                  >
                    <template #control>
                      <QCarouselControl position="left" :offset="[10, 0]" class="flex items-center">
                        <QBtn
                          round
                          unelevated
                          :icon="ppArrowLeft"
                          aria-label="Previous slide"
                          color="white"
                          text-color="dark"
                          data-test="qds-story-carousel-prev"
                          @click="carouselSlide = wrapCarouselSlide(-1)"
                        />
                      </QCarouselControl>
                      <QCarouselControl position="right" :offset="[10, 0]" class="flex items-center">
                        <QBtn
                          round
                          unelevated
                          :icon="ppArrowRight"
                          aria-label="Next slide"
                          color="white"
                          text-color="dark"
                          data-test="qds-story-carousel-next"
                          @click="carouselSlide = wrapCarouselSlide(1)"
                        />
                      </QCarouselControl>
                      <QCarouselControl position="top-right" :offset="[10, 10]">
                        <div class="qds-story-carousel-controls" role="group" aria-label="Carousel controls">
                          <QBtn
                            v-for="(slide, index) in carouselSlides"
                            :key="`${slide.name}-control`"
                            dense
                            round
                            unelevated
                            :color="carouselSlide === slide.name ? 'white' : 'grey-4'"
                            text-color="dark"
                            :label="String(index + 1)"
                            :aria-label="`Show ${slide.title} slide`"
                            :aria-pressed="carouselSlide === slide.name"
                            data-test="qds-story-carousel-slide-control"
                            @click="carouselSlide = slide.name"
                          />
                        </div>
                      </QCarouselControl>
                    </template>
                    <QCarouselSlide
                      v-for="slide in carouselSlides"
                      :key="slide.name"
                      :name="slide.name"
                      :img-src="slide.src"
                      :aria-label="`${slide.title}: ${slide.caption}`"
                      class="q-pa-none"
                    >
                      <div class="absolute-bottom qds-story-media-caption">
                        <div class="text-weight-medium">{{ slide.title }}</div>
                        <div class="text-caption">{{ slide.caption }}</div>
                      </div>
                    </QCarouselSlide>
                  </QCarousel>
                </QCard>
              </div>

              <div class="col-12 col-md-5">
                <QCard class="qds-story-panel q-pa-lg full-height">
                  <div class="text-overline qds-text-muted">QTimeline · comfortable + dense</div>
                  <div class="text-h6 qds-story-title q-mb-sm">Side composition</div>
                  <QTimeline color="primary" layout="comfortable" class="qds-story-timeline" data-test="qds-story-timeline">
                    <QTimelineEntry title="Baseline" subtitle="Left" side="left" :icon="ppPalette">
                      Token surface ready.
                    </QTimelineEntry>
                    <QTimelineEntry title="Review" subtitle="Right" side="right" color="positive" :icon="ppCheckCircle">
                      Content remains readable.
                    </QTimelineEntry>
                  </QTimeline>
                  <QTimeline color="primary" layout="dense" class="qds-story-timeline q-mt-sm" data-test="qds-story-timeline-dense">
                    <QTimelineEntry title="Dense proof" subtitle="Right" side="right" :icon="ppFileText">
                      Compact local state.
                    </QTimelineEntry>
                  </QTimeline>
                </QCard>
              </div>
            </div>

            <div class="row q-col-gutter-lg">
              <div class="col-12 col-md-5">
                <QCard class="qds-story-panel q-pa-lg full-height">
                  <div class="text-overline qds-text-muted">Notify + Loading</div>
                  <div class="text-h6 qds-story-title q-mb-sm">On-demand overlay checks</div>
                  <p class="qds-text-muted q-mb-md">Both plugin overlays are closed initially. Notify dismisses on demand; Loading hides automatically and can be reopened.</p>
                  <div class="row q-gutter-sm">
                    <QBtn color="primary" unelevated no-caps label="Show Notify" data-test="qds-story-notify" @click="showNotification">
                      <PhBellRinging :size="18" weight="regular" />
                    </QBtn>
                    <QBtn outline color="primary" no-caps label="Show Loading" data-test="qds-story-loading" @click="showLoading">
                      <PhCloudArrowUp :size="18" weight="regular" />
                    </QBtn>
                    <QBtn flat color="primary" no-caps label="Hide Loading" @click="hideLoading" />
                  </div>
                </QCard>
              </div>

              <div class="col-12 col-md-7">
                <QCard class="qds-story-panel q-pa-lg full-height">
                  <div class="row items-center justify-between q-col-gutter-sm">
                    <div class="col text-overline qds-text-muted">QEditor · focused + read-only shells</div>
                    <div class="col-auto"><QBtn flat color="primary" no-caps label="Focus editable editor" @click="focusEditor" /></div>
                  </div>
                  <div class="qds-story-editor-grid q-mt-sm">
                    <div>
                      <div class="text-caption qds-text-muted q-mb-xs">Editable shell</div>
                      <QEditor v-model="editorContent" min-height="7rem" :toolbar="[]" class="qds-story-editor" data-test="qds-story-editor" />
                    </div>
                    <div>
                      <div class="text-caption qds-text-muted q-mb-xs">Read-only shell</div>
                      <QEditor v-model="readonlyEditorContent" readonly min-height="7rem" :toolbar="[]" class="qds-story-editor" data-test="qds-story-editor-readonly" />
                    </div>
                  </div>
                </QCard>
              </div>
            </div>

            <QCard class="qds-story-panel q-pa-lg">
              <div class="row items-center q-col-gutter-md q-mb-md">
                <div class="col">
                  <div class="text-overline qds-text-muted">QUploader · local-only shell</div>
                  <div class="text-h6 qds-story-title">No network upload</div>
                </div>
                <PhCloudArrowUp class="col-auto" :size="26" weight="duotone" />
              </div>
              <QUploader label="Add local files" class="full-width qds-story-uploader" :auto-upload="false" no-thumbnails hide-upload-btn data-test="qds-story-uploader">
                <template #header="scope">
                  <div class="qds-story-uploader-header">
                    <QUploaderAddTrigger />
                    <div class="qds-story-uploader-copy">
                      <div class="text-weight-medium">Local file shell</div>
                      <div class="text-caption qds-text-muted">Files may be selected and removed; this story does not submit a request.</div>
                    </div>
                    <div class="qds-story-uploader-actions">
                      <QBtn dense round flat aria-label="Add local files"><PhImageSquare :size="19" weight="regular" /></QBtn>
                      <QBtn dense round flat aria-label="Remove queued files" :disable="scope.files.length === 0" @click="scope.removeQueuedFiles">
                        <PhFloppyDisk :size="19" weight="regular" />
                      </QBtn>
                    </div>
                  </div>
                </template>
              </QUploader>
              <QUploader disable label="Disabled local upload shell" class="full-width q-mt-md" :auto-upload="false" no-thumbnails hide-upload-btn />
            </QCard>
          </div>
        </StoryShell>
      </template>

      <template #controls="{ state }">
        <HstSelect v-model="state.mode" title="Mode" :options="modeOptions" />
        <HstSelect v-model="state.variant" title="Variant" :options="variantOptions" />
      </template>
    </Variant>
  </Story>
</template>

<style scoped>
.qds-story-panel {
  background: var(--qds-card-bg);
  border: var(--qds-border-width-control) solid var(--qds-card-border);
}

.qds-story-title {
  font-family: var(--qds-font-family-display);
}

.qds-story-stepper-wrap {
  max-inline-size: 100%;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
}

.qds-story-image-proof {
  max-inline-size: 100%;
  overflow: hidden;
}

.qds-story-stepper {
  min-inline-size: 38rem;
}

.qds-story-artwork,
.qds-story-carousel,
.qds-story-image-proof,
.qds-story-editor,
.qds-story-uploader {
  overflow: hidden;
  border: var(--qds-border-width-control) solid var(--qds-border-subtle);
  border-radius: var(--qds-radius-lg);
}

.qds-story-media-caption {
  padding: var(--qds-space-md);
  color: white;
  background: rgba(0, 0, 0, 0.48);
}

.qds-story-image-proof {
  position: relative;
}

.qds-story-carousel-controls {
  display: flex;
  gap: var(--qds-space-xs);
}

.qds-story-image-slot {
  color: var(--qds-text-muted);
}

.qds-story-image-slot--error {
  color: var(--qds-fg-negative);
  background: var(--qds-surface-negative-soft);
}

.qds-story-editor-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--qds-space-md);
}

.qds-story-timeline {
  max-inline-size: 100%;
}

.qds-story-rating-row {
  display: grid;
  grid-template-columns: minmax(5.5rem, 1fr) auto;
  align-items: center;
  gap: var(--qds-space-md);
  padding-block: var(--qds-space-sm);
  border-bottom: var(--qds-border-width-control) solid var(--qds-separator-color);
}

.qds-story-rating-row:last-of-type {
  border-bottom: 0;
}

.qds-story-uploader-header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--qds-space-md);
  min-block-size: 4.5rem;
  padding: var(--qds-space-md);
  background: var(--qds-surface-1);
  border-bottom: var(--qds-border-width-control) solid var(--qds-separator-color);
}

.qds-story-uploader-copy {
  flex: 1 1 14rem;
  min-inline-size: 0;
}

.qds-story-uploader-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--qds-space-xs);
  margin-inline-start: auto;
}

@media (max-width: 48rem) {
  .qds-story-uploader-header {
    align-items: flex-start;
  }

  .qds-story-uploader-actions {
    margin-inline-start: 0;
  }
}

@media (max-width: 32rem) {
  .qds-story-stepper {
    min-inline-size: 0;
  }

  .qds-story-stepper :deep(.q-stepper__tab) {
    min-inline-size: 0;
    padding-inline: var(--qds-space-xs);
  }

  .qds-story-stepper :deep(.q-stepper__label) {
    min-inline-size: 0;
  }

  .qds-story-stepper :deep(.q-stepper__title),
  .qds-story-stepper :deep(.q-stepper__caption) {
    overflow-wrap: anywhere;
  }

  .qds-story-editor-grid {
    grid-template-columns: 1fr;
  }
}
</style>
