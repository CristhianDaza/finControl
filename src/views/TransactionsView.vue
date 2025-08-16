<script setup>
import { defineAsyncComponent, ref, computed, onMounted, watch } from 'vue'
import { useTransactionsStore } from '@/stores/transactions.js'
import { useAccountsStore } from '@/stores/accounts.js'
import { useDebtsStore } from '@/stores/debts.js'
import { useTransfersStore } from '@/stores/transfers.js'
import FCConfirmModal from '@/components/global/FCConfirmModal.vue'
import FCTransferModal from '@/components/FCTransferModal.vue'
import EditIcon from '@/assets/icons/edit.svg?raw'
import DeleteIcon from '@/assets/icons/delete.svg?raw'
import { t, formatCurrency } from '@/i18n/index.js'
import { useMonthlyRange } from '@/composables/useMonthlyRange.js'
import { useUserPrefs } from '@/composables/useUserPrefs.js'

const TransactionsModalComponent = defineAsyncComponent(() => import('@/components/transactions/TransactionsModalComponent.vue'))
const tx = useTransactionsStore()
const acc = useAccountsStore()
const deb = useDebtsStore()
const tr = useTransfersStore()

const tab = ref('transactions')

const showModal = ref(false)
const modalTitle = ref(t('transactions.addTitle'))
const editing = ref(null)
const confirmOpen = ref(false)
const toDeleteId = ref(null)
const toDeleteTransferId = ref(null)
const transferOpen = ref(false)
const editingTransfer = ref(null)
const busy = ref(false)

// Filtros
const typeFilter = ref('')
const accountFilter = ref('')
const from = ref('')
const to = ref('')
const searchText = ref('')
const minAmount = ref('')

// Periodos disponibles para selects
const { labels: monthLabels, daysInMonth } = useMonthlyRange()
const availableYears = computed(() => tx.availablePeriods.years || [])
const selectedYear = ref(new Date().getFullYear())
const availableMonths = computed(() => (tx.availablePeriods.monthsByYear && tx.availablePeriods.monthsByYear[selectedYear.value]) || [])
const selectedMonth = ref(new Date().getMonth())

const rows = computed(() => tx.items)
const filteredRows = computed(() => {
  let list = rows.value
  if (searchText.value) {
    const q = searchText.value.toLowerCase()
    list = list.filter(it => String(it.note || it.description || '').toLowerCase().includes(q))
  }
  if (minAmount.value) {
    const min = Number(minAmount.value)
    if (!isNaN(min) && min > 0) list = list.filter(it => Number(it.amount || 0) >= min)
  }
  return list
})
const hasItems = computed(() => tx.hasItems)
const isLoading = computed(() => tx.status === 'loading')
const accountsOptions = computed(() => acc.items.map(a => ({ label: a.name, value: a.id })))
const debtsOptions = computed(() => deb.items.map(d => ({ label: d.name, value: d.id })))
const accountNameById = computed(() => acc.items.reduce((m, a) => { m[a.id] = a.name; return m }, {}))

const transfers = computed(() => tr.filtered)
const hasTransfers = computed(() => tr.hasItems)
const isLoadingTransfers = computed(() => tr.status === 'loading')

const { getTxFilters, saveTxFilters } = useUserPrefs()

const openAdd = () => { editing.value = null; modalTitle.value = t('transactions.addTitle'); showModal.value = true }
const openEdit = (item) => { editing.value = item; modalTitle.value = t('transactions.editTitle'); showModal.value = true }
const askRemove = (id) => { toDeleteId.value = id; confirmOpen.value = true }

const openAddTransfer = () => { editingTransfer.value = null; transferOpen.value = true }
const openEditTransfer = (pair) => { editingTransfer.value = pair; transferOpen.value = true }
const askRemoveTransfer = (transferId) => { toDeleteTransferId.value = transferId; confirmOpen.value = true }

const onSave = async (payload) => {
  busy.value = true
  try {
    if (editing.value && editing.value.id) { await tx.edit(editing.value.id, payload) } else { await tx.add(payload) }
    showModal.value = false
    editing.value = null
  } finally { busy.value = false }
}

const onSaveTransfer = async (payload) => {
  busy.value = true
  try {
    if (editingTransfer.value && editingTransfer.value.transferId) { await tr.edit(editingTransfer.value.transferId, payload) } else { await tr.add(payload) }
    transferOpen.value = false
    editingTransfer.value = null
  } finally { busy.value = false }
}

const onConfirmRemove = async () => {
  busy.value = true
  try {
    if (toDeleteTransferId.value) { await tr.remove(toDeleteTransferId.value) } else if (toDeleteId.value) { await tx.remove(toDeleteId.value) }
  } finally { busy.value = false; toDeleteId.value = null; toDeleteTransferId.value = null }
}

const applyFilters = () => {
  const f = {}
  if (typeFilter.value) f.type = typeFilter.value
  if (from.value) f.from = from.value
  if (to.value) f.to = to.value
  tx.setFilters(f)
  const tf = {}
  if (accountFilter.value) tf.accountId = accountFilter.value
  if (from.value) tf.from = from.value
  if (to.value) tf.to = to.value
  tr.setFilters(tf)
}

const pad2 = (n) => String(n).padStart(2, '0')
const setMonth = (m) => {
  selectedMonth.value = m
  const y = selectedYear.value
  const fromStr = `${y}-${pad2(m + 1)}-01`
  const toStr = `${y}-${pad2(m + 1)}-${pad2(daysInMonth(y, m))}`
  from.value = fromStr
  to.value = toStr
  applyFilters()
}

const saveFilters = async () => {
  const current = { type: typeFilter.value || '', from: from.value || '', to: to.value || '' }
  await saveTxFilters(current)
}
const clearFilters = () => { typeFilter.value = ''; from.value = ''; to.value = ''; accountFilter.value=''; searchText.value=''; minAmount.value=''; applyFilters() }
const loadSavedFilters = async () => {
  try {
    const saved = await getTxFilters()
    if (saved) {
      typeFilter.value = saved.type || ''
      from.value = saved.from || ''
      to.value = saved.to || ''
      applyFilters()
    }
  } catch {}
}

const exportCsv = () => {
  const headers = [t('transactions.table.date'), t('transactions.table.description'), t('transactions.table.amount'), t('transactions.table.account'), t('transactions.table.type')]
  const csvRows = [headers.join(',')]
  for (const item of filteredRows.value) {
    const desc = (item.note || item.description || '').replace(/"/g, '""')
    const accName = accountNameById.value[item.accountId] || item.accountId
    const typ = item.type==='income' ? t('transactions.form.income') : item.type==='expense' ? t('transactions.form.expense') : item.type==='debtPayment' ? t('transactions.form.debtPayment') : item.type
    csvRows.push([item.date, `"${desc}"`, item.amount, `"${accName}"`, `"${typ}"`].join(','))
  }
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'transactions.csv'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

onMounted(async () => {
  acc.subscribeMyAccounts(); deb.subscribeMyDebts(); tx.init(); tr.init(); await tx.loadAvailablePeriods();
  // inicializar selects a último periodo disponible si no coincide
  if (!availableYears.value.includes(selectedYear.value)) {
    const lastY = availableYears.value[availableYears.value.length - 1]
    if (lastY != null) selectedYear.value = lastY
  }
  if (!availableMonths.value.includes(selectedMonth.value)) {
    const months = availableMonths.value
    if (months.length) selectedMonth.value = months[months.length - 1]
  }
  setMonth(selectedMonth.value)
  loadSavedFilters()
})

watch(selectedYear, () => {
  if (!availableMonths.value.includes(selectedMonth.value) && availableMonths.value.length) {
    selectedMonth.value = availableMonths.value[availableMonths.value.length - 1]
  }
  setMonth(selectedMonth.value)
})
</script>

<template>
  <section>
    <!-- Barra de acciones separada -->
    <div class="card" style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;justify-content:space-between">
      <div style="display:flex;gap:.5rem;flex-wrap:wrap">
        <button class="button" :class="tab==='transactions'? '' : 'button-secondary'" @click="tab='transactions'">{{ t('navigation.transactions') }}</button>
        <button class="button" :class="tab==='transfers'? '' : 'button-secondary'" @click="tab='transfers'">{{ t('transfers.title') }}</button>
      </div>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap">
        <button v-if="tab==='transactions'" class="button" @click="openAdd" :disabled="busy || isLoading">{{ t('transactions.addTitle') }}</button>
        <button v-else class="button" @click="openAddTransfer" :disabled="busy || isLoadingTransfers">{{ t('common.transfer') }}</button>
        <button class="button button-secondary" @click="exportCsv" :title="t('transactions.exportCsv')">{{ t('transactions.exportCsv') }}</button>
      </div>
    </div>

    <!-- Panel de filtros -->
    <div class="card" style="display:flex;gap:1rem;align-items:flex-end;flex-wrap:wrap; margin-top: .75rem; justify-content:space-between">
      <div style="display:flex;gap:1rem;flex-wrap:wrap">
        <div>
          <label style="display:block;margin-bottom:.25rem">{{ t('common.year') }}</label>
          <select class="input" v-model.number="selectedYear">
            <option v-for="y in availableYears" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
        <div>
          <label style="display:block;margin-bottom:.25rem">{{ t('common.month') }}</label>
          <select class="input" v-model.number="selectedMonth" @change="setMonth(selectedMonth)">
            <option v-for="m in availableMonths" :key="m" :value="m">{{ monthLabels[m] }}</option>
          </select>
        </div>
        <template v-if="tab==='transactions'">
          <div style="min-width:200px">
            <label style="display:block;margin-bottom:.25rem">{{ t('common.type') }}</label>
            <select class="input" v-model="typeFilter" @change="applyFilters">
              <option value="">{{ t('common.all') }}</option>
              <option value="income">{{ t('transactions.form.income') }}</option>
              <option value="expense">{{ t('transactions.form.expense') }}</option>
              <option value="debtPayment">{{ t('transactions.form.debtPayment') }}</option>
            </select>
          </div>
          <div>
            <label style="display:block;margin-bottom:.25rem">{{ t('transactions.filters.search') }}</label>
            <input class="input" type="text" v-model.trim="searchText" placeholder="Ej: arriendo" />
          </div>
          <div>
            <label style="display:block;margin-bottom:.25rem">{{ t('transactions.filters.amount') }}</label>
            <input class="input" type="number" min="0" step="0.01" v-model="minAmount" />
          </div>
          <div>
            <label style="display:block;margin-bottom:.25rem">{{ t('common.from') }}</label>
            <input class="input" type="date" v-model="from" @change="applyFilters" />
          </div>
          <div>
            <label style="display:block;margin-bottom:.25rem">{{ t('common.to') }}</label>
            <input class="input" type="date" v-model="to" @change="applyFilters" />
          </div>
          <div style="display:flex;gap:.5rem;align-items:flex-end;flex-wrap:wrap">
            <button class="button button-secondary" @click="saveFilters" :title="t('transactions.filters.save')">{{ t('transactions.filters.save') }}</button>
            <button class="button button-secondary" @click="clearFilters" :title="t('transactions.filters.clear')">{{ t('transactions.filters.clear') }}</button>
          </div>
        </template>
        <template v-else>
          <div style="min-width:200px">
            <label style="display:block;margin-bottom:.25rem">{{ t('accounts.title') }}</label>
            <select class="input" v-model="accountFilter" @change="applyFilters">
              <option value="">{{ t('common.all') }}</option>
              <option v-for="o in accountsOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </div>
          <div>
            <label style="display:block;margin-bottom:.25rem">{{ t('common.from') }}</label>
            <input class="input" type="date" v-model="from" @change="applyFilters" />
          </div>
          <div>
            <label style="display:block;margin-bottom:.25rem">{{ t('common.to') }}</label>
            <input class="input" type="date" v-model="to" @change="applyFilters" />
          </div>
        </template>
      </div>
    </div>

    <div v-if="tab==='transactions'">
      <div v-if="isLoading" class="card" style="margin-top:1rem">{{ t('common.loading') }}</div>
      <div v-else-if="!hasItems" class="card" style="margin-top:1rem;display:flex;justify-content:space-between;align-items:center">
        <span>{{ t('transactions.empty') }}</span>
        <button class="button" @click="openAdd">{{ t('common.add') }}</button>
      </div>
      <div v-else class="table-container">
        <table>
          <thead>
            <tr>
              <th>{{ t('transactions.table.date') }}</th>
              <th>{{ t('transactions.table.description') }}</th>
              <th>{{ t('transactions.table.amount') }}</th>
              <th>{{ t('transactions.table.account') }}</th>
              <th>{{ t('transactions.table.type') }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredRows" :key="item.id" :class="{ 'row-income': item.type==='income', 'row-expense': item.type==='expense' }">
              <td>{{ item.date }}</td>
              <td>{{ item.note || item.description }}</td>
              <td>{{ formatCurrency(item.amount) }}</td>
              <td>{{ accountNameById[item.accountId] || item.accountId }}</td>
              <td>{{ item.type==='income' ? t('transactions.form.income') : item.type==='expense' ? t('transactions.form.expense') : item.type==='debtPayment' ? t('transactions.form.debtPayment') : item.type }}</td>
              <td>
                <div class="actions">
                  <button class="button button-edit" @click="openEdit(item)" :disabled="busy">
                    <svg class="icon-edit" v-html="EditIcon"></svg>
                  </button>
                  <button class="button button-delete" @click="askRemove(item.id)" :disabled="busy">
                    <svg class="icon-delete" v-html="DeleteIcon"></svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-else>
      <div v-if="isLoadingTransfers" class="card" style="margin-top:1rem">{{ t('common.loading') }}</div>
      <div v-else-if="!hasTransfers" class="card" style="margin-top:1rem;display:flex;justify-content:space-between;align-items:center">
        <span>{{ t('transfers.empty') }}</span>
        <button class="button" @click="openAddTransfer">{{ t('common.transfer') }}</button>
      </div>
      <div v-else class="table-container">
        <table>
          <thead>
            <tr>
              <th>{{ t('transactions.table.date') }}</th>
              <th>{{ t('transactions.table.description') }}</th>
              <th>{{ t('transactions.table.account') }}</th>
              <th>{{ t('transactions.table.amount') }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="pair in transfers" :key="pair.transferId">
              <td>{{ pair.out.date }}</td>
              <td>{{ t('common.transfer') }} · {{ accountNameById[pair.out.fromAccountId] || pair.out.fromAccountId }} → {{ accountNameById[pair.out.toAccountId] || pair.out.toAccountId }} · {{ pair.out.note }}</td>
              <td>{{ accountNameById[pair.out.fromAccountId] || pair.out.fromAccountId }} → {{ accountNameById[pair.out.toAccountId] || pair.out.toAccountId }}</td>
              <td>
                <div style="display:flex;flex-direction:column;gap:.25rem">
                  <span>-{{ formatCurrency(pair.out.amountFrom, pair.out.currencyFrom) }}</span>
                  <span>+{{ formatCurrency(pair.inn.amountTo, pair.inn.currencyTo) }}</span>
                </div>
              </td>
              <td>
                <div class="actions">
                  <button class="button button-edit" @click="openEditTransfer(pair)" :disabled="busy">
                    <svg class="icon-edit" v-html="EditIcon"></svg>
                  </button>
                  <button class="button button-delete" @click="askRemoveTransfer(pair.transferId)" :disabled="busy">
                    <svg class="icon-delete" v-html="DeleteIcon"></svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <TransactionsModalComponent
      :show-modal-transaction="showModal"
      :initial="editing || undefined"
      :title="modalTitle"
      :accounts-options="accountsOptions"
      :debts-options="debtsOptions"
      @save="onSave"
      @update:showModalTransaction="showModal = $event"
    />

    <FCTransferModal
      :open="transferOpen"
      :mode="editingTransfer ? 'edit' : 'create'"
      :value="editingTransfer || undefined"
      @update:open="transferOpen = $event"
      @submit="onSaveTransfer"
    />

    <FCConfirmModal
      :open="confirmOpen"
      :title="toDeleteTransferId ? t('transfers.confirm_delete_title') : t('transactions.confirmDelete.title')"
      :message="toDeleteTransferId ? t('transfers.confirm_delete_message') : t('transactions.confirmDelete.message')"
      :confirm-text="t('common.delete')"
      :cancel-text="t('common.cancel')"
      @update:open="confirmOpen = $event"
      @confirm="onConfirmRemove"
    />
  </section>
</template>

<style scoped>
.table-container {
  width: 100%;
  overflow-x: auto;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
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
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

th, td {
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
  background-color: var(--hover-prrimary-color);
  color: var(--secondary-color);
}

td {
  font-size: 0.95rem;
  color: var(--text-color);
}

td:nth-child(4) {
  font-weight: bold;
  text-transform: uppercase;
}

.actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}
</style>
