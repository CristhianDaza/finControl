import { auth, db } from '@/services/firebase.js'
import { collection, getDocs } from 'firebase/firestore'

const toPlain = val => {
  if (!val || typeof val !== 'object') return val
  if (typeof val.toMillis === 'function') return val.toMillis()
  if (Array.isArray(val)) return val.map(v => toPlain(v))
  const out = {}
  for (const k of Object.keys(val)) out[k] = toPlain(val[k])
  return out
}

export const useDataExport = () => {
  const listNames = () => [
    'transactions',
    'recurringRuns',
    'recurringTemplates',
    'goals',
    'debts',
    'accounts',
    'budgets',
    'currencies'
  ]

  const exportAll = async () => {
    const uid = auth.currentUser && auth.currentUser.uid
    if (!uid) throw new Error('Unauthorized')
    const collections = {}
    for (const name of listNames()) {
      const colRef = collection(db, 'users', uid, name)
      const snap = await getDocs(colRef)
      const docs = snap.docs.map(d => ({
        id: d.id,
        data: toPlain(d.data())
      }))
      collections[name] = docs
    }
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      collections
    }
  }

  return { exportAll }
}
