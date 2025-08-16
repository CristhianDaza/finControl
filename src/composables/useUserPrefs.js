import { auth, db } from '@/services/firebase.js'
import { doc, getDoc, setDoc } from 'firebase/firestore'

const getUid = () => {
  const uid = auth.currentUser && auth.currentUser.uid
  if (!uid) throw new Error('Unauthorized')
  return uid
}

export const useUserPrefs = () => {
  const getTxFilters = async () => {
    const uid = getUid()
    const ref = doc(db, 'users', uid, 'preferences', 'transactionsFilters')
    const snap = await getDoc(ref)
    return snap.exists() ? snap.data() : null
  }

  const saveTxFilters = async (filters) => {
    const uid = getUid()
    const ref = doc(db, 'users', uid, 'preferences', 'transactionsFilters')
    await setDoc(ref, { ...filters }, { merge: true })
  }

  return { getTxFilters, saveTxFilters }
}

