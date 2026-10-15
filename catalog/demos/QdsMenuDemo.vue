<script setup lang="ts">
import { ref, watch } from 'vue'
import { QBtn, QMenu, QIcon, QList, QItem, QItemSection, QSeparator } from 'quasar'
import { ppCheck, ppDotOutline } from 'quasar-extras-svg-icons/phosphor-icons-v2'

const props = defineProps<{
  dense: boolean
  /** Persistent menu ignores outside click and Escape by design (documented native semantics). */
  persistent: boolean
  /** Menu items toggle check marks in the left section of the teleported portal. */
  checkable: boolean
}>()

/** QMenu teleports itself to `document.body` (native portal). */
const open = ref(false)
const checked = ref<string[]>(['Duplicate'])
const anchorRef = ref<QBtn | null>(null)

/**
 * Explicit teardown helpers for the proof: when the portal closes we restore
 * focus to the anchor ourselves (no runtime API repair); teardown on unmount is
 * QMenu's own native unmount path.
 */
function onMenuHide(): void {
  open.value = false
  const anchor = anchorRef.value?.$el
  if (anchor instanceof HTMLElement) {
    anchor.focus()
  }
}

function toggleItem(name: string): void {
  if (checked.value.includes(name)) {
    checked.value = checked.value.filter((entry) => entry !== name)
  } else {
    checked.value = [...checked.value, name]
  }
}

watch(
  () => [props.persistent, props.checkable] as const,
  () => {
    // Reset transient portal-driven state so fresh fixtures start neutral.
    open.value = false
    checked.value = ['Duplicate']
  },
)

defineExpose({ open, checked, anchorRef, onMenuHide, toggleItem })
</script>

<template>
  <div class="qds-catalog-demo-menu">
    <QBtn
      ref="anchorRef"
      type="button"
      unelevated
      color="primary"
      class="qds-catalog-demo__control qds-catalog-demo-menu__anchor"
      :label="open ? 'Close menu' : 'Open menu'"
      :dense="dense"
    >
      <QMenu
        v-model="open"
        :persistent="persistent"
        :dense="dense"
        anchor="bottom middle"
        self="top middle"
        @hide="onMenuHide"
      >
        <QList>
          <QItem
            clickable
            :dense="dense"
            :active="checkable && checked.includes('Duplicate')"
            @click="checkable ? toggleItem('Duplicate') : undefined"
          >
            <QItemSection v-if="checkable" side>
              <QIcon :name="checked.includes('Duplicate') ? ppCheck : ppDotOutline" />
            </QItemSection>
            <QItemSection>Duplicate</QItemSection>
          </QItem>

          <QItem
            clickable
            :dense="dense"
            :active="checkable && checked.includes('Share')"
            @click="checkable ? toggleItem('Share') : undefined"
          >
            <QItemSection v-if="checkable" side>
              <QIcon :name="checked.includes('Share') ? ppCheck : ppDotOutline" />
            </QItemSection>
            <QItemSection>Share</QItemSection>
          </QItem>

          <QSeparator inset />

          <QItem clickable :dense="dense">
            <QItemSection>Delete</QItemSection>
          </QItem>
        </QList>
      </QMenu>
    </QBtn>
  </div>
</template>

<style scoped>
.qds-catalog-demo-menu {
  display: grid;
  justify-items: start;
  gap: 0.25rem;
}
</style>
