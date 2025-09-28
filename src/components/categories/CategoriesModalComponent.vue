<script setup>
import { defineAsyncComponent, ref, watch } from 'vue'
import { t } from '@/i18n/index.js'

const FcModal = defineAsyncComponent(/* webpackChunkName: "fcModal" */() => import('@/components/global/FcModal.vue'))
const FcFormField = defineAsyncComponent(/* webpackChunkName: "fcFormField" */() => import('@/components/global/FcFormField.vue'))

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
  newValue => {
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
    :title-modal="t('categories.addButton')"
  >
    <FcFormField
      v-model="category.name"
      :label="t('categories.form.name')"
      :placeholder="t('categories.form.namePlaceholder')"
      required
      :maxlength="100"
      :error-message="t('categories.form.nameError')"
    />
    <FcFormField
      v-model="category.type"
      :label="t('categories.form.type')"
      type="select"
      :options="[
        { label: t('categories.form.income'), value: 'income' },
        { label: t('categories.form.expense'), value: 'expense' },
      ]"
      required
      :error-message="t('categories.form.typeError')"
    />
  </FcModal>
</template>

<style scoped>

</style>
