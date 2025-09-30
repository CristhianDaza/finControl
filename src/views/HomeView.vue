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

const accountsStore = useAccountsStore()
const transactionsStore = useTransactionsStore()
const transfersStore = useTransfersStore()
const goalsStore = useGoalsStore()
const budgetsStore = useBudgetsStore()
const settingsStore = useSettingsStore()
const recurringStore = useRecurringStore()

const goalsList = computed(() => goalsStore.items || [])

const goalProgressPct = id => {
  try {
    return Math.round(goalsStore.progressPct(id))
  } catch {
    return 0
  }
}

const goalCompleted = id => {
  try {
    return !!goalsStore.isCompleted(id)
  } catch {
    return false
  }
}

const { currentMonthIndex, currentYear, labels, daysInMonth } = useMonthlyRange()
const monthLabels = labels

const selectedMonth = ref(Number(sessionStorage.getItem('dash:month') ?? currentMonthIndex))
const selectedYear = ref(Number(sessionStorage.getItem('dash:year') ?? currentYear))

const availableYears = computed(() => transactionsStore.availablePeriods.years || [])
const availableMonths = computed(() =>
  (transactionsStore.availablePeriods.monthsByYear &&
    transactionsStore.availablePeriods.monthsByYear[selectedYear.value]) || []
)

const isLoading = computed(() =>
  accountsStore.status === 'loading' || transactionsStore.status === 'loading'
)
const hasError = computed(() =>
  accountsStore.status === 'error' || transactionsStore.status === 'error'
)

const pad2 = n => String(n).padStart(2, '0')

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
  if (
    !availableMonths.value.includes(selectedMonth.value) &&
    availableMonths.value.length
  ) {
    selectedMonth.value = availableMonths.value[availableMonths.value.length - 1]
  }
})

watch([selectedMonth, selectedYear], async ([m, y]) => {
  applyMonthFilter(y, m)
  await computeBudgetsMonth()
})

const totalBalance = computed(() => accountsStore.totalBalance)
const monthTx = computed(() => transactionsStore.items)
const monthTransferPairs = computed(() => transfersStore.filtered)

const monthTransferAsTx = computed(() =>
  monthTransferPairs.value.map(p => ({
    id: `tr:${p.transferId}`,
    date: p.out.date,
    note: `${t('transfers.title')}: ${p.out.fromAccountId} \u2192 ${p.out.toAccountId}${
      p.out.note ? ' \u00b7 ' + p.out.note : ''
    }`,
    accountId: p.out.fromAccountId,
    amount: 0,
    type: 'transfer'
  }))
)

const monthEvents = computed(() =>
  [...monthTx.value, ...monthTransferAsTx.value].sort((a, b) =>
    a.date === b.date ? 0 : a.date > b.date ? -1 : 1
  )
)

const incomeSum = computed(() =>
  monthTx.value
    .filter(i => i.type === 'income')
    .reduce((a, b) => a + Number(b.amount || 0), 0)
)

const expenseSum = computed(() =>
  monthTx.value
    .filter(i => i.type === 'expense' || i.type === 'debtPayment')
    .reduce((a, b) => a + Number(b.amount || 0), 0)
)

const txCount = computed(() => monthTx.value.length)

const pageSize = ref(10)
const visibleTx = computed(() => monthEvents.value.slice(0, pageSize.value))
const canSeeMore = computed(() => monthEvents.value.length > pageSize.value)
const seeMore = () => {
  pageSize.value += 10
}

const getAccountName = id => {
  return accountsStore.getAccountById(id).value?.name || id
}

const formatDate = d => {
  try {
    if (typeof d === 'string') return d
    const date = new Date(d?.seconds ? d.seconds * 1000 : d)
    return date.toLocaleDateString('es-CO')
  } catch {
    return ''
  }
}

const buildGoalsProgress = () => {
  try {
    const labels = (goalsList.value || []).map(g => g.name || '')
    const data = (goalsList.value || []).map(g =>
      Math.round(goalsStore.progressPct(g.id))
    )
    return { labels, data }
  } catch {
    return { labels: [], data: [] }
  }
}

const budgetsMonth = ref([])
const budgetsPrevPct = ref({})

const computeBudgetsMonth = async () => {
  const y = selectedYear.value
  const m = selectedMonth.value
  const res = await budgetsStore.computeForMonth(y, m)
  const arr = (budgetsStore.items || []).map(b => ({
    b,
    r: res[b.id] || { pct: 0, spent: 0, remaining: 0 }
  }))
  arr.sort((a, b) => (b.r?.pct || 0) - (a.r?.pct || 0))
  budgetsMonth.value = arr
  const prevMap = {}
  for (const it of arr) {
    try {
      prevMap[it.b.id] = Math.round(
        await budgetsStore.computePrevMonthPct(it.b, y, m)
      )
    } catch {
      prevMap[it.b.id] = 0
    }
  }
  budgetsPrevPct.value = prevMap
}

watch(monthTx, async () => {
  await computeBudgetsMonth()
  await goalsStore.loadProgress()
})

watch(
  () => budgetsStore.items,
  async () => {
    await computeBudgetsMonth()
  },
  { deep: true }
)

const barChartData = ref({})
const doughnutChartData = ref({})
const goalsChartData = ref({})

const barChartOptions = ref({})
const doughnutChartOptions = ref({})
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
    if (tx.type === 'expense' || tx.type === 'debtPayment')
      expense[i] += Number(tx.amount || 0)
  }

  return { labels, income, expense }
}

const buildBreakdown = items => {
  const map = { income: 0, expense: 0, debtPayment: 0 }
  for (const tx of items) {
    map[tx.type] = (map[tx.type] || 0) + Number(tx.amount || 0)
  }
  const labels = [
    t('transactions.form.income'),
    t('transactions.form.expense'),
    t('transactions.form.debtPayment')
  ]
  const data = [map.income || 0, map.expense || 0, map.debtPayment || 0]
  return { labels, data }
}

const updateCharts = async () => {
  await nextTick()
  const colorText = '#E0E1E9'
  const colorMuted = '#A3A8B8'
  const colorSuccess = '#10B981'
  const colorError = '#EF4444'
  const colorAccent = '#3B82F6'
  const colorWarning = '#F59E0B'
  const colorSecondary = '#6366F1'
  const gradientSuccess = 'linear-gradient(135deg, #10B981, #059669)'
  const gradientError = 'linear-gradient(135deg, #EF4444, #DC2626)'
  const gradientAccent = 'linear-gradient(135deg, #3B82F6, #2563EB)'

  const y = selectedYear.value
  const m = selectedMonth.value
  const items = monthTx.value
  const daily = buildDailySeries(items, y, m)
  const breakdown = buildBreakdown(items)
  const goalsData = buildGoalsProgress()

  barChartData.value = {
    labels: daily.labels,
    datasets: [
      {
        label: t('transactions.form.income'),
        data: daily.income,
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: colorSuccess,
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false,
        hoverBackgroundColor: 'rgba(16, 185, 129, 0.9)',
        hoverBorderColor: colorSuccess,
        hoverBorderWidth: 3
      },
      {
        label: t('transactions.form.expense'),
        data: daily.expense,
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: colorError,
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false,
        hoverBackgroundColor: 'rgba(239, 68, 68, 0.9)',
        hoverBorderColor: colorError,
        hoverBorderWidth: 3
      }
    ]
  }

  barChartOptions.value = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index'
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: colorText,
          usePointStyle: true,
          padding: 20,
          font: {
            size: 13,
            weight: '600'
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: colorText,
        bodyColor: colorText,
        borderColor: 'rgba(75, 85, 99, 0.3)',
        borderWidth: 1,
        cornerRadius: 12,
        padding: 16,
        displayColors: true,
        callbacks: {
          label: ctx => `${ctx.dataset.label}: ${formatAmount(ctx.parsed.y)}`,
          labelColor: function(context) {
            return {
              borderColor: context.dataset.borderColor,
              backgroundColor: context.dataset.backgroundColor,
              borderWidth: 2,
              borderRadius: 4
            }
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
          borderColor: 'rgba(156, 163, 175, 0.2)'
        },
        ticks: {
          color: colorMuted,
          font: {
            size: 12,
            weight: '500'
          }
        }
      },
      y: {
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
          borderColor: 'rgba(156, 163, 175, 0.2)'
        },
        ticks: {
          color: colorMuted,
          font: {
            size: 12,
            weight: '500'
          },
          callback: value => formatAmount(value)
        }
      }
    },
    elements: {
      bar: {
        borderRadius: 6
      }
    }
  }

  doughnutChartData.value = {
    labels: breakdown.labels,
    datasets: [
      {
        data: breakdown.data,
        backgroundColor: [
          'rgba(16, 185, 129, 0.9)',
          'rgba(239, 68, 68, 0.9)',
          'rgba(99, 102, 241, 0.9)'
        ],
        borderColor: [colorSuccess, colorError, colorSecondary],
        borderWidth: 3,
        hoverBackgroundColor: [
          'rgba(16, 185, 129, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(99, 102, 241, 1)'
        ],
        hoverBorderWidth: 4,
        hoverOffset: 8
      }
    ]
  }

  doughnutChartOptions.value = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: colorText,
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle',
          font: {
            size: 13,
            weight: '600'
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: colorText,
        bodyColor: colorText,
        borderColor: 'rgba(75, 85, 99, 0.3)',
        borderWidth: 1,
        cornerRadius: 12,
        padding: 16,
        callbacks: {
          label: ctx => `${ctx.label}: ${formatAmount(ctx.parsed)}`
        }
      }
    },
    cutout: '65%',
    radius: '90%'
  }

  goalsChartData.value = {
    labels: goalsData.labels,
    datasets: [
      {
        label: t('goals.table.progress'),
        data: goalsData.data,
        backgroundColor: goalsData.data.map(value =>
          value >= 100 ? 'rgba(16, 185, 129, 0.9)' :
          value >= 75 ? 'rgba(59, 130, 246, 0.9)' :
          value >= 50 ? 'rgba(245, 158, 11, 0.9)' :
          'rgba(239, 68, 68, 0.9)'
        ),
        borderColor: goalsData.data.map(value =>
          value >= 100 ? colorSuccess :
          value >= 75 ? colorAccent :
          value >= 50 ? colorWarning :
          colorError
        ),
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false
      }
    ]
  }

  goalsChartOptions.value = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: colorText,
        bodyColor: colorText,
        borderColor: 'rgba(75, 85, 99, 0.3)',
        borderWidth: 1,
        cornerRadius: 12,
        padding: 16,
        callbacks: {
          label: ctx => `${ctx.parsed.x}%`
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
          borderColor: 'rgba(156, 163, 175, 0.2)'
        },
        ticks: {
          color: colorMuted,
          font: {
            size: 12,
            weight: '500'
          },
          callback: v => `${v}%`
        }
      },
      y: {
        grid: {
          display: false
        },
        ticks: {
          color: colorMuted,
          font: {
            size: 12,
            weight: '500'
          }
        }
      },
      elements: {
        bar: {
          borderRadius: 8
        }
      }
    }
  }
}

watch(monthTx, () => updateCharts())
watch(() => goalsStore.progressById, () => updateCharts(), { deep: true })
watch(() => goalsStore.items, () => updateCharts(), { deep: true })
watch(() => settingsStore.amountFormat, () => updateCharts())

onMounted(async () => {
  await nextTick()
  setTimeout(() => {
    updateCharts()
  }, 100)
})
</script>

<template>
  <section>
    <div
      class="period-toolbar"
      role="toolbar"
      :aria-label="t('dashboard.filter.ariaLabel')"
    >
      <div class="field">
        <label>{{ t('common.year') }}</label>
        <select class="input" v-model.number="selectedYear">
          <option
            v-for="y in availableYears"
            :key="y"
            :value="y"
          >
            {{ y }}
          </option>
        </select>
      </div>
      <div class="field">
        <label>{{ t('common.month') }}</label>
        <select class="input" v-model.number="selectedMonth">
          <option
            v-for="m in availableMonths"
            :key="m"
            :value="m"
          >
            {{ monthLabels[m] }}
          </option>
        </select>
      </div>
    </div>

    <section class="dashboard-grid">
      <div class="dashboard-card">
        <h3>{{ t('dashboard.kpis.totalBalance') }}</h3>
        <div class="amount-format-toggle" v-if="false"></div>
        <p
          class="amount"
          :title="formatCurrency(totalBalance)"
        >
          {{ formatAmount(totalBalance) }}
        </p>
      </div>
      <div class="dashboard-card income">
        <h3>{{ t('dashboard.kpis.incomeMonth') }}</h3>
        <p
          class="amount"
          :title="formatCurrency(incomeSum)"
        >
          {{ formatAmount(incomeSum) }}
        </p>
      </div>
      <div class="dashboard-card expense">
        <h3>{{ t('dashboard.kpis.expenseMonth') }}</h3>
        <p
          class="amount"
          :title="formatCurrency(expenseSum)"
        >
          {{ formatAmount(expenseSum) }}
        </p>
      </div>
      <div class="dashboard-card">
        <h3>{{ t('dashboard.kpis.txCount') }}</h3>
        <p class="amount">{{ txCount }}</p>
      </div>
    </section>

    <div v-if="hasError" class="card error-state">
      <p>{{ t('common.retry') }}</p>
      <button
        class="button"
        @click="applyMonthFilter(selectedYear, selectedMonth)"
      >
        {{ t('common.retry') }}
      </button>
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
      <div
        v-if="!(budgetsMonth && budgetsMonth.length)"
        class="empty"
      >
        {{ t('dashboard.budgets.empty') }}
      </div>
      <ul v-else class="budgets-ul">
        <li
          v-for="it in budgetsMonth.slice(0,3)"
          :key="it.b.id"
          class="budget-item"
        >
          <div class="b-left">
            <div class="b-name">{{ it.b.name }}</div>
            <div class="b-period">
              {{
                it.b.periodType === 'monthly'
                  ? (monthLabels[selectedMonth] + ' ' + selectedYear)
                  : (it.b.periodFrom + ' \u2192 ' + it.b.periodTo)
              }}
            </div>
          </div>
          <div class="b-center">
            <div class="progress">
              <div class="bar">
                <div
                  class="fill"
                  :class="{
                    warn: (it.r?.pct || 0) >= (it.b.alertThresholdPct || 80) && (it.r?.pct || 0) < 100,
                    over: (it.r?.pct || 0) >= 100
                  }"
                  :style="{ width: Math.min(100, Math.max(0, Math.round(it.r?.pct || 0))) + '%' }"
                ></div>
              </div>
              <div class="pct">{{ Math.round(it.r?.pct || 0) }}%</div>
            </div>
          </div>
          <div class="b-right">
            <div class="b-remaining">
              {{ formatAmount(it.r?.remaining || 0, it.b.currency) }}
            </div>
            <div class="b-prev">
              {{ t('dashboard.budgets.prev', { pct: budgetsPrevPct[it.b.id] || 0 }) }}
            </div>
          </div>
        </li>
      </ul>
    </section>

    <section class="card goals-card" v-if="!isLoading && !hasError">
      <h3>{{ t('goals.title') }}</h3>
      <div
        v-if="!(goalsList && goalsList.length)"
        class="empty"
      >
        {{ t('goals.empty') }}
      </div>
      <ul v-else class="goals-ul">
        <li
          v-for="g in goalsList"
          :key="g.id"
          class="goal-item"
        >
          <div class="goal-left">
            <div class="goal-name">{{ g.name }}</div>
            <div class="goal-note">{{ g.note || '' }}</div>
          </div>
          <div class="goal-right">
            <div class="progress">
              <div class="bar">
                <div
                  class="fill"
                  :style="{ width: goalProgressPct(g.id) + '%' }"
                ></div>
              </div>
              <div class="pct">{{ goalProgressPct(g.id) }}%</div>
            </div>
            <div class="goal-target">
              {{ formatAmount(g.targetAmount, g.currency || 'COP') }}
            </div>
            <span
              v-if="goalCompleted(g.id)"
              class="badge badge-green"
            >
              {{ t('goals.completed') }}
            </span>
          </div>
        </li>
      </ul>
    </section>

    <section class="card tx-list" v-if="!isLoading && !hasError">
      <h3>{{ t('dashboard.list.title') }}</h3>
      <div
        v-if="!monthEvents.length"
        class="empty"
      >
        {{ t('dashboard.list.empty') }}
      </div>
      <ul v-else class="tx-ul">
        <li
          v-for="it in visibleTx"
          :key="it.id"
          class="tx-item"
        >
          <div class="tx-left">
            <div class="tx-date">{{ formatDate(it.date) }}</div>
            <div class="tx-note">
              <span>{{ it.note || '-' }}</span>
              <span
                v-if="it.isRecurring || it.recurringTemplateId"
                class="badge badge-rec"
              >
                {{ t('recurring.badge') }}
              </span>
            </div>
          </div>
          <div class="tx-right">
            <div class="tx-account">{{ getAccountName(it.accountId) }}</div>
            <div
              class="tx-amount"
              :class="{
                inc: it.type === 'income',
                exp: it.type === 'expense' || it.type === 'debtPayment'
              }"
            >
              {{ formatAmount(it.amount, it.currency || 'COP') }}
            </div>
          </div>
        </li>
      </ul>
      <div class="see-more" v-if="canSeeMore">
        <button
          class="button button-secondary"
          @click="seeMore"
        >
          {{ t('dashboard.list.seeMore') }}
        </button>
      </div>
    </section>
  </section>
</template>

<style scoped>
.period-toolbar {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, var(--primary-color), rgba(var(--accent-color-rgb, 59, 130, 246), 0.05));
  border-radius: 16px;
  box-shadow: 0 4px 20px var(--shadow-soft);
  border: 1px solid rgba(var(--accent-color-rgb, 59, 130, 246), 0.1);
  align-items: flex-end;
  flex-wrap: wrap;
  backdrop-filter: blur(10px);
}

.field {
  min-width: 160px;
  position: relative;
}

.field label {
  display: block;
  margin-bottom: .5rem;
  color: var(--muted-text-color);
  font-weight: 600;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.field select.input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid rgba(var(--accent-color-rgb, 59, 130, 246), 0.2);
  border-radius: 12px;
  background: var(--primary-color);
  color: var(--text-color);
  font-size: 1rem;
  font-weight: 500;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.field select.input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 4px rgba(var(--accent-color-rgb, 59, 130, 246), 0.1);
  transform: translateY(-2px);
}

.field select.input:hover {
  border-color: rgba(var(--accent-color-rgb, 59, 130, 246), 0.4);
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
  margin-bottom: 2rem;
}

.dashboard-card {
  background: linear-gradient(135deg, var(--primary-color), rgba(var(--accent-color-rgb, 59, 130, 246), 0.02));
  padding: 2rem;
  border-radius: 20px;
  box-shadow:
    0 8px 32px var(--shadow-soft),
    0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(var(--accent-color-rgb, 59, 130, 246), 0.1);
  border-left: 5px solid var(--accent-color);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(10px);
}

.dashboard-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--accent-color), rgba(var(--accent-color-rgb, 59, 130, 246), 0.3));
  opacity: 0;
  transition: opacity 0.3s ease;
}

.dashboard-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow:
    0 16px 48px var(--shadow-soft),
    0 8px 24px rgba(0, 0, 0, 0.1);
  border-color: var(--accent-color);
}

.dashboard-card:hover::before {
  opacity: 1;
}

.dashboard-card h3 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--muted-text-color);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.dashboard-card .amount {
  margin: 0;
  font-size: clamp(1.2rem, 2vw, 1.8rem);
  font-weight: 700;
  color: var(--text-color);
  background: linear-gradient(135deg, var(--text-color), var(--accent-color));
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -0.5px;
  line-height: 1.2;
  word-break: break-all;
  overflow-wrap: break-word;
  max-width: 100%;
  display: block;
}

.dashboard-card.income {
  border-left-color: #10B981;
  background: linear-gradient(135deg, var(--primary-color), rgba(16, 185, 129, 0.05));
}

.dashboard-card.income .amount {
  background: linear-gradient(135deg, #10B981, #059669);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.dashboard-card.expense {
  border-left-color: #EF4444;
  background: linear-gradient(135deg, var(--primary-color), rgba(239, 68, 68, 0.05));
}

.dashboard-card.expense .amount {
  background: linear-gradient(135deg, #EF4444, #DC2626);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.charts-grid {
  margin: 3rem 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 2rem;
}

.chart-card {
  background: linear-gradient(135deg, var(--primary-color), rgba(var(--accent-color-rgb, 59, 130, 246), 0.02));
  padding: 2rem;
  border-radius: 20px;
  box-shadow:
    0 8px 32px var(--shadow-soft),
    0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(var(--accent-color-rgb, 59, 130, 246), 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(10px);
  min-height: 400px;
}

.chart-card:hover {
  transform: translateY(-4px);
  box-shadow:
    0 16px 48px var(--shadow-soft),
    0 8px 24px rgba(0, 0, 0, 0.1);
  border-color: rgba(var(--accent-color-rgb, 59, 130, 246), 0.3);
}

.chart-card h3 {
  margin: 0 0 1.5rem 0;
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--text-color);
  text-align: center;
  position: relative;
  padding-bottom: 1rem;
}

.chart-card h3::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 3px;
  background: linear-gradient(90deg, var(--accent-color), rgba(var(--accent-color-rgb, 59, 130, 246), 0.3));
  border-radius: 2px;
}

.budgets-card, .goals-card {
  margin-top: 2rem;
  background: linear-gradient(135deg, var(--primary-color), rgba(var(--accent-color-rgb, 59, 130, 246), 0.02));
  padding: 2rem;
  border-radius: 20px;
  box-shadow:
    0 8px 32px var(--shadow-soft),
    0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(var(--accent-color-rgb, 59, 130, 246), 0.1);
  backdrop-filter: blur(10px);
}

.budgets-card h3, .goals-card h3 {
  margin: 0 0 1.5rem 0;
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text-color);
  text-align: center;
  position: relative;
  padding-bottom: 1rem;
}

.budgets-card h3::after, .goals-card h3::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 80px;
  height: 3px;
  background: linear-gradient(90deg, var(--accent-color), rgba(var(--accent-color-rgb, 59, 130, 246), 0.3));
  border-radius: 2px;
}

.budgets-ul, .goals-ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.budget-item, .goal-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: rgba(var(--accent-color-rgb, 59, 130, 246), 0.03);
  border-radius: 16px;
  border: 1px solid rgba(var(--accent-color-rgb, 59, 130, 246), 0.1);
  gap: 1rem;
  flex-wrap: wrap;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.budget-item:hover, .goal-item:hover {
  transform: translateX(8px);
  background: rgba(var(--accent-color-rgb, 59, 130, 246), 0.05);
  border-color: rgba(var(--accent-color-rgb, 59, 130, 246), 0.2);
  box-shadow: 0 4px 16px var(--shadow-soft);
}

.b-left, .goal-left {
  display: grid;
  min-width: 200px;
  gap: 0.5rem;
}

.b-name, .goal-name {
  color: var(--text-color);
  font-weight: 700;
  font-size: 1.1rem;
}

.b-period, .goal-note {
  color: var(--muted-text-color);
  font-size: 0.9rem;
  font-weight: 500;
}

.b-center {
  flex: 1 1 280px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 250px;
}

.b-right {
  text-align: right;
  display: grid;
  gap: 0.5rem;
  min-width: 160px;
}

.b-remaining {
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--text-color);
}

.b-prev {
  font-size: 0.9rem;
  color: var(--muted-text-color);
  font-weight: 500;
}

.progress {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  max-width: 400px;
}

.progress .bar {
  flex: 1;
  height: 12px;
  background: rgba(var(--accent-color-rgb, 59, 130, 246), 0.1);
  border-radius: 20px;
  overflow: hidden;
  position: relative;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
}

.progress .fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-color), rgba(var(--accent-color-rgb, 59, 130, 246), 0.8));
  border-radius: 20px;
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.progress .fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  animation: shimmer 2s infinite;
}

.progress .fill.warn {
  background: linear-gradient(90deg, #F59E0B, #D97706);
}

.progress .fill.over {
  background: linear-gradient(90deg, #EF4444, #DC2626);
}

.progress .pct {
  color: var(--text-color);
  font-size: 1rem;
  font-weight: 700;
  min-width: 50px;
  text-align: right;
}

@keyframes shimmer {
  0% { left: -100%; }
  100% { left: 100%; }
}

.goal-right {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  min-width: 300px;
}

.goal-target {
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--text-color);
  padding: 0.5rem 1rem;
  background: rgba(var(--accent-color-rgb, 59, 130, 246), 0.1);
  border-radius: 12px;
  border: 1px solid rgba(var(--accent-color-rgb, 59, 130, 246), 0.2);
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  transition: all 0.3s ease;
}

.badge-green {
  background: linear-gradient(135deg, #10B981, #059669);
  color: white;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}

.badge-rec {
  background: linear-gradient(135deg, var(--accent-color), rgba(var(--accent-color-rgb, 59, 130, 246), 0.8));
  color: white;
  margin-left: 0.5rem;
  box-shadow: 0 2px 8px rgba(var(--accent-color-rgb, 59, 130, 246), 0.3);
}

.tx-list {
  margin-top: 2rem;
  background: linear-gradient(135deg, var(--primary-color), rgba(var(--accent-color-rgb, 59, 130, 246), 0.02));
  padding: 2rem;
  border-radius: 20px;
  box-shadow:
    0 8px 32px var(--shadow-soft),
    0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(var(--accent-color-rgb, 59, 130, 246), 0.1);
  backdrop-filter: blur(10px);
}

.tx-list h3 {
  margin: 0 0 1.5rem 0;
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text-color);
  text-align: center;
  position: relative;
  padding-bottom: 1rem;
}

.tx-list h3::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 80px;
  height: 3px;
  background: linear-gradient(90deg, var(--accent-color), rgba(var(--accent-color-rgb, 59, 130, 246), 0.3));
  border-radius: 2px;
}

.tx-ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.tx-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;
  border-bottom: 1px solid rgba(var(--accent-color-rgb, 59, 130, 246), 0.1);
  transition: all 0.3s ease;
}

.tx-item:hover {
  padding-left: 1rem;
  background: rgba(var(--accent-color-rgb, 59, 130, 246), 0.03);
  border-radius: 12px;
  border-bottom-color: transparent;
}

.tx-left {
  display: grid;
  gap: 0.25rem;
}

.tx-date {
  color: var(--muted-text-color);
  font-size: 0.9rem;
  font-weight: 500;
}

.tx-note {
  color: var(--text-color);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tx-right {
  text-align: right;
  display: grid;
  gap: 0.25rem;
}

.tx-account {
  color: var(--muted-text-color);
  font-size: 0.9rem;
  font-weight: 500;
}

.tx-amount {
  font-weight: 700;
  font-size: 1.1rem;
}

.tx-amount.inc {
  color: #10B981;
}

.tx-amount.exp {
  color: #EF4444;
}

.see-more {
  margin-top: 2rem;
  text-align: center;
}

.see-more .button {
  padding: 1rem 2rem;
  border-radius: 14px;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.see-more .button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px var(--shadow-soft);
}

.error-state, .loading-state {
  margin-top: 2rem;
  padding: 2rem;
  text-align: center;
  background: linear-gradient(135deg, var(--primary-color), rgba(239, 68, 68, 0.05));
  border-radius: 16px;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.empty {
  text-align: center;
  padding: 2rem;
  color: var(--muted-text-color);
  font-style: italic;
  font-size: 1.1rem;
}

@media (max-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .charts-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .chart-card {
    min-height: 350px;
  }

  .budget-item, .goal-item {
    flex-direction: column;
    align-items: stretch;
    padding: 1rem;
  }

  .b-center {
    order: 3;
    margin-top: 1rem;
  }

  .b-right {
    order: 2;
    text-align: left;
    margin-top: 0.5rem;
  }

  .goal-right {
    justify-content: space-between;
    min-width: auto;
    margin-top: 1rem;
  }

  .period-toolbar {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }

  .field {
    min-width: auto;
    width: 100%;
  }

  .tx-item {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }

  .tx-right {
    text-align: left;
  }
}

@media (max-width: 480px) {
  .dashboard-card {
    padding: 1.5rem;
  }

  .chart-card, .budgets-card, .goals-card, .tx-list {
    padding: 1.5rem;
  }

  .dashboard-card .amount {
    font-size: clamp(1.5rem, 8vw, 2rem);
  }
}
</style>
