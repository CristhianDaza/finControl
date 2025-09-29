import { auth, db } from '@/services/firebase.js'
import { collection, doc, getDocs, writeBatch } from 'firebase/firestore'

export const useDataCleanup = () => {
  const deleteCollectionDocs = async (colRef) => {
    const snap = await getDocs(colRef)
    if (snap.empty) return
    const docs = snap.docs
    const chunkSize = 400
    for (let i = 0; i < docs.length; i += chunkSize) {
      const batch = writeBatch(db)
      const slice = docs.slice(i, i + chunkSize)
      for (const d of slice) batch.delete(doc(colRef, d.id))
      await batch.commit()
    }
  }

  const deleteAllUserData = async () => {
    const uid = auth.currentUser && auth.currentUser.uid
    if (!uid) throw new Error('Unauthorized')
    const names = [
      'transactions',
      'recurringRuns',
      'recurringTemplates',
      'goals',
      'debts',
      'accounts',
      'budgets',
      'currencies'
    ]
    for (const name of names) {
      const colRef = collection(db, 'users', uid, name)
      await deleteCollectionDocs(colRef)
    }
  }

  return { deleteAllUserData }
}

