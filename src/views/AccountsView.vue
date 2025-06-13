<script setup>
import {defineAsyncComponent, ref} from 'vue'

const AccountsModalComponent = defineAsyncComponent(/* webpackChunkName: "AccountsModalComponent" */() => import('@/components/accounts/AccountsModalComponent.vue'))

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
      Agregar Cuenta
    </button>
    <AccountsModalComponent
      :show-modal-accounts="showModal"
      @update:showModal="closeModal"
    />
    <div class="account-list">
      <div class="account-card">
        <div class="account-header">
          <h3>Ahorros</h3>
          <p class="account-balance">$2.350.000</p>
        </div>
      </div>
      <div class="account-card">
        <div class="account-header">
          <h3>Efectivo</h3>
          <p class="account-balance">$1.150.000</p>
        </div>
      </div>
      <div class="account-card">
        <div class="account-header">
          <h3>Tarjeta</h3>
          <p class="account-balance">$10.200.000</p>
        </div>
      </div>
      <div class="account-card">
        <div class="account-header">
          <h3>Nequi</h3>
          <p class="account-balance">$200.000</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.account-card {
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  border: 1px solid var(--secondary-color);
  border-radius: 16px;
  padding: 1.25rem 1.5rem;
  color: var(--text-color);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  width: 100%;
  max-width: 320px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.account-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
}

.account-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.account-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--accent-color);
  font-weight: 600;
}

.account-balance {
  margin: 0;
  font-size: 1rem;
  font-weight: bold;
  color: var(--text-color);
}

.account-list {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 2rem;
}

</style>
