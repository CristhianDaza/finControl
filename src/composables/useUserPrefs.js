import { auth, db } from '@/services/firebase.js'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { useAuthStore } from '@/stores/auth.js'
import { useNotify } from '@/components/global/fcNotify.js'
import { t } from '@/i18n/index.js'

const getUid = () => {
  const uid = auth.currentUser && auth.currentUser.uid
  if (!uid) throw new Error('Unauthorized')
  return uid
}

const gate = () => {
  const a = useAuthStore()
  if (!a.canWrite) {
    useNotify().info(t('access.readOnly'))
    return true
  }
  return false
}

export const useUserPrefs = () => {
  const getTxFilters = async () => {
    const uid = getUid()
    const ref = doc(db, 'users', uid, 'preferences', 'transactionsFilters')
    const snap = await getDoc(ref)
    return snap.exists() ? snap.data() : null
  }

  const saveTxFilters = async filters => {
    if (gate()) return
    const uid = getUid()
    const ref = doc(db, 'users', uid, 'preferences', 'transactionsFilters')
    await setDoc(ref, { ...filters }, { merge: true })
  }

  const getThemeVars = async () => {
    const uid = getUid()
    const ref = doc(db, 'users', uid, 'preferences', 'themeVars')
    const snap = await getDoc(ref)
    return snap.exists() ? snap.data() : null
  }

  const saveThemeVars = async vars => {
    if (gate()) return
    const uid = getUid()
    const ref = doc(db, 'users', uid, 'preferences', 'themeVars')
    await setDoc(ref, { ...vars }, { merge: true })
  }

  return { getTxFilters, saveTxFilters, getThemeVars, saveThemeVars }
}
