import { auth, db } from '@/services/firebase.js'
import { collection, doc, writeBatch } from 'firebase/firestore'
import { Timestamp } from 'firebase/firestore'
import { useDataCleanup } from '@/composables/useDataCleanup.js'

const reviveTimestamps = (val) => {
  const keys = new Set([
    'createdAt','updatedAt','lastActiveAt','planExpiresAt','expiresAt','graceExpiresAt','nextRunAt','dueDate','usedAt'
  ])
  const revive = (v, k) => {
    if (v == null) return v
    if (typeof v === 'number' && k && keys.has(k)) return Timestamp.fromMillis(v)
    if (Array.isArray(v)) return v.map(item => revive(item, null))
    if (typeof v === 'object') {
      const out = {}
      for (const kk of Object.keys(v)) out[kk] = revive(v[kk], kk)
      return out
    }
    return v
  }
  return revive(val, null)
}

export const useDataImport = () => {
  const applyDocs = async (uid, name, docs) => {
    if (!docs || !docs.length) return
    const chunkSize = 400
    for (let i = 0; i < docs.length; i += chunkSize) {
      const batch = writeBatch(db)
      const slice = docs.slice(i, i + chunkSize)
      for (const d of slice) {
        const ref = doc(collection(db, 'users', uid, name), d.id)
        const data = reviveTimestamps(d.data)
        if (!data.ownerId) data.ownerId = uid
        batch.set(ref, data)
      }
      await batch.commit()
    }
  }

  const importAll = async (payload, opts = { mode: 'merge' }) => {
    const uid = auth.currentUser && auth.currentUser.uid
    if (!uid) throw new Error('Unauthorized')
    if (!payload || typeof payload !== 'object' || !payload.collections) throw new Error('Invalid')
    const mode = opts && opts.mode === 'replace' ? 'replace' : 'merge'
    if (mode === 'replace') {
      const { deleteAllUserData } = useDataCleanup()
      await deleteAllUserData()
    }
    const names = Object.keys(payload.collections)
    for (const name of names) {
      const docs = Array.isArray(payload.collections[name]) ? payload.collections[name] : []
      await applyDocs(uid, name, docs)
    }
  }

  return { importAll }
}

