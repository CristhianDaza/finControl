import { auth, db } from '@/services/firebase.js'
import { collection, doc, onSnapshot, query, where, orderBy as fbOrderBy, serverTimestamp, setDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore'

export const useBudgets = () => {
  const getUserPaths = () => {
    const uid = auth.currentUser && auth.currentUser.uid
    if (!uid) throw new Error('Unauthorized')
    return { uid, budgetsCol: collection(db, 'users', uid, 'budgets') }
  }

  const subscribeBudgets = (cb, opts = {}) => {
    const { budgetsCol } = getUserPaths()
    const clauses = []
    if (opts.active != null) clauses.push(where('active', '==', !!opts.active))
    const q = query(budgetsCol, ...clauses, fbOrderBy('createdAt', 'desc'))
    return onSnapshot(q, snap => { cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))) })
  }

  const createBudget = async (payload) => {
    const { uid, budgetsCol } = getUserPaths()
    const ref = doc(budgetsCol)
    const data = {
      ownerId: uid,
      name: payload.name || '',
      targetAmount: Number(payload.targetAmount || 0),
      currency: payload.currency || 'COP',
      periodType: payload.periodType || 'monthly', // 'monthly' | 'custom'
      periodFrom: payload.periodFrom || null,
      periodTo: payload.periodTo || null,
      categories: Array.isArray(payload.categories) ? payload.categories : [],
      excludeAccounts: Array.isArray(payload.excludeAccounts) ? payload.excludeAccounts : [],
      alertThresholdPct: Number(payload.alertThresholdPct || 80),
      carryover: !!payload.carryover,
      carryoverBalance: Number(payload.carryoverBalance || 0),
      lastClosedPeriodKey: payload.lastClosedPeriodKey || null,
      currencyRates: payload.currencyRates || {}, // { USD: 4000 } means 1 USD -> 4000 budget currency
      active: payload.active != null ? !!payload.active : true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
    await setDoc(ref, data)
    return ref.id
  }

  const updateBudget = async (id, patch) => {
    const { budgetsCol } = getUserPaths()
    const ref = doc(budgetsCol, id)
    const data = { ...patch, updatedAt: serverTimestamp() }
    await updateDoc(ref, data)
  }

  const deleteBudget = async (id) => {
    const { budgetsCol } = getUserPaths()
    await deleteDoc(doc(budgetsCol, id))
  }

  const fetchBudgets = async (opts = {}) => {
    const { budgetsCol } = getUserPaths()
    const clauses = []
    if (opts.active != null) clauses.push(where('active', '==', !!opts.active))
    const q = query(budgetsCol, ...clauses, fbOrderBy('createdAt', 'desc'))
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  }

  return { subscribeBudgets, createBudget, updateBudget, deleteBudget, fetchBudgets }
}

