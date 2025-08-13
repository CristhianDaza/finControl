<script setup>
import { defineAsyncComponent, ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDebtsStore } from '@/stores/debts.js'
import { useTransactions } from '@/composables/useTransactions.js'
import { t } from '@/i18n/index.js'
import EditIcon from '@/assets/icons/edit.svg?raw'
import DeleteIcon from '@/assets/icons/delete.svg?raw'

const DebtsModalComponent = defineAsyncComponent(() => import('@/components/debts/DebtsModalComponent.vue'))
const FcModal = defineAsyncComponent(() => import('@/components/global/FcModal.vue'))

const router = useRouter()
const deb = useDebtsStore()
const { fetchTransactions } = useTransactions()

const showModal = ref(false)
const modalTitle = ref(t('debts.addTitle'))
const editing = ref(null)
const confirmOpen = ref(false)
const blockOpen = ref(false)
const toDeleteId = ref(null)
const busy = ref(false)

const isLoading = computed(() => deb.status === 'loading')
const hasItems = computed(() => deb.items.length > 0)
const rows = computed(() => deb.items)

const paymentsByDebt = ref({})
const opened = ref({})

const openCreate = () => { editing.value = null; modalTitle.value = t('debts.addTitle'); showModal.value = true }
const openEdit = (item) => { editing.value = item; modalTitle.value = t('debts.editTitle'); showModal.value = true }
const askRemove = (id) => { toDeleteId.value = id; confirmOpen.value = true }

const ensurePaymentsLoaded = async (debtId) => {
  if (paymentsByDebt.value[debtId]) return
  const list = await fetchTransactions({ type: 'debtPayment', debtId, orderBy: [{ field: 'date', dir: 'desc' }, { field: 'createdAt', dir: 'desc' }] })
  paymentsByDebt.value[debtId] = list
}

const toggleOpen = async (debtId) => {
  opened.value[debtId] = !opened.value[debtId]
  if (opened.value[debtId]) await ensurePaymentsLoaded(debtId)
}

const onSave = async (payload) => {
  busy.value = true
  try {
    if (payload.id) {
      await deb.update(payload.id, { name: payload.name, dueDate: payload.dueDate })
    } else {
      await deb.create({ name: payload.name, amount: payload.amount, dueDate: payload.dueDate })
    }
    showModal.value = false
    editing.value = null
  } finally { busy.value = false }
}

const onConfirmDelete = async () => {
  if (!toDeleteId.value) return
  busy.value = true
  try {
    await deb.remove(toDeleteId.value)
  } catch (e) {
    if (e && (e.code === 'debt/has-payments' || /pagos/i.test(e.message))) blockOpen.value = true
  } finally { busy.value = false; toDeleteId.value = null; confirmOpen.value = false }
}

onMounted(() => { deb.subscribeMyDebts() })
</script>

<template>
  <section>
    <button class="button" @click="openCreate" :disabled="busy || isLoading">
      {{ t('debts.addButton') }}
    </button>

    <DebtsModalComponent
      :show-modal-debts="showModal"
      :initial="editing || undefined"
      :title="modalTitle"
      @save="onSave"
      @update:showModal="showModal = $event"
    />

    <div v-if="isLoading" class="card" style="margin-top:1rem">{{ t('common.loading') }}</div>
    <div v-else-if="!hasItems" class="card" style="margin-top:1rem;display:flex;justify-content:space-between;align-items:center">
      <span>{{ t('debts.title') }}: 0</span>
      <button class="button" @click="openCreate">{{ t('common.add') }}</button>
    </div>

    <section v-else class="debt-list">
      <article class="debt-card" v-for="d in rows" :key="d.id">
        <header class="debt-header">
          <div class="debt-title" @click="toggleOpen(d.id)" style="cursor:pointer">
            <h3>{{ d.name }}</h3>
          </div>
          <p class="debt-total">{{ t('debts.card.total') }}: ${{ Number(d.originalAmount||0).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</p>
        </header>

        <div class="debt-summary">
          <p class="debt-saldo">{{ t('debts.card.remaining') }}: ${{ Number(d.remainingAmount||0).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</p>
          <p class="debt-saldo">{{ t('debts.card.status') }}: {{ d.status === 'paid' ? t('debts.card.paid') : t('debts.card.active') }}</p>
        </div>

        <ul v-if="opened[d.id]" class="debt-payments">
          <li style="font-weight:600">{{ t('debts.card.payments') }}</li>
          <li v-if="!(paymentsByDebt[d.id] && paymentsByDebt[d.id].length)">{{ t('debts.card.emptyPayments') }}</li>
          <li v-for="p in (paymentsByDebt[d.id]||[])" :key="p.id">
            <span>🗓 {{ p.date }}</span>
            <span>${{ Number(p.amount||0).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
          </li>
        </ul>

        <div class="actions">
          <button class="button button-edit" :aria-label="t('common.edit')" title="Editar" @click="openEdit(d)">
            <svg class="icon-edit" v-html="EditIcon"></svg>
          </button>
          <button class="button button-delete" :aria-label="t('common.delete')" title="Eliminar" @click="askRemove(d.id)">
            <svg class="icon-delete" v-html="DeleteIcon"></svg>
          </button>
        </div>
      </article>
    </section>

    <FcModal
      :show-modal="confirmOpen"
      @update:showModal="confirmOpen = $event"
      @accept="onConfirmDelete"
      @cancel-modal="confirmOpen = false"
      :title-modal="t('debts.confirmDelete.title')"
    >
      <p>{{ t('debts.confirmDelete.title') }}: {{ t('common.delete') }}?</p>
    </FcModal>

    <FcModal
      :show-modal="blockOpen"
      @update:showModal="blockOpen = $event"
      @accept="blockOpen = false"
      @cancel-modal="blockOpen = false"
      :title-modal="t('debts.confirmDelete.title')"
    >
      <p>{{ t('debts.confirmDelete.message') }}</p>
      <div style="display:flex;gap:.5rem;justify-content:flex-end">
        <button class="button" @click="() => { blockOpen = false; router.push({ name: 'transactions' }) }">{{ t('debts.confirmDelete.cta') }}</button>
      </div>
    </FcModal>
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
