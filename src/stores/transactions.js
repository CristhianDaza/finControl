import { defineStore } from 'pinia'
import { ref, computed, onUnmounted } from 'vue'
import { useTransactions } from '@/composables/useTransactions.js'
import { useNotify } from '@/components/global/fcNotify.js'

export const useTransactionsStore = defineStore('transactions', () => {
  const items = ref([])
  const status = ref('idle')
  const error = ref(null)
  const selected = ref(null)
  const filters = ref({})
  const orderBy = ref([{ field: 'date', dir: 'desc' }, { field: 'createdAt', dir: 'desc' }])
  const unsubscribe = ref(null)

  const { subscribeTransactions, fetchTransactions, createTransaction, updateTransaction, deleteTransaction } = useTransactions()
  const { success, error: notifyError } = useNotify()

  const init = async () => {
    if (unsubscribe.value) unsubscribe.value()
    status.value = 'loading'
    try {
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
      const list = await fetchTransactions({ ...filters.value, orderBy: orderBy.value })
      items.value = list
      status.value = 'success'
    } catch (e) {
      error.value = e && e.message ? e.message : 'Error'
      status.value = 'error'
    }
  }

  const add = async payload => {
    try {
      const id = await createTransaction({ type: payload.type, amount: payload.amount, accountId: payload.account, date: payload.date, note: payload.description })
      success('Transacción creada')
      return id
    } catch (e) {
      notifyError('No se pudo crear la transacción')
      throw e
    }
  }

  const edit = async (id, patch) => {
    try {
      await updateTransaction(id, patch)
      success('Transacción actualizada')
    } catch (e) {
      notifyError('No se pudo actualizar la transacción')
      throw e
    }
  }

  const remove = async id => {
    try {
      await deleteTransaction(id)
      success('Transacción eliminada')
    } catch (e) {
      notifyError('No se pudo eliminar la transacción')
      throw e
    }
  }

  const setFilters = f => { filters.value = { ...filters.value, ...f }; init() }
  const setOrder = o => { orderBy.value = Array.isArray(o) ? o : orderBy.value; init() }

  const hasItems = computed(() => items.value.length > 0)
  const byId = id => computed(() => items.value.find(t => t.id === id))
  const totals = computed(() => { const income = items.value.filter(i => i.type === 'income').reduce((a,b)=>a+Number(b.amount||0),0); const expense = items.value.filter(i => i.type === 'expense').reduce((a,b)=>a+Number(b.amount||0),0); return { income, expense, balance: income - expense } })

  onUnmounted(() => dispose())

  return { items, status, error, selected, filters, orderBy, unsubscribe, init, dispose, reload, add, edit, remove, setFilters, setOrder, hasItems, byId, totals }
})

