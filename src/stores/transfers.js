import { defineStore } from 'pinia'
import { ref, computed, onUnmounted } from 'vue'
import { db, auth } from '@/services/firebase.js'
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore'
import { useTransfers } from '@/composables/useTransfers.js'
import { useNotify } from '@/components/global/fcNotify.js'
import { t } from '@/i18n/index.js'
import { useAuth } from '@/composables/useAuth.js'

export const useTransfersStore = defineStore('transfers', () => {
  const items = ref([])
  const status = ref('idle')
  const error = ref(null)
  const selected = ref(null)
  const filters = ref({})
  const unsubscribe = ref(null)
  const { createTransfer, updateTransfer, deleteTransfer } = useTransfers()
  const { success, error: notifyError } = useNotify()

  const combine = list => {
    const map = new Map()
    for (const d of list) {
      const k = d.transferId
      if (!k) continue
      const cur = map.get(k) || { transferId: k }
      if (d.type === 'transfer-out') cur.out = d
      else if (d.type === 'transfer-in') cur.inn = d
      map.set(k, cur)
    }
    return Array.from(map.values()).filter(p => p.out && p.inn)
  }

  const init = async () => {
    if (unsubscribe.value) unsubscribe.value()
    status.value = 'loading'
    try {
      const { onAuthReady } = useAuth()
      const user = await onAuthReady()
      if (!user) {
        items.value = []
        status.value = 'success'
        return
      }
      const uid = auth.currentUser && auth.currentUser.uid
      if (!uid) {
        items.value = []
        status.value = 'success'
        return
      }
      const col = collection(db, 'users', uid, 'transactions')
      const q = query(
        col,
        where('isTransfer', '==', true),
        orderBy('date', 'desc'),
        orderBy('createdAt', 'desc')
      )
      unsubscribe.value = onSnapshot(
        q,
        snap => {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          items.value = combine(list)
          status.value = 'success'
        },
        e => {
          error.value = e?.message || 'Error'
          status.value = 'error'
        }
      )
    } catch (e) {
      error.value = e?.message || 'Error'
      status.value = 'error'
    }
  }

  const dispose = () => {
    if (unsubscribe.value) {
      unsubscribe.value()
      unsubscribe.value = null
    }
  }

  const add = async payload => {
    try {
      const id = await createTransfer(payload)
      success(t('transfers.created'))
      return id
    } catch (e) {
      notifyError(t('errors.generic'))
      throw e
    }
  }

  const edit = async (transferId, patch) => {
    try {
      await updateTransfer(transferId, patch)
      success(t('transfers.updated'))
    } catch (e) {
      notifyError(t('errors.generic'))
      throw e
    }
  }

  const remove = async transferId => {
    try {
      await deleteTransfer(transferId)
      success(t('transfers.deleted'))
    } catch (e) {
      notifyError(t('errors.generic'))
      throw e
    }
  }

  const setFilters = f => {
    filters.value = Object.fromEntries(
      Object.entries(f || {}).filter(([_, v]) => v !== '' && v != null)
    )
  }

  const filtered = computed(() => {
    const f = filters.value || {}
    return items.value.filter(p => {
      if (
        f.accountId &&
        !(
          p.out.fromAccountId === f.accountId ||
          p.out.toAccountId === f.accountId ||
          p.inn.fromAccountId === f.accountId ||
          p.inn.toAccountId === f.accountId
        )
      )
        return false
      if (f.from && p.out.date < f.from) return false
      return !(f.to && p.out.date > f.to)
    })
  })

  const hasItems = computed(() => filtered.value.length > 0)
  const byId = id => computed(() => items.value.find(p => p.transferId === id))

  onUnmounted(() => dispose())

  return {
    items,
    status,
    error,
    selected,
    filters,
    init,
    dispose,
    add,
    edit,
    remove,
    setFilters,
    hasItems,
    byId,
    filtered
  }
})
