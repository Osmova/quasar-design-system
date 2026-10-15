<script setup lang="ts">
import { ref } from 'vue'
import { QField, QIcon } from 'quasar'
import { ppPencilSimpleBold, ppXCircle } from 'quasar-extras-svg-icons/phosphor-icons-v2'

defineProps<{
  /** QField label text. */
  label: string
  dense: boolean
  /** Keeps the label floated above the control even when empty. */
  stackLabel: boolean
  /** Adds prefix/suffix text plus prepend/append icons. */
  marginals: boolean
  /** Shows the fixed helper hint line. */
  hint: boolean
  /** Shows the value counter (maxlength 24) for the local model. */
  counter: boolean
  /** Native clear icon affordance. */
  clearable: boolean
  /** Error state + fixed error message. */
  error: boolean
  loading: boolean
  disable: boolean
  readonly: boolean
}>()

/** Local demo value: the counter/clear states are derived from it at runtime. */
const value = ref('Draft value')
</script>

<template>
  <div class="qds-catalog-demo-field">
    <QField
      v-model="value"
      class="qds-catalog-demo__control"
      outlined
      :label="label"
      :dense="dense"
      :stack-label="stackLabel"
      :loading="loading"
      :disable="disable"
      :readonly="readonly"
      :counter="counter"
      :maxlength="counter ? 24 : undefined"
      :clearable="clearable"
      :hint="hint ? 'Helper text under the control' : undefined"
      :error="error"
      :error-message="error ? 'Check the value and try again' : undefined"
      :prefix="marginals ? '€' : undefined"
      :suffix="marginals ? 'EUR' : undefined"
    >
      <template #control="{ id, modelValue, emitValue }">
        <input
          :id="id"
          class="q-field__input"
          type="text"
          :value="modelValue ?? ''"
          :disabled="disable"
          :readonly="readonly"
          :maxlength="counter ? 24 : undefined"
          @input="emitValue(($event.target as HTMLInputElement).value)"
        >
      </template>
      <template v-if="marginals" #prepend>
        <QIcon :name="ppPencilSimpleBold" />
      </template>
      <template v-if="marginals" #append>
        <QIcon :name="ppXCircle" />
      </template>
    </QField>
  </div>
</template>

<style scoped>
.qds-catalog-demo-field {
  display: grid;
  gap: 0.25rem;
}
</style>
