<script setup>
import { defineAsyncComponent, ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAccountsStore } from '@/stores/accounts.js'
import { t, formatCurrency } from '@/i18n/index.js'
import EditIcon from '@/assets/icons/edit.svg?raw'
import DeleteIcon from '@/assets/icons/delete.svg?raw'

const AccountsModalComponent = defineAsyncComponent(() => import('@/components/accounts/AccountsModalComponent.vue'))
const FcModal = defineAsyncComponent(() => import('@/components/global/FcModal.vue'))

const router = useRouter()
const acc = useAccountsStore()

const showModal = ref(false)
const modalTitle = ref(t('accounts.addTitle'))
const editing = ref(null)
const confirmOpen = ref(false)
const blockOpen = ref(false)
const toDeleteId = ref(null)
const busy = ref(false)

const isLoading = computed(() => acc.status === 'loading')
const hasItems = computed(() => acc.items.length > 0)
const rows = computed(() => acc.items)

const openCreate = () => { editing.value = null; modalTitle.value = t('accounts.addTitle'); showModal.value = true }
const openEdit = (item) => { editing.value = item; modalTitle.value = t('accounts.editTitle'); showModal.value = true }
const askRemove = (id) => { toDeleteId.value = id; confirmOpen.value = true }

const onSave = async (payload) => {
  busy.value = true
  try {
    if (payload.id) {
      await acc.updateAccountName(payload.id, payload.name)
    } else {
      await acc.createAccount({ name: payload.name, balance: payload.balance, currency: payload.currency })
    }
  } finally { busy.value = false }
}

const onConfirmDelete = async () => {
  if (!toDeleteId.value) return
  busy.value = true
  try {
    await acc.deleteAccount(toDeleteId.value)
  } catch (e) {
    if (e && (e.code === 'account/has-transactions' || /transacciones/i.test(e.message))) {
      blockOpen.value = true
    }
  } finally { busy.value = false; toDeleteId.value = null; confirmOpen.value = false }
}

onMounted(() => { acc.subscribeMyAccounts() })
</script>

<template>
  <section>
    <button class="button" @click="openCreate" :disabled="busy || isLoading">
      {{ t('accounts.addButton') }}
    </button>

    <AccountsModalComponent
      :show-modal-accounts="showModal"
      :initial="editing || undefined"
      :title="modalTitle"
      @save="onSave"
      @update:showModal="showModal = $event"
    />

    <div v-if="isLoading" class="card" style="margin-top:1rem">{{ t('common.loading') }}</div>
    <div v-else-if="!hasItems" class="card" style="margin-top:1rem;display:flex;justify-content:space-between;align-items:center">
      <span>{{ t('common.empty') }}</span>
      <button class="button" @click="openCreate">{{ t('common.add') }}</button>
    </div>

    <div v-else class="account-list">
      <div class="account-card" v-for="item in rows" :key="item.id">
        <div class="account-header">
          <h3>{{ item.name }}</h3>
          <p class="account-balance">{{ formatCurrency(item.balance) }}</p>
        </div>
        <div class="account-actions">
          <button class="button button-edit" :aria-label="t('common.edit')" :title="t('common.edit')" @click="openEdit(item)">
            <svg class="icon-edit" v-html="EditIcon"></svg>
          </button>
          <button class="button button-delete" :aria-label="t('common.delete')" :title="t('common.delete')" @click="askRemove(item.id)">
            <svg class="icon-delete" v-html="DeleteIcon"></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Confirmación de eliminación -->
    <FcModal
      :show-modal="confirmOpen"
      @update:showModal="confirmOpen = $event"
      @accept="onConfirmDelete"
      @cancel-modal="confirmOpen = false"
      :title-modal="t('accounts.confirmDelete.title')"
    >
      <p>{{ t('accounts.confirmDelete.title') }}: {{ t('common.delete') }}?</p>
    </FcModal>

    <!-- Bloqueo por transacciones -->
    <FcModal
      :show-modal="blockOpen"
      @update:showModal="blockOpen = $event"
      @accept="blockOpen = false"
      @cancel-modal="blockOpen = false"
      :title-modal="t('accounts.confirmDelete.title')"
    >
      <p>{{ t('accounts.confirmDelete.message') }}</p>
      <div style="display:flex;gap:.5rem;justify-content:flex-end">
        <button class="button" @click="() => { blockOpen = false; router.push({ name: 'transactions' }) }">{{ t('accounts.confirmDelete.cta') }}</button>
      </div>
    </FcModal>
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

.account-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: end;
  padding-top: 1rem;
}
</style>
