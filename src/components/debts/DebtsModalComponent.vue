<script setup>
import { defineAsyncComponent, ref, watch, computed } from 'vue'
import { t } from '@/i18n/index.js'
import { useCurrenciesStore } from '@/stores/currencies.js'

const FcModal = defineAsyncComponent(/* webpackChunkName: "FcModal" */() => import('@/components/global/FcModal.vue'))
const FcFormField = defineAsyncComponent(/* webpackChunkName: "FcFormField" */() => import('@/components/global/FcFormField.vue'))

const props = defineProps({
  showModalDebts: {
    type: Boolean,
    default: false,
    attribute: 'show-modal-debts'
  },
  initial: {
    type: Object,
    default: null
  },
  title: {
    type: String,
    default: () => t('debts.addTitle')
  }
})

const emit = defineEmits(['save','update:showModal','cancel'])

const currencies = useCurrenciesStore(); if (currencies.status==='idle') currencies.subscribe()
const currencyOptions = computed(()=>currencies.codeOptions)
const hasMultiple = computed(()=>currencyOptions.value.length>1)

const model = ref({ id: '', name: '', amount: 0, dueDate: '', currency: 'COP' })
const showModal = ref(false)
const isEdit = computed(() => !!model.value.id)

const handleAccept = () => {
  const payload = { id: model.value.id, name: String(model.value.name||'').trim(), amount: Number(model.value.amount||0), dueDate: model.value.dueDate || '', currency: model.value.currency || currencies.defaultCurrency.code }
  emit('save', payload)
  emit('update:showModal', false)
  reset()
}

const handleCancel = () => {
  emit('cancel')
  emit('update:showModal', false)
  reset()
}

const reset = () => { model.value = { id: '', name: '', amount: 0, dueDate: '', currency: currencies.defaultCurrency.code } }

watch(() => props.showModalDebts, v => { showModal.value = v })
watch(() => props.initial, (val) => {
  if (val) { model.value = { id: val.id || '', name: val.name || '', amount: Number(val.originalAmount ?? val.amount ?? 0), dueDate: val.dueDate || '', currency: val.currency || currencies.defaultCurrency.code } }
}, { immediate: true })
watch(showModal, v => emit('update:showModal', v))
</script>

<template>
  <FcModal
    :show-modal="showModal"
    @accept="handleAccept"
    @cancel-modal="handleCancel"
    @update:showModal="showModal = $event"
    :title-modal="title"
  >
    <FcFormField
      v-model="model.name"
      :label="t('debts.form.name')"
      :placeholder="t('debts.form.namePlaceholder')"
      required
      :maxlength="40"
      :error-message="t('debts.form.nameError')"
      id="debt-name"
    />
    <FcFormField
      v-model="model.amount"
      :label="t('debts.form.amount')"
      type="number"
      required
      min="0"
      step="0.01"
      format-thousands
      :error-message="t('debts.form.amountError')"
      id="debt-amount"
      :disabled="isEdit"
    />
    <FcFormField
      v-if="hasMultiple"
      v-model="model.currency"
      :label="t('accounts.form.currency')"
      type="select"
      :options="currencyOptions"
    />
    <FcFormField
      v-model="model.dueDate"
      :label="t('debts.form.dueDate')"
      type="date"
      :min="'2023-01-01'"
      :max="'2035-12-31'"
      :error-message="t('debts.form.dueDateError')"
      id="debt-dueDate"
    />
  </FcModal>
</template>

<style scoped>

</style>
