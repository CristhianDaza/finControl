import { auth, db } from '@/services/firebase.js'
import { collection, doc, onSnapshot, query, where, orderBy as fbOrderBy, serverTimestamp, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { useAuthStore } from '@/stores/auth.js'
import { useNotify } from '@/components/global/fcNotify.js'
import { t } from '@/i18n/index.js'

export const useGoals = () => {
  const gate = () => { const a = useAuthStore(); if (!a.canWrite) { useNotify().info(t('access.readOnly')); return true } return false }
  const getUserPaths = () => { const uid = auth.currentUser && auth.currentUser.uid; if (!uid) throw new Error('Unauthorized'); return { uid, goalsCol: collection(db, 'users', uid, 'goals') } }
  const subscribeGoals = (cb, opts = {}) => { const { goalsCol } = getUserPaths(); const clauses = []; if (opts.paused != null) clauses.push(where('paused', '==', !!opts.paused)); const q = query(goalsCol, ...clauses, fbOrderBy('createdAt', 'desc')); return onSnapshot(q, snap => { cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))) }) }
  const createGoal = async (payload) => { if (gate()) return; const { uid, goalsCol } = getUserPaths(); const ref = doc(goalsCol); const data = { ownerId: uid, name: payload.name, targetAmount: Number(payload.targetAmount || 0), currency: payload.currency || payload.currencyCode || 'COP', dueDate: payload.dueDate || null, accountId: payload.accountId || payload.account || '', note: payload.note || '', paused: !!payload.paused, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }; await setDoc(ref, data); return ref.id }
  const updateGoal = async (id, patch) => { if (gate()) return; const { goalsCol } = getUserPaths(); const ref = doc(goalsCol, id); await updateDoc(ref, { ...patch, updatedAt: serverTimestamp() }) }
  const deleteGoal = async (id) => { if (gate()) return; const { goalsCol } = getUserPaths(); await deleteDoc(doc(goalsCol, id)) }
  return { subscribeGoals, createGoal, updateGoal, deleteGoal }
}
