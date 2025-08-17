import { defineStore } from 'pinia'
import { ref, onUnmounted } from 'vue'
import { useBudgets } from '@/composables/useBudgets.js'
import { useTransactions } from '@/composables/useTransactions.js'
import { useNotify } from '@/components/global/fcNotify.js'
import { t } from '@/i18n/index.js'
import { useAuth } from '@/composables/useAuth.js'

const pad2 = (n) => String(n).padStart(2, '0')

export const useBudgetsStore = defineStore('budgets', () => {
  const items = ref([])
  const status = ref('idle')
  const error = ref(null)
  const unsubscribe = ref(null)
  const progressById = ref({})

  const { subscribeBudgets, createBudget, updateBudget, deleteBudget } = useBudgets()
  const { fetchTransactions } = useTransactions()
  const { success, error: notifyError } = useNotify()

  const init = async (opts = {}) => {
    if (unsubscribe.value) unsubscribe.value()
    status.value = 'loading'
    try {
      const { onAuthReady } = useAuth()
      const user = await onAuthReady()
      if (!user) { items.value = []; status.value = 'success'; return }
      unsubscribe.value = subscribeBudgets((list) => { items.value = list; status.value = 'success' }, opts)
    } catch (e) { error.value = e?.message || 'Error'; status.value = 'error' }
  }
  const dispose = () => { if (unsubscribe.value) { unsubscribe.value(); unsubscribe.value = null } }

  const add = async (payload) => { try { await createBudget(payload); success(t('budgets.notifications.created')) } catch (e) { notifyError(t('errors.generic')); throw e } }
  const edit = async (id, patch) => { try { await updateBudget(id, patch); success(t('budgets.notifications.updated')) } catch (e) { notifyError(t('errors.generic')); throw e } }
  const remove = async (id) => { try { await deleteBudget(id); success(t('budgets.notifications.deleted')) } catch (e) { notifyError(t('errors.generic')); throw e } }

  const currencyConvert = (amount, fromCur, budget) => {
    const toCur = budget.currency || 'COP'
    if (!fromCur || fromCur === toCur) return { value: Number(amount || 0), missingRate: false }
    const rate = budget.currencyRates && budget.currencyRates[fromCur]
    if (!rate) return { value: Number(amount || 0), missingRate: true }
    return { value: Number(amount || 0) * Number(rate), missingRate: false }
  }

  const isRefundTx = (tx) => {
    if (tx?.meta?.isRefund || tx?.isRefund) return true
    const note = String(tx?.note || '').toLowerCase()
    return note.includes('reembolso') || note.includes('refund')
  }

  const buildPeriod = (year, monthIndex) => {
    const fromStr = `${year}-${pad2(monthIndex + 1)}-01`
    const last = new Date(year, monthIndex + 1, 0).getDate()
    const toStr = `${year}-${pad2(monthIndex + 1)}-${pad2(last)}`
    return { fromStr, toStr }
  }

  const computeBudget = async (budget, period) => {
    try {
      const from = period?.fromStr || budget.periodFrom
      const to = period?.toStr || budget.periodTo
      if (!from || !to) return { spent: 0, pct: 0, remaining: Number(budget.targetAmount||0), missingRates: false, from, to }
      const txs = await fetchTransactions({ from, to })
      const scopeCats = Array.isArray(budget.categories) && budget.categories.length ? new Set(budget.categories) : null
      const excludeAcc = new Set(budget.excludeAccounts || [])
      let spent = 0
      let missingRates = false
      for (const tx of txs) {
        if (excludeAcc.has(tx.accountId)) continue
        if (scopeCats && tx.categoryId && !scopeCats.has(tx.categoryId)) continue
        if (tx.type === 'income') {
          if (isRefundTx(tx)) {
            const { value, missingRate } = currencyConvert(tx.amount, tx.currency, budget)
            missingRates = missingRates || missingRate
            spent -= value
          }
          continue
        }
        if (tx.type === 'expense' || tx.type === 'debtPayment') {
          const { value, missingRate } = currencyConvert(tx.amount, tx.currency, budget)
          missingRates = missingRates || missingRate
          spent += value
        }
      }
      const effectiveTarget = Number(budget.targetAmount || 0) + (budget.carryover ? Number(budget.carryoverBalance || 0) : 0)
      const pct = effectiveTarget > 0 ? (spent / effectiveTarget) * 100 : 0
      const remaining = effectiveTarget - spent
      return { spent, pct, remaining, missingRates, from, to, effectiveTarget }
    } catch (e) {
      return { spent: 0, pct: 0, remaining: Number(budget.targetAmount||0), missingRates: false, from: period?.fromStr||budget.periodFrom, to: period?.toStr||budget.periodTo }
    }
  }

  const computeForMonth = async (year, monthIndex) => {
    const perKey = (b) => `${b.id}|${year}-${pad2(monthIndex+1)}`
    const results = {}
    const period = buildPeriod(year, monthIndex)
    for (const b of items.value) {
      const usePeriod = b.periodType === 'monthly' ? period : { fromStr: b.periodFrom, toStr: b.periodTo }
      const r = await computeBudget(b, usePeriod)
      results[b.id] = { ...r, periodKey: perKey(b) }
    }
    progressById.value = { ...progressById.value, ...results }
    return results
  }

  const computePrevMonthPct = async (b, year, monthIndex) => {
    const date = new Date(year, monthIndex, 1)
    date.setMonth(date.getMonth() - 1)
    const py = date.getFullYear(), pm = date.getMonth()
    const period = b.periodType === 'monthly' ? buildPeriod(py, pm) : { fromStr: b.periodFrom, toStr: b.periodTo }
    const r = await computeBudget(b, period)
    return r.pct
  }

  const closePeriod = async (budgetId, year, monthIndex) => {
    const b = items.value.find(x => x.id === budgetId)
    if (!b) return
    if (!b.carryover) return
    const period = b.periodType === 'monthly' ? buildPeriod(year, monthIndex) : { fromStr: b.periodFrom, toStr: b.periodTo }
    const r = await computeBudget(b, period)
    const delta = Number(b.targetAmount || 0) - Number(r.spent || 0)
    const nextCarry = Number(b.carryoverBalance || 0) + delta
    try {
      await edit(budgetId, { carryoverBalance: nextCarry, lastClosedPeriodKey: `${year}-${pad2(monthIndex+1)}` })
      success(t('budgets.notifications.closed'))
    } catch (e) { notifyError(t('errors.generic')) }
  }

  onUnmounted(() => dispose())

  return { items, status, error, progressById, init, dispose, add, edit, remove, computeBudget, computeForMonth, computePrevMonthPct, closePeriod }
})
