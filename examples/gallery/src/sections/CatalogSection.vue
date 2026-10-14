<script setup lang="ts">
import CatalogActions from './catalog/CatalogActions.vue'
import CatalogComplexMedia from './catalog/CatalogComplexMedia.vue'
import CatalogForms from './catalog/CatalogForms.vue'
import CatalogIdentity from './catalog/CatalogIdentity.vue'
import CatalogIntro from './catalog/CatalogIntro.vue'
import CatalogLoadingData from './catalog/CatalogLoadingData.vue'
</script>

<template>
  <div class="catalog-section column no-wrap">
    <CatalogIntro />
    <CatalogActions />
    <CatalogIdentity />
    <CatalogForms />
    <CatalogLoadingData />
    <CatalogComplexMedia />
  </div>
</template>

<style>
.catalog-section {
  gap: var(--qds-space-lg);
}

.catalog-card {
  border: 1px solid var(--qds-chrome-border);
}

.catalog-heading,
.catalog-grid,
.catalog-form {
  display: grid;
  gap: var(--qds-space-md);
}

.catalog-heading {
  grid-template-columns: 1fr auto;
  align-items: start;
}

.catalog-grid--two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.catalog-grid--three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.catalog-demo {
  min-width: 0;
  padding: var(--qds-space-md);
  border: 1px solid var(--qds-chrome-border-soft);
  border-radius: var(--qds-radius-lg);
  background: var(--qds-chrome-surface);
  box-shadow: var(--qds-chrome-shadow);
}

.catalog-demo--wide {
  grid-column: span 2;
}

.catalog-label {
  margin-bottom: var(--qds-space-sm);
  color: var(--qds-text-muted);
  font-size: 0.875rem;
  font-weight: 650;
}

.catalog-banner,
.catalog-panel,
.catalog-bar,
.catalog-scroll-box,
.catalog-splitter,
.catalog-pull-box,
.catalog-edit-target,
.catalog-loading-box {
  border: 1px solid var(--qds-chrome-border-soft);
  border-radius: var(--qds-radius-md);
  background: var(--qds-chrome-surface);
}

.catalog-bar {
  color: var(--qds-text);
}

.catalog-fab-stage {
  display: flex;
  min-height: 5rem;
  align-items: center;
}

.catalog-picker {
  width: 100%;
  min-width: 0;
  max-width: 21rem;
}

.catalog-edit-target,
.catalog-loading-box,
.catalog-pull-box {
  min-height: 5rem;
  padding: var(--qds-space-md);
}

.catalog-loading-box {
  position: relative;
}

.catalog-media {
  overflow: hidden;
  border-radius: var(--qds-radius-lg);
}

.catalog-video {
  max-width: 40rem;
  margin-inline: auto;
}

.catalog-media-caption {
  padding: var(--qds-space-sm) var(--qds-space-md);
  color: white;
  background: linear-gradient(transparent, rgb(0 0 0 / 0.62));
}

.catalog-image {
  width: min(100%, 32rem);
  border-radius: var(--qds-radius-lg);
}

@media (max-width: 960px) {
  .catalog-grid--two,
  .catalog-grid--three {
    grid-template-columns: 1fr;
  }

  .catalog-demo--wide {
    grid-column: auto;
  }
}

@media (max-width: 640px) {
  /* Leave room for native 290px portrait pickers by reducing wrapper padding,
     not the component's native geometry. */
  .catalog-section .catalog-card.q-pa-lg { padding: var(--qds-space-sm); }
  .catalog-section .catalog-demo { padding: var(--qds-space-xs); }
  .catalog-heading {
    grid-template-columns: 1fr;
  }
}
</style>
