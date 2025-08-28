import { defineStore } from 'pinia'
import { ref, onUnmounted } from 'vue'
import { useRecurring } from '@/composables/useRecurring.js'
import { useNotify } from '@/components/global/fcNotify.js'
import { t } from '@/i18n/index.js'

export const useRecurringStore = defineStore('recurring', () => {
  const items = ref([])
  const status = ref('idle')
  const error = ref(null)
  const unsubscribe = ref(null)
  const lastRun = ref(null)
  const lastProcessedCount = ref(0)
  const lastErrorMsg = ref(null)
  const processing = ref(false)
  let lastTriggerTs = 0
  const MIN_INTERVAL_MS = 30 * 1000

  const { subscribeTemplates, createTemplate, updateTemplate, deleteTemplate, processDueOnce } = useRecurring()
  const { success, error: notifyError, info } = useNotify()

  const init = async (opts = {}) => {
    if (unsubscribe.value) unsubscribe.value()
    status.value = 'loading'
    try {
      unsubscribe.value = subscribeTemplates((list) => { items.value = list; status.value = 'success' }, opts)
    } catch (e) {
      error.value = e?.message || 'Error'
      status.value = 'error'
    }
  }

  const dispose = () => { if (unsubscribe.value) { unsubscribe.value(); unsubscribe.value = null } }

  const add = async (payload) => {
    try {
      await createTemplate(payload)
      success(t('recurring.notifications.created'))
    } catch (e) { notifyError(t('errors.generic')); throw e }
  }

  const edit = async (id, patch) => {
    try {
      await updateTemplate(id, patch)
      success(t('recurring.notifications.updated'))
    } catch (e) { notifyError(t('errors.generic')); throw e }
  }

  const remove = async (id) => {
    try {
      await deleteTemplate(id)
      success(t('recurring.notifications.deleted'))
    } catch (e) { notifyError(t('errors.generic')); throw e }
  }

  const pause = async (id) => edit(id, { paused: true })
  const resume = async (id) => edit(id, { paused: false })

  const processDue = async () => {
    if (processing.value) return { processed: 0 }
    const now = Date.now()
    if (now - lastTriggerTs < MIN_INTERVAL_MS) return { processed: 0 }
    lastTriggerTs = now
    processing.value = true
    lastErrorMsg.value = null
    try {
      const res = await processDueOnce()
      lastRun.value = new Date().toISOString()
      lastProcessedCount.value = res?.processed || 0
      if (res?.processed > 0) info(t('recurring.notifications.processed', { count: String(res.processed) }))
      return res
    } catch (e) {
      lastErrorMsg.value = e?.message || 'Error'
      return { processed: 0 }
    } finally {
      processing.value = false
    }
  }

  onUnmounted(() => dispose())

  return { items, status, error, init, dispose, add, edit, remove, pause, resume, processDue, lastRun, lastProcessedCount, lastErrorMsg, processing }
})

