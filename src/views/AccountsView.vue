<script setup>
import { defineAsyncComponent, ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAccountsStore } from '@/stores/accounts.js'
import { t } from '@/i18n/index.js'
import { formatAmount } from '@/utils/formatters.js'
import EditIcon from '@/assets/icons/edit.svg?raw'
import DeleteIcon from '@/assets/icons/delete.svg?raw'
import { useAuthStore } from '@/stores/auth.js'
import VirtualAccountsGrid from '@/components/accounts/VirtualAccountsGrid.vue'

const AccountsModalComponent = defineAsyncComponent(() => import('@/components/accounts/AccountsModalComponent.vue'))
const FcModal = defineAsyncComponent(() => import('@/components/global/FcModal.vue'))

const router = useRouter()
const acc = useAccountsStore()
const auth = useAuthStore()

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

// Performance optimization: use virtual scrolling for large datasets
const useVirtualScrolling = computed(() => rows.value.length > 20)
const virtualScrollHeight = computed(() => {
  const viewportHeight = window.innerHeight
  return Math.min(600, Math.max(400, viewportHeight - 300))
})
const isDev = computed(() => import.meta.env.DEV)

const openCreate = () => { if (!auth.canWrite) return; editing.value = null; modalTitle.value = t('accounts.addTitle'); showModal.value = true }
const openEdit = (item) => { if (!auth.canWrite) return; editing.value = item; modalTitle.value = t('accounts.editTitle'); showModal.value = true }
const askRemove = (id) => { if (!auth.canWrite) return; toDeleteId.value = id; confirmOpen.value = true }

const onSave = async (payload) => { if (!auth.canWrite) return; busy.value = true; try { if (payload.id) { await acc.updateAccountName(payload.id, payload.name) } else { await acc.createAccount({ name: payload.name, balance: payload.balance, currency: payload.currency }) } } finally { busy.value = false } }

const onConfirmDelete = async () => { if (!auth.canWrite) return; if (!toDeleteId.value) return; busy.value = true; try { await acc.deleteAccount(toDeleteId.value) } catch (e) { if (e && (e.code === 'account/has-transactions' || /transacciones/i.test(e.message))) { blockOpen.value = true } } finally { busy.value = false; toDeleteId.value = null; confirmOpen.value = false } }

onMounted(() => { acc.subscribeMyAccounts() })
</script>

<template>
  <section>
    <div class="card" style="display:flex;justify-content:space-between;align-items:center;gap:.5rem;flex-wrap:wrap">
      <h2 style="margin:0">{{ t('accounts.title') }}</h2>
      <div style="display:flex;gap:.5rem">
        <button class="button" @click="openCreate" :disabled="busy || isLoading || !auth.canWrite" :aria-disabled="!auth.canWrite">{{ t('accounts.addButton') }}</button>
      </div>
    </div>

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
      <button class="button" @click="openCreate" :disabled="!auth.canWrite" :aria-disabled="!auth.canWrite">{{ t('common.add') }}</button>
    </div>

    <!-- Virtual scrolling for large datasets -->
    <VirtualAccountsGrid
      v-if="useVirtualScrolling"
      :items="rows"
      :can-write="auth.canWrite"
      :container-height="virtualScrollHeight"
      :show-performance-info="isDev"
      @edit="openEdit"
      @delete="askRemove"
    />
    
    <!-- Traditional grid for smaller datasets -->
    <div v-else class="account-list">
      <div class="account-card" v-for="item in rows" :key="item.id">
        <div class="account-header">
          <h3>{{ item.name }}</h3>
          <p class="account-balance">{{ formatAmount(item.balance, item.currency || 'COP') }}</p>
        </div>
        <div class="account-actions">
          <button class="button button-edit" :aria-label="t('common.edit')" :title="t('common.edit')" @click="openEdit(item)" :disabled="!auth.canWrite" :aria-disabled="!auth.canWrite">
            <svg class="icon-edit" v-html="EditIcon"></svg>
          </button>
          <button class="button button-delete" :aria-label="t('common.delete')" :title="t('common.delete')" @click="askRemove(item.id)" :disabled="!auth.canWrite" :aria-disabled="!auth.canWrite">
            <svg class="icon-delete" v-html="DeleteIcon"></svg>
          </button>
        </div>
      </div>
    </div>

    <FcModal
      :show-modal="confirmOpen"
      @update:showModal="confirmOpen = $event"
      @accept="onConfirmDelete"
      @cancel-modal="confirmOpen = false"
      :title-modal="t('accounts.confirmDelete.title')"
      :accept-disabled="!auth.canWrite"
    >
      <p>{{ t('accounts.confirmDelete.title') }}: {{ t('common.delete') }}?</p>
    </FcModal>

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
  box-shadow: 0 4px 12px var(--shadow-elev-2);
  width: 100%;
  max-width: 320px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.account-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 16px var(--shadow-elev-3);
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

.account-actions button[disabled] { opacity:.55; cursor:not-allowed }
</style>
