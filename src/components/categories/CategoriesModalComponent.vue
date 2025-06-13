<script setup>
import { defineAsyncComponent, ref, watch } from 'vue'

const FcModal = defineAsyncComponent(/* webpackChunkName: "FcModal" */() => import('@/components/global/FcModal.vue'))
const FcFormField = defineAsyncComponent(/* webpackChunkName: "FcFormField" */() => import('@/components/global/FcFormField.vue'))

const props = defineProps({
  showModalCategories: {
    type: Boolean,
    default: false,
    attribute: 'show-modal-categories'
  }
})

const category = ref({
  name: '',
  type: '',
  id: ''
})
const showModal = ref(false)

const handleAccept = () => {
  category.value.id = crypto.randomUUID()
  resetCategory()
}

const handleCancel = () => {
  resetCategory()
}

const resetCategory = () => {
  category.value = {
    name: '',
    type: '',
    id: ''
  }
}

watch(
  () => props.showModalCategories,
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
    title-modal="Agregar Categoría"
  >
    <FcFormField
      v-model="category.name"
      label="Nombre de la categoría"
      placeholder="Ej: Alimentación"
      required
      :maxlength="100"
      error-message="El nombre es obligatorio y no puede exceder los 100 caracteres."
    />
    <FcFormField
      v-model="category.type"
      label="Tipo"
      type="select"
      :options="[
        { label: 'Ingreso', value: 'income' },
        { label: 'Egreso', value: 'expense' },
      ]"
      required
      error-message="Selecciona un tipo de categoría."
    />
  </FcModal>
</template>

<style scoped>

</style>
