import {defineStore} from 'pinia'
import {computed, onUnmounted, ref} from 'vue'
import {useTransactions} from '@/composables/useTransactions.js'
import {useNotify} from '@/components/global/fcNotify.js'
import {t} from '@/i18n/index.js'
import {useAuth} from '@/composables/useAuth.js'

export const useTransactionsStore = defineStore('transactions', () => {
  const items = ref([])
  const status = ref('idle')
  const error = ref(null)
  const selected = ref(null)
  const filters = ref({})
  const orderBy = ref([{ field: 'date', dir: 'desc' }, { field: 'createdAt', 'dir': 'desc' }])
  const unsubscribe = ref(null)

  const { subscribeTransactions, fetchTransactions, createTransaction, updateTransaction, editTransaction, deleteTransaction } = useTransactions()
  const { success, error: notifyError } = useNotify()

  const init = async () => {
    if (unsubscribe.value) unsubscribe.value()
    status.value = 'loading'
    try {
      const { onAuthReady } = useAuth()
      const user = await onAuthReady()
      if (!user) { items.value = []; status.value = 'success'; return }
      unsubscribe.value = subscribeTransactions(list => { items.value = list; status.value = 'success' }, { ...filters.value, orderBy: orderBy.value })
    } catch (e) {
      error.value = e && e.message ? e.message : 'Error'
      status.value = 'error'
    }
  }

  const dispose = () => { if (unsubscribe.value) { unsubscribe.value(); unsubscribe.value = null } }

  const reload = async () => {
    status.value = 'loading'
    try {
      const { onAuthReady } = useAuth()
      const user = await onAuthReady()
      if (!user) { items.value = []; status.value = 'success'; return }
      items.value = await fetchTransactions({...filters.value, orderBy: orderBy.value})
      status.value = 'success'
    } catch (e) {
      error.value = e && e.message ? e.message : 'Error'
      status.value = 'error'
    }
  }

  const add = async payload => {
    try {
      const id = await createTransaction({ type: payload.type, amount: payload.amount, accountId: payload.account, date: payload.date, note: payload.description, debtId: payload.debt, goalId: payload.goal })
      success(t('transactions.notifications.created'))
      return id
    } catch (e) {
      const map = {
        BalanceNegative: t('transactions.notifications.balanceNegative'),
        DebtRemainingNegative: t('transactions.notifications.debtRemainingNegative'),
        DebtRequired: t('transactions.notifications.debtRequired'),
        DebtNotFound: t('transactions.notifications.debtNotFound'),
        AccountNotFound: t('transactions.notifications.accountNotFound'),
        Unauthorized: t('transactions.notifications.unauthorized'),
        InvalidAmount: t('transactions.notifications.invalidAmount'),
        InvalidType: t('transactions.notifications.invalidType'),
        AccountRequired: t('transactions.notifications.accountRequired'),
        InvalidDate: t('transactions.notifications.invalidDate')
      }
      const msg = map[e?.message] || t('transactions.notifications.unauthorized')
      notifyError(msg)
      throw e
    }
  }

  const edit = async (id, patch) => {
    try {
      const prev = items.value.find(i => i.id === id)
      const wantsType = patch?.type
      const isIncomeOrExpense = (tpe) => ['income','expense'].includes(tpe)
      if (prev && prev.isTransfer !== true && (isIncomeOrExpense(prev.type) || (wantsType && isIncomeOrExpense(wantsType)))) {
        await editTransaction(id, patch)
      } else {
        await updateTransaction(id, patch)
      }
      success(t('transactions.notifications.updated'))
    } catch (e) {
      const map = {
        BalanceNegative: t('transactions.notifications.balanceNegative'),
        DebtRemainingNegative: t('transactions.notifications.debtRemainingNegative'),
        DebtRequired: t('transactions.notifications.debtRequired'),
        DebtNotFound: t('transactions.notifications.debtNotFound'),
        AccountNotFound: t('transactions.notifications.accountNotFound'),
        Unauthorized: t('transactions.notifications.unauthorized'),
        InvalidAmount: t('transactions.notifications.invalidAmount'),
        InvalidType: t('transactions.notifications.invalidType'),
        AccountRequired: t('transactions.notifications.accountRequired'),
        InvalidDate: t('transactions.notifications.invalidDate')
      }
      const msg = map[e?.message] || t('transactions.notifications.unauthorized')
      notifyError(msg)
      throw e
    }
  }

  const remove = async id => {
    try {
      await deleteTransaction(id)
      success(t('transactions.notifications.deleted'))
    } catch (e) {
      const map = {
        BalanceNegative: t('transactions.notifications.balanceNegative'),
        DebtRemainingNegative: t('transactions.notifications.debtRemainingNegative'),
        DebtRequired: t('transactions.notifications.debtRequired'),
        DebtNotFound: t('transactions.notifications.debtNotFound'),
        AccountNotFound: t('transactions.notifications.accountNotFound'),
        Unauthorized: t('transactions.notifications.unauthorized'),
        InvalidAmount: t('transactions.notifications.invalidAmount'),
        InvalidType: t('transactions.notifications.invalidType'),
        AccountRequired: t('transactions.notifications.accountRequired'),
        InvalidDate: t('transactions.notifications.invalidDate')
      }
      const msg = map[e?.message] || t('transactions.notifications.unauthorized')
      notifyError(msg)
      throw e
    }
  }

  const setFilters = f => {
    filters.value = Object.fromEntries(Object.entries(f || {}).filter(([_, v]) => v !== '' && v != null))
    init().then(r => { return r }).catch(() => { /* noop */ })
  }
  const setOrder = o => { orderBy.value = Array.isArray(o) ? o : orderBy.value; init().then(r => { return r }).catch(() => { /* noop */ }) }

  const hasItems = computed(() => items.value.length > 0)
  const byId = id => computed(() => items.value.find(ti => ti.id === id))
  const totals = computed(() => { const income = items.value.filter(i => i.type === 'income').reduce((a,b)=>a+Number(b.amount||0),0); const expense = items.value.filter(i => i.type === 'expense').reduce((a,b)=>a+Number(b.amount||0),0); return { income, expense, balance: income - expense } })

  const availablePeriods = ref({ years: [], monthsByYear: {} })
  const loadAvailablePeriods = async () => {
    try {
      const { onAuthReady } = useAuth()
      const user = await onAuthReady()
      if (!user) { availablePeriods.value = { years: [], monthsByYear: {} }; return availablePeriods.value }
      const all = await fetchTransactions({})
      const monthsMap = {}
      for (const it of all) {
        const ds = String(it.date || '')
        if (!/^\d{4}-\d{2}-\d{2}$/.test(ds)) continue
        const y = Number(ds.slice(0, 4))
        const m = Number(ds.slice(5, 7)) - 1
        if (!monthsMap[y]) monthsMap[y] = new Set()
        monthsMap[y].add(m)
      }
      const years = Object.keys(monthsMap).map(n => Number(n)).sort((a,b)=>a-b)
      const monthsByYear = {}
      for (const y of years) {
        monthsByYear[y] = Array.from(monthsMap[y]).sort((a,b)=>a-b)
      }
      availablePeriods.value = { years, monthsByYear }
      return availablePeriods.value
    } catch (e) {
      availablePeriods.value = { years: [], monthsByYear: {} }
      return availablePeriods.value
    }
  }

  onUnmounted(() => dispose())

  return { items, status, error, selected, filters, orderBy, unsubscribe, init, dispose, reload, add, edit, remove, setFilters, setOrder, hasItems, byId, totals, availablePeriods, loadAvailablePeriods }
})
