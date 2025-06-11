<script setup>
import {defineAsyncComponent, ref, watch} from 'vue'

const FcModal = defineAsyncComponent(/* webpackChunkName: "FcModal" */() => import('@/components/global/FcModal.vue'))
const FcFormField = defineAsyncComponent(/* webpackChunkName: "FcFormField" */() => import('@/components/global/FcFormField.vue'))

const props = defineProps({
  showModalTransaction: {
    type: Boolean,
    default: false,
    attribute: 'show-modal-transaction'
  }
})

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
  transaction.value.id = crypto.randomUUID()
  console.log('Aceptar presionado', transaction.value)
  resetTransaction()
}

const handleCancel = () => {
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
  (newValue) => {
    showModal.value = newValue
  }
)
</script>

<template>
  <FcModal
    :show-modal="showModal"
    @accept="handleAccept"
    @cancel-modal="handleCancel"
    @update:showModal="showModal = $event"
    title-modal="Agregar Transacción"
  >
    <FcFormField
      v-model="transaction.description"
      label="Descripción"
      placeholder="Ej: Pago de arriendo"
      required
      :maxlength="40"
      error-message="La descripción es obligatoria y debe ser corta"
    />
    <FcFormField
      v-model="transaction.amount"
      label="Monto"
      type="number"
      required
      min="1"
      step="0.01"
      format-thousands
      error-message="Ingresa un valor mayor a 0"
    />
    <FcFormField
      v-model="transaction.type"
      label="Tipo"
      type="select"
      :options="[
        { label: 'Ingreso', value: 'income' },
        { label: 'Gasto', value: 'expense' },
        { label: 'Deuda', value: 'debt' }
      ]"
        required
        error-message="Selecciona un tipo de transacción"
    />
    <FcFormField
      v-model="transaction.account"
      label="Cuenta"
      type="select"
      :options="[
        { label: 'Ahorros', value: 'Ahorros' },
        { label: 'Efectivo', value: 'Efectivo' },
        { label: 'Cuenta', value: 'Cuenta' }
      ]"
        required
        error-message="Selecciona una cuenta válida"
    />
    <FcFormField
      v-model="transaction.date"
      label="Fecha"
      type="date"
      required
      :min="'2023-01-01'"
      :max="'2030-12-31'"
      error-message="La fecha es obligatoria"
    />
  </FcModal>
</template>

<style scoped>

</style>
