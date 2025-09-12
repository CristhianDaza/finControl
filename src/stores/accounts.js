import {defineStore} from 'pinia'
import {computed, ref, watchEffect} from 'vue'
import {useAccounts} from '@/composables/useAccounts.js'
import {useNotify} from '@/components/global/fcNotify.js'
import {t} from '@/i18n/index.js'
import {useAuth} from '@/composables/useAuth.js'

export const useAccountsStore = defineStore('accounts', () => {
  const items = ref([])
  const status = ref('idle')
  const error = ref(null)
  const _unsubscribe = ref(null)

  const { subscribeAccounts, createAccount, updateAccountName, deleteAccount } = useAccounts()
  const { success, error: notifyError } = useNotify()

  const subscribeMyAccounts = async () => {
    if (_unsubscribe.value) _unsubscribe.value()
    status.value = 'loading'
    try {
      const { onAuthReady } = useAuth()
      const user = await onAuthReady()
      if (!user) { items.value = []; status.value = 'success'; return }
      _unsubscribe.value = subscribeAccounts(list => { items.value = list; status.value = 'success' })
    } catch (e) {
      error.value = e?.message || 'Error'
      status.value = 'error'
    }
  }

  const unsubscribe = () => { if (_unsubscribe.value) { _unsubscribe.value(); _unsubscribe.value = null } }

  // Memoized accounts lookup for better performance
  const accountsById = computed(() => {
    const map = new Map()
    for (const account of items.value) {
      map.set(account.id, account)
    }
    return map
  })
  
  const getAccountById = (id) => computed(() => accountsById.value.get(id))

  const create = async ({ name, balance, currency }) => {
    if (Number(balance) < 0) { notifyError(t('accounts.form.balanceError')); throw new Error('invalid-balance') }
    try {
      const id = await createAccount({ name, balance: Number(balance), currency: currency || t('currency.default') })
      success(t('accounts.notifications.created'))
      return id
    } catch (e) {
      notifyError(e?.message || 'Error')
      throw e
    }
  }

  const updateName = async (id, name) => {
    try { await updateAccountName(id, name); success(t('accounts.notifications.updated')) }
    catch (e) { notifyError(e?.message || 'Error'); throw e }
  }

  const remove = async (id) => {
    try {
      await deleteAccount(id)
      success(t('accounts.notifications.deleted'))
    } catch (e) {
      throw e
    }
  }

  // Optimized balance calculation
  const totalBalance = computed(() => {
    let total = 0
    for (const account of items.value) {
      total += Number(account.balance || 0)
    }
    return total
  })
  
  const hasItems = computed(() => items.value.length > 0)
  
  // Additional memoized properties for better UX
  const accountsByName = computed(() => {
    return [...items.value].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  })
  
  const accountsByCurrency = computed(() => {
    const grouped = new Map()
    for (const account of items.value) {
      const currency = account.currency || 'COP'
      if (!grouped.has(currency)) {
        grouped.set(currency, [])
      }
      grouped.get(currency).push(account)
    }
    return grouped
  })
  
  const totalBalanceByCurrency = computed(() => {
    const totals = new Map()
    for (const account of items.value) {
      const currency = account.currency || 'COP'
      const balance = Number(account.balance || 0)
      totals.set(currency, (totals.get(currency) || 0) + balance)
    }
    return totals
  })

  return {
    items, status, error,
    subscribeMyAccounts, unsubscribe,
    getAccountById, accountsById,
    createAccount: create,
    updateAccountName: updateName,
    deleteAccount: remove,
    create, updateName, remove,
    totalBalance, hasItems,
    // Additional memoized properties
    accountsByName, accountsByCurrency, totalBalanceByCurrency
  }
})
