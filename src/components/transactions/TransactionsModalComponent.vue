<script setup>
import { defineAsyncComponent, ref, watch, computed } from 'vue'
import { t } from '@/i18n/index.js'
import { useNotify } from '@/components/global/fcNotify.js'
import { useAuthStore } from '@/stores/auth.js'

const FcModal = defineAsyncComponent(/* webpackChunkName: "fcModal" */() => import('@/components/global/FcModal.vue'))
const FcFormField = defineAsyncComponent(/* webpackChunkName: "fcFormField" */() => import('@/components/global/FcFormField.vue'))

const props = defineProps({
  showModalTransaction: {
    type: Boolean,
    default: false,
    attribute: 'show-modal-transaction'
  },
  initial: { type: Object, default: null },
  title: { type: String, default: () => t('transactions.addTitle') },
  accountsOptions: { type: Array, default: () => [] },
  debtsOptions: { type: Array, default: () => [] },
  goalsOptions: { type: Array, default: () => [] }
})

const emit = defineEmits([
  'save',
  'update:showModalTransaction',
  'cancel'
])
const { error: notifyError } = useNotify()
const auth = useAuthStore()
const canWrite = computed(() => auth.canWrite)

const transaction = ref({
  description: '',
  amount: 0,
  type: '',
  account: '',
  debt: '',
  goal: '',
  date: new Date().toISOString().split('T')[0],
  id: ''
})

const showModal = ref(false)
const isDebtPayment = computed(
  () => transaction.value.type === 'debtPayment'
)
const isGoalSaving = computed(
  () => transaction.value.type === 'expense:goal'
)

const handleAccept = () => {
  if (!canWrite.value) return
  if (isDebtPayment.value && !transaction.value.debt) {
    notifyError(t('transactions.notifications.debtRequired'))
    return
  }
  if (isGoalSaving.value && !transaction.value.goal) {
    notifyError(t('transactions.notifications.goalRequired'))
    return
  }
  const payload = { ...transaction.value }
  if (payload.type === 'expense:goal') {
    payload.type = 'expense'
  }
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
    debt: '',
    goal: '',
    date: new Date().toISOString().split('T')[0],
    id: ''
  }
}

watch(
  () => props.showModalTransaction,
  v => { showModal.value = v }
)

watch(
  () => props.initial,
  val => {
    if (val) {
      transaction.value = {
        id: val.id || '',
        description: val.description || val.note || '',
        amount: Number(val.amount) || 0,
        type:
          val.type === 'expense' && (val.goal || val.goalId)
            ? 'expense:goal'
            : val.type || '',
        account: val.account || val.accountId || '',
        debt: val.debt || val.debtId || '',
        goal: val.goal || val.goalId || '',
        date: val.date || new Date().toISOString().split('T')[0]
      }
    }
  },
  { immediate: true }
)

watch(
  showModal,
  v => emit('update:showModalTransaction', v)
)

watch(
  () => transaction.value.type,
  typ => {
    if (typ !== 'expense:goal') transaction.value.goal = ''
    if (typ !== 'debtPayment') transaction.value.debt = ''
  }
)
</script>

<template>
  <FcModal
    :show-modal="showModal"
    @accept="handleAccept"
    @cancel-modal="handleCancel"
    @update:showModal="showModal = $event"
    :title-modal="title"
    :accept-disabled="!canWrite"
  >
    <FcFormField
      v-model="transaction.description"
      :label="t('transactions.form.description')"
      :placeholder="t('transactions.form.descriptionPlaceholder')"
      required
      :maxlength="40"
      :error-message="t('transactions.form.descriptionError')"
      :disabled="!canWrite"
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
      :disabled="!canWrite"
    />

    <FcFormField
      v-model="transaction.type"
      :label="t('transactions.form.type')"
      type="select"
      :options="[
        { label: t('transactions.form.income'), value: 'income' },
        { label: t('transactions.form.expense'), value: 'expense' },
        { label: t('transactions.form.goalSaving'), value: 'expense:goal' },
        { label: t('transactions.form.debtPayment'), value: 'debtPayment' }
      ]"
      required
      :error-message="t('transactions.form.type')"
      :disabled="!canWrite"
    />

    <FcFormField
      v-if="isDebtPayment"
      v-model="transaction.debt"
      :label="t('transactions.form.debt')"
      type="select"
      :options="debtsOptions"
      required
      :error-message="t('transactions.form.debtError')"
      :disabled="!canWrite"
    />

    <FcFormField
      v-model="transaction.account"
      :label="t('transactions.form.account')"
      type="select"
      :options="accountsOptions"
      required
      :error-message="t('transactions.form.accountError')"
      :disabled="!canWrite"
    />

    <FcFormField
      v-if="isGoalSaving"
      v-model="transaction.goal"
      :label="t('goals.form.goal')"
      type="select"
      :options="goalsOptions"
      required
      :disabled="!canWrite"
    />

    <FcFormField
      v-model="transaction.date"
      :label="t('transactions.form.date')"
      type="date"
      required
      :min="'2023-01-01'"
      :max="'2030-12-31'"
      :error-message="t('transactions.form.dateError')"
      :disabled="!canWrite"
    />
  </FcModal>
</template>

<style scoped></style>
