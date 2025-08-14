<script setup>
import { defineAsyncComponent, ref } from 'vue'
import EditIcon from '@/assets/icons/edit.svg?raw'
import DeleteIcon from '@/assets/icons/delete.svg?raw'
import { t } from '@/i18n/index.js'

const CategoriesModalComponent = defineAsyncComponent(/* webpackChunkName: "CategoriesModalComponent" */ () => import('@/components/categories/CategoriesModalComponent.vue'))

const showModal = ref(false)

const openModal = () => { showModal.value = true }
const closeModal = () => { showModal.value = false }
</script>

<template>
  <section>
    <button class="button" @click="openModal">
      {{ t('categories.addButton') }}
    </button>
    <CategoriesModalComponent
      :show-modal-categories="showModal"
      @update:showModal="closeModal"
    />
    <section class="category-container">
      <div class="category-table-wrapper">
        <h2>{{ t('categories.incomeTitle') }}</h2>
        <table class="category-table">
          <thead>
            <tr>
              <th>{{ t('categories.table.name') }}</th>
              <th>{{ t('categories.table.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{{ t('categories.samples.salary') }}</td>
              <td class="actions">
                <button class="button button-edit" :aria-label="t('common.edit')" :title="t('common.edit')">
                  <svg class="icon-edit" v-html="EditIcon"></svg>
                </button>
                <button class="button button-delete" :aria-label="t('common.delete')" :title="t('common.delete')">
                  <svg class="icon-delete" v-html="DeleteIcon"></svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="category-table-wrapper">
        <h2>{{ t('categories.expenseTitle') }}</h2>
        <table class="category-table">
          <thead>
          <tr>
            <th>{{ t('categories.table.name') }}</th>
            <th>{{ t('categories.table.actions') }}</th>
          </tr>
          </thead>
          <tbody>
          <tr>
            <td>{{ t('categories.samples.rent') }}</td>
            <td class="actions">
              <button class="button button-edit" :aria-label="t('common.edit')" :title="t('common.edit')">
                <svg class="icon-edit" v-html="EditIcon"></svg>
              </button>
              <button class="button button-delete" :aria-label="t('common.delete')" :title="t('common.delete')">
                <svg class="icon-delete" v-html="DeleteIcon"></svg>
              </button>
            </td>
          </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>

<style scoped>
.category-container {
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
  justify-content: space-between;
}

.category-table-wrapper {
  flex: 1 1 100%;
  max-width: 100%;
}

@media (min-width: 768px) {
  .category-table-wrapper {
    flex: 1 1 48%;
    max-width: 48%;
  }
}

.category-table-wrapper h2 {
  color: var(--accent-color);
  font-size: 1.2rem;
  margin-bottom: 1rem;
  margin-top: 2rem;
}

.category-table {
  width: 100%;
  border-collapse: collapse;
  background-color: var(--primary-color);
  color: var(--text-color);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.category-table th,
.category-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--secondary-color);
}

.category-table th {
  background-color: var(--secondary-color);
  color: var(--accent-color);
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.85rem;
}

.category-table tr:last-child td {
  border-bottom: none;
}

.category-table tr:hover {
  background-color: var(--hover-prrimary-color);
}

.actions {
  display: flex;
  gap: 0.5rem;
}
</style>
