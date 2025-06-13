<script setup>
import { ref, defineAsyncComponent } from 'vue'

import EditIcon from '@/assets/icons/edit.svg?raw'
import DeleteIcon from '@/assets/icons/delete.svg?raw'

const DebtsModalComponent = defineAsyncComponent(/* webpackChunkName: "DebtsModalComponent" */() => import('@/components/debts/DebtsModalComponent.vue'))

const showModal = ref(false)

const openModal = () => {
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
}
</script>

<template>
  <section>
    <button class="button" @click="openModal">
      Agregar Deuda
    </button>
    <DebtsModalComponent
      :show-modal-debts="showModal"
      @update:showModal="closeModal"
    />
    <section class="debt-list">
      <article class="debt-card">
        <header class="debt-header">
          <div class="debt-title">
            <h3>Crédito celular</h3>
          </div>
          <p class="debt-total">Deuda total: $1.200.000</p>
        </header>

        <div class="debt-summary">
          <p class="debt-saldo">Saldo restante: $800.000</p>
        </div>

        <ul class="debt-payments">
          <li>
            <span>🗓 2024-01-15</span>
            <span>$200.000</span>
          </li>
          <li>
            <span>🗓 2024-02-15</span>
            <span>$200.000</span>
          </li>
        </ul>
        <div class="actions">
          <button class="button button-edit">
            <svg class="icon-edit" v-html="EditIcon"></svg>
          </button>
          <button class="button button-delete">
            <svg class="icon-delete" v-html="DeleteIcon"></svg>
          </button>
        </div>
      </article>
    </section>
  </section>
</template>

<style scoped>
.debt-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-top: 2rem;
}

.debt-card {
  background-color: var(--primary-color);
  border: 1px solid var(--secondary-color);
  border-left: 4px solid var(--accent-color);
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.debt-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.debt-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--accent-color);
}

.debt-total {
  font-size: 0.95rem;
  color: var(--muted-text-color);
}

.debt-summary {
  margin-bottom: 1rem;
}

.debt-saldo {
  font-size: 1rem;
  font-weight: bold;
  color: var(--text-color);
}

.debt-payments {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.debt-payments li {
  display: flex;
  justify-content: space-between;
  font-size: 0.95rem;
  padding: 0.5rem;
  background-color: var(--secondary-color);
  border-radius: 6px;
  color: var(--text-color);
}

.actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  justify-content: flex-end;
}
</style>
