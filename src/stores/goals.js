import { defineStore } from 'pinia'
import { ref, onUnmounted } from 'vue'
import { useGoals } from '@/composables/useGoals.js'
import { useTransactions } from '@/composables/useTransactions.js'
import { useNotify } from '@/components/global/fcNotify.js'
import { t } from '@/i18n/index.js'

export const useGoalsStore = defineStore('goals', () => {
  const items = ref([])
  const status = ref('idle')
  const error = ref(null)
  const unsubscribe = ref(null)
  const progressById = ref({})

  const { subscribeGoals, createGoal, updateGoal, deleteGoal } = useGoals()
  const { fetchTransactions } = useTransactions()
  const { success, error: notifyError } = useNotify()

  const init = async (opts = {}) => {
    if (unsubscribe.value) unsubscribe.value()
    status.value = 'loading'
    try {
      unsubscribe.value = subscribeGoals((list) => { items.value = list; status.value = 'success' }, opts)
    } catch (e) {
      error.value = e?.message || 'Error'
      status.value = 'error'
    }
  }

  const dispose = () => { if (unsubscribe.value) { unsubscribe.value(); unsubscribe.value = null } }

  const add = async (payload) => {
    try { await createGoal(payload); success(t('goals.notifications.created')) }
    catch (e) { notifyError(t('errors.generic')); throw e }
  }

  const edit = async (id, patch) => {
    try { await updateGoal(id, patch); success(t('goals.notifications.updated')) }
    catch (e) { notifyError(t('errors.generic')); throw e }
  }

  const remove = async (id) => {
    try { await deleteGoal(id); success(t('goals.notifications.deleted')) }
    catch (e) { notifyError(t('errors.generic')); throw e }
  }

  const pause = async (id) => edit(id, { paused: true })
  const resume = async (id) => edit(id, { paused: false })

  const loadProgress = async () => {
    const map = {}
    for (const g of items.value) {
      try {
        const txs = await fetchTransactions({ goalId: g.id })
        map[g.id] = txs.reduce((a,b)=> a + Number(b.amount||0), 0)
      } catch { map[g.id] = 0 }
    }
    progressById.value = map
    return map
  }

  const progressPct = (id) => {
    const g = items.value.find(x=>x.id===id)
    if (!g) return 0
    const tgt = Number(g.targetAmount||0)
    if (tgt <= 0) return 0
    const cur = Number(progressById.value[id] || 0)
    return Math.min(100, (cur / tgt) * 100)
  }

  const isCompleted = (id) => {
    const g = items.value.find(x=>x.id===id)
    if (!g) return false
    const cur = Number(progressById.value[id] || 0)
    return cur >= Number(g.targetAmount||0) && Number(g.targetAmount||0) > 0
  }

  onUnmounted(() => dispose())

  return { items, status, error, progressById, init, dispose, add, edit, remove, pause, resume, loadProgress, progressPct, isCompleted }
})
