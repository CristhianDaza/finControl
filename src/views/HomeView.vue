<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useAccountsStore } from '@/stores/accounts.js'
import { useTransactionsStore } from '@/stores/transactions.js'
import { useTransfersStore } from '@/stores/transfers.js'
import { useMonthlyRange } from '@/composables/useMonthlyRange.js'
import { t, formatCurrency } from '@/i18n/index.js'
import { useGoalsStore } from '@/stores/goals.js'
import { useBudgetsStore } from '@/stores/budgets.js'
import { useRecurringStore } from '@/stores/recurring.js'
import { formatAmount } from '@/utils/formatters.js'
import { useSettingsStore } from '@/stores/settings.js'
import LazyChart from '@/components/charts/LazyChart.vue'

const getCssVar = (name) => {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name)
    return (v || '').trim()
  } catch { return '' }
}
const hexToRgba = (hex, alpha = 1) => {
  try {
    if (!hex) return `rgba(0,0,0,${alpha})`
    let h = hex.trim()
    if (h.startsWith('rgba(') || h.startsWith('rgb(')) return h
    if (h.startsWith('#')) h = h.slice(1)
    if (h.length === 3) {
      const r = parseInt(h[0] + h[0], 16)
      const g = parseInt(h[1] + h[1], 16)
      const b = parseInt(h[2] + h[2], 16)
      return `rgba(${r}, ${g}, ${b}, ${alpha})`
    }
    if (h.length >= 6) {
      const r = parseInt(h.slice(0, 2), 16)
      const g = parseInt(h.slice(2, 4), 16)
      const b = parseInt(h.slice(4, 6), 16)
      return `rgba(${r}, ${g}, ${b}, ${alpha})`
    }
  } catch {  }
  return `rgba(0,0,0,${alpha})`
}

const accountsStore = useAccountsStore()
const transactionsStore = useTransactionsStore()
const transfersStore = useTransfersStore()
const goalsStore = useGoalsStore()
const budgetsStore = useBudgetsStore()
const settingsStore = useSettingsStore()
const recurringStore = useRecurringStore()

const goalsList = computed(() => goalsStore.items || [])
const goalProgressPct = (id) => {
  try { return Math.round(goalsStore.progressPct(id)) } catch { return 0 }
}
const goalCompleted = (id) => {
  try { return !!goalsStore.isCompleted(id) } catch { return false }
}

const { currentMonthIndex, currentYear, labels, daysInMonth } = useMonthlyRange()
const monthLabels = labels

const selectedMonth = ref(Number(sessionStorage.getItem('dash:month') ?? currentMonthIndex))
const selectedYear = ref(Number(sessionStorage.getItem('dash:year') ?? currentYear))
const availableYears = computed(() => transactionsStore.availablePeriods.years || [])
const availableMonths = computed(() => (transactionsStore.availablePeriods.monthsByYear && transactionsStore.availablePeriods.monthsByYear[selectedYear.value]) || [])

const isLoading = computed(() => accountsStore.status === 'loading' || transactionsStore.status === 'loading')
const hasError = computed(() => accountsStore.status === 'error' || transactionsStore.status === 'error')

const pad2 = (n) => String(n).padStart(2, '0')

const applyMonthFilter = (y, m) => {
  const fromStr = `${y}-${pad2(m + 1)}-01`
  const toStr = `${y}-${pad2(m + 1)}-${pad2(daysInMonth(y, m))}`
  transactionsStore.setFilters({ from: fromStr, to: toStr })
  transfersStore.setFilters({ from: fromStr, to: toStr })
  sessionStorage.setItem('dash:month', String(m))
  sessionStorage.setItem('dash:year', String(y))
}

onMounted(async () => {
  await accountsStore.subscribeMyAccounts()
  await transfersStore.init()
  await transactionsStore.loadAvailablePeriods()
  if (!availableYears.value.includes(selectedYear.value)) {
    const lastY = availableYears.value[availableYears.value.length - 1]
    if (lastY != null) selectedYear.value = lastY
  }
  if (!availableMonths.value.includes(selectedMonth.value)) {
    const months = availableMonths.value
    if (months.length) selectedMonth.value = months[months.length - 1]
  }
  applyMonthFilter(selectedYear.value, selectedMonth.value)
  await recurringStore.processDue()
  await goalsStore.init()
  await goalsStore.loadProgress()
  await budgetsStore.init()
  await computeBudgetsMonth()
})

watch(selectedYear, () => {
  if (!availableMonths.value.includes(selectedMonth.value) && availableMonths.value.length) {
    selectedMonth.value = availableMonths.value[availableMonths.value.length - 1]
  }
})
watch([selectedMonth, selectedYear], async ([m, y]) => { applyMonthFilter(y, m); await computeBudgetsMonth() })

const totalBalance = computed(() => accountsStore.totalBalance)
const monthTx = computed(() => transactionsStore.items)
const monthTransferPairs = computed(() => transfersStore.filtered)
const monthTransferAsTx = computed(() => monthTransferPairs.value.map(p => ({ id: `tr:${p.transferId}`, date: p.out.date, note: `${t('transfers.title')}: ${p.out.fromAccountId} → ${p.out.toAccountId}${p.out.note ? ' · '+p.out.note : ''}`, accountId: p.out.fromAccountId, amount: 0, type: 'transfer' })))
const monthEvents = computed(() => [...monthTx.value, ...monthTransferAsTx.value].sort((a,b)=> (a.date===b.date?0:(a.date>b.date?-1:1))))

const incomeSum = computed(() => monthTx.value.filter(i => i.type === 'income').reduce((a,b)=>a+Number(b.amount||0),0))
const expenseSum = computed(() => monthTx.value.filter(i => i.type === 'expense' || i.type === 'debtPayment').reduce((a,b)=>a+Number(b.amount||0),0))
const netSum = computed(() => incomeSum.value - expenseSum.value)
const txCount = computed(() => monthTx.value.length)

const pageSize = ref(10)
const visibleTx = computed(() => monthEvents.value.slice(0, pageSize.value))
const canSeeMore = computed(() => monthEvents.value.length > pageSize.value)
const seeMore = () => { pageSize.value += 10 }

const getAccountName = (id) => {
  return accountsStore.getAccountById(id).value?.name || id
}
const formatDate = (d) => {
  try {
    if (typeof d === 'string') return d
    const date = new Date(d?.seconds ? d.seconds * 1000 : d)
    return date.toLocaleDateString('es-CO')
  } catch { return '' }
}

const buildGoalsProgress = () => {
  try {
    const labels = (goalsList.value || []).map(g => g.name || '')
    const data = (goalsList.value || []).map(g => Math.round(goalsStore.progressPct(g.id)))
    return { labels, data }
  } catch { return { labels: [], data: [] } }
}

const budgetsMonth = ref([])
const budgetsPrevPct = ref({})
const computeBudgetsMonth = async () => {
  const y = selectedYear.value, m = selectedMonth.value
  const res = await budgetsStore.computeForMonth(y, m)
  const arr = (budgetsStore.items || []).map(b => ({ b, r: res[b.id] || { pct: 0, spent: 0, remaining: 0 } }))
  arr.sort((a,b)=> (b.r?.pct||0) - (a.r?.pct||0))
  budgetsMonth.value = arr
  const prevMap = {}
  for (const it of arr) {
    try { prevMap[it.b.id] = Math.round(await budgetsStore.computePrevMonthPct(it.b, y, m)) } catch { prevMap[it.b.id] = 0 }
  }
  budgetsPrevPct.value = prevMap
}

watch(monthTx, async () => { await computeBudgetsMonth(); await goalsStore.loadProgress() })
watch(() => budgetsStore.items, async () => { await computeBudgetsMonth() }, { deep: true })

// Chart data for lazy charts
const barChartData = ref({})
const doughnutChartData = ref({})
const lineChartData = ref({})
const goalsChartData = ref({})

const barChartOptions = ref({})
const doughnutChartOptions = ref({})
const lineChartOptions = ref({})
const goalsChartOptions = ref({})

const buildDailySeries = (items, y, m) => {
  const days = daysInMonth(y, m)
  const labels = Array.from({ length: days }, (_, i) => String(i + 1))
  const income = new Array(days).fill(0)
  const expense = new Array(days).fill(0)
  for (const tx of items) {
    let dayIndex = 0
    if (typeof tx.date === 'string') {
      const day = parseInt(tx.date.slice(8, 10), 10)
      dayIndex = isNaN(day) ? 1 : day
    } else {
      const d = new Date(tx.date?.seconds ? tx.date.seconds * 1000 : tx.date)
      dayIndex = d.getDate()
    }
    const i = Math.min(Math.max(dayIndex - 1, 0), days - 1)
    if (tx.type === 'income') income[i] += Number(tx.amount || 0)
    if (tx.type === 'expense' || tx.type === 'debtPayment') expense[i] += Number(tx.amount || 0)
  }
  return { labels, income, expense }
}

const buildBreakdown = (items) => {
  const map = { income: 0, expense: 0, debtPayment: 0 }
  for (const tx of items) { map[tx.type] = (map[tx.type] || 0) + Number(tx.amount || 0) }
  const labels = [t('transactions.form.income'), t('transactions.form.expense'), t('transactions.form.debtPayment')]
  const data = [map.income || 0, (map.expense || 0), map.debtPayment || 0]
  return { labels, data }
}

const buildNetLine = (daily) => {
  const len = daily.labels.length
  const net = new Array(len).fill(0)
  let acc = 0
  for (let i = 0; i < len; i++) { acc += (daily.income[i] - daily.expense[i]); net[i] = acc }
  return { labels: daily.labels, net }
}

const updateCharts = async () => {
  await nextTick()
  
  const colorText = '#E0E1E9'
  const colorMuted = '#A3A8B8'
  const colorSuccess = '#22C55E'
  const colorError = '#EF4444'
  const colorAccent = '#3FA9F5'
  

  const y = selectedYear.value
  const m = selectedMonth.value
  const items = monthTx.value
  const daily = buildDailySeries(items, y, m)
  const breakdown = buildBreakdown(items)
  const net = buildNetLine(daily)
  const goalsData = buildGoalsProgress()

  barChartData.value = {
    labels: daily.labels,
    datasets: [
      { 
        label: t('transactions.form.income'), 
        data: daily.income, 
        backgroundColor: '#22C55E',
        borderColor: '#22C55E',
        borderWidth: 1
      },
      { 
        label: t('transactions.form.expense'), 
        data: daily.expense, 
        backgroundColor: '#EF4444',
        borderColor: '#EF4444',
        borderWidth: 1
      },
    ]
  }
  barChartOptions.value = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        position: 'top', 
        labels: { 
          color: colorText,
          usePointStyle: true,
          padding: 20
        } 
      },
      tooltip: { 
        callbacks: { 
          label: ctx => `${ctx.dataset.label}: ${formatAmount(ctx.parsed.y)}` 
        } 
      },
    },
    scales: {
      x: { 
        ticks: { color: colorMuted },
        grid: { color: 'rgba(224, 225, 233, 0.1)' }
      },
      y: { 
        ticks: { color: colorMuted },
        grid: { color: 'rgba(224, 225, 233, 0.1)' }
      },
    },
    elements: {
      bar: {
        borderRadius: 4
      }
    }
  }

  doughnutChartData.value = {
    labels: breakdown.labels,
    datasets: [{ 
      data: breakdown.data, 
      backgroundColor: ['#22C55E', '#EF4444', '#3FA9F5'],
      borderWidth: 0,
      hoverBackgroundColor: ['#22C55E', '#EF4444', '#3FA9F5'],
      hoverBorderWidth: 2,
      hoverBorderColor: '#ffffff'
    }]
  }
  doughnutChartOptions.value = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom', labels: { color: colorText } },
      tooltip: { callbacks: { label: ctx => `${ctx.label}: ${formatAmount(ctx.parsed)}` } },
    },
    cutout: '60%'
  }

  // Update line chart data
  lineChartData.value = {
    labels: net.labels,
    datasets: [{ 
      label: t('dashboard.charts.net'), 
      data: net.net, 
      fill: false, 
      borderColor: '#3FA9F5', 
      backgroundColor: '#3FA9F5',
      tension: 0.2, 
      pointRadius: 3,
      pointBackgroundColor: '#3FA9F5',
      pointBorderColor: '#3FA9F5',
      borderWidth: 2
    }]
  }
  lineChartOptions.value = {
    responsive: true,
    plugins: {
      legend: { position: 'top', labels: { color: colorText } },
      tooltip: { callbacks: { label: ctx => `${formatAmount(ctx.parsed.y)}` } },
    },
    scales: {
      x: { ticks: { color: colorMuted } },
      y: { ticks: { color: colorMuted } },
    },
  }

  // Update goals chart data
  goalsChartData.value = {
    labels: goalsData.labels,
    datasets: [{ 
      label: t('goals.table.progress'), 
      data: goalsData.data, 
      backgroundColor: '#3FA9F5',
      borderColor: '#3FA9F5',
      borderWidth: 1
    }]
  }
  goalsChartOptions.value = {
    responsive: true,
    plugins: {
      legend: { position: 'top', labels: { color: colorText } },
      tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.y}%` } },
    },
    scales: {
      x: { ticks: { color: colorMuted } },
      y: { beginAtZero: true, max: 100, ticks: { color: colorMuted, callback: (v)=> `${v}%` } },
    },
  }
}

watch(monthTx, () => updateCharts())
watch(() => goalsStore.progressById, () => updateCharts(), { deep: true })
watch(() => goalsStore.items, () => updateCharts(), { deep: true })
watch(() => settingsStore.amountFormat, () => updateCharts())

// Initialize charts on mount
onMounted(async () => {
  await nextTick()
  setTimeout(() => {
    updateCharts()
  }, 100)
})

// No need for manual chart cleanup with LazyChart components
</script>

<template>
  <section>
    <div class="period-toolbar" role="toolbar" :aria-label="t('dashboard.filter.ariaLabel')">
      <div class="field">
        <label>{{ t('common.year') }}</label>
        <select class="input" v-model.number="selectedYear">
          <option v-for="y in availableYears" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>
      <div class="field">
        <label>{{ t('common.month') }}</label>
        <select class="input" v-model.number="selectedMonth">
          <option v-for="m in availableMonths" :key="m" :value="m">{{ monthLabels[m] }}</option>
        </select>
      </div>
    </div>

    <section class="dashboard-grid">
      <div class="dashboard-card">
        <h3>{{ t('dashboard.kpis.totalBalance') }}</h3>
        <div class="amount-format-toggle" v-if="false"></div>
        <p class="amount" :title="formatCurrency(totalBalance)">{{ formatAmount(totalBalance) }}</p>
      </div>
      <div class="dashboard-card income">
        <h3>{{ t('dashboard.kpis.incomeMonth') }}</h3>
        <p class="amount" :title="formatCurrency(incomeSum)">{{ formatAmount(incomeSum) }}</p>
      </div>
      <div class="dashboard-card expense">
        <h3>{{ t('dashboard.kpis.expenseMonth') }}</h3>
        <p class="amount" :title="formatCurrency(expenseSum)">{{ formatAmount(expenseSum) }}</p>
      </div>
      <div class="dashboard-card">
        <h3>{{ t('dashboard.kpis.txCount') }}</h3>
        <p class="amount">{{ txCount }}</p>
      </div>
      <div class="dashboard-card">
        <h3>{{ t('dashboard.kpis.netMonth') }}</h3>
        <p class="amount" :title="formatCurrency(netSum)">{{ formatAmount(netSum) }}</p>
      </div>
    </section>

    <div v-if="hasError" class="card error-state">
      <p>{{ t('common.retry') }}</p>
      <button class="button" @click="applyMonthFilter(selectedYear, selectedMonth)">{{ t('common.retry') }}</button>
    </div>
    <div v-else-if="isLoading" class="card loading-state">
      <p>{{ t('common.loading') }}</p>
    </div>

    <section class="charts-grid" v-if="!isLoading && !hasError">
      <div class="card chart-card">
        <h3>{{ t('dashboard.charts.daily') }}</h3>
        <LazyChart
          chart-type="bar"
          :chart-data="barChartData"
          :chart-options="barChartOptions"
          :raw-data="monthTx"
          :aria-label="t('dashboard.charts.daily')"
          :enable-progressive="true"
          @chart-ready="(chart) => console.log('Bar chart ready', chart)"
        />
      </div>
      <div class="card chart-card">
        <h3>{{ t('dashboard.charts.breakdown') }}</h3>
        <LazyChart
          chart-type="doughnut"
          :chart-data="doughnutChartData"
          :chart-options="doughnutChartOptions"
          :raw-data="monthTx"
          :aria-label="t('dashboard.charts.breakdown')"
          :enable-progressive="true"
          @chart-ready="(chart) => console.log('Doughnut chart ready', chart)"
        />
      </div>
      <div class="card chart-card">
        <h3>{{ t('dashboard.charts.net') }}</h3>
        <LazyChart
          chart-type="line"
          :chart-data="lineChartData"
          :chart-options="lineChartOptions"
          :raw-data="monthTx"
          :aria-label="t('dashboard.charts.net')"
          :enable-progressive="true"
          @chart-ready="(chart) => console.log('Line chart ready', chart)"
        />
      </div>
      <div class="card chart-card">
        <h3>{{ t('goals.title') }}</h3>
        <LazyChart
          chart-type="bar"
          :chart-data="goalsChartData"
          :chart-options="goalsChartOptions"
          :raw-data="goalsList"
          :aria-label="t('goals.title')"
          :enable-progressive="false"
          @chart-ready="(chart) => console.log('Goals chart ready', chart)"
        />
      </div>
    </section>

    <section class="card budgets-card" v-if="!isLoading && !hasError">
      <h3>{{ t('dashboard.budgets.title') }}</h3>
      <div v-if="!(budgetsMonth && budgetsMonth.length)" class="empty">{{ t('dashboard.budgets.empty') }}</div>
      <ul v-else class="budgets-ul">
        <li v-for="it in budgetsMonth.slice(0,3)" :key="it.b.id" class="budget-item">
          <div class="b-left">
            <div class="b-name">{{ it.b.name }}</div>
            <div class="b-period">{{ it.b.periodType==='monthly' ? (monthLabels[selectedMonth] + ' ' + selectedYear) : (it.b.periodFrom + ' → ' + it.b.periodTo) }}</div>
          </div>
          <div class="b-center">
            <div class="progress">
              <div class="bar"><div class="fill" :class="{ warn: (it.r?.pct||0)>= (it.b.alertThresholdPct||80) && (it.r?.pct||0) < 100, over: (it.r?.pct||0) >= 100 }" :style="{ width: Math.min(100, Math.max(0, Math.round(it.r?.pct||0))) + '%' }"></div></div>
              <div class="pct">{{ Math.round(it.r?.pct||0) }}%</div>
            </div>
          </div>
          <div class="b-right">
            <div class="b-remaining">{{ formatAmount(it.r?.remaining||0, it.b.currency) }}</div>
            <div class="b-prev">{{ t('dashboard.budgets.prev', { pct: budgetsPrevPct[it.b.id] || 0 }) }}</div>
          </div>
        </li>
      </ul>
    </section>

    <section class="card goals-card" v-if="!isLoading && !hasError">
      <h3>{{ t('goals.title') }}</h3>
      <div v-if="!(goalsList && goalsList.length)" class="empty">{{ t('goals.empty') }}</div>
      <ul v-else class="goals-ul">
        <li v-for="g in goalsList" :key="g.id" class="goal-item">
          <div class="goal-left">
            <div class="goal-name">{{ g.name }}</div>
            <div class="goal-note">{{ g.note || '' }}</div>
          </div>
          <div class="goal-right">
            <div class="progress">
              <div class="bar"><div class="fill" :style="{ width: goalProgressPct(g.id)+'%' }"></div></div>
              <div class="pct">{{ goalProgressPct(g.id) }}%</div>
            </div>
            <div class="goal-target">{{ formatAmount(g.targetAmount, g.currency || 'COP') }}</div>
            <span v-if="goalCompleted(g.id)" class="badge badge-green">{{ t('goals.completed') }}</span>
          </div>
        </li>
      </ul>
    </section>

    <section class="card tx-list" v-if="!isLoading && !hasError">
      <h3>{{ t('dashboard.list.title') }}</h3>
      <div v-if="!monthEvents.length" class="empty">{{ t('dashboard.list.empty') }}</div>
      <ul v-else class="tx-ul">
        <li v-for="it in visibleTx" :key="it.id" class="tx-item">
          <div class="tx-left">
            <div class="tx-date">{{ formatDate(it.date) }}</div>
            <div class="tx-note">
              <span>{{ it.note || '-' }}</span>
              <span v-if="it.isRecurring || it.recurringTemplateId" class="badge badge-rec">{{ t('recurring.badge') }}</span>
            </div>
          </div>
          <div class="tx-right">
            <div class="tx-account">{{ getAccountName(it.accountId) }}</div>
            <div class="tx-amount" :class="{ inc: it.type==='income', exp: it.type==='expense' || it.type==='debtPayment' }">
              {{ formatAmount(it.amount, it.currency || 'COP') }}
            </div>
          </div>
        </li>
      </ul>
      <div class="see-more" v-if="canSeeMore">
        <button class="button button-secondary" @click="seeMore">{{ t('dashboard.list.seeMore') }}</button>
      </div>
    </section>
  </section>
</template>

<style scoped>
.period-toolbar {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  align-items: flex-end;
  flex-wrap: wrap;
}
.field { min-width: 160px }
.field label { display:block; margin-bottom:.25rem; color: var(--muted-text-color) }

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1.5rem;
}
.dashboard-card {
  background-color: var(--primary-color);
  padding: 1.5rem;
  border-radius: 14px;
  box-shadow: 0 4px 12px var(--shadow-soft);
  border-left: 6px solid var(--accent-color);
  transition: transform 0.2s ease;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.dashboard-card:hover { transform: translateY(-4px); }
.dashboard-card h3 { margin: 0; font-size: 1rem; color: var(--muted-text-color); }
.dashboard-card .amount { margin-top: .5rem; font-size: clamp(1.1rem, 1.2vw + .8rem, 1.6rem); font-weight: bold; color: var(--text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
.amount-format-toggle { display:none }
.dashboard-card { position: relative; }
.dashboard-card.income { border-left-color: var(--success-color); }
.dashboard-card.expense { border-left-color: var(--error-color); }

.charts-grid {
  margin-top: 1.5rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}
.chart-card h3 { margin-top: 0; color: var(--muted-text-color); }

.budgets-card { margin-top: 1rem }
.budgets-ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: .75rem }
.budget-item { display:flex; justify-content: space-between; align-items: center; padding:.5rem 0; border-bottom: 1px solid var(--primary-color); gap:.75rem; flex-wrap: wrap }
.b-left { display:grid; min-width: 180px }
.b-name { color: var(--text-color); font-weight: 600 }
.b-period { color: var(--muted-text-color); font-size: .9rem }
.b-center { flex: 1 1 240px; display:flex; align-items:center; justify-content:center; min-width: 200px }
.b-right { text-align:right; display:grid; min-width: 140px }
.progress { display:flex; align-items:center; gap:.5rem; width: 100%; max-width: 360px }
.progress .bar { width: 100%; height: 8px; background: var(--secondary-color); border-radius: 999px; overflow: hidden }
.progress .fill { height: 100%; background: var(--accent-color) }
.progress .fill.warn { background: var(--warning-color) }
.progress .fill.over { background: var(--error-color) }
.progress .pct { color: var(--muted-text-color); font-size: .85rem }

.goals-card { margin-top: 1rem }
.goals-ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: .75rem }
.goal-item { display:flex; justify-content: space-between; align-items: center; padding:.5rem 0; border-bottom: 1px solid var(--primary-color); gap:.75rem; flex-wrap: wrap }
.goal-left { display:grid; min-width: 160px }
.goal-name { color: var(--text-color); font-weight: 600 }
.goal-note { color: var(--muted-text-color); font-size: .9rem }
.goal-right { display:flex; align-items:center; gap: .75rem; flex-wrap: wrap }

.badge { display:inline-block; padding:.125rem .5rem; border-radius:999px; font-size:.75rem }
.badge-green { background: var(--hover-success-color); color: var(--white) }

.tx-list { margin-top: 1.5rem; }
.tx-ul { list-style: none; padding: 0; margin: 0; }
.tx-item { display: flex; justify-content: space-between; align-items: center; padding: .75rem 0; border-bottom: 1px solid var(--secondary-color); }
.tx-left { display: grid; }
.tx-date { color: var(--muted-text-color); font-size: .9rem }
.tx-note { color: var(--text-color); }
.tx-right { text-align: right; }
.tx-account { color: var(--muted-text-color); font-size: .9rem }
.tx-amount { font-weight: 600; }
.tx-amount.inc { color: var(--success-color); }
.tx-amount.exp { color: var(--error-color); }
.see-more { margin-top: 1rem; text-align: center; }

.error-state, .loading-state { margin-top: 1rem; }
.badge { display:inline-block; padding:.125rem .5rem; border-radius:999px; font-size:.75rem }
.badge-rec { background: var(--recurring-badge-color); color: var(--white); margin-left: .5rem }

@media (max-width: 600px) {
  .budget-item { flex-direction: column; align-items: stretch }
  .b-center { order: 3 }
  .b-right { order: 2; text-align: left }
  .goal-item { flex-direction: column; align-items: stretch }
  .goal-right { justify-content: space-between }
  .field { min-width: 120px }
}
</style>
