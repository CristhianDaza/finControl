<script setup>
import { defineAsyncComponent, ref, computed, onMounted } from 'vue'
import { useAccountsStore } from '@/stores/accounts.js'
import { useDebtsStore } from '@/stores/debts.js'
import { useRecurringStore } from '@/stores/recurring.js'
import { t, formatCurrency } from '@/i18n/index.js'

const FcModal = defineAsyncComponent(() => import('@/components/global/FcModal.vue'))
const FcFormField = defineAsyncComponent(() => import('@/components/global/FcFormField.vue'))

const acc = useAccountsStore()
const deb = useDebtsStore()
const rec = useRecurringStore()

const showModal = ref(false)
const isEditing = ref(false)
const editingId = ref(null)

const form = ref({
  name: '',
  type: 'expense',
  amount: 0,
  account: '',
  debt: '',
  note: '',
  frequency: 'monthly',
  nextRunAt: new Date().toISOString().split('T')[0],
  paused: false,
})

const accountsOptions = computed(() => acc.items.map(a => ({ label: a.name, value: a.id })))
const debtsOptions = computed(() => deb.items.map(d => ({ label: d.name, value: d.id })))
const isDebtPayment = computed(() => form.value.type === 'debtPayment')
const accountNameById = computed(() => acc.items.reduce((m, a) => { m[a.id] = a.name; return m }, {}))

const resetForm = () => {
  form.value = { name: '', type: 'expense', amount: 0, account: '', debt: '', note: '', frequency: 'monthly', nextRunAt: new Date().toISOString().split('T')[0], paused: false }
  editingId.value = null
  isEditing.value = false
}

const openCreate = () => { resetForm(); showModal.value = true }
const openEdit = (tpl) => {
  form.value = {
    name: tpl.name || '',
    type: tpl.type || 'expense',
    amount: Number(tpl.amount) || 0,
    account: tpl.accountId || tpl.account || '',
    debt: tpl.debtId || '',
    note: tpl.note || '',
    frequency: tpl.frequency || 'monthly',
    nextRunAt: tpl.nextRunAt || new Date().toISOString().split('T')[0],
    paused: !!tpl.paused,
  }
  editingId.value = tpl.id
  isEditing.value = true
  showModal.value = true
}

const save = async () => {
  const payload = {
    name: form.value.name,
    type: form.value.type,
    amount: Number(form.value.amount),
    accountId: form.value.account,
    debtId: form.value.debt || undefined,
    note: form.value.note,
    frequency: form.value.frequency,
    nextRunAt: form.value.nextRunAt,
    paused: !!form.value.paused,
  }
  if (isEditing.value && editingId.value) await rec.edit(editingId.value, payload)
  else await rec.add(payload)
  showModal.value = false
  resetForm()
}

const askPauseResume = async (tpl) => {
  if (tpl.paused) await rec.resume(tpl.id)
  else await rec.pause(tpl.id)
}

const remove = async (id) => { await rec.remove(id) }

onMounted(async () => { await acc.subscribeMyAccounts(); await deb.subscribeMyDebts(); await rec.init() })
</script>

<template>
  <section>
    <div class="card page-header">
      <h2 class="page-title">{{ t('recurring.title') }}</h2>
      <div class="page-actions">
        <button class="button" @click="openCreate">{{ t('recurring.add') }}</button>
      </div>
    </div>

    <div v-if="rec.status==='loading'" class="card" style="margin-top:1rem">{{ t('common.loading') }}</div>
    <div v-else-if="!rec.items.length" class="card" style="margin-top:1rem;display:flex;justify-content:space-between;align-items:center">
      <span>{{ t('recurring.empty') }}</span>
      <button class="button" @click="openCreate">{{ t('common.add') }}</button>
    </div>
    <div v-else class="table-container">
      <table>
        <thead>
          <tr>
            <th>{{ t('recurring.table.name') }}</th>
            <th>{{ t('recurring.table.next') }}</th>
            <th>{{ t('recurring.table.amount') }}</th>
            <th>{{ t('recurring.table.account') }}</th>
            <th>{{ t('recurring.table.type') }}</th>
            <th>{{ t('recurring.table.frequency') }}</th>
            <th>{{ t('recurring.table.status') }}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tpl in rec.items" :key="tpl.id">
            <td :data-label="t('recurring.table.name')">{{ tpl.name || tpl.note || '-' }}</td>
            <td :data-label="t('recurring.table.next')">{{ tpl.nextRunAt }}</td>
            <td :data-label="t('recurring.table.amount')">{{ formatCurrency(Number(tpl.amount||0)) }}</td>
            <td :data-label="t('recurring.table.account')">{{ accountNameById[tpl.accountId] || tpl.accountId }}</td>
            <td :data-label="t('recurring.table.type')">{{ tpl.type==='income' ? t('transactions.form.income') : tpl.type==='expense' ? t('transactions.form.expense') : tpl.type==='debtPayment' ? t('transactions.form.debtPayment') : tpl.type }}</td>
            <td :data-label="t('recurring.table.frequency')">{{ t(`recurring.frequency.${tpl.frequency||'monthly'}`) }}</td>
            <td :data-label="t('recurring.table.status')">
              <span class="badge" :class="tpl.paused? 'badge-gray': 'badge-green'">{{ tpl.paused ? t('recurring.paused') : t('recurring.active') }}</span>
            </td>
            <td :data-label="t('transactions.table.actions')">
              <div class="actions">
                <button class="button button-edit" @click="openEdit(tpl)">{{ t('common.edit') }}</button>
                <button class="button button-secondary" @click="askPauseResume(tpl)">{{ tpl.paused ? t('recurring.resume') : t('recurring.pause') }}</button>
                <button class="button button-delete" @click="remove(tpl.id)">{{ t('common.delete') }}</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <FcModal :show-modal="showModal" :title-modal="isEditing? t('recurring.edit') : t('recurring.add')" @accept="save" @cancel-modal="showModal=false">
      <div class="grid modal-grid">
        <FcFormField v-model="form.name" :label="t('recurring.form.name')" :maxlength="50" />
        <FcFormField v-model="form.type" :label="t('transactions.form.type')" type="select" :options="[
          { label: t('transactions.form.income'), value: 'income' },
          { label: t('transactions.form.expense'), value: 'expense' },
          { label: t('transactions.form.debtPayment'), value: 'debtPayment' }
        ]" required />
        <FcFormField v-model="form.amount" :label="t('transactions.form.amount')" type="number" min="1" step="0.01" format-thousands required />
        <FcFormField v-if="isDebtPayment" v-model="form.debt" :label="t('transactions.form.debt')" type="select" :options="debtsOptions" required />
        <FcFormField v-model="form.account" :label="t('transactions.form.account')" type="select" :options="accountsOptions" required />
        <FcFormField v-model="form.note" :label="t('transfers.note')" />
        <FcFormField v-model="form.frequency" :label="t('recurring.form.frequency')" type="select" :options="[
          { label: t('recurring.frequency.monthly'), value: 'monthly' },
          { label: t('recurring.frequency.biweekly'), value: 'biweekly' },
          { label: t('recurring.frequency.weekly'), value: 'weekly' },
          { label: t('recurring.frequency.yearly'), value: 'yearly' }
        ]" required />
        <FcFormField v-model="form.nextRunAt" :label="t('recurring.form.nextRunAt')" type="date" required />
        <div>
          <label style="display:block;margin-bottom:.25rem">{{ t('recurring.form.paused') }}</label>
          <input type="checkbox" v-model="form.paused" />
        </div>
      </div>
    </FcModal>
  </section>
</template>

<style scoped>
.table-container { width:100%; overflow-x:auto; border-radius:12px; box-shadow:0 2px 8px var(--shadow-elev-1) }

.table-container::-webkit-scrollbar { height: 8px }
.table-container::-webkit-scrollbar-thumb { background-color: var(--secondary-color); border-radius: 4px }

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

tr:last-child td { border-bottom: none }
tr:hover { background-color: color-mix(in srgb, var(--primary-color) 88%, var(--text-color)); }

.badge { display:inline-block; padding:.125rem .5rem; border-radius:999px; font-size:.75rem }
.badge-gray { background: var(--badge-gray-color); color: var(--white) }
.badge-green { background: var(--hover-success-color); color: var(--white) }
.actions { display:flex; gap:.5rem; justify-content:flex-end }

.page-header { display:flex; justify-content:space-between; align-items:center; gap:.5rem; flex-wrap:wrap }
.page-title { margin:0 }
.page-actions { display:flex; gap:.75rem; align-items:center; flex-wrap:wrap }
.modal-grid { grid-template-columns: repeat(auto-fit, minmax(240px,1fr)); gap: 1rem; }
</style>
