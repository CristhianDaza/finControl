<script setup>
import { defineAsyncComponent, ref, watch } from 'vue'

const FcModal = defineAsyncComponent(/* webpackChunkName: "FcModal" */() => import('@/components/global/FcModal.vue'))
const FcFormField = defineAsyncComponent(/* webpackChunkName: "FcFormField" */() => import('@/components/global/FcFormField.vue'))

const props = defineProps({
  showModalDebts: {
    type: Boolean,
    default: false,
    attribute: 'show-modal-debts'
  }
})

const debt = ref({
  name: '',
  balance: 0,
  date: new Date().toISOString().split('T')[0],
  id: ''
})
const showModal = ref(false)

const handleAccept = () => {
  debt.value.id = crypto.randomUUID()
  resetDebt()
}

const handleCancel = () => {
  resetDebt()
}

const resetDebt = () => {
  debt.value = {
    name: '',
    balance: 0,
    date: new Date().toISOString().split('T')[0],
    id: ''
  }
}

watch(
  () => props.showModalDebts,
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
    title-modal="Agregar Deuda"
  >
    <FcFormField
      v-model="debt.name"
      label="Nombre de la deuda"
      placeholder="Ej: Pago de tarjeta de crédito"
      required
      :maxlength="40"
      error-message="El nombre es obligatorio y debe tener menos de 40 caracteres"
    />
    <FcFormField
      v-model="debt.balance"
      label="Monto"
      type="number"
      required
      min="0"
      step="0.01"
      format-thousands
      error-message="El monto es obligatorio y debe ser un número positivo"
    />
    <FcFormField
      v-model="debt.date"
      label="Fecha de vencimiento"
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
