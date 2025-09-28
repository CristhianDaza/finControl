import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { auth, db } from '@/services/firebase.js'
import {
  collection,
  addDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
  getDocs,
  runTransaction,
  deleteDoc,
} from 'firebase/firestore'
import { useAuthStore } from '@/stores/auth.js'
import { useNotify } from '@/components/global/fcNotify.js'
import { t } from '@/i18n/index.js'

export const useCurrenciesStore = defineStore('currencies', () => {
  const items = ref([])
  const status = ref('idle')
  const error = ref(null)
  const _unsub = ref(null)

  const gate = () => {
    const authStore = useAuthStore()
    if (!authStore.canWrite) {
      useNotify().info(t('access.readOnly'))
      return true
    }
    return false
  }

  const getUserCol = () => {
    const uid = auth.currentUser && auth.currentUser.uid
    if (!uid) throw new Error('No autenticado')
    return { col: collection(db, 'users', uid, 'currencies'), uid }
  }

  const subscribe = async () => {
    if (_unsub.value) _unsub.value()
    status.value = 'loading'

    try {
      const { col } = getUserCol()
      const q = query(col)

      let first = true
      _unsub.value = onSnapshot(q, async (snap) => {
        items.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

        if (first && snap.empty) {
          first = false
          await ensureAtLeastOne()
        }

        status.value = 'success'
      })
    } catch (e) {
      error.value = e?.message || 'Error'
      status.value = 'error'
    }
  }

  const ensureAtLeastOne = async () => {
    if (!auth.currentUser) return

    const { col } = getUserCol()
    const snap = await getDocs(query(col))

    if (snap.empty) {
      if (gate()) return

      await addDoc(col, {
        code: 'COP',
        symbol: '$',
        name: 'Peso Colombiano',
        isDefault: true,
        createdAt: Date.now(),
      })
    }
  }

  const create = async ({ code, symbol, name, isDefault }) => {
    if (gate()) return

    const { col } = getUserCol()

    const c = String(code || '').trim().toUpperCase()
    if (!/^[A-Z]{3,5}$/.test(c)) throw new Error('invalid-code')
    if (items.value.find((i) => i.code === c)) throw new Error('duplicate-code')

    const data = {
      code: c,
      symbol: symbol || '',
      name: name || c,
      isDefault: !!isDefault,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    const ref = await addDoc(col, data)

    if (data.isDefault) {
      await setDefault(ref.id)
    } else {
      await ensureAtLeastOne()
    }

    return ref.id
  }

  const update = async (id, patch) => {
    if (gate()) return

    const { col } = getUserCol()
    const refDoc = doc(col, id)

    const data = {
      ...patch,
      updatedAt: Date.now(),
    }

    await updateDoc(refDoc, data)

    if (patch.isDefault) {
      await setDefault(id)
    }
  }

  const remove = async (id) => {
    if (gate()) return

    const { col } = getUserCol()

    const current = items.value.find((i) => i.id === id)
    if (current && current.isDefault) {
      throw new Error('cannot-delete-default')
    }

    await deleteDoc(doc(col, id))

    const hasOtherDefault = items.value.some((i) => i.isDefault && i.id !== id)
    if (!hasOtherDefault) {
      const first = items.value.find((i) => i.id !== id)
      if (first) await setDefault(first.id)
    }
  }

  const setDefault = async (id) => {
    if (gate()) return

    const { col } = getUserCol()
    const list = [...items.value]

    await runTransaction(db, async (trx) => {
      for (const it of list) {
        const r = doc(col, it.id)
        const next = it.id === id
        if (!!it.isDefault !== next) {
          trx.update(r, { isDefault: next, updatedAt: Date.now() })
        }
      }
    })
  }

  const defaultCurrency = computed(
    () => items.value.find((i) => i.isDefault) || items.value[0] || { code: 'COP', symbol: '$' }
  )

  const codeOptions = computed(() =>
    items.value.map((c) => ({
      label: `${c.code}${c.symbol ? ' (' + c.symbol + ')' : ''}`,
      value: c.code,
    }))
  )

  return {
    items,
    status,
    error,
    subscribe,
    create,
    update,
    remove,
    setDefault,
    defaultCurrency,
    codeOptions,
  }
})
