<script setup>
import { defineAsyncComponent, ref, computed, onMounted, watch } from 'vue'
import { useAccountsStore } from '@/stores/accounts.js'
import { useBudgetsStore } from '@/stores/budgets.js'
import { useTransactionsStore } from '@/stores/transactions.js'
import { useMonthlyRange } from '@/composables/useMonthlyRange.js'
import { t, formatCurrency } from '@/i18n/index.js'

const FcModal = defineAsyncComponent(() => import('@/components/global/FcModal.vue'))
const FcFormField = defineAsyncComponent(() => import('@/components/global/FcFormField.vue'))

const accounts = useAccountsStore()
const budgets = useBudgetsStore()
const transactions = useTransactionsStore()

const { currentMonthIndex, currentYear, labels, daysInMonth } = useMonthlyRange()
const monthLabels = labels
const selectedMonth = ref(Number(sessionStorage.getItem('budgets:month') ?? currentMonthIndex))
const selectedYear = ref(Number(sessionStorage.getItem('budgets:year') ?? currentYear))

const pad2 = (n) => String(n).padStart(2, '0')
const buildPeriod = (y, m) => ({ fromStr: `${y}-${pad2(m+1)}-01`, toStr: `${y}-${pad2(m+1)}-${pad2(daysInMonth(y,m))}` })

const results = ref({})
const isLoading = computed(() => budgets.status === 'loading')

const accountsOptions = computed(() => accounts.items.map(a => ({ label: a.name, value: a.id })))
const categoriesOptions = computed(() => {
  const set = new Set((transactions.items||[]).map(tx => tx.categoryId).filter(Boolean))
  return Array.from(set).map(v => ({ label: v, value: v }))
})

const showModal = ref(false)
const isEditing = ref(false)
const editingId = ref(null)

const form = ref({
  name: '', targetAmount: 0, currency: t('currency.default'),
  periodType: 'monthly', periodFrom: '', periodTo: '',
  categories: [], excludeAccounts: [],
  alertThresholdPct: 80, carryover: true, ratesRaw: ''
})

const resetForm = () => {
  form.value = { name: '', targetAmount: 0, currency: t('currency.default'), periodType: 'monthly', periodFrom: '', periodTo: '', categories: [], excludeAccounts: [], alertThresholdPct: 80, carryover: true, ratesRaw: '' }
  isEditing.value = false; editingId.value = null
}
const openCreate = () => { resetForm(); showModal.value = true }
const openEdit = (b) => {
  form.value = {
    name: b.name || '', targetAmount: Number(b.targetAmount)||0, currency: b.currency || t('currency.default'),
    periodType: b.periodType || 'monthly', periodFrom: b.periodFrom || '', periodTo: b.periodTo || '',
    categories: Array.isArray(b.categories) ? [...b.categories] : [],
    excludeAccounts: Array.isArray(b.excludeAccounts) ? [...b.excludeAccounts] : [],
    alertThresholdPct: Number(b.alertThresholdPct||80), carryover: !!b.carryover,
    ratesRaw: Object.entries(b.currencyRates||{}).map(([k,v])=>`${k}=${v}`).join(',')
  }
  isEditing.value = true; editingId.value = b.id; showModal.value = true
}

const parseRates = (raw) => {
  const map = {}
  String(raw||'').split(',').map(s=>s.trim()).filter(Boolean).forEach(pair=>{
    const [k,v] = pair.split('=').map(x=>x.trim())
    if (k && v && !isNaN(Number(v))) map[k] = Number(v)
  })
  return map
}

const save = async () => {
  const payload = {
    name: form.value.name,
    targetAmount: Number(form.value.targetAmount),
    currency: form.value.currency,
    periodType: form.value.periodType,
    periodFrom: form.value.periodType==='custom' ? form.value.periodFrom : null,
    periodTo: form.value.periodType==='custom' ? form.value.periodTo : null,
    categories: Array.isArray(form.value.categories) ? form.value.categories : [],
    excludeAccounts: Array.isArray(form.value.excludeAccounts) ? form.value.excludeAccounts : [],
    alertThresholdPct: Number(form.value.alertThresholdPct||80),
    carryover: !!form.value.carryover,
    currencyRates: parseRates(form.value.ratesRaw)
  }
  if (isEditing.value && editingId.value) await budgets.edit(editingId.value, payload)
  else await budgets.add(payload)
  showModal.value = false
  resetForm()
  await recompute()
}

const remove = async (id) => { await budgets.remove(id); await recompute() }

const periodDisplay = (b) => b.periodType === 'monthly' ? `${selectedYear.value} ${monthLabels.value[selectedMonth.value]}` : `${b.periodFrom} → ${b.periodTo}`
const fmtPct = (n) => `${Math.round(Number(n||0))}%`

const alertLevel = (b) => {
  const r = results.value[b.id]
  if (!r) return 'ok'
  if (r.pct >= 100) return 'over'
  if (r.pct >= Number(b.alertThresholdPct || 80)) return 'warn'
  return 'ok'
}

const recompute = async () => {
  const y = selectedYear.value, m = selectedMonth.value
  const per = b => b.periodType==='monthly' ? buildPeriod(y,m) : { fromStr: b.periodFrom, toStr: b.periodTo }
  const map = {}
  for (const b of budgets.items) { map[b.id] = await budgets.computeBudget(b, per(b)) }
  results.value = map
}

const closePeriod = async (b) => { await budgets.closePeriod(b.id, selectedYear.value, selectedMonth.value); await recompute() }

onMounted(async () => {
  await accounts.subscribeMyAccounts();
  await budgets.init()
  await recompute()
})

watch([selectedMonth, selectedYear], async ([m,y])=>{
  sessionStorage.setItem('budgets:month', String(m))
  sessionStorage.setItem('budgets:year', String(y))
  await recompute()
})

watch(() => budgets.items, () => recompute(), { deep: true })
watch(() => transactions.items, () => recompute(), { deep: true })
</script>

<template>
  <section>
    <div class="card page-header">
      <h2 class="page-title">{{ t('budgets.title') }}</h2>
      <div class="page-actions">
        <div class="field">
          <label>{{ t('common.year') }}</label>
          <select class="input" v-model.number="selectedYear">
            <option v-for="y in [selectedYear]" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('common.month') }}</label>
          <select class="input" v-model.number="selectedMonth">
            <option v-for="m in 12" :key="m-1" :value="m-1">{{ monthLabels[m-1] }}</option>
          </select>
        </div>
        <button class="button" @click="openCreate">{{ t('budgets.add') }}</button>
      </div>
    </div>

    <div v-if="isLoading" class="card" style="margin-top:1rem">{{ t('common.loading') }}</div>
    <div v-else-if="!budgets.items.length" class="card" style="margin-top:1rem;display:flex;justify-content:space-between;align-items:center">
      <span>{{ t('budgets.empty') }}</span>
      <button class="button" @click="openCreate">{{ t('common.add') }}</button>
    </div>

    <div v-else class="table-container">
      <table>
        <thead>
          <tr>
            <th>{{ t('budgets.table.name') }}</th>
            <th>{{ t('budgets.table.period') }}</th>
            <th>{{ t('budgets.table.target') }}</th>
            <th>{{ t('budgets.table.spent') }}</th>
            <th>{{ t('budgets.table.remaining') }}</th>
            <th>{{ t('budgets.table.progress') }}</th>
            <th>{{ t('budgets.table.alerts') }}</th>
            <th>{{ t('budgets.table.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="b in budgets.items" :key="b.id">
            <td>{{ b.name }}</td>
            <td>{{ periodDisplay(b) }}</td>
            <td>{{ formatCurrency(b.targetAmount, b.currency) }}</td>
            <td>{{ formatCurrency(results[b.id]?.spent||0, b.currency) }}</td>
            <td>{{ formatCurrency(results[b.id]?.remaining||0, b.currency) }}</td>
            <td>
              <div class="progress-row">
                <div class="progress-bar">
                  <div class="progress-fill" :class="alertLevel(b)" :style="{ width: Math.min(100, Math.max(0, Math.round(results[b.id]?.pct||0))) + '%' }"></div>
                </div>
                <span class="progress-text">{{ fmtPct(results[b.id]?.pct) }}</span>
              </div>
            </td>
            <td>
              <span class="badge" :class="{
                'badge-yellow': alertLevel(b)==='warn',
                'badge-red': alertLevel(b)==='over',
                'badge-green': alertLevel(b)==='ok'
              }">{{ t(alertLevel(b)==='ok' ? 'budgets.alerts.ok' : alertLevel(b)==='warn' ? 'budgets.alerts.warn' : 'budgets.alerts.over') }}</span>
            </td>
            <td>
              <div class="actions">
                <button class="button button-edit" @click="openEdit(b)">{{ t('common.edit') }}</button>
                <button class="button button-secondary" @click="closePeriod(b)" :disabled="!b.carryover">{{ t('budgets.closePeriod') }}</button>
                <button class="button button-delete" @click="remove(b.id)">{{ t('common.delete') }}</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <FcModal :show-modal="showModal" :title-modal="isEditing? t('budgets.edit') : t('budgets.add')" @accept="save" @cancel-modal="showModal=false">
      <div class="grid modal-grid">
        <FcFormField v-model="form.name" :label="t('budgets.form.name')" :maxlength="50" required />
        <FcFormField v-model="form.targetAmount" :label="t('budgets.form.targetAmount')" type="number" min="1" step="0.01" format-thousands required />
        <FcFormField v-model="form.currency" :label="t('budgets.form.currency')" />

        <FcFormField v-model="form.periodType" :label="t('budgets.form.periodType')" type="select" :options="[
          { label: t('budgets.form.monthly'), value: 'monthly' },
          { label: t('budgets.form.custom'), value: 'custom' }
        ]" required />
        <FcFormField v-if="form.periodType==='custom'" v-model="form.periodFrom" :label="t('budgets.form.from')" type="date" />
        <FcFormField v-if="form.periodType==='custom'" v-model="form.periodTo" :label="t('budgets.form.to')" type="date" />

        <div class="section-title">{{ t('budgets.form.categories') }}</div>
        <FcFormField
          v-if="categoriesOptions.length"
          v-model="form.categories"
          :label="t('budgets.form.categories')"
          type="select"
          :options="categoriesOptions"
          multiple
        />
        <small v-else class="hint">No hay categorías detectadas aún en tus transacciones; puedes agregarlas luego.</small>

        <FcFormField
          v-model="form.excludeAccounts"
          :label="t('budgets.form.excludeAccounts')"
          type="select"
          :options="accountsOptions"
          multiple
        />
        <small class="hint">Las cuentas seleccionadas no afectarán el cálculo del presupuesto.</small>

        <FcFormField v-model="form.alertThresholdPct" :label="t('budgets.form.threshold')" type="number" min="50" max="100" step="1" />
        <div>
          <label style="display:block;margin-bottom:.25rem">{{ t('budgets.form.carryover') }}</label>
          <input type="checkbox" v-model="form.carryover" />
        </div>

        <FcFormField v-model="form.ratesRaw" :label="t('budgets.form.rates')" :placeholder="'USD=4000,EUR=4500'" />
        <small class="hint">{{ t('budgets.form.noteRates') }}</small>
      </div>
    </FcModal>
  </section>
</template>

<style scoped>
.table-container { width:100%; overflow-x:auto; border-radius:12px; box-shadow:0 2px 8px var(--shadow-elev-1) }
.table-container::-webkit-scrollbar { height:8px }
.table-container::-webkit-scrollbar-thumb { background-color: var(--secondary-color); border-radius: 4px }

table { margin-top: 2rem; width:100%; border-collapse: collapse; background-color: var(--primary-color); color: var(--text-color); border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px var(--shadow-elev-1) }
th, td { padding: 1rem 1.2rem; text-align: left; border-bottom: 1px solid var(--secondary-color) }
th { background-color: var(--secondary-color); color: var(--accent-color); font-weight: 600; text-transform: uppercase; font-size: .85rem; letter-spacing: 1px }
tr:last-child td { border-bottom: none }
tr:hover { background-color: color-mix(in srgb, var(--primary-color) 88%, var(--text-color)); }

.badge { display:inline-block; padding:.125rem .5rem; border-radius:999px; font-size:.75rem }
.badge-gray { background: var(--badge-gray-color); color: var(--white) }
.badge-blue { background: var(--accent-color); color: var(--background-color) }
.badge-green { background: var(--hover-success-color); color: var(--white) }
.badge-yellow { background: var(--warning-color); color: var(--background-color) }
.badge-red { background: var(--error-color); color: var(--white) }
.actions { display:flex; gap:.5rem; justify-content:flex-end }

.progress-row { display:flex; align-items:center; gap:.5rem }
.progress-bar { width:140px; height:8px; background: var(--secondary-color); border-radius: 999px; overflow: hidden }
.progress-fill { height:100%; background: var(--accent-color) }
.progress-fill.warn { background: var(--warning-color) }
.progress-fill.over { background: var(--error-color) }
.progress-text { font-size: .85rem; color: var(--muted-text-color) }

.field { min-width: 160px }
.field label { display:block; margin-bottom:.25rem; color: var(--muted-text-color) }

.page-header { display:flex; justify-content:space-between; align-items:center; gap:.5rem; flex-wrap:wrap }
.page-title { margin:0 }
.page-actions { display:flex; gap:.75rem; align-items:center; flex-wrap:wrap }
.modal-grid { grid-template-columns: repeat(auto-fit, minmax(240px,1fr)); gap: 1rem; }
.section-title { grid-column: 1 / -1; font-weight: 600; color: var(--muted-text-color); margin-top:.5rem }
.hint { grid-column: 1 / -1; color: var(--muted-text-color); }
</style>
