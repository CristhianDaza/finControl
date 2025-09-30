<script setup>
import { defineAsyncComponent, ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDebtsStore } from '@/stores/debts.js'
import { useTransactions } from '@/composables/useTransactions.js'
import { t, formatDate } from '@/i18n/index.js'
import { formatAmount } from '@/utils/formatters.js'
import EditIcon from '@/assets/icons/edit.svg?raw'
import DeleteIcon from '@/assets/icons/delete.svg?raw'
import { useCurrenciesStore } from '@/stores/currencies.js'
import { useAuthStore } from '@/stores/auth.js'

const DebtsModalComponent = defineAsyncComponent(/* webpackChunkName: "debtsModalComponent" */ () => import('@/components/debts/DebtsModalComponent.vue'))
const FcModal = defineAsyncComponent(/* webpackChunkName: "fcModal" */ () => import('@/components/global/FcModal.vue'))

const router = useRouter()
const deb = useDebtsStore()
const { fetchTransactions } = useTransactions()
const currencies = useCurrenciesStore()
if (currencies.status === 'idle') currencies.subscribe()
const auth = useAuthStore()

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

const openCreate = () => {
  if (!auth.canWrite) return
  editing.value = null
  modalTitle.value = t('debts.addTitle')
  showModal.value = true
}

const openEdit = (item) => {
  if (!auth.canWrite) return
  editing.value = item
  modalTitle.value = t('debts.editTitle')
  showModal.value = true
}

const askRemove = (id) => {
  if (!auth.canWrite) return
  toDeleteId.value = id
  confirmOpen.value = true
}

const ensurePaymentsLoaded = async (debtId) => {
  if (paymentsByDebt.value[debtId]) return
  paymentsByDebt.value[debtId] = await fetchTransactions({
    type: 'debtPayment',
    debtId,
    orderBy: [
      { field: 'date', dir: 'desc' },
      { field: 'createdAt', dir: 'desc' }
    ]
  })
}

const toggleOpen = async (debtId) => {
  opened.value[debtId] = !opened.value[debtId]
  if (opened.value[debtId]) await ensurePaymentsLoaded(debtId)
}

const onSave = async (payload) => {
  if (!auth.canWrite) return
  busy.value = true
  try {
    if (payload.id) {
      await deb.update(payload.id, {
        name: payload.name,
        dueDate: payload.dueDate
      })
    } else {
      await deb.create({
        name: payload.name,
        amount: payload.amount,
        dueDate: payload.dueDate,
        currency: payload.currency
      })
    }
    showModal.value = false
    editing.value = null
  } finally {
    busy.value = false
  }
}

const onConfirmDelete = async () => {
  if (!auth.canWrite) return
  if (!toDeleteId.value) return
  busy.value = true
  try {
    await deb.remove(toDeleteId.value)
  } catch (e) {
    if (
      e &&
      (e.code === 'debt/has-payments' || /pagos/i.test(e.message))
    )
      blockOpen.value = true
  } finally {
    busy.value = false
    toDeleteId.value = null
    confirmOpen.value = false
  }
}

onMounted(() => {
  deb.subscribeMyDebts()
})
</script>

<template>
  <section>
    <div class="card page-header">
      <h2 class="page-title">{{ t('debts.title') }}</h2>
      <div class="page-actions">
        <button
          class="button"
          @click="openCreate"
          :disabled="busy || isLoading || !auth.canWrite"
          :aria-disabled="!auth.canWrite"
        >
          {{ t('debts.addButton') }}
        </button>
      </div>
    </div>

    <DebtsModalComponent
      :show-modal-debts="showModal"
      :initial="editing || undefined"
      :title="modalTitle"
      @save="onSave"
      @update:showModal="showModal = $event"
    />

    <div v-if="isLoading" class="card mt-1">
      {{ t('common.loading') }}
    </div>
    <div
      v-else-if="!hasItems"
      class="card mt-1 empty-state"
    >
      <span>{{ t('debts.title') }}: 0</span>
      <button
        class="button"
        @click="openCreate"
        :disabled="!auth.canWrite"
        :aria-disabled="!auth.canWrite"
      >
        {{ t('common.add') }}
      </button>
    </div>

    <div v-else class="table-container">
      <table>
        <thead>
          <tr>
            <th>{{ t('recurring.table.name') }}</th>
            <th>{{ t('debts.card.total') }}</th>
            <th>{{ t('debts.card.remaining') }}</th>
            <th>{{ t('debts.form.dueDate') }}</th>
            <th>{{ t('debts.card.status') }}</th>
            <th>{{ t('transactions.table.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="d in rows" :key="d.id">
            <tr>
              <td :data-label="t('recurring.table.name')">
                <button
                  class="link-like"
                  @click="toggleOpen(d.id)"
                >
                  {{ d.name }}
                </button>
              </td>
              <td :data-label="t('debts.card.total')">
                {{ formatAmount(d.originalAmount, d.currency || currencies.defaultCurrency.code) }}
              </td>
              <td :data-label="t('debts.card.remaining')">
                {{ formatAmount(d.remainingAmount, d.currency || currencies.defaultCurrency.code) }}
              </td>
              <td :data-label="t('debts.form.dueDate')">
                {{ d.dueDate || '-' }}
              </td>
              <td :data-label="t('debts.card.status')">
                <span
                  class="badge"
                  :class="d.status === 'paid' ? 'badge-green' : 'badge-blue'"
                >
                  {{ d.status === 'paid' ? t('debts.card.paid') : t('debts.card.active') }}
                </span>
              </td>
              <td :data-label="t('transactions.table.actions')">
                <div class="actions">
                  <FcTooltip :content="t('common.edit')" placement="top">
                    <button
                      class="button button-edit"
                      :aria-label="t('common.edit')"
                      @click="openEdit(d)"
                      :disabled="!auth.canWrite"
                      :aria-disabled="!auth.canWrite"
                    >
                      <svg class="icon-edit" v-html="EditIcon"></svg>
                    </button>
                  </FcTooltip>
                  <FcTooltip :content="t('common.delete')" placement="top">
                    <button
                      class="button button-delete"
                      :aria-label="t('common.delete')"
                      @click="askRemove(d.id)"
                      :disabled="!auth.canWrite"
                      :aria-disabled="!auth.canWrite"
                    >
                      <svg class="icon-delete" v-html="DeleteIcon"></svg>
                    </button>
                  </FcTooltip>
                </div>
              </td>
            </tr>
            <tr v-if="opened[d.id]">
              <td :colspan="6" class="details-cell">
                <div class="payments-block">
                  <div class="payments-header">
                    {{ t('debts.card.payments') }}
                  </div>
                  <div
                    v-if="!(paymentsByDebt[d.id] && paymentsByDebt[d.id].length)"
                    class="empty"
                  >
                    {{ t('debts.card.emptyPayments') }}
                  </div>
                  <ul v-else class="payments-list">
                    <li v-for="p in paymentsByDebt[d.id]" :key="p.id">
                      <span>📓 {{ formatDate(p.date) }}</span>
                      <span>
                        {{ formatAmount(p.amount, p.currency || d.currency || currencies.defaultCurrency.code) }}
                      </span>
                    </li>
                  </ul>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <FcModal
      :show-modal="confirmOpen"
      @update:showModal="confirmOpen = $event"
      @accept="onConfirmDelete"
      @cancel-modal="confirmOpen = false"
      :title-modal="t('debts.confirmDelete.title')"
      :accept-disabled="!auth.canWrite"
    >
      <p>
        {{ t('debts.confirmDelete.title') }}: {{ t('common.delete') }}?
      </p>
    </FcModal>
    <FcModal
      :show-modal="blockOpen"
      @update:showModal="blockOpen = $event"
      @accept="blockOpen = false"
      @cancel-modal="blockOpen = false"
      :title-modal="t('debts.confirmDelete.title')"
    >
      <p>{{ t('debts.confirmDelete.message') }}</p>
      <div class="modal-actions-right">
        <button
          class="button"
          @click="() => { blockOpen = false; router.push({ name: 'transactions' }) }"
        >
          {{ t('debts.confirmDelete.cta') }}
        </button>
      </div>
    </FcModal>
  </section>
</template>

<style scoped>
.table-container {
  width: 100%;
  overflow-x: auto;
  border-radius: 12px;
  box-shadow: 0 2px 8px var(--shadow-elev-1);
}
.table-container::-webkit-scrollbar {
  height: 8px;
}
.table-container::-webkit-scrollbar-thumb {
  background-color: var(--secondary-color);
  border-radius: 4px;
}

table {
  margin-top: 2rem;
  width: 100%;
  border-collapse: collapse;
  background-color: var(--primary-color);
  color: var(--text-color);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px var(--shadow-elev-1);
}
th,
td {
  padding: 1rem 1.2rem;
  text-align: left;
  border-bottom: 1px solid var(--secondary-color);
}
th {
  background-color: var(--secondary-color);
  color: var(--accent-color);
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.85rem;
  letter-spacing: 1px;
}
tr:last-child td {
  border-bottom: none;
}
tr:hover {
  background-color: color-mix(in srgb, var(--primary-color) 88%, var(--text-color));
}

.actions {
  display: flex;
  gap: .5rem;
  justify-content: flex-end;
}
.actions button[disabled] {
  opacity: .55;
  cursor: not-allowed;
}
.badge {
  display: inline-block;
  padding: .125rem .5rem;
  border-radius: 999px;
  font-size: .75rem;
}
.badge-blue {
  background: var(--accent-color);
  color: var(--background-color);
}
.badge-green {
  background: var(--hover-success-color);
  color: var(--white);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: .5rem;
  flex-wrap: wrap;
}
.page-title {
  margin: 0;
}
.page-actions {
  display: flex;
  gap: .75rem;
  align-items: center;
  flex-wrap: wrap;
}

.link-like {
  background: none;
  border: none;
  color: var(--text-color);
  cursor: pointer;
  padding: 0;
  text-align: left;
}
.link-like:hover {
  color: var(--accent-color);
}

.details-cell {
  background: var(--secondary-color);
}
.payments-block {
  padding: .75rem 0;
}
.payments-header {
  font-weight: 600;
  color: var(--muted-text-color);
  margin-bottom: .5rem;
}
.payments-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: .25rem;
}
.payments-list li {
  display: flex;
  justify-content: space-between;
  padding: .5rem;
  background: color-mix(in srgb, var(--secondary-color) 85%, var(--text-color));
  border-radius: 6px;
}
.empty {
  color: var(--muted-text-color);
}

.mt-1 {
  margin-top: 1rem;
}
.empty-state {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.modal-actions-right {
  display: flex;
  gap: .5rem;
  justify-content: flex-end;
}
</style>
