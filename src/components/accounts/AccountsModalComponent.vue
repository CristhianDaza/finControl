<script setup>
import { defineAsyncComponent, ref, watch } from 'vue'

const FcModal = defineAsyncComponent(/* webpackChunkName: "FcModal" */() => import('@/components/global/FcModal.vue'))
const FcFormField = defineAsyncComponent(/* webpackChunkName: "FcFormField" */() => import('@/components/global/FcFormField.vue'))

const props = defineProps({
  showModalAccounts: {
    type: Boolean,
    default: false,
    attribute: 'show-modal-accounts'
  }
})

const debt = ref({
  name: '',
  balance: 0,
  id: ''
})
const showModal = ref(false)

const handleAccept = () => {
  debt.value.id = crypto.randomUUID()
  resetAccount()
}

const handleCancel = () => {
  resetAccount()
}

const resetAccount = () => {
  debt.value = {
    name: '',
    balance: 0,
    id: ''
  }
}

watch(
  () => props.showModalAccounts,
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
    title-modal="Agregar Cuenta"
  >
    <FcFormField
      v-model="debt.name"
      label="Nombre de la Cuenta"
      placeholder="Ej: Ahorros, Efectivo, Tarjeta"
      required
      :maxlength="40"
      error-message="El nombre es obligatorio y debe tener un máximo de 40 caracteres"
    />
    <FcFormField
      v-model="debt.balance"
      label="Saldo Inicial"
      type="number"
      required
      min="0"
      step="0.01"
      format-thousands
      error-message="El saldo es obligatorio y debe ser un número positivo"
    />
  </FcModal>
</template>

<style scoped>

</style>
