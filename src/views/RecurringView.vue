<script setup>
import { defineAsyncComponent, ref, computed, onMounted } from 'vue'
import { useAccountsStore } from '@/stores/accounts.js'
import { useDebtsStore } from '@/stores/debts.js'
import { useRecurringStore } from '@/stores/recurring.js'
import { useAuthStore } from '@/stores/auth.js'
import { t } from '@/i18n/index.js'
import { formatAmount } from '@/utils/formatters.js'
import EditIcon from '@/assets/icons/edit.svg?raw'
import PauseIcon from '@/assets/icons/pause.svg?raw'
import PlayIcon from '@/assets/icons/play.svg?raw'
import DeleteIcon from '@/assets/icons/delete.svg?raw'
import RunIcon from '@/assets/icons/run.svg?raw'

const FcModal = defineAsyncComponent(/* webpackChunkName: "fcModal" */() => import('@/components/global/FcModal.vue'))
const FcFormField = defineAsyncComponent(/* webpackChunkName: "fcFormField" */() => import('@/components/global/FcFormField.vue'))
const FCConfirmModal = defineAsyncComponent(/* webpackChunkName: "fCConfirmModal" */() => import('@/components/global/FCConfirmModal.vue'))

const acc = useAccountsStore()
const deb = useDebtsStore()
const rec = useRecurringStore()
const auth = useAuthStore()

const showModal = ref(false)
const isEditing = ref(false)
const editingId = ref(null)

const showRunConfirm = ref(false)
const runUpdateFromNow = ref(false)
const runTarget = ref(null)

const form = ref({
  name: '',
  type: 'expense',
  amount: 0,
  account: '',
  debt: '',
  note: '',
  frequency: 'monthly',
  nextRunAt: new Date().toISOString().split('T')[0],
  paused: false
})

const accountsOptions = computed(() =>
  acc.items.map(a => ({
    label: a.name,
    value: a.id
  }))
)

const debtsOptions = computed(() =>
  deb.items.map(d => ({
    label: d.name,
    value: d.id
  }))
)

const isDebtPayment = computed(() => form.value.type === 'debtPayment')

const accountNameById = computed(() =>
  acc.items.reduce((m, a) => {
    m[a.id] = a.name
    return m
  }, {})
)

const resetForm = () => {
  form.value = {
    name: '',
    type: 'expense',
    amount: 0,
    account: '',
    debt: '',
    note: '',
    frequency: 'monthly',
    nextRunAt: new Date().toISOString().split('T')[0],
    paused: false
  }
  editingId.value = null
  isEditing.value = false
}

const openCreate = () => {
  if (!auth.canWrite) return
  resetForm()
  showModal.value = true
}

const openEdit = tpl => {
  if (!auth.canWrite) return
  form.value = {
    name: tpl.name || '',
    type: tpl.type || 'expense',
    amount: Number(tpl.amount) || 0,
    account: tpl.accountId || tpl.account || '',
    debt: tpl.debtId || '',
    note: tpl.note || '',
    frequency: tpl.frequency || 'monthly',
    nextRunAt: tpl.nextRunAt || new Date().toISOString().split('T')[0],
    paused: !!tpl.paused
  }
  editingId.value = tpl.id
  isEditing.value = true
  showModal.value = true
}

const save = async () => {
  if (!auth.canWrite) return
  const debtId = form.value.type === 'debtPayment'
    ? (form.value.debt || null)
    : null
  const payload = {
    name: form.value.name,
    type: form.value.type,
    amount: Number(form.value.amount),
    accountId: form.value.account,
    debtId,
    note: form.value.note,
    frequency: form.value.frequency,
    nextRunAt: form.value.nextRunAt,
    paused: !!form.value.paused
  }
  if (isEditing.value && editingId.value)
    await rec.edit(editingId.value, payload)
  else
    await rec.add(payload)
  showModal.value = false
  resetForm()
}

const askPauseResume = async tpl => {
  if (!auth.canWrite) return
  if (tpl.paused)
    await rec.resume(tpl.id)
  else
    await rec.pause(tpl.id)
}

const openRunNow = tpl => {
  if (!auth.canWrite) return
  runTarget.value = tpl
  runUpdateFromNow.value = false
  showRunConfirm.value = true
}

const confirmRunNow = async () => {
  if (!auth.canWrite || !runTarget.value) return
  await rec.runNowTemplate(runTarget.value.id, { updateFromNow: runUpdateFromNow.value })
  runTarget.value = null
  runUpdateFromNow.value = false
}

const remove = async id => {
  if (!auth.canWrite) return
  await rec.remove(id)
}

const runNow = async () => {
  if (!auth.canWrite) return
  await rec.processDue()
}

onMounted(async () => {
  await acc.subscribeMyAccounts()
  await deb.subscribeMyDebts()
  await rec.init()
})
</script>

<template>
  <section>
    <div class="card page-header">
      <h2 class="page-title">{{ t('recurring.title') }}</h2>
      <div class="page-actions">
        <button
          class="button"
          @click="openCreate"
          :disabled="!auth.canWrite"
          :aria-disabled="!auth.canWrite"
        >
          {{ t('recurring.add') }}
        </button>
        <button
          class="button"
          :disabled="rec.processing || !auth.canWrite"
          :aria-disabled="rec.processing || !auth.canWrite"
          @click="runNow"
        >
          {{ rec.processing ? t('recurring.statusPanel.processing') : t('recurring.processDue') }}
        </button>
      </div>
    </div>

    <div
      class="card mt-1 flex-col-gap-sm"
    >
      <strong>{{ t('recurring.statusPanel.title') }}</strong>
      <div class="status-meta">
        <div>
          <span class="fw-600">{{ t('recurring.statusPanel.lastRun') }}:</span>
          {{ rec.lastRun ? new Date(rec.lastRun).toLocaleString() : t('recurring.statusPanel.never') }}
        </div>
        <div>
          <span class="fw-600">{{ t('recurring.statusPanel.processed') }}:</span>
          {{ rec.lastProcessedCount }}
        </div>
        <div v-if="rec.lastErrorMsg">
          <span class="fw-600">{{ t('recurring.statusPanel.error') }}:</span>
          {{ rec.lastErrorMsg }}
        </div>
      </div>
    </div>

    <div
      v-if="rec.status==='loading'"
      class="card mt-1"
    >
      {{ t('common.loading') }}
    </div>
    <div
      v-else-if="!rec.items.length"
      class="card mt-1 row-between"
    >
      <span>{{ t('recurring.empty') }}</span>
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
            <td :data-label="t('recurring.table.name')">
              {{ tpl.name || tpl.note || '-' }}
            </td>
            <td :data-label="t('recurring.table.next')">
              {{ tpl.nextRunAt }}
            </td>
            <td :data-label="t('recurring.table.amount')">
              {{ formatAmount(Number(tpl.amount||0)) }}
            </td>
            <td :data-label="t('recurring.table.account')">
              {{ accountNameById[tpl.accountId] || tpl.accountId }}
            </td>
            <td :data-label="t('recurring.table.type')">
              {{ tpl.type==='income'
                ? t('transactions.form.income')
                : tpl.type==='expense'
                  ? t('transactions.form.expense')
                  : tpl.type==='debtPayment'
                    ? t('transactions.form.debtPayment')
                    : tpl.type
              }}
            </td>
            <td :data-label="t('recurring.table.frequency')">
              {{ t(`recurring.frequency.${tpl.frequency||'monthly'}`) }}
            </td>
            <td :data-label="t('recurring.table.status')">
              <span
                class="badge"
                :class="tpl.paused? 'badge-gray': 'badge-green'"
              >
                {{ tpl.paused ? t('recurring.paused') : t('recurring.active') }}
              </span>
            </td>
            <td :data-label="t('transactions.table.actions')">
              <div class="actions">
                <button
                  class="button button-run"
                  @click="openRunNow(tpl)"
                  :disabled="!auth.canWrite"
                  :aria-disabled="!auth.canWrite"
                  :title="t('recurring.runNow')"
                  :aria-label="t('recurring.runNow')"
                >
                  <svg class="icon-run" v-html="RunIcon"></svg>
                </button>
                <button
                  class="button button-edit"
                  @click="openEdit(tpl)"
                  :disabled="!auth.canWrite"
                  :aria-disabled="!auth.canWrite"
                >
                  <svg class="icon-edit" v-html="EditIcon"></svg>
                </button>
                <button
                  class="button button-pause"
                  @click="askPauseResume(tpl)"
                  :disabled="!auth.canWrite"
                  :aria-disabled="!auth.canWrite"
                >
                  <svg class="icon-toggle" v-html="tpl.paused ? PlayIcon : PauseIcon"></svg>
                </button>
                <button
                  class="button button-delete"
                  @click="remove(tpl.id)"
                  :disabled="!auth.canWrite"
                  :aria-disabled="!auth.canWrite"
                >
                  <svg class="icon-delete" v-html="DeleteIcon"></svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <FcModal
      :show-modal="showModal"
      :title-modal="isEditing? t('recurring.edit') : t('recurring.add')"
      @accept="save"
      @cancel-modal="showModal=false"
      :accept-disabled="!auth.canWrite"
    >
      <div class="grid modal-grid">
        <FcFormField
          v-model="form.name"
          :label="t('recurring.form.name')"
          :maxlength="50"
          :disabled="!auth.canWrite"
        />
        <FcFormField
          v-model="form.type"
          :label="t('transactions.form.type')"
          type="select"
          :options="[
            { label: t('transactions.form.income'), value: 'income' },
            { label: t('transactions.form.expense'), value: 'expense' },
            { label: t('transactions.form.debtPayment'), value: 'debtPayment' }
          ]"
          required
          :disabled="!auth.canWrite"
        />
        <FcFormField
          v-model="form.amount"
          :label="t('transactions.form.amount')"
          type="number"
          min="1"
          step="0.01"
          format-thousands
          required
          :disabled="!auth.canWrite"
        />
        <FcFormField
          v-if="isDebtPayment"
          v-model="form.debt"
          :label="t('transactions.form.debt')"
          type="select"
          :options="debtsOptions"
          required
          :disabled="!auth.canWrite"
        />
        <FcFormField
          v-model="form.account"
          :label="t('transactions.form.account')"
          type="select"
          :options="accountsOptions"
          required
          :disabled="!auth.canWrite"
        />
        <FcFormField
          v-model="form.note"
          :label="t('transfers.note')"
          :disabled="!auth.canWrite"
        />
        <FcFormField
          v-model="form.frequency"
          :label="t('recurring.form.frequency')"
          type="select"
          :options="[
            { label: t('recurring.frequency.monthly'), value: 'monthly' },
            { label: t('recurring.frequency.biweekly'), value: 'biweekly' },
            { label: t('recurring.frequency.weekly'), value: 'weekly' },
            { label: t('recurring.frequency.yearly'), value: 'yearly' }
          ]"
          required
          :disabled="!auth.canWrite"
        />
        <FcFormField
          v-model="form.nextRunAt"
          :label="t('recurring.form.nextRunAt')"
          type="date"
          required
          :disabled="!auth.canWrite"
        />
        <div>
          <label class="label-block">
            {{ t('recurring.form.paused') }}
          </label>
          <input
            type="checkbox"
            v-model="form.paused"
            :disabled="!auth.canWrite"
          />
        </div>
      </div>
    </FcModal>

    <FCConfirmModal
      :open="showRunConfirm"
      :title="t('recurring.runNow')"
      :message="runTarget ? t('recurring.runNowConfirmMessage', { name: runTarget.name || runTarget.note || '-' }) : ''"
      @update:open="val => showRunConfirm = val"
      @confirm="confirmRunNow"
      @cancel="() => { showRunConfirm = false; runTarget = null; }"
      :confirm-disabled="!auth.canWrite"
    >
      <label class="label-block">
        <input type="checkbox" v-model="runUpdateFromNow" :disabled="!auth.canWrite" />
        {{ t('recurring.runNowConfirmUpdate') }}
      </label>
    </FCConfirmModal>
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

.badge {
  display: inline-block;
  padding: .125rem .5rem;
  border-radius: 999px;
  font-size: .75rem;
}
.badge-gray {
  background: var(--badge-gray-color);
  color: var(--white);
}
.badge-green {
  background: var(--hover-success-color);
  color: var(--white);
}
.actions {
  display: flex;
  gap: .5rem;
  justify-content: flex-end;
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
.modal-grid {
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
}
.actions button[disabled] {
  opacity: .55;
  cursor: not-allowed;
}

.mt-1 {
  margin-top: 1rem;
}
.flex-col-gap-sm {
  display: flex;
  flex-direction: column;
  gap: .5rem;
}
.status-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
  font-size: .85rem;
}
.fw-600 {
  font-weight: 600;
}
.row-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.label-block {
  display: block;
  margin-bottom: .25rem;
}
</style>
