import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useDebts } from '@/composables/useDebts.js'
import { useNotify } from '@/components/global/fcNotify.js'
import { t } from '@/i18n/index.js'

export const useDebtsStore = defineStore('debts', () => {
  const items = ref([])
  const status = ref('idle')
  const error = ref(null)
  const _unsubscribe = ref(null)

  const { subscribeDebts, createDebt, updateDebt, deleteDebt } = useDebts()
  const { success, error: notifyError } = useNotify()

  const subscribeMyDebts = async () => {
    if (_unsubscribe.value) _unsubscribe.value()
    status.value = 'loading'
    try {
      _unsubscribe.value = subscribeDebts(list => {
        items.value = list
        status.value = 'success'
      })
    } catch (e) {
      error.value = e?.message || 'Error'
      status.value = 'error'
    }
  }

  const unsubscribe = () => {
    if (_unsubscribe.value) {
      _unsubscribe.value()
      _unsubscribe.value = null
    }
  }

  const getDebtById = id => computed(() => items.value.find(a => a.id === id))

  const create = async ({ name, amount, dueDate, currency }) => {
    if (Number(amount) < 0) {
      notifyError(t('debts.form.amountError'))
      throw new Error('invalid-amount')
    }
    try {
      const id = await createDebt({
        name,
        amount: Number(amount || 0),
        dueDate,
        currency
      })
      success(t('debts.notifications.created'))
      return id
    } catch (e) {
      notifyError(e?.message || 'Error')
      throw e
    }
  }

  const update = async (id, patch) => {
    try {
      await updateDebt(id, patch)
      success(t('debts.notifications.updated'))
    } catch (e) {
      notifyError(e?.message || 'Error')
      throw e
    }
  }

  const remove = async id => {
    try {
      await deleteDebt(id)
      success(t('debts.notifications.deleted'))
    } catch (e) {
      throw e
    }
  }

  const hasItems = computed(() => items.value.length > 0)

  return {
    items,
    status,
    error,
    subscribeMyDebts,
    unsubscribe,
    getDebtById,
    create,
    update,
    remove,
    hasItems
  }
})
