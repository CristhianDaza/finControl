<script setup>
import { ref, computed, onMounted, watch, onBeforeUnmount, nextTick } from 'vue'
import { useAccountsStore } from '@/stores/accounts.js'
import { useTransactionsStore } from '@/stores/transactions.js'
import { useTransfersStore } from '@/stores/transfers.js'
import { useMonthlyRange } from '@/composables/useMonthlyRange.js'
import { t, formatCurrency } from '@/i18n/index.js'
import {
  Chart,
  BarController, BarElement,
  CategoryScale, LinearScale,
  Tooltip, Legend,
  DoughnutController, ArcElement,
  LineController, LineElement, PointElement
} from 'chart.js'

Chart.register(
  BarController, BarElement,
  CategoryScale, LinearScale,
  Tooltip, Legend,
  DoughnutController, ArcElement,
  LineController, LineElement, PointElement
)

const accountsStore = useAccountsStore()
const transactionsStore = useTransactionsStore()
const transfersStore = useTransfersStore()

const { currentMonthIndex, currentYear, labels, daysInMonth } = useMonthlyRange()
const monthLabels = labels

// Selección de periodo (año/mes)
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
  transfersStore.init()
  // cargar periodos disponibles y ajustar selección si es necesario
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
})

watch(selectedYear, () => {
  // si el mes actual no existe para el nuevo año, elegir el último disponible
  if (!availableMonths.value.includes(selectedMonth.value) && availableMonths.value.length) {
    selectedMonth.value = availableMonths.value[availableMonths.value.length - 1]
  }
})
watch([selectedMonth, selectedYear], ([m, y]) => applyMonthFilter(y, m))

// KPIs
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

// Gráficas
const barCanvas = ref(null)
const doughnutCanvas = ref(null)
const lineCanvas = ref(null)
let barChart = null
let doughnutChart = null
let lineChart = null

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
  const y = selectedYear.value
  const m = selectedMonth.value
  const items = monthTx.value
  const daily = buildDailySeries(items, y, m)
  const breakdown = buildBreakdown(items)
  const net = buildNetLine(daily)

  const barData = {
    labels: daily.labels,
    datasets: [
      { label: t('transactions.form.income'), data: daily.income, backgroundColor: 'rgba(34, 197, 94, 0.6)' },
      { label: t('transactions.form.expense'), data: daily.expense, backgroundColor: 'rgba(239, 68, 68, 0.6)' },
    ]
  }
  if (!barChart && barCanvas.value) {
    barChart = new Chart(barCanvas.value.getContext('2d'), {
      type: 'bar',
      data: barData,
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top', labels: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-color') } },
          tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}` } },
        },
        scales: {
          x: { ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--muted-text-color') } },
          y: { ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--muted-text-color') } },
        },
      }
    })
  } else if (barChart) {
    barChart.data = barData
    barChart.update()
  }

  const doughnutData = {
    labels: breakdown.labels,
    datasets: [{ data: breakdown.data, backgroundColor: ['#22C55E', '#EF4444', '#3FA9F5'] }]
  }
  if (!doughnutChart && doughnutCanvas.value) {
    doughnutChart = new Chart(doughnutCanvas.value.getContext('2d'), {
      type: 'doughnut',
      data: doughnutData,
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-color') } },
          tooltip: { callbacks: { label: ctx => `${ctx.label}: ${formatCurrency(ctx.parsed)}` } },
        },
        cutout: '60%'
      }
    })
  } else if (doughnutChart) {
    doughnutChart.data = doughnutData
    doughnutChart.update()
  }

  const lineData = {
    labels: net.labels,
    datasets: [{ label: t('dashboard.charts.net'), data: net.net, fill: false, borderColor: '#3FA9F5', tension: 0.2, pointRadius: 2 }]
  }
  if (!lineChart && lineCanvas.value) {
    lineChart = new Chart(lineCanvas.value.getContext('2d'), {
      type: 'line',
      data: lineData,
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top', labels: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-color') } },
          tooltip: { callbacks: { label: ctx => `${formatCurrency(ctx.parsed.y)}` } },
        },
        scales: {
          x: { ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--muted-text-color') } },
          y: { ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--muted-text-color') } },
        },
      }
    })
  } else if (lineChart) {
    lineChart.data = lineData
    lineChart.update()
  }
}

watch(monthTx, () => updateCharts())

onBeforeUnmount(() => {
  if (barChart) { barChart.destroy(); barChart = null }
  if (doughnutChart) { doughnutChart.destroy(); doughnutChart = null }
  if (lineChart) { lineChart.destroy(); lineChart = null }
})
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
        <p class="amount">{{ formatCurrency(totalBalance) }}</p>
      </div>
      <div class="dashboard-card income">
        <h3>{{ t('dashboard.kpis.incomeMonth') }}</h3>
        <p class="amount">{{ formatCurrency(incomeSum) }}</p>
      </div>
      <div class="dashboard-card expense">
        <h3>{{ t('dashboard.kpis.expenseMonth') }}</h3>
        <p class="amount">{{ formatCurrency(expenseSum) }}</p>
      </div>
      <div class="dashboard-card">
        <h3>{{ t('dashboard.kpis.txCount') }}</h3>
        <p class="amount">{{ txCount }}</p>
      </div>
      <div class="dashboard-card">
        <h3>{{ t('dashboard.kpis.netMonth') }}</h3>
        <p class="amount">{{ formatCurrency(netSum) }}</p>
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
        <canvas ref="barCanvas" :aria-label="t('dashboard.charts.daily')" role="img"></canvas>
      </div>
      <div class="card chart-card">
        <h3>{{ t('dashboard.charts.breakdown') }}</h3>
        <canvas ref="doughnutCanvas" :aria-label="t('dashboard.charts.breakdown')" role="img"></canvas>
      </div>
      <div class="card chart-card">
        <h3>{{ t('dashboard.charts.net') }}</h3>
        <canvas ref="lineCanvas" :aria-label="t('dashboard.charts.net')" role="img"></canvas>
      </div>
    </section>

    <section class="card tx-list" v-if="!isLoading && !hasError">
      <h3>{{ t('dashboard.list.title') }}</h3>
      <div v-if="!monthEvents.length" class="empty">{{ t('dashboard.list.empty') }}</div>
      <ul v-else class="tx-ul">
        <li v-for="it in visibleTx" :key="it.id" class="tx-item">
          <div class="tx-left">
            <div class="tx-date">{{ formatDate(it.date) }}</div>
            <div class="tx-note">{{ it.note || '-' }}</div>
          </div>
          <div class="tx-right">
            <div class="tx-account">{{ getAccountName(it.accountId) }}</div>
            <div class="tx-amount" :class="{ inc: it.type==='income', exp: it.type==='expense' || it.type==='debtPayment' }">
              {{ formatCurrency(it.amount) }}
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
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
}
.dashboard-card {
  background-color: var(--primary-color);
  padding: 1.5rem;
  border-radius: 14px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-left: 6px solid var(--accent-color);
  transition: transform 0.2s ease;
}
.dashboard-card:hover { transform: translateY(-4px); }
.dashboard-card h3 { margin: 0; font-size: 1rem; color: var(--muted-text-color); }
.dashboard-card .amount { margin-top: .5rem; font-size: 1.5rem; font-weight: bold; color: var(--text-color); }
.dashboard-card.income { border-left-color: var(--success-color); }
.dashboard-card.expense { border-left-color: var(--error-color); }

.charts-grid {
  margin-top: 1.5rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}
.chart-card h3 { margin-top: 0; color: var(--muted-text-color); }

.tx-list { margin-top: 1.5rem; }
.tx-ul { list-style: none; padding: 0; margin: 0; }
.tx-item { display: flex; justify-content: space-between; align-items: center; padding: .75rem 0; border-bottom: 1px solid var(--primary-color); }
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
</style>
