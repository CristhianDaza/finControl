<script setup>
import {defineAsyncComponent, ref, watch} from 'vue'
import { t } from '@/i18n/index.js'

const FcModal = defineAsyncComponent(/* webpackChunkName: "FcModal" */() => import('@/components/global/FcModal.vue'))
const FcFormField = defineAsyncComponent(/* webpackChunkName: "FcFormField" */() => import('@/components/global/FcFormField.vue'))

const props = defineProps({
  showModalTransaction: { type: Boolean, default: false, attribute: 'show-modal-transaction' },
  initial: { type: Object, default: null },
  title: { type: String, default: () => t('transactions.addTitle') },
  accountsOptions: { type: Array, default: () => [] }
})

const emit = defineEmits(['save','update:showModalTransaction','cancel'])

const transaction = ref({
  description: '',
  amount: 0,
  type: '',
  account: '',
  date: new Date().toISOString().split('T')[0],
  id: ''
})
const showModal = ref(false)

const handleAccept = () => {
  const payload = { ...transaction.value }
  emit('save', payload)
  emit('update:showModalTransaction', false)
  resetTransaction()
}

const handleCancel = () => {
  emit('cancel')
  emit('update:showModalTransaction', false)
  resetTransaction()
}

const resetTransaction = () => {
  transaction.value = {
    description: '',
    amount: 0,
    type: '',
    account: '',
    date: new Date().toISOString().split('T')[0],
    id: ''
  }
}

watch(
  () => props.showModalTransaction,
  (v) => { showModal.value = v }
)

watch(
  () => props.initial,
  (val) => {
    if (val) {
      transaction.value = {
        id: val.id || '',
        description: val.description || val.note || '',
        amount: Number(val.amount) || 0,
        type: val.type || '',
        account: val.account || val.accountId || '',
        date: val.date || new Date().toISOString().split('T')[0]
      }
    }
  },
  { immediate: true }
)

watch(
  showModal,
  (v) => emit('update:showModalTransaction', v)
)
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
      v-model="transaction.description"
      :label="t('transactions.form.description')"
      :placeholder="t('transactions.form.descriptionPlaceholder')"
      required
      :maxlength="40"
      :error-message="t('transactions.form.descriptionError')"
    />
    <FcFormField
      v-model="transaction.amount"
      :label="t('transactions.form.amount')"
      type="number"
      required
      min="1"
      step="0.01"
      format-thousands
      :error-message="t('transactions.form.amountError')"
    />
    <FcFormField
      v-model="transaction.type"
      :label="t('transactions.form.type')"
      type="select"
      :options="[
        { label: t('transactions.form.income'), value: 'income' },
        { label: t('transactions.form.expense'), value: 'expense' }
      ]"
      required
      :error-message="t('transactions.form.type')"
    />
    <FcFormField
      v-model="transaction.account"
      :label="t('transactions.form.account')"
      type="select"
      :options="accountsOptions"
      required
      :error-message="t('transactions.form.accountError')"
    />
    <FcFormField
      v-model="transaction.date"
      :label="t('transactions.form.date')"
      type="date"
      required
      :min="'2023-01-01'"
      :max="'2030-12-31'"
      :error-message="t('transactions.form.dateError')"
    />
  </FcModal>
</template>

<style scoped>
</style>
