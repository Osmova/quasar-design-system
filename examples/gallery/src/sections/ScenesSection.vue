<script setup lang="ts">
type SceneVariant = 'fluent' | 'ink' | 'one' | 'term'

type Scene = {
  variant: SceneVariant
  label: string
  tagline: string
  wallpaper: string
  detail: string
}

const scenes: Scene[] = [
  {
    variant: 'fluent',
    label: 'Fluent',
    tagline: 'Tonal workboard',
    wallpaper: '/scenes/qds-wallpaper-fluent.svg',
    detail: 'Calm depth, solid reading surfaces, and restrained acrylic over cool geometry.',
  },
  {
    variant: 'ink',
    label: 'Ink',
    tagline: 'Paper and ink',
    wallpaper: '/scenes/qds-wallpaper-ink.svg',
    detail: 'Paper-neutral surface with charcoal type and coordinated pastel role washes.',
  },
  {
    variant: 'one',
    label: 'One',
    tagline: 'Neutral blocks, calm blue',
    wallpaper: '/scenes/qds-wallpaper-one.svg',
    detail: 'Grey or true-black pages, rounded white and dark-grey blocks, pill controls, and a calm blue accent for touch-first panels.',
  },
  {
    variant: 'term',
    label: 'Term',
    tagline: 'Amber keys, hairline rules',
    wallpaper: '/scenes/qds-wallpaper-term.svg',
    detail: 'Opaque cream or near-black panes, crisp hairline rules, and amber fills with dark ink for developer UI.',
  },
]

const materials = [
  { level: 'thin', use: 'Tooltip' },
  { level: 'regular', use: 'Menu, popover, picker, toast' },
  { level: 'thick', use: 'Dialog, bottom sheet' },
] as const
</script>

<template>
  <section class="scenes-section" data-test="qds-scenes-section" aria-labelledby="qds-scenes-title">
    <div class="scenes-hero qds-card">
      <p class="scenes-kicker">Scene surfaces</p>
      <h1 id="qds-scenes-title" class="qds-display">Variant matrix over owned scenic wallpapers</h1>
      <p class="qds-text-muted">
        These frames compare the same tokenized Quasar card anatomy over deterministic SVG wallpapers.
        Each canonical variant is judged against image-rich context so surface, border, and depth rules stay visible.
      </p>
    </div>

    <div class="materials-backdrop" data-test="qds-scene-materials" role="group" aria-label="Material levels over a colourful backdrop">
      <div
        v-for="material in materials"
        :key="material.level"
        class="materials-sample qds-material"
        :class="`qds-material--${material.level}`"
        :data-test="`qds-material-${material.level}`"
      >
        <strong>{{ material.level }}</strong>
        <span class="qds-text-muted">{{ material.use }}</span>
      </div>
    </div>

    <div class="scenes-grid" aria-label="Variant scene matrix">
      <article
        v-for="scene in scenes"
        :key="scene.variant"
        class="scene-frame"
        :class="[`qds-variant-${scene.variant}`, `scene-frame--${scene.variant}`]"
        :style="{ '--scene-wallpaper': `url(${scene.wallpaper})` }"
        :data-test="`qds-scene-${scene.variant}`"
      >
        <q-card class="scene-panel qds-card--readable" :data-test="`qds-scene-card-${scene.variant}`">
          <q-card-section class="scene-panel__header">
            <div class="scene-panel__eyebrow">{{ scene.tagline }}</div>
            <h2 class="scene-panel__title qds-display">{{ scene.label }}</h2>
            <p class="scene-panel__copy">{{ scene.detail }}</p>
          </q-card-section>

          <q-card-section class="scene-metrics">
            <span>blur <strong>var(--qds-card-backdrop-blur)</strong></span>
            <span>surface <strong>var(--qds-card-bg)</strong></span>
          </q-card-section>

          <q-card-actions align="between">
            <q-btn dense flat color="primary" label="Inspect" no-caps />
            <q-btn dense unelevated color="primary" label="Apply" no-caps />
          </q-card-actions>
        </q-card>

        <div class="scene-dock qds-card" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.scenes-section {
  display: grid;
  gap: var(--qds-space-lg);
}

.scenes-hero {
  padding: clamp(1.25rem, 3vw, 2rem);
}

.scenes-kicker {
  margin: 0 0 var(--qds-space-xs);
  color: var(--qds-color-primary);
  font-size: 0.78rem;
  font-weight: var(--qds-font-weight-semibold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.scenes-hero h1 {
  margin: 0 0 var(--qds-space-sm);
  color: var(--qds-text-strong);
  font-size: clamp(1.75rem, 4vw, 3rem);
  line-height: 1.05;
}

.scenes-hero p {
  max-width: 62rem;
  margin: 0;
  font-size: 1rem;
}

.scenes-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--qds-space-lg);
}

.scene-frame {
  position: relative;
  display: grid;
  align-content: space-between;
  gap: clamp(2rem, 7vw, 5rem);
  isolation: isolate;
  padding: clamp(1rem, 3vw, 1.5rem);
  border-radius: calc(var(--qds-card-radius) + 0.75rem);
  background-image: var(--scene-wallpaper);
  background-position: center;
  background-size: cover;
}

.scene-frame::before {
  position: absolute;
  inset: 0;
  z-index: -1;
  content: '';
  border-radius: inherit;
  background:
    radial-gradient(circle at 22% 20%, rgba(var(--qds-color-primary-rgb), 0.18), transparent 32%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.02));
}

.scene-panel {
  max-width: 26rem;
}

/* This owned pale wallpaper needs a solid dark reading surface, not acrylic. */
.scene-frame--fluent .scene-panel.q-card--dark {
  background: var(--qds-bg-card);
  color: var(--qds-fg-default);
}

.scene-frame--fluent .scene-panel.q-card--dark .scene-panel__eyebrow {
  color: var(--qds-fg-brand);
}

.scene-panel__header {
  padding-bottom: var(--qds-space-sm);
}

.scene-panel__eyebrow {
  color: var(--qds-color-primary);
  font-size: 0.75rem;
  font-weight: var(--qds-font-weight-semibold);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.scene-frame--term .scene-panel__eyebrow,
.scene-frame--one .scene-panel__eyebrow,
.qds-variant-term .scenes-kicker,
.qds-variant-one .scenes-kicker {
  color: var(--qds-fg-brand);
}

.scene-panel__title {
  margin: 0.2rem 0 0;
  color: var(--qds-text-strong);
  font-size: clamp(1.75rem, 3vw, 2.5rem);
  line-height: 1;
}

.scene-panel__copy {
  margin: var(--qds-space-sm) 0 0;
  color: var(--qds-text-muted);
}

.scene-metrics {
  display: grid;
  gap: var(--qds-space-xs);
  color: var(--qds-text-muted);
  font-size: 0.8rem;
}

.scene-metrics strong {
  color: var(--qds-text-strong);
  font-weight: var(--qds-font-weight-medium);
}

.scene-dock {
  justify-self: end;
  display: flex;
  gap: 0.4rem;
  padding: 0.55rem;
  border-radius: var(--qds-radius-full);
}

.scene-dock span {
  width: 0.62rem;
  height: 0.62rem;
  border-radius: var(--qds-radius-full);
  background: rgba(var(--qds-color-primary-rgb), 0.7);
}

.scene-frame--ink::before {
  background:
    repeating-linear-gradient(0deg, rgba(95, 111, 82, 0.045) 0 1px, transparent 1px 9px),
    linear-gradient(135deg, rgba(255, 248, 232, 0.72), rgba(255, 248, 232, 0.08));
}

.materials-backdrop {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--qds-space-lg);
  padding: clamp(1.5rem, 5vw, 3rem);
  border-radius: calc(var(--qds-card-radius) + 0.75rem);
  background:
    radial-gradient(circle at 12% 20%, rgb(var(--qds-color-primary-light-rgb)), transparent 42%),
    radial-gradient(circle at 88% 24%, rgb(var(--qds-color-accent-rgb)), transparent 40%),
    radial-gradient(circle at 60% 90%, rgb(var(--qds-color-negative-rgb)), transparent 46%),
    radial-gradient(circle at 30% 80%, rgb(var(--qds-color-positive-rgb)), transparent 38%),
    rgb(var(--qds-color-primary-dark-rgb));
}

.materials-sample {
  display: grid;
  gap: var(--qds-space-xs);
  min-height: 7rem;
  align-content: center;
  padding: var(--qds-space-md) var(--qds-space-lg);
  border-radius: var(--qds-card-radius);
}

.materials-sample strong {
  color: var(--qds-text-strong);
  font-size: var(--qds-font-size-subtitle);
  text-transform: capitalize;
}

@media (max-width: 900px) {
  .scenes-grid,
  .materials-backdrop {
    grid-template-columns: 1fr;
  }
}
</style>
